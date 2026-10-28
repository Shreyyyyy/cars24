/**
 * Describes the uploaded dataset (every table, column, type and real example value) for prompts.
 * This is the only picture of the data the LLM gets, so it never mentions columns or values
 * that are not in the file.
 */

import { DatasetMetadata, getDatasetVersion, getQueryableTables, QueryableTable } from './sqlite-server';
import type { ColumnProfile } from './tabular-ingest';
import { getSchemaKnowledge, knownSheetDomain } from './schema-knowledge';

/** Personal data: describe the column but never send its values to the model. */
/** Tables given a full column profile per question; the catalog covers the rest */
const MAX_PROFILED_TABLES = 3;

const PII_COLUMN = /name|phone|mobile|email|address|street|pan|aadhaar|bank_account|ifsc|gstin|dob|date_of_birth|legal_name|consumer|account_name|^ip|td_ip|latitude|longitude|signature|qr_code/i;

function describeColumn(p: ColumnProfile): string {
  const header = p.sourceHeader && p.sourceHeader.toLowerCase() !== p.column_name.replace(/_/g, ' ')
    ? ` (file header: "${p.sourceHeader}")`
    : '';
  if (p.isDate) {
    return `"${p.column_name}" DATE as ISO text${p.dateMin ? `, ${p.dateMin} to ${p.dateMax}` : ''}${header}`;
  }
  if (p.isNumeric) {
    const range = p.min !== undefined ? `, range ${round(p.min)} to ${round(p.max!)}` : '';
    return `"${p.column_name}" NUMBER${range}${header}`;
  }
  const examples = PII_COLUMN.test(p.column_name)
    ? ''
    : (p.distinctValues || []).slice(0, 8).map(v => `'${v.replace(/'/g, "''").slice(0, 40)}'`).join(', ');
  const distinct = p.distinctCount !== undefined ? `${p.distinctCount} distinct` : '';
  return `"${p.column_name}" TEXT${distinct ? `, ${distinct}` : ''}${examples ? `, e.g. ${examples}` : ''}${header}`;
}

function round(n: number): number {
  return Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
}

export function describeTable(t: QueryableTable, includeJoins = true): string {
  const cols = t.columns.map(c => `    - ${t.profiles[c] ? describeColumn(t.profiles[c]) : `"${c}"`}`).join('\n');
  const rels = includeJoins && t.relationships.length > 0
    ? `\n    joins (verified against the data): ${t.relationships.map(r => `"${t.tableName}"."${r.foreignKey}" = "${r.targetTable}"."${r.targetKey}"${r.matchPct !== undefined ? ` (${r.matchPct}% match${r.status === 'partial' ? ', partial' : ''})` : ''}`).join('; ')}`
    : '';
  return `- "${t.tableName}" — sheet/table "${t.sheetName}", ${t.rowCount.toLocaleString('en-IN')} rows\n${cols}${rels}${repeatedWarning(t)}`;
}

function repeatedWarning(t: QueryableTable): string {
  const r = t.repeatedTotals;
  if (!r) return '';
  const cols = r.columns.map(c => `"${c}"`).join(', ');
  return `\n    WARNING: ${cols} repeat on every row of the same "${r.key}". Never SUM them over raw rows: first ` +
    `SELECT DISTINCT "${r.key}", ${cols} (plus grouping columns) in a subquery/CTE, then aggregate.`;
}

/**
 * Schema context for text-to-SQL. For a known workbook, the full column dictionary and relationships
 * are in the system instruction, so only the question's relevant tables are profiled here (with real
 * example values for correct filter spelling).
 */
export function describeDatasetForLLM(meta: DatasetMetadata | null, question?: string): string {
  const tables = getQueryableTables(meta);
  if (tables.length === 0) return '(no data uploaded)';

  const knowledge = question ? getSchemaKnowledge(meta) : null;
  if (knowledge) {
    // The dictionary and the catalog of all tables are in the (cached) system instructions
    const wanted = knowledge.relevantTables(question!).slice(0, MAX_PROFILED_TABLES);
    const picked = wanted.map(n => tables.find(t => t.tableName === n)).filter((t): t is QueryableTable => Boolean(t));
    return `Detailed profile of the tables most likely needed (types, ranges, real example values). ` +
      `The catalog of all tables, every column meaning and the join keys are in the system instructions: review them all and use any table you need.\n` +
      picked.map(t => describeTable(t, false)).join('\n');
  }

  // Large files without a dictionary: catalog of every table + full detail for the likeliest ones
  if (question && tables.length > MAX_PROFILED_TABLES) {
    const picked = rankTablesForQuestion(tables, question).slice(0, MAX_PROFILED_TABLES);
    return `${buildTableCatalog(meta)}\n\nDetailed profile of the tables most likely needed:\n` +
      picked.map(t => describeTable(t)).join('\n');
  }

  const header = tables.length > 1
    ? `The file "${meta!.fileName}" contains ${tables.length} tables. "uploaded_data" is a copy of "${meta!.primaryTable}"; prefer the named tables.\n`
    : `The file "${meta!.fileName}" contains one table.\n`;
  return header + tables.map(t => describeTable(t)).join('\n');
}

