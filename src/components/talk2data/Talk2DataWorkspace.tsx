'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Code2,
  Database,
  BarChart3,
  Send,
  HelpCircle,
  TrendingUp,
  Table as TableIcon,
  ChevronRight,
  Filter,
  CheckCircle2,
  Bot
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

interface Talk2DataResult {
  query: string;
  summary: string;
  sqlPreview: string;
  filtersApplied: string[];
  chartType: 'bar' | 'pie' | 'table';
  data: any[];
}

const SUGGESTED_QUERIES = [
  'Which car category has the highest demand?',
  'What are the most requested specifications?',
  'Show test ride interest in Gujarat.',
  'Which language is most frequently used?',
  'What are the common customer objections?',
  'Compare SUV and hatchback demand.',
  'Show daily enquiry trends.',
  'Which city has the most demo conversations?'
];

export const Talk2DataWorkspace: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<Talk2DataResult[]>([
    {
      query: 'Which car category has the highest demand?',
      summary: 'SUVs lead overall customer showroom demand by a significant margin, representing 43.3% of all enquiries (6,420 sessions), followed by Hatchbacks at 28.2%. The high interest is primarily propelled by Brezza and Grand Vitara Hybrid models.',
      sqlPreview: `SELECT 
    v.category AS body_style,
    COUNT(c.session_id) AS total_enquiries,
    ROUND(COUNT(c.session_id) * 100.0 / SUM(COUNT(c.session_id)) OVER(), 1) AS demand_share_pct
FROM demo_conversations c
JOIN vehicle_catalog v ON c.shortlisted_model_id = v.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY v.category
ORDER BY total_enquiries DESC;`,
      filtersApplied: ['Time Window: Last 30 Days', 'Channel: ARENA & NEXA', 'Status: Active Sessions'],
      chartType: 'bar',
      data: [
        { label: 'SUV', value: 6420, fill: '#E31837' },
        { label: 'Hatchback', value: 4180, fill: '#0F172A' },
        { label: 'Sedan', value: 2150, fill: '#2563EB' },
        { label: 'MPV', value: 1410, fill: '#D97706' },
        { label: 'EV', value: 660, fill: '#9333EA' }
      ]
    }
  ]);
  const [showSqlIndex, setShowSqlIndex] = useState<number | null>(0);

  const executeNaturalQuery = (queryText: string) => {
    const q = queryText.toLowerCase().trim();
    if (!q) return;

    let result: Talk2DataResult;

    if (q.includes('gujarat') || q.includes('ahmedabad')) {
      result = {
        query: queryText,
        summary: 'In Gujarat, 2,790 demo sessions were recorded. The top requested models are Swift (38%), WagonR S-CNG (32%), and Grand Vitara (20%). 64% of customers requested information in Gujarati (Roman script) or Hindi.',
        sqlPreview: `SELECT 
    v.model_name,
    COUNT(*) AS test_ride_enquiries,
    c.preferred_language
FROM demo_customer_sessions c
JOIN vehicle_catalog v ON c.preferred_model_id = v.id
WHERE c.state = 'Gujarat'
GROUP BY v.model_name, c.preferred_language
ORDER BY test_ride_enquiries DESC
LIMIT 5;`,
        filtersApplied: ['State: Gujarat', 'Cities: Ahmedabad, Vadodara, Surat', 'Period: Last 30 Days'],
        chartType: 'bar',
        data: [
          { label: 'Swift', value: 1060, fill: '#E31837' },
          { label: 'WagonR CNG', value: 890, fill: '#0F172A' },
          { label: 'Grand Vitara', value: 550, fill: '#2563EB' },
          { label: 'Dzire', value: 290, fill: '#D97706' }
        ]
      };
    } else if (q.includes('specification') || q.includes('requested') || q.includes('feature')) {
      result = {
        query: queryText,
        summary: 'Electric Sunroof is the single most inquired specification (requested in 76% of vehicle conversations), closely followed by 6 Airbags standard (72%) and Automatic transmission (65%).',
        sqlPreview: `SELECT 
    f.feature_name,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM demo_conversations), 1) AS request_pct
FROM conversation_feature_mentions f
GROUP BY f.feature_name
ORDER BY request_pct DESC
LIMIT 7;`,
        filtersApplied: ['Feature Domain: Comfort, Safety & Powertrain', 'All Channels'],
        chartType: 'bar',
        data: [
          { label: 'Electric Sunroof', value: 76, fill: '#E31837' },
          { label: '6 Airbags', value: 72, fill: '#0F172A' },
          { label: 'Automatic AT/AGS', value: 65, fill: '#2563EB' },
          { label: '360 Camera', value: 58, fill: '#9333EA' },
          { label: 'Factory CNG', value: 52, fill: '#16A34A' }
        ]
      };
    } else if (q.includes('language')) {
      result = {
        query: queryText,
        summary: 'English comprises 55.7% of demo showroom assistant conversations, while Roman-script Indic languages account for the remaining 44.3% (Hindi 29.8%, Gujarati 8.4%, Marathi 6.1%).',
        sqlPreview: `SELECT 
    language_code,
    COUNT(*) AS total_conversations,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS share_percentage
FROM demo_conversations
GROUP BY language_code
ORDER BY total_conversations DESC;`,
        filtersApplied: ['Script: Romanized Multi-lingual', 'Sessions: All 14,820'],
        chartType: 'pie',
        data: [
          { label: 'English', value: 55.7, fill: '#E31837' },
          { label: 'Hindi (Roman)', value: 29.8, fill: '#0F172A' },
          { label: 'Gujarati (Roman)', value: 8.4, fill: '#2563EB' },
          { label: 'Marathi (Roman)', value: 6.1, fill: '#D97706' }
        ]
      };
    } else if (q.includes('city') || q.includes('conversations')) {
      result = {
        query: queryText,
        summary: 'Mumbai and Delhi NCR generate the highest volume of demo conversations, registering 3,840 and 3,410 sessions respectively, driven by strong hybrid and compact SUV inquiries.',
        sqlPreview: `SELECT 
    city,
    state,
    COUNT(*) AS conversation_volume
FROM demo_customer_sessions
GROUP BY city, state
ORDER BY conversation_volume DESC
LIMIT 6;`,
        filtersApplied: ['Granularity: City Level', 'Sort: Descending Volume'],
        chartType: 'bar',
        data: [
          { label: 'Mumbai', value: 3840, fill: '#E31837' },
          { label: 'Delhi NCR', value: 3410, fill: '#0F172A' },
          { label: 'Ahmedabad', value: 2790, fill: '#2563EB' },
          { label: 'Pune', value: 1840, fill: '#D97706' },
          { label: 'Jaipur', value: 1150, fill: '#9333EA' }
        ]
      };
    } else {
      result = {
        query: queryText,
        summary: `Analysis of demo showroom activity for "${queryText}": Overall customer purchase intent is high (68.2%), with SUV and compact sedan models driving over 57% of test ride requests across the network.`,
        sqlPreview: `SELECT 
    v.category,
    AVG(c.engagement_duration_sec) AS avg_duration,
    COUNT(c.test_ride_ref) AS test_rides_booked
FROM demo_conversations c
JOIN vehicle_catalog v ON c.model_id = v.id
WHERE c.intent_keyword ILIKE '%${queryText.replace(/[^a-zA-Z0-9 ]/g, '')}%'
GROUP BY v.category;`,
        filtersApplied: ['Intent Filter: Dynamic Match', 'Source: Showroom Telemetry'],
        chartType: 'bar',
        data: [
          { label: 'SUV Segment', value: 43.3, fill: '#E31837' },
          { label: 'Hatchback', value: 28.2, fill: '#0F172A' },
          { label: 'Sedan', value: 14.5, fill: '#2563EB' },
          { label: 'MPV', value: 9.5, fill: '#D97706' },
          { label: 'EV', value: 4.5, fill: '#16A34A' }
        ]
      };
    }

    setQueryHistory(prev => [result, ...prev]);
    setCurrentQuery('');
    setShowSqlIndex(0);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Talk2Data – Showroom Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Ask questions about demo showroom activity in natural language. Powered by local synthetic analytics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeNaturalQuery(currentQuery);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="e.g. Which car category has the highest demand? or Show test ride interest in Gujarat..."
              className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 pl-10 pr-4 py-3 bg-white text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={!currentQuery.trim()}
            className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-40 shadow-sm shadow-red-600/20"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Analyze</span>
          </button>
        </form>

        {/* Suggested Queries Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
            Suggested:
          </span>
          {SUGGESTED_QUERIES.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => executeNaturalQuery(q)}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-gray-200 text-gray-700 text-xs font-medium transition-all flex-shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Answers Stream */}
      <div className="space-y-6">
        {queryHistory.map((item, index) => (
          <div
            key={index}
            className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-5 animate-in fade-in duration-200"
          >
            {/* Question Asked */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                  {item.query}
                </h3>
              </div>
              <button
                onClick={() => setShowSqlIndex(showSqlIndex === index ? null : index)}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showSqlIndex === index ? 'Hide SQL' : 'Preview SQL'}</span>
              </button>
            </div>

            {/* Natural Language Summary */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm text-gray-800 leading-relaxed font-sans">
              <span className="font-bold text-red-600 block text-xs uppercase tracking-wider mb-1">
                Natural Language Insight:
              </span>
              {item.summary}
            </div>

            {/* Filter Tags */}
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>
              {item.filtersApplied.map((f, fi) => (
                <span key={fi} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                  {f}
                </span>
              ))}
            </div>

            {/* Generated Chart / Visualizer */}
            <div className="pt-2">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {item.chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={item.data}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={(entry: any) => `${entry?.label}: ${entry?.value}%`}
                      >
                        {item.data.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={item.data}>
                      <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {item.data.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* SQL Preview Box (Collapsible) */}
            {showSqlIndex === index && (
              <div className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>Safe Read-Only SQL Query (Simulation)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    Not Executed on External DB
                  </span>
                </div>
                <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">{item.sqlPreview}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <DemoActionBanner
        variant="compact"
        customMessage="TALK2DATA ENGINE: Uses client-side rule inference to generate visual analytics and synthetic queries without external AI endpoints."
      />
    </div>
  );
};
