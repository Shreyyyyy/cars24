/**
 * Multilingual NLP Normalizer & Language Detection
 * Supports: English, Hindi, Gujarati, Marathi, and Transliterated/Hinglish
 */

export type SupportedLanguage = 'en' | 'hi' | 'gu' | 'mr' | 'hinglish';

export interface MultilingualResolution {
  detectedLanguage: SupportedLanguage;
  canonicalEnglishQuery: string;
  originalQuery: string;
  isTransliterated: boolean;
  extractedEntities: {
    states?: string[];
    models?: string[];
    metrics?: string[];
    channels?: string[];
  };
}

// Multilingual lexicon mapping for automotive business vocabulary
const MULTILINGUAL_LEXICON: Record<string, string> = {
  // Hindi / Hinglish terms
  'sabse': 'highest',
  'jyada': 'highest',
  'zyada': 'highest',
  'achha': 'best',
  'achhi': 'best',
  'achhe': 'best',
  'behtar': 'best',
  'kharaab': 'worst',
  'kam': 'lowest',
  'sabse kam': 'lowest',
  'gaadi': 'vehicle',
  'gadi': 'vehicle',
  'car': 'vehicle',
  'cars': 'vehicles',
  'bikri': 'sales',
  'bika': 'sales',
  'biki': 'sales',
  'bik': 'sales',
  'kamai': 'revenue',
  'dhaandha': 'business',
  'munafa': 'profit',
  'target': 'target',
  'kitna': 'how much',
  'kitni': 'how much',
  'kaunsi': 'which',
  'kaun sa': 'which',
  'kaun': 'which',
  'kaha': 'where',
  'kahaan': 'where',
  'kyun': 'why',
  'kyu': 'why',
  'girawat': 'decline',
  'gira': 'dropped',
  'ghat': 'decrease',
  'barh': 'increase',
  'badha': 'increase',
  'bhav': 'price',
  'keemat': 'price',
  'chhoot': 'discount',
  'dukaan': 'showroom',
  'shoroom': 'showroom',
  'dealership': 'dealership',

  // Gujarati terms
  'sarvathe': 'highest',
  'saru': 'best',
  'saras': 'best',
  'kharab': 'worst',
  'ochhu': 'lowest',
  'vadhare': 'highest',
  'vadi': 'highest',
  'gaadiyo': 'vehicles',
  'vechan': 'sales',
  'vechayeli': 'sales',
  'aavak': 'revenue',
  'nafo': 'profit',
  'ketlu': 'how much',
  'ketla': 'how much',
  'kai': 'which',
  'kyo': 'which',
  'kyan': 'where',
  'kem': 'why',
  'ghatado': 'decline',
  'vadharelu': 'increase',

  // Marathi terms
  'sarvat': 'highest',
  'jasta': 'highest',
  'chhan': 'best',
  'uttam': 'best',
  'kami': 'lowest',
  'konthi': 'which',
  'konthya': 'which',
  'kuthe': 'where',
  'kiti': 'how much',
  'vikri': 'sales',
  'utpanna': 'revenue',
  'ghatana': 'decline',
  'ka': 'why',
  'karan': 'reason'
};

// State aliases
const STATE_ALIASES: Record<string, string> = {
  'gujarat': 'Gujarat',
  'gujrat': 'Gujarat',
  'gj': 'Gujarat',
  'maharashtra': 'Maharashtra',
  'maha': 'Maharashtra',
  'mh': 'Maharashtra',
  'mumbai': 'Maharashtra',
  'pune': 'Maharashtra',
  'delhi': 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  'ncr': 'Delhi NCR',
  'haryana': 'Haryana',
  'hr': 'Haryana',
  'rajasthan': 'Rajasthan',
  'raj': 'Rajasthan',
  'rj': 'Rajasthan',
  'up': 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh'
};

