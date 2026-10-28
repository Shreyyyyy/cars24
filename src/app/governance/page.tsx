'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  FileCode,
  Lock,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Database,
  Search,
  KeyRound,
  Layers,
  Sparkles
} from 'lucide-react';
import { SEMANTIC_METRICS_CATALOG, SemanticMetric } from '@/lib/semantic-catalog';
import { auditLogger, AuditLogEntry } from '@/lib/audit-logger';

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit' | 'schema' | 'evaluation'>('metrics');
  const [metricsList] = useState<SemanticMetric[]>(Object.values(SEMANTIC_METRICS_CATALOG));
  const [selectedMetric, setSelectedMetric] = useState<SemanticMetric>(metricsList[0]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [evalResults, setEvalResults] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    setAuditLogs(auditLogger.getLogs(30));
  }, [activeTab]);

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/v1/eval');
      const data = await res.json();
      setEvalResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Enterprise Governance & Auditing
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              OpenTelemetry v1.28
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Governance, Metric Catalog & Live Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Governed semantic metrics, parameter-safe SQL formulas, RBAC access policies, and real-time query observability logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-2 font-semibold rounded-lg transition-all ${
              activeTab === 'metrics' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semantic Metric Catalog
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 font-semibold rounded-lg transition-all ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-3.5 py-2 font-semibold rounded-lg transition-all ${
              activeTab === 'evaluation' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Golden Evaluation Benchmark
          </button>
        </div>
      </div>

      {/* Tab: Semantic Metric Catalog */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Approved Metrics Catalog ({metricsList.length})
            </div>
            {metricsList.map((m) => {
              const isSelected = selectedMetric.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMetric(m)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-red-400 shadow-md ring-1 ring-red-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {m.category}
                    </span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      v{m.version}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-2">{m.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{m.id}</div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Metric Specification: {selectedMetric.id}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  Approved & Governed
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedMetric.name}</h2>
              <p className="text-xs text-slate-500 mt-1">{selectedMetric.description}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Official Business Formula
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-slate-800 mt-1 font-semibold">
                  {selectedMetric.businessFormula}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Governed SQL Expression (SQLite / Postgres Compatible)
                </span>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs mt-1">
                  {selectedMetric.sqlExpression}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">Aggregation</div>
                  <div className="font-bold text-slate-800">{selectedMetric.aggregationType}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">Unit</div>
                  <div className="font-bold text-slate-800 capitalize">{selectedMetric.defaultUnit}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">Governance Level</div>
                  <div className="font-bold text-slate-800 capitalize">{selectedMetric.governanceLevel.replace('_', ' ')}</div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Supported Analytical Dimensions
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedMetric.supportedDimensions.map((d) => (
                    <span key={d} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
              <span>Owner: <strong className="text-slate-700">{selectedMetric.owner}</strong></span>
              <span>Updated: {selectedMetric.updatedAt}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">OpenTelemetry Audit Trail & Latency Observability</h3>
              <p className="text-xs text-slate-400 mt-0.5">Structured logs recording every SQL execution, diagnostic investigation, and RBAC verification.</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              ⚡ Sub-10ms Relational Queries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">User Role</th>
                  <th className="p-3 font-semibold">Query / Summary</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Latency Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      {log.userRole}
                    </td>
                    <td className="p-3 text-slate-800 max-w-xs truncate">
                      {log.querySummary}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'DENIED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-[11px] text-slate-600">
                      <span className="text-emerald-600 font-bold">{log.latencyBreakdownMs.totalMs}ms</span> (DB: {log.latencyBreakdownMs.dbExecutionMs}ms)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Evaluation Suite */}
      {activeTab === 'evaluation' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Automated Golden Evaluation Benchmark</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executes live test suite across Multilingual NLP, SQL AST security, EvidencePackage grounding, and forecasting accuracy.
              </p>
            </div>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEvaluating ? 'Running Evaluation...' : 'Run Golden Eval Suite'}</span>
            </button>
          </div>

          {evalResults && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-400 font-semibold">Total Test Cases</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{evalResults.summary.totalTests}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-semibold">Passed Tests</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">{evalResults.summary.passed}</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-700 font-semibold">Accuracy Rate</div>
                  <div className="text-2xl font-black text-blue-900 mt-1">{evalResults.summary.passRatePct}%</div>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="text-xs text-purple-700 font-semibold">Execution Latency</div>
                  <div className="text-2xl font-black text-purple-900 mt-1">{evalResults.summary.totalExecutionMs}ms</div>
                </div>
              </div>

              {/* Test List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Test Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evalResults.results.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800">{res.testName}</span>
                          <span className="text-[10px] text-slate-400 ml-2 font-mono">({res.category})</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{res.latencyMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
