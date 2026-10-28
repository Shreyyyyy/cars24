import { NextRequest, NextResponse } from 'next/server';
import { getSQLiteDB, setDatasetMetadata, dropSheetTables, DatasetMetadata, SheetMetadata } from '@/lib/sqlite-server';
import { clearSemanticCache } from '@/lib/semantic-cache';
import { addUploadedDocumentChunks, clearUploadedDocumentChunks, RAGChunk } from '@/lib/rag-engine';
import { clearGrowthAnalysisCache, analyzeGrowthOpportunities, warmSegmentIndex } from '@/lib/growth-opportunities';
import { getSchemaKnowledge } from '@/lib/schema-knowledge';
import { resolveMapping } from '@/lib/schema-dictionary/store';
import { buildTableCatalog } from '@/lib/dataset-context';
import { understandDataset } from '@/lib/data-understanding';
import {
  RawCell,
  CleanTable,
  splitSheetIntoTables,
  cleanTable,
  gridFromRecords,
  sanitizeIdentifier
} from '@/lib/tabular-ingest';
import {
  LoadedTable,
  MappedRelationship,
  discoverRelationships,
  pruneRelationships,
  measureDictionaryRelationships,
  verifyLoadedTables,
  writeSchemaMapping,
  detectRepeatedTotals
} from '@/lib/schema-mapping';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

/**
 * Extracts plain text from a raw PDF buffer without external native binary dependencies
 */
function extractTextFromPDFBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1');
    const textPieces: string[] = [];

    // Match text between BT (Begin Text) and ET (End Text) operators in PDF
    const btEtRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;

    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[0];
      // Extract text in parentheses (Tj or ' or " or TJ arrays)
      const tjRegex = /\((.*?)\)\s*(?:Tj|'|")/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const str = tjMatch[1]
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' ');
        if (str.trim().length > 0) {
          textPieces.push(str.trim());
        }
      }

      // Handle TJ array syntax: [(string) 120 (string)] TJ
      const arrayRegex = /\[(.*?)\]\s*TJ/g;
      let arrMatch: RegExpExecArray | null;
      while ((arrMatch = arrayRegex.exec(block)) !== null) {
        const inner = arrMatch[1];
        const innerStrings = inner.match(/\((.*?)\)/g);
        if (innerStrings) {
          const combined = innerStrings
            .map(s => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
            .join('');
          if (combined.trim().length > 0) {
            textPieces.push(combined.trim());
          }
        }
      }
    }

    if (textPieces.length > 0) {
      return textPieces.join(' ');
    }

    // Fallback: search for printable ASCII strings in stream objects
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      const words = streamContent.match(/[A-Za-z0-9\s.,₹%–:;()/'"-]{4,}/g);
      if (words && words.length > 5) {
        textPieces.push(words.join(' '));
      }
    }

    return textPieces.join('\n\n') || 'PDF Document ingested for RAG analysis.';
  } catch (e) {
    return 'PDF document text extracted.';
  }
}


const SPREADSHEET_EXT = /\.(xlsx|xls|xlsm|xlsb|ods)$/i;
const TEXT_DOC_EXT = /\.(txt|md|doc|docx)$/i;

/** Reads a CSV/TSV into a raw grid, keeping blank lines so stacked tables can be separated. */
function csvToGrid(text: string): RawCell[][] {
  let body = text.replace(/^﻿/, '');
  // Excel's "sep=;" hint line
  const sepHint = body.match(/^sep=(.)\r?\n/i);
  if (sepHint) body = body.slice(sepHint[0].length);
  const parsed = Papa.parse<string[]>(body, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    delimiter: sepHint ? sepHint[1] : ''
  });
  return parsed.data as RawCell[][];
}

interface SheetGrid {
  sheetName: string;
  grid: RawCell[][];
  hidden?: boolean;
  /** Where the grid starts in the sheet (used range may not begin at A1) */
  origin?: { r: number; c: number };
}

/** Reads every sheet of a workbook, hidden ones included, into raw grids. */
function workbookToGrids(buffer: Buffer): SheetGrid[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  return workbook.SheetNames.map(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    const origin = ref ? XLSX.utils.decode_range(ref).s : { r: 0, c: 0 };
    return {
      sheetName,
      hidden: Boolean(workbook.Workbook?.Sheets?.find(s => s.name === sheetName)?.Hidden),
      origin: { r: origin.r, c: origin.c },
      grid: XLSX.utils.sheet_to_json<RawCell[]>(sheet, { header: 1, raw: true, defval: null, blankrows: true })
    };
  });
}

