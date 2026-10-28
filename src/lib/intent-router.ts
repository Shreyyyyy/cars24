/**
 * Production-Ready Central Intent Classifier & Query Orchestration Layer
 */

import { IntentType } from '@/types/chat';

export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  isAmbiguous?: boolean;
}

const CASUAL_GREETINGS = new Set([
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'how are you', 'how are you doing', 'whats up', "what's up",
  'thank you', 'thanks', 'bye', 'goodbye', 'nice to meet you',
  'who are you', 'what can you do', 'help', 'what are your capabilities'
]);

const GENERAL_NLP_PATTERNS = [
  /^what is (customer acquisition cost|cac|market segmentation|conversion rate|churn rate|clv|roi)\b/i,
  /^explain (customer acquisition cost|market segmentation|conversion rate|cac|clv|marketing funnel|b2b marketing)\b/i,
  /^how to (calculate|improve|draft|write|build|design) (a )?(marketing strategy|funnel|campaign|cac)\b/i,
  /^(summarize|rewrite|draft|brainstorm|explain this business concept)\b/i
];

const RAG_DOMAIN_PATTERNS = [
  /s-cng strategy|cng technology|dual cylinder/i,
  /nexa retail channel|nexa experience|nexa premium/i,
  /dealership performance benchmarks|retail efficiency benchmark|showroom sla benchmark/i,
  /automotive sales funnel stages|catchment demand clustering/i,
  /discount rationalization|margin protection strategy/i
];

const COMPETITOR_OR_REPORT_PATTERNS = [
  /\b(tata|mahindra|hyundai|toyota|kia|honda|skoda|volkswagen|mg motor|byd|renault|nissan)\b/i,
  /\b(monthly report|performance report|competitor analysis|market share report|market overview|industry report|commercial report)\b/i,
  /\b(ev trends|electric vehicles in india|automotive market in india|industry trends)\b/i
];

