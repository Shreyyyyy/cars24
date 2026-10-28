'use client';

/**
 * Developer view of one question's run through the agent graph: the live graph while it runs, and a
 * collapsed "Agent run" bar under each answer that expands into the graph map, a timeline, the LLM
 * calls (tokens and cost) and the SQL executed. Only rendered when developer mode is on.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Workflow, ChevronDown, ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { CrazyThinkingBubble, CrazyLoaderIcon } from '@/components/common/CrazyLoader';
import {
  RUN_GRAPH_NODES,
  RUN_GRAPH_EDGES,
  RunGraphNode,
  RunNodeId,
  RunNodeStatus,
  RunTrace,
  RunEvent,
  buildRunFromEvents,
  runNodeLabel
} from '@/lib/multi-agent/run-graph';
import { copyToClipboard } from '@/lib/formatters';

export function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function formatUsd(usd: number): string {
  if (!usd) return '$0';
  return usd < 0.01 ? `$${usd.toFixed(6)}` : `$${usd.toFixed(4)}`;
}

const formatTokens = (n: number) => n.toLocaleString('en-IN');

/** A run's cost, flagging calls on models with no configured price (GEMINI_PRICING_JSON) instead of showing $0 */
function formatRunCost(run: RunTrace): string {
  if (!run.unpricedCalls) return formatUsd(run.costUsd);
  return run.costUsd ? `${formatUsd(run.costUsd)} +${run.unpricedCalls} unpriced` : `unpriced (${run.unpricedCalls} call${run.unpricedCalls === 1 ? '' : 's'})`;
}

// ---------------------------------------------------------------------------
// Graph map
// ---------------------------------------------------------------------------

const NODE_W = 100;
const NODE_H = 44;
const COL_GAP = 112;
const ROW_GAP = 62;
const PAD = 14;
const MAX_COL = Math.max(...RUN_GRAPH_NODES.map(n => n.col));
const MAX_ROW = Math.max(...RUN_GRAPH_NODES.map(n => n.row));
const GRAPH_W = PAD * 2 + MAX_COL * COL_GAP + NODE_W;
const GRAPH_H = PAD * 2 + MAX_ROW * ROW_GAP + NODE_H;

const pos = (n: RunGraphNode) => ({ x: PAD + n.col * COL_GAP, y: PAD + n.row * ROW_GAP });
const nodeById = new Map(RUN_GRAPH_NODES.map(n => [n.id, n]));

function edgePath(from: RunGraphNode, to: RunGraphNode): { d: string; mx: number; my: number } {
  const a = pos(from);
  const b = pos(to);
  let sx: number, sy: number, tx: number, ty: number;
  if (b.x > a.x) {
    sx = a.x + NODE_W; sy = a.y + NODE_H / 2; tx = b.x; ty = b.y + NODE_H / 2;
    const c = Math.max(24, (tx - sx) / 2);
    return { d: `M${sx},${sy} C${sx + c},${sy} ${tx - c},${ty} ${tx},${ty}`, mx: (sx + tx) / 2, my: (sy + ty) / 2 };
  }
  if (b.x === a.x) {
    // Same column: side-by-side vertical lanes so a round trip (down and back) shows as two arrows
    const down = b.y > a.y;
    const off = down ? -14 : 14;
    sx = a.x + NODE_W / 2 + off; sy = down ? a.y + NODE_H : a.y;
    tx = b.x + NODE_W / 2 + off; ty = down ? b.y : b.y + NODE_H;
    return { d: `M${sx},${sy} L${tx},${ty}`, mx: sx + (down ? -4 : 4), my: (sy + ty) / 2 };
  }
  // Backwards: leave from the bottom, arrive on the right side
  sx = a.x + NODE_W / 2; sy = a.y + NODE_H; tx = b.x + NODE_W; ty = b.y + NODE_H / 2;
  return { d: `M${sx},${sy} C${sx},${ty} ${tx + 30},${ty} ${tx},${ty}`, mx: (sx + tx) / 2, my: ty - 6 };
}

interface NodeAggregate {
  status: RunNodeStatus;
  ms: number;
  costUsd: number;
  llmCalls: number;
  visits: number;
  firstOrder: number;
}

