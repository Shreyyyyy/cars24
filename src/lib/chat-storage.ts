/**
 * Browser storage shared by the chat page and the settings page.
 */

/** Saved conversations (the chat page writes them; settings lists, opens and deletes them) */
export const CHAT_SESSIONS_KEY = 'cars24_analyst_chat_sessions';
/** Conversation the chat page should open next (set by settings) */
export const ACTIVE_SESSION_KEY = 'cars24_open_session';
/** Question the chat page should ask on load (set from the question log in settings) */
export const PENDING_QUESTION_KEY = 'cars24_pending_question';
export const OUTPUT_MODE_KEY = 'cars24_output_mode';
export const DEV_MODE_KEY = 'cars24_dev_mode';

export interface StoredSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  messages: { role: string; content: string }[];
}

export function readSessions(): StoredSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSessions(sessions: StoredSession[]): void {
  try {
    if (sessions.length) localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    else localStorage.removeItem(CHAT_SESSIONS_KEY);
  } catch {
    // storage full or blocked: settings changes are best-effort
  }
}

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // per-browser preference only
  }
}
