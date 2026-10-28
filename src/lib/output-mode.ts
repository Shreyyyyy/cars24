/**
 * Centralized Output Length Mode Configuration
 * Modes:
 *   - 'small'  (alias: 'less', 'short'): ultra-concise, strictly ~2-3 lines
 *   - 'medium' (alias: 'normal', 'standard'): balanced, medium size
 *   - 'large'  (alias: 'full', 'detailed', 'long'): full detailed strategic briefing
 *
 * Configurable via OUTPUT_MODE / NEXT_PUBLIC_OUTPUT_MODE environment variable.
 */

export type OutputMode = 'small' | 'medium' | 'large';

export interface OutputModeConfig {
  mode: OutputMode;
  label: string;
  tagline: string;
  description: string;
  maxSummaryLines: string;
  summaryPromptConstraint: string;
  takeawaysPromptConstraint: string;
  recommendationsPromptConstraint: string;
  generalNlpPromptConstraint: string;
  casualPromptConstraint: string;
  maxTakeawaysCount: number;
  maxRecommendationsCount: number;
  maxOutputTokens: number;
}

export const OUTPUT_MODE_CONFIGS: Record<OutputMode, OutputModeConfig> = {
  small: {
    mode: 'small',
    label: 'Small (Concise)',
    tagline: '2-3 lines quick response',
    description: 'Ultra-concise response, strictly around 2-3 lines with direct answers.',
    maxSummaryLines: '2-3 lines',
    summaryPromptConstraint: 'executiveSummary: Keep it strictly to 2-3 concise lines (≤ 35 words), immediately delivering the core executive answer with the primary key number.',
    takeawaysPromptConstraint: 'strategicTakeaways: at most 1 brief bullet point (≤ 15 words) citing the key metric.',
    recommendationsPromptConstraint: 'marketingRecommendations: at most 1 concise, forward-looking action to grow sales (≤ 20 words), tied to a figure from the data.',
    generalNlpPromptConstraint: 'Answer in strictly 2-3 lines (≤ 45 words) in high-level business English. Provide at most 1 key takeaway bullet.',
    casualPromptConstraint: 'Keep the greeting strictly to 1-2 concise lines.',
    maxTakeawaysCount: 1,
    maxRecommendationsCount: 1,
    maxOutputTokens: 400
  },
  medium: {
    mode: 'medium',
    label: 'Medium (Standard)',
    tagline: 'Balanced business overview',
    description: 'Standard medium-sized briefing with balanced summary and key action items.',
    maxSummaryLines: 'Medium size (~4-5 lines)',
    summaryPromptConstraint: 'executiveSummary: Answer the question directly in 3-4 sentences (≤ 60 words) with high-level commercial context, quoting key metrics.',
    takeawaysPromptConstraint: 'strategicTakeaways: at most 3 structured bullet points, each ≤ 25 words, each citing a number from COMPUTED FACTS or RESULT ROWS.',
    recommendationsPromptConstraint: 'marketingRecommendations: at most 3 forward-looking actions that would grow sales, each formatted as "**<Action>** (<timeframe>). Why: <evidence from the data>." Prefer actions backed by GROWTH OPPORTUNITIES. Never name an owner, role, team or person.',
    generalNlpPromptConstraint: 'Lead with the direct answer in 1-2 sentences (total answer ≤ 150 words). Use at most 3 bullets explaining commercial reasoning.',
    casualPromptConstraint: 'Keep the greeting concise (1-3 sentences max).',
    maxTakeawaysCount: 3,
    maxRecommendationsCount: 3,
    maxOutputTokens: 850
  },
  large: {
    mode: 'large',
    label: 'Large (Full Detailed)',
    tagline: 'Full detailed deep-dive',
    description: 'Authoritative, high-level strategic briefing with extensive context, segment breakdown, and multi-phase action plan.',
    maxSummaryLines: 'Full detailed narrative',
    summaryPromptConstraint: 'executiveSummary: A thorough executive briefing (6-8 sentences): answer the question, then cover volume/value, where demand is concentrated, what is rising or falling, and what it means for future sales. Discuss only dimensions that exist in the data; never discuss topics the data does not contain.',
    takeawaysPromptConstraint: 'strategicTakeaways: 4 to 5 data-rich insights (shares, gaps between segments, trends, conversion differences), each citing exact numbers from COMPUTED FACTS, RESULT ROWS or GROWTH OPPORTUNITIES.',
    recommendationsPromptConstraint: 'marketingRecommendations: 4 to 5 forward-looking initiatives to grow sales, formatted as "**<Action>** (<Timeline>). Why: <quantitative evidence from the data>. Impact to track: <the metric in the data that should move and its current value>." Only state a size of impact if it appears in GROWTH OPPORTUNITIES; never invent uplift percentages or targets. Never name an owner, role, team or person.',
    generalNlpPromptConstraint: 'Deliver a thorough briefing (250-450 words) with clear commercial logic and 4-6 practical actions. Use figures only from the uploaded content; where a point would need data the user has not uploaded, say which data would be needed.',
    casualPromptConstraint: 'Provide a warm, comprehensive, and helpful executive greeting with suggested next steps.',
    maxTakeawaysCount: 5,
    maxRecommendationsCount: 5,
    maxOutputTokens: 2500
  }
};

/**
 * Normalizes any string or alias into one of the 3 valid OutputMode values:
 * 'small' | 'medium' | 'large'
 */
export function normalizeOutputMode(input?: string | null): OutputMode {
  if (!input) return 'medium';
  const val = input.trim().toLowerCase();
  
  if (['small', 'less', 'short', 'compact', 'concise', 'brief', 'min', 'minimal', '1'].includes(val)) {
    return 'small';
  }
  if (['large', 'full', 'detailed', 'long', 'comprehensive', 'extended', 'max', '3'].includes(val)) {
    return 'large';
  }
  return 'medium';
}

/**
 * Resolves the active output mode based on explicit request override or environment variables.
 * Hierarchy: explicit param > OUTPUT_MODE > NEXT_PUBLIC_OUTPUT_MODE > RESPONSE_MODE > 'medium'
 */
export function getActiveOutputMode(requestOverride?: string | null): OutputMode {
  if (requestOverride) {
    return normalizeOutputMode(requestOverride);
  }

  if (typeof process !== 'undefined' && process.env) {
    const envVal =
      process.env.OUTPUT_MODE ||
      process.env.NEXT_PUBLIC_OUTPUT_MODE ||
      process.env.RESPONSE_MODE ||
      process.env.NEXT_PUBLIC_RESPONSE_MODE ||
      process.env.RESPONSE_LENGTH_MODE;
    if (envVal) {
      return normalizeOutputMode(envVal);
    }
  }

  return 'medium';
}

/**
 * Gets the full config for the specified mode or the currently active environment mode.
 */
export function getOutputModeConfig(mode?: string | null): OutputModeConfig {
  const resolvedMode = getActiveOutputMode(mode);
  return OUTPUT_MODE_CONFIGS[resolvedMode];
}
