/**
 * Multi-Turn Conversation Context Manager for Maruti Suzuki AI
 * Resolves pronoun references ("it", "them", "that showroom", "previous result")
 * and maintains conversational thread state across queries.
 */

import { ConversationSession, ConversationTurn, UnifiedAssistantResponse } from '@/types/chat';

const activeSessions = new Map<string, ConversationSession>();
const MAX_SESSIONS = 500;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export interface ConversationContextState {
  lastEntity?: string;
  lastEntityType?: 'showroom' | 'vehicle' | 'region' | 'state' | 'channel' | 'fuel' | 'network';
  activeModel?: string;
  activeCity?: string;
  activeShowroom?: string;
  activeChannel?: string;
  activeFuel?: string;
  activeNetwork?: string;
  lastMetric?: string;
  lastTimeframe?: string;
  datasetVersion?: string;
  lastFilterCity?: string;
  lastFilterModel?: string;
  lastFilterChannel?: string;
  lastFilterFuel?: string;
  lastFilterNetwork?: string;
  lastSqlQuery?: string;
  lastSummary?: string;
}

const KNOWN_MODELS = ['swift', 'brezza', 'baleno', 'dzire', 'ertiga', 'grand vitara', 'fronx', 'jimny', 'wagonr', 'alto', 'alto k10', 'invicto', 'xl6', 'ciaz', 'ignis', 'celerio', 's-presso'];
const KNOWN_CITIES = ['mumbai', 'ghaziabad', 'gurugram', 'delhi', 'pune', 'bangalore', 'bengaluru', 'ahmedabad', 'surat', 'jaipur', 'chennai', 'hyderabad', 'kolkata', 'lucknow', 'chandigarh', 'nagpur', 'indore', 'bhopal', 'vadodara', 'rajkot', 'nashik', 'thane', 'noida', 'faridabad'];

