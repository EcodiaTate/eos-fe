/**
 * EcodiaOS — Alive Frontend Types
 *
 * Mirrors backend primitives for the visualization data pipeline.
 */

// ─── Affect State (from Atune) ───────────────────────────────────

export interface AffectState {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  dominance: number; // 0 to 1
  curiosity: number; // 0 to 1
  care_activation: number; // 0 to 1
  coherence_stress: number; // 0 to 1
  ts: string | null;
}

/** Neutral baseline — matches AffectState.neutral() on the backend. */
export const AFFECT_NEUTRAL: AffectState = {
  valence: 0.0,
  arousal: 0.1,
  dominance: 0.5,
  curiosity: 0.2,
  care_activation: 0.1,
  coherence_stress: 0.0,
  ts: null,
};

// ─── Synapse Events ──────────────────────────────────────────────

export interface SynapseEvent {
  id: string;
  type: SynapseEventType;
  ts: string;
  data: Record<string, unknown>;
  source: string;
}

export type SynapseEventType =
  | "cycle_completed"
  | "rhythm_state_changed"
  | "coherence_shift"
  | "system_failed"
  | "system_recovered"
  | "system_overloaded"
  | "safe_mode_entered"
  | "safe_mode_exited"
  | "clock_started"
  | "clock_stopped"
  | "clock_paused"
  | "clock_resumed"
  | "clock_overrun"
  | "resource_rebalanced"
  | "resource_pressure"
  | "system_started"
  | "system_stopped"
  | "system_restarting";

// ─── Workspace State (from Atune) ────────────────────────────────

export interface WorkspaceBroadcast {
  broadcast_id: string;
  salience: number;
  ts: string | null;
}

export interface WorkspaceState {
  cycle_count: number;
  dynamic_threshold: number;
  meta_attention_mode: string;
  recent_broadcasts: WorkspaceBroadcast[];
  affect: {
    valence: number;
    arousal: number;
    curiosity: number;
    coherence_stress: number;
  };
}

// ─── Axon Outcomes (from the Nova→Equor→Axon pipeline) ───────────

export interface OutcomeStep {
  action_type: string;
  description: string;
  success: boolean;
}

export interface AxonOutcome {
  execution_id: string;
  intent_id: string;
  success: boolean;
  partial: boolean;
  status: string;
  failure_reason: string | null;
  duration_ms: number;
  steps: OutcomeStep[];
  world_state_changes: string[];
}

export interface OutcomesState {
  outcomes: AxonOutcome[];
  total: number;
  successful: number;
  failed: number;
}

// ─── WebSocket Message Envelope ──────────────────────────────────

export interface WSMessageAffect {
  stream: "affect";
  payload: AffectState;
}

export interface WSMessageSynapse {
  stream: "synapse";
  payload: SynapseEvent;
}

export interface WSMessageWorkspace {
  stream: "workspace";
  payload: WorkspaceState;
}

export interface WSMessageOutcomes {
  stream: "outcomes";
  payload: OutcomesState;
}

export type WSMessage =
  | WSMessageAffect
  | WSMessageSynapse
  | WSMessageWorkspace
  | WSMessageOutcomes;

// ─── Visual Parameters (output of affect-to-visual mapping) ──────

export interface VisualParams {
  coreHue: number; // degrees 0-360
  pulseRate: number; // multiplier
  warmthEmission: number; // 0-1
  tendrilReach: number; // 0-1
  surfaceTurbulence: number; // 0-1
  coreScale: number; // 0.7-1.2
  tendrilSpeed: number; // multiplier
  particleVelocity: number; // multiplier
}

// ─── Sleep Stages (from Oneiros) ────────────────────────────────

export type SleepStage =
  | "wake"
  | "hypnagogia"
  | "nrem"
  | "rem"
  | "lucid"
  | "hypnopompia";

// ─── Interaction Modes ───────────────────────────────────────────

export type AliveMode =
  | "ambient"
  | "attentive"
  | "thinking"
  | "expressing"
  | "dreaming"
  | "safe_mode";

// ─── Rhythm States (from Synapse EmergentRhythmDetector) ─────────

export type RhythmState =
  | "idle"
  | "normal"
  | "flow"
  | "boredom"
  | "stress"
  | "deep_processing";

// ─── Cycle Completed Event Data ──────────────────────────────────

export interface CycleCompletedData {
  cycle: number;
  elapsed_ms: number;
  period_ms: number;
  arousal: number;
  had_broadcast: boolean;
  salience: number;
  rhythm: RhythmState;
}

// ─── Mode Preset Overrides ───────────────────────────────────────

export interface ModePreset {
  coreScaleMultiplier: number;
  bloomIntensity: number;
  auraOpacity: number;
  particleDensity: number;
  tendrilCount: number;
  pulseRateMultiplier: number;
  tendrilReachBoost: number;
  saturation: number;
}