/**
 * Compact catalog of EVERY table: size, key, date range, main fields with real values, measures and
 * verified joins. Given to the model with each question so it reviews all tables before choosing.
 */
let catalogCache: { version: string; text: string } | null = null;

export function buildTableCatalog(meta: DatasetMetadata | null): string {
  const version = getDatasetVersion();
  if (catalogCache && catalogCache.version === version) return catalogCache.text;
  const lines = getQueryableTables(meta).map(t => {
    const profiles = t.columns.map(c => t.profiles[c]).filter(Boolean);
    const key = profiles.find(p => !p.isNumeric && !p.isDate && p.distinctCount === t.rowCount && (p.nullCount || 0) === 0 && /(^|_)(id|code|num|number|no)(_\d+)?$/.test(p.column_name));
    const date = profiles.find(p => p.isDate && p.dateMin);
    const dims = profiles
      .filter(p => !p.isNumeric && !p.isDate && (p.distinctCount || 0) >= 2 && (p.distinctCount || 0) <= 40 && !PII_COLUMN.test(p.column_name))
      .slice(0, 6)
      .map(p => `"${p.column_name}"[${(p.distinctValues || []).slice(0, 3).map(v => v.slice(0, 20)).join('|')}${(p.distinctCount || 0) > 3 ? '|…' : ''}]`);
    const measures = profiles
      .filter(p => p.isNumeric && !/(^|_)(id|code)$/.test(p.column_name))
      .slice(0, 5)
      .map(p => `"${p.column_name}"`);
    const joins = t.relationships
      .filter(r => r.status !== 'not-matching')
      .slice(0, 6)
      .map(r => `"${r.foreignKey}"->"${r.targetTable}"."${r.targetKey}"${r.matchPct !== undefined && r.matchPct < 90 ? ` (${r.matchPct}%)` : ''}`);
    return `- "${t.tableName}" = sheet "${t.sheetName}": ${t.rowCount.toLocaleString('en-IN')} rows` +
      (key ? `; key "${key.column_name}"` : '') +
      (date ? `; dates "${date.column_name}" ${date.dateMin} to ${date.dateMax}` : '') +
      (dims.length ? `; fields ${dims.join(', ')}` : '') +
      (measures.length ? `; numbers ${measures.join(', ')}` : '') +
      (joins.length ? `; joins ${joins.join(', ')}` : '') +
      (t.repeatedTotals ? `; WARNING numbers ${t.repeatedTotals.columns.slice(0, 4).map(c => `"${c}"`).join(', ')} repeat per "${t.repeatedTotals.key}": de-duplicate per "${t.repeatedTotals.key}" before summing` : '');
  });
  const text = `TABLE CATALOG (all ${lines.length} tables in the upload; review every one before choosing):\n${lines.join('\n')}`;
  catalogCache = { version, text };
  return text;
}

/** Tables most related to a question by name, column names and values (for files without a dictionary). */
function rankTablesForQuestion(tables: QueryableTable[], question: string): QueryableTable[] {
  const words = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const score = (t: QueryableTable) => {
    let s = 0;
    const name = t.sheetName.toLowerCase();
    for (const w of words) {
      if (name.includes(w)) s += 3;
      for (const c of t.columns) {
        if (c.includes(w)) s += 1;
        if ((t.profiles[c]?.distinctValues || []).some(v => v.toLowerCase().includes(w))) s += 1.5;
      }
    }
    return s;
  };
  return [...tables].sort((a, b) => score(b) - score(a) || b.rowCount - a.rowCount);
}

/** One-line inventory for user-facing messages, e.g. "Sales (1,240 rows), Targets (36 rows)". */
export function describeInventory(meta: DatasetMetadata | null): string {
  return getQueryableTables(meta)
    .map(t => `${t.sheetName} (${t.rowCount.toLocaleString('en-IN')} rows)`)
    .join(', ');
}

const DIM_PRIORITY = /model|product|city|state|region|dealer|showroom|outlet|branch|channel|source|campaign|segment|category/i;
const METRIC_PRIORITY = /revenue|sales|value|amount|units|volume|deliver|booking|qty|quantity/i;

