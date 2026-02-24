"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  BudgetTier,
  LLMMetricsResponse,
  LLMSystemMetrics,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// ─── Constants ──────────────────────────────────────────────────

const TIER_CONFIG: Record<
  BudgetTier,
  { label: string; color: string; bg: string; border: string; glow: string; variant: "success" | "warning" | "danger" }
> = {
  green: {
    label: "GREEN",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    variant: "success",
  },
  yellow: {
    label: "YELLOW",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    variant: "warning",
  },
  red: {
    label: "RED",
    color: "#ef4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]",
    variant: "danger",
  },
};

const SYSTEM_PRIORITY: Record<string, "critical" | "standard" | "low"> = {
  "equor.invariants": "critical",
  "equor.alignment": "critical",
  "nova.efe.pragmatic": "standard",
  "nova.efe.epistemic": "standard",
  "voxis.render": "standard",
  "voxis.conversation": "standard",
  "thymos.diagnosis": "standard",
  "thread.scene": "low",
  "thread.chapter": "low",
  "thread.life_story": "low",
  "thread.schema": "low",
  "thread.evidence": "low",
  "evo.hypothesis": "low",
  "evo.evidence": "low",
  "evo.procedure": "low",
  "oneiros.rem.dream": "low",
  "oneiros.rem.threat": "low",
  "oneiros.nrem.ethical": "low",
  "oneiros.nrem.pattern": "low",
  "oneiros.lucid.explore": "low",
  "axon.observation": "low",
  "simula.code_agent": "low",
  "simula.simulation": "low",
};

type SortKey = "system" | "calls" | "tokens" | "cost" | "latency" | "cache";

// ─── Helper Components ──────────────────────────────────────────

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-white/80 tabular-nums font-medium">{value}</div>
      {sub && <div className="text-[10px] text-white/30 tabular-nums">{sub}</div>}
    </div>
  );
}

function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, value / Math.max(1, max));
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center">
        <div className="text-xs text-white/70 tabular-nums font-medium">
          {(pct * 100).toFixed(0)}%
        </div>
        <div className="text-[10px] text-white/30">{label}</div>
      </div>
    </div>
  );
}

