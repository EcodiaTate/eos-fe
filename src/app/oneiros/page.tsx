"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useOneirosEvents } from "@/hooks/use-oneiros-events";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type {
  OneirosV2StatusResponse,
  SleepCycleV2Response,
} from "@/lib/api-client";
import { pct, fmtBits, relTime, fmtDuration } from "@/lib/formatters";
import {
  ONEIROS_STATUS_POLL_MS,
  ONEIROS_CYCLES_POLL_MS,
} from "@/lib/polling-constants";

// ─── Helpers ─────────────────────────────────────────────────────

function fmt2(v: number): string {
  return v.toFixed(2);
}

function triggerVariant(t: string | null): "info" | "warning" | "danger" | "default" {
  if (t === "scheduled") return "info";
  if (t === "cognitive_pressure") return "warning";
  if (t === "compression_backlog") return "danger";
  return "default";
}

function improvementColor(v: number): string {
  if (v > 0.05) return "text-teal-400";
  if (v > 0) return "text-teal-300/70";
  if (v < -0.01) return "text-red-400";
  return "text-white/50";
}

// ─── Shared primitives ────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-white/50">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm font-medium tabular-nums", accent ?? "text-white/80")}>
          {value}
        </span>
        {sub && <span className="block text-[10px] text-white/30">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({
  value,
  max = 1,
  color = "bg-teal-500/70",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────

const TABS = [
  "Sleep Cycle",
  "Memory Ladder",
  "Causal Graph",
  "REM Activity",
  "Lucid Dreaming",
  "Intelligence",
  "History",
] as const;
type Tab = (typeof TABS)[number];

// ─── Sleep Cycle Status ───────────────────────────────────────────

const STAGES = [
  { id: "descent", label: "Descent", pct: 0.10, color: "bg-indigo-500", desc: "Safe state capture" },
  { id: "slow_wave", label: "Slow Wave", pct: 0.50, color: "bg-violet-500", desc: "Deep compression" },
  { id: "rem", label: "REM", pct: 0.30, color: "bg-fuchsia-500", desc: "Cross-domain synthesis" },
  { id: "emergence", label: "Emergence", pct: 0.10, color: "bg-teal-500", desc: "World model integration" },
];

function StagePipeline({
  currentStage,
  stageProgressPct,
}: {
  currentStage: string;
  stageProgressPct: number;
}) {
  const stageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="space-y-3">
      {/* Stage progression bar */}
      <div className="flex gap-1 h-8">
        {STAGES.map((stage, i) => {
          const isPast = stageIndex > i;
          const isCurrent = stageIndex === i;
          const isFuture = stageIndex < i;

          return (
            <div
              key={stage.id}
              className="relative flex-1 rounded-md overflow-hidden"
              style={{ flex: stage.pct }}
            >
              {/* Background */}
              <div className={cn(
                "absolute inset-0 transition-all duration-1000",
                isPast ? stage.color : "bg-white/[0.04]",
              )} />
              {/* Current stage progress fill */}
              {isCurrent && (
                <div
                  className={cn("absolute inset-y-0 left-0 transition-all duration-700", stage.color, "opacity-70")}
                  style={{ width: `${stageProgressPct}%` }}
                />
              )}
              {/* Label */}
              <div className={cn(
                "relative z-10 h-full flex items-center justify-center",
                isFuture ? "opacity-30" : "opacity-100",
              )}>
                <span className="text-[10px] font-medium text-white truncate px-1">
                  {stage.label}
                </span>
              </div>
              {/* Current pulse indicator */}
              {isCurrent && (
                <div className="absolute top-1 right-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage details row */}
      <div className="grid grid-cols-4 gap-1">
        {STAGES.map((stage, i) => {
          const isCurrent = stageIndex === i;
          const isPast = stageIndex > i;
          return (
            <div
              key={stage.id}
              className={cn(
                "text-center px-1",
                isCurrent ? "opacity-100" : isPast ? "opacity-60" : "opacity-25",
              )}
            >
              <div className={cn("text-[10px] font-medium", isCurrent ? "text-white" : "text-white/60")}>
                {stage.label}
              </div>
              <div className="text-[9px] text-white/40">{(stage.pct * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-white/30 hidden sm:block">{stage.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SleepCycleTab({
  events,
  status,
}: {
  events: ReturnType<typeof useOneirosEvents>;
  status: OneirosV2StatusResponse | null;
}) {
  const { currentStage, stageProgressPct, trigger, timeElapsedS, isSleeping, cycleId } = events;
  const effectiveTrigger = trigger ?? status?.trigger ?? null;
  const effectiveStage = status?.current_stage ?? currentStage;
  const effectivePct = status?.stage_progress_pct ?? stageProgressPct;

  return (
    <div className="space-y-4">
      {/* Active sleep banner */}
      {isSleeping && (
        <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.04] px-4 py-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-fuchsia-300">Sleep cycle in progress</span>
            {effectiveTrigger && (
              <span className="ml-2 text-xs text-white/30">
                triggered by <span className="text-white/50">{effectiveTrigger.replace(/_/g, " ")}</span>
              </span>
            )}
          </div>
          {effectiveTrigger && (
            <Badge variant={triggerVariant(effectiveTrigger)}>
              {effectiveTrigger.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      )}

      {/* Stage pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isSleeping ? "info" : "muted"} pulse={isSleeping}>
              {effectiveStage.replace(/_/g, " ").toUpperCase()}
            </Badge>
            {effectivePct > 0 && effectivePct < 100 && (
              <span className="text-xs text-white/40">{effectivePct.toFixed(0)}%</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <StagePipeline currentStage={effectiveStage} stageProgressPct={effectivePct} />
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Stat label="Stage" value={effectiveStage.replace(/_/g, " ")} />
            <Stat label="Stage Progress" value={`${effectivePct.toFixed(0)}%`} />
            <Stat
              label="Time Elapsed"
              value={timeElapsedS > 0 ? `${timeElapsedS.toFixed(0)}s` : (status ? `${status.time_elapsed_s.toFixed(0)}s` : "—")}
            />
            <Stat
              label="Trigger"
              value={effectiveTrigger?.replace(/_/g, " ") ?? "—"}
            />
            {cycleId && (
              <Stat label="Cycle ID" value={cycleId.slice(0, 8) + "…"} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifetime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Stat
              label="Cycles Completed"
              value={status?.sleep_cycles_completed ?? 0}
            />
            <Stat
              label="Mean IQ Improvement"
              value={
                status?.intelligence_improvement_per_cycle?.length
                  ? pct(
                      status.intelligence_improvement_per_cycle.reduce((a, b) => a + b, 0) /
                        status.intelligence_improvement_per_cycle.length,
                      2,
                    )
                  : "—"
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Stage transition log */}
      {events.stageTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage Transition Log</CardTitle>
            <span className="text-[10px] text-white/30">This sleep cycle</span>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {events.stageTransitions.slice(0, 8).map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-xs">{relTime(t.ts)}</span>
                  <span className="text-white/40 text-xs">{t.data.from_stage}</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/80">{t.data.to_stage}</span>
                </div>
                <span className="text-white/30 text-xs">{t.data.time_elapsed_s.toFixed(0)}s</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Memory Ladder ────────────────────────────────────────────────

const RUNG_LABELS = [
  { rung: 1, label: "Episodic → Semantic", color: "bg-indigo-500/70", desc: "Episodes promoted to semantic nodes" },
  { rung: 2, label: "Semantic → Schema", color: "bg-teal-500/70", desc: "Nodes generalised into schemas" },
  { rung: 3, label: "Schema → Procedure", color: "bg-violet-500/70", desc: "Schemas abstracted to procedures" },
  { rung: 4, label: "Procedure → World Model", color: "bg-emerald-500/70", desc: "Procedures integrated as rules" },
];

function MemoryLadderTab({ events, lastCycle }: {
  events: ReturnType<typeof useOneirosEvents>;
  lastCycle: SleepCycleV2Response | null;
}) {
  const live = events.memoryLadder;
  const fromCycle = lastCycle?.slow_wave?.compression ?? null;

  // Prefer live data, fall back to last cycle REST data
  const ladder = live?.data ?? fromCycle;
  const rungs = lastCycle?.slow_wave?.compression?.rung_details ?? [];

  if (!ladder) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-white/30">
        Waiting for next Slow Wave stage…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Memories In", value: ladder.memories_processed, color: "text-white/80" },
          { label: "Compression Ratio", value: pct(ladder.compression_ratio, 1), color: "text-teal-400" },
          { label: "Anchor Memories", value: ladder.anchor_memories, color: "text-amber-400" },
          { label: "World Model Updates", value: ladder.world_model_updates, color: "text-emerald-400" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-3 text-center">
              <div className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rung details */}
      <div className="space-y-3">
        {RUNG_LABELS.map(({ rung, label, color, desc }) => {
          const rungData = rungs.find((r) => r.rung === rung);
          const promoted = rung === 1 ? ladder.semantic_nodes_created :
                           rung === 2 ? ladder.schemas_created :
                           rung === 3 ? ladder.procedures_extracted :
                           ladder.world_model_updates;

          return (
            <Card key={rung}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80">{label}</div>
                    <div className="text-[10px] text-white/35">{desc}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium tabular-nums text-white/70">
                      {promoted.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/30">promoted</div>
                  </div>
                </div>
                {rungData && (
                  <div className="grid grid-cols-4 gap-2 text-center mt-2 pt-2 border-t border-white/[0.06]">
                    <div>
                      <div className="text-xs tabular-nums text-white/60">{rungData.items_in}</div>
                      <div className="text-[9px] text-white/30">in</div>
                    </div>
                    <div>
                      <div className="text-xs tabular-nums text-teal-400">{rungData.items_promoted}</div>
                      <div className="text-[9px] text-white/30">promoted</div>
                    </div>
                    <div>
                      <div className="text-xs tabular-nums text-amber-400">{rungData.items_anchored}</div>
                      <div className="text-[9px] text-white/30">anchored</div>
                    </div>
                    <div>
                      <div className="text-xs tabular-nums text-red-400/70">{rungData.items_decay_flagged}</div>
                      <div className="text-[9px] text-white/30">decay</div>
                    </div>
                  </div>
                )}
                {rungData && (
                  <div className="mt-2">
                    <MiniBar
                      value={rungData.items_promoted}
                      max={rungData.items_in || 1}
                      color={color}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Total compression */}
      <Card>
        <CardHeader>
          <CardTitle>Total Compression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Stat label="Memories Processed" value={ladder.memories_processed.toLocaleString()} />
          <Stat label="Semantic Nodes Created" value={ladder.semantic_nodes_created.toLocaleString()} />
          <Stat label="Schemas Created" value={ladder.schemas_created.toLocaleString()} />
          <Stat label="Procedures Extracted" value={ladder.procedures_extracted.toLocaleString()} />
          <Stat label="World Model Updates" value={ladder.world_model_updates.toLocaleString()} />
          <Stat label="Anchor Memories" value={ladder.anchor_memories.toLocaleString()} />
          <div className="pt-2">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Compression Ratio</span>
              <span className="text-teal-400 font-medium tabular-nums">{pct(ladder.compression_ratio, 1)}</span>
            </div>
            <MiniBar value={ladder.compression_ratio} max={1} color="bg-teal-500/70" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Causal Graph Reconstruction ─────────────────────────────────

function CausalGraphTab({ events, lastCycle }: {
  events: ReturnType<typeof useOneirosEvents>;
  lastCycle: SleepCycleV2Response | null;
}) {
  const live = events.causalGraph;
  const fromCycle = lastCycle?.slow_wave?.causal ?? null;
  const graph = live?.data ?? fromCycle;

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-white/30">
        Waiting for next Slow Wave stage…
      </div>
    );
  }

  const changeMagnitude = graph.change_magnitude;
  const changeColor =
    changeMagnitude > 0.7 ? "text-red-400" :
    changeMagnitude > 0.4 ? "text-amber-400" :
    changeMagnitude > 0.1 ? "text-teal-400" :
    "text-white/40";

  const changeBg =
    changeMagnitude > 0.7 ? "bg-red-500/70" :
    changeMagnitude > 0.4 ? "bg-amber-500/70" :
    changeMagnitude > 0.1 ? "bg-teal-500/70" :
    "bg-white/20";

  return (
    <div className="space-y-4">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Nodes in Graph", value: graph.nodes_in_graph.toLocaleString(), color: "text-sky-400" },
          { label: "Edges", value: graph.edges_in_graph.toLocaleString(), color: "text-indigo-400" },
          { label: "Invariants Discovered", value: graph.invariants_discovered.toLocaleString(), color: "text-teal-400" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4 text-center">
              <div className={cn("text-2xl font-bold tabular-nums", item.color)}>{item.value}</div>
              <div className="text-[10px] text-white/30 mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Change magnitude */}
      <Card>
        <CardHeader>
          <CardTitle>Graph Delta — What Changed This Sleep</CardTitle>
          <Badge
            variant={changeMagnitude > 0.7 ? "danger" : changeMagnitude > 0.4 ? "warning" : changeMagnitude > 0.1 ? "success" : "muted"}
          >
            {changeMagnitude > 0.7 ? "Major Rebuild" :
             changeMagnitude > 0.4 ? "Significant Change" :
             changeMagnitude > 0.1 ? "Incremental Update" : "Stable"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Change Magnitude</span>
              <span className={cn("font-medium tabular-nums", changeColor)}>
                {pct(changeMagnitude, 1)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-1000", changeBg)}
                style={{ width: `${changeMagnitude * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 mt-1">
              <span>no change</span>
              <span>complete rebuild</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Stat
                label="Contradictions Resolved"
                value={graph.contradictions_resolved.toLocaleString()}
                accent={graph.contradictions_resolved > 0 ? "text-amber-400" : "text-white/40"}
              />
              <Stat
                label="Invariants Discovered"
                value={graph.invariants_discovered.toLocaleString()}
                accent={graph.invariants_discovered > 0 ? "text-teal-400" : "text-white/40"}
              />
            </div>
            <div className="space-y-2">
              <Stat label="Total Nodes" value={graph.nodes_in_graph.toLocaleString()} />
              <Stat label="Total Edges" value={graph.edges_in_graph.toLocaleString()} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edge density */}
      <Card>
        <CardHeader>
          <CardTitle>Graph Density</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Edges per Node</span>
              <span className="text-white/60 tabular-nums">
                {graph.nodes_in_graph > 0
                  ? (graph.edges_in_graph / graph.nodes_in_graph).toFixed(2)
                  : "—"}
              </span>
            </div>
            <MiniBar
              value={graph.edges_in_graph / Math.max(graph.nodes_in_graph, 1)}
              max={10}
              color="bg-sky-500/60"
            />
          </div>
          {live?.ts && (
            <p className="text-[10px] text-white/25">Last reconstructed {relTime(live.ts)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REM Activity ─────────────────────────────────────────────────

function REMActivityTab({ events, lastCycle }: {
  events: ReturnType<typeof useOneirosEvents>;
  lastCycle: SleepCycleV2Response | null;
}) {
  const { crossDomainMatches, analogies, dreamHypotheses } = events;
  const remFromCycle = lastCycle?.rem ?? null;

  return (
    <div className="space-y-4">
      {/* REM summary from last cycle */}
      {remFromCycle && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cross-Domain Matches", value: remFromCycle.cross_domain.strong_matches, color: "text-fuchsia-400" },
            { label: "Evo Candidates", value: remFromCycle.cross_domain.evo_candidates, color: "text-amber-400" },
            { label: "Analogies Found", value: remFromCycle.analogies.analogies_found, color: "text-teal-400" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="py-3 text-center">
                <div className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Live cross-domain match feed */}
      <Card>
        <CardHeader>
          <CardTitle>Cross-Domain Matches</CardTitle>
          <span className="text-[10px] text-white/30">
            {crossDomainMatches.length > 0
              ? `${crossDomainMatches.length} this cycle`
              : remFromCycle
              ? `${remFromCycle.cross_domain.strong_matches} last cycle`
              : "Waiting for REM…"}
          </span>
        </CardHeader>
        <CardContent>
          {crossDomainMatches.length > 0 ? (
            <div className="space-y-2">
              {crossDomainMatches.slice(0, 12).map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-sky-400 truncate">{m.data.domain_a}</span>
                      <span className="text-white/20 text-xs">↔</span>
                      <span className="text-xs text-fuchsia-400 truncate">{m.data.domain_b}</span>
                    </div>
                    <div className="mt-0.5">
                      <MiniBar value={m.data.isomorphism_score} max={1} color="bg-fuchsia-500/60" />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-medium tabular-nums text-fuchsia-300">
                      {pct(m.data.isomorphism_score, 0)}
                    </div>
                    {m.data.isomorphism_score > 0.9 && (
                      <Badge variant="warning" className="mt-0.5">Evo candidate</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : remFromCycle?.cross_domain.matches?.length ? (
            <div className="space-y-2">
              {remFromCycle.cross_domain.matches.slice(0, 8).map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-sky-400">{m.domain_a}</span>
                      <span className="text-white/20 text-xs">↔</span>
                      <span className="text-xs text-fuchsia-400">{m.domain_b}</span>
                    </div>
                    <MiniBar value={m.isomorphism_score} max={1} color="bg-fuchsia-500/60" />
                  </div>
                  <div className="text-xs font-medium tabular-nums text-fuchsia-300">
                    {pct(m.isomorphism_score, 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-white/30">No cross-domain matches yet</div>
          )}
        </CardContent>
      </Card>

      {/* Dream hypothesis generation */}
      {(dreamHypotheses || remFromCycle?.dreams) && (
        <Card>
          <CardHeader>
            <CardTitle>Dream Hypothesis Generation</CardTitle>
            {dreamHypotheses?.ts && (
              <span className="text-[10px] text-white/30">{relTime(dreamHypotheses.ts)}</span>
            )}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {dreamHypotheses ? (
              <>
                <Stat label="Domains Targeted" value={dreamHypotheses.data.domains_targeted} />
                <Stat label="Scenarios Generated" value={dreamHypotheses.data.scenarios_generated} />
                <Stat label="Hypotheses Extracted" value={dreamHypotheses.data.hypotheses_extracted} accent="text-teal-400" />
                <Stat
                  label="Low Quality Predictions"
                  value={dreamHypotheses.data.low_quality_predictions}
                  accent={dreamHypotheses.data.low_quality_predictions > 0 ? "text-amber-400" : "text-white/40"}
                />
              </>
            ) : remFromCycle?.dreams ? (
              <>
                <Stat label="Domains Targeted" value={remFromCycle.dreams.domains_targeted} />
                <Stat label="Scenarios Generated" value={remFromCycle.dreams.scenarios_generated} />
                <Stat label="Hypotheses Extracted" value={remFromCycle.dreams.hypotheses_extracted} accent="text-teal-400" />
                <Stat label="Pre-Attention Entries Cached" value={remFromCycle.dreams.pre_attention_entries_cached} />
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Analogies */}
      <Card>
        <CardHeader>
          <CardTitle>Analogical Transfers</CardTitle>
          <span className="text-[10px] text-white/30">
            {analogies.length > 0
              ? `${analogies.length} this cycle`
              : remFromCycle
              ? `${remFromCycle.analogies.analogies_found} last cycle`
              : "Waiting for REM…"}
          </span>
        </CardHeader>
        <CardContent>
          {analogies.length > 0 ? (
            <div className="space-y-3">
              {analogies.slice(0, 8).map((a, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm text-white/80 leading-relaxed">{a.data.invariant_statement}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.data.source_domains.map((d) => (
                      <Badge key={d} variant="info">{d}</Badge>
                    ))}
                    <span className="text-[10px] text-teal-400/70">
                      {fmtBits(a.data.mdl_improvement)} saved
                    </span>
                    <span className="text-[10px] text-white/30">{a.data.domain_count} domains</span>
                  </div>
                </div>
              ))}
            </div>
          ) : remFromCycle?.analogies.transfers?.length ? (
            <div className="space-y-3">
              {remFromCycle.analogies.transfers.slice(0, 5).map((a, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm text-white/80">{a.invariant_statement}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.source_domains.slice(0, 4).map((d) => (
                      <Badge key={d} variant="info">{d}</Badge>
                    ))}
                    <span className="text-[10px] text-teal-400/70">
                      {fmtBits(a.mdl_improvement)} saved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-white/30">No analogies discovered yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Lucid Dreaming ───────────────────────────────────────────────

function LucidDreamingTab({ events, lastCycle }: {
  events: ReturnType<typeof useOneirosEvents>;
  lastCycle: SleepCycleV2Response | null;
}) {
  const { lucidResults } = events;
  const lucidFromCycle = lastCycle?.lucid ?? null;

  const liveApply = lucidResults.filter((r) => r.data.recommendation === "apply");
  const liveReject = lucidResults.filter((r) => r.data.recommendation === "reject");
  const liveViolations = lucidResults.filter((r) => r.data.any_constitutional_violations);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Mutations Tested",
            value: lucidResults.length > 0 ? lucidResults.length : (lucidFromCycle?.mutations_tested ?? 0),
            color: "text-white/80",
          },
          {
            label: "Apply",
            value: lucidResults.length > 0 ? liveApply.length : (lucidFromCycle?.mutations_recommended_apply ?? 0),
            color: "text-teal-400",
          },
          {
            label: "Reject",
            value: lucidResults.length > 0 ? liveReject.length : (lucidFromCycle?.mutations_recommended_reject ?? 0),
            color: "text-white/40",
          },
          {
            label: "Constitutional Violations",
            value: lucidResults.length > 0 ? liveViolations.length : (lucidFromCycle?.constitutional_violations_found ?? 0),
            color: "text-red-400",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-3 text-center">
              <div className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live mutation results */}
      {lucidResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live Mutation Tests</CardTitle>
            <Badge variant="info" pulse>Active</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {lucidResults.slice(0, 10).map((r, i) => (
              <div key={i} className="space-y-1.5 pb-3 border-b border-white/[0.04] last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white/80 leading-relaxed flex-1">
                    {r.data.mutation_description || `Mutation ${r.data.mutation_id.slice(0, 8)}`}
                  </p>
                  <Badge variant={r.data.recommendation === "apply" ? "success" : "muted"}>
                    {r.data.recommendation}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] text-white/30">
                    {r.data.scenarios_tested} scenarios
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    r.data.overall_performance_delta > 0 ? "text-teal-400" : "text-red-400/70",
                  )}>
                    Δ {r.data.overall_performance_delta > 0 ? "+" : ""}{fmt2(r.data.overall_performance_delta)}
                  </span>
                  {r.data.any_constitutional_violations && (
                    <Badge variant="danger">Constitutional violation</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Last cycle lucid data */}
      {!lucidResults.length && lucidFromCycle?.reports?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Last Cycle Mutation Tests</CardTitle>
            <span className="text-[10px] text-white/30">{lucidFromCycle.mutations_tested} tested</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {lucidFromCycle.reports.slice(0, 8).map((r, i) => (
              <div key={i} className="space-y-1.5 pb-3 border-b border-white/[0.04] last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white/80 leading-relaxed flex-1">
                    {r.mutation_description || `Mutation ${r.mutation_id.slice(0, 8)}`}
                  </p>
                  <Badge variant={r.recommendation === "apply" ? "success" : "muted"}>
                    {r.recommendation}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] text-white/30">{r.scenarios_tested} scenarios</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    r.overall_performance_delta > 0 ? "text-teal-400" : "text-red-400/70",
                  )}>
                    Δ {r.overall_performance_delta > 0 ? "+" : ""}{fmt2(r.overall_performance_delta)}
                  </span>
                  {r.any_constitutional_violations && (
                    <Badge variant="danger">Constitutional violation</Badge>
                  )}
                </div>
                {r.violation_details?.length > 0 && (
                  <div className="space-y-0.5">
                    {r.violation_details.map((v, vi) => (
                      <p key={vi} className="text-[10px] text-red-400/70 pl-2 border-l border-red-500/20">
                        {v}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !lucidResults.length && (
        <div className="flex items-center justify-center h-32 text-sm text-white/30">
          Waiting for Lucid Dreaming stage…
        </div>
      )}
    </div>
  );
}

// ─── Intelligence Improvement ─────────────────────────────────────

function Sparkline({ points, color = "#2dd4bf" }: { points: number[]; color?: string }) {
  if (points.length < 2) {
    return <div className="h-16 flex items-center justify-center text-xs text-white/20">Not enough data</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.01;
  const w = 300;
  const h = 64;
  const pad = 4;

  const pts = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const areaBase = h - pad;
  const areaPath = `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(" ")} L ${pts[pts.length - 1].split(",")[0]},${areaBase} L ${pts[0].split(",")[0]},${areaBase} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <path d={areaPath} fill={color} fillOpacity="0.08" />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((v, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return (
          <circle key={i} cx={x} cy={y} r="2" fill={color} />
        );
      })}
    </svg>
  );
}

function IntelligenceTab({
  events,
  status,
  cycles,
}: {
  events: ReturnType<typeof useOneirosEvents>;
  status: OneirosV2StatusResponse | null;
  cycles: SleepCycleV2Response[];
}) {
  // Collect intelligence_improvement per cycle (REST history + live wake events)
  const cycleImprovements = useMemo(() => {
    const fromRest = cycles
      .filter((c) => c.completed_at)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((c) => ({
        t: new Date(c.started_at).getTime(),
        before: c.checkpoint?.intelligence_ratio_at_sleep ?? 0,
        after: (c.checkpoint?.intelligence_ratio_at_sleep ?? 0) + c.intelligence_improvement,
        improvement: c.intelligence_improvement,
        trigger: c.trigger,
      }));
    return fromRest;
  }, [cycles]);

  const liveHistory = events.intelligenceHistory;
  const allPoints = [...cycleImprovements.map((c) => c.improvement), ...liveHistory.map((h) => h.improvement)];
  const sparkPoints = [...cycleImprovements.map((c) => c.improvement)];
  const lastImprovement = liveHistory[0]?.improvement ?? cycleImprovements[cycleImprovements.length - 1]?.improvement ?? null;
  const isImproving = lastImprovement !== null && lastImprovement > 0;
  const isDeclining = lastImprovement !== null && lastImprovement < -0.01;
  const meanImprovement = allPoints.length > 0 ? allPoints.reduce((a, b) => a + b, 0) / allPoints.length : null;

  return (
    <div className="space-y-4">
      {/* Alert for declining intelligence */}
      {isDeclining && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-4 py-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-red-300">
            Intelligence declining — last cycle improved by{" "}
            <span className="font-medium tabular-nums">{pct(lastImprovement!, 2)}</span>.
            Investigate sleep quality or compression efficiency.
          </p>
        </div>
      )}

      {/* Key metric */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className={cn("text-3xl font-bold tabular-nums", improvementColor(lastImprovement ?? 0))}>
              {lastImprovement !== null ? (lastImprovement >= 0 ? "+" : "") + pct(lastImprovement, 2) : "—"}
            </div>
            <div className="text-[11px] text-white/30 mt-1">Last Cycle Improvement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className={cn("text-3xl font-bold tabular-nums", improvementColor(meanImprovement ?? 0))}>
              {meanImprovement !== null ? (meanImprovement >= 0 ? "+" : "") + pct(meanImprovement, 2) : "—"}
            </div>
            <div className="text-[11px] text-white/30 mt-1">Mean Improvement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold tabular-nums text-white/80">
              {status?.sleep_cycles_completed ?? cycles.length}
            </div>
            <div className="text-[11px] text-white/30 mt-1">Total Cycles</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend sparkline */}
      <Card>
        <CardHeader>
          <CardTitle>Intelligence Improvement per Cycle</CardTitle>
          <Badge variant={isImproving ? "success" : isDeclining ? "danger" : "muted"}>
            {isImproving ? "Improving" : isDeclining ? "Declining" : "Stable"}
          </Badge>
        </CardHeader>
        <CardContent>
          {sparkPoints.length >= 2 ? (
            <>
              <Sparkline
                points={sparkPoints}
                color={isDeclining ? "#f87171" : isImproving ? "#2dd4bf" : "#94a3b8"}
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>cycle 1</span>
                <span>cycle {sparkPoints.length}</span>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-sm text-white/30">
              Need at least 2 cycles for trend analysis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-cycle breakdown */}
      {cycleImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Cycle Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cycleImprovements.slice().reverse().slice(0, 15).map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-white/25 w-16 flex-shrink-0">
                    {new Date(c.t).toLocaleDateString()}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          c.improvement > 0 ? "bg-teal-500/70" : "bg-red-500/60",
                        )}
                        style={{
                          width: `${Math.min(100, Math.abs(c.improvement) * 1000)}%`,
                          marginLeft: c.improvement < 0 ? "auto" : undefined,
                        }}
                      />
                    </div>
                  </div>
                  <span className={cn("text-xs tabular-nums font-medium w-16 text-right flex-shrink-0", improvementColor(c.improvement))}>
                    {c.improvement >= 0 ? "+" : ""}{pct(c.improvement, 2)}
                  </span>
                  <Badge variant={triggerVariant(c.trigger)} className="flex-shrink-0 text-[9px]">
                    {c.trigger?.slice(0, 4) ?? "—"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sleep History ────────────────────────────────────────────────

function HistoryTab({ cycles }: { cycles: SleepCycleV2Response[] }) {
  const sorted = useMemo(
    () =>
      [...cycles].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      ),
    [cycles],
  );

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-white/30">
        No sleep cycles recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((cycle) => {
        const durationMs = cycle.completed_at
          ? new Date(cycle.completed_at).getTime() - new Date(cycle.started_at).getTime()
          : null;

        const stagesCompleted = [
          cycle.slow_wave ? "Slow Wave" : null,
          cycle.rem ? "REM" : null,
          cycle.lucid ? "Lucid" : null,
          cycle.emergence ? "Emergence" : null,
        ].filter(Boolean);

        return (
          <Card key={cycle.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white/80">
                      {new Date(cycle.started_at).toLocaleString()}
                    </span>
                    {cycle.interrupted && <Badge variant="warning">Interrupted</Badge>}
                  </div>
                  <div className="text-xs text-white/35">
                    {durationMs !== null ? fmtDuration(durationMs) : "In progress"}
                    {stagesCompleted.length > 0 && (
                      <> · {stagesCompleted.join(" · ")}</>
                    )}
                  </div>
                  {/* Stage stats */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-white/30">
                    {cycle.slow_wave?.compression && (
                      <span>
                        Compressed {cycle.slow_wave.compression.memories_processed.toLocaleString()} memories
                        {" · "}{pct(cycle.slow_wave.compression.compression_ratio, 1)} ratio
                      </span>
                    )}
                    {cycle.rem?.cross_domain && (
                      <span>
                        {cycle.rem.cross_domain.strong_matches} cross-domain matches
                      </span>
                    )}
                    {cycle.rem?.analogies && (
                      <span>{cycle.rem.analogies.analogies_found} analogies</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Intelligence improvement */}
                  <div className="text-right">
                    <div className={cn("text-lg font-bold tabular-nums", improvementColor(cycle.intelligence_improvement))}>
                      {cycle.intelligence_improvement >= 0 ? "+" : ""}{pct(cycle.intelligence_improvement, 2)}
                    </div>
                    <div className="text-[9px] text-white/25">IQ Δ</div>
                  </div>
                  <Badge variant={triggerVariant(cycle.trigger)}>
                    {cycle.trigger?.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function OneirosPage() {
  const [tab, setTab] = useState<Tab>("Sleep Cycle");

  const events = useOneirosEvents();
  const status = useApi<OneirosV2StatusResponse>(api.oneirosV2Status, { intervalMs: ONEIROS_STATUS_POLL_MS });
  const cyclesApi = useApi<SleepCycleV2Response[]>(
    () => api.oneirosV2SleepCycles(30),
    { intervalMs: ONEIROS_CYCLES_POLL_MS },
  );

  const lastCycle = status.data?.last_cycle ?? cyclesApi.data?.[0] ?? null;
  const cycles = cyclesApi.data ?? [];

  const isSleeping = events.isSleeping || (status.data?.current_stage ?? "wake") !== "wake";
  const currentStage = status.data?.current_stage ?? events.currentStage;
  const trigger = status.data?.trigger ?? events.trigger;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oneiros v2"
        description="Sleep as Batch Compiler — memory compression, causal reconstruction, and cross-domain synthesis."
      >
        <div className="flex items-center gap-2">
          {isSleeping && (
            <Badge variant="info" pulse>
              {currentStage.replace(/_/g, " ").toUpperCase()}
            </Badge>
          )}
          {!isSleeping && (
            <Badge variant="muted">AWAKE</Badge>
          )}
          {trigger && isSleeping && (
            <Badge variant={triggerVariant(trigger)}>
              {trigger.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </PageHeader>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-lg bg-white/[0.02] p-1 border border-white/[0.06] flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              tab === t
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/70",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Sleep Cycle" && (
        <SleepCycleTab events={events} status={status.data ?? null} />
      )}
      {tab === "Memory Ladder" && (
        <MemoryLadderTab events={events} lastCycle={lastCycle} />
      )}
      {tab === "Causal Graph" && (
        <CausalGraphTab events={events} lastCycle={lastCycle} />
      )}
      {tab === "REM Activity" && (
        <REMActivityTab events={events} lastCycle={lastCycle} />
      )}
      {tab === "Lucid Dreaming" && (
        <LucidDreamingTab events={events} lastCycle={lastCycle} />
      )}
      {tab === "Intelligence" && (
        <IntelligenceTab events={events} status={status.data ?? null} cycles={cycles} />
      )}
      {tab === "History" && <HistoryTab cycles={cycles} />}
    </div>
  );
}
