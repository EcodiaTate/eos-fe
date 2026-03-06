"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  OneirosHealthResponse,
  OneirosStatsResponse,
  OneirosCircadianResponse,
  OneirosWorkerMetricsResponse,
  OneirosInsightLifecycleResponse,
  DreamInsightResponse,
  SleepCycleResponse,
} from "@/lib/api-client";
import { DreamJournalBrowser } from "@/components/oneiros/DreamJournalBrowser";
import { DreamVisualization } from "@/components/oneiros/DreamVisualization";
import { SleepStatusPanel } from "@/components/oneiros/SleepStatusPanel";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/formatters";

// ── Tab definition ──────────────────────────────────────────────

const TABS = ["Overview", "Journal", "Consolidation", "Insights", "Sleep History"] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function qualityVariant(q: string): "success" | "info" | "warning" | "danger" | "default" {
  if (q === "deep") return "success";
  if (q === "normal") return "info";
  if (q === "fragmented") return "warning";
  if (q === "deprived") return "danger";
  return "default";
}

function insightVariant(s: string): "success" | "info" | "warning" | "muted" {
  if (s === "validated") return "success";
  if (s === "integrated") return "info";
  if (s === "invalidated") return "warning";
  return "muted";
}

// ── Sub-components ───────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-white/50">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-white/80 tabular-nums">{value}</span>
        {sub && <span className="block text-[10px] text-white/30">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  color,
  showPct = true,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  showPct?: boolean;
}) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40">{label}</span>
        <span className="text-[11px] text-white/50 tabular-nums">
          {showPct ? `${pctVal.toFixed(0)}%` : value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pctVal}%` }}
        />
      </div>
    </div>
  );
}

// ── Pressure breakdown stacked bar ──────────────────────────────

function PressureBreakdown({ circadian }: { circadian: OneirosCircadianResponse }) {
  const { contributions, composite, threshold, critical_threshold } = circadian.pressure;
  const total = composite;

  const segments = [
    { key: "cycles", label: "Time Awake", value: contributions.cycles, color: "bg-sky-500" },
    { key: "affect", label: "Affect Residue", value: contributions.affect, color: "bg-violet-500" },
    { key: "episodes", label: "Unconsolidated", value: contributions.episodes, color: "bg-indigo-500" },
    { key: "hypotheses", label: "Hypothesis Backlog", value: contributions.hypotheses, color: "bg-fuchsia-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-white/60">Pressure Breakdown</CardTitle>
        <span className="text-[10px] text-white/30">
          {pct(composite)} composite · threshold {pct(threshold)}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="relative h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
          {segments.map((s) => (
            <div
              key={s.key}
              className={cn("h-full transition-all duration-700", s.color)}
              style={{ width: `${total > 0 ? (s.value / total) * Math.min(total * 100, 100) : 0}%` }}
            />
          ))}
          {/* threshold marker */}
          <div
            className="absolute top-0 h-full w-px bg-amber-400/60"
            style={{ left: `${threshold * 100}%` }}
          />
          <div
            className="absolute top-0 h-full w-px bg-red-400/60"
            style={{ left: `${Math.min(critical_threshold * 100, 100)}%` }}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", s.color)} />
              <div>
                <div className="text-[10px] text-white/40">{s.label}</div>
                <div className="text-xs text-white/70 tabular-nums font-medium">
                  {pct(s.value, 1)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Raw counts */}
        <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          <Stat label="Cycles since sleep" value={circadian.pressure.raw_counts.cycles_since_sleep.toLocaleString()} />
          <Stat label="Affect residue" value={circadian.pressure.raw_counts.unprocessed_affect_residue.toFixed(1)} />
          <Stat label="Unconsolidated eps." value={circadian.pressure.raw_counts.unconsolidated_episodes.toLocaleString()} />
          <Stat label="Hypothesis backlog" value={circadian.pressure.raw_counts.hypothesis_backlog} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Degradation panel ───────────────────────────────────────────

function DegradationPanel({ circadian }: { circadian: OneirosCircadianResponse }) {
  const d = circadian.degradation;
  const impaired = d.composite_impairment > 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-white/60">Cognitive Degradation</CardTitle>
        <Badge variant={impaired ? "warning" : "success"}>
          {impaired ? `${pct(d.composite_impairment)} impaired` : "Well rested"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {impaired ? (
          <>
            <MiniBar label="Salience Noise" value={d.salience_noise} max={0.15} color="bg-amber-500/80" showPct={false} />
            <MiniBar label="EFE Precision Loss" value={d.efe_precision_loss} max={0.20} color="bg-orange-500/80" showPct={false} />
            <MiniBar label="Expression Flatness" value={d.expression_flatness} max={0.25} color="bg-rose-500/80" showPct={false} />
            <MiniBar label="Learning Rate Loss" value={d.learning_rate_reduction} max={0.30} color="bg-red-500/80" showPct={false} />
            <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-white/30">
              <div>Salience noise: {(d.salience_noise * 100).toFixed(1)}% / 15%</div>
              <div>EFE loss: {(d.efe_precision_loss * 100).toFixed(1)}% / 20%</div>
              <div>Expr. flat: {(d.expression_flatness * 100).toFixed(1)}% / 25%</div>
              <div>Learn rate: {(d.learning_rate_reduction * 100).toFixed(1)}% / 30%</div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 py-4">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-sm text-teal-400/70">No degradation — full cognitive capacity</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Slow-wave worker card ────────────────────────────────────────

function SlowWaveWorkerCard({ nrem }: { nrem: NonNullable<OneirosWorkerMetricsResponse["nrem"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-white/60">Slow-Wave — Memory Consolidation</CardTitle>
        <Badge variant="info">Last cycle</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <Stat label="Episodes replayed" value={nrem.episodes_replayed} />
        <Stat label="Semantic nodes created" value={nrem.semantic_nodes_created} />
        <Stat label="Traces pruned" value={nrem.traces_pruned} />
        <Stat label="Beliefs compressed" value={nrem.beliefs_compressed} />
        <div className="border-t border-white/[0.06] pt-2 space-y-2">
          <Stat label="Hypotheses pruned" value={nrem.hypotheses_pruned} />
          <Stat
            label="Hypotheses promoted"
            value={nrem.hypotheses_promoted}
          />
        </div>
        {nrem.hypotheses_promoted > 0 && (
          <div className="mt-2 text-[10px] text-teal-400/60 rounded border border-teal-500/20 bg-teal-500/[0.06] px-2 py-1">
            {nrem.hypotheses_promoted} pattern{nrem.hypotheses_promoted !== 1 ? "s" : ""} promoted to Evo
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── REM worker card ──────────────────────────────────────────────

function REMWorkerCard({ rem }: { rem: NonNullable<OneirosWorkerMetricsResponse["rem"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-white/60">REM — Creative Dreaming</CardTitle>
        <Badge variant="info">Last cycle</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <Stat label="Dreams generated" value={rem.dreams_generated} />
        <Stat
          label="Insights discovered"
          value={rem.insights_discovered}
          sub={rem.dreams_generated > 0 ? `${((rem.insights_discovered / rem.dreams_generated) * 100).toFixed(0)}% hit rate` : undefined}
        />
        <Stat label="Affect traces processed" value={rem.affect_traces_processed} />
        <div className="border-t border-white/[0.06] pt-2 space-y-2">
          <Stat label="Threats simulated" value={rem.threats_simulated} />
          <Stat label="Ethical cases digested" value={rem.ethical_cases_digested} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Lucid worker card ────────────────────────────────────────────

function LucidWorkerCard({ lucid }: { lucid: NonNullable<OneirosWorkerMetricsResponse["lucid"]> }) {
  const acceptRate = lucid.proposals_submitted > 0
    ? lucid.proposals_accepted / lucid.proposals_submitted
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-white/60">Lucid — Self-Directed</CardTitle>
        <Badge variant="info">Last cycle</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <Stat label="Explorations" value={lucid.lucid_explorations} />
        <Stat label="Meta-observations" value={lucid.meta_observations} />
        <div className="border-t border-white/[0.06] pt-2 space-y-2">
          <Stat label="Proposals submitted" value={lucid.proposals_submitted} />
          <Stat
            label="Proposals accepted"
            value={lucid.proposals_accepted}
            sub={lucid.proposals_submitted > 0 ? `${pct(acceptRate)} accept rate` : undefined}
          />
          <Stat label="Proposals rejected" value={lucid.proposals_rejected} />
        </div>
        {lucid.proposals_accepted > 0 && (
          <div className="mt-2 text-[10px] text-amber-400/60 rounded border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1">
            {lucid.proposals_accepted} evolution proposal{lucid.proposals_accepted !== 1 ? "s" : ""} approved by Simula
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Insight lifecycle panel ──────────────────────────────────────

function InsightLifecyclePanel({ lifecycle }: { lifecycle: OneirosInsightLifecycleResponse }) {
  const { by_status, by_domain, lifetime, total } = lifecycle;

  const statusColors: Record<string, string> = {
    pending: "bg-white/20",
    validated: "bg-teal-500",
    invalidated: "bg-red-500/60",
    integrated: "bg-amber-400",
  };

  const domainEntries = Object.entries(by_domain).slice(0, 8);
  const maxDomainCount = domainEntries[0]?.[1] ?? 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Status distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-white/60">Insight Lifecycle</CardTitle>
          <span className="text-[10px] text-white/30">{total} total</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["pending", "validated", "integrated", "invalidated"] as const).map((status) => {
            const count = by_status[status] ?? 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", statusColors[status])} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-white/50 capitalize">{status}</span>
                    <span className="text-[11px] text-white/70 tabular-nums font-medium">{count}</span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", statusColors[status])}
                      style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t border-white/[0.06] pt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-teal-400 tabular-nums">{lifetime.validated}</div>
              <div className="text-[10px] text-white/30">Validated</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400 tabular-nums">{lifetime.integrated}</div>
              <div className="text-[10px] text-white/30">Integrated</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400 tabular-nums">{lifetime.invalidated}</div>
              <div className="text-[10px] text-white/30">Invalidated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-white/60">Insight Domains</CardTitle>
          <span className="text-[10px] text-white/30">{Object.keys(by_domain).length} domains</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {domainEntries.length === 0 ? (
            <div className="text-sm text-white/30 py-4 text-center">No domain data yet</div>
          ) : (
            domainEntries.map(([domain, count]) => (
              <div key={domain} className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-white/50 truncate">{domain}</span>
                  <span className="text-[11px] text-white/60 tabular-nums ml-2">{count}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-fuchsia-500/60"
                    style={{ width: `${(count / maxDomainCount) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Top applied insights ─────────────────────────────────────────

function TopAppliedInsights({ lifecycle }: { lifecycle: OneirosInsightLifecycleResponse }) {
  if (lifecycle.top_applied.length === 0) {
    return (
      <div className="text-sm text-white/30 py-4 text-center">
        No insights applied in wake yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lifecycle.top_applied.map((insight, i) => (
        <Card key={insight.id}>
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <div className="text-[11px] text-white/20 tabular-nums pt-0.5 w-4 flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 leading-relaxed">{insight.insight_text}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant={insightVariant(insight.status)}>{insight.status}</Badge>
                  <span className="text-[10px] text-white/30">{insight.domain}</span>
                  <span className="text-[10px] text-white/30">
                    coherence {pct(insight.coherence_score)}
                  </span>
                  <span className="text-[10px] text-white/30">{relativeTime(insight.created_at)}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-lg font-bold text-white/70 tabular-nums">
                  {insight.wake_applications}
                </div>
                <div className="text-[10px] text-white/30">applications</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Sleep cycle row ──────────────────────────────────────────────

function SleepCycleRow({ cycle }: { cycle: SleepCycleResponse }) {
  const duration = cycle.completed_at
    ? Math.round((new Date(cycle.completed_at).getTime() - new Date(cycle.started_at).getTime()) / 60000)
    : null;
  const pressureDelta = cycle.pressure_before - cycle.pressure_after;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm text-white/80">
              {new Date(cycle.started_at).toLocaleString()}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {duration !== null ? `${duration}m duration` : "In progress"}
              {" · "}Episodes: {cycle.episodes_replayed}
              {" · "}Dreams: {cycle.dreams_generated}
              {" · "}Insights: {cycle.insights_discovered}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Pressure delta bar */}
            <div className="hidden sm:block w-24">
              <div className="flex justify-between text-[10px] text-white/30 mb-0.5">
                <span>{pct(cycle.pressure_before)}</span>
                <span>{pct(cycle.pressure_after)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-teal-500/60"
                  style={{ width: `${Math.max(0, pressureDelta) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-teal-400/70 text-center mt-0.5">
                −{pct(pressureDelta)} relief
              </div>
            </div>
            <Badge variant={qualityVariant(cycle.quality)}>{cycle.quality}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── TABS ─────────────────────────────────────────────────────────

function OverviewTab({
  health,
  stats,
  circadian,
}: {
  health: OneirosHealthResponse | null;
  stats: OneirosStatsResponse | null;
  circadian: OneirosCircadianResponse | null;
}) {
  const isSleeping = health !== null && health.current_stage.toUpperCase() !== "WAKE";

  return (
    <div className="space-y-4">
      {isSleeping && <DreamVisualization />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SleepStatusPanel />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Dream Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Stat label="Total Sleep Cycles" value={stats?.total_sleep_cycles ?? 0} />
            <Stat label="Total Dreams" value={stats?.total_dreams ?? 0} />
            <Stat label="Total Insights" value={stats?.total_insights ?? 0} />
            <Stat
              label="Insights Validated"
              value={stats?.insights_validated ?? 0}
              sub={stats && stats.total_insights > 0
                ? `${pct(stats.insights_validated / stats.total_insights)} rate`
                : undefined}
            />
            <Stat
              label="Insights Integrated"
              value={stats?.insights_integrated ?? 0}
            />
            <Stat
              label="Mean Dream Coherence"
              value={pct(stats?.mean_dream_coherence ?? 0)}
            />
            <Stat label="Episodes Consolidated" value={stats?.episodes_consolidated ?? 0} />
            <Stat label="Semantic Nodes Created" value={stats?.semantic_nodes_created ?? 0} />
            <Stat label="Traces Pruned" value={stats?.traces_pruned ?? 0} />
            <Stat label="Affect Traces Processed" value={stats?.affect_traces_processed ?? 0} />
            <Stat label="Threats Simulated" value={stats?.threats_simulated ?? 0} />
          </CardContent>
        </Card>
      </div>

      {circadian && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PressureBreakdown circadian={circadian} />
          <DegradationPanel circadian={circadian} />
        </div>
      )}
    </div>
  );
}

function ConsolidationTab({
  workers,
}: {
  workers: OneirosWorkerMetricsResponse | null;
}) {
  if (!workers) {
    return <div className="text-sm text-white/30 py-8 text-center">No sleep cycle data yet.</div>;
  }

  const { nrem, rem, lucid, current_cycle } = workers;

  return (
    <div className="space-y-4">
      {current_cycle && (
        <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.04] px-4 py-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
          <div>
            <span className="text-sm text-fuchsia-300">Sleep cycle in progress</span>
            <span className="text-xs text-white/30 ml-2">
              Started {relativeTime(current_cycle.started_at)}
            </span>
          </div>
          {current_cycle.interrupted && (
            <Badge variant="warning">Interrupted</Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nrem ? (
          <SlowWaveWorkerCard nrem={nrem} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-white/30">
              No slow-wave data yet
            </CardContent>
          </Card>
        )}
        {rem ? (
          <REMWorkerCard rem={rem} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-white/30">
              No REM data yet
            </CardContent>
          </Card>
        )}
        {lucid ? (
          <LucidWorkerCard lucid={lucid} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-white/30">
              No lucid dreaming data yet
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lifetime consolidation stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-white/60">Lifetime Consolidation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Dreams", value: rem?.dreams_generated ?? 0, color: "text-fuchsia-400" },
              { label: "Insights", value: rem?.insights_discovered ?? 0, color: "text-teal-400" },
              { label: "Episodes Replayed", value: nrem?.episodes_replayed ?? 0, color: "text-indigo-400" },
              { label: "Proposals", value: lucid?.proposals_submitted ?? 0, color: "text-amber-400" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={cn("text-2xl font-bold tabular-nums", item.color)}>
                  {item.value.toLocaleString()}
                </div>
                <div className="text-[11px] text-white/30 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab() {
  const insights = useApi<DreamInsightResponse[]>(() => api.oneirosInsights(100), {
    intervalMs: 10000,
  });
  const lifecycle = useApi<OneirosInsightLifecycleResponse>(api.oneirosInsightLifecycle, {
    intervalMs: 15000,
  });

  type InsightFilter = "all" | "pending" | "validated" | "integrated" | "invalidated";
  const [filter, setFilter] = useState<InsightFilter>("all");

  const filtered = useMemo(() => {
    if (!insights.data) return [];
    if (filter === "all") return insights.data;
    return insights.data.filter((i) => i.status === filter);
  }, [insights.data, filter]);

  const filters: InsightFilter[] = ["all", "validated", "integrated", "pending", "invalidated"];
  const counts = useMemo(() => {
    const data = insights.data ?? [];
    return {
      all: data.length,
      pending: data.filter((i) => i.status === "pending").length,
      validated: data.filter((i) => i.status === "validated").length,
      integrated: data.filter((i) => i.status === "integrated").length,
      invalidated: data.filter((i) => i.status === "invalidated").length,
    };
  }, [insights.data]);

  return (
    <div className="space-y-4">
      {lifecycle.data && <InsightLifecyclePanel lifecycle={lifecycle.data} />}

      {lifecycle.data && lifecycle.data.top_applied.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Most Applied Insights</CardTitle>
            <span className="text-[10px] text-white/30">Used most in wake cognition</span>
          </CardHeader>
          <CardContent className="space-y-0 -mx-2 -mb-2">
            <TopAppliedInsights lifecycle={lifecycle.data} />
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-colors capitalize",
              filter === f
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/60",
            )}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {insights.loading && !insights.data && (
        <div className="text-sm text-white/30">Loading insights...</div>
      )}
      {!insights.loading && filtered.length === 0 && (
        <div className="text-sm text-white/30 py-4">No insights match this filter.</div>
      )}
      <div className="space-y-2">
        {filtered.map((insight) => (
          <Card key={insight.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{insight.insight_text}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-white/30">
                      Domain: <span className="text-white/50">{insight.domain}</span>
                    </span>
                    <span className="text-[10px] text-white/30">
                      Coherence: <span className="text-white/50">{pct(insight.coherence_score)}</span>
                    </span>
                    <span className="text-[10px] text-white/30">
                      Applied: <span className="text-white/50">{insight.wake_applications}×</span>
                    </span>
                    <span className="text-[10px] text-white/30">{relativeTime(insight.created_at)}</span>
                  </div>
                </div>
                <Badge variant={insightVariant(insight.status)}>{insight.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SleepHistoryTab() {
  const cycles = useApi<SleepCycleResponse[]>(() => api.oneirosSleepCycles(50), {
    intervalMs: 15000,
  });

  const sorted = useMemo(
    () => (cycles.data ?? []).slice().sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    ),
    [cycles.data],
  );

  // Aggregate stats
  const agg = useMemo(() => {
    if (!sorted.length) return null;
    const completed = sorted.filter((c) => c.completed_at);
    const totalEpisodes = sorted.reduce((s, c) => s + c.episodes_replayed, 0);
    const totalDreams = sorted.reduce((s, c) => s + c.dreams_generated, 0);
    const totalInsights = sorted.reduce((s, c) => s + c.insights_discovered, 0);
    const meanRelief = completed.length > 0
      ? completed.reduce((s, c) => s + (c.pressure_before - c.pressure_after), 0) / completed.length
      : 0;
    const qualityCounts = sorted.reduce<Record<string, number>>((acc, c) => {
      acc[c.quality] = (acc[c.quality] ?? 0) + 1;
      return acc;
    }, {});

    return { completed: completed.length, totalEpisodes, totalDreams, totalInsights, meanRelief, qualityCounts };
  }, [sorted]);

  if (cycles.loading && !cycles.data) {
    return <div className="text-sm text-white/30">Loading sleep history...</div>;
  }

  if (!sorted.length) {
    return <div className="text-sm text-white/30 py-4">No sleep cycles recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Aggregate summary */}
      {agg && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Cycles shown", value: sorted.length, color: "text-white/80" },
            { label: "Mean pressure relief", value: pct(agg.meanRelief), color: "text-teal-400" },
            { label: "Total dreams", value: agg.totalDreams, color: "text-fuchsia-400" },
            { label: "Total insights", value: agg.totalInsights, color: "text-amber-400" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="py-3 text-center">
                <div className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quality distribution */}
      {agg && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-12">
              {(["deep", "normal", "fragmented", "deprived"] as const).map((q) => {
                const count = agg.qualityCounts[q] ?? 0;
                const maxCount = Math.max(...Object.values(agg.qualityCounts), 1);
                const heightPct = (count / maxCount) * 100;
                const colors = {
                  deep: "bg-teal-500",
                  normal: "bg-sky-500",
                  fragmented: "bg-amber-500",
                  deprived: "bg-red-500",
                };
                return (
                  <div key={q} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] text-white/40 tabular-nums">{count}</div>
                    <div className="w-full flex items-end" style={{ height: "32px" }}>
                      <div
                        className={cn("w-full rounded-t", colors[q])}
                        style={{ height: `${heightPct}%`, minHeight: count > 0 ? "2px" : "0" }}
                      />
                    </div>
                    <div className="text-[9px] text-white/30 capitalize">{q}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle list */}
      <div className="space-y-2">
        {sorted.map((cycle) => (
          <SleepCycleRow key={cycle.id} cycle={cycle} />
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function DreamsPage() {
  const [tab, setTab] = useState<Tab>("Overview");

  const health = useApi<OneirosHealthResponse>(api.oneirosHealth, { intervalMs: 5000 });
  const stats = useApi<OneirosStatsResponse>(api.oneirosStats, { intervalMs: 10000 });
  const circadian = useApi<OneirosCircadianResponse>(api.oneirosCircadian, { intervalMs: 5000 });
  const workers = useApi<OneirosWorkerMetricsResponse>(api.oneirosWorkerMetrics, { intervalMs: 15000 });

  const isSleeping = health.data?.current_stage.toUpperCase() !== "WAKE";
  const pressure = health.data?.sleep_pressure ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dreams"
        description="The organism's inner life — sleep cycles, memory consolidation, and creative dreaming."
      >
        <div className="flex items-center gap-2">
          {health.data && isSleeping && (
            <Badge variant="info" pulse>
              {health.data.current_stage.toUpperCase()}
            </Badge>
          )}
          {pressure >= 0.95 && (
            <Badge variant="danger" pulse>
              CRITICAL PRESSURE
            </Badge>
          )}
          {pressure >= 0.7 && pressure < 0.95 && (
            <Badge variant="warning">SLEEP IMMINENT</Badge>
          )}
        </div>
      </PageHeader>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-white/[0.02] p-1 border border-white/[0.06] flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-md text-sm transition-colors",
              tab === t
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/70",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "Overview" && (
        <OverviewTab
          health={health.data ?? null}
          stats={stats.data ?? null}
          circadian={circadian.data ?? null}
        />
      )}
      {tab === "Journal" && <DreamJournalBrowser />}
      {tab === "Consolidation" && <ConsolidationTab workers={workers.data ?? null} />}
      {tab === "Insights" && <InsightsTab />}
      {tab === "Sleep History" && <SleepHistoryTab />}
    </div>
  );
}
