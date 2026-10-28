/**
 * Data Cartographer: understands the whole dataset once, when it is loaded.
 *
 * - Fact sheet (deterministic, every row): per table the row count, value distributions of each
 *   breakdown, totals/averages/ranges of each measure, monthly volumes, and the verified joins.
 * - Semantic map (one LLM call, in the background): what each table represents, its grain, how the
 *   tables connect into business flows, and the KPIs the data supports.
 *
 * Both are persisted with the dataset metadata, so every agent starts each question already
 * knowing the data, at no per-question cost.
 */

import {
  DatasetMetadata,
  DataUnderstanding,
  getDatasetMetadata,
  getDatasetVersion,
  getQueryableTables,
  executeReadOnlyQuery,
  setDatasetMetadata,
  QueryableTable
} from './sqlite-server';
import { geminiService } from './gemini-service';
import { getSchemaKnowledge } from './schema-knowledge';
import { logger } from './logger';

/** A failed semantic map is retried after this long (e.g. the model was unreachable at upload time) */
const RETRY_FAILED_MAP_MS = 5 * 60 * 1000;
/** Bump when the semantic map's content rules change, so existing maps are rebuilt once */
const MAP_FORMAT = 2;

const PERSONAL = /phone|mobile|email|aadhaar|(^|_)pan(_|$)|bank_account|ifsc|address|street|date_of_birth|(^|_)dob(_|$)|signature/i;
const MAX_DIMS = 5;
const MAX_VALUES = 6;
const MAX_MEASURES = 5;
const MAX_MONTHS = 18;

const qi = (c: string) => `"${c.replace(/"/g, '""')}"`;
const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100).toLocaleString('en-IN');

function safeRows(sql: string): Record<string, any>[] {
  try {
    return executeReadOnlyQuery(sql);
  } catch (err: any) {
    logger.warn(`Fact sheet query skipped: ${err.message}`);
    return [];
  }
}

function tableFacts(t: QueryableTable): string {
  const T = qi(t.tableName);
  const profiles = t.columns.map(c => t.profiles[c]).filter(Boolean);
  const lines = [`## ${t.sheetName} (table "${t.tableName}"): ${t.rowCount.toLocaleString('en-IN')} rows`];

  const keys = profiles.filter(p => !p.isNumeric && !p.isDate && p.distinctCount === t.rowCount && /(^|_)(id|code|no|number|num)$/.test(p.column_name));
  if (keys.length) lines.push(`- Unique key: ${keys.slice(0, 2).map(p => `"${p.column_name}"`).join(', ')}`);

  // Breakdowns: exact counts and shares over every row
  const dims = profiles
    .filter(p => !p.isNumeric && !p.isDate && (p.distinctCount || 0) >= 2 && (p.distinctCount || 0) <= 80 && !PERSONAL.test(p.column_name))
    .sort((a, b) => (a.distinctCount || 0) - (b.distinctCount || 0))
    .slice(0, MAX_DIMS);
  for (const d of dims) {
    const rows = safeRows(`SELECT ${qi(d.column_name)} AS v, COUNT(*) AS n FROM ${T} WHERE ${qi(d.column_name)} IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT ${MAX_VALUES}`);
    if (!rows.length) continue;
    const vals = rows.map(r => `${String(r.v).slice(0, 40)} ${fmt(r.n)} (${fmt(100 * r.n / Math.max(1, t.rowCount))}%)`).join(', ');
    lines.push(`- "${d.column_name}" [${d.distinctCount} values]: ${vals}${(d.distinctCount || 0) > MAX_VALUES ? ', …' : ''}`);
  }

  // Measures: totals over every row
  const measures = profiles
    .filter(p => p.isNumeric && !/(^|_)(id|code|pin|pincode|zip|year)$/.test(p.column_name))
    .slice(0, MAX_MEASURES);
  if (measures.length) {
    const agg = safeRows(`SELECT ${measures.map((m, i) => `SUM(${qi(m.column_name)}) AS s${i}, AVG(${qi(m.column_name)}) AS a${i}, MIN(${qi(m.column_name)}) AS lo${i}, MAX(${qi(m.column_name)}) AS hi${i}, COUNT(${qi(m.column_name)}) AS n${i}`).join(', ')} FROM ${T}`)[0];
    if (agg) {
      lines.push(`- Measures: ${measures.map((m, i) => agg[`n${i}`]
        ? `"${m.column_name}" total ${fmt(agg[`s${i}`])}, avg ${fmt(agg[`a${i}`])}, range ${fmt(agg[`lo${i}`])} to ${fmt(agg[`hi${i}`])}`
        : `"${m.column_name}" empty`).join('; ')}`);
    }
  }

  // Time: the main date column's span and monthly volume
  const date = profiles
    .filter(p => p.isDate && p.dateMin && !/birth|dob|updated|modified/i.test(p.column_name))
    .sort((a, b) => (a.nullCount || 0) - (b.nullCount || 0))[0];
  if (date) {
    const months = safeRows(`SELECT substr(${qi(date.column_name)}, 1, 7) AS m, COUNT(*) AS n FROM ${T} WHERE ${qi(date.column_name)} IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT ${MAX_MONTHS}`).reverse();
    lines.push(`- Period ("${date.column_name}"): ${date.dateMin} to ${date.dateMax}` +
      (months.length > 1 ? `; rows per month: ${months.map(r => `${r.m} ${fmt(r.n)}`).join(', ')}` : ''));
  }

  const sparse = profiles.filter(p => t.rowCount > 0 && (p.nullCount || 0) / t.rowCount >= 0.5).map(p => `"${p.column_name}"`);
  if (sparse.length) lines.push(`- Mostly empty (≥50%): ${sparse.slice(0, 8).join(', ')}`);

  const joins = t.relationships.filter(r => r.status !== 'not-matching');
  if (joins.length) {
    lines.push(`- Connects to: ${joins.slice(0, 8).map(r => `"${r.foreignKey}" → "${r.targetTable}"."${r.targetKey}"${r.matchPct !== undefined ? ` (${r.matchPct}% match)` : ''}`).join('; ')}`);
  }
  return lines.join('\n');
}

