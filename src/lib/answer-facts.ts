/**
 * Deterministic Answer Facts & Numeric Grounding
 * Computes the numbers an answer is allowed to cite (totals, shares, gaps) directly from
 * query result rows, and verifies that numbers quoted in generated text trace back to them.
 */

import { formatIndianRupee, formatIndianNumber, businessLabel } from './formatters';
import type { KeyMetric } from '@/types/chat';

export interface RankedEntry {
  label: string;
  value: number;
  sharePct?: number;
}

export interface ResultFacts {
  rowCount: number;
  categoryCol?: string;
  valueCol?: string;
  isCurrency: boolean;
  isScalar: boolean;
  total?: number;
  mean?: number;
  leader?: RankedEntry;
  runnerUp?: RankedEntry;
  laggard?: RankedEntry;
  leaderVsRunnerUpPct?: number;
  leaderToLaggardRatio?: number;
  /** % gap between highest and lowest group, when both are positive */
  spreadPct?: number;
  top3SharePct?: number;
  /** Pre-formatted, citation-ready fact lines */
  statements: string[];
  /** Every number that a grounded answer may legitimately quote */
  referenceNumbers: number[];
}

export interface NumericGrounding {
  checked: number;
  matched: number;
  score: number;
  unverified: string[];
}

const NON_ADDITIVE_METRIC = /pct|percent|rate|ratio|avg|average|mean|median|price|rating|score|share|conversion/i;
const CURRENCY_COL = /inr|price|revenue|sales_val|sales_value|total_sales|amount|turnover/i;

export function isCurrencyColumn(col?: string): boolean {
  return Boolean(col && CURRENCY_COL.test(col));
}

export function formatMetric(value: number, col?: string): string {
  if (isCurrencyColumn(col)) return formatIndianRupee(value, true);
  if (col && /pct|percent|rate|ratio/i.test(col)) return `${round(value, 1)}%`;
  if (!Number.isInteger(value)) return formatIndianNumber(round(value, 2));
  return formatIndianNumber(value);
}

export function humanizeColumn(col?: string): string {
  return businessLabel(col || 'value').toLowerCase();
}

/** Up to 4 headline tiles derived from the computed facts (no new numbers are introduced). */
export function buildKeyMetrics(facts: ResultFacts, rows: Record<string, any>[], columns: string[]): KeyMetric[] {
  if (rows.length === 0) return [];

  if (facts.isScalar) {
    return columns
      .filter(c => isNum(rows[0][c]))
      .slice(0, 4)
      .map(c => ({ label: businessLabel(c), value: formatMetric(rows[0][c], c) }));
  }

  const tiles: KeyMetric[] = [];
  const dim = businessLabel(facts.categoryCol || '');
  const { leader, runnerUp, laggard, valueCol } = facts;
  if (leader) {
    tiles.push({
      label: `Highest ${dim.toLowerCase()}`,
      value: leader.label,
      note: `${formatMetric(leader.value, valueCol)}${leader.sharePct !== undefined ? ` · ${leader.sharePct}% share` : ''}`
    });
  }
  if (facts.total !== undefined && !/avg|rating|pct|rate|price/i.test(valueCol || '')) {
    tiles.push({ label: `Total ${humanizeColumn(valueCol)}`, value: formatMetric(facts.total, valueCol), note: `across ${facts.rowCount} ${dim.toLowerCase()} groups` });
  }
  if (runnerUp && facts.leaderVsRunnerUpPct !== undefined) {
    tiles.push({ label: 'Lead over #2', value: `${facts.leaderVsRunnerUpPct}%`, note: `vs ${runnerUp.label}` });
  }
  if (laggard) {
    tiles.push({ label: `Lowest ${dim.toLowerCase()}`, value: laggard.label, note: formatMetric(laggard.value, valueCol) });
  }
  return tiles.slice(0, 4);
}

const FOLLOW_UP_DIMENSIONS = ['model', 'city', 'fuel_type', 'dealer_network', 'sales_channel', 'showroom_name'];

