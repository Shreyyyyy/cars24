/**
 * Client data sources. Each connector lists the datasets (CSV / Excel / JSON files, or tables exported
 * as such) available in the client's store and fetches one for ingestion. The active connector is
 * chosen with CLIENT_SOURCE; new stores (S3, GCS, Postgres, …) implement the same interface.
 */

import fs from 'fs';
import path from 'path';

export interface SourceDataset {
  /** Stable id used to load it (path relative to the source root for folders) */
  id: string;
  name: string;
  format: string;
  sizeBytes?: number;
  modifiedAt?: string;
}

export interface DataConnector {
  id: string;
  label: string;
  /** Where it reads from, for display */
  location: string;
  listDatasets(): Promise<SourceDataset[]>;
  fetchDataset(id: string): Promise<{ fileName: string; buffer: Buffer }>;
}

const DATA_FILE = /\.(csv|tsv|xlsx|xlsm|xls|json)$/i;

/** Reads files from a directory (local path, mounted volume or network share). */
export class FolderConnector implements DataConnector {
  readonly id = 'folder';
  readonly label = 'Client folder';
  constructor(private readonly root: string) {}

  get location(): string {
    return this.root;
  }

  async listDatasets(): Promise<SourceDataset[]> {
    if (!fs.existsSync(this.root)) return [];
    const out: SourceDataset[] = [];
    const walk = (dir: string, depth: number) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && depth < 2) walk(full, depth + 1);
        else if (entry.isFile() && DATA_FILE.test(entry.name)) {
          const stat = fs.statSync(full);
          out.push({
            id: path.relative(this.root, full).split(path.sep).join('/'),
            name: entry.name,
            format: path.extname(entry.name).slice(1).toLowerCase(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString()
          });
        }
      }
    };
    walk(this.root, 0);
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  async fetchDataset(id: string): Promise<{ fileName: string; buffer: Buffer }> {
    const root = path.resolve(this.root);
    const full = path.resolve(root, id);
    // Never read outside the configured folder
    if (!full.startsWith(root + path.sep) || !DATA_FILE.test(full) || !fs.existsSync(full)) {
      throw new Error(`Dataset "${id}" was not found in the client source.`);
    }
    return { fileName: path.basename(full), buffer: fs.readFileSync(full) };
  }
}

let connector: DataConnector | null = null;

export function getClientConnector(): DataConnector {
  if (connector) return connector;
  const kind = (process.env.CLIENT_SOURCE || 'folder').toLowerCase();
  switch (kind) {
    case 'folder':
      connector = new FolderConnector(process.env.CLIENT_DATA_DIR || path.join(process.cwd(), 'data', 'client'));
      return connector;
    default:
      throw new Error(`CLIENT_SOURCE "${kind}" is not supported yet. Available: folder.`);
  }
}
