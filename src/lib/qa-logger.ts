/**
 * Persistent Q&A Audit & Activity Logging Engine
 * Stores user questions and assistant answers in SQLite for auditing, review, and export.
 */

import { getSQLiteDB } from './sqlite-server';
import { logger } from './logger';

export interface QALogRecord {
  id: string;
  timestamp: string;
  sessionId: string;
  userQuery: string;
  resolvedQuery?: string;
  answer: string;
  intent?: string;
  rowCount?: number;
  detectedLanguage?: string;
  modelUsed?: string;
  status: 'success' | 'clarification' | 'error';
  createdAt: number;
  /** Source tables behind the answer ("Sheet (sql_table)"), for backtracking */
  tablesUsed?: string[];
  latencyMs?: number;
}

/**
 * Ensures the qa_logs table exists in SQLite
 */
let qaTableReady = false;

function ensureQALogTable() {
  if (qaTableReady) return;
  try {
    const db = getSQLiteDB();
    db.exec(`
      CREATE TABLE IF NOT EXISTS qa_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        session_id TEXT,
        user_query TEXT NOT NULL,
        resolved_query TEXT,
        answer TEXT NOT NULL,
        intent TEXT,
        row_count INTEGER DEFAULT 0,
        detected_language TEXT,
        model_used TEXT,
        status TEXT DEFAULT 'success',
        created_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_qa_logs_created_at ON qa_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_qa_logs_session ON qa_logs(session_id);
    `);
    // Columns added later: tables behind each answer and its latency
    const existing = (db.prepare(`PRAGMA table_info(qa_logs)`).all() as { name: string }[]).map(c => c.name);
    if (!existing.includes('tables_used')) db.exec(`ALTER TABLE qa_logs ADD COLUMN tables_used TEXT`);
    if (!existing.includes('latency_ms')) db.exec(`ALTER TABLE qa_logs ADD COLUMN latency_ms INTEGER`);
    qaTableReady = true;
  } catch (err: any) {
    logger.warn('Failed to ensure qa_logs table:', err?.message || err);
  }
}

// In-memory buffer fallback in case SQLite is busy
const inMemoryQALogs: QALogRecord[] = [];

/**
 * Log a Q&A transaction
 */
export function logQATransaction(record: {
  sessionId?: string;
  userQuery: string;
  resolvedQuery?: string;
  answer: string;
  intent?: string;
  rowCount?: number;
  detectedLanguage?: string;
  modelUsed?: string;
  status?: 'success' | 'clarification' | 'error';
  tablesUsed?: string[];
  latencyMs?: number;
}): QALogRecord {
  ensureQALogTable();

  const id = `qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const item: QALogRecord = {
    id,
    timestamp: now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    sessionId: record.sessionId || 'default_session',
    userQuery: record.userQuery,
    resolvedQuery: record.resolvedQuery || record.userQuery,
    answer: record.answer,
    intent: record.intent || 'analytics',
    rowCount: record.rowCount ?? 0,
    detectedLanguage: record.detectedLanguage || 'English',
    modelUsed: record.modelUsed || 'Deterministic Engine',
    status: record.status || 'success',
    createdAt: Date.now(),
    tablesUsed: record.tablesUsed,
    latencyMs: record.latencyMs
  };

  inMemoryQALogs.unshift(item);
  if (inMemoryQALogs.length > 500) {
    inMemoryQALogs.pop();
  }

  try {
    const db = getSQLiteDB();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO qa_logs (
        id, timestamp, session_id, user_query, resolved_query,
        answer, intent, row_count, detected_language, model_used, status, created_at, tables_used, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.timestamp,
      item.sessionId,
      item.userQuery,
      item.resolvedQuery || null,
      item.answer,
      item.intent || null,
      item.rowCount,
      item.detectedLanguage || null,
      item.modelUsed || null,
      item.status,
      item.createdAt,
      item.tablesUsed?.length ? item.tablesUsed.join('; ') : null,
      item.latencyMs ?? null
    );
  } catch (err: any) {
    logger.warn('Error inserting QA log to SQLite, saved in memory:', err?.message || err);
  }

  return item;
}

/**
 * Retrieve Q&A logs with optional search and filtering
 */
export function getQALogs(options: {
  search?: string;
  limit?: number;
  sessionId?: string;
} = {}): QALogRecord[] {
  ensureQALogTable();
  const limit = options.limit || 100;
  const search = options.search?.trim().toLowerCase() || '';

  try {
    const db = getSQLiteDB();
    let query = `SELECT * FROM qa_logs`;
    const params: any[] = [];
    const where: string[] = [];

    if (options.sessionId) {
      where.push(`session_id = ?`);
      params.push(options.sessionId);
    }

    if (search) {
      where.push(`(LOWER(user_query) LIKE ? OR LOWER(answer) LIKE ? OR LOWER(intent) LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];

    if (rows && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        sessionId: r.session_id,
        userQuery: r.user_query,
        resolvedQuery: r.resolved_query,
        answer: r.answer,
        intent: r.intent,
        rowCount: r.row_count,
        detectedLanguage: r.detected_language,
        modelUsed: r.model_used,
        tablesUsed: r.tables_used ? String(r.tables_used).split('; ') : undefined,
        latencyMs: r.latency_ms ?? undefined,
        status: r.status,
        createdAt: r.created_at
      }));
    }
  } catch (err: any) {
    logger.warn('Failed reading from SQLite qa_logs, falling back to memory buffer:', err?.message || err);
  }

  // In-memory fallback
  let filtered = [...inMemoryQALogs];
  if (options.sessionId) {
    filtered = filtered.filter(f => f.sessionId === options.sessionId);
  }
  if (search) {
    filtered = filtered.filter(
      f =>
        f.userQuery.toLowerCase().includes(search) ||
        f.answer.toLowerCase().includes(search) ||
        (f.intent && f.intent.toLowerCase().includes(search))
    );
  }
  return filtered.slice(0, limit);
}

/**
 * Clear all Q&A logs
 */
export function clearAllQALogs(): void {
  ensureQALogTable();
  inMemoryQALogs.length = 0;
  try {
    const db = getSQLiteDB();
    db.exec(`DELETE FROM qa_logs;`);
  } catch (err: any) {
    logger.warn('Failed to clear qa_logs table:', err?.message || err);
  }
}
