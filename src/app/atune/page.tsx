"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type AffectResponse,
  type AtuneBiasModelResponse,
  type AtuneBroadcastItem,
  type AtuneBroadcastsResponse,
  type AtuneConfigResponse,
  type AtuneMomentumResponse,
  type AtuneMoodResponse,
  type AtuneSalienceHeadsResponse,
  type WorkspaceResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useCallback, useState } from "react";
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────

const HEAD_COLORS: Record<string, string> = {
  novelty: "#5eead4",    // teal
  risk: "#fb7185",       // rose
  identity: "#818cf8",   // indigo
  goal: "#a78bfa",       // violet
  emotional: "#f472b6",  // pink
  causal: "#f59e0b",     // amber
  keyword: "#34d399",    // emerald
};

const HEAD_COLOR_BG: Record<string, string> = {
  novelty: "bg-teal-400",
  risk: "bg-rose-400",
  identity: "bg-indigo-400",
  goal: "bg-violet-400",
  emotional: "bg-pink-400",
  causal: "bg-amber-400",
  keyword: "bg-emerald-400",
};

const TRAJECTORY_BADGE: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  accelerating: "danger",
  rising: "warning",
  falling: "muted",
  steady: "info",
};

// ─── Sub-components ───────────────────────────────────────────────