/** Text documents become a searchable corpus plus a small table of their sections. */
function documentToTable(fileName: string, sections: string[], kind: 'pdf' | 'text', chunks: RAGChunk[]): RawCell[][] {
  const grid: RawCell[][] = [['section', 'title', 'text_snippet', 'word_count']];
  sections.forEach((sec, idx) => {
    const title = `${fileName} - Section ${idx + 1}`;
    chunks.push({
      id: `${kind}_${Date.now()}_${idx + 1}`,
      category: 'marketing_playbook',
      title,
      content: sec,
      metadata: { fileName, section: idx + 1, type: `${kind}_document` }
    });
    grid.push([idx + 1, title, sec.slice(0, 250), sec.split(/\s+/).length]);
  });
  return grid;
}

function writeTable(tableName: string, table: CleanTable): void {
  const db = getSQLiteDB();
  const colDefs = table.columns.map(c => `"${c}" ${table.profiles[c].column_type}`).join(', ');
  db.exec(`DROP TABLE IF EXISTS "${tableName}";`);
  db.exec(`CREATE TABLE "${tableName}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs});`);

  const insert = db.prepare(
    `INSERT INTO "${tableName}" (${table.columns.map(c => `"${c}"`).join(', ')}) VALUES (${table.columns.map(() => '?').join(', ')})`
  );
  db.transaction((rows: Record<string, any>[]) => {
    for (const r of rows) insert.run(...table.columns.map(c => r[c] ?? null));
  })(table.rows);

  // Index low-cardinality text columns: these are the business dimensions people filter and group by
  for (const c of table.columns) {
    const p = table.profiles[c];
    if (!p.isNumeric && (p.distinctCount || 0) > 1 && (p.distinctCount || 0) <= 500) {
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_${c}" ON "${tableName}" ("${c}");`);
      } catch {}
    }
  }
}

/**
 * Universal ingestion: Excel (every sheet), CSV (every table stacked inside it), JSON, PDF, Word, TXT, Markdown.
 * Each detected table becomes its own SQLite table; the largest is mirrored into uploaded_data.
 */
/** Ingest failure the caller should show to the user (bad file, no rows, unsupported type). */
export class IngestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface IngestOptions {
  /** Where the file came from, e.g. "upload" or "folder:/mnt/client" */
  source?: string;
  /** Connector dataset id, so the UI can show which one is active */
  sourceId?: string;
}