export class ConversationManager {
  /**
   * Synchronizes or resets a conversation session with the client-provided chat history
   * Ensures the session context is strictly bounded to the specific chat.
   */
  static syncSession(
    conversationId: string,
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): ConversationSession {
    const session = this.getOrCreateSession(conversationId);
    if (!history || !Array.isArray(history)) return session;

    session.turns = history.map((h, i) => ({
      id: `turn_${h.role}_${i}`,
      role: h.role,
      timestamp: new Date().toISOString(),
      content: h.content
    }));

    const state: ConversationContextState = {};
    for (const h of history) {
      const contentLower = (h.content || '').toLowerCase();
      // Check vehicle models
      for (const m of KNOWN_MODELS) {
        if (new RegExp(`\\b${m}\\b`, 'i').test(contentLower)) {
          state.activeModel = m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          state.lastEntity = state.activeModel;
          state.lastEntityType = 'vehicle';
          break;
        }
      }
      // Check cities
      for (const c of KNOWN_CITIES) {
        if (new RegExp(`\\b${c}\\b`, 'i').test(contentLower)) {
          state.activeCity = c.charAt(0).toUpperCase() + c.slice(1);
          if (!state.activeModel) {
            state.lastEntity = state.activeCity;
            state.lastEntityType = 'region';
          }
          break;
        }
      }
    }
    session.contextState = state;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Retrieves or creates a conversation session
   */
  static getOrCreateSession(conversationId?: string): ConversationSession {
    const id = conversationId && conversationId.trim().length > 0 ? conversationId : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let session = activeSessions.get(id);
    if (!session) {
      session = {
        id,
        title: 'Marketing Intelligence Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turns: [],
        contextState: {}
      };
      
      if (activeSessions.size >= MAX_SESSIONS) {
        const oldestId = activeSessions.keys().next().value;
        if (oldestId) activeSessions.delete(oldestId);
      }
      activeSessions.set(id, session);
    }
    return session;
  }

  /**
   * Appends a user turn and updates context state
   */
  static recordUserTurn(conversationId: string, content: string): ConversationTurn {
    const session = this.getOrCreateSession(conversationId);
    const turn: ConversationTurn = {
      id: `turn_u_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      content
    };
    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();

    const state: ConversationContextState = session.contextState || {};
    const contentLower = content.toLowerCase();

    // Check for explicit models in user query
    for (const m of KNOWN_MODELS) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(contentLower)) {
        state.activeModel = m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        state.lastEntity = state.activeModel;
        state.lastEntityType = 'vehicle';
        break;
      }
    }

    // Check for explicit cities in user query
    for (const c of KNOWN_CITIES) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(contentLower)) {
        state.activeCity = c.charAt(0).toUpperCase() + c.slice(1);
        if (!state.activeModel) {
          state.lastEntity = state.activeCity;
          state.lastEntityType = 'region';
        }
        break;
      }
    }

    session.contextState = state;
    return turn;
  }

  /**
   * Appends an assistant response and updates entity/metric context state
   */
  static recordAssistantTurn(
    conversationId: string,
    response: UnifiedAssistantResponse
  ): ConversationTurn {
    const session = this.getOrCreateSession(conversationId);
    const turn: ConversationTurn = {
      id: `turn_a_${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content: response.answer || response.summary || 'Analysis complete.',
      responsePayload: response
    };
    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();

    const state: ConversationContextState = session.contextState || {};

    if (response.sql?.query) {
      state.lastSqlQuery = response.sql.query;
    }
    if (response.summary || response.answer) {
      state.lastSummary = response.summary || response.answer;
    }

    // Extract entity context from response data without polluting with status values
    if (response.data && response.data.length > 0) {
      const topRow = response.data[0];
      const cols = response.columns || Object.keys(topRow);
      
      const modelCol = cols.find(c => ['model', 'model_name', 'vehicle_model'].includes(c.toLowerCase()));
      if (modelCol && topRow[modelCol]) {
        state.activeModel = String(topRow[modelCol]);
        state.lastEntity = state.activeModel;
        state.lastEntityType = 'vehicle';
      }

      const cityCol = cols.find(c => ['city', 'location', 'region'].includes(c.toLowerCase()));
      if (cityCol && topRow[cityCol]) {
        state.activeCity = String(topRow[cityCol]);
        if (!modelCol) {
          state.lastEntity = state.activeCity;
          state.lastEntityType = 'region';
        }
      }

      const showroomCol = cols.find(c => ['showroom_name', 'dealer_name', 'dealership', 'assigned_dealer', 'dealer', 'showroom'].includes(c.toLowerCase()));
      if (showroomCol && topRow[showroomCol]) {
        state.activeShowroom = String(topRow[showroomCol]);
        state.lastEntity = state.activeShowroom;
        state.lastEntityType = 'showroom';
      }

      const channelCol = cols.find(c => ['sales_channel', 'lead_source', 'channel'].includes(c.toLowerCase()));
      if (channelCol && topRow[channelCol]) {
        state.activeChannel = String(topRow[channelCol]);
      }
    }

    if (response.diagnostics?.subjectName) {
      state.lastEntity = response.diagnostics.subjectName;
      state.lastEntityType = response.diagnostics.subjectType as any;
      if (state.lastEntityType === 'vehicle') state.activeModel = state.lastEntity;
      if (state.lastEntityType === 'showroom') state.activeShowroom = state.lastEntity;
    }

    session.contextState = state;
    return turn;
  }

  /**
   * Retrieves recent conversation turns formatted for context feeding
   */
  static getRecentHistory(conversationId?: string, maxTurns = 6): { role: 'user' | 'assistant'; content: string }[] {
    if (!conversationId) return [];
    const session = activeSessions.get(conversationId);
    if (!session || !session.turns || session.turns.length === 0) return [];

    return session.turns.slice(-maxTurns).map(t => ({
      role: t.role as 'user' | 'assistant',
      content: t.content
    }));
  }

  /**
   * Resolves contextual references in follow-up queries
   */
  static resolveContextualQuery(query: string, conversationId?: string): { resolvedQuery: string; contextEntity?: string; wasModified: boolean } {
    if (!conversationId) return { resolvedQuery: query, wasModified: false };

    const session = activeSessions.get(conversationId);
    if (!session || !session.contextState) {
      return { resolvedQuery: query, wasModified: false };
    }

    const state = session.contextState as ConversationContextState;
    const targetEntity = state.activeModel || state.activeShowroom || state.activeCity || state.lastEntity;
    const qTrimmed = query.trim();
    const qLower = qTrimmed.toLowerCase();

    let resolved = qTrimmed;
    let wasModified = false;

    // 1. Vehicle-specific pronoun resolution
    if (state.activeModel && (/\b(that car|this car|the car|that model|this model|these models)\b/i.test(resolved))) {
      resolved = resolved.replace(/\b(that car|this car|the car|that model|this model|these models)\b/gi, `"${state.activeModel}"`);
      wasModified = true;
    }

    // 2. Generic pronoun resolution
    if (targetEntity) {
      const PRONOUN_PATTERNS = [
        /\b(its|it's|it)\b/gi,
        /\b(that showroom|this showroom|the showroom|that dealership|the dealer|that dealer)\b/gi,
        /\b(that city|this city|the city|that hub)\b/gi,
        /\b(the previous result|that one|this one)\b/gi
      ];

      for (const pattern of PRONOUN_PATTERNS) {
        if (pattern.test(resolved)) {
          resolved = resolved.replace(pattern, `"${targetEntity}"`);
          wasModified = true;
          break;
        }
      }
    }

    // 3. Elliptical follow-up queries (e.g. "what about CNG?", "in Mumbai?", "only for Arena?", "and website leads?")
    const isEllipticalFollowUp =
      /^(\s*(and|now|what about|how about|show for|filter by|only in|in|for)\s+)/i.test(qLower) ||
      (qLower.split(' ').length <= 4 && !qLower.includes('what') && !qLower.includes('which') && !qLower.includes('show') && !qLower.includes('list') && !qLower.includes('give') && !qLower.includes('tell') && !qLower.includes('compare'));

    if (isEllipticalFollowUp && targetEntity && !resolved.includes(targetEntity)) {
      resolved = `${resolved} for "${targetEntity}"`;
      wasModified = true;
    }

    // 4. Comparison follow-ups (e.g. "compare with Swift")
    if (qLower.includes('compare') && targetEntity && !resolved.includes(targetEntity)) {
      resolved = `${resolved} (comparing with previous subject "${targetEntity}")`;
      wasModified = true;
    }

    return {
      resolvedQuery: resolved,
      contextEntity: targetEntity,
      wasModified
    };
  }
}
