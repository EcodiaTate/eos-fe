/**
 * EcodiaOS — Oneiros v2 Live Events Hook
 *
 * Opens a secondary WebSocket connection (same pattern as Logos page)
 * and collects Oneiros v2 synapse events in bounded ring buffers.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { SynapseEvent } from "@/lib/types";

// ─── Event payload shapes ────────────────────────────────────────

export interface SleepInitiatedPayload {
  trigger: string;
  intelligence_ratio_at_sleep: number;
  active_hypothesis_count: number;
  unprocessed_error_count: number;
}

export interface SleepStageTransitionPayload {
  from_stage: string;
  to_stage: string;
  stage_progress_pct: number;
  time_elapsed_s: number;
  cycle_id: string;
}

export interface MemoryLadderPayload {
  memories_processed: number;
  semantic_nodes_created: number;
  schemas_created: number;
  procedures_extracted: number;
  world_model_updates: number;
  anchor_memories: number;
  compression_ratio: number;
}

export interface CausalGraphPayload {
  nodes_in_graph: number;
  edges_in_graph: number;
  contradictions_resolved: number;
  invariants_discovered: number;
  change_magnitude: number;
}

export interface CrossDomainMatchPayload {
  id: string;
  domain_a: string;
  domain_b: string;
  isomorphism_score: number;
  mdl_improvement: number;
}

export interface AnalogyPayload {
  id: string;
  invariant_statement: string;
  source_domains: string[];
  domain_count: number;
  mdl_improvement: number;
}

export interface DreamHypothesesPayload {
  domains_targeted: number;
  scenarios_generated: number;
  hypotheses_extracted: number;
  low_quality_predictions: number;
}

export interface LucidDreamResultPayload {
  mutation_id: string;
  mutation_description: string;
  scenarios_tested: number;
  overall_performance_delta: number;
  any_constitutional_violations: boolean;
  recommendation: "apply" | "reject";
}

export interface WakeInitiatedPayload {
  intelligence_ratio_before: number;
  intelligence_ratio_after: number;
  intelligence_improvement: number;
  cross_domain_matches: number;
  analogies_discovered: number;
  dreams_generated: number;
  mutations_tested: number;
}

export interface TimestampedEvent<T> {
  ts: string;
  data: T;
}

// ─── Hook state ──────────────────────────────────────────────────

export interface OneirosV2Events {
  currentStage: string;
  stageProgressPct: number;
  trigger: string | null;
  cycleId: string | null;
  timeElapsedS: number;
  isSleeping: boolean;
  stageTransitions: TimestampedEvent<SleepStageTransitionPayload>[];
  memoryLadder: TimestampedEvent<MemoryLadderPayload> | null;
  causalGraph: TimestampedEvent<CausalGraphPayload> | null;
  crossDomainMatches: TimestampedEvent<CrossDomainMatchPayload>[];
  analogies: TimestampedEvent<AnalogyPayload>[];
  dreamHypotheses: TimestampedEvent<DreamHypothesesPayload> | null;
  lucidResults: TimestampedEvent<LucidDreamResultPayload>[];
  lastWake: TimestampedEvent<WakeInitiatedPayload> | null;
  intelligenceHistory: Array<{ t: number; before: number; after: number; improvement: number }>;
}

const INITIAL: OneirosV2Events = {
  currentStage: "wake",
  stageProgressPct: 0,
  trigger: null,
  cycleId: null,
  timeElapsedS: 0,
  isSleeping: false,
  stageTransitions: [],
  memoryLadder: null,
  causalGraph: null,
  crossDomainMatches: [],
  analogies: [],
  dreamHypotheses: null,
  lucidResults: [],
  lastWake: null,
  intelligenceHistory: [],
};

const ONEIROS_EVENTS = new Set([
  "sleep_initiated",
  "sleep_stage_transition",
  "compression_backlog_processed",
  "causal_graph_reconstructed",
  "cross_domain_match_found",
  "analogy_discovered",
  "dream_hypotheses_generated",
  "lucid_dream_result",
  "wake_initiated",
]);

function push<T>(arr: T[], item: T, max = 50): T[] {
  return [item, ...arr].slice(0, max);
}

function wsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8001/ws/alive";
  return (
    process.env.NEXT_PUBLIC_WS_URL ??
    `ws://${window.location.hostname}:8001/ws/alive`
  );
}

export function useOneirosEvents(): OneirosV2Events {
  const [state, setState] = useState<OneirosV2Events>(INITIAL);
  const stateRef = useRef<OneirosV2Events>(INITIAL);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      ws = new WebSocket(wsUrl());

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            stream: string;
            payload: SynapseEvent;
          };
          if (msg.stream !== "synapse") return;
          const event = msg.payload;
          if (!ONEIROS_EVENTS.has(event.type)) return;

          const d = event.data as Record<string, unknown>;
          const ts = event.ts;

          setState((prev) => {
            const next = { ...prev };

            switch (event.type) {
              case "sleep_initiated": {
                const p = d as unknown as SleepInitiatedPayload;
                next.isSleeping = true;
                next.trigger = (p.trigger ?? null) as string | null;
                next.currentStage = "descent";
                next.stageProgressPct = 0;
                next.timeElapsedS = 0;
                // Clear per-cycle buffers on new sleep
                next.crossDomainMatches = [];
                next.analogies = [];
                next.lucidResults = [];
                next.memoryLadder = null;
                next.causalGraph = null;
                next.dreamHypotheses = null;
                break;
              }

              case "sleep_stage_transition": {
                const p = d as unknown as SleepStageTransitionPayload;
                next.currentStage = p.to_stage ?? prev.currentStage;
                next.stageProgressPct = p.stage_progress_pct ?? 0;
                next.timeElapsedS = p.time_elapsed_s ?? prev.timeElapsedS;
                next.cycleId = p.cycle_id ?? prev.cycleId;
                next.stageTransitions = push(prev.stageTransitions, { ts, data: p });
                break;
              }

              case "compression_backlog_processed": {
                const p = d as unknown as MemoryLadderPayload;
                next.memoryLadder = { ts, data: p };
                break;
              }

              case "causal_graph_reconstructed": {
                const p = d as unknown as CausalGraphPayload;
                next.causalGraph = { ts, data: p };
                break;
              }

              case "cross_domain_match_found": {
                const p = d as unknown as CrossDomainMatchPayload;
                next.crossDomainMatches = push(prev.crossDomainMatches, { ts, data: p });
                break;
              }

              case "analogy_discovered": {
                const p = d as unknown as AnalogyPayload;
                next.analogies = push(prev.analogies, { ts, data: p });
                break;
              }

              case "dream_hypotheses_generated": {
                const p = d as unknown as DreamHypothesesPayload;
                next.dreamHypotheses = { ts, data: p };
                break;
              }

              case "lucid_dream_result": {
                const p = d as unknown as LucidDreamResultPayload;
                next.lucidResults = push(prev.lucidResults, { ts, data: p });
                break;
              }

              case "wake_initiated": {
                const p = d as unknown as WakeInitiatedPayload;
                next.isSleeping = false;
                next.currentStage = "wake";
                next.stageProgressPct = 100;
                next.lastWake = { ts, data: p };
                if (p.intelligence_ratio_before != null && p.intelligence_ratio_after != null) {
                  next.intelligenceHistory = push(prev.intelligenceHistory, {
                    t: Date.now(),
                    before: p.intelligence_ratio_before,
                    after: p.intelligence_ratio_after,
                    improvement: p.intelligence_improvement,
                  }, 30);
                }
                break;
              }
            }

            stateRef.current = next;
            return next;
          });
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!dead) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return state;
}