// Model aliases
const MODEL_ALIASES: Record<string, string> = {
  'swift': 'Swift',
  'brezza': 'Brezza',
  'grand vitara': 'Grand Vitara',
  'gv': 'Grand Vitara',
  'dzire': 'Dzire',
  'desire': 'Dzire',
  'fronx': 'Fronx',
  'baleno': 'Baleno',
  'ertiga': 'Ertiga',
  'wagonr': 'WagonR',
  'wagon r': 'WagonR',
  'xl6': 'XL6',
  'invicto': 'Invicto',
  'jimny': 'Jimny',
  'alto': 'Alto K10',
  'alto k10': 'Alto K10',
  'celerio': 'Celerio',
  'e vitara': 'e Vitara',
  'evitara': 'e Vitara'
};

export function detectLanguageAndNormalize(input: string): MultilingualResolution {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  let detectedLanguage: SupportedLanguage = 'en';
  let isTransliterated = false;

  // 1. Script checks for Devanagari or Gujarati scripts
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  const hasGujarati = /[\u0A80-\u0AFF]/.test(trimmed);

  if (hasGujarati) {
    detectedLanguage = 'gu';
  } else if (hasDevanagari) {
    // Check Marathi specific words in Devanagari
    if (/आहे|नाही|सर्वात|कमी|विक्री|उत्पन्न|का/.test(trimmed)) {
      detectedLanguage = 'mr';
    } else {
      detectedLanguage = 'hi';
    }
  } else {
    // Transliterated checks
    const hinglishMarkers = ['sabse', 'jyada', 'zyada', 'kaunsi', 'kaun sa', 'bikri', 'gaadi', 'kaha', 'kyun', 'girawat', 'kitna', 'achha', 'chhoot'];
    const gujaratiTransMarkers = ['sarvathe', 'saru', 'ochhu', 'vadhare', 'vechan', 'ketlu', 'kem', 'ghatado', 'kyo', 'kai'];
    const marathiTransMarkers = ['sarvat', 'jasta', 'konthi', 'konthya', 'vikri', 'kuthe', 'kiti', 'karan'];

    if (hinglishMarkers.some(m => lower.includes(m))) {
      detectedLanguage = 'hinglish';
      isTransliterated = true;
    } else if (gujaratiTransMarkers.some(m => lower.includes(m))) {
      detectedLanguage = 'gu';
      isTransliterated = true;
    } else if (marathiTransMarkers.some(m => lower.includes(m))) {
      detectedLanguage = 'mr';
      isTransliterated = true;
    }
  }

  // 2. Translate non-English phrasing word by word. English questions pass through untouched,
  //    and nothing is rewritten wholesale: entities like cities, models or dealers must survive.
  let canonical = lower;

  if (detectedLanguage !== 'en') {
    canonical = canonical
      .replace(/sabse (jyada|zyada|bada)/g, 'highest')
      .replace(/sabse (kam|chhota)/g, 'lowest')
      .replace(/sarvat (jasta|mothe)/g, 'highest')
      .replace(/sarvat kami/g, 'lowest')
      .replace(/kyun gira|kyu gira|kyun decline hua|kem ghatyu/g, 'why declined');

    canonical = canonical
      .split(/\s+/)
      .map(w => MULTILINGUAL_LEXICON[w.replace(/[^a-zA-Z0-9]/g, '')] || w)
      .join(' ');
  }

  // Extract entities
  const states: string[] = [];
  for (const [alias, canonicalState] of Object.entries(STATE_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
      if (!states.includes(canonicalState)) states.push(canonicalState);
    }
  }

  const models: string[] = [];
  for (const [alias, canonicalModel] of Object.entries(MODEL_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
      if (!models.includes(canonicalModel)) models.push(canonicalModel);
    }
  }

  const channels: string[] = [];
  if (/\b(nexa)\b/i.test(lower)) channels.push('NEXA');
  if (/\b(arena)\b/i.test(lower)) channels.push('ARENA');

  return {
    detectedLanguage,
    canonicalEnglishQuery: canonical !== lower ? canonical : trimmed,
    originalQuery: trimmed,
    isTransliterated,
    extractedEntities: {
      states: states.length > 0 ? states : undefined,
      models: models.length > 0 ? models : undefined,
      channels: channels.length > 0 ? channels : undefined
    }
  };
}
