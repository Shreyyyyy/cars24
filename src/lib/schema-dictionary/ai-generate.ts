/**
 * Drafts mapping entries for loaded tables (server only).
 *
 * The model sees each table's real headers, types, fill rates, example values and the joins measured
 * in the data, plus the sheets already mapped (so it can link to them). Its answer is normalised and
 * checked: only real headers are kept, every real column gets an entry, and relationships must point
 * at sheets that exist. Without a model (no key, timeout, bad JSON) a heuristic draft is returned, so
 * the editor always has something to review. Nothing is saved here: drafts go to the editor first.
 */

import { geminiService } from '../gemini-service';
import { logger } from '../logger';
import type { QueryableTable } from '../sqlite-server';
import { businessLabel } from '../formatters';
import {
  ColumnRole,
  MappingColumn,
  MappingDefinition,
  MappingRelationship,
  MappingSheet,
  SchemaMappingDoc,
  SHEET_DOMAINS,
  COLUMN_ROLES,
  findSheet,
  normalizeName,
  parseMappingDoc,
  relationshipKey
} from './model';
import { columnResolver } from './resolve';

export interface MappingDraft {
  sheets: MappingSheet[];
  relationships: MappingRelationship[];
  definitions: MappingDefinition[];
  /** Model that wrote the draft, or "heuristic" */
  model: string;
  notes: string[];
}

const BATCH_SIZE = 5;
const CONCURRENCY = 3;
const MAX_COLUMNS_IN_PROMPT = 120;

function headerOf(t: QueryableTable, col: string): string {
  return t.profiles[col]?.sourceHeader || col;
}

function profileLine(t: QueryableTable, col: string): string {
  const p = t.profiles[col];
  if (!p) return `- ${headerOf(t, col)}`;
  const filled = t.rowCount ? Math.round(((t.rowCount - (p.nullCount || 0)) / t.rowCount) * 100) : 0;
  const type = p.isDate ? 'date' : p.isNumeric ? 'number' : 'text';
  const range = p.isDate ? ` ${p.dateMin}..${p.dateMax}` : p.isNumeric && p.min !== undefined ? ` ${p.min}..${p.max}` : '';
  const examples = (p.distinctValues || []).slice(0, 4).map(v => JSON.stringify(String(v).slice(0, 40))).join(', ');
  return `- ${JSON.stringify(headerOf(t, col))}: ${type}${range}, ${p.distinctCount ?? '?'} distinct, ${filled}% filled${examples ? `, e.g. ${examples}` : ''}`;
}

function describeForModel(t: QueryableTable, all: QueryableTable[]): string {
  const joins = t.relationships
    .filter(r => r.status !== 'not-matching')
    .map(r => {
      const target = all.find(x => x.tableName === r.targetTable);
      return target ? `  ${headerOf(t, r.foreignKey)} -> sheet ${JSON.stringify(target.sheetName)} column ${JSON.stringify(headerOf(target, r.targetKey))} (${r.matchPct ?? '?'}% of values match)` : null;
    })
    .filter(Boolean);
  return [
    `SHEET ${JSON.stringify(t.sheetName)} (${t.rowCount.toLocaleString('en-IN')} rows, ${t.columns.length} columns)`,
    ...t.columns.slice(0, MAX_COLUMNS_IN_PROMPT).map(c => profileLine(t, c)),
    ...(t.columns.length > MAX_COLUMNS_IN_PROMPT ? [`  (+${t.columns.length - MAX_COLUMNS_IN_PROMPT} more columns)`] : []),
    ...(joins.length ? ['  Joins measured in the data:', ...(joins as string[])] : [])
  ].join('\n');
}

function guessRole(t: QueryableTable, col: string): ColumnRole {
  const p = t.profiles[col];
  const h = headerOf(t, col).toLowerCase();
  if (/(^|_)(first|last)?_?name$|email|phone|mobile|address|pan(_|$)|aadhaar/.test(h)) return 'pii';
  if (p?.isDate || /date|_on$|time/.test(h)) return 'date';
  if (/(^|_)(id|code|key|no|num|number)(_\d+)?$|^id$/.test(h)) {
    return t.relationships.some(r => r.foreignKey === col) ? 'foreign_key' : 'id';
  }
  if (p?.isNumeric && (p.distinctCount || 0) > 2) return 'measure';
  if ((p?.distinctCount || 0) <= 2) return 'flag';
  return (p?.distinctCount || 0) > Math.max(50, t.rowCount * 0.5) ? 'text' : 'dimension';
}