function BudgetBar({
  label,
  used,
  total,
  color,
  format,
}: {
  label: string;
  used: number;
  total: number;
  color: string;
  format: (n: number) => string;
}) {
  const pct = Math.min(100, (used / Math.max(1, total)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 tabular-nums">
          {format(used)} / {format(total)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "critical" | "standard" | "low" }) {
  const config = {
    critical: { label: "CRITICAL", variant: "danger" as const },
    standard: { label: "STD", variant: "info" as const },
    low: { label: "LOW", variant: "muted" as const },
  };
  const c = config[priority];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── System Breakdown Table ─────────────────────────────────────

function SystemTable({
  systems,
  sortKey,
  sortAsc,
  onSort,
}: {
  systems: LLMSystemMetrics[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const sorted = useMemo(() => {
    const arr = [...systems];
    const dir = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "system": return dir * a.system.localeCompare(b.system);
        case "calls": return dir * (a.calls - b.calls);
        case "tokens": return dir * (a.total_tokens - b.total_tokens);
        case "cost": return dir * (a.total_cost_usd - b.total_cost_usd);
        case "latency": return dir * (a.avg_latency_ms - b.avg_latency_ms);
        case "cache": return dir * (a.cache_hit_rate - b.cache_hit_rate);
        default: return 0;
      }
    });
    return arr;
  }, [systems, sortKey, sortAsc]);

  function SortHeader({ label, column }: { label: string; column: SortKey }) {
    const active = sortKey === column;
    return (
      <th
        className={cn(
          "px-3 py-2 text-left text-[10px] uppercase tracking-widest cursor-pointer select-none transition-colors",
          active ? "text-teal-400/80" : "text-white/25 hover:text-white/40",
        )}
        onClick={() => onSort(column)}
      >
        {label}
        {active && (
          <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
        )}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <SortHeader label="System" column="system" />
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-white/25">
              Priority
            </th>
            <SortHeader label="Calls" column="calls" />
            <SortHeader label="Tokens" column="tokens" />
            <SortHeader label="Cost" column="cost" />
            <SortHeader label="Avg Latency" column="latency" />
            <SortHeader label="Cache Hit" column="cache" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((sys) => {
            const priority = SYSTEM_PRIORITY[sys.system] ?? "standard";
            const costPct = systems.length > 0
              ? (sys.total_cost_usd / Math.max(0.0001, systems.reduce((s, x) => s + x.total_cost_usd, 0))) * 100
              : 0;
            return (
              <tr
                key={sys.system}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-3 py-2.5">
                  <span className="text-white/70 font-mono text-xs">{sys.system}</span>
                </td>
                <td className="px-3 py-2.5">
                  <PriorityBadge priority={priority} />
                </td>
                <td className="px-3 py-2.5 text-white/60 tabular-nums">{sys.calls}</td>
                <td className="px-3 py-2.5">
                  <div className="text-white/60 tabular-nums">{formatTokens(sys.total_tokens)}</div>
                  <div className="text-[10px] text-white/25 tabular-nums">
                    {formatTokens(sys.tokens_in)} in / {formatTokens(sys.tokens_out)} out
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 tabular-nums">{formatCost(sys.total_cost_usd)}</span>
                    <div className="w-12 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-400/40"
                        style={{ width: `${Math.min(100, costPct)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-white/60 tabular-nums">
                  {sys.avg_latency_ms.toFixed(0)}ms
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 tabular-nums">
                      {(sys.cache_hit_rate * 100).toFixed(0)}%
                    </span>
                    <div className="w-10 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-400/50"
                        style={{ width: `${sys.cache_hit_rate * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function CostsPage() {
  const { data, loading, error } = useApi<LLMMetricsResponse>(api.llmMetrics, {
    intervalMs: 3000,
  });

  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "system"); // default asc for system name, desc for metrics
    }
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="LLM Cost Centre"
          description="Token budget, cache performance, and cost optimization"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-2xl opacity-20 mb-2">!</div>
            <div className="text-sm text-white/40">
              Unable to load metrics: {error}
            </div>
            <div className="text-xs text-white/20 mt-1">
              The metrics endpoint may not be available yet.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budget = data?.budget;
  const dashboard = data?.dashboard;
  const cache = data?.cache;
  const tier = budget?.tier ?? "green";
  const tierCfg = TIER_CONFIG[tier];

  const systems = dashboard?.by_system
    ? Object.values(dashboard.by_system)
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="LLM Cost Centre"
        description="Token budget, cache performance, and cost optimization"
      >
        {data && (
          <Badge variant={tierCfg.variant} pulse={tier !== "green"}>
            {tierCfg.label} TIER
          </Badge>
        )}
      </PageHeader>

      {loading && !data ? (
        <div className="text-sm text-white/20 text-center py-20">Loading metrics...</div>
      ) : data ? (
        <div className="space-y-4">
          {/* Row 1: Budget Tier + Token Usage + Cost Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Budget Tier Card */}
            <Card
              glow
              className={cn(
                tierCfg.border,
                tierCfg.glow,
                "transition-all duration-500",
              )}
            >
              <CardHeader>
                <CardTitle>Budget Tier</CardTitle>
                <Badge variant={tierCfg.variant} pulse={tier !== "green"}>
                  {tierCfg.label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {budget && (
                  <>
                    <div className="flex justify-center gap-6 py-2">
                      <ProgressRing
                        value={budget.tokens_used}
                        max={budget.tokens_used + budget.tokens_remaining}
                        color={tierCfg.color}
                        label="Tokens"
                      />
                      <ProgressRing
                        value={budget.calls_made}
                        max={budget.calls_made + budget.calls_remaining}
                        color={tierCfg.color}
                        label="Calls"
                      />
                    </div>
                    {budget.warning && (
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs",
                          tier === "red"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        )}
                      >
                        {budget.warning}
                      </div>
                    )}
                    {budget.hours_until_exhausted > 0 && budget.hours_until_exhausted < 24 && (
                      <div className="text-[10px] text-white/30 text-center">
                        Exhausted in ~{budget.hours_until_exhausted.toFixed(1)}h at current rate
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Token Budget Bars */}
            <Card>
              <CardHeader>
                <CardTitle>Token Budget</CardTitle>
                {dashboard && (
                  <span className="text-[10px] text-white/25 tabular-nums">
                    {formatDuration(dashboard.uptime_seconds)} uptime
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {budget && (
                  <>
                    <BudgetBar
                      label="Tokens (1hr window)"
                      used={budget.tokens_used}
                      total={budget.tokens_used + budget.tokens_remaining}
                      color={tierCfg.color}
                      format={formatTokens}
                    />
                    <BudgetBar
                      label="Calls (1hr window)"
                      used={budget.calls_made}
                      total={budget.calls_made + budget.calls_remaining}
                      color={tierCfg.color}
                      format={(n) => n.toString()}
                    />
                    <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                      <Metric
                        label="Burn Rate"
                        value={`${budget.burn_rate_tokens_per_sec.toFixed(1)} tok/s`}
                      />
                      <Metric
                        label="Until Exhausted"
                        value={
                          budget.hours_until_exhausted > 100
                            ? "100h+"
                            : `${budget.hours_until_exhausted.toFixed(1)}h`
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <div className="space-y-4">
                    <div className="text-center py-2">
                      <div className="text-3xl font-light text-white/90 tabular-nums">
                        {formatCost(dashboard.cost_projection.current_cost_usd)}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1">
                        Total spent this session
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-3">
                      <Metric
                        label="Hourly Rate"
                        value={formatCost(dashboard.cost_projection.hourly_cost_usd)}
                        sub="/hour"
                      />
                      <Metric
                        label="Daily Projection"
                        value={formatCost(dashboard.cost_projection.daily_cost_usd)}
                        sub="/day"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Efficiency + Cache Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Efficiency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-light text-white/80 tabular-nums">
                        {dashboard.total.calls}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1">Total Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light text-white/80 tabular-nums">
                        {formatTokens(dashboard.total.total_tokens)}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1">Total Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light text-white/80 tabular-nums">
                        {dashboard.efficiency.avg_latency_ms.toFixed(0)}
                        <span className="text-sm text-white/40">ms</span>
                      </div>
                      <div className="text-[10px] text-white/30 mt-1">Avg Latency</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Cache</CardTitle>
                {cache && (
                  <Badge
                    variant={
                      cache.hit_rate >= 0.3
                        ? "success"
                        : cache.hit_rate >= 0.1
                          ? "info"
                          : "muted"
                    }
                  >
                    {(cache.hit_rate * 100).toFixed(0)}% hit rate
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {cache && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <BudgetBar
                          label="Cache Efficiency"
                          used={cache.hit_count}
                          total={cache.total_requests || 1}
                          color="#818cf8"
                          format={(n) => n.toString()}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Metric label="Hits" value={cache.hit_count.toString()} />
                      <Metric label="Misses" value={cache.miss_count.toString()} />
                      <Metric
                        label="Tokens Saved"
                        value={formatTokens(
                          cache.hit_count * (dashboard?.efficiency.avg_tokens_per_call ?? 0),
                        )}
                        sub="estimated"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Degradation Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Degradation Status</CardTitle>
              <span className="text-[10px] text-white/25">
                {tier === "green"
                  ? "All systems active"
                  : tier === "yellow"
                    ? "Low-priority systems degraded to heuristics"
                    : "Only critical systems active"}
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-xs text-white/50 font-medium">Critical</span>
                  </div>
                  <div className="text-[10px] text-white/30">
                    Never degraded. Constitutional alignment and ethics checks always use LLM.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="default">equor</Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        tier === "red" ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
                      )}
                    />
                    <span className="text-xs text-white/50 font-medium">Standard</span>
                  </div>
                  <div className="text-[10px] text-white/30">
                    {tier === "red"
                      ? "Using heuristic fallbacks in RED tier."
                      : "Active — full LLM reasoning."}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="default">nova</Badge>
                    <Badge variant="default">voxis</Badge>
                    <Badge variant="default">thymos</Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        tier !== "green" ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
                      )}
                    />
                    <span className="text-xs text-white/50 font-medium">Low Priority</span>
                  </div>
                  <div className="text-[10px] text-white/30">
                    {tier !== "green"
                      ? "Degraded to heuristics/skipped in YELLOW+ tier."
                      : "Active — full LLM reasoning."}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="default">thread</Badge>
                    <Badge variant="default">evo</Badge>
                    <Badge variant="default">oneiros</Badge>
                    <Badge variant="default">simula</Badge>
                    <Badge variant="default">axon</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row 4: Per-System Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Per-System Breakdown</CardTitle>
              <span className="text-[10px] text-white/25 tabular-nums">
                {systems.length} system{systems.length !== 1 ? "s" : ""} reporting
              </span>
            </CardHeader>
            <CardContent className="px-0">
              {systems.length > 0 ? (
                <SystemTable
                  systems={systems}
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="text-2xl opacity-20 mb-2">~</div>
                  <div className="text-xs text-white/25">
                    No LLM calls recorded yet. Metrics will appear as the organism runs.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
