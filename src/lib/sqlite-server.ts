import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import type { ColumnProfile } from './tabular-ingest';
export type { ColumnProfile } from './tabular-ingest';

export interface SheetMetadata {
  sheetName: string;
  tableName: string;
  rowCount: number;
  columns: string[];
  rawColumns?: string[];
  schema: { column_name: string; column_type: string }[];
  profiles?: Record<string, ColumnProfile>;
  relationships?: { foreignKey: string; targetTable: string; targetKey: string; matchPct?: number; status?: string }[];
  notes?: string[];
  /** Workbook sheet the table came from, and its cell range there */
  sourceSheet?: string;
  range?: string;
  /** Load verified against the file (counts, sums, sample rows) */
  verified?: boolean;
  /** Numbers repeated on every row of the same key: aggregate per key before summing */
  repeatedTotals?: { key: string; columns: string[] } | null;
}

export interface DatasetMetadata {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  rawColumns: string[];
  schema: { column_name: string; column_type: string }[];
  columnProfiles?: Record<string, ColumnProfile>;
  /** Every table found in the upload (Excel sheets and tables stacked inside a CSV). */
  sheets?: SheetMetadata[];
  /** Table mirrored into uploaded_data (the largest one). */
  primaryTable?: string;
  /** Result of mapping + verification at upload */
  mapping?: { tables: number; verifiedTables: number; rowsLoaded: number; relationships: number; verifiedRelationships: number; failures: string[] };
  uploadTimestamp: string;
  tableName: string;
  /** Where the data came from ("upload", "folder:<dir>") and the connector's dataset id */
  source?: string;
  sourceId?: string;
  /** Whole-data understanding built at ingest by the Data Cartographer */
  understanding?: DataUnderstanding;
}

export interface DataUnderstanding {
  /** Dataset version this was built for */
  version: string;
  status: 'building' | 'ready' | 'facts-only';
  /** Exact figures over every row of every table (deterministic) */
  factSheet: string;
  /** Business meaning of the tables and how they connect (LLM, built once per dataset) */
  semanticMap?: string;
  builtInMs?: number;
  /** When the semantic map last failed (epoch ms), so a failed build is retried later instead of never */
  failedAt?: number;
  /** Semantic-map format; a map from an older format is rebuilt */
  format?: number;
}

const META_TABLE = '_dataset_meta';

const globalForSQLite = globalThis as unknown as {
  sqliteInstance: Database.Database | undefined;
  sqliteMetadata: DatasetMetadata | null | undefined;
};

export const SQLITE_FILE_PATH = path.join(process.cwd(), 'data', 'maruti.sqlite');

/**
 * High-performance SQLite instance with connection pooling and memory mapping.
 * Delivers sub-1ms analytical query execution.
 */
export function getSQLiteDB(): Database.Database {
  if (!globalForSQLite.sqliteInstance) {
    try {
      const dataDir = path.dirname(SQLITE_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const db = new Database(SQLITE_FILE_PATH, {
        fileMustExist: false,
        timeout: 5000
      });

      // Ultra-low latency SQLite optimizations
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -64000'); // 64MB memory cache
      db.pragma('temp_store = MEMORY');
      db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O

      globalForSQLite.sqliteInstance = db;
    } catch (e) {
      console.warn('Falling back to in-memory SQLite database:', e);
      const memDb = new Database(':memory:');
      memDb.pragma('cache_size = -64000');
      memDb.pragma('temp_store = MEMORY');
      globalForSQLite.sqliteInstance = memDb;
    }
  }
  return globalForSQLite.sqliteInstance;
}

function normalizeRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      sanitized[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return sanitized;
  });
}

/**
 * Executes model- or user-influenced SQL. The engine itself must confirm the statement
 * is read-only and returns data; anything else is rejected before execution.
 */
export function executeReadOnlyQuery(sql: string, params: any[] = []): Record<string, any>[] {
  const stmt = getSQLiteDB().prepare(sql.trim());
  if (!stmt.readonly || !stmt.reader) {
    throw new Error('Only read-only SELECT statements may be executed');
  }
  return normalizeRows(stmt.all(...params) as Record<string, any>[]);
}

