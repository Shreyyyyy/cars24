/**
 * Schema knowledge: turns the business dictionary of a known workbook into prompts that use the
 * actual SQL table and column names of the uploaded data.
 *
 * - `systemPrompt`: persona + every table's column meanings + verified relationships + KPI definitions.
 *   It is identical for every question on the same upload, so it is sent as the model's system
 *   instruction (and benefits from prompt caching).
 * - `relevantTables(question)`: the few tables a question is about, whose live profiles (types,
 *   example values) go into the per-question prompt.
 */

import { DatasetMetadata, getDatasetVersion, getQueryableTables } from '../sqlite-server';
import { buildTableCatalog } from '../dataset-context';
import { VP_SALES_PERSONA } from './maruti-schema';
import { SchemaMappingDoc, MappingDefinition, SheetDomain, findSheet, normalizeName } from '../schema-dictionary/model';
import { resolveMappingSheets, ResolvedMappingSheet } from '../schema-dictionary/resolve';
import { getActiveMapping, ActiveMapping } from '../schema-dictionary/store';

export { VP_SALES_PERSONA } from './maruti-schema';

const MAX_RELEVANT_TABLES = 6;

export interface SchemaKnowledge {
  systemPrompt: string;
  /** Verified one-source-per-metric definitions, repeated next to each question for the SQL agent */
  canonicalDefinitions: string;
  /** Persona, table catalog and KPI definitions (no column list) for answer writing */
  analystBrief: string;
  keywords: string[];
  relevantTables(question: string): string[];
  domainOf(tableName: string): SheetDomain | undefined;
  /** Sheet name, grain and purpose of a table, from the mapping */
  describeTable(tableName: string): { sheet: string; grain: string; purpose: string } | undefined;
  /** Which mapping (and version) this knowledge was built from */
  mappingRef: string;
}

const renderDefinition = (d: MappingDefinition) =>
  d.verbatim ? d.definition : `- ${d.name}: ${d.definition}${d.sql ? ` SQL: ${d.sql}` : ''}`;

/** Metric and rule definitions: one source per metric, repeated with every question */
export function renderCanonicalDefinitions(doc: SchemaMappingDoc): string {
  const defs = doc.definitions.filter(d => d.kind === 'metric' || d.kind === 'rule');
  const blocks = defs.filter(d => d.verbatim).map(renderDefinition);
  const lines = defs.filter(d => !d.verbatim).map(renderDefinition);
  if (lines.length) {
    blocks.push(`${blocks.length ? 'ADDITIONAL ' : ''}BUSINESS METRIC DEFINITIONS (use these exactly, every time):\n${lines.join('\n')}`);
  }
  return blocks.join('\n\n');
}

/** Canonical definitions + glossary + KPI procedures, for the system instructions */
function renderKpiSection(doc: SchemaMappingDoc): string {
  const terms = doc.definitions.filter(d => d.kind === 'term');
  const guides = doc.definitions.filter(d => d.kind === 'guide');
  return [
    renderCanonicalDefinitions(doc),
    terms.length ? `BUSINESS GLOSSARY:\n${terms.map(renderDefinition).join('\n')}` : '',
    ...guides.map(g => (g.verbatim ? g.definition : `${g.name.toUpperCase()}:\n${g.definition}`))
  ].filter(Boolean).join('\n\n');
}

function sqlRef(sheets: ResolvedMappingSheet[], doc: SchemaMappingDoc, sheetName: string, header: string): string | null {
  const target = findSheet(doc, sheetName);
  const s = target && sheets.find(r => r.sheet === target);
  const col = s?.columnFor(header);
  return s && col ? `"${s.table.tableName}"."${col}"` : null;
}

function headerExample(sheets: ResolvedMappingSheet[]): string {
  const s = sheets[0];
  if (!s) return '';
  const pair = s.sheet.columns.map(c => ({ h: c.header, col: s.columnFor(c.header) })).find(x => x.col && x.col !== x.h) ||
    s.sheet.columns.map(c => ({ h: c.header, col: s.columnFor(c.header) })).find(x => x.col);
  return ` (e.g. sheet "${s.sheet.sheet}" -> "${s.table.tableName}"${pair ? `, header "${pair.h}" -> "${pair.col}"` : ''})`;
}

