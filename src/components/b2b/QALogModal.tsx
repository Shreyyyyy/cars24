'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Clock,
  Sparkles,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { copyToClipboard } from '@/lib/formatters';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

export interface QALogItem {
  id: string;
  timestamp: string;
  sessionId: string;
  userQuery: string;
  resolvedQuery?: string;
  answer: string;
  intent?: string;
  rowCount?: number;
  detectedLanguage?: string;
  modelUsed?: string;
  status: string;
  createdAt: number;
}

interface QALogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery?: (query: string) => void;
}

export const QALogModal: React.FC<QALogModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery
}) => {
  const [logs, setLogs] = useState<QALogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/qa-log?limit=200');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to load QA logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all logged questions and answers?')) {
      return;
    }
    try {
      await fetch('/api/qa-log', { method: 'DELETE' });
      setLogs([]);
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User Question', 'Answer', 'Intent', 'Language', 'Model'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${(l.userQuery || '').replace(/"/g, '""')}"`,
      `"${(l.answer || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${l.intent || ''}"`,
      `"${l.detectedLanguage || ''}"`,
      `"${l.modelUsed || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `cars24_qa_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.userQuery.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.intent && item.intent.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesIntent =
        selectedIntent === 'all' || item.intent === selectedIntent;

      return matchesSearch && matchesIntent;
    });
  }, [logs, searchTerm, selectedIntent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center">
              <img src="/logo.png" alt="CARS24" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900">
                  Questions & Answers History
                </h3>
                <span className="text-[10px] font-bold bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">
                  {logs.length} Recorded
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Persistent audit history of queries, verified findings, and marketing strategy recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors"
              title="Refresh log"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Export Actions */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions or answers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-gray-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Q&A List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-600">No logged questions found</p>
              <p className="text-xs text-gray-400">
                {searchTerm ? 'Try adjusting your search filter.' : 'Ask questions in the AI Assistant to start logging.'}
              </p>
            </div>
          ) : (
            filteredLogs.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-3 transition-all hover:border-gray-300"
              >
                {/* Question Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5">
                      Q
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                        {item.userQuery}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.timestamp}</span>
                        </span>
                        {item.detectedLanguage && (
                          <span className="bg-gray-100 px-1.5 py-0.2 rounded font-medium text-gray-600">
                            {item.detectedLanguage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onSelectQuery && (
                      <button
                        onClick={() => {
                          onSelectQuery(item.userQuery);
                          onClose();
                        }}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        Ask Again
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(`Q: ${item.userQuery}\n\nA: ${item.answer}`, item.id)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                      title="Copy Q&A"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Answer Box with Markdown Rendering */}
                <div className="pl-6 border-l-2 border-red-500/30 ml-2 space-y-1">
                  <div className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl">
                    <MarkdownRenderer content={item.answer} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filteredLogs.length} of {logs.length} logged queries</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