export function buildFactSheet(meta: DatasetMetadata | null): string {
  const tables = getQueryableTables(meta);
  if (!meta || tables.length === 0) return '';
  const total = tables.reduce((n, t) => n + t.rowCount, 0);
  return [
    `FACT SHEET for "${meta.fileName}" (computed over all ${total.toLocaleString('en-IN')} rows in ${tables.length} table${tables.length > 1 ? 's' : ''}; exact figures):`,
    ...tables.map(tableFacts)
  ].join('\n\n');
}

async function buildSemanticMap(meta: DatasetMetadata, factSheet: string): Promise<string | null> {
  const prompt = `You are a data cartographer. Study this dataset (every table, value distribution and join) and explain how it fits together, for analysts who will answer business questions from it.

${factSheet.slice(0, 60000)}

Return STRICT JSON:
{
"overview": "<2-3 sentences: what business this data describes and the period>",
  "definitions": ["<business count or amount users will ask for (e.g. enquiries, leads, test drives, bookings, retail/deliveries/sales, cancellations, lost sales, revenue): ONE canonical way to compute it = exact table + filter/column. Funnel stages are cumulative: a record whose status moved on to a later stage still counts for the earlier ones, e.g. if a bookings/contracts table has statuses Booked, Invoiced and Cancelled, then Bookings = all its rows, Retail = Invoiced, Cancellations = Cancelled.>"],
  "tables": [{"table": "<table name>", "represents": "<one row = what>", "use_for": "<questions it answers>"}],
  "flows": ["<how tables connect into a business process, naming the join columns, e.g. enquiry → booking via enquiry_no>"],
  "kpis": ["<KPI name: how to compute it from which tables/columns>"],
  "cautions": ["<pitfalls: duplicated totals, sparse columns, partial joins, mismatched periods>"]
}
Cover every table. Keep each field under 30 words; at most 15 definitions, 12 flows, 12 KPIs and 8 cautions.`;
  const result = await geminiService.generateContentDetailed(prompt, {
    purpose: 'semantic_map',
    timeoutMs: 45000,
    temperature: 0.1,
    maxOutputTokens: 16000,
    responseMimeType: 'application/json'
  });
  if (!result?.text) return null;
  try {
    const m = JSON.parse(result.text);
    const list = (xs: unknown) => (Array.isArray(xs) ? xs.filter(x => typeof x === 'string') as string[] : []);
    const tables = Array.isArray(m.tables) ? m.tables : [];
    // A documented workbook has verified metric definitions in its dictionary; model-written ones
    // would compete with them (e.g. a sample table as the source of "sales"), so they are dropped
    const dictionary = Boolean(getSchemaKnowledge(meta));
    if (dictionary) {
      m.definitions = ['Use the CANONICAL METRIC DEFINITIONS and KPI DEFINITIONS in the system instructions (verified against this data); do not redefine them.'];
      m.kpis = [];
    }
    return [
      `DATA UNDERSTANDING (how "${meta.fileName}" fits together):`,
      String(m.overview || ''),
      list(m.definitions).length ? `Metric definitions (always compute these exactly this way):\n${list(m.definitions).map(d => `- ${d}`).join('\n')}` : '',
      list(m.kpis).length ? `KPIs:\n${list(m.kpis).map(k => `- ${k}`).join('\n')}` : '',
      tables.length ? `Tables:\n${tables.map((t: any) => `- "${t.table}": one row = ${t.represents}; use for ${t.use_for}`).join('\n')}` : '',
      list(m.flows).length ? `Business flows / joins:\n${list(m.flows).map(f => `- ${f}`).join('\n')}` : '',
      list(m.cautions).length ? `Cautions:\n${list(m.cautions).map(c => `- ${c}`).join('\n')}` : ''
    ].filter(Boolean).join('\n');
  } catch {
    logger.warn(`Semantic map response was not valid JSON (${result.text.length} chars, ends: ${result.text.slice(-80)})`);
    return null;
  }
}

