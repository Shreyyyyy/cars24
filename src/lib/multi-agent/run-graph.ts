/**
 * Agent run graph: the shape of the bounded pipeline and the events one question produces while it
 * walks through it. Shared by the server (which records and persists runs) and the developer panel in
 * the chat UI (which replays the same events live), so both build the run with the same reducer.
 *
 * No Node-only imports here: this file is bundled into the browser.
 */

export type RunNodeId =
  | 'input'
  | 'supervisor'
  | 'security_block'
  | 'context_resolver'
  | 'cartographer'
  | 'semantic_cache'
  | 'growth_analyst'
  | 'growth_advisor'
  | 'rag_knowledge'
  | 'entity_resolver'
  | 'data_analyst'
  | 'recovery'
  | 'marketing_advisor'
  | 'critic'
  | 'conversation'
  | 'answer';

export interface RunGraphNode {
  id: RunNodeId;
  label: string;
  /** Layout cell in the developer graph (columns flow left to right) */
  col: number;
  row: number;
  llm?: boolean;
}

export interface RunGraphEdge {
  from: RunNodeId;
  to: RunNodeId;
  label?: string;
  /** Drawn only when a run actually takes it (keeps rare long edges from cluttering the map) */
  onlyWhenTaken?: boolean;
}

export const RUN_GRAPH_NODES: RunGraphNode[] = [
  { id: 'input', label: 'Question', col: 0, row: 1 },
  { id: 'supervisor', label: 'Supervisor', col: 1, row: 1 },
  { id: 'security_block', label: 'Security block', col: 1, row: 0 },
  { id: 'context_resolver', label: 'Follow-up resolver', col: 1, row: 2, llm: true },
  { id: 'cartographer', label: 'Data cartographer', col: 2, row: 1 },
  { id: 'semantic_cache', label: 'Semantic cache', col: 3, row: 1 },
  { id: 'growth_analyst', label: 'Growth analyst', col: 4, row: 0 },
  { id: 'growth_advisor', label: 'Growth advisor', col: 5, row: 0, llm: true },
  { id: 'rag_knowledge', label: 'RAG retrieval', col: 4, row: 1 },
  { id: 'entity_resolver', label: 'Entity resolver', col: 5, row: 1 },
  { id: 'data_analyst', label: 'Data analyst (SQL)', col: 6, row: 1, llm: true },
  { id: 'recovery', label: 'Query recovery', col: 6, row: 2, llm: true },
  { id: 'marketing_advisor', label: 'Marketing advisor', col: 7, row: 1, llm: true },
  { id: 'critic', label: 'Critic', col: 8, row: 1 },
  { id: 'conversation', label: 'Conversation agent', col: 6, row: 3, llm: true },
  { id: 'answer', label: 'Answer', col: 9, row: 1 }
];

export const RUN_GRAPH_EDGES: RunGraphEdge[] = [
  { from: 'input', to: 'supervisor' },
  { from: 'supervisor', to: 'security_block', label: 'blocked' },
  { from: 'security_block', to: 'answer', onlyWhenTaken: true },
  { from: 'supervisor', to: 'context_resolver', label: 'follow-up' },
  { from: 'context_resolver', to: 'supervisor' },
  { from: 'supervisor', to: 'cartographer' },
  { from: 'supervisor', to: 'conversation', label: 'chat', onlyWhenTaken: true },
  { from: 'supervisor', to: 'semantic_cache', onlyWhenTaken: true },
  { from: 'cartographer', to: 'conversation', label: 'chat / vague' },
  { from: 'cartographer', to: 'semantic_cache' },
  { from: 'semantic_cache', to: 'answer', label: 'hit' },
  { from: 'semantic_cache', to: 'growth_analyst', label: 'growth' },
  { from: 'growth_analyst', to: 'growth_advisor' },
  { from: 'growth_analyst', to: 'conversation', onlyWhenTaken: true },
  { from: 'growth_advisor', to: 'answer' },
  { from: 'semantic_cache', to: 'rag_knowledge' },
  { from: 'rag_knowledge', to: 'conversation', label: 'concept' },
  { from: 'rag_knowledge', to: 'entity_resolver' },
  { from: 'rag_knowledge', to: 'data_analyst', onlyWhenTaken: true },
  { from: 'entity_resolver', to: 'data_analyst' },
  { from: 'data_analyst', to: 'recovery', label: 'retry' },
  { from: 'recovery', to: 'data_analyst' },
  { from: 'data_analyst', to: 'marketing_advisor' },
  { from: 'marketing_advisor', to: 'critic' },
  { from: 'critic', to: 'answer' },
  { from: 'critic', to: 'conversation', label: 'no rows' },
  { from: 'conversation', to: 'answer' }
];

