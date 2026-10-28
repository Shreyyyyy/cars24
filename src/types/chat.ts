/**
 * Production-Ready Unified Response & Chat Types for the CARS24 Marketing AI Assistant
 */

export type IntentType =
  | 'casual'
  | 'general_nlp'
  | 'analytics'
  | 'rag'
  | 'diagnostic'
  | 'growth'
  | 'clarification';

export type ResponseStatus = 'success' | 'clarification' | 'partial' | 'error';

export interface ChartConfig {
  type: 'bar' | 'pie' | 'line' | 'table' | 'none';
  title: string;
  xKey: string;
  yKey?: string;
  series?: { key: string; label: string; color?: string }[];
}

export interface RAGSourceChunk {
  id: string;
  category: 'schema_metadata' | 'marketing_playbook' | 'dealership_benchmark' | 'regional_pattern' | 'data_aggregate';
  title: string;
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface DiagnosticRootCause {
  category: string;
  finding: string;
  impact: string;
  evidence: string;
  isHypothesis?: boolean;
}

export interface TurnaroundPhase {
  phase: string;
  timeframe: string;
  title: string;
  actionItems: string[];
  expectedOutcome: string;
  responsibleRole?: string;
  targetKpi?: string;
}

export interface DiagnosticPayload {
  subjectName: string;
  subjectType: 'showroom' | 'vehicle' | 'region' | 'channel';
  severityLevel: 'Critical' | 'High' | 'Moderate' | 'Low';
  overallAssessment: string;
  observedFacts: string[];
  potentialExplanations: DiagnosticRootCause[];
  turnaroundPlaybook: TurnaroundPhase[];
  assumptionsAndLimitations: string[];
  projectedRecovery?: {
    unitsLift: string;
    revenueUplift: string;
    timeline: string;
    confidenceScore: string;
    isScenarioEstimate: boolean;
  };
}

export interface ResponseMetadata {
  datasetVersion?: string;
  latencyMs: number;
  dbLatencyMs?: number;
  cacheHit: boolean;
  model: string;
  outputMode?: string;
  correlationId: string;
  confidenceScore?: number;
  intentConfidence?: number;
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

/** Headline number shown as a tile above the answer */
export interface KeyMetric {
  label: string;
  value: string;
  note?: string;
}

/** Backtracking: where an answer's numbers came from */
export interface LineageTable {
  table: string;
  sheet: string;
  range?: string;
  rows: number;
  verified?: boolean;
  columns: string[];
}

export interface Lineage {
  tablesUsed: LineageTable[];
  /** Every table in the upload, all of which were described to the model before it chose */
  tablesAvailable: number;
  joins: { left: string; right: string; matchPct?: number; status?: string }[];
  queries: string[];
}

/** One part of a multi-part answer: its own validated query and result table */
export interface AnalysisSection {
  title: string;
  sql: string;
  rows: Record<string, any>[];
  columns: string[];
  categoryCol: string;
  valueCol: string;
  chartType: 'bar' | 'pie' | 'line';
}

export interface UnifiedAssistantResponse {
  version: '1.0';
  conversationId: string;
  messageId: string;
  intent: IntentType;
  status: ResponseStatus;
  answer: string;
  summary?: string;
  insights?: string[];
  recommendations?: string[];
  data?: Record<string, any>[];
  columns?: string[];
  /** Result tables for the other parts of a multi-part question */
  sections?: AnalysisSection[];
  /** Parts of the question the data cannot answer, with the reason */
  missingData?: string[];
  /** Assumptions made when querying (e.g. the date an "as of" was mapped to) */
  assumptions?: string;
  visualization?: ChartConfig;
  sources?: RAGSourceChunk[];
  sql?: {
    query: string;
    explanation: string;
    executionTimeMs?: number;
    rowCount?: number;
  } | null;
  diagnostics?: DiagnosticPayload | null;
  clarificationOptions?: string[];
  keyMetrics?: KeyMetric[];
  followUps?: string[];
  evidencePackage?: any;
  agentExecutionPlan?: any;
  detectedLanguage?: string;
  lineage?: Lineage;
  metadata: ResponseMetadata;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  content: string;
  responsePayload?: UnifiedAssistantResponse;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ConversationTurn[];
  contextState: {
    lastEntity?: string;
    lastEntityType?: 'showroom' | 'vehicle' | 'region' | 'state' | 'channel' | 'fuel' | 'network';
    lastMetric?: string;
    lastTimeframe?: string;
    datasetVersion?: string;
    lastFilterCity?: string;
    lastFilterModel?: string;
    lastFilterChannel?: string;
    lastFilterFuel?: string;
    lastFilterNetwork?: string;
    lastSqlQuery?: string;
    lastSummary?: string;
  };
}