export async function processSpreadsheetUpload(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({
        error: 'No file uploaded. Please select a spreadsheet (Excel, CSV) or document (PDF, Word, TXT, JSON).'
      }, { status: 400 });
    }
    const fileName = path.basename(file.name || 'upload');
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const uploadDir = path.join(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    } catch (saveErr) {
      console.warn('Could not save copy to data/uploads:', saveErr);
    }
    return NextResponse.json(await ingestTabularBuffer(fileName, buffer, { source: 'upload' }));
  } catch (err: any) {
    if (err instanceof IngestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('File upload error:', err);
    return NextResponse.json({ error: `Failed to process file: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

/**
 * Loads one file (uploaded or fetched from a client source) as the active dataset:
 * every sheet/table, typed columns, verified joins, then the whole-data understanding.
 */
export async function ingestTabularBuffer(fileName: string, buffer: Buffer, options: IngestOptions = {}) {
  const startTime = Date.now();
  const lowerName = fileName.toLowerCase();
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const documentRAGChunks: RAGChunk[] = [];
  let grids: SheetGrid[] = [];

  if (lowerName.endsWith('.pdf')) {
    const text = extractTextFromPDFBuffer(buffer);
    const sections = text.split(/\n{2,}|\.\s{2,}/).map(p => p.trim()).filter(p => p.length > 20);
    grids = [{ sheetName: baseName, grid: documentToTable(fileName, sections.length ? sections : [text.slice(0, 2000)], 'pdf', documentRAGChunks) }];
  } else if (TEXT_DOC_EXT.test(lowerName)) {
    const text = buffer.toString('utf-8').replace(/\0/g, '');
    const sections = text.split(/\r?\n\s*\r?\n/).map(s => s.trim()).filter(s => s.length > 15);
    grids = [{ sheetName: baseName, grid: documentToTable(fileName, sections, 'text', documentRAGChunks) }];
  } else if (lowerName.endsWith('.json')) {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      if (Array.isArray(parsed)) {
        grids = [{ sheetName: baseName, grid: gridFromRecords(parsed) }];
      } else if (parsed && typeof parsed === 'object') {
        // { "Sales": [...], "Targets": [...] } → one table per array
        const arrays = Object.entries(parsed).filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0);
        grids = arrays.length > 0
          ? arrays.map(([k, v]) => ({ sheetName: k, grid: gridFromRecords(v as any[]) }))
          : [{ sheetName: baseName, grid: gridFromRecords([parsed]) }];
      }
    } catch (err: any) {
      throw new IngestError(`Invalid JSON format: ${err.message}`);
    }
  } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv')) {
    grids = [{ sheetName: baseName, grid: csvToGrid(buffer.toString('utf-8')) }];
  } else if (SPREADSHEET_EXT.test(lowerName)) {
    grids = workbookToGrids(buffer);
    if (grids.length === 0) {
      throw new IngestError('The workbook has no visible sheets.');
    }
  } else {
    throw new IngestError('Unsupported file type. Upload Excel (.xlsx/.xls), CSV, JSON, PDF, Word or text files.');
  }

  // Split every sheet into all the tables it contains (side by side and stacked), then clean and type each
  const cleanTables: { table: CleanTable; sourceSheet: string; hidden?: boolean }[] = [];
  const emptySheets: string[] = [];
  for (const { sheetName, grid, hidden, origin } of grids) {
    const found = splitSheetIntoTables(grid, sheetName, origin)
      .map(cleanTable)
      .filter(t => t.rows.length > 0 && t.columns.length > 0);
    if (found.length === 0) emptySheets.push(sheetName);
    for (const table of found) cleanTables.push({ table, sourceSheet: sheetName, hidden });
  }

  if (cleanTables.length === 0) {
    throw new IngestError('The file contains no readable data rows. Check that each table has a header row followed by data.');
  }

  // Replace the previous dataset entirely: answers must only ever reflect this file
  dropSheetTables();
  clearUploadedDocumentChunks();

  const isMultiTable = cleanTables.length > 1;
  const sheets: SheetMetadata[] = [];
  const tablesByName = new Map<string, CleanTable>();
  const usedNames = new Set<string>();
  const loaded: LoadedTable[] = [];

  for (const { table: t, sourceSheet, hidden } of cleanTables) {
    let tableName = 'uploaded_data';
    if (isMultiTable) {
      const base = `sheet_${sanitizeIdentifier(t.name, 'data')}`.slice(0, 60);
      tableName = base;
      let n = 2;
      while (usedNames.has(tableName)) tableName = `${base}_${n++}`;
      usedNames.add(tableName);
    }
    writeTable(tableName, t);
    tablesByName.set(tableName, t);
    loaded.push({ tableName, sheetName: t.name, sourceSheet, hidden, table: t });
    sheets.push({
      sheetName: t.name,
      tableName,
      rowCount: t.rows.length,
      columns: t.columns,
      rawColumns: t.rawColumns,
      schema: t.columns.map(c => ({ column_name: c, column_type: t.profiles[c].column_type })),
      profiles: t.profiles,
      notes: [...t.notes, ...(hidden ? ['Hidden sheet in the workbook'] : [])],
      sourceSheet,
      range: t.range
    });
  }

  // uploaded_data mirrors the largest table so single-table features keep working
  const primary = sheets.reduce((a, b) => (b.rowCount > a.rowCount ? b : a));
  const primaryTable = tablesByName.get(primary.tableName)!;
  if (isMultiTable) writeTable('uploaded_data', primaryTable);

  // Map every table and join key into SQL, then verify the load against what was read from the file
  const db = getSQLiteDB();
  // The workbook's schema mapping (saved versions, else the built-in dictionary) documents meanings and joins
  const mappingDoc = resolveMapping({
    fileName,
    tables: sheets.map(s => ({ tableName: s.tableName, sheetName: s.sheetName, rowCount: s.rowCount, columns: s.columns, profiles: s.profiles || {}, relationships: [] }))
  }).doc;
  const dictionaryRels = measureDictionaryRelationships(loaded, mappingDoc);
  const pairKey = (r: MappedRelationship) => [`${r.fromTable}.${r.fromColumn}`, `${r.toTable}.${r.toColumn}`].sort().join('|');
  const documented = new Set(dictionaryRels.map(pairKey));
  const relationships = pruneRelationships(
    dictionaryRels,
    isMultiTable ? discoverRelationships(loaded).filter(r => !documented.has(pairKey(r))) : []
  );
  const verification = verifyLoadedTables(db, loaded);
  const mapping = writeSchemaMapping(db, loaded, verification, relationships, mappingDoc);

  // Joins the SQL prompt may use: only those that actually match in the data
  for (const sheet of sheets) {
    sheet.relationships = relationships
      .filter(r => r.status !== 'not-matching' && (r.fromTable === sheet.tableName || r.toTable === sheet.tableName))
      .map(r => {
        const outgoing = r.fromTable === sheet.tableName;
        return {
          foreignKey: outgoing ? r.fromColumn : r.toColumn,
          targetTable: outgoing ? r.toTable : r.fromTable,
          targetKey: outgoing ? r.toColumn : r.fromColumn,
          matchPct: r.matchPct,
          status: r.status
        };
      });
    sheet.verified = verification.find(v => v.tableName === sheet.tableName)?.ok;
    sheet.repeatedTotals = detectRepeatedTotals(tablesByName.get(sheet.tableName)!);
    if (sheet.repeatedTotals) {
      sheet.notes = [...(sheet.notes || []), `${sheet.repeatedTotals.columns.join(', ')} repeat on every row of the same ${sheet.repeatedTotals.key}`];
    }
  }

  if (documentRAGChunks.length > 0) addUploadedDocumentChunks(documentRAGChunks);

  const totalRows = sheets.reduce((a, s) => a + s.rowCount, 0);
  const metadata: DatasetMetadata = {
    fileName,
    fileSize: buffer.length,
    rowCount: primary.rowCount,
    columns: primary.columns,
    rawColumns: primary.rawColumns || primary.columns,
    schema: primary.schema,
    columnProfiles: primary.profiles,
    sheets: isMultiTable ? sheets : undefined,
    mapping,
    primaryTable: primary.tableName,
    uploadTimestamp: new Date().toISOString(),
    tableName: 'uploaded_data',
    source: options.source,
    sourceId: options.sourceId
  };

  setDatasetMetadata(metadata);
  clearSemanticCache();
  clearGrowthAnalysisCache();

  // Precompute everything questions rely on, so the first question is as fast as the rest
  const warmStart = Date.now();
  try {
    getSchemaKnowledge(metadata);
    buildTableCatalog(metadata);
    analyzeGrowthOpportunities();
    warmSegmentIndex();
    // Data Cartographer: exact facts over every row now, business map of the tables in the background
    understandDataset();
  } catch (warmErr) {
    console.warn('Warm-up after upload failed (answers will build it on demand):', warmErr);
  }
  const warmMs = Date.now() - warmStart;

  const tableSummary = sheets.map(s => ({
    sheetName: s.sheetName,
    sourceSheet: s.sourceSheet,
    range: s.range,
    tableName: s.tableName,
    rowCount: s.rowCount,
    columns: s.columns,
    verified: s.verified,
    notes: s.notes
  }));

  return {
    success: true as const,
    message: isMultiTable
      ? `Loaded "${fileName}": ${sheets.length} tables, ${totalRows.toLocaleString('en-IN')} records in total.`
      : `Loaded "${fileName}": ${primary.rowCount.toLocaleString('en-IN')} records.`,
    fileName,
    rowCount: primary.rowCount,
    totalRowCount: totalRows,
    columns: primary.columns,
    rawColumns: primary.rawColumns,
    schema: primary.schema,
    sheets: tableSummary,
    sheetNames: sheets.map(s => s.sheetName),
    previewRows: primaryTable.rows.slice(0, 5),
    documentChunksCount: documentRAGChunks.length,
    mapping,
    emptySheets,
    warmUpMs: warmMs,
    latencyMs: Date.now() - startTime
  };
}