let cachedSample: { version: string; rows: Record<string, any>[] } | null = null;

/** First rows of the dataset, cached per dataset version (used as LLM schema hints). */
export function getSampleRows(limit = 3): Record<string, any>[] {
  const version = getDatasetVersion();
  if (cachedSample && cachedSample.version === version) return cachedSample.rows;
  const rows = executeReadOnlyQuery(`SELECT * FROM uploaded_data LIMIT ${Math.max(1, Math.min(limit, 10))}`);
  cachedSample = { version, rows };
  return rows;
}

/** Identifies the loaded dataset so caches invalidate when a new file is ingested. */
export function getDatasetVersion(): string {
  const meta = getDatasetMetadata();
  if (!meta) return 'none';
  return `${meta.tableName}:${meta.fileName}:${meta.rowCount}:${meta.uploadTimestamp}`;
}

/**
 * Execute raw SQLite query with microsecond profiling
 */
export function executeSQLiteQuery(sql: string, params: any[] = []): Record<string, any>[] {
  const db = getSQLiteDB();
  const trimmed = sql.trim();
  const isSelect = /^(\s*SELECT|\s*WITH|\s*PRAGMA table_info)/i.test(trimmed);

  if (isSelect) {
    const stmt = db.prepare(trimmed);
    return normalizeRows(stmt.all(...params) as Record<string, any>[]);
  } else {
    // DDL or DML statement
    db.exec(trimmed);
    return [];
  }
}

export function setDatasetMetadata(meta: DatasetMetadata | null): void {
  globalForSQLite.sqliteMetadata = meta;
  try {
    const db = getSQLiteDB();
    db.exec(`CREATE TABLE IF NOT EXISTS ${META_TABLE} (key TEXT PRIMARY KEY, value TEXT);`);
    if (meta) {
      db.prepare(`INSERT OR REPLACE INTO ${META_TABLE} (key, value) VALUES ('dataset', ?)`).run(JSON.stringify(meta));
    } else {
      db.prepare(`DELETE FROM ${META_TABLE} WHERE key = 'dataset'`).run();
    }
  } catch (err) {
    console.warn('Could not persist dataset metadata:', err);
  }
}

function loadPersistedMetadata(): DatasetMetadata | null {
  try {
    const row = getSQLiteDB()
      .prepare(`SELECT value FROM ${META_TABLE} WHERE key = 'dataset'`)
      .get() as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as DatasetMetadata) : null;
  } catch {
    return null;
  }
}

export interface QueryableTable {
  tableName: string;
  sheetName: string;
  rowCount: number;
  columns: string[];
  profiles: Record<string, ColumnProfile>;
  relationships: { foreignKey: string; targetTable: string; targetKey: string; matchPct?: number; status?: string }[];
  repeatedTotals?: { key: string; columns: string[] } | null;
}

/**
 * Tables that analysis may read. For multi-table uploads these are the per-sheet tables
 * (uploaded_data is only a mirror of the largest one); otherwise it is uploaded_data itself.
 */
export function getQueryableTables(meta: DatasetMetadata | null = getDatasetMetadata()): QueryableTable[] {
  if (!meta) return [];
  if (meta.sheets && meta.sheets.length > 0) {
    return meta.sheets.map(s => ({
      tableName: s.tableName,
      sheetName: s.sheetName,
      rowCount: s.rowCount,
      columns: s.columns,
      profiles: s.profiles || fallbackProfiles(s.schema),
      relationships: s.relationships || [],
      repeatedTotals: s.repeatedTotals
    }));
  }
  return [{
    tableName: 'uploaded_data',
    sheetName: meta.fileName,
    rowCount: meta.rowCount,
    columns: meta.columns,
    profiles: (meta.columnProfiles as Record<string, ColumnProfile>) || fallbackProfiles(meta.schema),
    relationships: []
  }];
}

