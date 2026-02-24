"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  AffectResponse,
  BeliefsResponse,
  CycleTelemetryResponse,
  GoalsResponse,
  HealthResponse,
  OneirosHealthResponse,
  ThreadHealthResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "healthy"
      ? "success"
      : status === "degraded"
        ? "warning"
        : "danger";
  return (
    <Badge variant={variant} pulse={status === "healthy"}>
      {status}
    </Badge>
  );
}

function AffectBar({
  label,
  value,
  min = 0,
  max = 1,
  color,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 tabular-nums">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SystemCard({
  name,
  data,
}: {
  name: string;
  data: Record<string, unknown>;
}) {
  const status = (data.status as string) ?? "unknown";
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-sm text-white/60 capitalize">{name}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function stageColor(stage: string): string {
  switch (stage) {
    case "nrem": return "#818cf8";     // Indigo
    case "rem": return "#e879f9";      // Fuchsia
    case "lucid": return "#fbbf24";    // Amber
    case "hypnagogia": return "#a78bfa"; // Violet
    case "hypnopompia": return "#fb923c"; // Orange
    default: return "#38bdf8";           // Sky (wake)
  }
}

function OneirosCard({ data }: { data: OneirosHealthResponse | null }) {
  if (!data) return <div className="text-sm text-white/20">Loading...</div>;

  const isSleeping = data.current_stage !== "wake";
  const pressure = data.sleep_pressure;
  const pressureColor =
    pressure >= 0.95 ? "#ef4444"
    : pressure >= 0.7 ? "#f59e0b"
    : pressure >= 0.4 ? "#5eead4"
    : "#38bdf8";

  return (
    <div className="space-y-3">
      {/* Stage indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            isSleeping && "animate-pulse",
          )}
          style={{ background: stageColor(data.current_stage) }}
        />
        <span className="text-sm text-white/70 font-medium capitalize">
          {data.current_stage.replace("_", " ")}
        </span>
        {isSleeping && (
          <Badge variant="info" pulse>Sleeping</Badge>
        )}
      </div>

      {/* Sleep pressure */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Sleep Pressure</span>
          <span className="text-white/60 tabular-nums">
            {(pressure * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, pressure * 100))}%`,
              background: pressureColor,
            }}
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Dreams" value={data.total_dreams.toString()} />
        <Metric label="Insights" value={data.total_insights.toString()} />
        <Metric label="Cycles" value={data.total_sleep_cycles.toString()} />
        <Metric
          label="Coherence"
          value={`${(data.mean_dream_coherence * 100).toFixed(0)}%`}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const health = useApi<HealthResponse>(api.health, { intervalMs: 5000 });
  const affect = useApi<AffectResponse>(api.affect, { intervalMs: 2000 });
  const goals = useApi<GoalsResponse>(api.goals, { intervalMs: 10000 });
  const beliefs = useApi<BeliefsResponse>(api.beliefs, { intervalMs: 10000 });
  const cycle = useApi<CycleTelemetryResponse>(api.cycleTelemetry, {
    intervalMs: 3000,
  });
  const oneiros = useApi<OneirosHealthResponse>(api.oneirosHealth, {
    intervalMs: 5000,
  });
  const thread = useApi<ThreadHealthResponse>(api.threadHealth, {
    intervalMs: 8000,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Dashboard"
        description={
          health.data
            ? `${health.data.instance_name} — ${health.data.phase}`
            : "Loading..."
        }
      >
        {health.data && <StatusBadge status={health.data.status} />}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Affect State */}
        <Card glow className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Affect State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {affect.data ? (
              <>
                <AffectBar
                  label="Valence"
                  value={affect.data.valence}
                  min={-1}
                  max={1}
                  color="linear-gradient(90deg, #818cf8, #5eead4)"
                />
                <AffectBar
                  label="Arousal"
                  value={affect.data.arousal}
                  color="#f59e0b"
                />
                <AffectBar
                  label="Curiosity"
                  value={affect.data.curiosity}
                  color="#5eead4"
                />
                <AffectBar
                  label="Care"
                  value={affect.data.care_activation}
                  color="#f472b6"
                />
                <AffectBar
                  label="Coherence Stress"
                  value={affect.data.coherence_stress}
                  color="#ef4444"
                />
                <AffectBar
                  label="Dominance"
                  value={affect.data.dominance}
                  color="#818cf8"
                />
              </>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Cognitive Cycle */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cognitive Cycle</CardTitle>
            {cycle.data && (
              <Badge
                variant={
                  cycle.data.rhythm.state === "idle"
                    ? "muted"
                    : cycle.data.rhythm.state === "flow"
                      ? "success"
                      : cycle.data.rhythm.state === "stress"
                        ? "danger"
                        : "info"
                }
              >
                {cycle.data.rhythm.state}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {cycle.data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Cycles"
                    value={cycle.data.cycle_count.toLocaleString()}
                  />
                  <Metric
                    label="Rate"
                    value={`${cycle.data.actual_rate_hz.toFixed(1)} Hz`}
                  />
                  <Metric
                    label="Period"
                    value={`${cycle.data.current_period_ms.toFixed(0)} ms`}
                  />
                  <Metric
                    label="Jitter"
                    value={`${cycle.data.jitter_ms.toFixed(1)} ms`}
                  />
                </div>
                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                    Coherence
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric
                      label="Composite"
                      value={cycle.data.coherence.composite.toFixed(3)}
                    />
                    <Metric
                      label="Phi"
                      value={cycle.data.coherence.phi.toFixed(3)}
                    />
                    <Metric
                      label="Resonance"
                      value={cycle.data.coherence.resonance.toFixed(3)}
                    />
                    <Metric
                      label="Synchrony"
                      value={cycle.data.coherence.synchrony.toFixed(3)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
            {goals.data && (
              <span className="text-xs text-white/30">
                {goals.data.total_active} active
              </span>
            )}
          </CardHeader>
          <CardContent>
            {goals.data ? (
              (goals.data.active_goals?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {goals.data.active_goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
                    >
                      <div className="text-xs text-white/70">
                        {goal.description}
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-teal-400/60"
                          style={{ width: `${goal.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="text-2xl opacity-20 mb-2">~</div>
                  <div className="text-xs text-white/25">
                    No active goals. Aurora is drifting without purpose.
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Beliefs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Belief State</CardTitle>
          </CardHeader>
          <CardContent>
            {beliefs.data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Confidence"
                    value={beliefs.data.overall_confidence.toFixed(2)}
                  />
                  <Metric
                    label="Free Energy"
                    value={beliefs.data.free_energy.toFixed(2)}
                  />
                  <Metric
                    label="Entities"
                    value={beliefs.data.entity_count.toString()}
                  />
                  <Metric
                    label="Individuals"
                    value={beliefs.data.individual_count.toString()}
                  />
                </div>
                {beliefs.data.context?.summary && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
                      Context
                    </div>
                    <div className="text-xs text-white/50">
                      {beliefs.data.context.summary}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Inner Life (Oneiros) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Inner Life</CardTitle>
            <a
              href="/dreams"
              className="text-[10px] text-white/25 hover:text-white/40 transition-colors"
            >
              View Dreams →
            </a>
          </CardHeader>
          <CardContent>
            <OneirosCard data={oneiros.data} />
          </CardContent>
        </Card>

        {/* Narrative Identity (Thread) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Narrative Identity</CardTitle>
            <a
              href="/narrative"
              className="text-[10px] text-white/25 hover:text-white/40 transition-colors"
            >
              View Identity →
            </a>
          </CardHeader>
          <CardContent>
            {thread.data ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      thread.data.narrative_coherence === "integrated"
                        ? "success"
                        : thread.data.narrative_coherence === "fragmented" ||
                            thread.data.narrative_coherence === "conflicted"
                          ? "warning"
                          : "info"
                    }
                  >
                    {thread.data.narrative_coherence}
                  </Badge>
                  <span className="text-xs text-white/30 truncate">
                    {thread.data.current_chapter || "First chapter…"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Idem"
                    value={`${(thread.data.idem_score * 100).toFixed(0)}%`}
                  />
                  <Metric
                    label="Ipse"
                    value={`${(thread.data.ipse_score * 100).toFixed(0)}%`}
                  />
                  <Metric
                    label="Schemas"
                    value={thread.data.total_schemas.toString()}
                  />
                  <Metric
                    label="Chapters"
                    value={thread.data.total_chapters.toString()}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Systems */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Systems</CardTitle>
          </CardHeader>
          <CardContent>
            {health.data ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(health.data.systems ?? {}).map(([name, data]) => (
                  <SystemCard
                    key={name}
                    name={name}
                    data={data as Record<string, unknown>}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Data Stores */}
        <Card>
          <CardHeader>
            <CardTitle>Data Stores</CardTitle>
          </CardHeader>
          <CardContent>
            {health.data ? (
              <div className="space-y-2">
                {Object.entries(health.data.data_stores ?? {}).map(([name, data]) => (
                  <SystemCard
                    key={name}
                    name={name}
                    data={data as Record<string, unknown>}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25">{label}</div>
      <div className="text-sm text-white/70 tabular-nums font-medium">
        {value}
      </div>
    </div>
  );
}
