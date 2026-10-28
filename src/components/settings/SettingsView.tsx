'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MessageSquare, Trash2, Workflow, AlignLeft, Sparkles } from 'lucide-react';
import { QALogModal } from '@/components/b2b/QALogModal';
import { OUTPUT_MODE_CONFIGS, OutputMode, getActiveOutputMode } from '@/lib/output-mode';
import {
  ACTIVE_SESSION_KEY,
  DEV_MODE_KEY,
  OUTPUT_MODE_KEY,
  PENDING_QUESTION_KEY,
  StoredSession,
  readSessions,
  readSetting,
  writeSessions,
  writeSetting
} from '@/lib/chat-storage';

function Card({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const questionCount = (s: StoredSession) => s.messages.filter(m => m.role === 'user').length;

export const SettingsView: React.FC = () => {
  const router = useRouter();
  const [outputMode, setOutputMode] = useState<OutputMode>('medium');
  const [devMode, setDevMode] = useState(false);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const savedMode = readSetting(OUTPUT_MODE_KEY);
    setOutputMode(savedMode && ['small', 'medium', 'large'].includes(savedMode) ? (savedMode as OutputMode) : getActiveOutputMode());
    setDevMode(readSetting(DEV_MODE_KEY) === 'true');
    setSessions(readSessions().filter(s => s.messages?.length > 0));
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setAiConfigured(Boolean(data?.ai?.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  const chooseMode = (mode: OutputMode) => {
    setOutputMode(mode);
    writeSetting(OUTPUT_MODE_KEY, mode);
  };

  const toggleDevMode = () => {
    setDevMode(prev => {
      writeSetting(DEV_MODE_KEY, String(!prev));
      return !prev;
    });
  };

  const openSession = (id: string) => {
    writeSetting(ACTIVE_SESSION_KEY, id);
    router.push('/');
  };

  const deleteSession = (id: string) => {
    const remaining = readSessions().filter(s => s.id !== id);
    writeSessions(remaining);
    setSessions(remaining.filter(s => s.messages?.length > 0));
  };

  const clearAll = () => {
    if (!confirm('Delete all conversations? This cannot be undone.')) return;
    writeSessions([]);
    setSessions([]);
  };

  const askAgain = (question: string) => {
    writeSetting(PENDING_QUESTION_KEY, question);
    router.push('/');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Preferences for this browser, your conversations and the question log.</p>
      </div>

      <Card icon={AlignLeft} title="Answer length" description="How much detail the assistant gives in each answer.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(['small', 'medium', 'large'] as OutputMode[]).map(mode => {
            const cfg = OUTPUT_MODE_CONFIGS[mode];
            const selected = outputMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => chooseMode(mode)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  selected ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-pressed={selected}
              >
                <div className="text-xs font-semibold text-gray-900">{mode === 'small' ? 'Concise' : mode === 'medium' ? 'Standard' : 'Detailed'}</div>
                <div className="mt-0.5 text-[11px] text-gray-500">{cfg.tagline}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card icon={MessageSquare} title="Conversations" description="Open a past conversation in the chat, or delete it.">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400">No saved conversations yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {sessions.map(s => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <button type="button" onClick={() => openSession(s.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs font-medium text-gray-900 hover:text-indigo-700">{s.title}</div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(s.updatedAt || s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{questionCount(s)} {questionCount(s) === 1 ? 'question' : 'questions'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Delete conversation"
                    aria-label={`Delete ${s.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={clearAll} className="text-xs font-medium text-gray-500 hover:text-red-600">
              Delete all conversations
            </button>
          </>
        )}
      </Card>

      <Card icon={Clock} title="Question log" description="Every question asked on this server, with its answer. Pick one to ask it again.">
        <button
          type="button"
          onClick={() => setIsLogOpen(true)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Open question log
        </button>
      </Card>

      <Card icon={Workflow} title="Developer mode" description="Shows each answer's processing steps, timing, tokens and cost under the reply.">
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={devMode}
            onClick={toggleDevMode}
            className={`relative h-5 w-9 rounded-full transition-colors ${devMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${devMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-gray-700">{devMode ? 'On' : 'Off'}</span>
        </label>
      </Card>

      <Card icon={Sparkles} title="AI engine" description="The model is configured on the server with GEMINI_API_KEY and GEMINI_MODEL.">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
          aiConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {aiConfigured === null ? 'Checking…' : aiConfigured ? 'Connected' : 'Not configured'}
        </span>
      </Card>

      <QALogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} onSelectQuery={askAgain} />
    </div>
  );
};
