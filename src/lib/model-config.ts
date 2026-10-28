/**
 * Centralized Gemini & LLM Model Configuration
 * Reads from GEMINI_MODEL / NEXT_PUBLIC_GEMINI_MODEL environment variables.
 */

export function getActiveGeminiModel(): string {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.GEMINI_MODEL ||
      process.env.NEXT_PUBLIC_GEMINI_MODEL ||
      'gemini-3.8-flash'
    );
  }
  return 'gemini-3.8-flash';
}

/**
 * Formats model identifiers into human-friendly display names
 * e.g. "gemini-3.8-flash" -> "Gemini 3.8 Flash"
 *      "gemini-2.5-pro" -> "Gemini 2.5 Pro"
 *      "cars24-business-engine" -> "CARS24 Neural Engine"
 */
export function formatModelDisplayName(model?: string): string {
  const target = model || getActiveGeminiModel();
  const lower = target.toLowerCase();

  if (
    lower.includes('deterministic') ||
    lower.includes('cars24-business') ||
    lower.includes('neural') ||
    lower.includes('cars24-rag')
  ) {
    return 'CARS24 Neural Engine';
  }

  // Capitalize hyphenated/underscored words (e.g. gemini-3.8-flash -> Gemini 3.8 Flash)
  return target
    .split(/[-_]/)
    .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export * from './output-mode';
