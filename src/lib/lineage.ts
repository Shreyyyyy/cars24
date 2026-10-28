/**
 * Backtracking / data lineage: which uploaded tables (and which sheet, cell range, columns and joins)
 * produced an answer. Derived from the SQL that actually ran, so it cannot drift from the answer.
 */

import type { Lineage, LineageTable } from '@/types/chat';
import { DatasetMetadata, getQueryableTables } from './sqlite-server';

const SQL_KEYWORDS = new Set([
  'where', 'group', 'order', 'limit', 'join', 'inner', 'left', 'right', 'full', 'cross', 'outer', 'on', 'using',
  'union', 'having', 'as', 'select', 'from', 'natural', 'window', 'except', 'intersect'
]);

function stripLiterals(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

function tableRefs(sql: string): { table: string; alias?: string }[] {
  const refs: { table: string; alias?: string }[] = [];
  const re = /\b(?:FROM|JOIN)\s+"?(\w+)"?(?:\s+(?:AS\s+)?"?(\w+)"?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const alias = m[2] && !SQL_KEYWORDS.has(m[2].toLowerCase()) ? m[2] : undefined;
    refs.push({ table: m[1], alias });
  }
  return refs;
}

export function buildLineage(queries: string[], meta: DatasetMetadata | null): Lineage {
  const tables = getQueryableTables(meta);
  const byName = new Map(tables.map(t => [t.tableName.toLowerCase(), t]));
  const sheetInfo = new Map((meta?.sheets || []).map(s => [s.tableName.toLowerCase(), s]));
  // uploaded_data is a mirror of the largest table: report the real source
  const resolve = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'uploaded_data' && meta?.primaryTable && meta.primaryTable !== 'uploaded_data') return meta.primaryTable.toLowerCase();
    return lower;
  };

  const used = new Map<string, LineageTable>();
  const joins: Lineage['joins'] = [];
  const cleanQueries = queries.map(q => q.trim()).filter(Boolean);

  for (const query of cleanQueries) {
    const sql = stripLiterals(query);
    const refs = tableRefs(sql).filter(r => byName.has(resolve(r.table)) || resolve(r.table) === 'uploaded_data');
    const aliasTo = new Map<string, string>();
    for (const r of refs) {
      const name = resolve(r.table);
      aliasTo.set(r.table.toLowerCase(), name);
      if (r.alias) aliasTo.set(r.alias.toLowerCase(), name);
    }

    for (const name of Array.from(new Set(refs.map(r => resolve(r.table))))) {
      const t = byName.get(name);
      if (!t) continue;
      const s = sheetInfo.get(name);
      const entry = used.get(name) || {
        table: t.tableName,
        sheet: t.sheetName,
        range: s?.range,
        rows: t.rowCount,
        verified: s?.verified ?? (meta?.mapping ? meta.mapping.failures.length === 0 : undefined),
        columns: []
      };
      for (const c of t.columns) {
        if (entry.columns.includes(c)) continue;
        if (new RegExp(`(^|[^\\w])"?${c}"?([^\\w]|$)`).test(sql)) entry.columns.push(c);
      }
      used.set(name, entry);
    }

    // Join conditions: a.x = b.y (aliases resolved)
    const joinRe = /"?(\w+)"?\."?(\w+)"?\s*=\s*"?(\w+)"?\."?(\w+)"?/g;
    let m: RegExpExecArray | null;
    while ((m = joinRe.exec(sql)) !== null) {
      const lt = aliasTo.get(m[1].toLowerCase());
      const rt = aliasTo.get(m[3].toLowerCase());
      if (!lt || !rt || lt === rt) continue;
      const left = `${byName.get(lt)?.tableName ?? lt}.${m[2]}`;
      const right = `${byName.get(rt)?.tableName ?? rt}.${m[4]}`;
      const rel = byName.get(lt)?.relationships.find(r =>
        (r.foreignKey === m![2] && r.targetTable.toLowerCase() === rt && r.targetKey === m![4]));
      joins.push({ left, right, matchPct: rel?.matchPct, status: rel?.status });
    }
  }

  return {
    tablesUsed: Array.from(used.values()),
    tablesAvailable: tables.length,
    joins,
    queries: cleanQueries
  };
}

/** One-line form for logs: "Sheet (sql_table)". */
export function lineageLabels(lineage: Lineage | undefined): string[] {
  return (lineage?.tablesUsed || []).map(t => `${t.sheet} (${t.table})`);
}
