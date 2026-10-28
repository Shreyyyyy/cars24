/**
 * Growth Opportunity Engine
 * Scans every table in the uploaded file and surfaces the places where sales can grow:
 * conversion gaps, target shortfalls, rising and falling segments, top loss reasons,
 * under-monetised segments and dependence on a single segment.
 *
 * Integrity rules:
 * - Every number is computed by SQL over the uploaded data. Nothing is benchmarked against outside figures.
 * - "Potential" figures are plain arithmetic on the file (e.g. "if X converted at the overall rate"),
 *   labelled as such. Projections come only from the file's own monthly history, and are withheld
 *   when their back-tested error is too high.
 * - When a needed column is missing, the gap is reported instead of guessed.
 */

import {
  executeReadOnlyQuery,
  getDatasetMetadata,
  getDatasetVersion,
  getQueryableTables,
  QueryableTable
} from './sqlite-server';
import { formatMetric, isCurrencyColumn } from './answer-facts';
import { businessLabel, formatIndianNumber } from './formatters';
import { generateTimeSeriesForecast } from './forecasting-engine';
import type { ColumnProfile } from './tabular-ingest';
import { knownSheetDomain } from './schema-knowledge';
import type { KeyMetric } from '@/types/chat';

export type OpportunityKind =
  | 'conversion_gap'
  | 'target_shortfall'
  | 'decline'
  | 'momentum'
  | 'loss_driver'
  | 'under_monetised'
  | 'best_practice'
  | 'concentration';

export interface GrowthOpportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  /** What the data shows (numbers only from the file) */
  finding: string;
  /** What to do next */
  action: string;
  /** Size of the prize, as arithmetic on the file; absent when it can't be sized honestly */
  impact?: string;
  sheet: string;
  table: string;
  dimension?: string;
  segment?: string;
  /** 0..1, share of the relevant total that this opportunity represents */
  priority: number;
  /** Every figure quoted above, for grounding checks on generated text */
  numbers: number[];
  evidenceSql: string;
}

export interface TrendOutlook {
  sheet: string;
  table: string;
  metricLabel: string;
  metricCol?: string;
  dateColumn: string;
  periods: { period: string; value: number }[];
  excludedPartialPeriod?: string;
  changePct?: number;
  changeLabel?: string;
  direction: 'up' | 'down' | 'flat';
  projection?: { period: string; value: number; low: number; high: number }[];
  backtestErrorPct?: number;
  summary: string;
  numbers: number[];
}

export interface GrowthAnalysis {
  datasetVersion: string;
  fileName: string;
  generatedAt: string;
  opportunities: GrowthOpportunity[];
  outlooks: TrendOutlook[];
  headline: KeyMetric[];
  dataGaps: string[];
  tablesAnalysed: number;
}

// ---------------------------------------------------------------------------
// Column roles
// ---------------------------------------------------------------------------

type DimKind = 'product' | 'geo' | 'channel' | 'outlet' | 'people' | 'customer' | 'fuel' | 'other';

/** How "success" is counted: per row (a status column) or from summed columns (leads → bookings). */
interface Outcome {
  col: string;
  /** Per-row count of opportunities: '1' for row-level data, the leads column for summary sheets */
  rowN: string;
  /** Per-row count of successes */
  rowW: string;
  noun: string;
  aggregated: boolean;
}

/** What "sales" means in this table: a money column, successes, a volume column, or rows. */
interface Measure {
  expr: string;
  label: string;
  col?: string;
  isMoney: boolean;
}

interface TableRoles {
  table: QueryableTable;
  analysable: boolean;
  /** False when the only measure is a row count on a non-sales table (trend/mix would be meaningless) */
  countsAreSales: boolean;
  dimensions: string[];
  measure: Measure;
  unitNoun: string;
  rowN: string;
  outcome?: Outcome;
  lossReason?: string;
  lossCount: string;
  date?: string;
  target?: { targetCol: string; actualCol: string };
}

const ID_LIKE = /(^|_)(id|uuid|code|sku|pin|pincode|zip|phone|mobile|email|vin|chassis|contact)($|_)|customer_name|name_of_customer/i;
/** Not a sales quantity: ratios, prices, durations, scores and plan/target figures. */
const NON_ADDITIVE = /pct|percent|rate|ratio|conversion|avg|average|mean|median|price|rating|score|share|index|age|year|lat|lon|target|quota|plan|budget|goal|rank|_no$|number|days|hours|minutes|mins|duration|_time$|time_to|cycle|tat$|sla|tenure|cover|attainment|achievement/i;
/** Reference or modelled figures copied onto rows; summing them says nothing about this business. */
const REFERENCE_COL = /benchmark|industry|market_|reference|illustrative|estimated|forecast|projected|expected|simulated/i;
/** Money that isn't sales: costs, loans, customer budgets, trade-in values... */
const NOT_SALES_MONEY = /cost|spend|discount|loan|emi|budget|deposit|exchange|salary|income|requested|limit/i;
const MONEY_PRIORITY = /revenue|sales_value|turnover|amount|gmv|billing|income|sales_inr|profit|value_inr|invoice_value/i;
const VOLUME_PRIORITY = /deliver|units|volume|qty|quantity|retail|sold|sales|booking|orders?$/i;
const POSITIVE_OUTCOME = /^(booked|booking done|booking confirmed|delivered|converted|won|closed[\s-]?won|sold|purchased|yes|y|true|completed?|success(ful)?|retailed|invoiced|confirmed|paid|approved)$/i;
const OUTCOME_COL = /status|stage|outcome|result|convert|won|sold|purchase|retail|book|deliver|closed|^is_|flag/i;
const LOSS_COL = /lost_reason|loss_reason|reason|drop_reason|churn|reject|cancel|objection/i;
/** Technical or contact attributes: real columns, but not levers a sales leader can pull. */
const NON_BUSINESS_DIM = /device|browser|platform|\bos\b|_os_|geocode|salutation|webpage|website|email|bounce|language|screen|viewport|charset|timezone|country|make_c|record_?type|createdby|modifiedby|owner_?id|valid/i;
const TARGET_COL = /(^|_)(target|quota|goal)s?(_|$)|planned/i;
const LEADS_COL = /^(total_)?(leads|enquiries|inquiries|prospects|opportunities)$|assigned_leads|^leads_/i;
const WINS_COL = /^(total_)?(bookings|deliveries|conversions|units_sold|orders|won|retail(s)?)$/i;
const FREE_TEXT_COL = /definition|description|interpretation|comment|remark|notes?$|data_status|explanation|narrative/i;
const KEY_VALUE_COL = /^(kpi|metric|measure|indicator|field|parameter|attribute|key)$/i;
const REFERENCE_SHEET = /dictionary|glossary|definition|readme|read_me|notes|benchmark|assumption|about|instructions|methodology|master|lookup|mapping|catalog/i;
/** Logs of events/contacts: many rows per lead, so rates and volumes there don't measure sales. */
const EVENT_SHEET = /event|history|log$|_log|touchpoint|contact|activity|interaction|feedback|audit|spend|media/i;
/** Tables whose rows are sales-funnel records (a lead, booking, delivery, order...). */
const CORE_SALES_SHEET = /lead|sale|booking|deliver|order|invoice|retail|enquir|inquir|opportunit|deal|transaction|registration/i;
const PLANNING_SHEET = /target|plan|budget|forecast|input|quota|master/i;

export function isCoreSalesSheet(name: string): boolean {
  return CORE_SALES_SHEET.test(name) && !PLANNING_SHEET.test(name);
}

