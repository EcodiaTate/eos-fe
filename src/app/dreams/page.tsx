"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  OneirosHealthResponse,
  OneirosStatsResponse,
  DreamInsightResponse,
  SleepCycleResponse,
} from "@/lib/api-client";
import { DreamJournalBrowser } from "@/components/oneiros/DreamJournalBrowser";
import { DreamVisualization } from "@/components/oneiros/DreamVisualization";
import { SleepStatusPanel } from "@/components/oneiros/SleepStatusPanel";

const TABS = ["Overview", "Journal", "Insights", "Sleep History"] as const;
type Tab = (typeof TABS)[number];

export default function DreamsPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const health = useApi<OneirosHealthResponse>(api.oneirosHealth, {
    intervalMs: 5000,
  });
  const stats = useApi<OneirosStatsResponse>(api.oneirosStats, {
    intervalMs: 10000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dreams"
        description="The organism's inner life — sleep cycles, creative dreaming, and memory consolidation."
      >
        {health.data && health.data.current_stage !== "wake" && (
          <Badge variant="info">
            {health.data.current_stage.toUpperCase()}
          </Badge>
        )}
      </PageHeader>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-white/[0.02] p-1 border border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              tab === t
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "Overview" && (
        <OverviewTab health={health.data} stats={stats.data} />
      )}
      {tab === "Journal" && <DreamJournalBrowser />}
      {tab === "Insights" && <InsightsTab />}
      {tab === "Sleep History" && <SleepHistoryTab />}
    </div>
  );
}

function OverviewTab({
  health,
  stats,
}: {
  health: OneirosHealthResponse | null;
  stats: OneirosStatsResponse | null;
}) {
  const isSleeping = health !== null && health.current_stage !== "wake";

  return (
    <div className="space-y-4">
      {/* Dream visualization — visible when sleeping, placeholder when awake */}
      {isSleeping && <DreamVisualization />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SleepStatusPanel />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Dream Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat
              label="Total Sleep Cycles"
              value={stats?.total_sleep_cycles ?? 0}
            />
            <Stat label="Total Dreams" value={stats?.total_dreams ?? 0} />
            <Stat label="Total Insights" value={stats?.total_insights ?? 0} />
            <Stat
              label="Insights Validated"
              value={stats?.insights_validated ?? 0}
            />
            <Stat
              label="Mean Dream Coherence"
              value={`${((stats?.mean_dream_coherence ?? 0) * 100).toFixed(0)}%`}
            />
            <Stat
              label="Episodes Consolidated"
              value={stats?.episodes_consolidated ?? 0}
            />
            <Stat
              label="Threats Simulated"
              value={stats?.threats_simulated ?? 0}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InsightsTab() {
  const insights = useApi<DreamInsightResponse[]>(api.oneirosInsights, {
    intervalMs: 5000,
  });

  if (insights.loading)
    return <div className="text-white/40">Loading insights...</div>;
  if (!insights.data?.length)
    return <div className="text-white/40">No insights discovered yet.</div>;

  return (
    <div className="space-y-3">
      {insights.data.map((insight) => (
        <Card key={insight.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-white/80">{insight.insight_text}</p>
                <p className="text-xs text-white/40 mt-1">
                  Domain: {insight.domain} · Coherence:{" "}
                  {(insight.coherence_score * 100).toFixed(0)}%
                </p>
              </div>
              <Badge
                variant={
                  insight.status === "validated"
                    ? "success"
                    : insight.status === "integrated"
                      ? "info"
                      : "muted"
                }
              >
                {insight.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SleepHistoryTab() {
  const cycles = useApi<SleepCycleResponse[]>(api.oneirosSleepCycles, {
    intervalMs: 10000,
  });

  if (cycles.loading)
    return <div className="text-white/40">Loading sleep history...</div>;
  if (!cycles.data?.length)
    return <div className="text-white/40">No sleep cycles recorded yet.</div>;

  return (
    <div className="space-y-3">
      {cycles.data.map((cycle) => (
        <Card key={cycle.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">
                  {new Date(cycle.started_at).toLocaleString()}
                </p>
                <p className="text-xs text-white/40">
                  Dreams: {cycle.dreams_generated} · Insights:{" "}
                  {cycle.insights_discovered} · Consolidated:{" "}
                  {cycle.episodes_replayed}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    cycle.quality === "deep"
                      ? "success"
                      : cycle.quality === "normal"
                        ? "info"
                        : "warning"
                  }
                >
                  {cycle.quality}
                </Badge>
                <span className="text-xs text-white/40">
                  {cycle.pressure_before.toFixed(2)} →{" "}
                  {cycle.pressure_after.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-medium text-white/80">{value}</span>
    </div>
  );
}
