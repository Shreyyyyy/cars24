/**
 * Multi-Agent System Types for Maruti Suzuki Marketing Intelligence AI
 */

import { RunTrace } from './run-graph';
import { UnifiedAssistantResponse, IntentType, DiagnosticPayload, RAGSourceChunk } from '@/types/chat';

export interface AgentStep {
  agentId: 'supervisor' | 'cartographer' | 'entity_resolver' | 'recovery' | 'conversation' | 'rag_knowledge' | 'data_analyst' | 'marketing_advisor' | 'critic';
  agentName: string;
  role: string;
  status: 'completed' | 'skipped' | 'executing';
  thoughtProcess: string;
  actionTaken: string;
  outputSummary: string;
  latencyMs: number;
}

export interface MultiAgentExecutionPlan {
  userQuery: string;
  resolvedQuery: string;
  intent: IntentType;
  extractedEntities: {
    dealerships?: string[];
    models?: string[];
    fuelTypes?: string[];
    regions?: string[];
    channels?: string[];
    metrics?: string[];
  };
  steps: AgentStep[];
  totalLatencyMs: number;
}

export interface MultiAgentResponse extends UnifiedAssistantResponse {
  agentExecutionPlan?: MultiAgentExecutionPlan;
  /** This question's path through the agent graph, with time, tokens and cost (developer view) */
  runTrace?: RunTrace;
}