function fallbackProfiles(schema: { column_name: string; column_type: string }[]): Record<string, ColumnProfile> {
  const out: Record<string, ColumnProfile> = {};
  for (const c of schema || []) {
    const isNumeric = /REAL|INT|NUM/i.test(c.column_type);
    out[c.column_name] = { column_name: c.column_name, column_type: isNumeric ? 'REAL' : 'TEXT', isNumeric };
  }
  return out;
}

/** Names of all tables SQL is allowed to read for the current dataset. */
export function getAllowedTableNames(meta: DatasetMetadata | null = getDatasetMetadata()): string[] {
  const names = new Set<string>(['uploaded_data']);
  for (const t of getQueryableTables(meta)) names.add(t.tableName);
  return Array.from(names);
}

/**
 * Retrieve metadata before research.
 * If server restarts, inspects SQLite schema and reconstructs column profiles.
 */
export function getDatasetMetadata(): DatasetMetadata | null {
  try {
    const db = getSQLiteDB();
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_data'")
      .get();

    if (tableExists) {
      const countRes = db.prepare('SELECT COUNT(*) as cnt FROM uploaded_data').get() as { cnt: number };
      // The internal auto-increment "id" is not a data column
      const pragmaInfo = (db.prepare('PRAGMA table_info(uploaded_data)').all() as { name: string; type: string; pk: number }[])
        .filter(p => !(p.name === 'id' && p.pk === 1));
      const cols = pragmaInfo.map(p => p.name);
      const schema = pragmaInfo.map(p => ({
        column_name: p.name,
        column_type: p.type || 'TEXT'
      }));

      if (!globalForSQLite.sqliteMetadata) {
        globalForSQLite.sqliteMetadata = loadPersistedMetadata();
      }

      // If existing metadata matches columns, return it, otherwise reconstruct fresh
      if (
        globalForSQLite.sqliteMetadata &&
        globalForSQLite.sqliteMetadata.columns.length === cols.length &&
        globalForSQLite.sqliteMetadata.columns.every((c, i) => c === cols[i])
      ) {
        return globalForSQLite.sqliteMetadata;
      }

      // Columns changed underneath us (e.g. table rebuilt outside an upload): refresh them but keep
      // everything else we know about the upload (sheets, mapping, primary table, profiles)
      const recovered: DatasetMetadata = {
        ...(globalForSQLite.sqliteMetadata || {}),
        fileName: globalForSQLite.sqliteMetadata?.fileName || 'maruti_database.sqlite',
        fileSize: globalForSQLite.sqliteMetadata?.fileSize || 0,
        rowCount: countRes?.cnt || 0,
        columns: cols,
        rawColumns: cols,
        schema,
        sheets: globalForSQLite.sqliteMetadata?.sheets,
        uploadTimestamp: globalForSQLite.sqliteMetadata?.uploadTimestamp || new Date().toISOString(),
        tableName: 'uploaded_data'
      };
      globalForSQLite.sqliteMetadata = recovered;
      return recovered;
    }
  } catch (err) {
    // Database not yet initialized
  }

  return null;
}

/**
 * Drops all uploaded tables and cleans in-memory metadata
 */
export function clearSQLiteDataset(): void {
  const db = getSQLiteDB();
  try {
    db.exec('DROP VIEW IF EXISTS excel_data;');
  } catch {}
  try {
    db.exec('DROP VIEW IF EXISTS dealership_sales;');
  } catch {}
  try {
    db.exec('DROP TABLE IF EXISTS uploaded_data;');
  } catch {}
  try {
    db.exec('DROP TABLE IF EXISTS raw_uploaded_data;');
  } catch {}
  dropSheetTables();
  for (const t of ['_schema_tables', '_schema_columns', '_schema_relationships']) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${t};`);
    } catch {}
  }
  setDatasetMetadata(null);
  cachedSample = null;
}

/** Removes per-sheet tables left by any earlier upload. */
export function dropSheetTables(): void {
  const db = getSQLiteDB();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sheet\\_%' ESCAPE '\\'")
    .all() as { name: string }[];
  for (const t of tables) {
    try {
      db.exec(`DROP TABLE IF EXISTS "${t.name.replace(/"/g, '""')}";`);
    } catch {}
  }
}