/** Next questions a manager would naturally ask, limited to dimensions present in the dataset. */
export function suggestFollowUps(facts: ResultFacts, datasetColumns: string[], alreadyFiltered: string[] = []): string[] {
  const suggestions: string[] = [];
  // Never suggest breaking down by a field the question already filtered on
  const filtered = new Set(alreadyFiltered.map(c => c.toLowerCase()));
  const available = new Set(datasetColumns.map(c => c.toLowerCase()).filter(c => !filtered.has(c)));
  const metric = humanizeColumn(facts.valueCol);
  const leader = facts.leader?.label;
  const isPeriod = (label?: string) => Boolean(label && /^\d{4}-\d{2}(-\d{2})?$/.test(label));

  if (leader && facts.categoryCol) {
    const nextDim = FOLLOW_UP_DIMENSIONS.find(d => available.has(d) && d !== facts.categoryCol!.toLowerCase());
    if (nextDim) suggestions.push(`Break down ${metric} for ${leader} by ${businessLabel(nextDim).toLowerCase()}`);
    if (!isPeriod(leader) && datasetColumns.some(c => /created_at|date|month/i.test(c))) {
      suggestions.push(`Show the monthly trend of ${metric} for ${leader}`);
    }
  }
  if (facts.laggard && facts.laggard.label !== leader) {
    suggestions.push(isPeriod(facts.laggard.label)
      ? `Why did ${metric} dip in ${facts.laggard.label}?`
      : `Why is ${facts.laggard.label} the lowest on ${metric}?`);
  }
  if (facts.isScalar && facts.rowCount > 0) {
    const dim = FOLLOW_UP_DIMENSIONS.find(d => available.has(d));
    if (dim) suggestions.push(`Break this down by ${businessLabel(dim).toLowerCase()}`);
  }
  return suggestions.slice(0, 3);
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Resolves which result columns are the dimension (label) and the metric (value).
 * Honors hints from the SQL planner when they exist in the result set.
 */
export function resolveResultColumns(
  rows: Record<string, any>[],
  columns: string[],
  categoryHint?: string,
  valueHint?: string
): { categoryCol?: string; valueCol?: string } {
  if (rows.length === 0) return {};
  const first = rows[0];
  const numericCols = columns.filter(c => isNum(first[c]));
  const textCols = columns.filter(c => !isNum(first[c]));

  const valueCol = valueHint && numericCols.includes(valueHint) ? valueHint : numericCols[0];
  const categoryCol = categoryHint && textCols.includes(categoryHint) ? categoryHint : textCols[0];
  return { categoryCol, valueCol };
}

export function computeResultFacts(
  rows: Record<string, any>[],
  columns: string[],
  categoryHint?: string,
  valueHint?: string
): ResultFacts {
  const statements: string[] = [];
  const referenceNumbers: number[] = [rows.length];
  const { categoryCol, valueCol } = resolveResultColumns(rows, columns, categoryHint, valueHint);

  // Every raw numeric cell (and any number embedded in a label, e.g. "CMP1043") is a legitimate citation target
  for (const r of rows) {
    for (const c of columns) {
      if (isNum(r[c])) referenceNumbers.push(r[c]);
      else if (typeof r[c] === 'string') {
        for (const m of r[c].match(/\d+(?:\.\d+)?/g) || []) referenceNumbers.push(parseFloat(m));
      }
    }
  }

  const base: ResultFacts = {
    rowCount: rows.length,
    categoryCol,
    valueCol,
    isCurrency: isCurrencyColumn(valueCol),
    isScalar: false,
    statements,
    referenceNumbers
  };

  if (rows.length === 0) {
    statements.push('The query returned no matching records.');
    return base;
  }

  // Scalar / single-row aggregate
  if (rows.length === 1 || !categoryCol) {
    base.isScalar = true;
    const r = rows[0];
    for (const c of columns) {
      if (isNum(r[c])) statements.push(`${humanizeColumn(c)}: ${formatMetric(r[c], c)}`);
      else if (r[c] !== null && r[c] !== undefined) statements.push(`${humanizeColumn(c)}: ${r[c]}`);
    }
    // Derive the common ratio "part / whole" when both a count and a total_* count exist
    const totalKey = columns.find(c => /^total_(leads|records)$/i.test(c) && isNum(r[c]));
    if (totalKey && r[totalKey] > 0) {
      for (const c of columns) {
        if (c !== totalKey && isNum(r[c]) && /bookings|deliveries|count/i.test(c) && r[c] <= r[totalKey]) {
          const pct = round((r[c] / r[totalKey]) * 100, 1);
          referenceNumbers.push(pct);
          statements.push(`${humanizeColumn(c)} as share of ${humanizeColumn(totalKey)}: ${pct}%`);
        }
      }
    }
    return base;
  }

  if (!valueCol) {
    statements.push(`${rows.length} ${humanizeColumn(categoryCol)} values returned (no numeric metric).`);
    return base;
  }

  const entries: RankedEntry[] = rows
    .filter(r => isNum(r[valueCol]))
    .map(r => ({ label: String(r[categoryCol] ?? 'Unlabelled'), value: r[valueCol] as number }));

  if (entries.length === 0) return base;

  const total = entries.reduce((a, e) => a + e.value, 0);
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  // Shares and totals only make sense for quantities that add up (not rates, averages or prices)
  const additive = !NON_ADDITIVE_METRIC.test(valueCol);
  const withShare = (e: RankedEntry): RankedEntry =>
    additive && total > 0 ? { ...e, sharePct: round((e.value / total) * 100, 1) } : e;

  base.total = total;
  base.mean = total / entries.length;
  base.leader = withShare(sorted[0]);
  base.runnerUp = sorted[1] ? withShare(sorted[1]) : undefined;
  base.laggard = sorted.length > 1 ? withShare(sorted[sorted.length - 1]) : undefined;

  if (base.runnerUp && base.runnerUp.value > 0) {
    base.leaderVsRunnerUpPct = round(((base.leader.value - base.runnerUp.value) / base.runnerUp.value) * 100, 1);
  }
  if (base.laggard && base.laggard.value > 0) {
    base.leaderToLaggardRatio = round(base.leader.value / base.laggard.value, 1);
    base.spreadPct = round(((base.leader.value - base.laggard.value) / base.laggard.value) * 100, 1);
  }
  if (additive && sorted.length > 3 && total > 0) {
    base.top3SharePct = round((sorted.slice(0, 3).reduce((a, e) => a + e.value, 0) / total) * 100, 1);
  }

  referenceNumbers.push(
    total,
    round(base.mean, 2),
    ...[base.leader, base.runnerUp, base.laggard].flatMap(e => (e?.sharePct !== undefined ? [e.sharePct] : [])),
    ...[base.leaderVsRunnerUpPct, base.leaderToLaggardRatio, base.spreadPct, base.top3SharePct].filter(isNum)
  );

  const metric = humanizeColumn(valueCol);
  const scope = `the ${entries.length} ${humanizeColumn(categoryCol)} groups returned`;
  statements.push(
    `Leader: ${base.leader.label} with ${formatMetric(base.leader.value, valueCol)} ${metric}` +
      (base.leader.sharePct !== undefined ? ` (${base.leader.sharePct}% of ${scope})` : '')
  );
  if (base.runnerUp && base.leaderVsRunnerUpPct !== undefined) {
    statements.push(
      `Runner-up: ${base.runnerUp.label} at ${formatMetric(base.runnerUp.value, valueCol)}; leader is ${base.leaderVsRunnerUpPct}% ahead`
    );
  }
  if (base.laggard && base.leaderToLaggardRatio !== undefined) {
    statements.push(
      `Lowest: ${base.laggard.label} at ${formatMetric(base.laggard.value, valueCol)} (leader is ${base.leaderToLaggardRatio}x)`
    );
  }
  if (base.spreadPct !== undefined && base.spreadPct < 25) {
    statements.push(`Narrow spread: highest and lowest differ by only ${base.spreadPct}%, so no group clearly stands out`);
  }
  if (base.top3SharePct !== undefined) {
    statements.push(`Top 3 account for ${base.top3SharePct}% of ${scope}`);
  }
  if (additive) statements.push(`Total ${metric} across ${scope}: ${formatMetric(total, valueCol)}`);

  return base;
}

/**
 * Extracts material numbers (₹ amounts, Cr/Lakh, percentages, multiples, values ≥ 100)
 * from generated text and checks each against the reference set with rounding tolerance.
 */
/**
 * Two differently named measures that are equal on every row usually count the same records
 * (e.g. "pending_orders" and "sales" both filtered to Booked by a shared WHERE). Returns why, or null.
 */
export function detectDuplicateMeasures(rows: Record<string, any>[]): string | null {
  if (rows.length < 3) return null;
  const numeric = Object.keys(rows[0]).filter(c => rows.every(r => typeof r[c] === 'number'));
  for (let i = 0; i < numeric.length; i++) {
    for (let j = i + 1; j < numeric.length; j++) {
      const [a, b] = [numeric[i], numeric[j]];
      if (rows.every(r => r[a] === r[b]) && rows.some(r => r[a] !== 0)) {
        return `"${a}" and "${b}" are identical on every row, so both count the same records. Give each measure its own condition (SUM(CASE WHEN ... THEN 1 ELSE 0 END)) instead of a shared WHERE filter.`;
      }
    }
  }
  return null;
}

export function verifyNumericClaims(text: string, facts: ResultFacts): NumericGrounding {
  const pattern = /(₹\s?)?(\d[\d,]*(?:\.\d+)?)\s*(cr\b|crore|lakh|lac\b|%|x\b)?/gi;
  const refs = facts.referenceNumbers;
  const unverified: string[] = [];
  let checked = 0;
  let matched = 0;

  const near = (a: number, b: number, relTol: number, absTol: number) =>
    Math.abs(a - b) <= Math.max(absTol, Math.abs(b) * relTol);

  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const [raw, rupee, numStr, unitRaw] = m;
    const unit = (unitRaw || '').toLowerCase();
    let value = parseFloat(numStr.replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;

    const isMaterial = Boolean(rupee) || unit !== '' || value >= 100;
    const looksLikeYear = !rupee && !unit && Number.isInteger(value) && value >= 1990 && value <= 2100;
    if (!isMaterial || looksLikeYear) continue;

    checked += 1;
    let ok = false;
    if (unit === 'cr' || unit === 'crore') {
      value *= 1e7;
      ok = refs.some(r => near(value, r, 0.01, 0.006e7));
    } else if (unit === 'lakh' || unit === 'lac') {
      value *= 1e5;
      ok = refs.some(r => near(value, r, 0.01, 0.006e5));
    } else if (unit === '%' || unit === 'x') {
      ok = refs.some(r => near(value, r, 0.01, 0.15));
    } else {
      ok = refs.some(r => near(value, r, 0.005, 0.51));
    }

    if (ok) matched += 1;
    else unverified.push(raw.trim());
  }

  return {
    checked,
    matched,
    score: checked === 0 ? 1 : round(matched / checked, 2),
    unverified: Array.from(new Set(unverified)).slice(0, 10)
  };
}

/**
 * Removes every sentence or bullet that quotes a figure not traceable to the reference numbers,
 * so a generated narrative can be used without letting a single invented number through.
 */
export function removeUnverifiedClaims(text: string, facts: ResultFacts): { text: string; removed: string[] } {
  const removed: string[] = [];
  // Split at sentence ends followed by whitespace, so decimals like "22.8%" stay intact
  const kept = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(sentence => {
      const check = verifyNumericClaims(sentence, facts);
      if (check.unverified.length > 0) {
        removed.push(...check.unverified);
        return false;
      }
      return sentence.trim().length > 0;
    });
  return { text: kept.join(' ').trim(), removed };
}
