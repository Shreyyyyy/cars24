/**
 * Assumed-data analyst: answers without any uploaded dataset or SQL. One LLM call per question,
 * with the analyst system prompt, the conversation so far and the accumulated fact ledger, so every
 * figure stays consistent across a chain of questions.
 *
 * The model's `chart` blocks become the chart/table payload the chat UI already renders, and its
 * `ledger` block is merged into the per-conversation ledger (never shown to the user).
 */

import { geminiService } from '../gemini-service';
import { validateUserInput, sanitizeModelOutput } from '../security';
import { getActiveOutputMode } from '../output-mode';
import { nodeStart, nodeEnd } from '../multi-agent/run-trace';
import { MultiAgentResponse } from '../multi-agent/types';
import { AnalysisSection, ChartConfig } from '@/types/chat';
import { logger } from '../logger';
import { buildAnalystSystemPrompt } from './system-prompt';
import type { BoundedOrchestrationRequest } from '../multi-agent/bounded-orchestrator';

const MAX_OUTPUT_TOKENS = { small: 5000, medium: 16000, large: 24000 } as const;
const ANSWER_TIMEOUT_MS = 150000;
/** Reasoning room to reconcile totals, counts and chart values against the table before writing */
const THINKING_BUDGET = { small: 2048, medium: 6144, large: 10240 } as const;
/** Ledger text re-injected per request; the oldest facts are dropped beyond this */
const MAX_LEDGER_CHARS = 120000;
const MAX_LEDGERS = 500;

// ---------------------------------------------------------------------------
// Fact ledger (per conversation, in process memory)
// ---------------------------------------------------------------------------

interface Ledger {
  entities: Record<string, any>[];
  facts: Record<string, any>[];
  definitions: Record<string, any>[];
}

const ledgers = new Map<string, Ledger>();

const entityKey = (e: any) => `${e?.type ?? ''}|${e?.id ?? e?.name ?? ''}`.toLowerCase();
const factKey = (f: any) =>
  [f?.metric, f?.definition, f?.entity, f?.grain, f?.period].map(v => String(v ?? '').toLowerCase()).join('|');
const definitionKey = (d: any) => String(d?.metric ?? '').toLowerCase();

/** Adds new items; an item already in the ledger keeps its first (canonical) value. */
function mergeInto(target: Record<string, any>[], items: unknown, key: (x: any) => string) {
  if (!Array.isArray(items)) return;
  const seen = new Set(target.map(key));
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    target.push(item as Record<string, any>);
  }
}

function getLedger(conversationId: string): Ledger {
  let ledger = ledgers.get(conversationId);
  if (!ledger) {
    ledger = { entities: [], facts: [], definitions: [] };
    ledgers.set(conversationId, ledger);
    if (ledgers.size > MAX_LEDGERS) {
      const oldest = ledgers.keys().next().value;
      if (oldest !== undefined) ledgers.delete(oldest);
    }
  }
  return ledger;
}

