'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Copy,
  Check,
  TrendingUp,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  ArrowRight,
  BarChart3,
  Edit2,
  Rocket,
  Gauge
} from 'lucide-react';
import { copyToClipboard } from '@/lib/formatters';
import type { Lineage } from '@/types/chat';
import { ChatAnswer } from '@/components/b2b/ChatAnswer';
import { AgentRunPanel, LiveAgentRun } from '@/components/b2b/AgentRunPanel';
import type { RunEvent, RunTrace } from '@/lib/multi-agent/run-graph';
import { getActiveGeminiModel } from '@/lib/model-config';
import { getActiveOutputMode, OutputMode } from '@/lib/output-mode';
import { CHAT_SESSIONS_KEY, ACTIVE_SESSION_KEY, PENDING_QUESTION_KEY, OUTPUT_MODE_KEY, DEV_MODE_KEY, readSetting, writeSetting } from '@/lib/chat-storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  content: string;
  query?: string;
  intent?: string;
  modelUsed?: string;
  outputMode?: string;
  sql?: string;
  summary?: string;
  keyInsights?: string[];
  recommendations?: string[];
  clarificationOptions?: string[];
  keyMetrics?: { label: string; value: string; note?: string }[];
  followUps?: string[];
  /** Backtracking: tables, ranges, columns and joins behind the answer */
  lineage?: Lineage;
  ragChunks?: {
    id: string;
    category: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }[];
  chart?: {
    chartType: 'bar' | 'pie' | 'line' | 'area';
    xKey: string;
    yKey: string;
    chartTitle: string;
  };
  columns?: string[];
  rows?: Record<string, any>[];
  /** Result tables for the other parts of a multi-part question */
  sections?: { title: string; rows: Record<string, any>[]; columns: string[]; categoryCol?: string; valueCol?: string; chartType?: 'bar' | 'pie' | 'line' }[];
  /** Parts of the question the data cannot answer */
  missingData?: string[];
  /** Assumptions made when querying */
  assumptions?: string;
  dbLatencyMs?: number;
  totalLatencyMs?: number;
  usingGemini?: boolean;
  isUnderperformanceScenario?: boolean;
  diagnostic?: {
    subjectName: string;
    subjectType: 'showroom' | 'vehicle' | 'region' | 'channel';
    severityLevel: 'Critical' | 'High' | 'Moderate' | 'Low';
    overallAssessment: string;
    observedFacts?: string[];
    potentialExplanations?: {
      category: string;
      finding: string;
      impact: string;
      evidence: string;
      isHypothesis?: boolean;
    }[];
    rootCauses?: {
      category: string;
      finding: string;
      impact: string;
      evidence: string;
    }[];
    turnaroundPlaybook: {
      phase: string;
      timeframe: string;
      title: string;
      actionItems: string[];
      expectedOutcome: string;
      responsibleRole?: string;
      targetKpi?: string;
    }[];
    assumptionsAndLimitations?: string[];
    projectedRecovery?: {
      unitsLift: string;
      revenueUplift: string;
      timeline: string;
      confidenceScore: string;
      isScenarioEstimate?: boolean;
    };
  };
  evidencePackage?: any;
  agentExecutionPlan?: any;
  /** Path through the agent graph with time, tokens and cost (developer mode) */
  runTrace?: RunTrace;
  correlationId?: string;
  detectedLanguage?: string;
  cacheHit?: boolean;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  customTitle?: boolean;
  messages: ChatMessage[];
}

const SUGGESTED_QUESTIONS = [
  {
    category: 'Marketing mix',
    icon: BarChart3,
    prompt: 'How has our marketing spend and channel mix changed from FY22 to FY26, and what did each shift do to transactions?'
  },
  {
    category: 'Channel ROI',
    icon: TrendingUp,
    prompt: 'Which channels give the best return on the next rupee, and which are saturated, based on the FY26 marketing-mix model?'
  },
  {
    category: 'Budget reallocation',
    icon: Gauge,
    prompt: 'How should we reallocate the FY27 ₹118 crore marketing budget across channels to get the most incremental transactions?'
  },
  {
    category: 'Festive 2026 media',
    icon: Rocket,
    prompt: 'What should the Navratri–Diwali 2026 media plan look like by channel, city and week for seller and buyer demand?'
  }
];