/** A usable first draft from the data alone (headers, types, examples, measured joins). */
function heuristicSheet(t: QueryableTable, existing: SchemaMappingDoc): MappingSheet {
  const known = findSheet(existing, t.sheetName);
  const words = t.sheetName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !['table', 'data', 'sheet', 'prod'].includes(w));
  return {
    sheet: t.sheetName,
    grain: known?.grain || `one row per ${businessLabel(t.sheetName).toLowerCase()} record`,
    purpose: known?.purpose || `${businessLabel(t.sheetName)} (${t.rowCount.toLocaleString('en-IN')} rows).`,
    keywords: known?.keywords.length ? known.keywords : Array.from(new Set(words)),
    columns: t.columns.map(col => {
      const p = t.profiles[col];
      const header = headerOf(t, col);
      const documented = known?.columns.find(c => normalizeName(c.header) === normalizeName(header));
      const shared = Object.entries(existing.commonColumns).find(([h]) => normalizeName(h) === normalizeName(header))?.[1];
      const examples = (p?.distinctValues || []).slice(0, 3).join(', ');
      const auto = `${businessLabel(header)}${p?.isDate ? ` (date, ${p.dateMin} to ${p.dateMax})` : p?.isNumeric ? ' (number)' : examples ? ` (e.g. ${examples})` : ''}`;
      return { header, meaning: documented?.meaning || shared || auto, role: documented?.role || guessRole(t, col) };
    }),
    origin: 'ai'
  };
}

function heuristicRelationships(tables: QueryableTable[], all: QueryableTable[]): MappingRelationship[] {
  const out: MappingRelationship[] = [];
  for (const t of tables) {
    for (const r of t.relationships) {
      if (r.status !== 'verified') continue;
      const target = all.find(x => x.tableName === r.targetTable);
      if (!target) continue;
      out.push({
        from: { sheet: t.sheetName, column: headerOf(t, r.foreignKey) },
        to: { sheet: target.sheetName, column: headerOf(target, r.targetKey) },
        cardinality: 'many-to-one',
        note: `${r.matchPct ?? '?'}% of values match in the data`,
        origin: 'ai'
      });
    }
  }
  return out;
}

async function draftBatchWithModel(batch: QueryableTable[], all: QueryableTable[], existing: SchemaMappingDoc, context: string) {
  const mapped = existing.sheets.map(s => `- ${JSON.stringify(s.sheet)}: ${s.grain}`).slice(0, 80).join('\n');
  const prompt = `You document a company's data for a text-to-SQL analytics assistant. Write the business dictionary entries for the sheets below.
${context ? `\nWHAT THE WORKBOOK IS ABOUT: ${context}\n` : ''}
${mapped ? `SHEETS ALREADY DOCUMENTED (you may link to them; do not document them again):\n${mapped}\n` : ''}
SHEETS TO DOCUMENT (real headers, types, fill rates and example values from the data):
${batch.map(t => describeForModel(t, all)).join('\n\n')}

Return JSON:
{"sheets":[{"sheet":"<exact sheet name>","system":"<source system if evident, else omit>","domain":"${SHEET_DOMAINS.join('|')}","grain":"one row per ...","purpose":"what the sheet is for, in one or two sentences","keywords":["words a business user would use to ask about it"],"columns":[{"header":"<exact header>","meaning":"<business meaning; name the values that matter, units, and which sheet an id joins to>","role":"${COLUMN_ROLES.join('|')}"}]}],
 "relationships":[{"from":{"sheet":"...","column":"<exact header>"},"to":{"sheet":"...","column":"<exact header>"},"cardinality":"e.g. many enquiries : 1 dealer","note":"how to use the join"}],
 "definitions":[{"name":"<metric>","kind":"metric","definition":"how to compute it from these sheets, with the exact filter values seen above"}]}
Rules: use headers and sheet names EXACTLY as given; document every column; base meanings only on the names, types and example values (write "unclear" rather than guess); propose relationships only from the measured joins above or ids whose example values clearly match; keep definitions to metrics these sheets can compute.`;

  const result = await geminiService.generateContentDetailed(prompt, {
    purpose: 'schema_mapping',
    temperature: 0.1,
    timeoutMs: 45000,
    maxOutputTokens: 16000,
    responseMimeType: 'application/json'
  });
  if (!result?.text) return null;
  const { doc, issues } = parseMappingDoc(result.text);
  const errors = issues.filter(i => i.level === 'error');
  if (errors.length && doc.sheets.length === 0) throw new Error(errors[0].message);
  return { doc, model: result.model };
}