function serializeLedger(ledger: Ledger): string {
  const copy: Ledger = { entities: [...ledger.entities], facts: [...ledger.facts], definitions: [...ledger.definitions] };
  let text = JSON.stringify(copy);
  // Entities and definitions are small and must persist; old facts are also restated in the history
  while (text.length > MAX_LEDGER_CHARS && copy.facts.length > 0) {
    copy.facts.splice(0, Math.ceil(copy.facts.length / 10));
    text = JSON.stringify(copy);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Parsing the model's answer
// ---------------------------------------------------------------------------

interface ParsedChart {
  title: string;
  type: 'bar' | 'line' | 'pie';
  x: string;
  y: string;
  rows: Record<string, any>[];
  columns: string[];
}

function parseChart(raw: string): ParsedChart | null {
  try {
    const spec = JSON.parse(raw);
    const rows: Record<string, any>[] = Array.isArray(spec?.rows) ? spec.rows.filter((r: any) => r && typeof r === 'object') : [];
    if (rows.length === 0) return null;
    // `projected` marks forecast rows for drawing; it is not a data column
    const columns = Array.from(new Set(rows.flatMap(r => Object.keys(r)))).filter(c => c !== 'projected');
    const x = columns.includes(spec.x) ? spec.x : columns[0];
    const y = columns.includes(spec.y) ? spec.y : columns.find(c => c !== x && rows.some(r => typeof r[c] === 'number')) || columns[1];
    if (!x || !y) return null;
    // Numbers sometimes arrive formatted ("1,76,971", "12.4%"); the chart needs plain numbers
    for (const r of rows) {
      if (typeof r[y] === 'string') {
        const n = Number(r[y].replace(/[₹,%\s]/g, ''));
        if (!isNaN(n)) r[y] = n;
      }
    }
    return {
      title: String(spec.title || 'Analysis'),
      type: ['bar', 'line', 'pie'].includes(spec.type) ? spec.type : 'bar',
      x,
      y,
      rows,
      columns: [x, y, ...columns.filter(c => c !== x && c !== y)]
    };
  } catch {
    return null;
  }
}

/**
 * The reader sees a fixed vocabulary of top-level sections. Near-miss headings the model writes
 * ("Sentiment and cancellation trends") are mapped to it; anything else becomes a sub-heading.
 */
const SECTION_RULES: [RegExp, string][] = [
  [/headline|executive (brief|summary)|key takeaways/i, 'Headlines'],
  [/sentiment|voice of (the )?customer|feedback/i, 'Sentiment analysis'],
  [/basket|attach|bought together|cross-?sell/i, 'Basket analysis'],
  [/inventory|pricing|stock|days to sell|procurement quality/i, 'Inventory and pricing view'],
  [/priority customer|propensity|who to (target|reach)|target customers/i, 'Priority customers'],
  [/cluster|customer (group|segment)|segment/i, 'Cluster analysis'],
  [/root cause|drivers?\b|what drove|why /i, 'Root cause analysis'],
  [/\bhubs?\b|funnel|network|dealer/i, 'Hub and funnel view'],
  [/region|zone|geograph|state-wise|city/i, 'Regional view'],
  [/outlook|projection|forecast/i, 'Outlook (projected)'],
  [/financial|p&l|profit|revenue|value at stake|impact/i, 'Financial impact'],
  [/recommend|action|next steps|what to do/i, 'Recommended actions'],
  [/risk|watch-?outs/i, 'Risks'],
  [/snapshot|performance|summary|overview|scorecard/i, 'Performance snapshot']
];
const SECTION_NAMES = new Set(SECTION_RULES.map(([, name]) => name.toLowerCase()));

export function normalizeSections(answer: string): string {
  return answer.replace(/^##[ \t]+(.+?)[ \t]*$/gm, (line, title: string) => {
    const clean = title.replace(/[*_`]/g, '').trim();
    if (SECTION_NAMES.has(clean.toLowerCase())) return `## ${SECTION_RULES.find(([, n]) => n.toLowerCase() === clean.toLowerCase())![1]}`;
    const rule = SECTION_RULES.find(([re]) => re.test(clean));
    return rule ? `## ${rule[1]}` : `### ${clean}`;
  });
}

export function parseAnalystAnswer(text: string) {
  const charts: ParsedChart[] = [];
  let ledgerUpdate: any = null;

  let answer = text.replace(/```chart\s*\n([\s\S]*?)```/g, (_, body: string) => {
    const chart = parseChart(body.trim());
    if (chart) charts.push(chart);
    return '';
  });
  // The chat renders plain markdown, so LaTeX-style symbols become their characters
  const LATEX: Record<string, string> = { ge: '≥', geq: '≥', le: '≤', leq: '≤', times: '×', approx: '≈', pm: '±', rightarrow: '→', to: '→', neq: '≠', cdot: '·' };
  answer = answer
    .replace(/\$\\(ge|geq|le|leq|times|approx|pm|rightarrow|to|neq|cdot)\$/g, (_, k: string) => LATEX[k])
    .replace(/\\(ge|geq|le|leq|times|approx|pm|rightarrow|neq|cdot)\b/g, (_, k: string) => LATEX[k])
    .replace(/\$(\d[\d.,]*)\s*\\?%\$/g, '$1%');
  // Internal structure must never reach the reader
  answer = answer.replace(/```drilldown\s*\n[\s\S]*?```/g, '');
  const takeLedger = (_: string, body: string) => {
    try {
      ledgerUpdate = JSON.parse(body.trim());
    } catch {
      logger.warn('Analyst ledger block was not valid JSON; skipped');
    }
    return '';
  };
  // The model does not always use the fenced form: also accept <ledger>/<fact_ledger> tags,
  // a ```json block holding ledger JSON, and a heading such as "Ledger:" before any of them
  answer = answer.replace(/^[ \t]*(?:#+[ \t]*)?\**(?:fact[ _])?ledger\**:?[ \t]*$/gim, '');
  answer = answer.replace(/```ledger[^\n]*\n([\s\S]*?)```/gi, takeLedger);
  answer = answer.replace(/<(fact_ledger|ledger)>([\s\S]*?)<\/\1>/gi, (m, _t: string, body: string) => takeLedger(m, body));
  answer = answer.replace(/```(?:json)?[ \t]*\n(\s*\{\s*"(?:entities|facts|definitions)"[\s\S]*?)```/gi, takeLedger);
  // A truncated answer can end inside an unterminated block: never show it
  answer = answer.replace(/```(ledger|chart|drilldown)[\s\S]*$/i, '');
  answer = answer.replace(/<\/?(fact_ledger|ledger)>[\s\S]*$/i, '');
  answer = answer.replace(/\n\s*\{\s*"(?:entities|facts|definitions)"\s*:[\s\S]*$/, '');

  return { answer: normalizeSections(answer.replace(/\n{3,}/g, '\n\n').trim()), charts, ledgerUpdate };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function buildPrompt(query: string, history: { role: 'user' | 'assistant'; content: string }[], ledgerText: string): string {
  const turns = [...history];
  // The client may already include the current question as the last turn
  const last = turns[turns.length - 1];
  if (last && last.role === 'user' && last.content.trim() === query.trim()) turns.pop();

  const transcript = turns
    .map(t => `${t.role === 'user' ? 'USER' : 'ANALYST'}:\n${t.content}`)
    .join('\n\n---\n\n');

  return [
    `<fact_ledger>\n${ledgerText}\n</fact_ledger>`,
    transcript ? `<conversation_so_far>\n${transcript}\n</conversation_so_far>` : '<conversation_so_far>(none — this is the first question)</conversation_so_far>',
    `<current_question>\n${query}\n</current_question>`,
    'Answer the current question as the analyst, consistent with every figure in the fact ledger and the conversation so far.'
  ].join('\n\n');
}

export async function runAssumedDataAnalyst(
  request: BoundedOrchestrationRequest,
  correlationId: string
): Promise<MultiAgentResponse> {
  const start = performance.now();
  const elapsed = () => Math.round(performance.now() - start);
  const outputMode = getActiveOutputMode(request.outputMode);
  const conversationId = request.conversationId || `conv_${Date.now()}`;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const base = { version: '1.0' as const, conversationId, messageId };

  nodeStart('supervisor');
  const validation = validateUserInput(request.query);
  if (!validation.isValid) {
    nodeEnd('supervisor', 'failed', `Input rejected: ${validation.violationReason}`);
    return {
      ...base,
      intent: 'casual',
      status: 'error',
      answer: validation.violationReason || 'I could not process that request.',
      metadata: { latencyMs: elapsed(), cacheHit: false, model: 'security-guard', outputMode, correlationId }
    };
  }
  nodeEnd('supervisor', 'completed', 'Routed to analyst (assumed data)');

  const ledger = getLedger(conversationId);
  const prompt = buildPrompt(validation.sanitized, request.history || [], serializeLedger(ledger));

  nodeStart('marketing_advisor');
  const result = await geminiService.generateContentDetailed(prompt, {
    apiKey: request.apiKey,
    systemInstruction: buildAnalystSystemPrompt(outputMode),
    temperature: 0.4,
    maxOutputTokens: MAX_OUTPUT_TOKENS[outputMode],
    timeoutMs: ANSWER_TIMEOUT_MS,
    thinkingBudget: THINKING_BUDGET[outputMode],
    purpose: 'analyst_answer'
  });

  if (!result) {
    nodeEnd('marketing_advisor', 'failed', 'No model response');
    return {
      ...base,
      intent: 'analytics',
      status: 'error',
      answer: request.apiKey
        ? 'I could not complete that analysis just now. Please ask again.'
        : 'The analyst needs GEMINI_API_KEY to be configured on the server.',
      metadata: { latencyMs: elapsed(), cacheHit: false, model: 'none', outputMode, correlationId }
    };
  }

  const parsed = parseAnalystAnswer(result.text);
  if (parsed.ledgerUpdate) {
    mergeInto(ledger.entities, parsed.ledgerUpdate.entities, entityKey);
    mergeInto(ledger.facts, parsed.ledgerUpdate.facts, factKey);
    mergeInto(ledger.definitions, parsed.ledgerUpdate.definitions, definitionKey);
  }
  nodeEnd('marketing_advisor', 'completed',
    `${parsed.charts.length} chart(s); ledger now ${ledger.facts.length} facts, ${ledger.entities.length} entities`);

  const [primary, ...extra] = parsed.charts;
  const visualization: ChartConfig | undefined = primary
    ? { type: primary.type, title: primary.title, xKey: primary.x, yKey: primary.y }
    : undefined;
  const sections: AnalysisSection[] = extra.map(c => ({
    title: c.title,
    sql: '',
    rows: c.rows,
    columns: c.columns,
    categoryCol: c.x,
    valueCol: c.y,
    chartType: c.type
  }));

  nodeStart('answer');
  nodeEnd('answer', 'completed');

  return {
    ...base,
    intent: 'analytics',
    status: 'success',
    answer: sanitizeModelOutput(parsed.answer),
    data: primary?.rows,
    columns: primary?.columns,
    sections: sections.length ? sections : undefined,
    visualization,
    metadata: { latencyMs: elapsed(), cacheHit: false, model: result.model, outputMode, correlationId }
  };
}
