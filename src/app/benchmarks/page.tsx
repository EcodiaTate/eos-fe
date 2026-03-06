"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  BenchmarkHealthResponse,
  BenchmarkSnapshotResponse,
  BenchmarkAllTrendsResponse,
  BenchmarkTrendResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";

// ─── Constants ────────────────────────────────────────────────────────────────

const METRICS = [
  "effective_intelligence_ratio",
  "compression_ratio",
  "decision_quality",
  "llm_dependency",
  "economic_ratio",
  "learning_rate",
  "mutation_success_rate",
] as const;

type Metric = (typeof METRICS)[number];

const METRIC_META: Record<
  Metric,
  { label: string; description: string; unit: string; lowerIsBetter: boolean; max: number | null; master?: boolean }
> = {
  effective_intelligence_ratio: {
    label: "Effective Intelligence",
    description: "Telos: effective_I / nominal_I — master constitutional alignment metric",
    unit: "%",
    lowerIsBetter: false,
    max: 1,
    master: true,
  },
  compression_ratio: {
    label: "Compression Ratio",
    description: "Logos: K(reality) / K(model) — intelligence ratio (higher = better world model)",
    unit: "×",
    lowerIsBetter: false,
    max: null,
  },
  decision_quality: {
    label: "Decision Quality",
    description: "% of Nova outcomes rated positive",
    unit: "%",
    lowerIsBetter: false,
    max: 1,
  },
  llm_dependency: {
    label: "LLM Dependency",
    description: "% of decisions requiring LLM slow path (lower is better)",
    unit: "%",
    lowerIsBetter: true,
    max: 1,
  },
  economic_ratio: {
    label: "Economic Ratio",
    description: "Income / expenses — metabolic health (>1.0 healthy)",
    unit: "×",
    lowerIsBetter: false,
    max: null,
  },
  learning_rate: {
    label: "Learning Rate",
    description: "Hypotheses newly confirmed in collection window",
    unit: "",
    lowerIsBetter: false,
    max: null,
  },
  mutation_success_rate: {
    label: "Mutation Success",
    description: "% of Simula proposals approved",
    unit: "%",
    lowerIsBetter: false,
    max: 1,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtValue(metric: Metric, value: number | null): string {
  if (value === null) return "—";
  const meta = METRIC_META[metric];
  if (meta.unit === "%" && meta.max === 1) return `${(value * 100).toFixed(1)}%`;
  if (meta.unit === "×") return `${value.toFixed(3)}×`;
  if (meta.unit === "") return value.toFixed(1);
  return String(value);
}

function metricColor(
  metric: Metric,
  value: number | null,
  rollingAvg: number | null,
  regressedMetrics: string[],
): string {
  if (value === null) return "text-white/30";
  if (regressedMetrics.includes(metric)) return "text-red-400";
  if (rollingAvg === null) return "text-white/70";
  const { lowerIsBetter } = METRIC_META[metric];
  const delta = lowerIsBetter
    ? (rollingAvg - value) / (rollingAvg || 1)
    : (value - rollingAvg) / (rollingAvg || 1);
  if (delta >= 0.05) return "text-emerald-400";
  if (delta <= -0.1) return "text-amber-400";
  return "text-white/80";
}

function formatInterval(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// ─── Micro-chart (SVG sparkline) ──────────────────────────────────────────────

function Sparkline({
  points,
  metric,
  regressed,
}: {
  points: { time: string; value: number | null }[];
  metric: Metric;
  regressed: boolean;
}) {
  const validPoints = points
    .map((p, i) => ({ i, v: p.value }))
    .filter((p): p is { i: number; v: number } => p.v !== null);

  if (validPoints.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-white/20 text-xs">
        insufficient data
      </div>
    );
  }

  const W = 280;
  const H = 64;
  const PAD = 6;
  const n = points.length;
  const vals = validPoints.map((p) => p.v);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;

  const scaleX = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const scaleY = (v: number) => H - PAD - ((v - minV) / rangeV) * (H - PAD * 2);

  // Build path from valid points only
  const d = validPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${scaleX(p.i).toFixed(1)},${scaleY(p.v).toFixed(1)}`)
    .join(" ");

  // Area fill path
  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];
  const area = `${d} L${scaleX(last.i).toFixed(1)},${H} L${scaleX(first.i).toFixed(1)},${H} Z`;

  const strokeColor = regressed ? "#f87171" : "#2dd4bf";
  const fillId = `fill-${metric}`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-16">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Latest point dot */}
      <circle
        cx={scaleX(last.i).toFixed(1)}
        cy={scaleY(last.v).toFixed(1)}
        r="3"
        fill={strokeColor}
      />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  metric,
  snapshot,
  trend,
  regressed,
}: {
  metric: Metric;
  snapshot: BenchmarkSnapshotResponse | null;
  trend: BenchmarkTrendResponse | undefined;
  regressed: boolean;
}) {
  const meta = METRIC_META[metric];
  const value = snapshot?.[metric] ?? null;
  const rollingAvg = trend?.rolling_avg ?? null;
  const hasError = snapshot?.errors?.[metric];
  const isMaster = meta.master === true;

  const valueClass = metricColor(metric, value, rollingAvg, regressed ? [metric] : []);

  // Delta vs rolling avg
  let deltaLabel: string | null = null;
  if (value !== null && rollingAvg !== null) {
    const { lowerIsBetter } = meta;
    const pct = ((value - rollingAvg) / (rollingAvg || 1)) * 100;
    const dir = lowerIsBetter ? pct <= 0 : pct >= 0;
    const sign = pct >= 0 ? "+" : "";
    deltaLabel = `${sign}${pct.toFixed(1)}% vs avg${dir ? "" : " ⚠"}`;
  }

  return (
    <div
      className={`rounded-xl border backdrop-blur p-4 flex flex-col gap-3 ${
        regressed
          ? "border-red-500/40 bg-red-950/20"
          : isMaster
          ? "border-violet-500/40 bg-violet-950/20 shadow-[0_0_24px_rgba(139,92,246,0.08)]"
          : "border-white/[0.06] bg-slate-800/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`text-xs font-semibold uppercase tracking-widest ${isMaster ? "text-violet-400/70" : "text-white/30"}`}>
            {meta.label}
            {isMaster && <span className="ml-1.5 text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded px-1 py-0.5 normal-case tracking-normal">master</span>}
          </div>
          <div className={`font-bold tabular-nums mt-1 ${isMaster ? "text-4xl" : "text-2xl"} ${valueClass}`}>
            {fmtValue(metric, value)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {regressed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">
              Regressed
            </span>
          )}
          {hasError && (
            <span
              className="text-[10px] text-amber-400/80 truncate max-w-[120px]"
              title={hasError}
            >
              ⚠ collection error
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {trend && trend.points.length > 0 ? (
        <Sparkline points={trend.points} metric={metric} regressed={regressed} />
      ) : (
        <div className="h-16 flex items-center justify-center text-white/15 text-xs">
          no trend data
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-white/30">
        <span>{meta.description}</span>
        {deltaLabel && (
          <span className={value !== null && rollingAvg !== null && value >= rollingAvg !== meta.lowerIsBetter ? "text-amber-400/70" : "text-white/40"}>
            {deltaLabel}
          </span>
        )}
      </div>

      {rollingAvg !== null && (
        <div className="text-[11px] text-white/25">
          Rolling avg: {fmtValue(metric, rollingAvg)}
        </div>
      )}
    </div>
  );
}

// ─── Regression Alert Panel ───────────────────────────────────────────────────

function RegressionAlert({ regressions }: { regressions: string[] }) {
  if (regressions.length === 0) return null;
  return (
    <div className="rounded-xl border-2 border-red-500/60 bg-red-500/8 p-5 animate-pulse-slow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)] animate-ping absolute" />
        <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
        <span className="text-base font-bold text-red-300 uppercase tracking-widest">
          {regressions.length} Active Regression{regressions.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {regressions.map((m) => {
          const meta = METRIC_META[m as Metric];
          return (
            <div key={m} className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70">
                {meta?.label ?? m}
              </div>
              <div className="text-xs text-red-300/80 mt-0.5">{meta?.description ?? m}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({ health }: { health: BenchmarkHealthResponse | null }) {
  if (!health) return null;

  const regressions = health.currently_regressed;
  const isHealthy = health.status === "healthy" && regressions.length === 0;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
        !isHealthy
          ? "border-red-500/30 bg-red-500/5"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isHealthy ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]"
          }`}
        />
        <span className={`text-sm font-medium ${isHealthy ? "text-emerald-300" : "text-red-300"}`}>
          {isHealthy ? "All KPIs nominal" : `${regressions.length} KPI${regressions.length > 1 ? "s" : ""} regressed`}
        </span>
        {regressions.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {regressions.map((m) => (
              <span key={m} className="text-[11px] bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">
                {METRIC_META[m as Metric]?.label ?? m}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-white/30 shrink-0">
        <span>Runs: {health.total_runs.toLocaleString()}</span>
        <span>Regressions fired: {health.total_regressions_fired.toLocaleString()}</span>
        <span>Interval: {formatInterval(health.interval_s)}</span>
        <span>Window: {health.rolling_window} snapshots</span>
        {health.latest_snapshot_time && (
          <span>Last: {formatRelativeTime(health.latest_snapshot_time)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Raw Snapshot Table ───────────────────────────────────────────────────────

function SnapshotTable({ snapshot }: { snapshot: BenchmarkSnapshotResponse | null }) {
  if (!snapshot) {
    return (
      <div className="text-center text-white/25 py-10 text-sm">
        No snapshot data yet — waiting for first collection cycle.
      </div>
    );
  }

  const hasAnyError = Object.keys(snapshot.errors).length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-700/40 px-3 py-2">
          <span className="text-white/40 text-xs">Snapshot time</span>
          <div className="text-white/80 mt-0.5 font-mono text-xs">
            {new Date(snapshot.time).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-slate-700/40 px-3 py-2">
          <span className="text-white/40 text-xs">Instance</span>
          <div className="text-white/80 mt-0.5 font-mono text-xs">{snapshot.instance_id}</div>
        </div>
      </div>

      {hasAnyError && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="text-xs font-semibold text-amber-400 mb-2">Collection errors</div>
          {Object.entries(snapshot.errors).map(([metric, err]) => (
            <div key={metric} className="text-xs text-amber-300/70 font-mono">
              <span className="text-amber-400/60">{metric}:</span> {err}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Metric
              </th>
              <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Value
              </th>
              <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const value = snapshot[metric];
              const meta = METRIC_META[metric];
              const hasErr = !!snapshot.errors[metric];
              return (
                <tr key={metric} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-medium text-white/70">{meta.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    {hasErr ? (
                      <span className="text-amber-400/70 text-xs">error</span>
                    ) : (
                      <span className={value !== null ? "text-white/85" : "text-white/25"}>
                        {fmtValue(metric, value)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-white/30 text-xs">{meta.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(snapshot.raw).length > 0 && (
        <details className="group">
          <summary className="text-[11px] text-white/25 cursor-pointer hover:text-white/40 select-none">
            Raw debug data
          </summary>
          <pre className="mt-2 rounded-lg bg-slate-900/60 border border-white/[0.04] px-4 py-3 text-[11px] text-white/40 font-mono overflow-x-auto">
            {JSON.stringify(snapshot.raw, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Trend Detail View ────────────────────────────────────────────────────────

function TrendDetail({
  metric,
  trend,
}: {
  metric: Metric;
  trend: BenchmarkTrendResponse | undefined;
}) {
  const meta = METRIC_META[metric];
  if (!trend || trend.points.length === 0) {
    return (
      <div className="text-center text-white/25 py-10 text-sm">
        No trend data for {meta.label}.
      </div>
    );
  }

  // Compute min/max
  const valid = trend.points.filter((p): p is { time: string; value: number } => p.value !== null);
  const vals = valid.map((p) => p.value);
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-[11px] text-white/30 uppercase tracking-widest">{meta.label}</div>
          <div className="text-3xl font-bold tabular-nums text-white/85 mt-1">
            {fmtValue(metric, trend.latest)}
          </div>
        </div>
        {trend.rolling_avg !== null && (
          <div className="text-sm text-white/40">
            Rolling avg: <span className="text-white/60">{fmtValue(metric, trend.rolling_avg)}</span>
          </div>
        )}
        <div className="text-sm text-white/25">
          {trend.points.length} data points · {valid.length} non-null
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-slate-800/40 p-4">
        <Sparkline points={trend.points} metric={metric} regressed={false} />
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          {valid.length > 0 && (
            <>
              <span>{new Date(valid[0].time).toLocaleDateString()}</span>
              <span>{new Date(valid[valid.length - 1].time).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-slate-700/40 px-3 py-2 text-center">
          <div className="text-white/25 text-[11px]">Min</div>
          <div className="text-white/70 font-mono tabular-nums">{fmtValue(metric, minV)}</div>
        </div>
        <div className="rounded-lg bg-slate-700/40 px-3 py-2 text-center">
          <div className="text-white/25 text-[11px]">Max</div>
          <div className="text-white/70 font-mono tabular-nums">{fmtValue(metric, maxV)}</div>
        </div>
        <div className="rounded-lg bg-slate-700/40 px-3 py-2 text-center">
          <div className="text-white/25 text-[11px]">Points</div>
          <div className="text-white/70 font-mono tabular-nums">{trend.points.length}</div>
        </div>
      </div>

      {/* Point table */}
      <div className="rounded-lg border border-white/[0.06] overflow-hidden max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-3 py-2 text-white/25 font-semibold uppercase tracking-widest">
                Time
              </th>
              <th className="text-right px-3 py-2 text-white/25 font-semibold uppercase tracking-widest">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {[...trend.points].reverse().map((p, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-3 py-1.5 text-white/40 font-mono">
                  {new Date(p.time).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-mono text-white/70">
                  {fmtValue(metric, p.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "trends" | "snapshot";

export default function BenchmarksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedMetric, setSelectedMetric] = useState<Metric>("decision_quality");

  const { data: health, loading: healthLoading } = useApi(
    () => api.benchmarksHealth(),
    { intervalMs: 30_000 },
  );

  const { data: snapshot, loading: snapshotLoading } = useApi(
    () => api.benchmarksLatest(),
    { intervalMs: 60_000 },
  );

  const { data: allTrends, loading: trendsLoading } = useApi(
    () => api.benchmarksAllTrends(),
    { intervalMs: 60_000 },
  );

  const regressedSet = useMemo(
    () => new Set(health?.currently_regressed ?? []),
    [health],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "KPI Overview" },
    { id: "trends", label: "Trend Explorer" },
    { id: "snapshot", label: "Latest Snapshot" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
          title="Benchmarks — Performance Tracking"
          description="7-KPI physiological performance monitoring: effective intelligence (master), compression ratio, decision quality, LLM dependency, economic health, learning rate, mutation success"
        />

        {/* Status Banner */}
        {healthLoading && !health ? (
          <div className="rounded-xl border border-white/[0.06] bg-slate-800/40 px-4 py-3 text-sm text-white/30 animate-pulse">
            Loading benchmark health…
          </div>
        ) : (
          <StatusBanner health={health} />
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-700/60 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-cyan-600/80 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview: KPI Cards Grid */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <RegressionAlert regressions={health?.currently_regressed ?? []} />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {METRICS.map((metric) => (
                <KpiCard
                  key={metric}
                  metric={metric}
                  snapshot={snapshot}
                  trend={allTrends?.trends[metric]}
                  regressed={regressedSet.has(metric)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Trend Explorer */}
        {activeTab === "trends" && (
          <div className="grid grid-cols-[220px_1fr] gap-6">
            {/* Metric selector */}
            <div className="space-y-1">
              {METRICS.map((metric) => {
                const meta = METRIC_META[metric];
                const isRegressed = regressedSet.has(metric);
                return (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      selectedMetric === metric
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{meta.label}</span>
                      {isRegressed && (
                        <span className="text-[9px] bg-red-500/20 text-red-400 rounded px-1 py-0.5">
                          ⚠
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/25 mt-0.5">
                      {allTrends?.trends[metric]
                        ? fmtValue(metric, allTrends.trends[metric].latest)
                        : "—"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Trend detail panel */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-800/50 backdrop-blur p-6">
              {trendsLoading && !allTrends ? (
                <div className="text-white/30 text-sm animate-pulse">Loading trends…</div>
              ) : (
                <TrendDetail
                  metric={selectedMetric}
                  trend={allTrends?.trends[selectedMetric]}
                />
              )}
            </div>
          </div>
        )}

        {/* Raw Snapshot */}
        {activeTab === "snapshot" && (
          <div className="rounded-xl border border-white/[0.06] bg-slate-800/50 backdrop-blur p-6">
            {snapshotLoading && !snapshot ? (
              <div className="text-white/30 text-sm animate-pulse">Loading snapshot…</div>
            ) : (
              <SnapshotTable snapshot={snapshot} />
            )}
          </div>
        )}
    </div>
  );
}
