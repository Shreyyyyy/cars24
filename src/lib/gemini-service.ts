/**
 * Gemini LLM call layer: circuit breaker, model fallbacks, timeouts, context caching, cost and latency tracking
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import { recordLLMCost, usageFromResponse } from './cost-tracker';
import { recordLLMTiming } from './latency-tracker';
import { cachedContentFor, invalidateContextCache, isCacheError } from './gemini-context-cache';

export interface LLMRequestOptions {
  apiKey?: string;
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json' | 'text/plain';
  /** Stable context (persona, data dictionary) sent as the model's system instruction */
  systemInstruction?: string;
  /** What the call is for (sql_generation, synthesis, ...), for cost and latency tracking */
  purpose?: string;
  /** Reasoning tokens the model may spend before answering (default: none on flash tiers) */
  thinkingBudget?: number;
}

export interface LLMResult {
  text: string;
  model: string;
}

import { getActiveGeminiModel } from './model-config';

class GeminiService {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_MS = 30000; // 30s reset
  private activeWorkingModel: string | null = null;

  // Latency-ordered: configured environment model first, followed by fast flash tiers
  private readonly CANDIDATE_MODELS = Array.from(new Set([
    getActiveGeminiModel(),
    ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
    ...(process.env.NEXT_PUBLIC_GEMINI_MODEL ? [process.env.NEXT_PUBLIC_GEMINI_MODEL] : []),
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro'
  ]));

  private isCircuitOpen(): boolean {
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      if (Date.now() - this.lastFailureTime > this.CIRCUIT_RESET_MS) {
        // Half-open: allow a trial request
        this.failureCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess(modelUsed?: string) {
    this.failureCount = 0;
    if (modelUsed) {
      this.activeWorkingModel = modelUsed;
    }
  }

  private recordFailure(err: any) {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    logger.warn(`Gemini LLM failure recorded (count: ${this.failureCount}): ${err?.message || err}`);
  }

  /**
   * Safe content generation with candidate model fallback & temperature budget
   */
  async generateContent(
    prompt: string,
    options: LLMRequestOptions = {}
  ): Promise<string | null> {
    const result = await this.generateContentDetailed(prompt, options);
    return result ? result.text : null;
  }

  async generateContentDetailed(
    prompt: string,
    options: LLMRequestOptions = {}
  ): Promise<LLMResult | null> {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length < 6) {
      return null; // No key provided, caller will use business engine
    }

    if (this.isCircuitOpen()) {
      logger.warn('Gemini circuit breaker is OPEN. Skipping remote call and using business engine fallback.');
      return null;
    }

    // One deadline for the whole call: a timeout on one model must not restart the clock on the next
    const deadline = Date.now() + (options.timeoutMs || 18000);
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    // The configured model (GEMINI_MODEL) is always tried first; fallbacks only cover a failed call.
    // (Starting from whichever fallback last answered would silently switch every later call to it.)
    const modelsToTry = this.CANDIDATE_MODELS;

    const temperature = options.temperature ?? 0.6;

    let skipCacheFor = '';
    for (let mi = 0; mi < modelsToTry.length; mi++) {
      const modelName = modelsToTry[mi];
      const timeoutMs = deadline - Date.now();
      if (timeoutMs < 1000) break;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let usedCache: ReturnType<typeof cachedContentFor> = null;
      const callStart = Date.now();
      const purpose = options.purpose || 'other';
      /** Records this attempt's latency and token cost (every attempt is billed, including fallbacks) */
      const track = (status: 'ok' | 'timeout' | 'error', usageMetadata?: any) => {
        const latencyMs = Date.now() - callStart;
        recordLLMTiming({ model: modelName, purpose, latencyMs, status });
        recordLLMCost({ model: modelName, purpose, status, latencyMs, usage: usageFromResponse(usageMetadata) });
      };
      try {
        const modelConfig: any = {
          model: modelName,
          generationConfig: {
            temperature
          }
        };
        if (options.systemInstruction) {
          modelConfig.systemInstruction = options.systemInstruction;
        }

        if (options.responseMimeType) {
          modelConfig.generationConfig.responseMimeType = options.responseMimeType;
        }
        if (options.maxOutputTokens) {
          modelConfig.generationConfig.maxOutputTokens = options.maxOutputTokens;
        }
        // Flash tiers "think" by default in some versions, which adds latency. Extraction-style calls
        // disable it; callers that must reconcile many figures pass a budget instead.
        if (options.thinkingBudget !== undefined) {
          modelConfig.generationConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
        } else if (modelName.startsWith('gemini-3.8-flash') || modelName.startsWith('gemini-2.5-flash')) {
          modelConfig.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        // A cached copy of a large system instruction is referenced instead of resent
        const cached = skipCacheFor === modelName ? null : cachedContentFor(apiKey.trim(), modelName, options.systemInstruction);
        usedCache = cached;
        const model = cached
          ? genAI.getGenerativeModelFromCachedContent(cached, { generationConfig: modelConfig.generationConfig }, { timeout: timeoutMs })
          : genAI.getGenerativeModel(modelConfig, { timeout: timeoutMs });

        const generatePromise = model.generateContent(prompt)
          .then(res => ({ text: res.response.text(), usage: res.response.usageMetadata }));
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        track('ok', response.usage);
        const result = response.text;
        if (result && result.trim().length > 0) {
          this.recordSuccess(modelName);
          if (modelName !== this.CANDIDATE_MODELS[0]) {
            logger.warn(`Answered by fallback model ${modelName} (configured ${this.CANDIDATE_MODELS[0]} failed for this call)`);
          }
          return { text: result, model: modelName };
        }
      } catch (err: any) {
        track(/timeout|aborted/i.test(err?.message || '') ? 'timeout' : 'error');
        if (usedCache && isCacheError(err)) {
          // Expired or deleted cache: same model again with the instruction inline
          invalidateContextCache(usedCache);
          skipCacheFor = modelName;
          mi--;
          continue;
        }
        // If it's a 404/not supported or model error or transient timeout, try next candidate model
        if (
          err?.message?.includes('not found') ||
          err?.message?.includes('not supported') ||
          err?.message?.includes('404') ||
          err?.message?.includes('ModelService') ||
          err?.message?.includes('aborted') ||
          err?.message?.includes('TIMEOUT') ||
          err?.message?.includes('timeout')
        ) {
          logger.warn(`Model ${modelName} encountered transient issue (${err?.message || err}). Trying next candidate model.`);
          continue;
        }
        this.recordFailure(err);
        break;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    return null;
  }
}

export const geminiService = new GeminiService();