/** What one row of a table represents, judged from its name first. */
function rowNounFor(sheetName: string, cols: string[], hasOutcome: boolean, aggregated: boolean): string {
  const n = sheetName.toLowerCase();
  if (/booking|contract/.test(n)) return 'bookings';
  if (/deliver/.test(n)) return 'deliveries';
  if (/inquir/.test(n)) return 'inquiries';
  if (/enquir/.test(n)) return 'enquiries';
  if (/order/.test(n)) return 'orders';
  if (/test.?drive/.test(n)) return 'test drives';
  if (/applicat|financ|loan/.test(n)) return 'applications';
  if (/lead/.test(n)) return 'leads';
  if (aggregated || (hasOutcome && cols.some(c => /lead|enquir|inquir/.test(c)))) return 'leads';
  return 'records';
}
/** Stock positions are not sales, even when measured in units. */
const STOCK_COL = /stock|opening|closing|receipt|inbound|available|on_hand|backlog|capacity/i;
/** Status/stage columns besides the outcome would trivially "explain" it, so they are not used as dimensions. */
const LEAKY_DIM = /status|stage|funnel|step|result|outcome|event_type|record_type|group_name|disposition|converted|isclosed|is_closed/i;

function dimKind(col: string): DimKind {
  const c = col.toLowerCase();
  if (/fuel|powertrain/.test(c)) return 'fuel';
  if (/model|product|variant|car|vehicle|sku|item|brand|segment|body|category/.test(c)) return 'product';
  if (/city|state|region|zone|area|territory|location|district|hub|market|cluster/.test(c)) return 'geo';
  if (/channel|source|campaign|medium|platform|media|utm/.test(c)) return 'channel';
  if (/dealer|showroom|outlet|branch|store|workshop|network/.test(c)) return 'outlet';
  if (/sales_?person|executive|consultant|agent|rep|owner|manager|advisor/.test(c)) return 'people';
  if (/customer|buyer|persona|age_group|gender|income|occupation/.test(c)) return 'customer';
  return 'other';
}

function outcomeNoun(col: string, sheetName = ''): string {
  const fromCol = nounFor(col);
  return fromCol === 'conversions' && sheetName ? nounFor(sheetName) : fromCol;
}

function nounFor(text: string): string {
  const c = text.toLowerCase();
  if (/financ|loan|application|approv/.test(c)) return 'approvals';
  if (/exchange/.test(c)) return 'completed exchanges';
  if (/deliver/.test(c)) return 'deliveries';
  if (/book/.test(c)) return 'bookings';
  if (/test/.test(c)) return 'test drives';
  if (/sold|sale|retail|purchase|invoice|order/.test(c)) return 'sales';
  return 'conversions';
}

