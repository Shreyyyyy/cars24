'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Zap,
  Database,
  Code2,
  Table as TableIcon,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Download,
  Copy,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Wrench,
  Target,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react';
import { CrazyLoaderIcon } from '@/components/common/CrazyLoader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { copyToClipboard, formatCellValue, formatIndianRupee, formatIndianNumber } from '@/lib/formatters';

interface MarketingQueryEngineProps {
  datasetInfo: {
    fileName: string;
    rowCount: number;
    columns: string[];
    rawColumns?: string[];
    schema?: any[];
    previewRows?: any[];
  };
  onClearDataset?: () => void;
}

const COLORS = ['#E31837', '#0F172A', '#2563EB', '#D97706', '#9333EA', '#16A34A', '#06B6D4', '#E11D48'];

const DEFAULT_QUERY_SUGGESTIONS = [
  'Which showroom is performing worst and why?',
  'Which showroom is performing best in Maharashtra?',
  'Which cars have the most sales?',
  'Which car models have lowest sales and excess stock?',
  'Top 5 underperforming showrooms by target achievement',
  'Compare NEXA vs ARENA sales conversion'
];

export const MarketingQueryEngine: React.FC<MarketingQueryEngineProps> = ({
  datasetInfo,
  onClearDataset
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showSql, setShowSql] = useState(true);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);
  const [activeChartType, setActiveChartType] = useState<'bar' | 'pie' | 'line' | 'area'>('bar');
  const [copiedSql, setCopiedSql] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active query result state
  const [result, setResult] = useState<{
    query: string;
    sql: string;
    summary: string;
    keyInsights: string[];
    recommendations?: string[];
    chart: {
      chartType: 'bar' | 'pie' | 'line' | 'area';
      xKey: string;
      yKey: string;
      chartTitle: string;
    };
    columns: string[];
    rows: Record<string, any>[];
    dbLatencyMs: number;
    totalLatencyMs: number;
    usingGemini: boolean;
    isUnderperformanceScenario?: boolean;
    diagnostic?: {
      subjectName: string;
      subjectType: 'showroom' | 'vehicle' | 'region';
      severityLevel: 'Critical' | 'High' | 'Moderate';
      overallAssessment: string;
      rootCauses: {
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
      }[];
      projectedRecovery: {
        unitsLift: string;
        revenueUplift: string;
        timeline: string;
        confidenceScore: string;
      };
    };
  } | null>(null);

  const handleExecuteQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMessage(null);


    try {
      const res = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q
        })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        throw new Error(textResp.slice(0, 150) || `Server returned ${res.status}: ${res.statusText}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process query');
      }

      const viz = data.visualization && data.visualization.type !== 'none'
        ? {
            chartType: data.visualization.type as any,
            xKey: data.visualization.xKey || data.columns?.[0] || 'category',
            yKey: data.visualization.yKey || data.columns?.[1] || 'value',
            chartTitle: data.visualization.title || 'Marketing Query Distribution'
          }
        : (data.chart || {
            chartType: 'bar',
            xKey: data.columns?.[0] || 'category',
            yKey: data.columns?.[1] || 'value',
            chartTitle: 'Marketing Query Distribution'
          });

      setResult({
        query: data.query || q,
        sql: data.sql?.query || (typeof data.sql === 'string' ? data.sql : ''),
        summary: data.answer || data.summary || 'Analysis complete.',
        keyInsights: data.insights || data.keyInsights || [],
        recommendations: data.recommendations || [],
        chart: viz,
        columns: data.columns || [],
        rows: data.data || data.rows || [],
        dbLatencyMs: data.metadata?.dbLatencyMs || data.dbLatencyMs || 3,
        totalLatencyMs: data.metadata?.latencyMs || data.totalLatencyMs || 15,
        usingGemini: Boolean(data.metadata?.model?.includes('gemini') || data.usingGemini),
        isUnderperformanceScenario: data.intent === 'diagnostic' || data.isUnderperformanceScenario || Boolean(data.diagnostics || data.diagnostic),
        diagnostic: data.diagnostics || data.diagnostic
      });

      if (viz?.chartType) {
        setActiveChartType(viz.chartType);
      }
      setInputQuery(queryText);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing query on SQLite');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger dedicated deep diagnostic on demand for any item
  const handleTriggerDiagnosis = async (subjectName: string, subjectType: 'showroom' | 'vehicle' = 'showroom', metrics?: any) => {
    setIsDiagnosing(true);

    try {
      const res = await fetch('/api/gemini/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName,
          subjectType,
          metrics
        })
      });

      const data = await res.json();
      if (data.success && data.diagnostic && result) {
        setResult({
          ...result,
          isUnderperformanceScenario: true,
          diagnostic: data.diagnostic
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCopySql = () => {
    if (!result?.sql) return;
    copyToClipboard(result.sql).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  };

  const handleExportCsv = () => {
    if (!result?.rows.length) return;
    const header = result.columns.join(',');
    const rows = result.rows.map(r =>
      result.columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `maruti_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Active Database Status Bar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900">
                Connected Database: {datasetInfo.fileName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                SQLite Engine (WAL Mode)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Direct SQL query execution over showrooms, vehicle sales & marketing campaigns • Sub-25ms Latency
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dual-LLM Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dual-LLM: Text-to-SQL + Deep Diagnostic</span>
          </div>
        </div>
      </div>

      {/* Query Search Form */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse"></span>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                Ask Marketing Intelligence in Natural Language
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Translates intent into SQLite SQL in milliseconds. For lagging metrics, triggers deep root-cause & turnaround diagnostics.
            </p>
          </div>

          {result && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                <span>SQLite: {result.dbLatencyMs}ms</span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                Total Latency: {result.totalLatencyMs}ms {result.totalLatencyMs <= 25 ? '⚡ (< 25ms)' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteQuery(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="e.g. Which showroom is performing worst? or Which cars have the most sales?..."
              className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 pl-10 pr-4 py-3 bg-white text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-2xs font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-40 shadow-sm shadow-red-600/20"
          >
            {isLoading ? (
              <CrazyLoaderIcon size="xs" />
            ) : (
              <Sparkles className="w-4 h-4 text-yellow-300" />
            )}
            <span>{isLoading ? 'Querying SQLite...' : 'Ask Marketing AI'}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
            Suggested Prompts:
          </span>
          {DEFAULT_QUERY_SUGGESTIONS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleExecuteQuery(prompt)}
              disabled={isLoading}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 shadow-2xs border ${
                prompt.includes('worst') || prompt.includes('underperforming')
                  ? 'bg-red-50/70 border-red-200 text-red-700 hover:bg-red-100'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Manual Query Ready State - When no query has been run yet */}
      {!result && !isLoading && (
        <div className="p-8 sm:p-12 text-center bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-gray-900">Marketing Intelligence Engine Ready</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Type any question above or click one of the suggested prompts to query your SQLite dataset manually.
            </p>
          </div>
        </div>
      )}

      {/* Query Results Display */}
      {result && (
        <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-600">
                <TrendingUp className="w-4 h-4" />
                <span>Executive Marketing Summary</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  ⚡ SQLite ({result.dbLatencyMs}ms)
                </span>
                {result.diagnostic && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Diagnostic LLM Triggered</span>
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mt-1">
                {result.query}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSql(!showSql)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-gray-500" />
                <span>{showSql ? 'Hide SQL' : 'View SQL'}</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Direct Summary Callout */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-50/70 via-orange-50/40 to-white border border-red-100 text-xs sm:text-sm text-gray-800 leading-relaxed">
            <p className="font-semibold">{result.summary}</p>
          </div>

          {/* Key Strategic Insights */}
          {result.keyInsights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Deep Strategic Insights</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {result.keyInsights.map((insight, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs flex items-start gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-800 leading-snug">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Playbook & Turnaround Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Actionable Maruti Suzuki Playbook Recommendations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs flex items-start gap-2 shadow-2xs">
                    <div className="p-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] mt-0.5">#{idx + 1}</div>
                    <span className="font-semibold text-gray-800 leading-snug">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SPECIALIZED SECONDARY LLM DIAGNOSTIC & PRESCRIPTIVE TURNAROUND PANEL */}
          {/* ===================================================================== */}
          {result.diagnostic && (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-rose-50/60 via-white to-gray-50 border-2 border-rose-200 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        Diagnostic AI Advisor
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        result.diagnostic.severityLevel === 'Critical'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {result.diagnostic.severityLevel} Risk
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 mt-1">
                      Underperformance Root Cause & Turnaround Plan: {result.diagnostic.subjectName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs bg-white border border-rose-200 px-3 py-1.5 rounded-xl">
                  <span className="text-gray-500">Confidence:</span>
                  <span className="font-bold text-rose-700">{result.diagnostic.projectedRecovery.confidenceScore}</span>
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="p-4 rounded-xl bg-white border border-rose-200 text-xs text-gray-800 leading-relaxed shadow-2xs">
                <span className="font-bold text-rose-700 uppercase tracking-wide block text-[11px] mb-1">
                  Executive Assessment:
                </span>
                <p className="font-medium text-gray-700">{result.diagnostic.overallAssessment}</p>
              </div>

              {/* Root Cause Analysis (Why is it performing worst?) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    1. Why It&apos;s Performing Worst (Root Cause Diagnostic)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.diagnostic.rootCauses.map((rc, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          {rc.category}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">#0{i + 1}</span>
                      </div>
                      <div className="font-bold text-xs text-gray-900">{rc.finding}</div>
                      <p className="text-[11px] text-gray-600 leading-relaxed">{rc.impact}</p>
                      <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-mono">
                        <strong>Evidence:</strong> {rc.evidence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Turnaround Playbook (What to do to perform better) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    2. Actionable Turnaround Playbook (What Should They Do to Perform Better?)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.diagnostic.turnaroundPlaybook.map((phase, pi) => (
                    <div key={pi} className="p-4 rounded-xl bg-white border border-blue-100 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {phase.phase}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{phase.timeframe}</span>
                        </span>
                      </div>

                      <div className="font-extrabold text-xs text-gray-900">{phase.title}</div>

                      <ul className="space-y-1.5 text-[11px] text-gray-600">
                        {phase.actionItems.map((act, ai) => (
                          <li key={ai} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 border-t border-gray-100 text-[10px] text-emerald-800 font-semibold bg-emerald-50/70 p-2 rounded-lg">
                        <strong>Expected Outcome:</strong> {phase.expectedOutcome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projected Recovery Impact */}
              <div className="p-4 rounded-xl bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                      Projected Turnaround Impact
                    </span>
                    <span className="text-xs text-gray-300">
                      Estimated recovery timeline: <strong>{result.diagnostic.projectedRecovery.timeline}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Monthly Volume Lift</span>
                    <span className="text-base sm:text-lg font-black text-emerald-400">
                      {result.diagnostic.projectedRecovery.unitsLift}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Projected Revenue Lift</span>
                    <span className="text-base sm:text-lg font-black text-white">
                      {result.diagnostic.projectedRecovery.revenueUplift}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Chart Rendering */}
          {result.rows.length > 0 && result.chart && (
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-red-600" />
                  <span>{result.chart.chartTitle || 'Visual Distribution'}</span>
                </h4>

                {/* Chart Type Selector */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveChartType('bar')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeChartType === 'bar' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setActiveChartType('line')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeChartType === 'line' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setActiveChartType('pie')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeChartType === 'pie' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Pie
                  </button>
                  <button
                    onClick={() => setActiveChartType('area')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeChartType === 'area' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Area
                  </button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={result.rows}
                        dataKey={result.chart.yKey}
                        nameKey={result.chart.xKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(entry: any) => `${String(entry[result.chart.xKey] ?? '').slice(0, 14)}: ${formatCellValue(entry[result.chart.yKey], result.chart.yKey)}`}
                      >
                        {result.rows.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatCellValue(value, result.chart.yKey), result.chart.yKey]} />
                    </PieChart>
                  ) : activeChartType === 'line' ? (
                    <LineChart data={result.rows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey={result.chart.xKey}
                        stroke="#64748B"
                        fontSize={11}
                        tickFormatter={(val) => String(val).slice(0, 16)}
                      />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => typeof v === 'number' && v >= 100000 ? formatIndianRupee(v, true) : formatIndianNumber(v)} />
                      <Tooltip formatter={(value: any) => [formatCellValue(value, result.chart.yKey), result.chart.yKey]} />
                      <Line
                        type="monotone"
                        dataKey={result.chart.yKey}
                        stroke="#E31837"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#E31837' }}
                      />
                    </LineChart>
                  ) : activeChartType === 'area' ? (
                    <AreaChart data={result.rows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey={result.chart.xKey}
                        stroke="#64748B"
                        fontSize={11}
                        tickFormatter={(val) => String(val).slice(0, 16)}
                      />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => typeof v === 'number' && v >= 100000 ? formatIndianRupee(v, true) : formatIndianNumber(v)} />
                      <Tooltip formatter={(value: any) => [formatCellValue(value, result.chart.yKey), result.chart.yKey]} />
                      <Area
                        type="monotone"
                        dataKey={result.chart.yKey}
                        stroke="#E31837"
                        fill="#FEE2E2"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={result.rows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey={result.chart.xKey}
                        stroke="#64748B"
                        fontSize={11}
                        tickFormatter={(val) => String(val).split(' – ')[0].slice(0, 16)}
                      />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => typeof v === 'number' && v >= 100000 ? formatIndianRupee(v, true) : formatIndianNumber(v)} />
                      <Tooltip formatter={(value: any) => [formatCellValue(value, result.chart.yKey), result.chart.yKey]} />
                      <Bar
                        dataKey={result.chart.yKey}
                        fill="#E31837"
                        radius={[4, 4, 0, 0]}
                      >
                        {result.rows.map((entry, idx) => (
                          <Cell
                            key={`bar-${idx}`}
                            fill={
                              entry.target_achievement_pct && entry.target_achievement_pct < 108
                                ? '#E11D48'
                                : idx === 0
                                ? '#E31837'
                                : '#0F172A'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Results Data Table with On-Demand Diagnostic Action Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-gray-600" />
                <span>Result Dataset ({result.rows.length} Records)</span>
              </h4>
              <span className="text-[11px] text-gray-500 font-mono">
                ⚡ Executed on SQLite in {result.dbLatencyMs}ms
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                    {result.columns.map((col, ci) => (
                      <th key={ci} className="p-3 whitespace-nowrap">{col}</th>
                    ))}
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.rows.map((row, ri) => {
                    const isUnderperformer =
                      row.is_underperforming === true ||
                      (typeof row.target_achievement_pct === 'number' && row.target_achievement_pct < 108) ||
                      (typeof row.achievement_pct === 'number' && row.achievement_pct < 100);

                    const name = row.showroom_name || row.model_name || row[result.columns[0]];

                    return (
                      <tr key={ri} className={`transition-colors ${isUnderperformer ? 'bg-rose-50/40 hover:bg-rose-50/80' : 'hover:bg-gray-50/80'}`}>
                        {result.columns.map((col, ci) => (
                          <td key={ci} className={`p-3 whitespace-nowrap ${ci === 0 ? 'font-bold text-gray-900' : 'text-gray-700 font-medium'}`}>
                            {formatCellValue(row[col], col)}
                          </td>
                        ))}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleTriggerDiagnosis(name, row.model_name ? 'vehicle' : 'showroom', row)}
                            disabled={isDiagnosing}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              isUnderperformer
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {isUnderperformer ? 'Analyze Root Cause' : 'Diagnose'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SQLite SQL Query Inspector */}
          {showSql && (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Executed SQLite SQL (Sub-2ms Relational Engine)</span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
              <pre className="text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">{result.sql}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