export function runNodeLabel(id: RunNodeId): string {
  return RUN_GRAPH_NODES.find(n => n.id === id)?.label || id;
}

export type RunNodeStatus = 'running' | 'completed' | 'skipped' | 'failed';

export interface RunLLMCall {
  node: RunNodeId | null;
  purpose: string;
  model: string;
  status: 'ok' | 'timeout' | 'error';
  latencyMs: number;
  inputTokens: number;
  /** Visible output plus thinking tokens (both billed as output) */
  outputTokens: number;
  cachedTokens: number;
  /** Null when the model has no price configured */
  costUsd: number | null;
  atMs: number;
}

export interface RunSQL {
  node: RunNodeId | null;
  sql: string;
  rows?: number;
  ms?: number;
  error?: string;
  atMs: number;
}

export interface RunNodeVisit {
  id: RunNodeId;
  label: string;
  /** Order in which the node was entered (1-based) */
  order: number;
  via?: string;
  startMs: number;
  endMs?: number;
  status: RunNodeStatus;
  summary?: string;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface RunEdge {
  from: RunNodeId;
  to: RunNodeId;
  label?: string;
  order: number;
}

export type RunEvent =
  | { type: 'run_start'; correlationId: string; question: string; startedAt: string }
  | { type: 'node_start'; node: RunNodeId; atMs: number; via?: string }
  | { type: 'node_end'; node: RunNodeId; atMs: number; status: RunNodeStatus; summary?: string }
  | { type: 'llm_call'; call: RunLLMCall }
  | { type: 'sql'; sql: RunSQL }
  | {
      type: 'run_end';
      atMs: number;
      status: string;
      intent?: string;
      model?: string;
      resolvedQuery?: string;
      conversationId?: string;
      messageId?: string;
      cacheHit?: boolean;
      dbMs?: number;
    };

/** A whole run: what the developer panel draws and what is saved in `agent_runs`. */
export interface RunTrace {
  version: 1;
  correlationId: string;
  conversationId?: string;
  messageId?: string;
  question: string;
  resolvedQuery?: string;
  intent?: string;
  status: string;
  model?: string;
  /** ISO wall-clock time the question arrived */
  startedAt: string;
  totalMs: number;
  llmMs: number;
  dbMs: number;
  cacheHit: boolean;
  llmCallCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  unpricedCalls: number;
  nodes: RunNodeVisit[];
  edges: RunEdge[];
  llmCalls: RunLLMCall[];
  sqls: RunSQL[];
  /** Nodes currently executing, innermost last (a node may run inside another, e.g. recovery in the SQL agent) */
  active: RunNodeId[];
  /** The node the next top-level stage is entered from */
  lastNode: RunNodeId;
  finished: boolean;
}

export function emptyRun(correlationId: string, question: string, startedAt: string): RunTrace {
  return {
    version: 1, correlationId, question, startedAt, status: 'running',
    totalMs: 0, llmMs: 0, dbMs: 0, cacheHit: false,
    llmCallCount: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, unpricedCalls: 0,
    nodes: [{ id: 'input', label: runNodeLabel('input'), order: 1, startMs: 0, endMs: 0, status: 'completed', summary: question.slice(0, 200), llmCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }],
    edges: [], llmCalls: [], sqls: [], active: [], lastNode: 'input', finished: false
  };
}

/** The latest visit of a node that is still running, else its latest visit. */
function visitOf(run: RunTrace, id: RunNodeId): RunNodeVisit | undefined {
  for (let i = run.nodes.length - 1; i >= 0; i--) {
    if (run.nodes[i].id === id && run.nodes[i].status === 'running') return run.nodes[i];
  }
  for (let i = run.nodes.length - 1; i >= 0; i--) if (run.nodes[i].id === id) return run.nodes[i];
  return undefined;
}

/** Applies one event to a run in place and returns it. */
export function applyRunEvent(run: RunTrace, e: RunEvent): RunTrace {
  switch (e.type) {
    case 'run_start':
      return emptyRun(e.correlationId, e.question, e.startedAt);
    case 'node_start': {
      const from = run.active[run.active.length - 1] || run.lastNode;
      run.edges.push({ from, to: e.node, label: e.via, order: run.edges.length + 1 });
      run.nodes.push({
        id: e.node, label: runNodeLabel(e.node), order: run.nodes.length + 1, via: e.via,
        startMs: e.atMs, status: 'running', llmCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0
      });
      run.active.push(e.node);
      run.totalMs = Math.max(run.totalMs, e.atMs);
      break;
    }
    case 'node_end': {
      const idx = run.active.lastIndexOf(e.node);
      if (idx === -1) break;
      run.active.splice(idx, 1);
      const visit = visitOf(run, e.node);
      if (visit) {
        visit.endMs = e.atMs;
        visit.status = e.status;
        if (e.summary) visit.summary = e.summary;
      }
      const parent = run.active[run.active.length - 1];
      // A nested stage hands control back to the stage that called it
      if (parent) run.edges.push({ from: e.node, to: parent, order: run.edges.length + 1 });
      else run.lastNode = e.node;
      run.totalMs = Math.max(run.totalMs, e.atMs);
      break;
    }
    case 'llm_call': {
      const c = e.call;
      run.llmCalls.push(c);
      run.llmCallCount += 1;
      run.llmMs += c.latencyMs;
      run.inputTokens += c.inputTokens;
      run.outputTokens += c.outputTokens;
      if (c.costUsd !== null) run.costUsd = Math.round((run.costUsd + c.costUsd) * 1e8) / 1e8;
      else if (c.inputTokens || c.outputTokens) run.unpricedCalls += 1;
      const visit = c.node ? visitOf(run, c.node) : undefined;
      if (visit) {
        visit.llmCalls += 1;
        visit.inputTokens += c.inputTokens;
        visit.outputTokens += c.outputTokens;
        if (c.costUsd !== null) visit.costUsd = Math.round((visit.costUsd + c.costUsd) * 1e8) / 1e8;
      }
      break;
    }
    case 'sql':
      run.sqls.push(e.sql);
      break;
    case 'run_end': {
      // Anything still open was abandoned by an early return
      for (const id of [...run.active].reverse()) {
        const visit = visitOf(run, id);
        if (visit && visit.status === 'running') { visit.status = 'completed'; visit.endMs = e.atMs; }
      }
      if (run.active.length) run.lastNode = run.active[run.active.length - 1];
      run.active = [];
      run.edges.push({ from: run.lastNode, to: 'answer', label: e.status, order: run.edges.length + 1 });
      run.nodes.push({
        id: 'answer', label: runNodeLabel('answer'), order: run.nodes.length + 1, startMs: e.atMs, endMs: e.atMs,
        status: e.status === 'error' ? 'failed' : 'completed', summary: e.intent ? `intent ${e.intent}` : undefined,
        llmCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0
      });
      run.lastNode = 'answer';
      run.status = e.status;
      run.intent = e.intent;
      run.model = e.model;
      run.resolvedQuery = e.resolvedQuery;
      run.conversationId = e.conversationId;
      run.messageId = e.messageId;
      run.cacheHit = Boolean(e.cacheHit);
      run.dbMs = e.dbMs ?? 0;
      run.totalMs = e.atMs;
      run.finished = true;
      break;
    }
  }
  return run;
}

export function buildRunFromEvents(events: RunEvent[]): RunTrace | null {
  const start = events.find(e => e.type === 'run_start');
  if (!start || start.type !== 'run_start') return null;
  const run = emptyRun(start.correlationId, start.question, start.startedAt);
  for (const e of events) if (e.type !== 'run_start') applyRunEvent(run, e);
  return run;
}
