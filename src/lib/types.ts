/**
 * EcodiaOS — Alive Frontend Types
 *
 * Mirrors backend primitives for the visualization data pipeline.
 */

// ─── Affect State (from Soma — 9D interoceptive) ─────────────────

export interface AffectState {
  // Original 6 dimensions (backward-compatible keys)
  valence: number; // -1 to 1 — net allostatic trend
  arousal: number; // 0 to 1 — activation level
  curiosity: number; // 0 to 1 — epistemic appetite
  care_activation: number; // 0 to 1 — relational engagement (social_charge)
  coherence_stress: number; // 0 to 1 — derived: 1 - coherence
  // NEW Soma-native dimensions
  energy: number; // 0 to 1 — metabolic budget
  confidence: number; // 0 to 1 — generative model fit (replaces dominance)
  integrity: number; // 0 to 1 — constitutional alignment
  temporal_pressure: number; // 0 to 1 — urgency / time horizon compression
  // Derived signals
  urgency: number; // 0 to 1
  dominant_error: string | null; // InteroceptiveDimension value
  ts: string | null;
  available?: boolean;
}

/** Neutral baseline — matches Soma's default setpoints. */
export const AFFECT_NEUTRAL: AffectState = {
  valence: 0.0,
  arousal: 0.1,
  curiosity: 0.2,
  care_activation: 0.1,
  coherence_stress: 0.0,
  energy: 0.7,
  confidence: 0.5,
  integrity: 0.9,
  temporal_pressure: 0.1,
  urgency: 0.0,
  dominant_error: null,
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
  | "system_restarting"
  // Logos — Universal Compression Engine
  | "cognitive_pressure"
  | "intelligence_metrics"
  | "compression_cycle_complete"
  | "anchor_memory_created"
  | "schwarzschild_threshold_met"
  | "world_model_updated"
  // Oneiros v2 — Sleep as Batch Compiler
  | "sleep_initiated"
  | "sleep_stage_transition"
  | "compression_backlog_processed"
  | "causal_graph_reconstructed"
  | "cross_domain_match_found"
  | "analogy_discovered"
  | "dream_hypotheses_generated"
  | "lucid_dream_result"
  | "wake_initiated"
  // Nexus — Epistemic Triangulation
  | "FRAGMENT_SHARED"
  | "CONVERGENCE_DETECTED"
  | "DIVERGENCE_PRESSURE"
  | "TRIANGULATION_WEIGHT_UPDATE"
  | "SPECIATION_EVENT"
  | "GROUND_TRUTH_CANDIDATE"
  | "EMPIRICAL_INVARIANT_CONFIRMED";

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

// ─── System State (1Hz aggregated snapshot from ws_server.py) ────

/** Full 9D Soma interoceptive state + urgency + attractor. */
export interface InteroceptiveState {
  available: boolean;
  valence?: number;
  arousal?: number;
  curiosity?: number;
  social_charge?: number;
  coherence?: number;
  energy?: number;
  confidence?: number;
  integrity?: number;
  temporal_pressure?: number;
  urgency?: number;
  dominant_error?: string | null;
  nearest_attractor?: string | null;
}

/** Fovea prediction-error decomposition (6D). */
export interface AttentionState {
  available: boolean;
  error_decomposition?: {
    content: number;
    timing: number;
    magnitude: number;
    source: number;
    category: number;
    causal: number;
  };
  dynamic_threshold?: number;
  habituation_count?: number;
  top_surprise?: string | null;
}

/** Thymos immune incident/repair/antibody data. */
export interface ImmuneState {
  available: boolean;
  active_incidents?: number;
  healing_mode?: string;
  antibody_count?: number;
  repairs_attempted?: number;
  repairs_succeeded?: number;
  storm_activations?: number;
}

/** Telos drive topology multipliers + Thymos rejection counters. */
export interface DrivesState {
  available: boolean;
  care?: number;
  coherence?: number;
  growth?: number;
  honesty?: number;
  effective_intelligence_ratio?: number;
  equor_rejections?: number;
  rejections_by_drive?: Record<string, number>;
}

/** Synapse clock + rhythm phase. */
export interface CycleState {
  available: boolean;
  cycle_number?: number;
  running?: boolean;
  paused?: boolean;
  period_ms?: number;
  target_period_ms?: number;
  rate_hz?: number;
  arousal?: number;
  overrun_count?: number;
  rhythm_phase?: string | null;
}

/** Benchmark KPI snapshot (7 KPIs). */
export interface BenchmarksState {
  available: boolean;
  decision_quality?: number | null;
  llm_dependency?: number | null;
  economic_ratio?: number | null;
  learning_rate?: number | null;
  mutation_success_rate?: number | null;
  effective_intelligence_ratio?: number | null;
  compression_ratio?: number | null;
  regressions?: string[];
}

/**
 * Aggregated 1Hz system_state payload.
 * Old key ``health`` is gone — replaced by ``interoceptive``.
 */
export interface SystemStatePayload {
  cycle: CycleState;
  drives: DrivesState;
  interoceptive: InteroceptiveState;
  attention: AttentionState;
  immune: ImmuneState;
  goals: { available: boolean; counts?: Record<string, number>; active?: { id: string; priority: number }[] };
  actions: { available: boolean; recent?: Record<string, unknown>[] };
  economics: { available: boolean; liquid_balance_usd?: number | null; runway_days?: number | null; bmr_usd_per_hour?: number | null; starvation_level?: number | null; is_metabolically_positive?: boolean | null; assets_live?: number | null; assets_building?: number | null; total_asset_value?: number | null; fleet_children?: number | null; fleet_equity?: number | null };
  mutations: { available: boolean; current_version?: string | null; proposals_received?: number | null; proposals_approved?: number | null; proposals_rejected?: number | null; evolution_velocity?: number | null; rollback_rate?: number | null; mean_simulation_risk?: number | null };
  benchmarks: BenchmarksState;
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

export interface WSMessageSystemState {
  stream: "system_state";
  payload: SystemStatePayload;
}

export type WSMessage =
  | WSMessageAffect
  | WSMessageSynapse
  | WSMessageWorkspace
  | WSMessageOutcomes
  | WSMessageSystemState;

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
  | "descent"
  | "slow_wave"
  | "rem"
  | "lucid"
  | "emergence";

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