/** Questions that make sense for this particular file (only columns that exist are mentioned). */
export function suggestQuestionsForDataset(meta: DatasetMetadata | null): string[] {
  const core = /lead|sale|booking|deliver|order|invoice|retail|enquir|inquir|transaction/i;
  // Documented workbooks: sales-funnel tables first (not call logs or service data)
  const isCore = (name: string) => {
    const domain = knownSheetDomain(name);
    return domain ? domain === 'sales' : core.test(name);
  };
  const tables = getQueryableTables(meta).sort((a, b) =>
    Number(isCore(b.sheetName)) - Number(isCore(a.sheetName)) || b.rowCount - a.rowCount);
  if (tables.length === 0) return [];
  const questions = ['What are my biggest opportunities to grow sales?'];

  for (const t of tables.filter(t => !/dictionary|glossary|readme|benchmark|notes|master|lookup|event|history|log/i.test(t.sheetName)).slice(0, 2)) {
    const cols = t.columns.filter(c => t.profiles[c]);
    const dims = cols.filter(c => {
      const p = t.profiles[c];
      return !p.isNumeric && !p.isDate && (p.distinctCount || 0) >= 2 && (p.distinctCount || 0) <= 60 && !/status|stage|type|_id$|result/i.test(c);
    });
    const dim = dims.find(c => DIM_PRIORITY.test(c)) || dims[0];
    const metric = cols.find(c => t.profiles[c].isNumeric && METRIC_PRIORITY.test(c) && !/pct|rate|price|target|benchmark|industry|estimated|illustrative|budget|days/i.test(c));
    const date = cols.find(c => t.profiles[c].isDate);
    const loss = cols.find(c => !t.profiles[c].isNumeric && /lost|reason|drop/i.test(c));
    const label = (c: string) => c.replace(/_/g, ' ');
    const unit = /booking/i.test(t.sheetName) ? 'bookings' : /deliver/i.test(t.sheetName) ? 'deliveries'
      : /inquir/i.test(t.sheetName) ? 'inquiries' : /enquir/i.test(t.sheetName) ? 'enquiries' : /lead/i.test(t.sheetName) ? 'leads' : 'records';
    const scope = tables.length > 1 ? ` in ${t.sheetName}` : '';

    if (dim) questions.push(`Top 10 ${label(dim)} by ${metric ? label(metric) : `number of ${unit}`}${scope}`);
    if (date) questions.push(`Monthly trend of ${metric ? label(metric) : unit}${scope}`);
    if (loss) questions.push(`What are the main reasons leads are lost${scope}?`);
    if (dim) questions.push(`Which ${label(dim)} is lagging and why?`);
  }
  return Array.from(new Set(questions)).slice(0, 5);
}

/**
 * User-facing picture of the upload: each sheet's size, date range, main fields (with real values),
 * numeric measures and gaps. Answers "what does my data look like?" without the LLM.
 */
export function describeDatasetOverview(meta: DatasetMetadata | null): string {
  const tables = getQueryableTables(meta);
  if (!meta || tables.length === 0) return 'No data file is loaded yet.';
  const label = (c: string) => c.replace(/_/g, ' ');
  const totalRows = tables.reduce((n, t) => n + t.rowCount, 0);
  const lines = [
    `**${meta.fileName}** has ${tables.length === 1 ? 'one sheet' : `${tables.length} sheets`} with ${totalRows.toLocaleString('en-IN')} rows in total.`
  ];
  for (const t of tables) {
    const profiles = t.columns.map(c => t.profiles[c]).filter(Boolean);
    const dates = profiles.filter(p => p.isDate && p.dateMin);
    const dims = profiles
      .filter(p => !p.isNumeric && !p.isDate && (p.distinctCount || 0) >= 2 && (p.distinctCount || 0) <= 60 && !PII_COLUMN.test(p.column_name))
      .slice(0, 5)
      .map(p => `${label(p.column_name)} (${p.distinctCount} values, e.g. ${(p.distinctValues || []).slice(0, 3).join(', ')})`);
    const measures = profiles
      .filter(p => p.isNumeric && !/(^|_)(id|code)$/.test(p.column_name))
      .slice(0, 6)
      .map(p => p.min !== undefined ? `${label(p.column_name)} (${round(p.min)} to ${round(p.max!)})` : label(p.column_name));
    const sparse = profiles
      .filter(p => t.rowCount > 0 && (p.nullCount || 0) / t.rowCount >= 0.3)
      .map(p => `${label(p.column_name)} (${Math.round(100 * (p.nullCount || 0) / t.rowCount)}% empty)`);
    const parts = [`\n**${t.sheetName}**: ${t.rowCount.toLocaleString('en-IN')} rows, ${t.columns.length} columns`];
    if (dates.length) parts.push(`- Period: ${dates.slice(0, 2).map(d => `${label(d.column_name)} ${d.dateMin} to ${d.dateMax}`).join('; ')}`);
    if (dims.length) parts.push(`- Breakdowns: ${dims.join('; ')}`);
    if (measures.length) parts.push(`- Numbers: ${measures.join('; ')}`);
    if (sparse.length) parts.push(`- Mostly empty: ${sparse.slice(0, 5).join('; ')}`);
    lines.push(parts.join('\n'));
  }
  return lines.join('\n');
}