function buildSystemPrompt(meta: DatasetMetadata, doc: SchemaMappingDoc, sheets: ResolvedMappingSheet[]): string {
  const tableBlocks = sheets.map(s => {
    const k = s.sheet;
    const cols = s.meanings.map(m => `  "${m.column}": ${m.meaning}`).join('\n');
    const tags = [k.system, k.domain, `${s.table.rowCount.toLocaleString('en-IN')} rows`].filter(Boolean).join('; ');
    return `TABLE "${s.table.tableName}" = sheet "${k.sheet}" [${tags}]\n` +
      `  Grain: ${k.grain || 'not documented'}. ${k.purpose}\n${cols}`;
  });

  const rels = doc.relationships.map(r => {
    if (r.to.sheet === '*') {
      const from = sqlRef(sheets, doc, r.from.sheet, r.from.column);
      return from ? `- ${from} -> every table's ${r.to.column} column (${r.cardinality}): ${r.note || ''}` : null;
    }
    const a = sqlRef(sheets, doc, r.from.sheet, r.from.column);
    const b = sqlRef(sheets, doc, r.to.sheet, r.to.column);
    return a && b ? `- ${a} = ${b} (${r.cardinality}): ${r.note || ''}` : null;
  }).filter(Boolean);

  const tables = getQueryableTables(meta);
  const unmatched = tables.filter(t => !sheets.some(s => s.table.tableName === t.tableName));
  const kpis = renderKpiSection(doc);

  return [
    doc.persona || VP_SALES_PERSONA,
    '',
    `DATA MODEL: the uploaded file "${meta.fileName}" has ${tables.length} tables${doc.sourceSystems ? ` from ${doc.sourceSystems}` : ''}. ` +
      'Below, every table with the business meaning of every column, using the exact SQL table and column names (always double-quote them). ' +
      'Text values vary in case: compare with LOWER(). Missing values may appear as NULL or the text NA. Dates are ISO text (YYYY-MM-DD[ HH:MM:SS]).',
    '',
    ...tableBlocks,
    ...(unmatched.length ? ['', `Other tables (no dictionary): ${unmatched.map(t => `"${t.tableName}"`).join(', ')}`] : []),
    ...(rels.length ? ['', 'RELATIONSHIPS (verified against the data; use these join keys):', ...(rels as string[])] : []),
    ...(doc.nonRelationships.length || kpis
      ? ['', `Note: ${doc.sqlNamingNote || `the next sections use workbook sheet/column headers; map them to the SQL names in the TABLE sections above${headerExample(sheets)}.`}`]
      : []),
    ...(doc.nonRelationships.length
      ? ['', 'LINKS THAT LOOK PLAUSIBLE BUT DO NOT EXIST (never join on these):', ...doc.nonRelationships.map(n => `- ${n}`)]
      : []),
    ...(kpis ? ['', kpis] : []),
    '',
    'MANDATORY ANALYTICAL PROCEDURE (EXHAUSTIVE MULTI-SHEET ANALYSIS):',
    '1. Full Data Scope: Evaluate all sheets, rows, and columns in the workbook relevant to the question. Never restrict analysis to a single summary table when row-level records (enquiries, contracts, calls, test drives, invoices) provide exact facts.',
    '2. Join Integrity: Join tables strictly using the verified foreign keys above (e.g. enquiry_id, dealer_code, customer_id, vin). Respect one-to-many cardinality.',
    '3. Complete Mathematical Accuracy: Compute exact stage volumes, conversion ratios, drop-off leakage, averages, percentages, and segment distributions.',
    '4. Exhaustive Breakdown: Break down findings by key business dimensions (models, variants, fuel types, sales zones, dealer networks ARENA/NEXA, channels, and monthly trends).',
    '5. Strict Factual Grounding: State only true numbers computed from the data facts. If any specific data is missing from the file, explicitly identify what is missing.',
    '',
    buildTableCatalog(meta)
  ].join('\n');
}

function buildAnalystBrief(doc: SchemaMappingDoc, sheets: ResolvedMappingSheet[]): string {
  return [
    doc.persona || VP_SALES_PERSONA,
    '',
    'TABLES IN THE UPLOADED DATA (every sheet and grain available for analysis):',
    ...sheets.map(s => `- "${s.table.tableName}" (${s.sheet.sheet}${s.sheet.system ? `, ${s.sheet.system}` : ''}): ${s.sheet.grain}. ${s.sheet.purpose}`),
    '',
    renderKpiSection(doc),
    '',
    'EXACT ANALYTICAL PROCEDURE:',
    '1. Cross-Sheet Synthesis: Connect facts across funnel stages (Enquiry -> Followup -> Test Drive -> Booking -> Invoicing/Retail -> Lost Reasons).',
    '2. Deep Granularity: Detail exact numbers, percentages, leader/laggard gaps, and underlying drivers.',
    '3. Zero Fabrication: Quote ONLY verified facts from the query results and growth scan.'
  ].join('\n');
}

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

