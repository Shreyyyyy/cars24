/**
 * Enterprise Security, Prompt Sanitization & RBAC for Maruti Suzuki AI
 */

export interface UserSecurityContext {
  userId?: string;
  role?: 'executive' | 'zonal_manager' | 'dealer_principal' | 'analyst';
  allowedZones?: string[]; // e.g. ['West', 'North']
  allowedStates?: string[]; // e.g. ['Maharashtra', 'Gujarat']
  allowedDealerships?: string[];
}

// ---------------------------------------------------------------------------
// Guardrails: prompt injection and profanity (checked before anything else runs)
// ---------------------------------------------------------------------------

export type GuardrailCategory = 'prompt_injection' | 'profanity' | 'length' | 'empty';

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // Instruction override / ignore directives
  /ignore\s+(?:all\s+|any\s+|the\s+|your\s+)*(?:previous|prior|above|earlier|preceding|system|original)\s+(?:instructions?|prompts?|rules|guidelines|directions|messages?)/i,
  /disregard\s+(?:all\s+|any\s+|the\s+|your\s+)*(?:previous|prior|above|existing|system|original)?\s*(?:instructions?|rules|prompts?|constraints|guidelines)/i,
  /forget\s+(?:all\s+|any\s+|the\s+|your\s+|everything\s+)*(?:previous|prior|above|earlier|you\s+were\s+told|instructions?|rules)/i,
  /override\s+(?:all\s+|the\s+|your\s+)*(?:system|instructions?|rules|guidelines|safety|settings)/i,
  /\b(?:new|updated|revised|real)\s+(?:system\s+)?instructions?\s*[:\-]/i,
  /\bfrom\s+now\s+on,?\s+(?:you\s+(?:are|will|must|should)|act|respond|behave|ignore)/i,
  /\byou\s+(?:must|will)\s+now\s+(?:ignore|obey|follow|act|respond)/i,
  /^\s*(?:system|assistant|developer)\s*:/im,

  // Persona shift / jailbreak mode
  /\byou\s+are\s+(?:now\s+)?(?:in\s+)?(?:developer\s+mode|dan|unfiltered|unrestricted|uncensored|jailbroken|god\s+mode|evil)\b/i,
  /\b(?:act|behave|respond|roleplay|role-play)\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:dan|an?\s+(?:unfiltered|unrestricted|uncensored|jailbroken|evil)|chaos\s*gpt|a\s+different\s+ai|your\s+developer)/i,
  /\bpretend\s+(?:to\s+be\s+|that\s+)?(?:you\s+(?:have|had)\s+no\s+(?:rules|filters|limits|restrictions|guidelines)|there\s+(?:are|were)\s+no\s+rules)/i,
  /\b(?:bypass|circumvent|disable|turn\s+off|get\s+around)\s+(?:your\s+|the\s+|all\s+)*(?:safety|guardrails?|filters?|content\s+policy|restrictions|moderation)/i,
  /\bdo\s+anything\s+now\b/i,
  /\bjail\s*break/i,

  // Prompt / secret extraction
  /(?:reveal|show|print|display|dump|leak|repeat|output|share|tell\s+me|give\s+me|what\s+(?:is|are|were))\s+(?:me\s+)?(?:the\s+|your\s+)?(?:full\s+|exact\s+|entire\s+|hidden\s+|original\s+)?(?:system\s+prompt|developer\s+prompt|initial\s+(?:instructions|prompt)|system\s+(?:instructions|message)|hidden\s+(?:rules|instructions)|secret\s+key|api[_\s-]?key|credentials|password|env(?:ironment)?\s+variables)/i,
  /\b(?:repeat|print|output)\s+(?:the\s+|all\s+)?(?:words|text|everything)\s+(?:above|before|preceding)/i,
  /\bwhat\s+(?:were|are)\s+you\s+(?:told|instructed|programmed)\b/i,
  /\bsystem\s+prompt\b/i,
  /\bprocess\.env\b|\.env\s+file/i,

  // Hindi / Hinglish instruction override
  /\b(?:pichhl[ae]|pehl[ae]|upar\s+wal[ae])\s+(?:saare\s+|sab\s+)?(?:instructions?|niyam|rules)\s+(?:ignore|bhool)/i,
  /\b(?:saare|sab)\s+(?:niyam|rules|instructions?)\s+(?:bhool|ignore)\s+(?:jao|karo|kar\s+do)/i,

  // Model delimiter / formatting attacks
  /\[\s*\/?\s*(?:INST|SYS|SYSTEM)\s*\]/i,
  /<\s*\|\s*(?:im_start|im_end|system|user|assistant|endoftext)\s*\|?\s*>/i,
  /<<\s*\/?SYS\s*>>/i,
  /<\/?\s*(?:system|instructions?)\s*>/i,

  // Destructive or catalog-probing SQL in the question itself
  /\b(?:drop|truncate|alter)\s+(?:table|view|index|database)\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+["`]?\w+["`]?\s+set\b/i,
  /\binsert\s+into\b/i,
  /\b(?:attach|detach)\s+database\b/i,
  /\bpragma\s+\w+/i,
  /\bexec(?:ute)?\s*\(?\s*xp_cmdshell\b/i,
  /\b(?:information_schema|sqlite_master|sqlite_schema)\b/i,
  /;\s*--/,

  // Script injection
  /<\s*script\b[^>]*>/i,
  /\bjavascript\s*:/i,
  /\bon(?:error|load)\s*=/i
];

/** Case-insensitive, whole-word profanity (English, Hindi, Hinglish) */
const PROFANITY_WORDS = [
  // English
  'fuck', 'fucking', 'fucker', 'fucked', 'fucks', 'fuckin', 'motherfucker', 'motherfucking', 'wtf', 'stfu',
  'shit', 'bullshit', 'shitty', 'shithead', 'bitch', 'bitches', 'bitching', 'asshole', 'assholes', 'arsehole',
  'bastard', 'bastards', 'dickhead', 'cock', 'cocksucker', 'cunt', 'cunts', 'pussy', 'slut', 'sluts', 'whore', 'whores',
  'twat', 'wanker', 'prick', 'jackass', 'douchebag', 'dumbass', 'nigger', 'nigga', 'retard', 'retarded', 'faggot', 'fag',
  // Hindi / Hinglish
  'madarchod', 'maderchod', 'madarchood', 'bhenchod', 'behenchod', 'bhanchod', 'benchod', 'bhosdike', 'bhosadike', 'bhosdi', 'bhosda',
  'chutiya', 'chutiye', 'chutiyapa', 'chutia', 'choot', 'gaand', 'gandu', 'gaandu', 'harami', 'haramkhor', 'haramzada', 'haramzade',
  'kamina', 'kameena', 'kaminey', 'kutti', 'kutiya', 'loda', 'lauda', 'lavde', 'lowde', 'lund', 'laund', 'randi', 'randwa', 'raand',
  'chinal', 'jhaant', 'jhant', 'tatti', 'bsdk', 'bkl', 'mkc', 'bhadwa', 'bhadwe', 'saala', 'saali',
  // Hindi (Devanagari)
  'मादरचोद', 'बहनचोद', 'भोसड़ी', 'चूतिया', 'गांडू', 'हरामी', 'कमीना', 'रंडी', 'लौड़ा', 'भड़वा'
];
/** Abuse phrases (spaces may vary) */
const PROFANITY_PHRASES = [/teri\s+maa\s+k[ie]/i, /tera\s+baap/i, /maa\s+ki\s+aankh/i, /son\s+of\s+a\s+bitch/i, /go\s+to\s+hell/i, /screw\s+you/i];
/**
 * Two/three-letter Hindi abuse abbreviations: blocked only in lower case, standalone; upper case is how
 * business abbreviations are written (MC = municipal corporation, BC = backward class, MF = mutual fund).
 */
const LOWERCASE_ONLY_ABBREVIATIONS = /(?:^|[^A-Za-z])(?:mc|bc|mf)(?=$|[^A-Za-z])/;

const PROFANITY_RE = new RegExp(`(?:^|[^\\p{L}])(?:${PROFANITY_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^\\p{L}])`, 'iu');

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i', '€': 'e' };

// Unicode-aware patterns (built at runtime: the project's compile target predates regex-literal flag u)
const SPACED_LETTERS = new RegExp('(?:^|(?<=\\s))(?:\\p{L}[\\s.\\-_*]{1,2}){2,}\\p{L}(?=$|\\s|[^\\p{L}])', 'gu');
const REPEATED_LETTERS = new RegExp('(\\p{L})\\1{2,}', 'gu');
const LETTER = new RegExp('\\p{L}', 'gu');

/** Zero-width and bidi control characters used to split words past filters */
const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿­]/g;

/**
 * Forms the text is checked in, so obfuscation does not get past the filters:
 * as typed; with look-alike characters and leetspeak folded; with separators inside spaced-out
 * letters removed ("f u c k", "f.u.c.k"); and with masked letters filled ("f*ck", "sh!t").
 */
function variants(text: string): string[] {
  const base = text.normalize('NFKC').replace(INVISIBLE, '');
  const folded = base.toLowerCase().replace(/[013457@$!|€]/g, c => LEET[c] || c);
  // Collapse single letters separated by spaces/punctuation: "f u c k you" -> "fuck you"
  const joined = folded.replace(SPACED_LETTERS, m => m.replace(/[\s.\-_*]/g, ''));
  // Repeated letters: "fuuuuck" -> "fuck"
  const squeezed = joined.replace(REPEATED_LETTERS, '$1');
  return Array.from(new Set([base, folded, joined, squeezed]));
}

/** Masked words: letters with one or two * / # / . in the middle ("f*ck", "sh**t", "b!tch") */
const MASKED_PROFANITY = /(?:^|[^a-z])(?:f[\W_]{1,3}c?k|f[u*]{1,2}[c*]{0,2}k(?:ing|er)?|sh[\W_]{1,3}t|b[\W_]{1,3}tch|a[\W_]{1,2}sshole|c[\W_]{1,3}nt|ch[\W_]{1,3}tiya|bh?[\W_]{1,3}nchod|m[\W_]{1,3}darchod)(?=$|[^a-z])/i;

export interface GuardrailResult {
  isValid: boolean;
  sanitized: string;
  violationReason?: string;
  category?: GuardrailCategory;
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  if (LOWERCASE_ONLY_ABBREVIATIONS.test(text.normalize('NFKC').replace(INVISIBLE, ''))) return true;
  if (MASKED_PROFANITY.test(text)) return true;
  return variants(text).some(v => PROFANITY_RE.test(v) || PROFANITY_PHRASES.some(p => p.test(v)));
}

export function containsPromptInjection(text: string): boolean {
  if (!text) return false;
  return variants(text).some(v => PROMPT_INJECTION_PATTERNS.some(p => p.test(v)));
}

/**
 * Sanitizes user input and blocks prompt injection, destructive SQL and profanity. Runs before any
 * agent sees the question (and on every history turn the client sends).
 */
export function validateUserInput(input: string): GuardrailResult {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return { isValid: false, sanitized: '', violationReason: 'Input must be a non-empty string', category: 'empty' };
  }

  // Remove null bytes, control and invisible characters first, so they cannot hide a pattern
  const cleaned = input.normalize('NFKC').replace(INVISIBLE, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (cleaned.length > 2000) {
    return { isValid: false, sanitized: cleaned.slice(0, 2000), violationReason: 'Input exceeds maximum allowed length (2000 characters)', category: 'length' };
  }

  if (containsPromptInjection(cleaned)) {
    return {
      isValid: false,
      sanitized: cleaned,
      violationReason: "I can't follow instructions that try to change how I work, reveal internal settings, or modify data. Please ask a question about your sales and marketing data.",
      category: 'prompt_injection'
    };
  }
  if (containsProfanity(cleaned)) {
    return {
      isValid: false,
      sanitized: cleaned,
      violationReason: 'Please rephrase without offensive language, and I will gladly answer your question.',
      category: 'profanity'
    };
  }
  return { isValid: true, sanitized: cleaned };
}

/** Phrases only the system instructions contain: if an answer repeats them, it is leaking the prompt */
const PROMPT_LEAK_MARKERS = [
  /MANDATORY ANALYTICAL PROCEDURE/i,
  /CANONICAL METRIC DEFINITIONS/i,
  /LINKS THAT LOOK PLAUSIBLE BUT DO NOT EXIST/i,
  /Return STRICT (?:valid )?JSON/i,
  /DATA MODEL: the uploaded file/i
];

/**
 * Output guardrail for model-written text shown to users: masks profanity (e.g. quoted from data
 * or a model slip) and removes lines that echo the system instructions.
 */
export function sanitizeModelOutput(text: string): string {
  if (!text) return text;
  let out = text;
  if (PROMPT_LEAK_MARKERS.some(m => m.test(out))) {
    out = out.split('\n').filter(line => !PROMPT_LEAK_MARKERS.some(m => m.test(line))).join('\n');
  }
  if (containsProfanity(out)) {
    // Keep the first letter of each word, star the rest ("f***")
    out = out.replace(new RegExp(PROFANITY_RE.source, 'giu'), m => {
      let seen = false;
      return m.replace(LETTER, c => (seen ? '*' : ((seen = true), c)));
    });
    out = out.replace(MASKED_PROFANITY, m => m.replace(/[a-z]/gi, (c, i) => (i <= 1 ? c : '*')));
  }
  return out;
}

/**
 * Applies Row-Level and Tenant-Level RBAC constraints to generated SQL queries
 */
export function applyRBACScopeToSQL(sql: string, securityContext?: UserSecurityContext): string {
  if (!securityContext || securityContext.role === 'executive') {
    return sql; // Full access for executives / global analysts
  }

  const conditions: string[] = [];

  if (securityContext.allowedStates && securityContext.allowedStates.length > 0) {
    const statesList = securityContext.allowedStates.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`"state" IN (${statesList})`);
  }

  if (securityContext.allowedDealerships && securityContext.allowedDealerships.length > 0) {
    const dealersList = securityContext.allowedDealerships.map(d => `'${d.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`"assigned_dealer" IN (${dealersList})`);
  }

  if (conditions.length === 0) return sql;

  const rbacFilter = conditions.join(' AND ');

  if (/WHERE/i.test(sql)) {
    return sql.replace(/WHERE/i, `WHERE (${rbacFilter}) AND `);
  } else if (/GROUP BY/i.test(sql)) {
    return sql.replace(/GROUP BY/i, `WHERE ${rbacFilter} GROUP BY`);
  } else if (/ORDER BY/i.test(sql)) {
    return sql.replace(/ORDER BY/i, `WHERE ${rbacFilter} ORDER BY`);
  } else if (/LIMIT/i.test(sql)) {
    return sql.replace(/LIMIT/i, `WHERE ${rbacFilter} LIMIT`);
  }

  return `${sql.replace(/;$/, '')} WHERE ${rbacFilter};`;
}