function aggregateNodes(run: RunTrace | null, nowMs: number): Map<RunNodeId, NodeAggregate> {
  const out = new Map<RunNodeId, NodeAggregate>();
  for (const v of run?.nodes || []) {
    const prev = out.get(v.id);
    const ms = (v.endMs ?? nowMs) - v.startMs;
    out.set(v.id, {
      status: v.status === 'running' || prev?.status === 'running' ? 'running' : v.status,
      ms: (prev?.ms || 0) + Math.max(0, ms),
      costUsd: (prev?.costUsd || 0) + v.costUsd,
      llmCalls: (prev?.llmCalls || 0) + v.llmCalls,
      visits: (prev?.visits || 0) + 1,
      firstOrder: prev?.firstOrder ?? v.order
    });
  }
  return out;
}

const STATUS_STYLE: Record<RunNodeStatus | 'idle', { fill: string; stroke: string; text: string; dash?: string }> = {
  idle: { fill: '#ffffff', stroke: '#e2e8f0', text: '#94a3b8' },
  running: { fill: '#fffbeb', stroke: '#f59e0b', text: '#92400e' },
  completed: { fill: '#ecfdf5', stroke: '#10b981', text: '#065f46' },
  skipped: { fill: '#f8fafc', stroke: '#94a3b8', text: '#475569', dash: '4 3' },
  failed: { fill: '#fef2f2', stroke: '#ef4444', text: '#991b1b' }
};

