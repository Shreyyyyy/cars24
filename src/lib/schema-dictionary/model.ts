/**
 * Schema mapping document: the business dictionary of a workbook, as editable JSON.
 *
 * It says what each sheet is (grain, purpose, the words that point to it), what each column means,
 * how sheets join, and the business definitions every answer must use. Text-to-SQL builds its system
 * instructions from the active document (see schema-knowledge), so editing it changes how questions
 * are answered.
 *
 * This file is shared by the server and the editor in the browser: parsing/normalising (for JSON
 * import and hand edits), structural validation, merging, adding a sheet, and diffing versions.
 * Checks against the loaded data live in validate.ts (server only).
 */

export const MAPPING_FORMAT = 'schema-mapping/v1';

export const SHEET_DOMAINS = ['sales', 'sales-activity', 'aftersales', 'master', 'marketing', 'digital', 'other'] as const;
export type SheetDomain = (typeof SHEET_DOMAINS)[number];

export const COLUMN_ROLES = ['id', 'foreign_key', 'dimension', 'measure', 'date', 'flag', 'text', 'pii'] as const;
export type ColumnRole = (typeof COLUMN_ROLES)[number];

export const DEFINITION_KINDS = ['metric', 'rule', 'term', 'guide'] as const;
/**
 * metric/rule: repeated next to every question for the SQL agent (one source per metric).
 * term: glossary, in the system instructions. guide: longer procedures, in the system instructions.
 */
export type DefinitionKind = (typeof DEFINITION_KINDS)[number];

/** Who wrote an entry: the built-in dictionary, the AI draft, a person, or an imported file */
export type MappingOrigin = 'builtin' | 'ai' | 'manual' | 'import';

export interface MappingColumn {
  /** Header exactly as in the workbook (the SQL column is found from it) */
  header: string;
  meaning: string;
  role?: ColumnRole;
  /** Explicit SQL column when the header cannot be matched automatically */
  sqlColumn?: string;
}

export interface MappingSheet {
  /** Sheet name exactly as in the workbook */
  sheet: string;
  /** Explicit SQL table when the sheet name cannot be matched automatically */
  sqlTable?: string;
  /** Source system, e.g. "DLITE (dealer DMS)" */
  system?: string;
  domain?: SheetDomain;
  /** What one row represents */
  grain: string;
  purpose: string;
  /** Words that signal a question is about this sheet (lower case) */
  keywords: string[];
  columns: MappingColumn[];
  origin?: MappingOrigin;
  updatedAt?: string;
}

export interface MappingRelationship {
  from: { sheet: string; column: string };
  /** sheet "*" = the column of that name in every sheet */
  to: { sheet: string; column: string };
  /** e.g. "1 enquiry : 0..1 booking", "many-to-one" */
  cardinality: string;
  note?: string;
  origin?: MappingOrigin;
}

export interface MappingDefinition {
  name: string;
  kind: DefinitionKind;
  definition: string;
  /** Reference SQL expression or query */
  sql?: string;
  /** Written into the prompt exactly as is (a pre-formatted block), instead of "- name: definition" */
  verbatim?: boolean;
  origin?: MappingOrigin;
}

export interface SchemaMappingDoc {
  format: typeof MAPPING_FORMAT;
  name: string;
  description?: string;
  /** Who the assistant speaks as; defaults to the built-in persona */
  persona?: string;
  /** Source systems of the workbook, for the data-model overview */
  sourceSystems?: string;
  /** How workbook names map to SQL names, for the prompt (generated from the data when empty) */
  sqlNamingNote?: string;
  /** Tables to profile when a question names none of them */
  defaultSheets?: string[];
  /** Meanings of columns that appear in many sheets (header -> meaning) */
  commonColumns: Record<string, string>;
  sheets: MappingSheet[];
  relationships: MappingRelationship[];
  /** Joins that look plausible but do not exist */
  nonRelationships: string[];
  definitions: MappingDefinition[];
}

export interface MappingIssue {
  level: 'error' | 'warning';
  /** Where in the document, e.g. "sheets[3].columns[2].header" or a sheet name */
  path: string;
  message: string;
}

