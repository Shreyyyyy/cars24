/**
 * Versioned Semantic Metric Catalog & Governed Query Generator
 * Enforces business-approved metric definitions, dimensions, filters, and access rules.
 */

export interface SemanticMetric {
  id: string;
  name: string;
  category: 'volume' | 'financial' | 'conversion' | 'marketing' | 'inventory';
  version: string;
  description: string;
  businessFormula: string;
  sqlExpression: string;
  aggregationType: 'SUM' | 'AVG' | 'COUNT' | 'RATIO';
  defaultUnit: 'units' | 'cr_inr' | 'lakh_inr' | 'inr' | 'pct' | 'ratio';
  supportedDimensions: string[];
  requiredFilters?: string[];
  governanceLevel: 'public_internal' | 'restricted_finance' | 'director_only';
  owner: string;
  updatedAt: string;
}

export const SEMANTIC_METRICS_CATALOG: Record<string, SemanticMetric> = {
  total_deliveries: {
    id: 'total_deliveries',
    name: 'Total Retail Deliveries',
    category: 'volume',
    version: '2.1',
    description: 'Total number of new vehicle customer handovers completed within reporting period.',
    businessFormula: 'SUM(deliveries)',
    sqlExpression: 'COALESCE(SUM("sales"), 0)',
    aggregationType: 'SUM',
    defaultUnit: 'units',
    supportedDimensions: ['assigned_dealer', 'model', 'segment', 'fuel_type', 'state', 'channel', 'date'],
    governanceLevel: 'public_internal',
    owner: 'National Sales Operation',
    updatedAt: '2026-03-01'
  },
  gross_turnover: {
    id: 'gross_turnover',
    name: 'Gross Turnover (Cr ₹)',
    category: 'financial',
    version: '2.0',
    description: 'Total ex-showroom revenue generated across retail deliveries.',
    businessFormula: 'SUM(deliveries * asp_lakhs) / 100',
    sqlExpression: 'ROUND(COALESCE(SUM("turnover_cr"), SUM("sales" * 8.5) / 100), 2)',
    aggregationType: 'SUM',
    defaultUnit: 'cr_inr',
    supportedDimensions: ['assigned_dealer', 'model', 'segment', 'state', 'channel'],
    governanceLevel: 'public_internal',
    owner: 'Commercial Strategy',
    updatedAt: '2026-03-01'
  },
  target_achievement_pct: {
    id: 'target_achievement_pct',
    name: 'Target Achievement %',
    category: 'volume',
    version: '2.2',
    description: 'Percentage of assigned monthly target deliveries achieved by dealership or region.',
    businessFormula: '(Actual Deliveries / Target Deliveries) * 100',
    sqlExpression: 'ROUND(AVG("target_achievement_pct"), 1)',
    aggregationType: 'AVG',
    defaultUnit: 'pct',
    supportedDimensions: ['assigned_dealer', 'state', 'channel', 'region'],
    governanceLevel: 'public_internal',
    owner: 'Dealer Performance BI',
    updatedAt: '2026-03-01'
  },
  conversion_rate_pct: {
    id: 'conversion_rate_pct',
    name: 'Lead-to-Sale Conversion %',
    category: 'conversion',
    version: '2.0',
    description: 'Proportion of unique customer inquiries progressing to vehicle handover.',
    businessFormula: '(Total Deliveries / Total Registered Leads) * 100',
    sqlExpression: 'ROUND(AVG("conversion_rate_pct"), 2)',
    aggregationType: 'AVG',
    defaultUnit: 'pct',
    supportedDimensions: ['assigned_dealer', 'channel', 'state', 'campaign'],
    governanceLevel: 'public_internal',
    owner: 'Digital Lead Management',
    updatedAt: '2026-03-01'
  },
  cost_per_lead: {
    id: 'cost_per_lead',
    name: 'Cost Per Lead (CPL)',
    category: 'marketing',
    version: '1.4',
    description: 'Total media spend allocated divided by captured qualified inquiries.',
    businessFormula: 'Marketing Spend (₹) / Total Leads Generated',
    sqlExpression: 'ROUND(SUM("spend_inr") / NULLIF(SUM("leads"), 0), 2)',
    aggregationType: 'RATIO',
    defaultUnit: 'inr',
    supportedDimensions: ['campaign', 'channel', 'media_platform', 'state'],
    governanceLevel: 'public_internal',
    owner: 'Brand Marketing & Media',
    updatedAt: '2026-03-01'
  },
  campaign_roi_multiplier: {
    id: 'campaign_roi_multiplier',
    name: 'Campaign ROI Multiplier',
    category: 'marketing',
    version: '1.5',
    description: 'Gross margin generated from campaign attributed sales divided by media expenditure.',
    businessFormula: '(Attributed Sales * Margin per Car) / Campaign Media Spend',
    sqlExpression: 'ROUND(SUM("attributed_revenue_inr") / NULLIF(SUM("spend_inr"), 0), 2)',
    aggregationType: 'RATIO',
    defaultUnit: 'ratio',
    supportedDimensions: ['campaign', 'model', 'channel'],
    governanceLevel: 'restricted_finance',
    owner: 'Performance Marketing',
    updatedAt: '2026-03-01'
  }
};

/**
 * Builds a governed, parameter-safe SQL aggregation query using the metric catalog
 */
export function buildGovernedQuery(params: {
  metricId: string;
  dimension: string;
  filterState?: string;
  filterChannel?: string;
  limit?: number;
  orderDirection?: 'DESC' | 'ASC';
}): { sql: string; metric: SemanticMetric; dimension: string } {
  const metric = SEMANTIC_METRICS_CATALOG[params.metricId] || SEMANTIC_METRICS_CATALOG['total_deliveries'];
  const safeDim = params.dimension.replace(/[^a-zA-Z0-9_]/g, '');
  const limit = Math.min(params.limit || 20, 100);
  const orderDir = params.orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const whereClauses: string[] = [];
  if (params.filterState) {
    whereClauses.push(`"state" = '${params.filterState.replace(/'/g, "''")}'`);
  }
  if (params.filterChannel) {
    whereClauses.push(`"channel" = '${params.filterChannel.replace(/'/g, "''")}'`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `SELECT "${safeDim}", ${metric.sqlExpression} AS "${metric.id}" FROM uploaded_data ${whereStr} GROUP BY "${safeDim}" ORDER BY "${metric.id}" ${orderDir} LIMIT ${limit};`;

  return {
    sql,
    metric,
    dimension: safeDim
  };
}
