/**
 * EvidencePackage System for Enterprise Marketing Intelligence AI
 * Formulates typed provenance, metric definitions, query scope, calculation details,
 * freshness, data-quality warnings, and grounding validation.
 *
 * Confidence is derived from observable signals (SQL validation, SQL source, sample size,
 * numeric grounding of the narrative) and each deduction is explained in confidenceRationale.
 */

import { NumericGrounding } from './answer-facts';

export interface MetricDefinitionReference {
  metricId: string;
  metricName: string;
  officialFormula: string;
  businessOwner: string;
  version: string;
}

export interface QueryScope {
  entityType: 'showroom' | 'vehicle' | 'region' | 'state' | 'campaign' | 'network';
  entitiesSelected?: string[];
  statesFilter?: string[];
  channelsFilter?: ('ARENA' | 'NEXA')[];
  timePeriod?: string;
  comparisonPeriod?: string;
}

export interface SourceReference {
  sourceType: 'sqlite_wal' | 'postgres' | 'snowflake' | 'duckdb' | 'rag_knowledge_base' | 'uploaded_file';
  tableName: string;
  fileName?: string;
  recordCount: number;
  dataFreshnessTimestamp: string;
  checksum?: string;
}

export interface CalculationDetails {
  aggregationMethod: 'SUM' | 'AVG' | 'COUNT' | 'WEIGHTED_RATIO' | 'CUSTOM_FORMULA';
  sqlQueryExecuted: string;
  executionLatencyMs: number;
  rowCountReturned: number;
  deterministicPythonOrSql: boolean;
  sqlSource?: 'llm' | 'compiler';
}

export interface DataQualityWarning {
  code: 'NULL_VALUES_FILTERED' | 'OUTLIER_DETECTED' | 'SAMPLE_SIZE_SMALL' | 'TIME_GAP_DETECTED' | 'IMPUTED_VALUES' | 'UNVERIFIED_FIGURES' | 'RESULT_TRUNCATED';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedColumns?: string[];
}

export interface EvidencePackage {
  packageId: string;
  generatedAt: string;
  confidenceScore: number; // 0.0 to 1.0
  confidenceRationale: string[];
  isVerified: boolean;
  metricDefinitions: MetricDefinitionReference[];
  queryScope: QueryScope;
  sourceReferences: SourceReference[];
  calculationDetails: CalculationDetails;
  dataFreshness: {
    lastIngestedAt: string;
    isRealTimeOrSnapshot: 'real-time' | 'daily-batch' | 'uploaded-session';
  };
  dataQualityWarnings: DataQualityWarning[];
  limitations: string[];
  numericGrounding?: NumericGrounding;
  groundedClaims: {
    claimText: string;
    verifiedMetric: string;
    observedValue: string | number;
    benchmarkValue?: string | number;
    variance?: string;
  }[];
}