export const LIMITS = {
  sheets: 500,
  columnsPerSheet: 1000,
  relationships: 2000,
  definitions: 500,
  text: 4000,
  longText: 40000,
  jsonBytes: 5_000_000
};

export const normalizeName = (s: string) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function emptyMappingDoc(name = 'New schema mapping'): SchemaMappingDoc {
  return { format: MAPPING_FORMAT, name, commonColumns: {}, sheets: [], relationships: [], nonRelationships: [], definitions: [] };
}

// ---------------------------------------------------------------------------
// Parsing & normalising (lenient in, strict out)
// ---------------------------------------------------------------------------

const str = (v: unknown, max = LIMITS.text): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v)).trim().slice(0, max);
const optStr = (v: unknown, max = LIMITS.text): string | undefined => str(v, max) || undefined;
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, all: readonly T[]): T | undefined =>
  all.includes(str(v).toLowerCase() as T) ? (str(v).toLowerCase() as T) : undefined;

/**
 * Columns may be given as an array of objects, a { header: meaning } object, or "header: meaning" lines.
 */
function parseColumns(raw: unknown, path: string, issues: MappingIssue[]): MappingColumn[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (isObj(raw)) list = Object.entries(raw).map(([header, meaning]) => (isObj(meaning) ? { header, ...meaning } : { header, meaning }));
  else if (typeof raw === 'string') {
    list = raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const i = l.indexOf(':');
      return i === -1 ? { header: l, meaning: '' } : { header: l.slice(0, i), meaning: l.slice(i + 1) };
    });
  } else if (raw !== undefined) {
    issues.push({ level: 'error', path, message: 'columns must be a list, an object of header: meaning, or "header: meaning" lines' });
  }
  const out: MappingColumn[] = [];
  list.slice(0, LIMITS.columnsPerSheet).forEach((c, i) => {
    const o = isObj(c) ? c : { header: c };
    const header = str(o.header ?? o.name ?? o.column, 300);
    if (!header) {
      issues.push({ level: 'error', path: `${path}[${i}]`, message: 'column header is required' });
      return;
    }
    const role = o.role === undefined || o.role === '' ? undefined : oneOf(o.role, COLUMN_ROLES);
    if (o.role && !role) issues.push({ level: 'warning', path: `${path}[${i}].role`, message: `unknown role "${o.role}" (use ${COLUMN_ROLES.join(', ')})` });
    out.push({ header, meaning: str(o.meaning ?? o.description), ...(role ? { role } : {}), ...(optStr(o.sqlColumn, 120) ? { sqlColumn: optStr(o.sqlColumn, 120) } : {}) });
  });
  if (Array.isArray(list) && list.length > LIMITS.columnsPerSheet) {
    issues.push({ level: 'error', path, message: `more than ${LIMITS.columnsPerSheet} columns` });
  }
  return out;
}

function parseSheet(raw: unknown, path: string, issues: MappingIssue[]): MappingSheet | null {
  if (!isObj(raw)) {
    issues.push({ level: 'error', path, message: 'sheet must be an object' });
    return null;
  }
  const sheet = str(raw.sheet ?? raw.name ?? raw.sheetName, 200);
  if (!sheet) {
    issues.push({ level: 'error', path, message: 'sheet name is required' });
    return null;
  }
  const domain = raw.domain === undefined || raw.domain === '' ? undefined : oneOf(raw.domain, SHEET_DOMAINS);
  if (raw.domain && !domain) issues.push({ level: 'warning', path: `${path}.domain`, message: `unknown domain "${raw.domain}" (use ${SHEET_DOMAINS.join(', ')})` });
  const keywords = (Array.isArray(raw.keywords) ? raw.keywords : typeof raw.keywords === 'string' ? raw.keywords.split(',') : [])
    .map((k: unknown) => str(k, 60).toLowerCase()).filter(Boolean);
  const origin = oneOf(raw.origin, ['builtin', 'ai', 'manual', 'import'] as const);
  return {
    sheet,
    ...(optStr(raw.sqlTable, 120) ? { sqlTable: optStr(raw.sqlTable, 120) } : {}),
    ...(optStr(raw.system, 200) ? { system: optStr(raw.system, 200) } : {}),
    ...(domain ? { domain } : {}),
    grain: str(raw.grain),
    purpose: str(raw.purpose ?? raw.description),
    keywords: Array.from(new Set<string>(keywords)).slice(0, 100),
    columns: parseColumns(raw.columns, `${path}.columns`, issues),
    ...(origin ? { origin } : {}),
    ...(optStr(raw.updatedAt, 40) ? { updatedAt: optStr(raw.updatedAt, 40) } : {})
  };
}