function AffectRadar({ data }: { data: AffectResponse }) {
  const dims = [
    { label: "Valence", value: data.valence, min: -1, max: 1, color: data.valence >= 0 ? "#5eead4" : "#fb7185" },
    { label: "Arousal", value: data.arousal, min: 0, max: 1, color: "#f59e0b" },
    { label: "Curiosity", value: data.curiosity, min: 0, max: 1, color: "#a78bfa" },
    { label: "Care", value: data.care_activation, min: 0, max: 1, color: "#f472b6" },
    { label: "Coh. Stress", value: data.coherence_stress, min: 0, max: 1, color: "#fb7185" },
    { label: "Energy", value: data.energy, min: 0, max: 1, color: "#34d399" },
    { label: "Confidence", value: data.confidence, min: 0, max: 1, color: "#818cf8" },
    { label: "Integrity", value: data.integrity, min: 0, max: 1, color: "#60a5fa" },
    { label: "Temporal Pressure", value: data.temporal_pressure, min: 0, max: 1, color: "#fb923c" },
  ];

  return (
    <div className="space-y-2.5">
      {dims.map((d) => {
        const v = d.value ?? 0;
        const pct = ((v - d.min) / (d.max - d.min)) * 100;
        const pctClamped = Math.max(0, Math.min(100, pct));
        return (
          <div key={d.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-white/40">{d.label}</span>
              <span className="text-[11px] text-white/60 tabular-nums font-mono">
                {v.toFixed(3)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pctClamped}%`, background: d.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalienceHeadBar({
  name,
  baseWeight,
  effectiveWeight,
  evoAdj,
  precisionSensitivity,
}: {
  name: string;
  baseWeight: number;
  effectiveWeight: number;
  evoAdj: number;
  precisionSensitivity: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = HEAD_COLORS[name] ?? "#ffffff";
  const bg = HEAD_COLOR_BG[name] ?? "bg-white";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2 text-left"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", bg)} />
            <span className="text-xs text-white/70 capitalize">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            {evoAdj !== 0 && (
              <span
                className={cn(
                  "text-[10px] tabular-nums font-mono",
                  evoAdj > 0 ? "text-teal-400/70" : "text-rose-400/70",
                )}
              >
                {evoAdj > 0 ? "+" : ""}{evoAdj.toFixed(3)}
              </span>
            )}
            <span className="text-[11px] text-white/50 tabular-nums font-mono w-10 text-right">
              {effectiveWeight.toFixed(3)}
            </span>
            {expanded ? (
              <ChevronUp size={12} className="text-white/20" />
            ) : (
              <ChevronDown size={12} className="text-white/20" />
            )}
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${effectiveWeight * 100}%`, background: color }}
          />
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-white/[0.03]">
          <div
            className="h-full rounded-full opacity-30"
            style={{ width: `${baseWeight * 100}%`, background: color }}
          />
        </div>
      </button>

      {expanded && Object.keys(precisionSensitivity).length > 0 && (
        <div className="px-3 pb-2 border-t border-white/[0.04]">
          <div className="pt-2 text-[10px] text-white/25 mb-1.5">Precision sensitivity</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(precisionSensitivity).map(([dim, strength]) => (
              <div
                key={dim}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px]"
              >
                <span className="text-white/40">{dim}</span>
                <span className="text-white/60 tabular-nums ml-1">{strength.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MomentumRow({
  headName,
  hm,
}: {
  headName: string;
  hm: {
    first_derivative: number;
    second_derivative: number;
    trajectory: string;
    time_to_threshold: number | null;
    momentum_bonus: number;
    history_size: number;
  };
}) {
  const color = HEAD_COLORS[headName] ?? "#ffffff";
  const trajVariant = TRAJECTORY_BADGE[hm.trajectory] ?? "muted";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs text-white/50 capitalize w-20 shrink-0">{headName}</span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-center">
          <div className="text-[10px] text-white/20">dv/dt</div>
          <div
            className={cn(
              "text-xs tabular-nums font-mono",
              hm.first_derivative > 0.02
                ? "text-teal-400/70"
                : hm.first_derivative < -0.02
                  ? "text-rose-400/70"
                  : "text-white/40",
            )}
          >
            {hm.first_derivative > 0 ? "+" : ""}
            {hm.first_derivative.toFixed(4)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-white/20">d²v/dt²</div>
          <div
            className={cn(
              "text-xs tabular-nums font-mono",
              Math.abs(hm.second_derivative) > 0.05 ? "text-amber-400/70" : "text-white/40",
            )}
          >
            {hm.second_derivative > 0 ? "+" : ""}
            {hm.second_derivative.toFixed(4)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-white/20">bonus</div>
          <div className="text-xs tabular-nums font-mono text-white/50">
            +{hm.momentum_bonus.toFixed(3)}
          </div>
        </div>
        {hm.time_to_threshold !== null && (
          <div className="text-center">
            <div className="text-[10px] text-white/20">ETA</div>
            <div className="text-xs tabular-nums font-mono text-amber-400/70">
              {hm.time_to_threshold.toFixed(1)}s
            </div>
          </div>
        )}
      </div>
      <Badge variant={trajVariant}>{hm.trajectory}</Badge>
    </div>
  );
}

function BroadcastCard({ b }: { b: AtuneBroadcastItem }) {
  const [expanded, setExpanded] = useState(false);

  const sourceLabel = b.source.includes(":")
    ? b.source.split(":")[1] ?? b.source
    : b.source;
  const sourceType = b.source.split(":")[0] ?? "unknown";

  const sourceVariant: "info" | "warning" | "muted" | "default" =
    sourceType === "external"
      ? "info"
      : sourceType === "internal"
        ? "warning"
        : sourceType === "spontaneous_recall"
          ? "muted"
          : "default";

  const saliencePct = Math.round(b.composite_salience * 100);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={sourceVariant}>{sourceLabel}</Badge>
            {b.threat_trajectory !== "steady" && b.threat_trajectory !== "unknown" && (
              <Badge variant={TRAJECTORY_BADGE[b.threat_trajectory] ?? "muted"}>
                {b.threat_trajectory}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs text-white/60 tabular-nums font-mono">
              {b.composite_salience.toFixed(3)}
            </div>
            {expanded ? (
              <ChevronUp size={12} className="text-white/20" />
            ) : (
              <ChevronDown size={12} className="text-white/20" />
            )}
          </div>
        </div>

        {/* Mini salience bar */}
        <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-teal-400/50 transition-all duration-500"
            style={{ width: `${saliencePct}%` }}
          />
        </div>

        {b.content_preview && (
          <p className="mt-1.5 text-[11px] text-white/35 leading-relaxed line-clamp-1">
            {b.content_preview}
          </p>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.04] space-y-3">
          {/* Per-head scores */}
          <div className="pt-2">
            <div className="text-[10px] text-white/25 mb-1.5">Per-head salience</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(b.per_head_scores).map(([head, score]) => {
                const color = HEAD_COLORS[head] ?? "#ffffff";
                return (
                  <div key={head} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[10px] text-white/35 capitalize w-16 shrink-0">{head}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score * 100}%`, background: color, opacity: 0.6 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 tabular-nums font-mono w-8 text-right">
                      {score.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Affect at broadcast time */}
          {b.affect_snapshot && (
            <div>
              <div className="text-[10px] text-white/25 mb-1.5">Affect at broadcast</div>
              <div className="flex gap-4 text-[10px]">
                <span>
                  <span className="text-white/25">val </span>
                  <span className="text-white/50 tabular-nums font-mono">
                    {b.affect_snapshot.valence.toFixed(3)}
                  </span>
                </span>
                <span>
                  <span className="text-white/25">aro </span>
                  <span className="text-white/50 tabular-nums font-mono">
                    {b.affect_snapshot.arousal.toFixed(3)}
                  </span>
                </span>
                <span>
                  <span className="text-white/25">cur </span>
                  <span className="text-white/50 tabular-nums font-mono">
                    {b.affect_snapshot.curiosity.toFixed(3)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Full content */}
          {b.content_preview && (
            <div>
              <div className="text-[10px] text-white/25 mb-1">Content</div>
              <p className="text-[11px] text-white/40 leading-relaxed">{b.content_preview}</p>
            </div>
          )}

          {/* Timestamp + precision */}
          <div className="flex items-center gap-4 text-[10px] text-white/20 pt-1 border-t border-white/[0.04]">
            {b.timestamp && (
              <span>{new Date(b.timestamp).toLocaleTimeString()}</span>
            )}
            {b.precision !== null && (
              <span>
                precision{" "}
                <span className="text-white/40 tabular-nums font-mono">
                  {b.precision.toFixed(3)}
                </span>
              </span>
            )}
            <span className="font-mono text-white/15 truncate">{b.broadcast_id.slice(0, 12)}…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EmotionalMemoryDots({
  points,
}: {
  points: { valence: number; arousal: number }[];
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-white/15 text-xs">
        No high-arousal events recorded
      </div>
    );
  }

  return (
    <div className="relative h-32 w-full rounded-lg border border-white/[0.06] bg-white/[0.01]">
      {/* Axes */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.06]" />
      {/* Labels */}
      <span className="absolute bottom-1 left-2 text-[9px] text-white/15">neg</span>
      <span className="absolute bottom-1 right-2 text-[9px] text-white/15">pos</span>
      <span className="absolute top-1 left-2 text-[9px] text-white/15">high arousal</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/15">low</span>
      {/* Points */}
      {points.map((pt, i) => {
        const x = ((pt.valence + 1) / 2) * 100;
        const y = (1 - pt.arousal) * 100;
        const color = pt.valence >= 0 ? "#5eead4" : "#fb7185";
        const opacity = 0.3 + (i / Math.max(1, points.length - 1)) * 0.7;
        return (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: color,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AtunePage() {
  const affect = useApi<AffectResponse>(api.affect, { intervalMs: 2000 });
  const workspace = useApi<WorkspaceResponse>(api.workspace, { intervalMs: 3000 });
  const salienceHeads = useApi<AtuneSalienceHeadsResponse>(api.atuneSalienceHeads, {
    intervalMs: 5000,
  });
  const momentum = useApi<AtuneMomentumResponse>(api.atuneMomentum, { intervalMs: 2000 });
  const biasModel = useApi<AtuneBiasModelResponse>(api.atuneBiasModel, { intervalMs: 10000 });
  const mood = useApi<AtuneMoodResponse>(api.atuneMood, { intervalMs: 3000 });
  const config = useApi<AtuneConfigResponse>(api.atuneConfig, { intervalMs: 15000 });
  const broadcasts = useApi<AtuneBroadcastsResponse>(
    () => api.atuneBroadcasts(20),
    { intervalMs: 2000 },
  );

  // Event injection
  const [eventText, setEventText] = useState("");
  const [eventChannel, setEventChannel] = useState("text_chat");
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState<string | null>(null);

  const injectEvent = useCallback(async () => {
    const text = eventText.trim();
    if (!text) return;
    setInjecting(true);
    setInjectResult(null);
    try {
      const res = await api.perceiveEvent(text, eventChannel);
      setInjectResult(`Accepted: ${JSON.stringify(res)}`);
      setEventText("");
      setTimeout(() => {
        broadcasts.refetch();
        affect.refetch();
      }, 500);
    } catch (err) {
      setInjectResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInjecting(false);
    }
  }, [eventText, eventChannel, broadcasts, affect]);

  const overallTraj = momentum.data?.overall_trajectory ?? "steady";
  const cycleCount = workspace.data?.cycle_count ?? 0;
  const dynamicThreshold = workspace.data?.dynamic_threshold ?? null;
  const metaMode = workspace.data?.meta_attention_mode ?? null;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Atune"
        description="Interoceptive substrate — 9D somatic state from Soma"
      >
        <div className="flex items-center gap-2">
          {metaMode && (
            <Badge
              variant={
                metaMode === "crisis"
                  ? "danger"
                  : metaMode === "care"
                    ? "warning"
                    : metaMode === "learning"
                      ? "success"
                      : metaMode === "coherence_repair"
                        ? "info"
                        : "muted"
              }
            >
              {metaMode}
            </Badge>
          )}
          {overallTraj !== "steady" && (
            <Badge variant={TRAJECTORY_BADGE[overallTraj] ?? "muted"}>
              {overallTraj} trajectory
            </Badge>
          )}
          <div className="text-[11px] text-white/20 tabular-nums">
            cycle #{cycleCount.toLocaleString()}
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* ── Affect State ── */}
        <Card glow>
          <CardHeader>
            <CardTitle>Affect State</CardTitle>
            {affect.data?.timestamp && (
              <span className="text-[10px] text-white/20">
                {new Date(affect.data.timestamp).toLocaleTimeString()}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {affect.data ? (
              <AffectRadar data={affect.data} />
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Mood Baseline ── */}
        <Card>
          <CardHeader>
            <CardTitle>Mood Baseline</CardTitle>
            <span className="text-[10px] text-white/20">0.5% drift / cycle</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {mood.data?.mood_baseline ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/40">Mood valence</span>
                    <span className="text-[11px] text-white/60 tabular-nums font-mono">
                      {mood.data.mood_baseline.valence.toFixed(4)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${((mood.data.mood_baseline.valence + 1) / 2) * 100}%`,
                        background:
                          mood.data.mood_baseline.valence >= 0 ? "#5eead4" : "#fb7185",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/15 mt-0.5">
                    <span>−1.0 neg</span>
                    <span>0</span>
                    <span>+1.0 pos</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-white/40">Emotional memory</span>
                    <span className="text-[11px] text-white/30">
                      {mood.data.emotional_memory_size} events
                    </span>
                  </div>
                  <EmotionalMemoryDots points={mood.data.emotional_memory} />
                </div>
              </>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Workspace ── */}
        <Card>
          <CardHeader>
            <CardTitle>Global Workspace</CardTitle>
            {dynamicThreshold !== null && (
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-white/20" />
                <span className="text-[10px] text-white/30 tabular-nums font-mono">
                  θ={dynamicThreshold.toFixed(3)}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {config.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Queue",
                      value: config.data.workspace.percept_queue_size,
                      max: config.data.max_percept_queue_size,
                      warn: config.data.workspace.percept_queue_size > config.data.max_percept_queue_size * 0.8,
                    },
                    {
                      label: "Contributions",
                      value: config.data.workspace.contribution_queue_size,
                      max: 50,
                      warn: config.data.workspace.contribution_queue_size > 40,
                    },
                    {
                      label: "Habituation",
                      value: config.data.workspace.habituation_sources,
                      max: null,
                      warn: false,
                    },
                    {
                      label: "Buffer",
                      value: config.data.workspace_buffer_size,
                      max: null,
                      warn: false,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] text-white/25">{stat.label}</div>
                      <div
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          stat.warn ? "text-amber-400/80" : "text-white/60",
                        )}
                      >
                        {stat.value.toLocaleString()}
                        {stat.max && (
                          <span className="text-[10px] text-white/20 font-normal">
                            /{stat.max}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[10px] text-white/25 mb-1.5">Ignition threshold (dynamic)</div>
                  <div className="h-2 w-full rounded-full bg-white/[0.05] relative">
                    <div
                      className="h-full rounded-full bg-teal-400/40 transition-all duration-500"
                      style={{
                        width: `${((dynamicThreshold ?? config.data.ignition_threshold) / 1.0) * 100}%`,
                      }}
                    />
                    {/* Base threshold marker */}
                    <div
                      className="absolute top-0 h-full w-px bg-white/20"
                      style={{ left: `${config.data.ignition_threshold * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/15 mt-0.5">
                    <span>0.15 floor</span>
                    <span className="text-white/30">
                      base {config.data.ignition_threshold}
                    </span>
                    <span>0.80 ceiling</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Salience Heads ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Brain size={14} className="inline mr-1.5 opacity-50" />
              Salience Heads
            </CardTitle>
            {salienceHeads.data?.heads && (
              <div className="flex items-center gap-2">
                <Badge variant="muted">{salienceHeads.data.heads.length} heads</Badge>
                <span className="text-[10px] text-white/20">
                  solid = effective · faint = base
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {salienceHeads.data?.heads ? (
              <div className="space-y-1.5">
                {salienceHeads.data.heads
                  .sort((a, b) => b.effective_weight - a.effective_weight)
                  .map((head) => (
                    <SalienceHeadBar
                      key={head.name}
                      name={head.name}
                      baseWeight={head.base_weight}
                      effectiveWeight={head.effective_weight}
                      evoAdj={head.evo_adjustment}
                      precisionSensitivity={head.precision_sensitivity}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Momentum ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity size={14} className="inline mr-1.5 opacity-50" />
              Salience Momentum
            </CardTitle>
            {momentum.data && (
              <Badge variant={TRAJECTORY_BADGE[momentum.data.overall_trajectory] ?? "muted"}>
                {momentum.data.overall_trajectory}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {momentum.data?.momentum && Object.keys(momentum.data.momentum).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(momentum.data.momentum)
                  .sort(([, a], [, b]) => Math.abs(b.first_derivative) - Math.abs(a.first_derivative))
                  .map(([headName, hm]) => (
                    <MomentumRow key={headName} headName={headName} hm={hm} />
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="text-xl opacity-10 mb-2">∂</div>
                <p className="text-xs text-white/20">
                  Momentum accumulates after a few cycles.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Salience Bias Model ── */}
        <Card>
          <CardHeader>
            <CardTitle>Salience Bias Model</CardTitle>
            {biasModel.data && (
              <Badge variant="muted">
                {biasModel.data.total_sources_tracked} sources
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {biasModel.data?.biases && Object.keys(biasModel.data.biases).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(biasModel.data.biases)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .map(([source, bias]) => {
                    const pct = ((bias + 0.4) / 0.8) * 100;
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] text-white/40 font-mono truncate max-w-[140px]">
                            {source}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] tabular-nums font-mono",
                              bias > 0.05
                                ? "text-teal-400/70"
                                : bias < -0.05
                                  ? "text-rose-400/70"
                                  : "text-white/40",
                            )}
                          >
                            {bias > 0 ? "+" : ""}{bias.toFixed(3)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.05] relative">
                          {/* Zero line */}
                          <div className="absolute top-0 h-full w-px bg-white/10" style={{ left: "50%" }} />
                          <div
                            className={cn(
                              "absolute top-0 h-full rounded-full transition-all duration-500",
                              bias >= 0 ? "bg-teal-400/40" : "bg-rose-400/40",
                            )}
                            style={
                              bias >= 0
                                ? { left: "50%", width: `${(bias / 0.4) * 50}%` }
                                : { right: "50%", width: `${(Math.abs(bias) / 0.4) * 50}%` }
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="text-xl opacity-10 mb-2">≈</div>
                <p className="text-xs text-white/20">
                  Bias accumulates from Nova feedback.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Cache & Config ── */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.data ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Ignition threshold", value: config.data.ignition_threshold },
                    { label: "Buffer size", value: config.data.workspace_buffer_size },
                    {
                      label: "Recall probability",
                      value: `${(config.data.spontaneous_recall_base_probability * 100).toFixed(0)}%`,
                    },
                    {
                      label: "Affect persist every",
                      value: `${config.data.affect_persist_interval} cycles`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                      <div className="text-[9px] text-white/20 mb-0.5">{item.label}</div>
                      <div className="text-xs text-white/60 tabular-nums font-mono">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[10px] text-white/25 mb-1.5">Cache refresh intervals</div>
                  <div className="space-y-1">
                    {Object.entries(config.data.cache_refresh_cycles).map(([key, cycles]) => (
                      <div key={key} className="flex items-center justify-between text-[10px]">
                        <span className="text-white/30 capitalize">{key}</span>
                        <span className="text-white/50 tabular-nums font-mono">
                          {cycles.toLocaleString()} cycles
                          <span className="text-white/20 ml-1">
                            (~{Math.round(cycles * 0.1)}s)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent Broadcasts ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace Broadcasts</CardTitle>
            <div className="flex items-center gap-2">
              {broadcasts.data && (
                <Badge variant="muted">{broadcasts.data.total_returned} recent</Badge>
              )}
              <button
                onClick={() => broadcasts.refetch()}
                className="rounded-md p-1 text-white/25 hover:text-white/50 hover:bg-white/[0.04]"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {broadcasts.data && broadcasts.data.broadcasts.length > 0 ? (
              <div className="space-y-1.5">
                {broadcasts.data.broadcasts.map((b) => (
                  <BroadcastCard key={b.broadcast_id} b={b} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="text-2xl opacity-10 mb-2">◉</div>
                <p className="text-xs text-white/20">
                  Waiting for first workspace ignition.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Inject Percept ── */}
        <Card>
          <CardHeader>
            <CardTitle>Inject Percept</CardTitle>
            <span className="text-[10px] text-white/20">
              Pipe input through Atune pipeline
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={eventChannel}
              onChange={(e) => setEventChannel(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 focus:outline-none focus:border-white/15"
            >
              {[
                "text_chat",
                "system_event",
                "sensor_iot",
                "calendar",
                "external_api",
                "memory_bubble",
                "affect_shift",
                "evo_insight",
              ].map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") injectEvent();
                }}
                placeholder="Event content..."
                className={cn(
                  "flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90",
                  "placeholder:text-white/20 focus:border-white/15 focus:outline-none",
                )}
              />
              <button
                onClick={injectEvent}
                disabled={!eventText.trim() || injecting}
                className={cn(
                  "rounded-lg border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm text-white/60",
                  "hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none transition-colors",
                )}
              >
                {injecting ? "..." : "Send"}
              </button>
            </div>

            {injectResult && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs leading-relaxed",
                  injectResult.startsWith("Error")
                    ? "border-rose-500/20 bg-rose-500/[0.05] text-rose-400/70"
                    : "border-teal-500/20 bg-teal-500/[0.05] text-teal-400/70",
                )}
              >
                {injectResult}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