/** Stable, dependency-free content fingerprint (FNV-1a, 32-bit) of the returned rows. */
function fingerprint(value: unknown): string {
  const text = JSON.stringify(value) || '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function detectAggregation(sql: string): CalculationDetails['aggregationMethod'] {
  if (/\bSUM\s*\(/i.test(sql) && /\/|\*\s*100/.test(sql)) return 'WEIGHTED_RATIO';
  if (/\bSUM\s*\(/i.test(sql)) return 'SUM';
  if (/\bAVG\s*\(/i.test(sql)) return 'AVG';
  if (/\bCOUNT\s*\(/i.test(sql)) return 'COUNT';
  return 'CUSTOM_FORMULA';
}

export function buildEvidencePackage(params: {
  metricId?: string;
  metricName?: string;
  formula?: string;
  queryScope?: QueryScope;
  sourceTable?: string;
  fileName?: string;
  rowCount?: number;
  sqlQuery?: string;
  executionLatencyMs?: number;
  rows?: Record<string, any>[];
  warnings?: DataQualityWarning[];
  sqlValidated?: boolean;
  sqlSource?: 'llm' | 'compiler';
  numericGrounding?: NumericGrounding;
  lastIngestedAt?: string;
  resultLimit?: number;
}): EvidencePackage {
  const {
    metricId = 'METRIC_QUERY_RESULT',
    metricName = 'Query Result',
    queryScope = { entityType: 'showroom' },
    sourceTable = 'uploaded_data',
    fileName,
    rowCount = 0,
    sqlQuery = '',
    executionLatencyMs = 0,
    rows = [],
    warnings = [],
    sqlValidated = rowCount > 0,
    sqlSource,
    numericGrounding,
    lastIngestedAt,
    resultLimit = 100
  } = params;
  const formula = params.formula || sqlQuery || 'n/a';

  // Claims: the first row's numeric values, labelled by its first text column
  const claims: EvidencePackage['groundedClaims'] = [];
  if (rows.length > 0) {
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    const labelKey = keys.find(k => typeof firstRow[k] === 'string');
    const label = labelKey ? String(firstRow[labelKey]) : 'Result';
    for (const k of keys) {
      if (typeof firstRow[k] === 'number' && claims.length < 4) {
        claims.push({
          claimText: `${label}: ${k.replace(/_/g, ' ')} = ${firstRow[k]}`,
          verifiedMetric: k,
          observedValue: firstRow[k]
        });
      }
    }
  }

  // Data-quality warnings
  const derivedWarnings: DataQualityWarning[] = [...warnings];
  if (rowCount > 0 && rowCount < 3) {
    derivedWarnings.push({
      code: 'SAMPLE_SIZE_SMALL',
      severity: 'medium',
      message: `Only ${rowCount} result row(s); comparisons across groups are limited.`
    });
  }
  if (rowCount >= resultLimit) {
    derivedWarnings.push({
      code: 'RESULT_TRUNCATED',
      severity: 'medium',
      message: `Result capped at ${resultLimit} rows; shares are relative to the rows returned.`
    });
  }
  if (numericGrounding && numericGrounding.unverified.length > 0) {
    derivedWarnings.push({
      code: 'UNVERIFIED_FIGURES',
      severity: numericGrounding.score < 0.7 ? 'high' : 'medium',
      message: `Figures not traceable to query results: ${numericGrounding.unverified.join(', ')}`
    });
  }

  // Confidence: start from what was verified, deduct for each observable weakness
  const rationale: string[] = [];
  let confidence: number;
  if (rowCount === 0) {
    confidence = 0.3;
    rationale.push('No rows returned, so the answer is not data-backed.');
  } else {
    confidence = sqlValidated ? 0.95 : 0.6;
    rationale.push(sqlValidated ? 'SQL passed read-only and table-scope validation.' : 'SQL could not be fully validated.');
    if (sqlSource === 'compiler') {
      confidence -= 0.1;
      rationale.push('Used template SQL fallback, which may interpret the question more broadly (-0.10).');
    }
    if (rowCount < 3) {
      confidence -= 0.05;
      rationale.push('Small result set (-0.05).');
    }
    if (numericGrounding && numericGrounding.checked > 0) {
      confidence *= numericGrounding.score;
      rationale.push(
        `${numericGrounding.matched}/${numericGrounding.checked} figures in the narrative matched query results` +
          (numericGrounding.score < 1 ? ` (x${numericGrounding.score}).` : '.')
      );
    }
  }
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  const limitations = [
    'Based only on the uploaded dataset as of its ingestion time; no external market data.'
  ];
  if (!rows.some(r => Object.keys(r).some(k => /date|month|period|year|week|_at$/i.test(k)))) {
    limitations.push('No time dimension in this result, so it cannot show trends or causes of change.');
  }
  if (Object.keys(rows[0] || {}).some(k => /price|inr|revenue|sales_value/i.test(k))) {
    limitations.push('Monetary values are ex-showroom as recorded; taxes, RTO and discounts are excluded unless present in the data.');
  }

  const nowIso = new Date().toISOString();
  return {
    packageId: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    generatedAt: nowIso,
    confidenceScore: confidence,
    confidenceRationale: rationale,
    isVerified: rowCount > 0 && sqlValidated,
    metricDefinitions: [
      {
        metricId,
        metricName,
        officialFormula: formula,
        businessOwner: 'Marketing BI',
        version: 'query-derived'
      }
    ],
    queryScope,
    sourceReferences: [
      {
        sourceType: 'sqlite_wal',
        tableName: sourceTable,
        fileName,
        recordCount: rowCount,
        dataFreshnessTimestamp: lastIngestedAt || nowIso,
        checksum: fingerprint(rows)
      }
    ],
    calculationDetails: {
      aggregationMethod: detectAggregation(sqlQuery),
      sqlQueryExecuted: sqlQuery,
      executionLatencyMs,
      rowCountReturned: rowCount,
      deterministicPythonOrSql: true,
      sqlSource
    },
    dataFreshness: {
      lastIngestedAt: lastIngestedAt || nowIso,
      isRealTimeOrSnapshot: 'uploaded-session'
    },
    dataQualityWarnings: derivedWarnings,
    limitations,
    numericGrounding,
    groundedClaims: claims
  };
}