/** Accepts { sheet, column }, [sheet, column] or "sheet.column" / "sheet:column". */
function parseEnd(raw: unknown): { sheet: string; column: string } | null {
  if (Array.isArray(raw) && raw.length === 2) return { sheet: str(raw[0], 200), column: str(raw[1], 300) };
  if (isObj(raw)) return { sheet: str(raw.sheet ?? raw.table, 200), column: str(raw.column ?? raw.header, 300) };
  if (typeof raw === 'string') {
    const i = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(':'));
    if (i > 0) return { sheet: raw.slice(0, i).trim(), column: raw.slice(i + 1).trim() };
  }
  return null;
}

function parseRelationship(raw: unknown, path: string, issues: MappingIssue[]): MappingRelationship | null {
  if (!isObj(raw)) {
    issues.push({ level: 'error', path, message: 'relationship must be an object' });
    return null;
  }
  const from = parseEnd(raw.from);
  const to = parseEnd(raw.to);
  if (!from?.sheet || !from.column || !to?.sheet || !to.column) {
    issues.push({ level: 'error', path, message: 'relationship needs from and to, each with a sheet and a column' });
    return null;
  }
  const origin = oneOf(raw.origin, ['builtin', 'ai', 'manual', 'import'] as const);
  return {
    from, to,
    cardinality: str(raw.cardinality ?? raw.type, 200) || 'many-to-one',
    ...(optStr(raw.note) ? { note: optStr(raw.note) } : {}),
    ...(origin ? { origin } : {})
  };
}

function parseDefinition(raw: unknown, path: string, issues: MappingIssue[]): MappingDefinition | null {
  if (!isObj(raw)) {
    issues.push({ level: 'error', path, message: 'definition must be an object' });
    return null;
  }
  const name = str(raw.name ?? raw.term ?? raw.metric, 200);
  const definition = str(raw.definition ?? raw.description, LIMITS.longText);
  if (!name) {
    issues.push({ level: 'error', path, message: 'definition name is required' });
    return null;
  }
  const kind = oneOf(raw.kind ?? 'metric', DEFINITION_KINDS);
  if (!kind) issues.push({ level: 'warning', path: `${path}.kind`, message: `unknown kind "${raw.kind}", treated as metric` });
  const origin = oneOf(raw.origin, ['builtin', 'ai', 'manual', 'import'] as const);
  return {
    name,
    kind: kind || 'metric',
    definition,
    ...(optStr(raw.sql, LIMITS.text) ? { sql: optStr(raw.sql, LIMITS.text) } : {}),
    ...(raw.verbatim === true ? { verbatim: true } : {}),
    ...(origin ? { origin } : {})
  };
}

/**
 * Turns anything JSON-like (an uploaded file, the raw editor, an AI response) into a normalised
 * document plus structural issues. Never throws.
 */
