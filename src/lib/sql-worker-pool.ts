/**
 * Parallel read-only SQL execution (server only).
 *
 * better-sqlite3 is synchronous: on the main thread, every query blocks the event loop, so the parts
 * of a multi-part question run one after another and a slow query stalls every other request.
 * This pool runs queries on worker threads, each with its own read-only connection to the same
 * database file (WAL mode allows concurrent readers), so independent queries run at the same time
 * and a runaway query is cut off by a timeout (its worker is replaced) instead of freezing the app.
 *
 * Falls back to the main-thread connection when workers cannot start (in-memory DB, missing module).
 */

import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { SQLITE_FILE_PATH, executeReadOnlyQuery, getSQLiteDB } from './sqlite-server';
import { logger } from './logger';

const QUERY_TIMEOUT_MS = Number(process.env.SQL_QUERY_TIMEOUT_MS || 30000);
const POOL_SIZE = Math.max(2, Math.min(Number(process.env.SQL_WORKERS || 0) || os.cpus().length - 1, 8));

// Plain CommonJS so it runs without the app's bundler; the engine itself enforces read-only statements
const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads');
const Database = require(workerData.modulePath);
const db = new Database(workerData.file, { readonly: true, fileMustExist: true, timeout: 5000 });
db.pragma('cache_size = -32000');
db.pragma('mmap_size = 268435456');
db.pragma('query_only = ON');
parentPort.on('message', ({ id, sql }) => {
  try {
    const stmt = db.prepare(sql);
    if (!stmt.readonly || !stmt.reader) throw new Error('Only read-only SELECT statements may be executed');
    stmt.safeIntegers(false);
    parentPort.postMessage({ id, rows: stmt.all() });
  } catch (e) {
    parentPort.postMessage({ id, error: String((e && e.message) || e) });
  }
});
`;

interface Job {
  id: number;
  sql: string;
  resolve: (rows: Record<string, any>[]) => void;
  reject: (err: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

interface Slot {
  worker: Worker;
  busy: Job | null;
}

class SqlWorkerPool {
  private slots: Slot[] = [];
  private queue: Job[] = [];
  private nextId = 1;

  constructor(private readonly modulePath: string, private readonly file: string, size: number) {
    for (let i = 0; i < size; i++) this.slots.push(this.spawn());
  }

  private spawn(): Slot {
    const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { modulePath: this.modulePath, file: this.file } });
    worker.unref();
    const slot: Slot = { worker, busy: null };
    worker.on('message', (msg: { id: number; rows?: Record<string, any>[]; error?: string }) => {
      const job = slot.busy;
      if (!job || job.id !== msg.id) return;
      clearTimeout(job.timer);
      slot.busy = null;
      if (msg.error !== undefined) job.reject(new Error(msg.error));
      else job.resolve(msg.rows || []);
      this.pump();
    });
    worker.on('error', err => this.replace(slot, err));
    worker.on('exit', code => {
      if (code !== 0) this.replace(slot, new Error(`SQL worker exited with code ${code}`));
    });
    return slot;
  }

  /** A crashed or timed-out worker fails its job and is replaced */
  private replace(slot: Slot, err: Error): void {
    const i = this.slots.indexOf(slot);
    if (i === -1) return;
    const job = slot.busy;
    slot.busy = null;
    if (job) {
      clearTimeout(job.timer);
      job.reject(err);
    }
    slot.worker.removeAllListeners();
    slot.worker.terminate().catch(() => {});
    this.slots[i] = this.spawn();
    this.pump();
  }

  private pump(): void {
    for (const slot of this.slots) {
      if (slot.busy || this.queue.length === 0) continue;
      const job = this.queue.shift()!;
      slot.busy = job;
      job.timer = setTimeout(() => this.replace(slot, new Error(`Query took longer than ${QUERY_TIMEOUT_MS / 1000}s and was stopped`)), QUERY_TIMEOUT_MS);
      slot.worker.postMessage({ id: job.id, sql: job.sql });
    }
  }

  run(sql: string): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, sql, resolve, reject });
      this.pump();
    });
  }
}

const globalForPool = globalThis as unknown as { sqlWorkerPool?: SqlWorkerPool | null };

function getPool(): SqlWorkerPool | null {
  if (globalForPool.sqlWorkerPool !== undefined) return globalForPool.sqlWorkerPool;
  let pool: SqlWorkerPool | null = null;
  try {
    const modulePath = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
    getSQLiteDB(); // creates the file (and WAL mode) the workers open read-only
    if (process.env.SQL_WORKERS !== '0' && fs.existsSync(SQLITE_FILE_PATH) && fs.existsSync(modulePath)) {
      pool = new SqlWorkerPool(modulePath, SQLITE_FILE_PATH, POOL_SIZE);
      logger.info(`SQL worker pool started (${POOL_SIZE} read-only connections)`);
    }
  } catch (err: any) {
    logger.warn(`SQL worker pool unavailable, queries run on the main thread: ${err?.message || err}`);
  }
  globalForPool.sqlWorkerPool = pool;
  return pool;
}

function normalizeRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) out[k] = typeof v === 'bigint' ? Number(v) : v;
    return out;
  });
}

/** Runs a read-only query on a worker thread (in parallel with others); same result as executeReadOnlyQuery. */
export async function executeReadOnlyQueryAsync(sql: string): Promise<Record<string, any>[]> {
  const pool = getPool();
  if (!pool) return executeReadOnlyQuery(sql);
  return normalizeRows(await pool.run(sql.trim()));
}
