/**
 * Tabular Ingestion Core
 * Turns raw grid data (CSV text or an Excel sheet) into clean, typed tables.
 *
 * Business files rarely hold one tidy table: a single CSV exported from Excel often stacks several
 * "sheets" one below another (a title line, a header row, data, a blank line, the next table...).
 * Every such block is detected and kept as its own table so no part of the upload is ignored.
 *
 * Values are only cleaned (currency symbols, thousands separators, N/A markers, date formats),
 * never invented. Subtotal/total rows are dropped so that sums are not double counted.
 */

export type RawCell = string | number | boolean | Date | null | undefined;
export type CleanValue = string | number | null;

export interface ParsedTable {
  /** Display name, e.g. "Sales" or "Sales › Targets" */
  name: string;
  headers: string[];
  rows: RawCell[][];
  notes: string[];
  /** Rows inside the table's block that were deliberately not loaded (totals, notes, repeated headers) */
  skippedRows?: number;
  /** 0-based position of the header row / last data row / first and last column within the sheet */
  rowStart?: number;
  rowEnd?: number;
  colStart?: number;
  colEnd?: number;
  /** Excel-style address of the table, e.g. "B3:H120" */
  range?: string;
}

export interface ColumnProfile {
  column_name: string;
  column_type: 'REAL' | 'TEXT';
  /** Header exactly as it appeared in the file */
  sourceHeader?: string;
  isNumeric: boolean;
  isDate?: boolean;
  nullCount?: number;
  distinctCount?: number;
  /** Most frequent values (text columns), highest first */
  distinctValues?: string[];
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  dateMin?: string;
  dateMax?: string;
}

export interface CleanTable {
  name: string;
  columns: string[];
  rawColumns: string[];
  rows: Record<string, CleanValue>[];
  profiles: Record<string, ColumnProfile>;
  notes: string[];
  /** Data rows in the source block (loaded + skipped) */
  sourceRows: number;
  /** Rows not loaded on purpose: totals, notes, repeated headers, fully empty rows */
  skippedRows: number;
  range?: string;
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

const NULL_TOKENS = /^(n\/?a|na|null|none|nil|-+|—|–|#n\/a|#na|#div\/0!|#value!|#ref!|#name\?|#num!|\?)$/i;
const TOTAL_ROW = /^(grand\s+total|sub[\s-]?total|total|totals|sum|overall)\b[:\s]*$/i;
const ID_LIKE_HEADER = /(^|_)(id|code|sku|uuid|pin|pincode|zip|phone|mobile|email|no|number|vin|chassis)($|_)/i;

export function isBlankCell(v: RawCell): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

/** Parses "₹1,23,456", "$ 1,200.50", "(1,234)", "25%", "Rs. 4.5" into numbers; otherwise null. */
export function parseNumberLoose(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^(₹|rs\.?|inr|\$|usd|€|£)\s*/i, '').replace(/\s*(₹|inr|usd)$/i, '');
  const isPercent = s.endsWith('%');
  if (isPercent) s = s.slice(0, -1).trim();
  s = s.replace(/,/g, '').replace(/\s+/g, '');
  if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function looksNumeric(v: RawCell): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return parseNumberLoose(v) !== null;
  return false;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
};

interface DateParts { y: number; m: number; d?: number; time?: string; ambiguous?: [number, number] }

function fullYear(y: number): number {
  return y < 100 ? (y < 70 ? 2000 + y : 1900 + y) : y;
}

function monthFromName(name: string): number | undefined {
  return MONTHS[name.slice(0, 4).toLowerCase()] ?? MONTHS[name.slice(0, 3).toLowerCase()];
}

/** Recognises the date formats business spreadsheets actually use. Returns null for non-dates. */
export function parseDateParts(raw: string): DateParts | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;