export function parseMappingDoc(input: unknown): { doc: SchemaMappingDoc; issues: MappingIssue[] } {
  const issues: MappingIssue[] = [];
  let raw: unknown = input;
  if (typeof input === 'string') {
    if (input.length > LIMITS.jsonBytes) {
      return { doc: emptyMappingDoc(), issues: [{ level: 'error', path: '$', message: `JSON is larger than ${LIMITS.jsonBytes / 1_000_000} MB` }] };
    }
    try {
      raw = JSON.parse(input);
    } catch (e: any) {
      return { doc: emptyMappingDoc(), issues: [{ level: 'error', path: '$', message: `Not valid JSON: ${e?.message || e}` }] };
    }
  }
  // A bare list of sheets is accepted as a document with only sheets
  if (Array.isArray(raw)) raw = { sheets: raw };
  if (!isObj(raw)) {
    return { doc: emptyMappingDoc(), issues: [{ level: 'error', path: '$', message: 'The mapping must be a JSON object' }] };
  }
  if (raw.format && raw.format !== MAPPING_FORMAT) {
    issues.push({ level: 'warning', path: 'format', message: `format "${raw.format}" is not "${MAPPING_FORMAT}"; read as ${MAPPING_FORMAT}` });
  }

  const listOf = (key: string, max: number): unknown[] => {
    const v = raw as Record<string, any>;
    if (v[key] === undefined) return [];
    if (!Array.isArray(v[key])) {
      issues.push({ level: 'error', path: key, message: `${key} must be a list` });
      return [];
    }
    if (v[key].length > max) issues.push({ level: 'error', path: key, message: `more than ${max} ${key}` });
    return v[key].slice(0, max);
  };

  const commonColumns: Record<string, string> = {};
  if (isObj(raw.commonColumns)) {
    for (const [k, v] of Object.entries(raw.commonColumns).slice(0, LIMITS.columnsPerSheet)) {
      if (str(k, 300)) commonColumns[str(k, 300)] = str(v);
    }
  } else if (raw.commonColumns !== undefined) {
    issues.push({ level: 'error', path: 'commonColumns', message: 'commonColumns must be an object of header: meaning' });
  }

  const doc: SchemaMappingDoc = {
    format: MAPPING_FORMAT,
    name: str(raw.name, 200) || 'Schema mapping',
    ...(optStr(raw.description) ? { description: optStr(raw.description) } : {}),
    ...(optStr(raw.persona, LIMITS.longText) ? { persona: optStr(raw.persona, LIMITS.longText) } : {}),
    ...(optStr(raw.sourceSystems, 1000) ? { sourceSystems: optStr(raw.sourceSystems, 1000) } : {}),
    ...(optStr(raw.sqlNamingNote, 2000) ? { sqlNamingNote: optStr(raw.sqlNamingNote, 2000) } : {}),
    ...(Array.isArray(raw.defaultSheets) && raw.defaultSheets.length
      ? { defaultSheets: raw.defaultSheets.map((s: unknown) => str(s, 200)).filter(Boolean).slice(0, 20) }
      : {}),
    commonColumns,
    sheets: listOf('sheets', LIMITS.sheets).map((s, i) => parseSheet(s, `sheets[${i}]`, issues)).filter((s): s is MappingSheet => Boolean(s)),
    relationships: listOf('relationships', LIMITS.relationships).map((r, i) => parseRelationship(r, `relationships[${i}]`, issues)).filter((r): r is MappingRelationship => Boolean(r)),
    nonRelationships: listOf('nonRelationships', LIMITS.relationships).map(n => str(n, 1000)).filter(Boolean),
    definitions: listOf('definitions', LIMITS.definitions).map((d, i) => parseDefinition(d, `definitions[${i}]`, issues)).filter((d): d is MappingDefinition => Boolean(d))
  };
  issues.push(...checkMappingStructure(doc));
  return { doc, issues };
}

// ---------------------------------------------------------------------------
// Structural checks (no data needed)
// ---------------------------------------------------------------------------

export function findSheet(doc: SchemaMappingDoc, name: string): MappingSheet | undefined {
  const n = normalizeName(name);
  return doc.sheets.find(s => normalizeName(s.sheet) === n);
}

export function relationshipKey(r: MappingRelationship): string {
  const a = `${normalizeName(r.from.sheet)}.${normalizeName(r.from.column)}`;
  const b = `${normalizeName(r.to.sheet)}.${normalizeName(r.to.column)}`;
  return [a, b].sort().join('|');
}