const GREETING_EXACT_SET = new Set([
  'hi', 'hii', 'hiii', 'hello', 'helloo', 'hey', 'heyy', 'howdy', 'yo', 'sup',
  'namaste', 'namaskar', 'hola', 'bonjour', 'test', 'testing', 'ping', 'check',
  'ok', 'okay', 'k', 'cool', 'thanks', 'thank', 'thx', 'thank you', 'yes', 'no',
  'help', 'help me', 'bye', 'good morning', 'good afternoon', 'good evening',
  'hi hello', 'hello hi', 'hey hello', 'hi there', 'hello there', 'hey there'
]);

export function isGreetingOrTrivial(text: string): boolean {
  if (!text) return true;
  const cleaned = text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  if (!cleaned) return true;
  if (GREETING_EXACT_SET.has(cleaned)) return true;
  if (/^h[ie]+y*(\s+th?ere)?$/i.test(cleaned)) return true;
  if (/^hello+(\s+th?ere)?$/i.test(cleaned)) return true;
  if (/^good\s+(morning|afternoon|evening|day|night)$/i.test(cleaned)) return true;
  if (/^(what\s+can\s+you\s+do|who\s+are\s+you|introduce\s+yourself)$/i.test(cleaned)) return true;
  return false;
}

export function isDefaultOrGreetingTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (
    t === 'new marketing analysis' ||
    t === 'marketing insights' ||
    t === 'new conversation' ||
    t === 'new chat' ||
    t === 'untitled'
  ) {
    return true;
  }
  return isGreetingOrTrivial(title);
}