  // 2026-01-15, 2026/01/15, 2026-01-15 10:30[:00], 2026-01-15T10:30:00Z
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/))) {
    const time = m[4] ? `${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}` : undefined;
    return { y: +m[1], m: +m[2], d: +m[3], time };
  }
  // 15/01/2026, 01-15-2026, 15.01.26 (+ optional time) - day/month order resolved per column
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i))) {
    let time: string | undefined;
    if (m[4]) {
      let h = +m[4];
      if (m[7]) h = (h % 12) + (m[7].toLowerCase() === 'pm' ? 12 : 0);
      time = `${String(h).padStart(2, '0')}:${m[5]}:${m[6] || '00'}`;
    }
    return { y: fullYear(+m[3]), m: 0, ambiguous: [+m[1], +m[2]], time };
  }
  // 2026-01 / 2026/1 (month periods)
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12) {
    return { y: +m[1], m: +m[2] };
  }
  // Jan 2026, January-2026, Jan'26, Jan-26
  if ((m = s.match(/^([A-Za-z]{3,9})[\s\-'’,.]*(\d{2}|\d{4})$/))) {
    const month = monthFromName(m[1]);
    if (month) return { y: fullYear(+m[2]), m: month };
  }
  // 15-Jan-2026, 15 January 2026, 15 Jan, 2026
  if ((m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,]*(\d{2}|\d{4})$/))) {
    const month = monthFromName(m[2]);
    if (month) return { y: fullYear(+m[3]), m: month, d: +m[1] };
  }
  // Jan 15, 2026
  if ((m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const month = monthFromName(m[1]);
    if (month) return { y: fullYear(+m[3]), m: month, d: +m[2] };
  }
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateParts(p: DateParts, dayFirst: boolean): string | null {
  const { y } = p;
  let { m, d } = p;
  if (p.ambiguous) {
    const [a, b] = p.ambiguous;
    [d, m] = dayFirst ? [a, b] : [b, a];
  }
  if (!m || m < 1 || m > 12 || y < 1900 || y > 2200) return null;
  if (d === undefined) return `${y}-${pad2(m)}`;
  if (d < 1 || d > 31) return null;
  const date = `${y}-${pad2(m)}-${pad2(d)}`;
  return p.time && p.time !== '00:00:00' ? `${date} ${p.time}` : date;
}

function formatJsDate(v: Date): string | null {
  if (isNaN(v.getTime())) return null;
  const date = `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  const hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
  return hasTime ? `${date} ${pad2(v.getHours())}:${pad2(v.getMinutes())}:${pad2(v.getSeconds())}` : date;
}

// ---------------------------------------------------------------------------
// Block detection: split one grid into every table it contains
// ---------------------------------------------------------------------------

function nonEmptyCells(row: RawCell[]): RawCell[] {
  return row.filter(c => !isBlankCell(c));
}

function isBlankRow(row: RawCell[] | undefined): boolean {
  return !row || row.every(isBlankCell);
}

function isHeaderLike(row: RawCell[]): boolean {
  const cells = nonEmptyCells(row);
  return (
    cells.length >= 2 &&
    cells.every(c => typeof c === 'string' && !looksNumeric(c) && !parseDateParts(c) && !NULL_TOKENS.test(c.trim()))
  );
}

/** A lone text cell such as "Sheet: Targets", "## Dealer Sales" or "Table 2 - Leads". */
function titleOf(row: RawCell[]): string | null {
  const cells = nonEmptyCells(row);
  if (cells.length !== 1 || typeof cells[0] !== 'string') return null;
  const text = cells[0].trim();
  if (looksNumeric(text) || text.length > 120) return null;
  return text
    .replace(/^#+\s*/, '')
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/^(sheet|table|tab)\s*[:\-–]\s*/i, '')
    .trim() || null;
}

function sameRow(a: RawCell[], b: RawCell[]): boolean {
  const norm = (r: RawCell[]) => r.map(c => (isBlankCell(c) ? '' : String(c).trim().toLowerCase())).join('\u0001').replace(/\u0001+$/, '');
  return norm(a) === norm(b);
}

function nextNonBlank(grid: RawCell[][], from: number): number {
  let i = from;
  while (i < grid.length && isBlankRow(grid[i])) i++;
  return i;
}

/**
 * Splits a grid into tables. Boundaries are: title lines followed by a header, or a new header row
 * (after a blank line, or where the current table has numbers in a column the new row has text in).
 */
export function splitGridIntoTables(grid: RawCell[][], baseName: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  let current: ParsedTable | null = null;
  let numericCols = new Set<number>();
  let pendingTitle: string | null = null;
  let untitledCount = 0;

  const finish = () => {
    if (current && current.rows.length > 0) tables.push(current);
    current = null;
  };

  const start = (header: RawCell[], rowIndex: number) => {
    finish();
    untitledCount += pendingTitle ? 0 : 1;
    current = {
      name: pendingTitle || `Table ${untitledCount}`,
      headers: header.map(c => (isBlankCell(c) ? '' : String(c).trim())),
      rows: [],
      notes: [],
      skippedRows: 0,
      rowStart: rowIndex,
      rowEnd: rowIndex
    };
    numericCols = new Set<number>();
    pendingTitle = null;
  };

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] || [];
    if (isBlankRow(row)) continue;

    const afterBlank = i > 0 && isBlankRow(grid[i - 1]);
    const title = titleOf(row);
    const nextIdx = nextNonBlank(grid, i + 1);
    const next = grid[nextIdx];

    // Title line introducing a new table
    if (title && next && isHeaderLike(next) && (!current || (current as ParsedTable).rows.length > 0)) {
      finish();
      pendingTitle = title;
      continue;
    }

    if (!current) {
      if (title && (!next || !isHeaderLike(next))) continue; // stray note above the first table
      start(row, i);
      continue;
    }

    const table: ParsedTable = current;
    if (sameRow(row, table.headers)) { // header repeated (page breaks in exports)
      table.skippedRows = (table.skippedRows || 0) + 1;
      table.rowEnd = i;
      continue;
    }

    if (isHeaderLike(row) && table.rows.length > 0) {
      const cells = row.map(c => (isBlankCell(c) ? null : c));
      const conflictsWithNumbers = cells.some((c, idx) => c !== null && numericCols.has(idx));
      const widthChanged = nonEmptyCells(row).length !== table.headers.filter(Boolean).length;
      if (conflictsWithNumbers || (afterBlank && widthChanged)) {
        start(row, i);
        continue;
      }
    }

    // Lone text line inside a wide table: a note/footnote, not data
    if (title && table.headers.filter(Boolean).length >= 3) {
      table.notes.push(`Skipped note line: "${title.slice(0, 60)}"`);
      table.skippedRows = (table.skippedRows || 0) + 1;
      table.rowEnd = i;
      continue;
    }

    const first = nonEmptyCells(row)[0];
    if (typeof first === 'string' && TOTAL_ROW.test(first.trim())) {
      table.notes.push('Dropped a total/subtotal row so sums are not double counted');
      table.skippedRows = (table.skippedRows || 0) + 1;
      table.rowEnd = i;
      continue;
    }

    table.rows.push(row);
    table.rowEnd = i;
    row.forEach((c, idx) => {
      if (looksNumeric(c)) numericCols.add(idx);
    });
  }
  finish();

  // Name tables: a single table takes the base name; several are "<base> › <title>"
  if (tables.length === 1) {
    if (!tables[0].name.startsWith('Table ')) tables[0].notes.push(`Title in sheet: "${tables[0].name}"`);
    tables[0].name = baseName;
  } else {
    for (const t of tables) t.name = `${baseName} › ${t.name}`;
  }
  return tables;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * Splits a sheet into column bands separated by completely empty columns. Bands whose rows start and
 * end on the same lines are one table with a blank column, so they are merged back together.
 */
function splitIntoColumnBands(grid: RawCell[][]): { start: number; end: number }[] {
  const width = Math.max(0, ...grid.map(r => (r ? r.length : 0)));
  const bands: { start: number; end: number }[] = [];
  let bandStart = -1;
  for (let c = 0; c <= width; c++) {
    const empty = c === width || grid.every(r => isBlankCell(r?.[c]));
    if (!empty && bandStart < 0) bandStart = c;
    if (empty && bandStart >= 0) {
      bands.push({ start: bandStart, end: c - 1 });
      bandStart = -1;
    }
  }
  const extent = (b: { start: number; end: number }) => {
    let first = -1, last = -1;
    grid.forEach((r, i) => {
      if (r && r.slice(b.start, b.end + 1).some(v => !isBlankCell(v))) {
        if (first < 0) first = i;
        last = i;
      }
    });
    return `${first}:${last}`;
  };
  const merged: { start: number; end: number }[] = [];
  for (const b of bands) {
    const prev = merged[merged.length - 1];
    if (prev && extent(prev) === extent(b)) prev.end = b.end;
    else merged.push({ ...b });
  }
  return merged.length ? merged : [{ start: 0, end: Math.max(0, width - 1) }];
}

/**
 * Every table in a sheet: side-by-side tables (separated by an empty column) and tables stacked
 * vertically (separated by blank lines / titles / new header rows). `origin` is where the grid
 * starts in the sheet, so ranges match what the user sees in Excel.
 */
export function splitSheetIntoTables(grid: RawCell[][], baseName: string, origin = { r: 0, c: 0 }): ParsedTable[] {
  const all: ParsedTable[] = [];
  for (const band of splitIntoColumnBands(grid)) {
    const bandGrid = grid.map(r => (r || []).slice(band.start, band.end + 1));
    for (const t of splitGridIntoTables(bandGrid, '\u0000')) {
      t.name = t.name.replace(/^\u0000( › )?/, '');
      if (!t.name) {
        const titled = t.notes.find(n => n.startsWith('Title in sheet: '));
        if (titled) {
          t.name = titled.replace(/^Title in sheet: "(.*)"$/, '$1');
          t.notes = t.notes.filter(n => n !== titled);
        }
      }
      const used = t.headers.map((h, i) => (h || t.rows.some(r => !isBlankCell(r[i])) ? i : -1)).filter(i => i >= 0);
      t.colStart = band.start + (used[0] ?? 0);
      t.colEnd = band.start + (used[used.length - 1] ?? 0);
      t.range = `${columnLetter(origin.c + t.colStart)}${origin.r + (t.rowStart ?? 0) + 1}:${columnLetter(origin.c + t.colEnd)}${origin.r + (t.rowEnd ?? 0) + 1}`;
      all.push(t);
    }
  }

  // Names: one table -> the sheet name; several -> "<sheet> › <title or Table n>", numbered across bands
  let untitled = 0;
  const seen = new Set<string>();
  for (const t of all) {
    let name = all.length === 1 ? baseName : `${baseName} › ${!t.name || /^Table \d+$/.test(t.name) ? `Table ${++untitled}` : t.name}`;
    if (all.length === 1 && t.name && !/^Table \d+$/.test(t.name)) t.notes.push(`Title in sheet: "${t.name}"`);
    let n = 2;
    const base = name;
    while (seen.has(name)) name = `${base} (${n++})`;
    seen.add(name);
    t.name = name;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Cleaning, typing and profiling
// ---------------------------------------------------------------------------

export function sanitizeIdentifier(raw: string, fallback: string): string {
  let clean = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!clean) clean = fallback;
  if (/^[0-9]/.test(clean)) clean = `col_${clean}`;
  return clean.slice(0, 60);
}

function coerceCell(v: RawCell): CleanValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date) return formatJsDate(v);
  const s = String(v).trim();
  if (!s || NULL_TOKENS.test(s)) return null;
  return s;
}

/** Converts a parsed block into typed rows with SQL-safe column names and per-column profiles. */
export function cleanTable(table: ParsedTable): CleanTable {
  const notes = [...table.notes];

  // Drop columns that have neither a header nor any data (common in offset Excel ranges)
  const width = Math.max(table.headers.length, ...table.rows.map(r => r.length));
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    const hasHeader = Boolean(table.headers[c]);
    const hasData = table.rows.some(r => !isBlankCell(r[c]));
    if (hasHeader || hasData) keep.push(c);
  }

  const rawColumns: string[] = [];
  const columns: string[] = [];
  keep.forEach((c, i) => {
    const header = table.headers[c] || `Column ${i + 1}`;
    const base = sanitizeIdentifier(header, `column_${i + 1}`);
    let unique = base;
    let n = 2;
    while (columns.includes(unique) || unique === 'id') unique = `${base}_${n++}`;
    columns.push(unique);
    rawColumns.push(header);
  });

  let rows: Record<string, CleanValue>[] = table.rows.map(r => {
    const o: Record<string, CleanValue> = {};
    keep.forEach((c, i) => {
      o[columns[i]] = coerceCell(r[c]);
    });
    return o;
  });

  const profiles: Record<string, ColumnProfile> = {};
  columns.forEach((col, i) => {
    const header = rawColumns[i];
    const values = rows.map(r => r[col]).filter((v): v is string | number => v !== null);
    const idLike = ID_LIKE_HEADER.test(col);

    // Numeric column: ≥95% of values parse as numbers (IDs/codes stay text so they remain labels)
    const numericValues = values.map(v => (typeof v === 'number' ? v : parseNumberLoose(v)));
    const numericCount = numericValues.filter(v => v !== null).length;
    const isNumeric = !idLike && values.length > 0 && numericCount / values.length >= 0.95;

    if (isNumeric) {
      let dropped = 0;
      rows.forEach(r => {
        const v = r[col];
        if (v === null || typeof v === 'number') return;
        const n = parseNumberLoose(v);
        if (n === null) dropped++;
        r[col] = n;
      });
      if (dropped > 0) notes.push(`"${header}": ${dropped} non-numeric value(s) treated as blank`);
    } else if (idLike) {
      rows.forEach(r => {
        if (typeof r[col] === 'number') r[col] = String(r[col]);
      });
    }

    // Date column: ≥80% of text values parse as dates → normalise to ISO so SQL can group by month
    let isDate = false;
    if (!isNumeric) {
      const textValues = values.filter((v): v is string => typeof v === 'string');
      const parsed = textValues.map(parseDateParts);
      const okCount = parsed.filter(Boolean).length;
      if (textValues.length > 0 && okCount / textValues.length >= 0.8) {
        const ambiguous = parsed.filter(p => p?.ambiguous) as DateParts[];
        const monthFirst = ambiguous.some(p => p.ambiguous![1] > 12) && !ambiguous.some(p => p.ambiguous![0] > 12);
        const dayFirst = !monthFirst; // Indian convention (DD/MM) unless the data proves otherwise
        rows.forEach(r => {
          const v = r[col];
          if (typeof v !== 'string') return;
          const p = parseDateParts(v);
          const iso = p ? formatDateParts(p, dayFirst) : null;
          if (iso) r[col] = iso;
        });
        isDate = true;
        if (ambiguous.length > 0) {
          notes.push(`"${header}": dates read as ${dayFirst ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}`);
        }
      }
    }

    profiles[col] = profileColumn(col, header, rows.map(r => r[col]), isNumeric, isDate);
  });

  // Drop rows that became completely empty after cleaning
  const before = rows.length;
  rows = rows.filter(r => columns.some(c => r[c] !== null));
  if (rows.length < before) notes.push(`${before - rows.length} empty row(s) skipped`);

  return {
    name: table.name,
    columns,
    rawColumns,
    rows,
    profiles,
    notes: Array.from(new Set(notes)),
    sourceRows: table.rows.length + (table.skippedRows || 0),
    skippedRows: (table.skippedRows || 0) + (before - rows.length),
    range: table.range
  };
}

function profileColumn(col: string, header: string, values: CleanValue[], isNumeric: boolean, isDate: boolean): ColumnProfile {
  const present = values.filter((v): v is string | number => v !== null);
  const profile: ColumnProfile = {
    column_name: col,
    column_type: isNumeric ? 'REAL' : 'TEXT',
    sourceHeader: header,
    isNumeric,
    isDate: isDate || undefined,
    nullCount: values.length - present.length
  };

  const counts = new Map<string, number>();
  for (const v of present) counts.set(String(v), (counts.get(String(v)) || 0) + 1);
  profile.distinctCount = counts.size;

  if (isNumeric) {
    const nums = present as number[];
    if (nums.length > 0) {
      let min = Infinity, max = -Infinity, sum = 0;
      for (const n of nums) {
        if (n < min) min = n;
        if (n > max) max = n;
        sum += n;
      }
      profile.min = min;
      profile.max = max;
      profile.sum = sum;
      profile.avg = sum / nums.length;
    }
  } else if (isDate) {
    const sorted = (present as string[]).filter(v => /^\d{4}-\d{2}/.test(v)).sort();
    profile.dateMin = sorted[0];
    profile.dateMax = sorted[sorted.length - 1];
  } else {
    profile.distinctValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([v]) => v);
  }
  return profile;
}

/** Builds a grid from JSON records (union of keys, first-seen order). */
export function gridFromRecords(records: Record<string, any>[]): RawCell[][] {
  const keys: string[] = [];
  for (const r of records) for (const k of Object.keys(r || {})) if (!keys.includes(k)) keys.push(k);
  const toCell = (v: any): RawCell =>
    v === null || v === undefined ? null : typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
  return [keys, ...records.map(r => keys.map(k => toCell(r?.[k])))];
}