export function RunGraphMap({
  run,
  nowMs,
  selected,
  onSelect
}: {
  run: RunTrace | null;
  nowMs?: number;
  selected?: RunNodeId | null;
  onSelect?: (id: RunNodeId) => void;
}) {
  const agg = aggregateNodes(run, nowMs ?? run?.totalMs ?? 0);
  const taken = new Map<string, { labels: string[] }>();
  for (const e of run?.edges || []) {
    const key = `${e.from}>${e.to}`;
    const entry = taken.get(key) || { labels: [] };
    if (e.label && !entry.labels.includes(e.label)) entry.labels.push(e.label);
    taken.set(key, entry);
  }
  const staticKeys = new Set(RUN_GRAPH_EDGES.map(e => `${e.from}>${e.to}`));
  const edges = [
    ...RUN_GRAPH_EDGES.filter(e => !e.onlyWhenTaken || taken.has(`${e.from}>${e.to}`)),
    ...(run?.edges || []).filter(e => !staticKeys.has(`${e.from}>${e.to}`))
      .filter((e, i, all) => all.findIndex(o => o.from === e.from && o.to === e.to) === i)
  ];
  const activeNode = run?.active[run.active.length - 1];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/60">
      <svg width={GRAPH_W} height={GRAPH_H} viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} className="block" role="img" aria-label="Agent graph for this question">
        <defs>
          <marker id="run-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#cbd5e1" />
          </marker>
          <marker id="run-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#dc2626" />
          </marker>
        </defs>

        {edges.map(e => {
          const from = nodeById.get(e.from);
          const to = nodeById.get(e.to);
          if (!from || !to) return null;
          const hot = taken.get(`${e.from}>${e.to}`);
          const { d, mx, my } = edgePath(from, to);
          const label = hot ? hot.labels.join(' / ') : '';
          return (
            <g key={`${e.from}>${e.to}`}>
              <path
                d={d}
                fill="none"
                stroke={hot ? '#dc2626' : '#cbd5e1'}
                strokeWidth={hot ? 2 : 1}
                strokeDasharray={hot ? undefined : '3 3'}
                markerEnd={`url(#run-arrow-${hot ? 'hot' : 'dim'})`}
              />
              {label && (
                <text x={mx} y={my - 4} textAnchor="middle" fontSize="9" fill="#b91c1c" fontWeight={600}>
                  {label.length > 22 ? `${label.slice(0, 21)}…` : label}
                </text>
              )}
            </g>
          );
        })}

        {RUN_GRAPH_NODES.map(n => {
          const a = agg.get(n.id);
          const style = STATUS_STYLE[a?.status || 'idle'];
          const { x, y } = pos(n);
          const isSelected = selected === n.id;
          const isActive = activeNode === n.id;
          const visit = run?.nodes.filter(v => v.id === n.id).pop();
          return (
            <g
              key={n.id}
              onClick={() => a && onSelect?.(n.id)}
              style={{ cursor: a && onSelect ? 'pointer' : 'default' }}
              className={isActive ? 'animate-pulse' : undefined}
            >
              <title>{`${n.label}${visit?.summary ? `\n${visit.summary}` : ''}`}</title>
              <rect
                x={x} y={y} width={NODE_W} height={NODE_H} rx={8}
                fill={style.fill} stroke={isSelected ? '#0f172a' : style.stroke}
                strokeWidth={isSelected ? 2 : a ? 1.5 : 1} strokeDasharray={style.dash}
              />
              <text x={x + NODE_W / 2} y={y + 17} textAnchor="middle" fontSize="10" fontWeight={700} fill={style.text}>
                {n.label}
              </text>
              <text x={x + NODE_W / 2} y={y + 32} textAnchor="middle" fontSize="9" fill={a ? style.text : '#cbd5e1'}>
                {a
                  ? a.status === 'running'
                    ? `running… ${formatMs(a.ms)}`
                    : `${formatMs(a.ms)}${a.costUsd ? ` · ${formatUsd(a.costUsd)}` : ''}${a.visits > 1 ? ` ×${a.visits}` : ''}`
                  : n.llm ? 'LLM' : ''}
              </text>
              {a && n.id !== 'input' && (
                <g>
                  <circle cx={x + 2} cy={y + 2} r={7.5} fill="#0f172a" />
                  <text x={x + 2} y={y + 5} textAnchor="middle" fontSize="8.5" fontWeight={700} fill="#ffffff">{a.firstOrder - 1}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details (timeline, LLM calls, SQL, JSON)
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="truncate text-[11px] font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Timeline({ run, onSelect }: { run: RunTrace; onSelect: (id: RunNodeId) => void }) {
  const total = Math.max(run.totalMs, 1);
  const visits = run.nodes.filter(v => v.id !== 'input');
  // Indent stages that ran inside another one (e.g. recovery inside the SQL agent)
  const depth = new Map(visits.map(v => [v.order, visits.filter(u =>
    u.order < v.order && u.startMs <= v.startMs && (u.endMs ?? total) > v.startMs).length]));
  return (
    <div className="space-y-1">
      {visits.map(v => {
        const end = v.endMs ?? total;
        const left = (v.startMs / total) * 100;
        const width = Math.max(0.6, ((end - v.startMs) / total) * 100);
        const color = STATUS_STYLE[v.status].stroke;
        return (
          <button
            key={v.order}
            type="button"
            onClick={() => onSelect(v.id)}
            className="grid w-full grid-cols-[150px_1fr_110px] items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-slate-50"
            title={v.summary}
          >
            <span className="truncate text-[11px] font-semibold text-slate-700" style={{ paddingLeft: (depth.get(v.order) || 0) * 10 }}>
              {v.order - 1}. {v.label}{v.via ? <span className="font-normal text-slate-400"> ({v.via})</span> : null}
            </span>
            <span className="relative h-2.5 rounded bg-slate-100">
              <span className="absolute top-0 h-2.5 rounded" style={{ left: `${left}%`, width: `${width}%`, background: color }} />
            </span>
            <span className="text-right font-mono text-[10px] text-slate-500">
              {formatMs(end - v.startMs)}{v.costUsd ? ` · ${formatUsd(v.costUsd)}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LLMCallsTable({ run }: { run: RunTrace }) {
  if (!run.llmCalls.length) return <p className="text-[11px] text-slate-500">No LLM calls in this run.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10.5px]">
        <thead>
          <tr className="text-left text-[9px] uppercase tracking-wider text-slate-400">
            <th className="py-1 pr-2">#</th><th className="pr-2">Agent</th><th className="pr-2">Purpose</th><th className="pr-2">Model</th>
            <th className="pr-2">Status</th><th className="pr-2 text-right">Time</th><th className="pr-2 text-right">In tok</th>
            <th className="pr-2 text-right">Out tok</th><th className="text-right">Cost</th>
          </tr>
        </thead>
        <tbody className="font-mono text-slate-700">
          {run.llmCalls.map((c, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1 pr-2">{i + 1}</td>
              <td className="pr-2 font-sans">{c.node ? runNodeLabel(c.node) : '-'}</td>
              <td className="pr-2">{c.purpose}</td>
              <td className="pr-2">{c.model}</td>
              <td className={`pr-2 ${c.status === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{c.status}</td>
              <td className="pr-2 text-right">{formatMs(c.latencyMs)}</td>
              <td className="pr-2 text-right">{formatTokens(c.inputTokens)}</td>
              <td className="pr-2 text-right">{formatTokens(c.outputTokens)}</td>
              <td className="text-right">{c.costUsd === null ? 'unpriced' : formatUsd(c.costUsd)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-300 font-bold">
            <td colSpan={5} className="py-1 font-sans">Total</td>
            <td className="pr-2 text-right">{formatMs(run.llmMs)}</td>
            <td className="pr-2 text-right">{formatTokens(run.inputTokens)}</td>
            <td className="pr-2 text-right">{formatTokens(run.outputTokens)}</td>
            <td className="text-right">{formatRunCost(run)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SQLList({ run, node }: { run: RunTrace; node?: RunNodeId | null }) {
  const sqls = node ? run.sqls.filter(s => s.node === node) : run.sqls;
  if (!sqls.length) return <p className="text-[11px] text-slate-500">No SQL executed{node ? ' in this stage' : ''}.</p>;
  return (
    <div className="space-y-2">
      {sqls.map((s, i) => (
        <div key={i} className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-2 py-1 text-[10px]">
            <span className="font-semibold text-slate-600">{s.node ? runNodeLabel(s.node) : '-'} · at {formatMs(s.atMs)}</span>
            <span className={s.error ? 'font-semibold text-red-600' : 'text-emerald-700'}>
              {s.error ? `error: ${s.error.slice(0, 80)}` : `${s.rows} rows · ${formatMs(s.ms || 0)}`}
            </span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-2 py-1.5 font-mono text-[10px] text-slate-700">{s.sql}</pre>
        </div>
      ))}
    </div>
  );
}

function NodeDetail({ run, id }: { run: RunTrace; id: RunNodeId }) {
  const visits = run.nodes.filter(v => v.id === id);
  const calls = run.llmCalls.filter(c => c.node === id);
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="text-[11px] font-bold text-slate-800">{runNodeLabel(id)}</div>
      {visits.map(v => (
        <div key={v.order} className="text-[11px] text-slate-600">
          <span className="font-mono text-slate-500">
            step {v.order - 1} · {formatMs(v.startMs)} → {v.endMs !== undefined ? formatMs(v.endMs) : '…'} · {v.status}
            {v.via ? ` · via ${v.via}` : ''}
          </span>
          {v.summary && <p className="mt-0.5 whitespace-pre-wrap break-words">{v.summary}</p>}
        </div>
      ))}
      {calls.length > 0 && (
        <div className="text-[10.5px] font-mono text-slate-600">
          {calls.map((c, i) => (
            <div key={i}>
              LLM {c.purpose} · {c.model} · {formatMs(c.latencyMs)} · {formatTokens(c.inputTokens)} in / {formatTokens(c.outputTokens)} out · {c.costUsd === null ? 'unpriced' : formatUsd(c.costUsd)}
            </div>
          ))}
        </div>
      )}
      {run.sqls.some(s => s.node === id) && <SQLList run={run} node={id} />}
    </div>
  );
}

type Tab = 'graph' | 'timeline' | 'llm' | 'sql' | 'json';

function RunDetails({ run }: { run: RunTrace }) {
  const [tab, setTab] = useState<Tab>('graph');
  const [selected, setSelected] = useState<RunNodeId | null>(null);
  const [copied, setCopied] = useState(false);
  const select = (id: RunNodeId) => setSelected(prev => (prev === id ? null : id));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'graph', label: 'Graph' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'llm', label: `LLM calls (${run.llmCallCount})` },
    { id: 'sql', label: `SQL (${run.sqls.length})` },
    { id: 'json', label: 'JSON' }
  ];

  return (
    <div className="space-y-2.5 border-t border-slate-200 p-3">
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 sm:grid-cols-6">
        <Stat label="Asked at" value={new Date(run.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })} />
        <Stat label="Total time" value={formatMs(run.totalMs)} />
        <Stat label="LLM / DB time" value={`${formatMs(run.llmMs)} / ${formatMs(run.dbMs)}`} />
        <Stat label="Cost" value={formatRunCost(run)} />
        <Stat label="Tokens in / out" value={`${formatTokens(run.inputTokens)} / ${formatTokens(run.outputTokens)}`} />
        <Stat label="Intent · status" value={`${run.intent || '-'} · ${run.status}${run.cacheHit ? ' (cache)' : ''}`} />
        <Stat label="Model" value={run.model || '-'} />
        <Stat label="Correlation id" value={<span className="font-mono">{run.correlationId}</span>} />
        {run.resolvedQuery && run.resolvedQuery !== run.question && (
          <div className="col-span-3 sm:col-span-4"><Stat label="Resolved question" value={run.resolvedQuery} /></div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-2.5 py-1 text-[11px] font-bold ${tab === t.id ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'graph' && (
        <div className="space-y-2">
          <RunGraphMap run={run} selected={selected} onSelect={select} />
          <p className="text-[10px] text-slate-400">
            Red arrows are the path this question took; numbers are the order agents ran. Click a node for its details.
          </p>
          {selected && <NodeDetail run={run} id={selected} />}
        </div>
      )}
      {tab === 'timeline' && (
        <div className="space-y-2">
          <Timeline run={run} onSelect={select} />
          {selected && <NodeDetail run={run} id={selected} />}
        </div>
      )}
      {tab === 'llm' && <LLMCallsTable run={run} />}
      {tab === 'sql' && <SQLList run={run} />}
      {tab === 'json' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => copyToClipboard(JSON.stringify(run, null, 2)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <pre className="max-h-80 overflow-auto rounded-md bg-slate-900 p-2.5 font-mono text-[10px] text-slate-100">{JSON.stringify(run, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public components
// ---------------------------------------------------------------------------

/** Collapsed bar under an answer; expands into the saved run. Loads it from the server if not stored in the chat. */
export function AgentRunPanel({ run, correlationId }: { run?: RunTrace | null; correlationId?: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<RunTrace | null>(null);
  const [loadError, setLoadError] = useState('');
  const trace = run || loaded;

  useEffect(() => {
    if (!open || trace || !correlationId) return;
    fetch(`/api/agent-runs?id=${encodeURIComponent(correlationId)}`)
      .then(r => r.json())
      .then(d => (d.success ? setLoaded(d.run) : setLoadError(d.error || 'Run not found')))
      .catch(e => setLoadError(e.message));
  }, [open, trace, correlationId]);

  if (!trace && !correlationId) return null;

  const path = trace?.nodes.filter(n => n.id !== 'input' && n.id !== 'answer').map(n => n.label).join(' → ');

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-50"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />}
        <Workflow className="h-3.5 w-3.5 flex-shrink-0 text-red-600" />
        <span className="font-bold text-slate-700">Agent run</span>
        {trace ? (
          <>
            <span className="font-mono">{formatMs(trace.totalMs)}</span>
            <span className="font-mono">{formatRunCost(trace)}</span>
            <span>{trace.llmCallCount} LLM call{trace.llmCallCount === 1 ? '' : 's'}</span>
            <span className="min-w-0 flex-1 truncate text-slate-400">{path}</span>
          </>
        ) : (
          <span className="text-slate-400">saved run {correlationId}</span>
        )}
      </button>
      {open && (trace
        ? <RunDetails run={trace} />
        : <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">{loadError || 'Loading run…'}</p>)}
    </div>
  );
}

/** Shown while a question is being answered: which agent is running now, with the live graph on demand. */
export function LiveAgentRun({ events }: { events: RunEvent[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const run = useMemo(() => buildRunFromEvents(events), [events]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const elapsed = run ? Math.max(0, now - Date.parse(run.startedAt)) : 0;
  const current = run?.active[run.active.length - 1];
  const recent = events.filter(e => e.type !== 'run_start').slice(-8);

  return (
    <div className="flex-1 min-w-0 space-y-2">
      <CrazyThinkingBubble
        title={current ? `${runNodeLabel(current)}…` : 'Analysing your data…'}
        elapsedMs={elapsed}
        costUsd={run?.costUsd}
        llmCalls={run?.llmCallCount}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-expanded={open}
        >
          <Workflow className="h-3.5 w-3.5 text-red-600" />
          {open ? 'Hide graph' : 'Live graph'}
        </button>
      </CrazyThinkingBubble>

      {open && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs space-y-2">
          <RunGraphMap run={run} nowMs={elapsed} />
          <ol className="space-y-0.5 font-mono text-[10px] text-slate-500">
            {recent.map((e, i) => (
              <li key={i}>{describeEvent(e)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function describeEvent(e: RunEvent): string {
  switch (e.type) {
    case 'node_start': return `${formatMs(e.atMs).padStart(7)}  ▶ ${runNodeLabel(e.node)}${e.via ? ` (${e.via})` : ''}`;
    case 'node_end': return `${formatMs(e.atMs).padStart(7)}  ■ ${runNodeLabel(e.node)} ${e.status}${e.summary ? `: ${e.summary.slice(0, 90)}` : ''}`;
    case 'llm_call': return `${formatMs(e.call.atMs).padStart(7)}  ✦ LLM ${e.call.purpose} ${e.call.model} ${formatMs(e.call.latencyMs)} ${e.call.costUsd === null ? '' : formatUsd(e.call.costUsd)}`;
    case 'sql': return `${formatMs(e.sql.atMs).padStart(7)}  ⛁ SQL ${e.sql.error ? `error: ${e.sql.error.slice(0, 60)}` : `${e.sql.rows} rows`}`;
    case 'run_end': return `${formatMs(e.atMs).padStart(7)}  ✓ ${e.status}`;
    default: return '';
  }
}