export function cleanQueryForTitle(text: string): string {
  let cleaned = text.trim();
  // Strip leading greetings with optional punctuation
  cleaned = cleaned.replace(
    /^(?:h[ie]+y*|hello+|howdy|namaste|namaskar|hola|good\s+(?:morning|afternoon|evening|day))(?:\s+th?ere)?[\s,:!.-]+/i,
    ''
  );
  // Strip conversational requests / polite openers
  cleaned = cleaned.replace(
    /^(?:can\s+you(?:\s+please)?|could\s+you(?:\s+please)?|please|would\s+you(?:\s+mind)?)\s+/i,
    ''
  );
  cleaned = cleaned.replace(
    /^(?:tell\s+me(?:\s+about)?|show\s+me(?:\s+the)?|give\s+me(?:\s+the)?|find(?:\s+me)?|display|fetch|i\s+want\s+to\s+(?:see|know|understand)|i\s+need\s+(?:to\s+know|the)?)\s+/i,
    ''
  );
  cleaned = cleaned.replace(
    /^(?:what\s+(?:is|are)\s+(?:the\s+)?|which\s+(?:is|are)\s+(?:the\s+)?)\s*/i,
    ''
  );
  cleaned = cleaned.replace(/[?.,!;:]+$/, '').trim();
  if (!cleaned) cleaned = text.trim().replace(/[?.,!;:]+$/, '');
  return cleaned;
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  const ACRONYMS = new Set([
    'suv', 'suvs', 'ev', 'evs', 'cng', 'amt', 'at', 'mt', 'roi', 'ga4', 'sla',
    'kpi', 'q1', 'q2', 'q3', 'q4', 'fy23', 'fy24', 'fy25', 'fy26', 'fy27', 'ai', 'ncr',
    'gmv', 'ebitda', 'c2b', 'b2c', 'rc', 'emi', 'cars24'
  ]);
  const LOWERCASE_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'vs', 'per'
  ]);
  const words = str.split(/\s+/);
  return words
    .map((w, idx) => {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (ACRONYMS.has(lower)) return w.toUpperCase();
      if (idx > 0 && LOWERCASE_WORDS.has(lower)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

export function truncateTitle(str: string, maxLength = 36): string {
  if (str.length <= maxLength) return str;
  const cut = str.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 16) return cut.slice(0, lastSpace) + '...';
  return cut.trim() + '...';
}

export function formatChatTitle(text: string): string {
  const cleaned = cleanQueryForTitle(text);
  const titled = toTitleCase(cleaned);
  return truncateTitle(titled, 36);
}

export const MarketingChatbot: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  /** Conversation list on the left; starts closed on narrow screens */
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => typeof window === 'undefined' || window.innerWidth >= 768);
  const [copiedUserMsgId, setCopiedUserMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  // Response length and developer mode are chosen in Settings
  const [devMode] = useState<boolean>(() => typeof window !== 'undefined' && readSetting(DEV_MODE_KEY) === 'true');
  const [liveEvents, setLiveEvents] = useState<RunEvent[]>([]);
  const [outputMode] = useState<OutputMode>(() => {
    const saved = typeof window !== 'undefined' ? readSetting(OUTPUT_MODE_KEY) : null;
    return saved && ['small', 'medium', 'large'].includes(saved) ? (saved as OutputMode) : getActiveOutputMode();
  });
  /** A question picked from the log in Settings, asked once the chat has loaded */
  const pendingQuestion = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize sessions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // AI keys are server-managed; remove any key a previous version stored in the browser.
      // Chats from earlier assistants are dropped so their answers never reach the analyst as history.
      for (const key of [
        'maruti_gemini_api_key', 'maruti_marketing_chat_sessions', 'maruti_analyst_chat_sessions',
        'maruti_open_session', 'maruti_pending_question', 'maruti_output_mode', 'maruti_dev_mode'
      ]) localStorage.removeItem(key);

      try {
        const saved = localStorage.getItem(CHAT_SESSIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Auto-heal saved sessions that previously got greeting titles like 'hi' or 'hello'
            const healed = parsed.map((s: ChatSession) => {
              if (!s.customTitle && isDefaultOrGreetingTitle(s.title)) {
                const firstMeaningful = s.messages?.find(
                  m => m.role === 'user' && !isGreetingOrTrivial(m.content)
                );
                if (firstMeaningful) {
                  return { ...s, title: formatChatTitle(firstMeaningful.content) };
                }
              }
              return s;
            });
            setSessions(healed);
            const requested = readSetting(ACTIVE_SESSION_KEY);
            writeSetting(ACTIVE_SESSION_KEY, null);
            const pending = readSetting(PENDING_QUESTION_KEY);
            writeSetting(PENDING_QUESTION_KEY, null);
            if (pending) {
              pendingQuestion.current = pending;
              createNewSession();
            } else {
              setActiveSessionId(healed.find((h: ChatSession) => h.id === requested)?.id || healed[0].id);
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Could not read chat sessions from localStorage:', e);
      }

      // Default new session if empty
      pendingQuestion.current = readSetting(PENDING_QUESTION_KEY);
      writeSetting(PENDING_QUESTION_KEY, null);
      createNewSession();
    }
  }, []);

  // Ask a question handed over from Settings once its conversation exists
  useEffect(() => {
    if (pendingQuestion.current && activeSessionId && sessions.some(x => x.id === activeSessionId)) {
      const q = pendingQuestion.current;
      pendingQuestion.current = null;
      handleSendMessage(q);
    }
  }, [activeSessionId, sessions]);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
      } catch (e) {
        console.warn('Could not save chat sessions:', e);
      }
    }
  }, [sessions]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isLoading]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // Create new session (an empty conversation is reused rather than stacking blank ones)
  const createNewSession = () => {
    const current = sessions.find(x => x.id === activeSessionId);
    if (current && current.messages.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Marketing Analysis',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openSession = (id: string) => {
    setActiveSessionId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsHistoryOpen(false);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(x => x.id !== id);
      if (remaining.length === 0) {
        const fresh: ChatSession = { id: `session_${Date.now()}`, title: 'New Marketing Analysis', createdAt: new Date().toISOString(), messages: [] };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (id === activeSessionId) setActiveSessionId(remaining[0].id);
      return remaining;
    });
  };

  // Past conversations, newest first, grouped by when they were last used (blank ones are hidden)
  const historyGroups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 24 * 60 * 60 * 1000;
    const groups: { label: string; items: ChatSession[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 days', items: [] },
      { label: 'Older', items: [] }
    ];
    const withTime = sessions
      .filter(x => x.messages.length > 0)
      .map(x => ({ x, t: new Date(x.updatedAt || x.createdAt).getTime() }))
      .sort((a, b) => b.t - a.t);
    for (const { x, t } of withTime) {
      const g = t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : 3;
      groups[g].items.push(x);
    }
    return groups.filter(g => g.items.length > 0);
  }, [sessions]);

  // Copy user message to clipboard
  const handleCopyUserMessage = async (text: string, msgId: string) => {
    if (!(await copyToClipboard(text))) return;
    setCopiedUserMsgId(msgId);
    setTimeout(() => setCopiedUserMsgId(null), 2000);
  };

  // Start editing a user message
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditInputText(msg.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditInputText('');
  };

  // Save edit and re-run (just like ChatGPT)
  const handleSaveEdit = async (msgId: string) => {
    const trimmed = editInputText.trim();
    if (!trimmed || isLoading) return;

    setEditingMsgId(null);
    setEditInputText('');

    const targetSessionId = activeSession?.id || activeSessionId;
    const currentSession = sessions.find(s => s.id === targetSessionId);
    if (!currentSession) return;

    const msgIndex = currentSession.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Retain only messages up to the edited message, with the edited text
    const priorHistoryMessages = currentSession.messages.slice(0, msgIndex);
    const updatedUserMsg: ChatMessage = {
      ...currentSession.messages[msgIndex],
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev =>
      prev.map(s => {
        if (s.id === targetSessionId) {
          let updatedTitle = s.title;
          if (!s.customTitle) {
            if (!isGreetingOrTrivial(trimmed)) {
              updatedTitle = formatChatTitle(trimmed);
            } else {
              const otherMeaningful = priorHistoryMessages.find(
                m => m.role === 'user' && !isGreetingOrTrivial(m.content)
              );
              updatedTitle = otherMeaningful ? formatChatTitle(otherMeaningful.content) : 'New Marketing Analysis';
            }
          }
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            title: updatedTitle,
            messages: [...priorHistoryMessages, updatedUserMsg]
          };
        }
        return s;
      })
    );

    const historyForBackend = priorHistoryMessages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    await handleSendMessage(trimmed, historyForBackend, targetSessionId);
  };

  // Handle send message
  const handleSendMessage = async (
    textToSend?: string,
    historyOverride?: { role: 'user' | 'assistant'; content: string }[],
    sessionIdOverride?: string
  ) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    if (!textToSend) setInputQuery('');

    const targetSessionId = sessionIdOverride || activeSession?.id || activeSessionId;

    if (!historyOverride) {
      const userMessage: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: text
      };

      // Update active session & auto-name title if it's currently a default/greeting and the new text is meaningful
      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            let newTitle = s.title;
            if (!s.customTitle && isDefaultOrGreetingTitle(s.title) && !isGreetingOrTrivial(text)) {
              newTitle = formatChatTitle(text);
            }
            return {
              ...s,
              title: newTitle,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, userMessage]
            };
          }
          return s;
        })
      );
    }

    setIsLoading(true);
    setLiveEvents([]);

    try {
      const currentConvId = targetSessionId;
      const priorHistory = historyOverride || (activeSession?.messages || [])
        .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      // Streamed so the agent graph can be followed live; the final line carries the answer
      const res = await fetch('/api/gemini/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          conversationId: currentConvId,
          history: priorHistory,
          mode: outputMode
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !res.body || !contentType.includes('ndjson')) {
        // Validation and rate-limit errors come back as plain JSON
        if (contentType.includes('application/json')) {
          const body = await res.json();
          throw new Error(body.error || `Server returned ${res.status}`);
        }
        const textResp = await res.text();
        throw new Error(textResp.slice(0, 150) || `Server returned ${res.status}: ${res.statusText}`);
      }

      let data: any = null;
      const handleLine = (line: string) => {
        if (!line.trim()) return;
        const msg = JSON.parse(line);
        if (msg.type === 'event') setLiveEvents(prev => [...prev, msg.event]);
        else if (msg.type === 'result') data = msg.data;
        else if (msg.type === 'error') throw new Error(msg.error || 'Failed to query database');
      };
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          handleLine(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
        }
      }
      handleLine(buffer + decoder.decode());

      if (!data?.success) {
        throw new Error('The connection closed before the answer arrived');
      }

      const botMessage: ChatMessage = {
        id: data.messageId || `msg_bot_${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.answer || data.summary || 'Analysis complete.',
        query: text,
        intent: data.intent,
        sql: data.sql?.query || data.sql,
        summary: data.summary,
        keyInsights: data.insights || data.keyInsights || [],
        recommendations: data.recommendations || [],
        clarificationOptions: data.clarificationOptions || [],
        keyMetrics: data.keyMetrics || [],
        followUps: data.followUps || [],
        lineage: data.lineage,
        ragChunks: data.sources || data.ragChunks || [],
        chart: data.visualization && data.visualization.type !== 'none'
          ? {
              chartType: data.visualization.type as any,
              xKey: data.visualization.xKey,
              yKey: data.visualization.yKey || (data.columns ? data.columns[1] : 'value'),
              chartTitle: data.visualization.title || 'Marketing Query Results'
            }
          : undefined,
        columns: data.columns || [],
        rows: data.data || data.rows || [],
        sections: data.sections || [],
        missingData: data.missingData || [],
        assumptions: data.assumptions,
        dbLatencyMs: data.metadata?.dbLatencyMs || data.dbLatencyMs || 0,
        totalLatencyMs: data.metadata?.latencyMs || data.totalLatencyMs || 0,
        usingGemini: Boolean(data.metadata?.model?.includes('gemini') || data.modelUsed?.includes('gemini') || data.usingGemini),
        modelUsed: data.modelUsed || data.model || data.metadata?.model || (data.usingGemini ? getActiveGeminiModel() : 'cars24-business-engine'),
        outputMode: data.metadata?.outputMode || outputMode,
        isUnderperformanceScenario: data.intent === 'diagnostic' || Boolean(data.diagnostics || data.diagnostic),
        diagnostic: data.diagnostics || data.diagnostic,
        evidencePackage: data.evidencePackage,
        agentExecutionPlan: data.agentExecutionPlan,
        runTrace: data.runTrace,
        correlationId: data.metadata?.correlationId,
        detectedLanguage: data.detectedLanguage
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            let updatedTitle = s.title;
            if (!s.customTitle && isDefaultOrGreetingTitle(updatedTitle)) {
              const meaningfulMsg = [...s.messages, botMessage].find(
                m => m.role === 'user' && !isGreetingOrTrivial(m.content)
              );
              if (meaningfulMsg) {
                updatedTitle = formatChatTitle(meaningfulMsg.content);
              }
            }
            return {
              ...s,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, botMessage]
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Sorry, I couldn't answer that. ${err.message || 'Something went wrong.'} Please try again or rephrase the question.`
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            return { ...s, messages: [...s.messages, errorMessage] };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
      setLiveEvents([]);
    }
  };

  const handleCopyMessage = (content: string, id: string) => {
    copyToClipboard(content).then(ok => {
      if (!ok) return;
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  const isEmpty = !activeSession || activeSession.messages.length === 0;

  return (
    <div className="flex h-full w-full bg-white">
      {/* Chat history */}
      {isHistoryOpen && (
        <aside className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between p-2">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              title="Hide chat history"
              aria-label="Hide chat history"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={createNewSession}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
              title="New conversation"
            >
              <SquarePen className="h-4 w-4" />
              <span>New chat</span>
            </button>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4" aria-label="Chat history">
            {historyGroups.length === 0 && (
              <p className="px-2.5 pt-2 text-xs text-gray-400">Your conversations will appear here.</p>
            )}
            {historyGroups.map(group => (
              <div key={group.label} className="space-y-0.5">
                <div className="px-2.5 pb-1 text-[11px] font-medium text-gray-400">{group.label}</div>
                {group.items.map(item => {
                  const isActive = item.id === activeSession?.id;
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center rounded-lg ${isActive ? 'bg-gray-200/80' : 'hover:bg-gray-200/50'}`}
                    >
                      <button
                        type="button"
                        onClick={() => openSession(item.id)}
                        disabled={isLoading}
                        className={`min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs ${isActive ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                        title={item.title}
                      >
                        {item.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSession(item.id)}
                        disabled={isLoading}
                        className="mr-1 rounded p-1 text-gray-400 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                        title="Delete conversation"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
      {!isHistoryOpen && (
        <div className="flex items-center gap-1 p-2">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            title="Show chat history"
            aria-label="Show chat history"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={createNewSession}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
            title="New conversation"
            aria-label="New conversation"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty && (
          <div className="mx-auto max-w-2xl space-y-8 pt-10 sm:pt-16">
            <div className="space-y-3 text-center">
              <img src="/logo-wordmark.png" alt="CARS24" className="mx-auto h-10 w-auto object-contain" />
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Ask about CARS24 marketing</h1>
              <p className="text-sm text-gray-500">
                Channel spend, media mix, marketing-mix model ROI and budget planning across five years — alongside buying, selling, financing, customers and P&L. Actuals to date, projections clearly marked.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-50"
                  >
                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-600" />
                    <span className="flex-1 space-y-1">
                      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.category}</span>
                      <span className="block text-[13px] leading-snug text-gray-700 group-hover:text-gray-900">{item.prompt}</span>
                    </span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">
          {activeSession?.messages.filter(m => m.role !== 'system').map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                /* User Bubble */
                <div className="flex justify-end gap-2.5 group relative">
                  {editingMsgId === msg.id ? (
                    <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-2xl border border-gray-300 bg-white p-3 space-y-2.5 shadow-sm">
                      <textarea
                        value={editInputText}
                        onChange={e => setEditInputText(e.target.value)}
                        className="w-full bg-gray-50 text-gray-900 text-sm rounded-xl p-2.5 border border-gray-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                        rows={Math.max(2, Math.min(6, editInputText.split('\n').length))}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(msg.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Enter to resend · Esc to cancel</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            disabled={!editInputText.trim() || isLoading}
                            className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Resend
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Action buttons (Copy & Edit) - visible on hover like GPT */}
                      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 self-center mr-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUserMessage(msg.content, msg.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                          title="Copy question"
                          aria-label="Copy question"
                        >
                          {copiedUserMsgId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                          title="Edit question"
                          aria-label="Edit question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-gray-100 px-4 py-2.5">
                        <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words select-text">{msg.content}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center">
                    <img src="/logo.png" alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <ChatAnswer
                      msg={msg}
                      copied={copiedMsgId === msg.id}
                      onCopy={text => handleCopyMessage(text, msg.id)}
                    />
                    {devMode && <AgentRunPanel run={msg.runTrace} correlationId={msg.correlationId} />}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                <img src="/logo.png" alt="" className="h-full w-full object-contain" />
              </div>
              {devMode ? <LiveAgentRun events={liveEvents} /> : (
                <div className="flex items-center gap-2 py-2 text-sm text-gray-500" role="status">
                  <span>Analysing</span>
                  <span className="flex gap-1" aria-hidden>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                  </span>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message box */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 pl-3 shadow-sm transition-all focus-within:border-gray-400 focus-within:shadow-md"
        >
          <textarea
            ref={inputRef}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
            placeholder="Ask a sales or marketing question"
            className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="flex flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 p-2.5 text-white transition-all hover:bg-indigo-700 disabled:opacity-40"
            title="Send"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          Figures are analytical estimates for planning. Validate key numbers before sharing externally.
        </p>
      </div>
      </div>
    </div>
  );
};