let building: { version: string; promise: Promise<void> } | null = null;

function save(understanding: DataUnderstanding): void {
  const meta = getDatasetMetadata();
  // A newer dataset may have been loaded meanwhile: never attach this understanding to it
  if (meta && getDatasetVersion() === understanding.version) setDatasetMetadata({ ...meta, understanding });
}

function startSemanticMap(meta: DatasetMetadata, base: DataUnderstanding, start: number): void {
  const version = base.version;
  const promise = buildSemanticMap(meta, base.factSheet)
    .then(semanticMap => save(semanticMap
      ? { ...base, status: 'ready', semanticMap, failedAt: undefined, format: MAP_FORMAT, builtInMs: Date.now() - start }
      : { ...base, status: 'facts-only', failedAt: Date.now(), builtInMs: Date.now() - start }))
    .catch(err => {
      logger.warn(`Semantic map failed: ${err.message}`);
      save({ ...base, status: 'facts-only', failedAt: Date.now() });
    })
    .finally(() => { if (building?.version === version) building = null; });
  building = { version, promise };
}

/**
 * Builds the fact sheet now (synchronous SQL, fast) and the semantic map in the background.
 * Called right after a dataset is loaded; safe to call again.
 */
export function understandDataset(): DataUnderstanding | null {
  const meta = getDatasetMetadata();
  if (!meta || meta.rowCount <= 0) return null;
  const version = getDatasetVersion();
  const existing = meta.understanding?.version === version ? meta.understanding : undefined;
  const retryFailed = (existing?.status === 'facts-only' && Date.now() - (existing.failedAt || 0) > RETRY_FAILED_MAP_MS) ||
    (existing?.status === 'ready' && existing.format !== MAP_FORMAT);
  if (existing && !retryFailed && (existing.status !== 'building' || building?.version === version)) return existing;
  if (existing && retryFailed && building?.version === version) return existing;

  // New dataset, or a build interrupted by a server restart
  const start = Date.now();
  const base: DataUnderstanding = existing
    ? { ...existing, status: 'building' }
    : { version, status: 'building', factSheet: buildFactSheet(meta), builtInMs: 0 };
  base.builtInMs = base.builtInMs || Date.now() - start;
  save(base);
  startSemanticMap(meta, base, start);
  return base;
}

/** The current understanding, building it on demand (e.g. first question after a restart). */
export function getDataUnderstanding(): DataUnderstanding | null {
  return understandDataset();
}

/** Understanding as prompt context: business map first, then exact figures. */
export function understandingContext(maxChars = 40000): string {
  const u = getDataUnderstanding();
  if (!u) return '';
  return [u.semanticMap, u.factSheet].filter(Boolean).join('\n\n').slice(0, maxChars);
}

/** Waits for an in-flight semantic map (used by tests and the load endpoint's optional wait). */
export async function awaitUnderstanding(timeoutMs = 60000): Promise<DataUnderstanding | null> {
  if (building) await Promise.race([building.promise, new Promise(r => setTimeout(r, timeoutMs))]);
  return getDataUnderstanding();
}