function assignRoles(table: QueryableTable): TableRoles {
  const rows = Math.max(1, table.rowCount);
  const profiles = table.profiles;
  const cols = table.columns.filter(c => profiles[c]);
  const p = (c: string): ColumnProfile => profiles[c];
  const isText = (c: string) => !p(c).isNumeric && !p(c).isDate;

  // Dictionaries, benchmark tabs and KPI lists (kpi | value) are context, not business activity
  // For a documented workbook, only sales-funnel sheets drive "grow sales" findings
  const knownDomain = knownSheetDomain(table.sheetName);
  const analysable =
    (knownDomain === undefined || knownDomain === 'sales') &&
    !REFERENCE_SHEET.test(table.sheetName) &&
    !(EVENT_SHEET.test(table.sheetName) && !isCoreSalesSheet(table.sheetName)) &&
    !cols.some(c => isText(c) && KEY_VALUE_COL.test(c));

  const date = cols.find(c => p(c).isDate && p(c).dateMin && p(c).dateMax && p(c).dateMin!.slice(0, 7) !== p(c).dateMax!.slice(0, 7));

  const additive = cols.filter(c =>
    p(c).isNumeric && !ID_LIKE.test(c) && !NON_ADDITIVE.test(c) && !REFERENCE_COL.test(c) && !STOCK_COL.test(c) &&
    (p(c).max ?? 0) > 0 && (p(c).min ?? 0) >= 0
  );

  // Outcome, row level: a status column with a clear "success" value (deepest funnel stage wins)
  const depth = (c: string) =>
    /deliver|sold|retail|purchase|invoice|won|convert/i.test(c) ? 3 : /book/i.test(c) ? 2 : /test/i.test(c) ? 0 : 1;
  const textOutcome = cols
    .filter(c => isText(c) && OUTCOME_COL.test(c) && (p(c).distinctCount || 0) <= 10)
    .map(c => ({ c, positives: (p(c).distinctValues || []).filter(v => POSITIVE_OUTCOME.test(v.trim())) }))
    .filter(x => x.positives.length > 0)
    .sort((a, b) => depth(b.c) - depth(a.c))[0];
  const flagOutcome = cols
    .filter(c => p(c).isNumeric && /^is_|convert|won|sold|booked|delivered/i.test(c) && p(c).min === 0 && p(c).max === 1)
    .sort((a, b) => depth(b) - depth(a))[0];

  let outcome: Outcome | undefined;
  if (textOutcome && (!flagOutcome || depth(textOutcome.c) >= depth(flagOutcome))) {
    const list = textOutcome.positives.map(v => `'${v.trim().toLowerCase().replace(/'/g, "''")}'`).join(', ');
    const nounFromValues = textOutcome.positives.every(v => /deliver/i.test(v)) ? 'deliveries'
      : textOutcome.positives.every(v => /book/i.test(v)) ? 'bookings' : outcomeNoun(textOutcome.c, table.sheetName);
    outcome = {
      col: textOutcome.c,
      rowN: '1',
      rowW: `(CASE WHEN LOWER(TRIM(${qi(textOutcome.c)})) IN (${list}) THEN 1 ELSE 0 END)`,
      noun: nounFromValues,
      aggregated: false
    };
  } else if (flagOutcome) {
    outcome = { col: flagOutcome, rowN: '1', rowW: `(CASE WHEN ${qi(flagOutcome)} = 1 THEN 1 ELSE 0 END)`, noun: outcomeNoun(flagOutcome), aggregated: false };
  } else {
    // Outcome, summary sheet: a leads column and a bookings/deliveries column
    const leadsCol = additive.find(c => LEADS_COL.test(c));
    const winsCol = additive.filter(c => WINS_COL.test(c) && c !== leadsCol).sort((a, b) => (/book/.test(a) ? -1 : 0) - (/book/.test(b) ? -1 : 0))[0];
    if (leadsCol && winsCol && (p(winsCol).max ?? 0) <= (p(leadsCol).max ?? 0)) {
      outcome = { col: winsCol, rowN: `COALESCE(${qi(leadsCol)}, 0)`, rowW: `COALESCE(${qi(winsCol)}, 0)`, noun: outcomeNoun(winsCol), aggregated: true };
    }
  }

  const unitNoun = rowNounFor(table.sheetName, cols, Boolean(outcome), Boolean(outcome?.aggregated));
  // "88% of bookings become bookings" reads badly: name the successful state instead ("confirmed bookings")
  if (outcome && outcome.noun === unitNoun && textOutcome) outcome.noun = `${textOutcome.positives[0].toLowerCase()} ${unitNoun}`;
  const rowN = outcome?.rowN || '1';

  // Measure: money first; then successes; then a volume column; else rows
  const salesMoney = additive.filter(c => isCurrencyColumn(c) && !NOT_SALES_MONEY.test(c));
  const moneyCol = salesMoney.find(c => MONEY_PRIORITY.test(c)) || salesMoney[0];
  const volumeCol = additive.find(c => VOLUME_PRIORITY.test(c) && !LEADS_COL.test(c));
  const measure: Measure = moneyCol
    ? { expr: `COALESCE(${qi(moneyCol)}, 0)`, label: businessLabel(moneyCol).toLowerCase(), col: moneyCol, isMoney: true }
    : outcome
      ? { expr: outcome.rowW, label: outcome.noun, isMoney: false }
      : volumeCol
        ? { expr: `COALESCE(${qi(volumeCol)}, 0)`, label: businessLabel(volumeCol).toLowerCase(), col: volumeCol, isMoney: false }
        : { expr: '1', label: unitNoun, isMoney: false };

  const lossReason = cols.find(c =>
    c !== outcome?.col && isText(c) && LOSS_COL.test(c) && !FREE_TEXT_COL.test(c) && !NON_BUSINESS_DIM.test(c) &&
    (p(c).distinctCount || 0) >= 2 && (p(c).distinctCount || 0) <= 60
  );
  const lossCountCol = additive.find(c => /lost|leads|records/i.test(c) && !/disposition|email|bounce|attempt/i.test(c));
  const lossCount = lossCountCol ? `SUM(COALESCE(${qi(lossCountCol)}, 0))` : 'COUNT(*)';

  const targetCol = cols.find(c => p(c).isNumeric && TARGET_COL.test(c) && !/pct|percent|achiev|attain|rate/i.test(c) && (p(c).max ?? 0) > 0);
  const actualCol = targetCol
    ? cols.find(c => c !== targetCol && p(c).isNumeric && /actual|achieved/i.test(c)) ||
      additive.find(c => c !== targetCol && VOLUME_PRIORITY.test(c) && !LEADS_COL.test(c))
    : undefined;

  const dimensions = cols
    .filter(c => {
      const pr = p(c);
      const distinct = pr.distinctCount || 0;
      const longText = (pr.distinctValues || []).some(v => v.length > 60);
      // Yes/No flags make segments called "No"; they are attributes, not places to act
      const isFlag = (pr.distinctValues || []).length > 0 && (pr.distinctValues || []).every(v => /^(yes|no|y|n|true|false|0|1|na)$/i.test(v.trim()));
      return (
        isText(c) && !ID_LIKE.test(c) && !FREE_TEXT_COL.test(c) && !LEAKY_DIM.test(c) && !NON_BUSINESS_DIM.test(c) && !longText && !isFlag &&
        c !== outcome?.col && c !== lossReason &&
        distinct >= 2 && distinct <= 60 && (rows <= 60 || distinct < rows * 0.9) &&
        (pr.nullCount || 0) < rows * 0.8
      );
    })
    // Business dimensions (product, geography, channel, outlet) before generic ones
    .sort((a, b) => Number(dimKind(a) === 'other') - Number(dimKind(b) === 'other'))
    .slice(0, 6);

  // Counting rows only measures sales when each row is a sale/lead/booking (not targets, prices, stock...)
  const countsAreSales = !PLANNING_SHEET.test(table.sheetName) && (measure.expr !== '1' || isCoreSalesSheet(table.sheetName));

  return {
    table,
    analysable,
    countsAreSales,
    dimensions,
    measure,
    unitNoun,
    rowN,
    outcome,
    lossReason,
    lossCount,
    date,
    target: targetCol && actualCol ? { targetCol, actualCol } : undefined
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const qi = (id: string) => `"${id.replace(/"/g, '""')}"`;

// Ad-hoc aggregate rows; shapes are defined by each query
function run(sql: string): any[] {
  try {
    return executeReadOnlyQuery(sql);
  } catch {
    return [];
  }
}

/** Drops months the data only partly covers (for daily data), judged across the whole table. */
function partialFree<T extends { days: number }>(series: T[]): T[] {
  const maxDays = Math.max(0, ...series.map(s => s.days));
  return maxDays >= 20 ? series.filter(s => s.days >= maxDays * 0.6) : series;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(x: number, nums: number[]): string {
  const v = r1(x * 100);
  nums.push(v);
  return `${v}%`;
}

function count(n: number, nums: number[]): string {
  const v = Math.round(n);
  nums.push(v);
  return formatIndianNumber(v);
}

/** Formats a measure value (₹ for money columns, plain counts otherwise). */
function amount(n: number, measure: Measure | string | undefined, nums: number[]): string {
  const col = typeof measure === 'string' ? measure : measure?.col;
  if (!col) return count(n, nums);
  nums.push(n);
  return formatMetric(n, col);
}

function actionFor(kind: OpportunityKind, dk: DimKind, seg: string, extra: { second?: string; third?: string; reason?: string } = {}): string {
  switch (kind) {
    case 'conversion_gap':
      return {
        product: `Review pricing, variants, finance offers and test-drive availability for ${seg}, and brief the sales team on its most common objections.`,
        geo: `Audit follow-up speed, stock and local offers for ${seg}, and copy the playbook of the best-converting market.`,
        channel: `Tighten qualification and follow-up of leads from ${seg}, or move spend toward sources that convert better.`,
        outlet: `Run a funnel review for ${seg} (response time, test drives, finance approvals) and coach the team on the best outlet's process.`,
        people: `Coach ${seg} using the top performer's approach and review how their leads are followed up.`,
        customer: `Create a tailored offer and follow-up script for ${seg}.`,
        fuel: `Check ${seg} stock and waiting periods, and communicate its running-cost benefits clearly.`,
        other: `Find the step where ${seg} loses most customers and fix that step first.`
      }[dk];
    case 'best_practice':
      return `Document what ${seg} does differently (response time, offers, follow-up) and roll it out to the lowest performers.`;
    case 'target_shortfall':
      return `Give ${seg} a weekly recovery plan and track it against the target in this file.`;
    case 'decline':
      return dk === 'product'
        ? `Check what changed for ${seg} (stock, pricing, competition, promotion) and restore support before the slide deepens.`
        : `Find out what changed in ${seg} (staffing, stock, offers, lead flow) and act before the decline compounds.`;
    case 'momentum':
      return dk === 'product'
        ? `Secure supply and marketing support for ${seg} so growth isn't capped by stock or waiting times.`
        : `Protect budget, staffing and stock for ${seg} so its growth isn't capped by capacity.`;
    case 'under_monetised':
      return `Lift value per sale in ${seg}: promote higher-value variants, accessories, extended warranty and finance add-ons.`;
    case 'concentration':
      return `Build up ${[extra.second, extra.third].filter(Boolean).join(' and ') || 'the next-largest segments'} so results don't hinge on ${seg}.`;
    case 'loss_driver': {
      const r = (extra.reason || seg).toLowerCase();
      if (/loan|financ|credit|emi|cibil/.test(r)) return 'Widen financing: add lender tie-ups, pre-approve buyers early in the process, and offer EMI plans for customers with weaker credit.';
      if (/price|budget|cost|expens|afford/.test(r)) return 'Answer price objections with finance/EMI plans, exchange bonuses or entry variants, rather than blanket discounts.';
      if (/compet|other brand|rival/.test(r)) return 'Give the team side-by-side comparisons and a fast counter-offer process for buyers shopping competitors.';
      if (/respon|contact|follow|call|reach|answer|unreachable/.test(r)) return 'Enforce a fast first response and a fixed follow-up cadence: these customers went cold, they did not reject the product.';
      if (/defer|later|postpone|not now|delay|hold|wait and/.test(r)) return 'Move deferred buyers into a nurture programme with timed reminders and limited-period offers.';
      if (/stock|waiting|availab|delivery|colou?r|variant/.test(r)) return 'Fix allocation and waiting-time communication for the models and variants customers are waiting on.';
      if (/test.?drive|demo/.test(r)) return 'Make test drives easy to book (including doorstep test drives) for undecided buyers.';
      return `Review a sample of "${seg}" cases and put a specific counter-measure in place.`;
    }
  }
}

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

function minSegmentSize(total: number): number {
  return Math.max(10, Math.ceil(total * 0.02));
}

function conversionAnalyses(roles: TableRoles, out: GrowthOpportunity[]): void {
  const { table, outcome, measure } = roles;
  if (!outcome) return;
  const t = qi(table.tableName);
  const valueExpr = !outcome.aggregated && measure.isMoney ? `, SUM(${outcome.rowW} * ${measure.expr}) AS won_value` : '';
  const totals = run(`SELECT SUM(${outcome.rowN}) AS n, SUM(${outcome.rowW}) AS wins${valueExpr} FROM ${t}`)[0];
  if (!totals || !(totals.n > 0) || !(totals.wins > 0)) return;
  const overall = totals.wins / totals.n;
  const valuePerWin = totals.won_value > 0 ? totals.won_value / totals.wins : undefined;
  const minN = minSegmentSize(totals.n);
  const singular = outcome.noun.replace(/ies$/, 'y').replace(/s$/, '');

  let widest: { dim: string; best: any; spread: number; sql: string } | undefined;

  for (const dim of roles.dimensions) {
    const sql = `SELECT ${qi(dim)} AS seg, SUM(${outcome.rowN}) AS n, SUM(${outcome.rowW}) AS wins FROM ${t} WHERE ${qi(dim)} IS NOT NULL GROUP BY ${qi(dim)}`;
    const segs = run(sql).filter(s => s.n >= minN).map(s => ({ ...s, rate: s.wins / s.n }));
    if (segs.length < 2) continue;
    // A dimension that (almost) decides the outcome is another status field, not a lever
    const decided = segs.filter(s => s.rate <= 0.02 || s.rate >= 0.98).reduce((a, s) => a + s.n, 0);
    if (decided / totals.n > 0.5) continue;

    const laggard = segs
      .filter(s => s.rate < overall * 0.9)
      .map(s => ({ ...s, missed: s.n * overall - s.wins }))
      .sort((a, b) => b.missed - a.missed)[0];
    if (laggard && laggard.missed >= 1) {
      const nums: number[] = [];
      const seg = String(laggard.seg);
      const impactValue = valuePerWin ? ` (≈${amount(laggard.missed * valuePerWin, measure, nums)} at your average ${measure.label} per ${singular})` : '';
      out.push({
        id: `conv_${table.tableName}_${dim}`,
        kind: 'conversion_gap',
        title: `Lift ${outcome.noun} in ${seg}`,
        finding: `${seg} (${businessLabel(dim)}) turns ${pct(laggard.rate, nums)} of its ${count(laggard.n, nums)} ${roles.unitNoun} into ${outcome.noun}, vs ${pct(overall, nums)} overall.`,
        impact: `If it converted at the overall rate: ≈${count(laggard.missed, nums)} more ${outcome.noun}${impactValue}.`,
        action: actionFor('conversion_gap', dimKind(dim), seg),
        sheet: table.sheetName,
        table: table.tableName,
        dimension: dim,
        segment: seg,
        priority: laggard.missed / totals.wins,
        numbers: nums,
        evidenceSql: sql
      });
    }

    const byRate = [...segs].sort((a, b) => b.rate - a.rate);
    const spread = byRate[0].rate - byRate[byRate.length - 1].rate;
    if (byRate[0].rate > overall * 1.15 && (!widest || spread > widest.spread)) widest = { dim, best: byRate[0], spread, sql };
  }

  if (widest) {
    const nums: number[] = [];
    const seg = String(widest.best.seg);
    out.push({
      id: `best_${table.tableName}_${widest.dim}`,
      kind: 'best_practice',
      title: `Replicate what works in ${seg}`,
      finding: `${seg} (${businessLabel(widest.dim)}) converts ${pct(widest.best.rate, nums)} of ${count(widest.best.n, nums)} ${roles.unitNoun}, vs ${pct(overall, nums)} overall.`,
      action: actionFor('best_practice', dimKind(widest.dim), seg),
      sheet: table.sheetName,
      table: table.tableName,
      dimension: widest.dim,
      segment: seg,
      priority: Math.min(0.3, ((widest.best.rate - overall) / overall) * 0.2),
      numbers: nums,
      evidenceSql: widest.sql
    });
  }
}

function targetAnalyses(roles: TableRoles, out: GrowthOpportunity[]): void {
  const { table, target } = roles;
  if (!target) return;
  const t = qi(table.tableName);
  const a = qi(target.actualCol);
  const tg = qi(target.targetCol);
  const totals = run(`SELECT SUM(${a}) AS actual, SUM(${tg}) AS target FROM ${t}`)[0];
  if (!totals || !(totals.target > 0)) return;
  const label = businessLabel(target.actualCol).toLowerCase();

  for (const dim of roles.dimensions) {
    const sql = `SELECT ${qi(dim)} AS seg, SUM(${a}) AS actual, SUM(${tg}) AS target FROM ${t} WHERE ${qi(dim)} IS NOT NULL GROUP BY ${qi(dim)} HAVING SUM(${tg}) > 0`;
    const worst = run(sql)
      .map(s => ({ ...s, gap: s.target - (s.actual || 0) }))
      .filter(s => s.gap > 0)
      .sort((x, y) => y.gap - x.gap)[0];
    if (!worst) continue;
    const nums: number[] = [];
    const seg = String(worst.seg);
    out.push({
      id: `target_${table.tableName}_${dim}`,
      kind: 'target_shortfall',
      title: `Close the target gap in ${seg}`,
      finding: `${seg} (${businessLabel(dim)}) is at ${pct((worst.actual || 0) / worst.target, nums)} of target: ${amount(worst.actual || 0, target.actualCol, nums)} vs ${amount(worst.target, target.actualCol, nums)} ${label}.`,
      impact: `Closing the gap adds ${amount(worst.gap, target.actualCol, nums)} ${label}.`,
      action: actionFor('target_shortfall', dimKind(dim), seg),
      sheet: table.sheetName,
      table: table.tableName,
      dimension: dim,
      segment: seg,
      priority: worst.gap / totals.target,
      numbers: nums,
      evidenceSql: sql
    });
  }
}

function lossAnalyses(roles: TableRoles, out: GrowthOpportunity[]): void {
  const { table, lossReason, lossCount } = roles;
  if (!lossReason) return;
  const t = qi(table.tableName);
  const sql = `SELECT ${qi(lossReason)} AS seg, ${lossCount} AS n FROM ${t} WHERE ${qi(lossReason)} IS NOT NULL AND TRIM(${qi(lossReason)}) <> '' GROUP BY ${qi(lossReason)} ORDER BY n DESC`;
  const reasons = run(sql);
  const total = reasons.reduce((s, r) => s + r.n, 0);
  if (reasons.length < 2 || total < 10) return;

  // Cancelled bookings and lost enquiries are different problems; name them precisely
  const isCancellation = /cancel/i.test(lossReason);
  const lostWhat = isCancellation ? `cancelled ${roles.unitNoun}` : `lost ${roles.unitNoun === 'records' ? 'cases' : roles.unitNoun}`;

  reasons.slice(0, 2).forEach((top, i) => {
    const nums: number[] = [];
    const seg = String(top.seg);
    const top3 = reasons.slice(0, 3).reduce((s, r) => s + r.n, 0) / total;
    out.push({
      id: `loss_${table.tableName}_${i}`,
      kind: 'loss_driver',
      title: `Tackle "${seg}" as a ${isCancellation ? 'cancellation' : 'loss'} reason`,
      finding: `${count(top.n, nums)} ${lostWhat} (${pct(top.n / total, nums)} of those with a recorded reason) cite "${seg}".` +
        (i === 0 && reasons.length > 3 ? ` The top 3 reasons cover ${pct(top3, nums)}.` : ''),
      action: actionFor('loss_driver', 'other', seg, { reason: seg }),
      sheet: table.sheetName,
      table: table.tableName,
      dimension: lossReason,
      segment: seg,
      priority: (top.n / total) * 0.5,
      numbers: nums,
      evidenceSql: sql
    });
  });
}

function mixAnalyses(roles: TableRoles, out: GrowthOpportunity[]): void {
  const { table, measure } = roles;
  const t = qi(table.tableName);
  const totals = run(`SELECT SUM(${roles.rowN}) AS n, SUM(${measure.expr}) AS v FROM ${t}`)[0];
  if (!totals || !(totals.v > 0) || !(totals.n > 0)) return;

  for (const dim of roles.dimensions) {
    const sql = `SELECT ${qi(dim)} AS seg, SUM(${roles.rowN}) AS n, SUM(${measure.expr}) AS v FROM ${t} WHERE ${qi(dim)} IS NOT NULL GROUP BY ${qi(dim)} ORDER BY v DESC`;
    const segs = run(sql);
    if (segs.length < 3) continue;

    // Dependence on one segment
    const top = segs[0];
    const share = top.v / totals.v;
    if (share >= 0.45 && segs.length >= 4) {
      const nums: number[] = [];
      const seg = String(top.seg);
      out.push({
        id: `conc_${table.tableName}_${dim}`,
        kind: 'concentration',
        title: `Reduce dependence on ${seg}`,
        finding: `${seg} brings ${pct(share, nums)} of all ${measure.label} across ${count(segs.length, nums)} ${businessLabel(dim).toLowerCase()} values.`,
        action: actionFor('concentration', dimKind(dim), seg, { second: segs[1] && String(segs[1].seg), third: segs[2] && String(segs[2].seg) }),
        sheet: table.sheetName,
        table: table.tableName,
        dimension: dim,
        segment: seg,
        priority: share * 0.15,
        numbers: nums,
        evidenceSql: sql
      });
    }

    // Large segments earning less per lead/record than average (only meaningful for money)
    if (measure.isMoney) {
      const avg = totals.v / totals.n;
      const weak = segs
        .filter(s => s.n / totals.n >= 0.1 && s.v / s.n < avg * 0.8)
        .map(s => ({ ...s, gap: s.n * avg - s.v }))
        .sort((a, b) => b.gap - a.gap)[0];
      if (weak) {
        const nums: number[] = [];
        const seg = String(weak.seg);
        out.push({
          id: `mix_${table.tableName}_${dim}`,
          kind: 'under_monetised',
          title: `Raise value per sale in ${seg}`,
          finding: `${seg} has ${pct(weak.n / totals.n, nums)} of ${roles.unitNoun} but only ${pct(weak.v / totals.v, nums)} of ${measure.label}.`,
          impact: `At the average ${measure.label} per ${roles.unitNoun === 'leads' ? 'lead' : 'record'}, it would add ≈${amount(weak.gap, measure, nums)}.`,
          action: actionFor('under_monetised', dimKind(dim), seg),
          sheet: table.sheetName,
          table: table.tableName,
          dimension: dim,
          segment: seg,
          priority: (weak.gap / totals.v) * 0.7,
          numbers: nums,
          evidenceSql: sql
        });
      }
    }
  }
}

function trendAnalyses(roles: TableRoles, out: GrowthOpportunity[], outlooks: TrendOutlook[], gaps: string[]): void {
  const { table, date, measure } = roles;
  if (!date) return;
  const t = qi(table.tableName);
  const d = qi(date);
  const label = measure.label;

  let series = run(
    `SELECT substr(${d}, 1, 7) AS period, SUM(${measure.expr}) AS v, COUNT(DISTINCT substr(${d}, 1, 10)) AS days FROM ${t} WHERE ${d} GLOB '[12][0-9][0-9][0-9]-[01][0-9]*' GROUP BY period ORDER BY period`
  );
  if (series.length < 2) return;

  // A month the data only partly covers (data starting mid-month, or the current month) would look like a
  // spike or a collapse; leave such months out of comparisons
  let excluded: string | undefined;
  const maxDays = Math.max(...series.map(s => s.days));
  if (maxDays >= 20) {
    const isPartial = (s: any) => s.days < maxDays * 0.6;
    const partial = series.filter(isPartial);
    if (partial.length > 0 && partial.length < series.length) {
      excluded = partial.map(s => s.period).join(', ');
      series = series.filter(s => !isPartial(s));
      gaps.push(`${table.sheetName}: ${excluded} ${partial.length > 1 ? 'are' : 'is'} only partly covered by the data, so ${partial.length > 1 ? 'they are' : 'it is'} left out of trend comparisons.`);
    }
  }
  // Fewer than 3 full months can't separate a trend from noise
  if (series.length < 3) return;

  const periods = series.map(s => ({ period: s.period as string, value: s.v as number }));
  const window = periods.length >= 6 ? 3 : 1;
  const recent = periods.slice(-window);
  const prior = periods.slice(-2 * window, -window);
  const recentSum = recent.reduce((s, p) => s + p.value, 0);
  const priorSum = prior.reduce((s, p) => s + p.value, 0);
  const windowLabel = window === 3
    ? `${recent[0].period} to ${recent[2].period} vs the 3 months before`
    : `${recent[0].period} vs ${prior[0].period}`;

  const nums: number[] = [];
  let changePct: number | undefined;
  let direction: TrendOutlook['direction'] = 'flat';
  let summary = `${businessLabel(label)} by month: ${periods.length} months of history in "${table.sheetName}".`;
  if (priorSum > 0) {
    changePct = r1(((recentSum - priorSum) / priorSum) * 100);
    nums.push(changePct, Math.abs(changePct));
    direction = changePct > 3 ? 'up' : changePct < -3 ? 'down' : 'flat';
    const verb = direction === 'up' ? `rose ${Math.abs(changePct)}%` : direction === 'down' ? `fell ${Math.abs(changePct)}%` : 'held steady';
    summary = `${businessLabel(label)} ${verb} (${amount(priorSum, measure, nums)} → ${amount(recentSum, measure, nums)}), ${windowLabel}.`;
  }

  const outlook: TrendOutlook = {
    sheet: table.sheetName,
    table: table.tableName,
    metricLabel: label,
    metricCol: measure.col,
    dateColumn: date,
    periods,
    excludedPartialPeriod: excluded,
    changePct,
    changeLabel: windowLabel,
    direction,
    summary,
    numbers: nums
  };

  // Projection only from the file's own history, only with enough of it, and only if it back-tests well
  if (periods.length >= 6) {
    const fc = generateTimeSeriesForecast(periods, 3);
    if (fc.isSufficientData && fc.forecastHorizon.length > 0) {
      const wape = fc.accuracyMetrics.wape;
      nums.push(wape);
      outlook.backtestErrorPct = wape;
      if (wape > MAX_PROJECTION_ERROR_PCT) {
        outlook.summary += ` Month-to-month swings are too large for a reliable projection (back-tested error ${wape}%).`;
      } else {
        outlook.projection = fc.forecastHorizon.map(f => ({
          period: f.period.replace(' (F)', ''),
          value: f.forecast ?? f.actual,
          low: f.lowerBound80 ?? f.actual,
          high: f.upperBound80 ?? f.actual
        }));
        const next = outlook.projection[0];
        outlook.summary += ` If the recent trend continues, ${next.period} is projected at ${amount(next.value, measure, nums)} (80% range ${amount(next.low, measure, nums)}–${amount(next.high, measure, nums)}; back-tested error ${wape}%).`;
      }
    }
  } else {
    gaps.push(`${table.sheetName}: only ${periods.length} months of history; at least 6 are needed for a projection.`);
  }
  outlooks.push(outlook);

  if (prior.length === 0) return;
  const recentSet = recent.map(p => `'${p.period}'`).join(',');
  const priorSet = prior.map(p => `'${p.period}'`).join(',');

  for (const dim of roles.dimensions.slice(0, 4)) {
    const sql = `SELECT ${qi(dim)} AS seg, SUM(CASE WHEN substr(${d},1,7) IN (${recentSet}) THEN ${measure.expr} ELSE 0 END) AS recent, SUM(CASE WHEN substr(${d},1,7) IN (${priorSet}) THEN ${measure.expr} ELSE 0 END) AS prior FROM ${t} WHERE ${qi(dim)} IS NOT NULL GROUP BY ${qi(dim)}`;
    const minBase = Math.max(measure.isMoney ? 0 : 10, priorSum * 0.03);
    const segs = run(sql).filter(s => s.prior > 0 && s.prior >= minBase).map(s => ({ ...s, delta: s.recent - s.prior, change: (s.recent - s.prior) / s.prior }));

    const riser = segs.filter(s => s.change >= 0.15).sort((a, b) => b.delta - a.delta)[0];
    if (riser) {
      const n: number[] = [];
      const seg = String(riser.seg);
      out.push({
        id: `mom_${table.tableName}_${dim}`,
        kind: 'momentum',
        title: `Back the momentum in ${seg}`,
        finding: `${businessLabel(label)} from ${seg} (${businessLabel(dim)}) rose ${pct(riser.change, n)} (${amount(riser.prior, measure, n)} → ${amount(riser.recent, measure, n)}), ${windowLabel}.`,
        action: actionFor('momentum', dimKind(dim), seg),
        sheet: table.sheetName,
        table: table.tableName,
        dimension: dim,
        segment: seg,
        priority: (riser.delta / Math.max(recentSum, 1)) * 0.8,
        numbers: n,
        evidenceSql: sql
      });
    }

    const faller = segs.filter(s => s.change <= -0.15).sort((a, b) => a.delta - b.delta)[0];
    if (faller) {
      const n: number[] = [];
      const seg = String(faller.seg);
      out.push({
        id: `dec_${table.tableName}_${dim}`,
        kind: 'decline',
        title: `Stop the slide in ${seg}`,
        finding: `${businessLabel(label)} from ${seg} (${businessLabel(dim)}) fell ${pct(-faller.change, n)} (${amount(faller.prior, measure, n)} → ${amount(faller.recent, measure, n)}), ${windowLabel}.`,
        impact: `Getting back to the earlier level recovers ${amount(-faller.delta, measure, n)} ${measure.isMoney ? '' : `${label} `}over ${window === 3 ? '3 months' : 'a month'}.`,
        action: actionFor('decline', dimKind(dim), seg),
        sheet: table.sheetName,
        table: table.tableName,
        dimension: dim,
        segment: seg,
        priority: -faller.delta / Math.max(priorSum, 1),
        numbers: n,
        evidenceSql: sql
      });
    }
  }
}

function headlineFor(roles: TableRoles, outlook?: TrendOutlook): KeyMetric[] {
  const { table, measure, outcome } = roles;
  const t = qi(table.tableName);
  const row = run(
    `SELECT SUM(${roles.rowN}) AS n${measure.isMoney ? `, SUM(${measure.expr}) AS v` : ''}${outcome ? `, SUM(${outcome.rowW}) AS wins` : ''} FROM ${t}`
  )[0];
  if (!row) return [];
  const tiles: KeyMetric[] = [
    { label: businessLabel(roles.unitNoun), value: formatIndianNumber(row.n), note: table.sheetName }
  ];
  if (measure.isMoney && row.v !== null) tiles.push({ label: `Total ${measure.label}`, value: formatMetric(row.v, measure.col) });
  if (outcome && row.n > 0) {
    tiles.push({ label: `${businessLabel(outcome.noun.replace(/ies$/, 'y').replace(/s$/, ''))} rate`, value: `${r1((row.wins / row.n) * 100)}%`, note: `${formatIndianNumber(row.wins)} ${outcome.noun}` });
  }
  if (outlook?.changePct !== undefined) {
    tiles.push({ label: `Recent trend (${outlook.metricLabel})`, value: `${outlook.changePct > 0 ? '+' : ''}${outlook.changePct}%`, note: outlook.changeLabel });
  }
  return tiles.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let cache: GrowthAnalysis | null = null;

export function clearGrowthAnalysisCache(): void {
  cache = null;
}

const MAX_OPPORTUNITIES = 10;
const MAX_PER_KIND = 3;
/** Projections whose back-test error exceeds this are withheld rather than shown with a wide range. */
const MAX_PROJECTION_ERROR_PCT = 25;

/** Full growth scan of the uploaded file (cached per dataset version). */
export function analyzeGrowthOpportunities(): GrowthAnalysis | null {
  const meta = getDatasetMetadata();
  if (!meta || meta.rowCount === 0) return null;
  const version = getDatasetVersion();
  if (cache && cache.datasetVersion === version) return cache;

  const allRoles = getQueryableTables(meta)
    .filter(t => t.rowCount >= 3)
    .map(assignRoles)
    .filter(r => r.analysable)
    // Core sales tables (leads, bookings, deliveries...) first: their numbers represent the business
    .sort((a, b) =>
      Number(isCoreSalesSheet(b.table.sheetName)) - Number(isCoreSalesSheet(a.table.sheetName)) ||
      Number(Boolean(b.outcome)) - Number(Boolean(a.outcome)) ||
      b.table.rowCount - a.table.rowCount);

  const all: GrowthOpportunity[] = [];
  const outlooks: TrendOutlook[] = [];
  const gaps: string[] = [];
  let headline: KeyMetric[] = [];
  let hasOutcome = false, hasDate = false, hasMoney = false;

  for (const roles of allRoles) {
    hasOutcome ||= Boolean(roles.outcome);
    hasDate ||= Boolean(roles.date);
    hasMoney ||= roles.measure.isMoney;

    const before = outlooks.length;
    conversionAnalyses(roles, all);
    targetAnalyses(roles, all);
    lossAnalyses(roles, all);
    if (roles.countsAreSales) {
      mixAnalyses(roles, all);
      trendAnalyses(roles, all, outlooks, gaps);
    }
    if (headline.length === 0) headline = headlineFor(roles, outlooks[before]);
  }

  // If the main table has no money column, show total value from the first table that has one
  const moneyRoles = allRoles.find(r => r.measure.isMoney);
  if (moneyRoles && !headline.some(h => /^Total /.test(h.label)) && headline.length < 4) {
    const v = run(`SELECT SUM(${moneyRoles.measure.expr}) AS v FROM ${qi(moneyRoles.table.tableName)}`)[0]?.v;
    if (v > 0) headline.splice(1, 0, { label: `Total ${moneyRoles.measure.label}`, value: formatMetric(v, moneyRoles.measure.col), note: moneyRoles.table.sheetName });
  }

  if (!hasOutcome) gaps.push('No status/outcome column (for example Booked or Delivered) was found, so conversion gaps cannot be measured.');
  if (!hasDate) gaps.push('No date or month column was found, so trends and projections cannot be computed.');
  if (!hasMoney) gaps.push('No revenue or sales-value column was found, so opportunities are sized in counts rather than money.');

  // Rank, keeping variety. Summary sheets often repeat what the raw sheet shows,
  // so the same finding about the same segment is reported once (from the larger table).
  const tableRank = new Map(allRoles.map((r, i) => [r.table.tableName, i]));
  const ordered = all
    .filter(o => o.priority > 0)
    .sort((a, b) => b.priority - a.priority || (tableRank.get(a.table)! - tableRank.get(b.table)!));
  const seen = new Set<string>();
  const perKind = new Map<OpportunityKind, number>();
  const opportunities: GrowthOpportunity[] = [];
  for (const o of ordered) {
    const keys = [
      `${o.kind}|${o.table}|${o.dimension}`,
      // Same finding restated by a summary sheet: keep one. Loss reasons of different kinds (lost vs cancelled) are distinct.
      `${o.kind}|${o.kind === 'loss_driver' ? `${o.dimension}|` : ''}${(o.segment || '').toLowerCase()}`
    ];
    if (keys.some(k => seen.has(k)) || (perKind.get(o.kind) || 0) >= MAX_PER_KIND) continue;
    keys.forEach(k => seen.add(k));
    perKind.set(o.kind, (perKind.get(o.kind) || 0) + 1);
    opportunities.push(o);
    if (opportunities.length >= MAX_OPPORTUNITIES) break;
  }

  // Summary sheets often restate the raw sheet's monthly totals; keep each distinct series once
  const seenSeries = new Set<string>();
  const distinctOutlooks = outlooks.filter(o => {
    const key = o.periods.map(p => `${p.period}:${Math.round(p.value)}`).join('|');
    if (seenSeries.has(key)) return false;
    seenSeries.add(key);
    return true;
  });

  cache = {
    datasetVersion: version,
    fileName: meta.fileName,
    generatedAt: new Date().toISOString(),
    opportunities,
    outlooks: distinctOutlooks,
    headline,
    dataGaps: Array.from(new Set(gaps)),
    tablesAnalysed: allRoles.length
  };
  return cache;
}

/** Opportunities most relevant to a question (matching segment, dimension or topic), best first. */
export function selectOpportunitiesForQuestion(
  analysis: GrowthAnalysis,
  question: string,
  opts: { dimension?: string; limit?: number } = {}
): GrowthOpportunity[] {
  const q = question.toLowerCase();
  const scored = analysis.opportunities.map(o => {
    let score = o.priority;
    if (o.segment && new RegExp(`\\b${escapeRegex(o.segment.toLowerCase())}\\b`).test(q)) score += 1;
    if (opts.dimension && o.dimension === opts.dimension) score += 0.3;
    if (o.dimension && q.includes(businessLabel(o.dimension).toLowerCase())) score += 0.1;
    // Topic hints nudge the order without drowning out bigger opportunities
    if (/lost|loss|reason|objection/.test(q) && o.kind === 'loss_driver') score += 0.1;
    if (/target|quota|plan/.test(q) && o.kind === 'target_shortfall') score += 0.1;
    if (/trend|month|future|next|forecast|momentum|declin/.test(q) && (o.kind === 'momentum' || o.kind === 'decline')) score += 0.1;
    if (/convert|conversion|booking|deliver|close/.test(q) && o.kind === 'conversion_gap') score += 0.1;
    return { o, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 5).map(s => s.o);
}

/** "**Title**: action Why: finding impact" (the UI splits on "Why:"). */
export function formatOpportunity(o: GrowthOpportunity, showSheet = false): string {
  const where = showSheet ? ` [${o.sheet}]` : '';
  return `**${o.title}**${where}: ${o.action} Why: ${o.finding}${o.impact ? ` ${o.impact}` : ''}`;
}

export function opportunityNumbers(opps: GrowthOpportunity[], outlooks: TrendOutlook[] = []): number[] {
  return [...opps.flatMap(o => o.numbers), ...outlooks.flatMap(o => o.numbers)];
}

// ---------------------------------------------------------------------------
// Segment diagnostics: how does one segment differ from the rest of the file?
// ---------------------------------------------------------------------------

export interface SegmentDriver {
  category: string;
  finding: string;
  evidence: string;
  action: string;
  weight: number;
}

export interface SegmentProfile {
  sheet: string;
  facts: string[];
  drivers: SegmentDriver[];
  outcomeNoun?: string;
  segmentRate?: number;
  overallRate?: number;
  missedWins?: number;
  missedValue?: string;
  numbers: number[];
}

/** Finds the table holding `column` (preferring `tableHint`) and compares `segment` with everything else. */
export function profileSegment(column: string, segment: string, tableHint?: string): SegmentProfile | null {
  const tables = getQueryableTables();
  const table =
    tables.find(t => t.tableName === tableHint && t.columns.includes(column)) ||
    tables.filter(t => t.columns.includes(column)).sort((a, b) => b.rowCount - a.rowCount)[0];
  if (!table) return null;

  const roles = assignRoles(table);
  // Comparing "Lost" leads or one loss reason with the rest says nothing about why sales lag
  if (column === roles.outcome?.col || column === roles.lossReason) return null;

  const t = qi(table.tableName);
  const inSeg = `${qi(column)} = '${segment.replace(/'/g, "''")}'`;
  const rowN = roles.rowN;
  const rowW = roles.outcome?.rowW || '0';
  const m = roles.measure.expr;

  const base = run(
    `SELECT SUM(${rowN}) AS n, SUM(CASE WHEN ${inSeg} THEN ${rowN} ELSE 0 END) AS sn, SUM(${rowW}) AS w, SUM(CASE WHEN ${inSeg} THEN ${rowW} ELSE 0 END) AS sw, SUM(${m}) AS v, SUM(CASE WHEN ${inSeg} THEN ${m} ELSE 0 END) AS sv FROM ${t}`
  )[0];
  if (!base || !base.sn) return null;

  const nums: number[] = [];
  const facts: string[] = [];
  const drivers: SegmentDriver[] = [];
  const dimLabel = businessLabel(column);

  facts.push(`${segment} accounts for ${count(base.sn, nums)} of ${count(base.n, nums)} ${roles.unitNoun} (${pct(base.sn / base.n, nums)}).`);
  if (roles.measure.isMoney && base.v > 0) {
    facts.push(`It brings ${amount(base.sv, roles.measure, nums)} of ${amount(base.v, roles.measure, nums)} total ${roles.measure.label} (${pct(base.sv / base.v, nums)}).`);
  }

  const profile: SegmentProfile = { sheet: table.sheetName, facts, drivers, numbers: nums };

  if (roles.outcome && base.n > 0 && base.w > 0) {
    const segRate = base.sw / base.sn;
    const overall = base.w / base.n;
    profile.outcomeNoun = roles.outcome.noun;
    profile.segmentRate = segRate;
    profile.overallRate = overall;
    facts.push(`Its ${roles.outcome.noun} rate is ${pct(segRate, nums)} vs ${pct(overall, nums)} across the file.`);
    const missed = base.sn * overall - base.sw;
    if (missed >= 1) {
      profile.missedWins = Math.round(missed);
      nums.push(profile.missedWins);
      if (roles.measure.isMoney && !roles.outcome.aggregated) {
        const perWin = run(`SELECT SUM(${rowW} * ${m}) * 1.0 / NULLIF(SUM(${rowW}), 0) AS p FROM ${t}`)[0]?.p;
        if (perWin > 0) profile.missedValue = amount(missed * perWin, roles.measure, nums);
      }
    }
  }

  // Which other dimensions look different inside this segment?
  for (const dim of roles.dimensions.filter(d => d !== column).slice(0, 5)) {
    const rows = run(
      `SELECT ${qi(dim)} AS v, SUM(CASE WHEN ${inSeg} THEN ${rowN} ELSE 0 END) AS sn, SUM(${rowN}) AS an, SUM(CASE WHEN ${inSeg} THEN ${rowW} ELSE 0 END) AS sw, SUM(${rowW}) AS aw FROM ${t} WHERE ${qi(dim)} IS NOT NULL GROUP BY ${qi(dim)}`
    );
    const segTotal = rows.reduce((s, r) => s + r.sn, 0);
    const allTotal = rows.reduce((s, r) => s + r.an, 0);
    if (segTotal < 10 || allTotal === 0) continue;
    const dl = businessLabel(dim);

    // Conversion weakness inside a sub-segment ("Baleno leads in Pune convert 4% vs 17% for Baleno elsewhere")
    if (roles.outcome) {
      const weak = rows
        .filter(r => r.sn >= 10 && r.an > r.sn)
        .map(r => {
          const elsewhereRate = (r.aw - r.sw) / (r.an - r.sn);
          return { ...r, elsewhereRate, missed: r.sn * elsewhereRate - r.sw };
        })
        .filter(r => r.missed >= 1 && r.sw / r.sn < r.elsewhereRate * 0.8)
        .sort((a, b) => b.missed - a.missed)[0];
      if (weak) {
        const n: number[] = [];
        const finding = `${businessLabel(roles.unitNoun)} for ${dl} "${weak.v}" in ${segment} convert at ${pct(weak.sw / weak.sn, n)} vs ${pct(weak.elsewhereRate, n)} for "${weak.v}" elsewhere.`;
        nums.push(...n);
        drivers.push({
          category: `${businessLabel(roles.outcome.noun)} gap by ${dl.toLowerCase()}`,
          finding,
          evidence: `${count(weak.sn, nums)} ${roles.unitNoun}; ≈${count(weak.missed, nums)} ${roles.outcome.noun} below par`,
          action: actionFor('conversion_gap', dimKind(dim), `${weak.v} in ${segment}`),
          weight: weak.missed / Math.max(base.sn, 1)
        });
      }
    }

    // Mix difference (the segment over-indexes on a value)
    const skew = rows
      .map(r => ({ ...r, segShare: r.sn / segTotal, allShare: r.an / allTotal }))
      // ≥90% means the column is implied by the segment (e.g. a city's state): a hierarchy, not a cause
      .filter(r => r.segShare >= 0.15 && r.segShare < 0.9 && r.segShare - r.allShare >= 0.1)
      .sort((a, b) => (b.segShare - b.allShare) - (a.segShare - a.allShare))[0];
    if (skew) {
      const n: number[] = [];
      const finding = `${pct(skew.segShare, n)} of ${segment}'s ${roles.unitNoun} have ${dl} "${skew.v}", vs ${pct(skew.allShare, n)} across the file.`;
      nums.push(...n);
      drivers.push({
        category: `${dl} mix`,
        finding,
        evidence: `${count(skew.sn, nums)} of ${count(segTotal, nums)} ${roles.unitNoun}`,
        action: `Check whether the ${dl.toLowerCase()} mix in ${segment} matches local demand; rebalance stock and promotion toward what converts.`,
        weight: (skew.segShare - skew.allShare) * 0.5
      });
    }
  }

  // Loss reasons this segment suffers from more than the rest
  if (roles.lossReason && roles.lossReason !== column) {
    const lr = qi(roles.lossReason);
    const cnt = roles.lossCount.replace(/^SUM\((.*)\)$/, '$1').replace(/^COUNT\(\*\)$/, '1');
    const rows = run(`SELECT ${lr} AS v, SUM(CASE WHEN ${inSeg} THEN ${cnt} ELSE 0 END) AS sn, SUM(${cnt}) AS an FROM ${t} WHERE ${lr} IS NOT NULL AND TRIM(${lr}) <> '' GROUP BY ${lr}`);
    const segTotal = rows.reduce((s, r) => s + r.sn, 0);
    const allTotal = rows.reduce((s, r) => s + r.an, 0);
    const top = rows
      .map(r => ({ ...r, segShare: r.sn / Math.max(segTotal, 1), allShare: r.an / Math.max(allTotal, 1) }))
      .filter(r => r.segShare - r.allShare >= 0.05 && r.segShare >= r.allShare * 1.15)
      .sort((a, b) => (b.segShare - b.allShare) - (a.segShare - a.allShare))[0];
    if (top && segTotal >= 10) {
      const n: number[] = [];
      const finding = `"${top.v}" is behind ${pct(top.segShare, n)} of ${segment}'s lost ${roles.unitNoun}, vs ${pct(top.allShare, n)} across the file.`;
      nums.push(...n);
      drivers.push({
        category: 'Loss reason',
        finding,
        evidence: `${count(top.sn, nums)} lost ${roles.unitNoun}`,
        action: actionFor('loss_driver', 'other', String(top.v), { reason: String(top.v) }),
        weight: (top.segShare - top.allShare) * 0.8
      });
    }
  }

  // Direction of travel for the segment
  if (roles.date) {
    const d = qi(roles.date);
    let series = run(`SELECT substr(${d},1,7) AS p, SUM(${m}) AS v, COUNT(DISTINCT substr(${d},1,10)) AS days FROM ${t} WHERE ${d} GLOB '[12][0-9][0-9][0-9]-[01][0-9]*' GROUP BY p ORDER BY p`);
    const full = new Set(partialFree(series).map(r => r.p));
    series = run(`SELECT substr(${d},1,7) AS p, SUM(${m}) AS v FROM ${t} WHERE ${inSeg} AND ${d} GLOB '[12][0-9][0-9][0-9]-[01][0-9]*' GROUP BY p ORDER BY p`).filter(r => full.has(r.p));
    if (series.length >= 4) {
      const w = series.length >= 6 ? 3 : 1;
      const recent = series.slice(-w).reduce((s, r) => s + r.v, 0);
      const prior = series.slice(-2 * w, -w).reduce((s, r) => s + r.v, 0);
      if (prior > 0) {
        const n: number[] = [];
        const change = (recent - prior) / prior;
        const span = w === 3 ? 'latest 3 months vs the 3 before' : 'latest month vs the one before';
        facts.push(`${businessLabel(roles.measure.label)} in ${segment} ${change >= 0 ? 'rose' : 'fell'} ${pct(Math.abs(change), n)} (${span}; latest month in data: ${series[series.length - 1].p}).`);
        nums.push(...n);
      }
    }
  }

  drivers.sort((a, b) => b.weight - a.weight);
  profile.drivers = drivers.slice(0, 4);
  if (!profile.drivers.length) facts.push(`No other column in "${table.sheetName}" shows a clear difference for ${segment} (${dimLabel}).`);
  return profile;
}

// ---------------------------------------------------------------------------
// Named-segment questions ("Why is Pune underperforming?")
// ---------------------------------------------------------------------------

export interface SegmentMention {
  table: string;
  sheet: string;
  column: string;
  segment: string;
}

interface SegmentEntry extends SegmentMention { cleaned: string; rows: number }
let segmentIndex: { version: string; entries: SegmentEntry[] } | null = null;

/** Every segment name (dimension value) in the analysable tables, built once per upload. */
export function warmSegmentIndex(): SegmentEntry[] {
  const version = getDatasetVersion();
  if (segmentIndex && segmentIndex.version === version) return segmentIndex.entries;
  const entries: SegmentEntry[] = [];
  for (const table of getQueryableTables()) {
    const roles = assignRoles(table);
    if (!roles.analysable) continue;
    for (const dim of roles.dimensions) {
      for (const { v } of run(`SELECT DISTINCT ${qi(dim)} AS v FROM ${qi(table.tableName)} WHERE ${qi(dim)} IS NOT NULL LIMIT 200`)) {
        const cleaned = String(v).toLowerCase().replace(/[^a-z0-9&\s-]/g, ' ').trim();
        if (cleaned.length >= 3) {
          entries.push({ table: table.tableName, sheet: table.sheetName, column: dim, segment: String(v), cleaned, rows: table.rowCount });
        }
      }
    }
  }
  segmentIndex = { version, entries };
  return entries;
}

/** Finds a dimension value named in the question (longest match wins, larger tables first). */
export function findSegmentMention(question: string): SegmentMention | null {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9&\s-]/g, ' ')} `;
  let best: SegmentEntry | null = null;
  for (const e of warmSegmentIndex()) {
    if (!q.includes(` ${e.cleaned} `)) continue;
    if (!best || e.cleaned.length > best.cleaned.length || (e.cleaned.length === best.cleaned.length && e.rows > best.rows)) best = e;
  }
  return best ? { table: best.table, sheet: best.sheet, column: best.column, segment: best.segment } : null;
}

/** Side-by-side comparison of every value of the mentioned dimension (weakest first). */
export function segmentComparisonQuery(mention: SegmentMention): { sql: string; categoryCol: string; valueCol: string; chartTitle: string } | null {
  const table = getQueryableTables().find(t => t.tableName === mention.table);
  if (!table) return null;
  const roles = assignRoles(table);
  const t = qi(table.tableName);
  const d = qi(mention.column);
  const unit = roles.unitNoun === 'leads' ? 'leads' : 'records';
  const parts = [d, `SUM(${roles.rowN}) AS ${unit}`];
  let valueCol = unit;
  if (roles.outcome) {
    const noun = roles.outcome.noun.replace(/\s+/g, '_');
    parts.push(`SUM(${roles.outcome.rowW}) AS ${noun}`);
    parts.push(`ROUND(100.0 * SUM(${roles.outcome.rowW}) / NULLIF(SUM(${roles.rowN}), 0), 1) AS ${noun}_rate_pct`);
    valueCol = `${noun}_rate_pct`;
  }
  if (roles.measure.isMoney && roles.measure.col) {
    parts.push(`SUM(${roles.measure.expr}) AS total_${roles.measure.col}`);
    if (!roles.outcome) valueCol = `total_${roles.measure.col}`;
  }
  if (roles.target) {
    parts.push(`ROUND(100.0 * SUM(${qi(roles.target.actualCol)}) / NULLIF(SUM(${qi(roles.target.targetCol)}), 0), 1) AS target_achievement_pct`);
    if (!roles.outcome) valueCol = 'target_achievement_pct';
  }
  return {
    sql: `SELECT ${parts.join(', ')} FROM ${t} WHERE ${d} IS NOT NULL GROUP BY ${d} ORDER BY "${valueCol}" ASC LIMIT 20`,
    categoryCol: mention.column,
    valueCol,
    chartTitle: `${businessLabel(mention.column)} comparison: ${businessLabel(valueCol)}`
  };
}