export function checkMappingStructure(doc: SchemaMappingDoc): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const seenSheets = new Map<string, number>();
  doc.sheets.forEach((s, i) => {
    const key = normalizeName(s.sheet);
    if (seenSheets.has(key)) {
      issues.push({ level: 'error', path: `sheets[${i}]`, message: `sheet "${s.sheet}" is mapped twice (also sheets[${seenSheets.get(key)}])` });
    } else {
      seenSheets.set(key, i);
    }
    if (!s.grain) issues.push({ level: 'warning', path: `sheets[${i}].grain`, message: `"${s.sheet}": say what one row is (grain), so the SQL agent counts the right thing` });
    if (!s.purpose) issues.push({ level: 'warning', path: `sheets[${i}].purpose`, message: `"${s.sheet}": purpose is empty` });
    if (s.columns.length === 0) issues.push({ level: 'warning', path: `sheets[${i}].columns`, message: `"${s.sheet}": no columns documented` });
    const seenCols = new Set<string>();
    s.columns.forEach((c, j) => {
      const ck = normalizeName(c.header);
      if (seenCols.has(ck)) issues.push({ level: 'error', path: `sheets[${i}].columns[${j}]`, message: `"${s.sheet}": column "${c.header}" is listed twice` });
      seenCols.add(ck);
    });
    const empty = s.columns.filter(c => !c.meaning).length;
    if (empty) issues.push({ level: 'warning', path: `sheets[${i}].columns`, message: `"${s.sheet}": ${empty} column(s) have no meaning` });
  });

  const hasColumn = (sheet: string, column: string) => {
    const s = findSheet(doc, sheet);
    if (!s) return false;
    const n = normalizeName(column);
    return s.columns.some(c => normalizeName(c.header) === n || (c.sqlColumn && normalizeName(c.sqlColumn) === n)) ||
      Object.keys(doc.commonColumns).some(h => normalizeName(h) === n);
  };
  const seenRels = new Map<string, number>();
  doc.relationships.forEach((r, i) => {
    const path = `relationships[${i}]`;
    const label = `${r.from.sheet}.${r.from.column} → ${r.to.sheet}.${r.to.column}`;
    for (const [side, end] of [['from', r.from], ['to', r.to]] as const) {
      if (end.sheet === '*') {
        if (side === 'from') issues.push({ level: 'error', path: `${path}.from`, message: `${label}: only "to" may use the * (every sheet) wildcard` });
        continue;
      }
      if (!findSheet(doc, end.sheet)) {
        issues.push({ level: 'error', path: `${path}.${side}`, message: `${label}: sheet "${end.sheet}" is not in this mapping` });
      } else if (!hasColumn(end.sheet, end.column)) {
        issues.push({ level: 'warning', path: `${path}.${side}`, message: `${label}: column "${end.column}" is not documented in "${end.sheet}"` });
      }
    }
    if (normalizeName(r.from.sheet) === normalizeName(r.to.sheet) && normalizeName(r.from.column) === normalizeName(r.to.column)) {
      issues.push({ level: 'error', path, message: `${label}: a column cannot join to itself` });
    }
    const k = relationshipKey(r);
    if (seenRels.has(k)) issues.push({ level: 'warning', path, message: `${label} duplicates relationships[${seenRels.get(k)}]` });
    else seenRels.set(k, i);
  });

  const seenDefs = new Map<string, number>();
  doc.definitions.forEach((d, i) => {
    const k = normalizeName(d.name);
    if (seenDefs.has(k)) issues.push({ level: 'error', path: `definitions[${i}]`, message: `definition "${d.name}" is defined twice` });
    else seenDefs.set(k, i);
    if (!d.definition) issues.push({ level: 'error', path: `definitions[${i}].definition`, message: `definition "${d.name}" is empty` });
  });

  for (const s of doc.defaultSheets || []) {
    if (!findSheet(doc, s)) issues.push({ level: 'warning', path: 'defaultSheets', message: `default sheet "${s}" is not in this mapping` });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Adding, merging, diffing
// ---------------------------------------------------------------------------

export class MappingEditError extends Error {
  constructor(message: string, readonly issues: MappingIssue[] = []) {
    super(message);
  }
}

/**
 * Adds one new sheet (with relationships that involve it and new definitions) to a mapping.
 * Existing sheets, relationships and definitions are never changed: anything that would change them
 * is rejected, so the new version differs from the old one only by additions.
 */
export function addSheetToDoc(
  doc: SchemaMappingDoc,
  input: { sheet: unknown; relationships?: unknown[]; definitions?: unknown[] }
): SchemaMappingDoc {
  const issues: MappingIssue[] = [];
  const sheet = parseSheet(input.sheet, 'sheet', issues);
  const rels = (input.relationships || []).map((r, i) => parseRelationship(r, `relationships[${i}]`, issues)).filter((r): r is MappingRelationship => Boolean(r));
  const defs = (input.definitions || []).map((d, i) => parseDefinition(d, `definitions[${i}]`, issues)).filter((d): d is MappingDefinition => Boolean(d));
  if (!sheet) throw new MappingEditError('The new sheet is not valid', issues);
  if (findSheet(doc, sheet.sheet)) {
    throw new MappingEditError(`"${sheet.sheet}" is already in the mapping. Edit it instead of adding it again.`, [
      { level: 'error', path: 'sheet', message: `sheet "${sheet.sheet}" already exists` }
    ]);
  }
  const newName = normalizeName(sheet.sheet);
  rels.forEach((r, i) => {
    if (normalizeName(r.from.sheet) !== newName && normalizeName(r.to.sheet) !== newName) {
      issues.push({ level: 'error', path: `relationships[${i}]`, message: 'relationships added with a sheet must involve that sheet (other sheets are not changed)' });
    }
  });
  const existingRels = new Set(doc.relationships.map(relationshipKey));
  rels.forEach((r, i) => {
    if (existingRels.has(relationshipKey(r))) issues.push({ level: 'error', path: `relationships[${i}]`, message: 'this relationship already exists' });
  });
  defs.forEach((d, i) => {
    if (doc.definitions.some(x => normalizeName(x.name) === normalizeName(d.name))) {
      issues.push({ level: 'error', path: `definitions[${i}]`, message: `definition "${d.name}" already exists; edit it instead` });
    }
  });

  const now = new Date().toISOString();
  const next: SchemaMappingDoc = {
    ...doc,
    sheets: [...doc.sheets, { ...sheet, origin: sheet.origin || 'manual', updatedAt: now }],
    relationships: [...doc.relationships, ...rels.map(r => ({ ...r, origin: r.origin || 'manual' as const }))],
    definitions: [...doc.definitions, ...defs.map(d => ({ ...d, origin: d.origin || 'manual' as const }))]
  };
  issues.push(...checkMappingStructure(next).filter(i => i.level === 'error'));
  const errors = issues.filter(i => i.level === 'error');
  if (errors.length) throw new MappingEditError(errors[0].message, errors);
  return next;
}

export type MergeMode = 'replace' | 'add_new' | 'upsert';

/**
 * Combines an imported/generated mapping with the current one.
 * - replace: the incoming document as is.
 * - add_new: only sheets, relationships, definitions and common columns that are not there yet.
 * - upsert: add_new, and incoming sheets/definitions also replace the ones with the same name.
 */
export function mergeMappingDocs(base: SchemaMappingDoc, incoming: SchemaMappingDoc, mode: MergeMode) {
  if (mode === 'replace') {
    return { doc: incoming, added: incoming.sheets.map(s => s.sheet), replaced: [] as string[], skipped: [] as string[] };
  }
  const added: string[] = [];
  const replaced: string[] = [];
  const skipped: string[] = [];
  const sheets = [...base.sheets];
  for (const s of incoming.sheets) {
    const i = sheets.findIndex(x => normalizeName(x.sheet) === normalizeName(s.sheet));
    if (i === -1) { sheets.push(s); added.push(s.sheet); }
    else if (mode === 'upsert') { sheets[i] = s; replaced.push(s.sheet); }
    else skipped.push(s.sheet);
  }
  const definitions = [...base.definitions];
  for (const d of incoming.definitions) {
    const i = definitions.findIndex(x => normalizeName(x.name) === normalizeName(d.name));
    if (i === -1) definitions.push(d);
    else if (mode === 'upsert') definitions[i] = d;
  }
  const relKeys = new Set(base.relationships.map(relationshipKey));
  const known = (name: string) => name === '*' || sheets.some(s => normalizeName(s.sheet) === normalizeName(name));
  const relationships = [
    ...base.relationships,
    ...incoming.relationships.filter(r => !relKeys.has(relationshipKey(r)) && known(r.from.sheet) && known(r.to.sheet))
  ];
  const commonColumns = { ...incoming.commonColumns, ...base.commonColumns, ...(mode === 'upsert' ? incoming.commonColumns : {}) };
  const nonRelationships = Array.from(new Set([...base.nonRelationships, ...incoming.nonRelationships]));
  return {
    doc: { ...base, sheets, definitions, relationships, commonColumns, nonRelationships },
    added, replaced, skipped
  };
}

export interface MappingDiff {
  sheetsAdded: string[];
  sheetsRemoved: string[];
  sheetsChanged: string[];
  relationshipsAdded: number;
  relationshipsRemoved: number;
  definitionsAdded: string[];
  definitionsRemoved: string[];
  definitionsChanged: string[];
  settingsChanged: string[];
}

/** Stable comparison of two entries, ignoring edit bookkeeping (origin, updatedAt). */
const same = (a: unknown, b: unknown) => {
  const strip = (v: any) => JSON.stringify(v, (k, x) => (k === 'origin' || k === 'updatedAt' ? undefined : x));
  return strip(a) === strip(b);
};

export function diffMappingDocs(before: SchemaMappingDoc | null, after: SchemaMappingDoc): MappingDiff {
  const b = before || emptyMappingDoc();
  const bySheet = (d: SchemaMappingDoc) => new Map(d.sheets.map(s => [normalizeName(s.sheet), s]));
  const bs = bySheet(b), as = bySheet(after);
  const byDef = (d: SchemaMappingDoc) => new Map(d.definitions.map(x => [normalizeName(x.name), x]));
  const bd = byDef(b), ad = byDef(after);
  const bRels = new Set(b.relationships.map(relationshipKey));
  const aRels = new Set(after.relationships.map(relationshipKey));
  const settings = (['name', 'description', 'persona', 'sourceSystems', 'sqlNamingNote', 'defaultSheets', 'commonColumns', 'nonRelationships'] as const)
    .filter(k => !same(b[k], after[k]));
  return {
    sheetsAdded: after.sheets.filter(s => !bs.has(normalizeName(s.sheet))).map(s => s.sheet),
    sheetsRemoved: b.sheets.filter(s => !as.has(normalizeName(s.sheet))).map(s => s.sheet),
    sheetsChanged: after.sheets.filter(s => bs.has(normalizeName(s.sheet)) && !same(bs.get(normalizeName(s.sheet)), s)).map(s => s.sheet),
    relationshipsAdded: Array.from(aRels).filter(k => !bRels.has(k)).length,
    relationshipsRemoved: Array.from(bRels).filter(k => !aRels.has(k)).length,
    definitionsAdded: after.definitions.filter(d => !bd.has(normalizeName(d.name))).map(d => d.name),
    definitionsRemoved: b.definitions.filter(d => !ad.has(normalizeName(d.name))).map(d => d.name),
    definitionsChanged: after.definitions.filter(d => bd.has(normalizeName(d.name)) && !same(bd.get(normalizeName(d.name)), d)).map(d => d.name),
    settingsChanged: [...settings]
  };
}

export function describeDiff(d: MappingDiff): string {
  const parts: string[] = [];
  const list = (xs: string[]) => (xs.length <= 3 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')} +${xs.length - 3}`);
  if (d.sheetsAdded.length) parts.push(`added sheet${d.sheetsAdded.length > 1 ? 's' : ''} ${list(d.sheetsAdded)}`);
  if (d.sheetsChanged.length) parts.push(`edited ${list(d.sheetsChanged)}`);
  if (d.sheetsRemoved.length) parts.push(`removed ${list(d.sheetsRemoved)}`);
  if (d.relationshipsAdded || d.relationshipsRemoved) {
    parts.push(`relationships +${d.relationshipsAdded}/-${d.relationshipsRemoved}`);
  }
  const defs = d.definitionsAdded.length + d.definitionsChanged.length + d.definitionsRemoved.length;
  if (defs) parts.push(`definitions +${d.definitionsAdded.length}/~${d.definitionsChanged.length}/-${d.definitionsRemoved.length}`);
  if (d.settingsChanged.length) parts.push(`settings: ${d.settingsChanged.join(', ')}`);
  return parts.join('; ') || 'no changes';
}

export function isEmptyDiff(d: MappingDiff): boolean {
  return describeDiff(d) === 'no changes';
}