let cache: { key: string; knowledge: SchemaKnowledge | null } | null = null;

/** Knowledge for the uploaded dataset from its active schema mapping, or null when none applies. */
export function getSchemaKnowledge(meta: DatasetMetadata | null): SchemaKnowledge | null {
  if (!meta) return null;
  const active = getActiveMapping(meta);
  const key = `${getDatasetVersion()}|${active?.ref}`;
  if (cache && cache.key === key) return cache.knowledge;
  const knowledge = active?.doc ? buildSchemaKnowledge(meta, active.doc, active.ref) : null;
  cache = { key, knowledge };
  return knowledge;
}

/** Builds the prompts from a mapping document (also used to preview a draft before saving it). */
export function buildSchemaKnowledge(meta: DatasetMetadata, doc: SchemaMappingDoc, mappingRef = 'draft'): SchemaKnowledge | null {
  const sheets = resolveMappingSheets(doc, getQueryableTables(meta));
  if (sheets.length === 0) return null;

  const systemPrompt = buildSystemPrompt(meta, doc, sheets);
  const analystBrief = buildAnalystBrief(doc, sheets);
  const byTable = new Map(sheets.map(s => [s.table.tableName, s]));
  const tableOfSheet = (name: string) => {
    const target = findSheet(doc, name);
    return target ? sheets.find(s => s.sheet === target)?.table.tableName : undefined;
  };

  const relevantTables = (question: string): string[] => {
    const q = ` ${question.toLowerCase()} `;
    const qTokens = new Set(tokens(question));
    const scored = sheets.map(s => {
      let score = 0;
      for (const kw of s.sheet.keywords) if (q.includes(kw)) score += kw.includes(' ') ? 4 : 3;
      for (const t of tokens(s.sheet.sheet)) if (qTokens.has(t) && !['table', 'dlite', 'data', 'prod'].includes(t)) score += 2;
      for (const m of s.meanings) {
        if (m.column.split('_').some(part => part.length > 3 && qTokens.has(part))) score += 0.5;
      }
      // Core sales tables win ties: a VP Sales question is usually about the funnel
      if (s.sheet.domain === 'sales') score += 0.5;
      return { name: s.table.tableName, score };
    }).sort((a, b) => b.score - a.score);

    const picked = scored.filter(s => s.score >= 2).slice(0, 4).map(s => s.name);
    const defaults = (doc.defaultSheets || []).map(tableOfSheet).filter((n): n is string => Boolean(n));
    const result = picked.length ? picked : defaults.length ? defaults : scored.slice(0, 3).map(s => s.name);

    // Pull in direct join partners of the top table (e.g. Dealer master for channel/zone)
    const top = byTable.get(result[0]);
    if (top) {
      const topName = normalizeName(top.sheet.sheet);
      for (const r of doc.relationships) {
        const partner = normalizeName(r.from.sheet) === topName ? r.to.sheet : normalizeName(r.to.sheet) === topName ? r.from.sheet : null;
        const name = partner && partner !== '*' ? tableOfSheet(partner) : undefined;
        if (name && !result.includes(name) && result.length < MAX_RELEVANT_TABLES && q.match(/dealer|zone|channel|arena|nexa|booking|test drive|lead|enquir|consultant/)) {
          result.push(name);
        }
      }
      const dealer = tableOfSheet('DLITE_Dealer Table');
      if (dealer && !result.includes(dealer) && /arena|nexa|channel|tier|category|zone|dealer type/.test(q) && result.length < MAX_RELEVANT_TABLES) {
        result.push(dealer);
      }
    }
    return result.slice(0, MAX_RELEVANT_TABLES);
  };

  return {
    systemPrompt,
    canonicalDefinitions: renderCanonicalDefinitions(doc),
    analystBrief,
    keywords: Array.from(new Set(sheets.flatMap(s => s.sheet.keywords))),
    relevantTables,
    domainOf: (tableName: string) => byTable.get(tableName)?.sheet.domain,
    describeTable: (tableName: string) => {
      const k = byTable.get(tableName)?.sheet;
      return k ? { sheet: k.sheet, grain: k.grain, purpose: k.purpose } : undefined;
    },
    mappingRef
  };
}

/** Domain of a sheet by name, from the current dataset's mapping (or the built-in dictionary). */
export function knownSheetDomain(sheetName: string): SheetDomain | undefined {
  const doc = activeDoc();
  return doc ? findSheet(doc, sheetName)?.domain : undefined;
}

function activeDoc(): SchemaMappingDoc | null {
  try {
    return getActiveMapping()?.doc ?? null;
  } catch {
    return null;
  }
}

export type { ActiveMapping };
