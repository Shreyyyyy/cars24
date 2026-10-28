/**
 * Validation shared by the JSON and streaming query endpoints: rate limit, body shape and history.
 */

import { NextRequest } from 'next/server';
import { checkRateLimit } from './rate-limit';
import { BoundedOrchestrationRequest } from './multi-agent/bounded-orchestrator';
import { validateUserInput } from './security';

const MAX_QUESTION_LENGTH = 2000;
const MAX_CONVERSATION_ID_LENGTH = 128;
const MAX_ASSISTANT_TURN_LENGTH = 20000;

export type ParsedQueryRequest =
  | { ok: true; request: BoundedOrchestrationRequest }
  | { ok: false; status: number; error: string; headers?: Record<string, string> };

export async function parseQueryRequest(req: NextRequest): Promise<ParsedQueryRequest> {
  const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.ip || 'unknown';
  const limit = checkRateLimit(`query:${clientIp}`);
  if (!limit.allowed) {
    return { ok: false, status: 429, error: 'Too many requests. Please retry shortly.', headers: { 'Retry-After': String(limit.retryAfterSeconds) } };
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return { ok: false, status: 400, error: 'Request body must be valid JSON' };
  }

  const { question, conversationId, history, chatHistory, mode, outputMode, useCache, enableCache, cache } = body || {};

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return { ok: false, status: 400, error: 'Question is required and must be a non-empty string' };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, status: 400, error: `Question exceeds ${MAX_QUESTION_LENGTH} characters` };
  }
  if (conversationId !== undefined && (typeof conversationId !== 'string' || conversationId.length > MAX_CONVERSATION_ID_LENGTH)) {
    return { ok: false, status: 400, error: 'Invalid conversationId' };
  }

  const rawHistory = Array.isArray(chatHistory) ? chatHistory : (Array.isArray(history) ? history : undefined);
  // History comes from the client, so earlier user turns pass the same guardrails as the question
  // (an injected or abusive turn is dropped rather than fed back to the model).
  // Assistant turns are kept long: their tables are the figures later answers must stay consistent with.
  const validatedHistory = rawHistory?.filter(
    (h: any) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' &&
      (h.role !== 'user' || validateUserInput(String(h.content).slice(0, MAX_QUESTION_LENGTH)).isValid)
  ).map((h: any) => ({
    role: h.role as 'user' | 'assistant',
    content: String(h.content).slice(0, h.role === 'user' ? MAX_QUESTION_LENGTH : MAX_ASSISTANT_TURN_LENGTH)
  }));

  // Row-level security scope must come from a trusted auth layer (e.g. SSO session),
  // never from the request body. Until auth is wired in, queries run with global scope.
  const resolvedCachePreference = useCache !== undefined ? useCache : (enableCache !== undefined ? enableCache : cache);

  return {
    ok: true,
    request: {
      query: question,
      conversationId,
      history: validatedHistory,
      // The AI key is server-managed only; client-supplied keys are ignored by design.
      apiKey: process.env.GEMINI_API_KEY,
      outputMode: outputMode || mode,
      useCache: resolvedCachePreference
    }
  };
}