/** Keeps a model-written sheet honest: real headers only, every real column present. */
function reconcileSheet(t: QueryableTable, drafted: MappingSheet | undefined, fallback: MappingSheet): MappingSheet {
  if (!drafted) return fallback;
  const resolve = columnResolver(t);
  const byColumn = new Map<string, MappingColumn>();
  for (const c of drafted.columns) {
    const col = resolve(c.header);
    if (col && !byColumn.has(col) && c.meaning) byColumn.set(col, { ...c, header: headerOf(t, col) });
  }
  return {
    ...drafted,
    sheet: t.sheetName,
    grain: drafted.grain || fallback.grain,
    purpose: drafted.purpose || fallback.purpose,
    keywords: drafted.keywords.length ? drafted.keywords : fallback.keywords,
    columns: t.columns.map(col => byColumn.get(col) || fallback.columns.find(c => normalizeName(c.header) === normalizeName(headerOf(t, col)))!),
    origin: 'ai'
  };
}

export async function generateMappingDraft(input: {
  tables: QueryableTable[];
  allTables: QueryableTable[];
  existing: SchemaMappingDoc;
  context?: string;
  useModel?: boolean;
}): Promise<MappingDraft> {
  const { tables, allTables, existing } = input;
  const notes: string[] = [];
  const fallbacks = new Map(tables.map(t => [t.tableName, heuristicSheet(t, existing)]));
  const drafted = new Map<string, MappingSheet>();
  let relationships: MappingRelationship[] = [];
  let definitions: MappingDefinition[] = [];
  const models = new Set<string>();

  if (input.useModel !== false && process.env.GEMINI_API_KEY) {
    const batches: QueryableTable[][] = [];
    for (let i = 0; i < tables.length; i += BATCH_SIZE) batches.push(tables.slice(i, i + BATCH_SIZE));
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const batch = batches[next++];
        try {
          const res = await draftBatchWithModel(batch, allTables, existing, input.context || existing.description || '');
          if (!res) {
            notes.push(`No model answer for ${batch.map(t => t.sheetName).join(', ')}; heuristic draft used.`);
            continue;
          }
          models.add(res.model);
          for (const t of batch) {
            const s = findSheet(res.doc, t.sheetName);
            if (s) drafted.set(t.tableName, s);
          }
          relationships.push(...res.doc.relationships);
          definitions.push(...res.doc.definitions);
        } catch (err: any) {
          logger.warn(`Schema mapping draft failed for a batch: ${err?.message || err}`);
          notes.push(`Model draft failed for ${batch.map(t => t.sheetName).join(', ')} (${err?.message || err}); heuristic draft used.`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  } else {
    notes.push(input.useModel === false ? 'Heuristic draft (model not requested).' : 'No GEMINI_API_KEY configured: heuristic draft from headers, types and example values.');
  }

  const sheets = tables.map(t => reconcileSheet(t, drafted.get(t.tableName), fallbacks.get(t.tableName)!));

  // Relationships must connect real sheets (new or already mapped) and not repeat existing ones
  const known = (name: string) => sheets.some(s => normalizeName(s.sheet) === normalizeName(name)) || Boolean(findSheet(existing, name));
  const seen = new Set(existing.relationships.map(relationshipKey));
  relationships = [...relationships, ...heuristicRelationships(tables, allTables)]
    .filter(r => known(r.from.sheet) && known(r.to.sheet))
    .filter(r => {
      const k = relationshipKey(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map(r => ({ ...r, origin: 'ai' as const }));
  const defNames = new Set(existing.definitions.map(d => normalizeName(d.name)));
  definitions = definitions
    .filter(d => d.definition && !defNames.has(normalizeName(d.name)) && (defNames.add(normalizeName(d.name)), true))
    .map(d => ({ ...d, origin: 'ai' as const }));

  const undocumented = tables.filter(t => !drafted.has(t.tableName)).map(t => t.sheetName);
  if (models.size && undocumented.length) notes.push(`Heuristic entries for: ${undocumented.join(', ')}.`);
  return { sheets, relationships, definitions, model: models.size ? Array.from(models).join(', ') : 'heuristic', notes };
}