/** Forward-looking "how do we sell more" questions, answered from the growth-opportunity scan of the file. */
const GROWTH_PATTERNS = [
  /\b(grow|growth|increase|boost|improve|lift|raise|maximi[sz]e|accelerate|double)\b[\w\s,'-]{0,40}\b(sales|revenue|bookings?|deliveries|conversions?|business|volumes?|leads?|profits?|market share|numbers|performance|turnover)\b/i,
  // "opportunity" alone is also the Salesforce Opportunity object (win rate, closed won): only growth phrasings count
  /\b((growth|sales|biggest|best|top|untapped|revenue|business|market) opportunit(y|ies)|opportunit(y|ies) (to|for) (grow|increase|improve|boost|sell)|suggestions?|recommendations?|what should (we|i)|where should (we|i)|next steps?|action plan|growth plan|game plan|strateg(y|ies)|priorit(y|ies|ise|ize))\b/i,
  /\b(future|next (month|quarter|year)|outlook|forecast|projection|projected|going forward|upcoming months?)\b/i,
  /\b(business review|monthly report|performance report|summary report|executive summary|key insights|overview of (my|our|the) (data|business|sales|file)|summari[sz]e (my|our|the|this) (data|business|file|sales|sheet))\b/i
];
/** Questions about the uploaded file itself (shape, sheets, columns, quality), answered from its profile, not a query. */
export const DATA_OVERVIEW_PATTERN = /\b(what|how)('?s| is| are| does| do)?\b.{0,30}\b(my|the|this|our|uploaded)\s+(uploaded\s+)?(data|dataset|file|workbook|sheets?|spreadsheet|excel|csv|upload|tables?)\b.{0,30}\b(look|contain|have|hold|include|about|like|structured|columns?|fields?|sheets?|tables?|rows?)\b|\b(describe|explain|walk me through|tell me about)\s+(my|the|this|our|uploaded)\s+(uploaded\s+)?(data|dataset|file|workbook|sheets?|upload)\b|\b(which|what)\s+(columns?|fields?|sheets?|tables?|metrics|dimensions)\b.{0,30}\b(are there|do (i|we) have|available|in (my|the|this))\b|\b(data quality|missing values|null values|data dictionary|schema)\b/i;

/** A "why"/problem framing means the user wants a diagnosis of a specific laggard, not a growth scan. */
const PROBLEM_FRAMING = /\b(why|root cause|lagging|underperform\w*|struggling|turnaround|declin\w*|drop(ped)?|worst|lowest)\b/i;
/** "Does X improve Y?", "impact of X on Y": a measurable question for the data, not a growth scan. */
const RELATIONSHIP_QUESTION = /^(does|do|did|is|are|was|were|has|have|can)\b|\b(impact|effect|affect\w*|correlat\w*|relationship|depend\w* on|vs\.?|versus|compare|comparison|by (zone|dealer|model|city|state|source|channel|month))\b/i;

const DIAGNOSTIC_PATTERNS = [
  /\b(why did|why has|why have|why is|why are|why was|root cause|lagging|underperform|underperforming|struggling|turnaround|how to improve|how to turnaround|decline|declining|sales drop|margin loss)\b/i,
  /\b(poor performance|low target achievement|deficit|loss in sales|under target)\b/i
];

const ANALYTICS_PATTERNS = [
  /\b(which showroom|top showroom|lowest showroom|best showroom|worst showroom)\b/i,
  /\b(highest sales|lowest sales|units sold|sales volume|deliveries|target achievement)\b/i,
  /\b(top \d+|bottom \d+|ranked|ranking|leaderboard)\b/i,
  /\b(compare|comparison|versus|\bvs\b|fuel mix|fuel type)\b/i,
  /\b(sales by state|sales by city|deliveries by channel|arena vs nexa)\b/i,
  /\b(highest demand|top selling car|top selling model|vehicle sales)\b/i,
  /\b(discount and margin|margin leakage|discount amount)\b/i
];

const AMBIGUOUS_PATTERNS = [
  /^(which is the best|which is best|best one)\??$/i,
  /^(show me the performance|show performance)\??$/i,
  /^(what about last month|last month)\??$/i,
  /^(compare them|compare both)\??$/i,
  /^(why is it declining|why is it low)\??$/i
];

/**
 * Classifies the incoming user message with high precision
 */
export function classifyIntent(query: string, hasDatasetLoaded: boolean = true, datasetVocabulary: string[] = []): ClassificationResult {
  const qClean = query.trim().toLowerCase().replace(/[?!.,]+$/, '');

  // 1. Casual Conversation Check
  const normalizedTokens = qClean.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const isGreetingWord = (word: string) => CASUAL_GREETINGS.has(word) || ['hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening', 'there', 'thanks', 'thank', 'you', 'how', 'are', 'doing', 'whats', 'up', 'bye', 'goodbye', 'help'].includes(word);

  if (
    CASUAL_GREETINGS.has(qClean) ||
    (normalizedTokens.length > 0 && normalizedTokens.length <= 4 && normalizedTokens.every(isGreetingWord))
  ) {
    return {
      intent: 'casual',
      confidence: 0.99,
      reasoning: 'Matches standard conversational greeting or identity/capability inquiry.'
    };
  }

  // 2. Questions about the uploaded file itself
  if (hasDatasetLoaded && DATA_OVERVIEW_PATTERN.test(qClean)) {
    return {
      intent: 'general_nlp',
      confidence: 0.92,
      reasoning: 'Asks what the uploaded data looks like: answered from the file profile.'
    };
  }

  // 3. Growth & future-sales questions (need the uploaded data)
  if (hasDatasetLoaded && !PROBLEM_FRAMING.test(qClean) && !RELATIONSHIP_QUESTION.test(qClean) && GROWTH_PATTERNS.some(p => p.test(qClean))) {
    return {
      intent: 'growth',
      confidence: 0.93,
      reasoning: 'Asks how to grow sales, for suggestions, or about the future: answered from the growth scan of the uploaded file.'
    };
  }

  // 3. Competitor brands & industry reports: with a dataset loaded, answer from the file (it may contain
  //    competitor rows); without one, the general path explains which data is needed. Never from outside figures.
  for (const pattern of COMPETITOR_OR_REPORT_PATTERNS) {
    if (pattern.test(qClean)) {
      return hasDatasetLoaded
        ? { intent: 'analytics', confidence: 0.85, reasoning: 'Competitor/report request answered from the uploaded file only.' }
        : { intent: 'general_nlp', confidence: 0.95, reasoning: 'Competitor or market report request with no dataset loaded.' };
    }
  }

  // 3. Ambiguous Query Check (Requires clarification or multi-turn reference)
  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test(qClean)) {
      return {
        intent: 'clarification',
        confidence: 0.95,
        reasoning: 'Query lacks essential subject entity or metric context.',
        isAmbiguous: true
      };
    }
  }

  // 4. Diagnostic Investigation
  for (const pattern of DIAGNOSTIC_PATTERNS) {
    if (pattern.test(qClean)) {
      return {
        intent: 'diagnostic',
        confidence: 0.92,
        reasoning: 'User is asking for root causes, underperformance reasons, or turnaround strategies.'
      };
    }
  }

  // 5. Structured Marketing Analytics Check
  for (const pattern of ANALYTICS_PATTERNS) {
    if (pattern.test(qClean)) {
      return {
        intent: 'analytics',
        confidence: 0.94,
        reasoning: 'User requested specific quantitative metrics, rankings, or distributions across dataset.'
      };
    }
  }

  // 6. RAG Automotive Domain Knowledge Check
  for (const pattern of RAG_DOMAIN_PATTERNS) {
    if (pattern.test(qClean)) {
      return {
        intent: 'rag',
        confidence: 0.90,
        reasoning: 'Query matches specialized automotive knowledge base and Maruti strategy concepts.'
      };
    }
  }

  // 7. General Marketing NLP Check
  for (const pattern of GENERAL_NLP_PATTERNS) {
    if (pattern.test(qClean)) {
      return {
        intent: 'general_nlp',
        confidence: 0.88,
        reasoning: 'General marketing concept, definition, or drafting task.'
      };
    }
  }

  // If dataset is loaded, check if query contains any CRM dataset dimensions, columns, or metrics
  if (hasDatasetLoaded) {
    const datasetKeywords = [
      'showroom', 'dealer', 'car', 'model', 'vehicle', 'sales', 'target', 'state', 'city', 'location',
      'fuel', 'cng', 'petrol', 'diesel', 'hybrid', 'network', 'arena', 'nexa', 'channel', 'source',
      'referral', 'website', 'lost', 'lead', 'leads', 'drop', 'test drive', 'booking', 'delivery',
      'price', 'rating', 'satisfaction', 'csat', 'campaign', 'customer', 'body', 'suv', 'mpv', 'hatchback', 'sedan', 'revenue',
      'total', 'average', 'avg', 'count', 'status', 'reason', 'breakdown', 'distribution', 'top', 'bottom',
      'highest', 'lowest', 'worst', 'best', 'mumbai', 'pune', 'delhi', 'bangalore', 'gurugram', 'ghaziabad',
      'grand vitara', 'swift', 'baleno', 'brezza', 'fronx', 'ertiga', 'dzire', 'jimny', 'invicto', 'wagonr', 'alto', 'celerio', 'ignis', 'xl6',
      'compare', 'versus', 'its', 'their', 'same'
    ];

    // Whole words only: substring matching sent "limits" (its) or "card" (car) down the SQL path
    const words = qClean.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    const mentions = (k: string) => {
      const key = k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return key.length > 2 && new RegExp(`\\b${key}(s|es)?\\b`).test(words);
    };
    if (datasetKeywords.some(mentions) || datasetVocabulary.some(mentions)) {
      const isDiagnostic = qClean.includes('why') || qClean.includes('lost') || qClean.includes('drop') || qClean.includes('underperform') || qClean.includes('worst') || qClean.includes('decline');
      return {
        intent: isDiagnostic ? 'diagnostic' : 'analytics',
        confidence: 0.90,
        reasoning: 'Matches active CRM dataset dimensions, columns, or performance metrics.'
      };
    }
  }

  // Default to General NLP / Knowledge
  return {
    intent: 'general_nlp',
    confidence: 0.75,
    reasoning: 'General natural language question.'
  };
}
