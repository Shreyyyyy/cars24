/**
 * SQL Safety Validator & Sanitizer for Maruti Suzuki SQLite Analytics
 */

export interface SQLValidationResult {
  isValid: boolean;
  sanitizedSql?: string;
  error?: string;
}

const FORBIDDEN_SQL_KEYWORDS = [
  /\bDROP\b/i,
  /\bDELETE\b/i,
  /\bUPDATE\b/i,
  /\bINSERT\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bATTACH\b/i,
  /\bDETACH\b/i,
  /\bPRAGMA\b/i,
  /\bVACUUM\b/i,
  /\bCREATE\b/i,
  /\bREPLACE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bload_extension\b/i,
  /\breadfile\b|\bwritefile\b/i
];

const DEFAULT_ALLOWED_TABLES = ['uploaded_data', 'dealership_sales'];
/** Funnel questions legitimately chain 5-6 tables (lead -> enquiry -> dealer -> test drive -> quote -> booking) */
const MAX_JOINS = 6;

/**
 * Validates and sanitizes a generated SQL query before execution.
 * `allowedTables` lists the tables of the current upload (one per sheet / embedded table).
 */
/**
 * Repairs SQL slips that run fine but return wrong numbers:
 * COUNT(CASE WHEN c THEN 1 ELSE 0 END) counts every row (0 is not NULL); the intent is SUM(...).
 */
export function fixCommonSqlMistakes(sql: string): string {
  return sql.replace(/COUNT\s*\(\s*(CASE\s+WHEN\b(?:(?!\bEND\b)[\s\S])*?\bTHEN\s+1\s+ELSE\s+0\s+END)\s*\)/gi, 'SUM($1)');
}

export function validateAndSanitizeSQL(
  sql: string,
  allowedColumns: string[],
  allowedTables: string[] = DEFAULT_ALLOWED_TABLES
): SQLValidationResult {
  const ALLOWED_TABLES = new Set(allowedTables.map(t => t.toLowerCase()));
  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'SQL query must be a non-empty string' };
  }

  const trimmed = sql.trim().replace(/;+\s*$/, ''); // Strip trailing semicolons

  // 1. Must start with SELECT or WITH
  if (!/^(\s*SELECT|\s*WITH)/i.test(trimmed)) {
    return { isValid: false, error: 'Only SELECT queries are authorized for analytics execution.' };
  }

  // 2. Prohibit multiple SQL statements
  if (trimmed.includes(';')) {
    return { isValid: false, error: 'Multiple SQL statements in a single execution are prohibited.' };
  }

  // 3. Prohibit mutation / DDL keywords
  for (const forbidden of FORBIDDEN_SQL_KEYWORDS) {
    if (forbidden.test(trimmed)) {
      return { isValid: false, error: `Unauthorized SQL operation detected: ${forbidden.source}` };
    }
  }

  // String literals (e.g. 'Purchased from competitor') must not be parsed as SQL structure
  const structural = trimmed.replace(/'(?:[^']|'')*'/g, "''");

  // 4. Ensure query reads at least one table from the upload
  const fromTables = Array.from(structural.matchAll(/\bFROM\s+["`]?(\w+)["`]?/gi)).map(m => m[1].toLowerCase());
  if (!fromTables.some(t => ALLOWED_TABLES.has(t))) {
    return { isValid: false, error: 'Query must read from the uploaded data tables.' };
  }

  // 5. Every referenced table must be approved (blocks reads of qa_logs, sqlite_master, etc. via subqueries)
  const cteNames = new Set(
    Array.from(structural.matchAll(/(?:\bWITH\b|,)\s*["`]?(\w+)["`]?\s+AS\s*\(/gi)).map(m => m[1].toLowerCase())
  );
  const referencedTables = Array.from(structural.matchAll(/\b(?:FROM|JOIN)\s+["`]?(\w+)["`]?/gi)).map(m => m[1].toLowerCase());
  const unauthorized = referencedTables.filter(t => !ALLOWED_TABLES.has(t) && !cteNames.has(t));
  if (unauthorized.length > 0) {
    return { isValid: false, error: `Unauthorized table reference: ${unauthorized[0]}` };
  }

  // 6. Block unbounded-cost constructs (SQLite runs synchronously on the request thread).
  //    Joins between uploaded tables are allowed only with an explicit ON/USING key.
  if (/\bRECURSIVE\b/i.test(structural) || /\bFROM\s+["`]?\w+["`]?(?:\s+(?:AS\s+)?\w+)?\s*,\s*["`]?\w+/i.test(structural)) {
    return { isValid: false, error: 'Recursive queries and comma joins are not permitted.' };
  }
  const joins = structural.match(/\bJOIN\b/gi) || [];
  if (joins.length > 0) {
    // Every JOIN (table or subquery) needs its own ON / USING condition
    const keyed = structural.match(/\b(ON|USING)\b/gi) || [];
    if (/\bCROSS\s+JOIN\b|\bNATURAL\b/i.test(structural) || keyed.length < joins.length || joins.length > MAX_JOINS) {
      return { isValid: false, error: `Joins must name a key (JOIN ... ON / USING), at most ${MAX_JOINS} per query.` };
    }
  }

  // 7. Enforce safety limit
  let sanitized = trimmed;
  if (!/LIMIT\s+\d+/i.test(sanitized)) {
    sanitized += ' LIMIT 100';
  } else {
    // If limit is > 500, cap it at 100
    sanitized = sanitized.replace(/LIMIT\s+(\d+)/i, (match, p1) => {
      const num = parseInt(p1, 10);
      return `LIMIT ${Math.min(num, 100)}`;
    });
  }

  return { isValid: true, sanitizedSql: `${sanitized};` };
}
