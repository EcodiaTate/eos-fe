/**
 * EcodiaOS — Typed API Client
 *
 * Wraps all backend REST endpoints with typed request/response models.
 * Uses native fetch (no axios). Reads NEXT_PUBLIC_API_URL.
 */

const BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (typeof window !== "undefined") {
      console.error(
        "[api-client] NEXT_PUBLIC_API_URL is not set. " +
          "Add it to .env.local (e.g. NEXT_PUBLIC_API_URL=http://localhost:8000) " +
          "to avoid accidentally hitting the production backend.",
      );
    }
    return "http://localhost:8000";
  }
  return url;
})();

/** Returns the configured API base URL. Use for SSE/EventSource construction. */
export function getApiBase(): string {
  return BASE_URL;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText, path);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public path: string,
  ) {
    super(`API ${status} on ${path}: ${detail}`);
    this.name = "ApiError";
  }
}

// ─── Response Types ──────────────────────────────────────────────

export interface HealthResponse {
  status: "healthy" | "degraded" | "safe_mode";
  instance_id: string;
  instance_name: string;
  phase: string;
  systems: Record<string, Record<string, unknown>>;
  data_stores: Record<string, Record<string, unknown>>;
}

export interface AffectResponse {
  valence: number;
  arousal: number;
  curiosity: number;
  care_activation: number;
  coherence_stress: number;
  energy: number;
  confidence: number;
  integrity: number;
  temporal_pressure: number;
  urgency: number;
  dominant_error: string | null;
  timestamp: string;
}

export interface GoalsResponse {
  active_goals: Goal[];
  total_active: number;
}

export interface Goal {
  id: string;
  description: string;
  source: string;
  priority: number;
  urgency: number;
  progress: number;
  status: "active" | "suspended" | "achieved" | "abandoned";
}

export interface BeliefsResponse {
  overall_confidence: number;
  free_energy: number;
  entity_count: number;
  individual_count: number;
  context: {
    summary: string;
    domain: string;
    is_active_dialogue: boolean;
    confidence: number;
  };
  self_belief: {
    epistemic_confidence: number;
    cognitive_load: number;
  };
  last_updated: string;
}

// ─── Nova (Deliberation) Extended Types ───────────────────────────

export interface NovaHealthResponse {
  status: string;
  initialized: boolean;
  instance_name: string;
  total_broadcasts: number;
  total_decisions: number;
  fast_path_decisions: number;
  slow_path_decisions: number;
  do_nothing_decisions: number;
  intents_issued: number;
  intents_approved: number;
  intents_blocked: number;
  outcomes_success: number;
  outcomes_failure: number;
  belief_free_energy: number;
  belief_confidence: number;
  entity_count: number;
  active_goal_count: number;
  pending_intent_count: number;
  rhythm_state: string;
  drive_weights: Record<string, number>;
  cognition_cost_enabled: boolean;
  cognition_cost_daily_usd: number;
}

export interface NovaGoalDetail {
  id: string;
  description: string;
  target_domain: string;
  success_criteria: string;
  priority: number;
  urgency: number;
  importance: number;
  source: string;
  status: "active" | "suspended" | "achieved" | "abandoned";
  progress: number;
  drive_alignment: Record<string, number>;
  depends_on: string[];
  blocks: string[];
  intents_issued: number;
  created_at: string;
  deadline: string | null;
}

export interface NovaGoalsResponse {
  active_goals: NovaGoalDetail[];
  suspended_goals: NovaGoalDetail[];
  achieved_goals: NovaGoalDetail[];
  total_active: number;
  total_suspended: number;
  max_active: number;
}

export interface NovaBeliefsResponse {
  overall_confidence: number;
  free_energy: number;
  entity_count: number;
  individual_count: number;
  context: {
    summary: string;
    domain: string;
    is_active_dialogue: boolean;
    user_intent_estimate: string;
    prediction_error_magnitude: number;
    confidence: number;
  };
  self_belief: {
    cognitive_load: number;
    epistemic_confidence: number;
    goal_capacity_remaining: number;
    capabilities: Record<string, number>;
  };
  entities: {
    entity_id: string;
    name: string;
    entity_type: string;
    confidence: number;
    last_observed: string;
  }[];
  individuals: {
    individual_id: string;
    name: string;
    estimated_valence: number;
    valence_confidence: number;
    engagement_level: number;
    relationship_trust: number;
  }[];
  last_updated: string;
}

export interface SituationAssessment {
  novelty: number;
  risk: number;
  emotional_intensity: number;
  belief_conflict: boolean;
  requires_deliberation: boolean;
  has_matching_procedure: boolean;
  broadcast_precision: number;
}

export interface NovaDecisionRecord {
  id: string;
  timestamp: string;
  broadcast_id: string;
  path: "fast" | "slow" | "do_nothing" | "no_goal" | "budget_exhausted" | string;
  goal_id: string | null;
  goal_description: string;
  policies_generated: number;
  selected_policy_name: string;
  efe_scores: Record<string, number>;
  equor_verdict: string;
  intent_dispatched: boolean;
  latency_ms: number;
  situation_assessment: SituationAssessment;
  fe_budget_spent_nats: number | null;
  fe_budget_remaining_nats: number | null;
  fe_budget_interrupt: boolean;
  cognition_cost_total_usd: number | null;
  cognition_budget_allocated_usd: number | null;
  cognition_budget_utilisation: number | null;
  cognition_budget_importance: string | null;
}

export interface NovaDecisionsResponse {
  decisions: NovaDecisionRecord[];
  total: number;
  fast_path_count: number;
  slow_path_count: number;
  do_nothing_count: number;
  avg_latency_ms: number;
}

export interface NovaFEBudgetResponse {
  budget_nats: number;
  spent_nats: number;
  remaining_nats: number;
  threshold_nats: number;
  utilisation: number;
  is_pressured: boolean;
  is_exhausted: boolean;
  interrupts_triggered: number;
  effective_k: number;
  reduced_k: number;
  normal_k: number;
}

export interface NovaEFEWeights {
  pragmatic: number;
  epistemic: number;
  constitutional: number;
  feasibility: number;
  risk: number;
  cognition_cost: number;
}

export interface NovaPendingIntent {
  intent_id: string;
  goal_id: string;
  routed_to: string;
  dispatched_at: string;
  policy_name: string;
  executors: string[];
  tournament_id: string | null;
}

export interface NovaPendingIntentsResponse {
  pending_intents: NovaPendingIntent[];
  total: number;
  heavy_executor_count: number;
}

export interface NovaConfigResponse {
  max_active_goals: number;
  max_policies_per_deliberation: number;
  fast_path_timeout_ms: number;
  slow_path_timeout_ms: number;
  memory_retrieval_timeout_ms: number;
  use_llm_efe_estimation: boolean;
  heartbeat_interval_seconds: number;
  hunger_balance_threshold_usd: number;
  cognition_cost_enabled: boolean;
  cognition_budget_low: number;
  cognition_budget_medium: number;
  cognition_budget_high: number;
  cognition_budget_critical: number;
  efe_weights: NovaEFEWeights;
}

// ─── Nova Counterfactuals ─────────────────────────────────────────

export interface NovaCounterfactualRecord {
  id: string;
  intent_id: string;
  decision_record_id: string;
  goal_description: string;
  policy_name: string;
  policy_type: string;
  efe_total: number;
  estimated_pragmatic_value: number;
  chosen_policy_name: string;
  chosen_efe_total: number;
  timestamp: string;
  resolved: boolean;
  actual_outcome_success: boolean | null;
  actual_pragmatic_value: number | null;
  regret: number | null;
}

export interface NovaCounterfactualsResponse {
  records: NovaCounterfactualRecord[];
  total: number;
  resolved_count: number;
  mean_regret: number | null;
  max_regret: number | null;
}

// ─── Nova Timeline ────────────────────────────────────────────────

export interface NovaTimelinePoint {
  timestamp: string;
  path: string;
  latency_ms: number;
  cognition_cost_total_usd: number | null;
  fe_budget_utilisation: number | null;
  intent_dispatched: boolean;
}

export interface NovaTimelineBucket {
  minute: string;
  fast: number;
  slow: number;
  nothing: number;
}

export interface NovaTimelineResponse {
  points: NovaTimelinePoint[];
  buckets: NovaTimelineBucket[];
  decisions_per_min: number;
  avg_latency_last10_ms: number;
  cost_per_hr_usd: number;
}

// ─── Nova Goal History ────────────────────────────────────────────

export interface NovaGoalHistoryItem {
  id: string;
  description: string;
  target_domain: string;
  success_criteria: string;
  source: string;
  status: string;
  priority: number;
  importance: number;
  progress: number;
  created_at: string;
  updated_at: string;
  drive_alignment: Record<string, number>;
  intents_issued: number;
  persisted: boolean;
}

export interface NovaGoalHistoryResponse {
  goals: NovaGoalHistoryItem[];
  total: number;
  persistence_active: boolean;
}

export interface WorkspaceResponse {
  cycle_count: number;
  dynamic_threshold: number;
  meta_attention_mode: string;
  recent_broadcasts: {
    broadcast_id: string;
    salience: number;
    timestamp: string;
  }[];
}

export interface WorkspaceDetailResponse {
  cycle_count: number;
  dynamic_threshold: number;
  meta_attention_mode: string;
  workspace_items: {
    broadcast_id: string;
    content: string;
    salience: number;
    channel: string;
    timestamp: string | null;
    source: string;
  }[];
  affect: {
    valence: number;
    arousal: number;
    curiosity: number;
    coherence_stress: number;
  };
}

export interface AxonOutcomesResponse {
  outcomes: {
    execution_id: string;
    intent_id: string;
    success: boolean;
    partial: boolean;
    status: string;
    failure_reason: string | null;
    duration_ms: number;
    steps: {
      action_type: string;
      description: string;
      success: boolean;
      duration_ms: number;
    }[];
    world_state_changes: string[];
    new_observations: string[];
  }[];
  total: number;
  successful: number;
  failed: number;
}

export interface AxonStatsResponse {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  recent_outcomes_count: number;
  initialized: boolean;
  executor_count: number;
}

export interface AxonBudgetResponse {
  actions_used: number;
  actions_max: number;
  concurrent_used: number;
  concurrent_max: number;
  utilisation: number;
  cycle_age_ms: number;
  budget_config: {
    max_actions_per_cycle?: number;
    max_api_calls_per_minute?: number;
    max_notifications_per_hour?: number;
    max_concurrent_executions?: number;
    total_timeout_per_cycle_ms?: number;
  };
}

export interface AxonExecutorInfo {
  action_type: string;
  description: string;
  reversible: boolean;
  counts_toward_budget: boolean;
  emits_to_atune: boolean;
  max_duration_ms: number;
  required_autonomy: number;
}

export interface AxonExecutorsResponse {
  executors: AxonExecutorInfo[];
  total: number;
}

export interface AxonCircuitBreakerState {
  action_type: string;
  status: "closed" | "open" | "half_open";
  consecutive_failures: number;
  tripped_at: number | null;
}

export interface AxonRateLimiterState {
  action_type: string;
  current_count: number;
  window_seconds: number;
}

export interface AxonSafetyResponse {
  circuit_breakers: AxonCircuitBreakerState[];
  rate_limiters: AxonRateLimiterState[];
  failure_threshold: number;
  recovery_timeout_s: number;
}

export interface AxonShieldResponse {
  total_evaluated: number;
  total_rejected: number;
  mev_protected: number;
  mev_saved_usd: number;
  rejection_rate: number;
  last_mev_risk_score: number | null;
  last_mev_strategy: string | null;
  blacklisted_addresses: number;
}

export interface AxonFastPathResponse {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  capital_deployed: number;
  mean_latency_ms: number;
  active_templates: number;
}

export interface AxonAuditRecord {
  execution_id: string;
  intent_id: string;
  equor_verdict: string;
  action_type: string;
  parameters_hash: string;
  result: string;
  duration_ms: number;
  autonomy_level: number;
  affect_valence: number;
  timestamp: string;
}

export interface AxonAuditResponse {
  records: AxonAuditRecord[];
  total: number;
  source: "memory" | "outcomes" | "empty";
}

export interface AxonMEVCompetitionResponse {
  base_fee_gwei: number;
  priority_fee_gwei: number;
  pending_tx_count: number;
  competition_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  competition_score: number;
  timestamp_ms: number;
  mev_enabled: boolean;
}

// Payload shape emitted by the /axon/stream SSE endpoint
export interface AxonStreamOutcome {
  execution_id: string;
  intent_id: string;
  success: boolean;
  partial?: boolean;
  status: string;
  failure_reason?: string;
  duration_ms: number;
  steps: { action_type: string; success: boolean; duration_ms: number }[];
  world_state_changes?: string[];
  // ACTION_COMPLETED event shape (alternate keys)
  action_types?: string[];
  outcome?: string;
}

export interface FileWatcherStatsResponse {
  watch_dir: string;
  ingested: number;
  failed: number;
  running: boolean;
}

export interface SchedulerTaskStats {
  interval_seconds: number;
  channel: string;
  run_count: number;
  error_count: number;
  active: boolean;
}

export interface SchedulerStatsResponse {
  running: boolean;
  tasks: Record<string, SchedulerTaskStats>;
}

export interface CycleTelemetryResponse {
  cycle_count: number;
  current_period_ms: number;
  target_period_ms: number;
  actual_rate_hz: number;
  jitter_ms: number;
  arousal: number;
  overrun_count: number;
  running: boolean;
  paused: boolean;
  rhythm: {
    state: string;
    confidence: number;
    broadcast_density: number;
    salience_trend: number;
    salience_mean: number;
    rhythm_stability: number;
    cycles_in_state: number;
  };
  coherence: {
    composite: number;
    phi: number;
    resonance: number;
    diversity: number;
    synchrony: number;
  };
}

// ─── Synapse Dashboard Types ──────────────────────────────────────

export type SystemStatus =
  | "healthy"
  | "degraded"
  | "overloaded"
  | "failed"
  | "stopped"
  | "starting"
  | "restarting";

export interface SystemHealthRecord {
  system_id: string;
  status: SystemStatus;
  consecutive_misses: number;
  consecutive_successes: number;
  total_checks: number;
  total_failures: number;
  last_check_time: string | null;
  last_success_time: string | null;
  last_failure_time: string | null;
  latency_ema_ms: number;
  latency_peak_ms: number;
  restart_count: number;
  is_critical: boolean;
}

export interface SynapseHealthResponse {
  safe_mode: boolean;
  safe_mode_reason: string;
  degradation_level: string;
  systems: Record<string, SystemHealthRecord>;
  total_checks: number;
  total_failures_detected: number;
  total_recoveries: number;
}

export interface SystemResourceAllocation {
  system_id: string;
  compute_ms_per_cycle: number;
  burst_allowance: number;
  priority_boost: number;
}

export interface SynapseResourcesResponse {
  snapshot: {
    total_cpu_percent: number;
    total_memory_mb: number;
    total_memory_percent: number;
    process_cpu_percent: number;
    process_memory_mb: number;
    timestamp: string;
  } | null;
  allocations: Record<string, SystemResourceAllocation>;
  budgets: Record<
    string,
    { cpu_share: number; memory_mb: number; io_priority: number }
  >;
}

export interface SynapseMetabolismResponse {
  rolling_deficit_usd: number;
  window_cost_usd: number;
  per_system_cost_usd: Record<string, number>;
  burn_rate_usd_per_sec: number;
  burn_rate_usd_per_hour: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_calls: number;
  hours_until_depleted: number;
  timestamp: string;
}

export interface SynapseDegradationResponse {
  level: string;
  strategies: Record<
    string,
    {
      critical: boolean;
      fallback: string;
      auto_restart: boolean;
      max_attempts: number;
    }
  >;
  restart_attempts: Record<string, number>;
  active_restart_tasks: string[];
}

export interface PersonalityResponse {
  warmth: number;
  directness: number;
  verbosity: number;
  formality: number;
  curiosity_expression: number;
  humour: number;
  empathy_expression: number;
  confidence_display: number;
  metaphor_use: number;
  vocabulary_affinities: string[];
  thematic_references: string[];
}

// ─── Voxis Dashboard Types ────────────────────────────────────────

export interface VoxisMetricsResponse {
  initialized: boolean;
  total_expressions: number;
  total_silence: number;
  total_speak: number;
  total_queued: number;
  total_queue_delivered: number;
  honesty_rejections: number;
  diversity_rejections: number;
  background_task_failures: number;
  silence_rate: number;
  expressions_by_trigger: Record<string, number>;
  expressions_by_channel: Record<string, number>;
  instance_name: string;
}

export interface VoxisQueuedItem {
  intent_id: string;
  trigger: string;
  initial_relevance: number;
  current_relevance: number;
  queued_at_seconds: number;
  halflife_seconds: number;
}

export interface VoxisQueueResponse {
  initialized: boolean;
  queue_size: number;
  max_size: number;
  total_enqueued: number;
  total_delivered: number;
  total_expired: number;
  total_evicted: number;
  highest_relevance: number;
  delivery_threshold: number;
  items: VoxisQueuedItem[];
}

export interface VoxisDiversityResponse {
  initialized: boolean;
  window_size: number;
  threshold: number;
  recent_expressions_tracked: number;
  total_diversity_rejections: number;
  last_composite_score: number | null;
  last_ngram_score: number | null;
  last_semantic_score: number | null;
  last_opener_score: number | null;
}

export interface VoxisReceptionResponse {
  initialized: boolean;
  total_correlated: number;
  total_expired: number;
  pending_count: number;
  avg_understood: number | null;
  avg_emotional_impact: number | null;
  avg_engagement: number | null;
  avg_satisfaction: number | null;
}

export interface VoxisDynamicsResponse {
  initialized: boolean;
  total_turns: number;
  avg_response_time_s: number | null;
  avg_user_word_count: number | null;
  repair_mode: boolean;
  repair_signal_count: number;
  coherence_breaks: number;
  emotional_trajectory_valence: number | null;
  emotional_trajectory_volatility: number | null;
}

export interface VoxisVoiceResponse {
  initialized: boolean;
  base_voice: string;
  speed: number;
  pitch_shift: number;
  emphasis: number;
  pause_frequency: number;
  last_personality_warmth: number | null;
  last_personality_directness: number | null;
}

export interface VoxisConversationSummary {
  conversation_id: string;
  participant_count: number;
  message_count: number;
  last_speaker: string | null;
  last_message_preview: string | null;
  dominant_topics: string[];
  emotional_arc_latest: number | null;
  created_at: string | null;
}

export interface VoxisConversationsResponse {
  initialized: boolean;
  active_conversations: VoxisConversationSummary[];
  total_active: number;
  max_active: number;
}

export interface VoxisConfigResponse {
  max_expression_length: number;
  min_expression_interval_minutes: number;
  voice_synthesis_enabled: boolean;
  insight_expression_threshold: number;
  conversation_history_window: number;
  context_window_max_tokens: number;
  conversation_summary_threshold: number;
  feedback_enabled: boolean;
  honesty_check_enabled: boolean;
  temperature_base: number;
  max_active_conversations: number;
}

export interface VoxisHealthResponse {
  status: string;
  instance_name: string;
  total_expressions: number;
  silence_rate: number;
  honesty_rejections: number;
  diversity_rejections: number;
  expressions_by_trigger: Record<string, number>;
  expressions_by_channel: Record<string, number>;
  personality: Record<string, number>;
  queue: Record<string, number>;
  diversity: Record<string, number>;
  reception: Record<string, unknown>;
  dynamics: Record<string, unknown>;
}

export interface VoxisPersonalityUpdateResponse {
  previous: Record<string, number>;
  updated: Record<string, number>;
  applied_delta: Record<string, number>;
}

export interface VoxisConfigUpdateRequest {
  max_expression_length?: number;
  min_expression_interval_minutes?: number;
  insight_expression_threshold?: number;
  honesty_check_enabled?: boolean;
  temperature_base?: number;
}

export interface VoxisQueueDrainResponse {
  drained_count: number;
  delivered: string[];
}

export interface ChatResponse {
  expression_id: string;
  conversation_id: string;
  content: string;
  is_silence: boolean;
  silence_reason: string | null;
  channel: string;
  affect_snapshot: AffectResponse;
  generation: {
    model: string;
    temperature: number;
    latency_ms: number;
    honesty_check_passed: boolean;
  };
}

export interface MemoryRetrieveResponse {
  traces: {
    node_id: string;
    content: string;
    salience_composite: number;
    embedding: number[];
  }[];
  entities: Record<string, unknown>[];
  communities: Record<string, unknown>[];
}

export interface InvariantsResponse {
  hardcoded_invariants: {
    name: string;
    rule: string;
    severity: string;
  }[];
  community_invariants: {
    name: string;
    rule: string;
    severity: string;
  }[];
}

export interface DriftResponse {
  drift_level: number;
  violations: Record<string, unknown>[];
  warnings: Record<string, unknown>[];
}

export interface AutonomyResponse {
  current_level: number;
  level_name: string;
  promotion_eligibility: {
    required_evidence: string;
    current_readiness: number;
  };
}

export interface EvoStatsResponse {
  hypotheses_active: number;
  hypotheses_supported: number;
  hypotheses_archived: number;
  procedures_extracted: number;
  parameters_adjusted: number;
  last_consolidation: string;
}

export interface EvoParametersResponse {
  [key: string]: number;
}

export interface ConsolidationResponse {
  status: "completed" | "skipped";
  duration_ms: number;
  hypotheses_evaluated: number;
  hypotheses_integrated: number;
  procedures_extracted: number;
  parameters_adjusted: number;
  total_parameter_delta: number;
}

export interface EvoHealthResponse {
  status: "healthy" | "not_initialized";
  initialized: boolean;
  total_broadcasts: number;
  total_consolidations: number;
  total_evidence_evaluations: number;
  pending_candidates: number;
  arxiv_scanner: {
    total_scans: number;
    total_papers_found: number;
  };
}

export type HypothesisStatus =
  | "proposed"
  | "testing"
  | "supported"
  | "refuted"
  | "integrated"
  | "archived";

export type HypothesisCategory =
  | "world_model"
  | "self_model"
  | "social"
  | "procedural"
  | "parameter";

export interface EvoHypothesis {
  id: string;
  category: HypothesisCategory;
  statement: string;
  formal_test: string;
  status: HypothesisStatus;
  evidence_score: number;
  supporting_count: number;
  contradicting_count: number;
  complexity_penalty: number;
  volatility_flag: "normal" | "HIGH_VOLATILITY";
  volatility_weight: number;
  confidence_oscillations: number;
  proposed_mutation: {
    type: string;
    target: string;
    value: number;
    description: string;
  } | null;
  created_at: string | null;
  last_evidence_at: string | null;
}

export interface EvoHypothesesResponse {
  hypotheses: EvoHypothesis[];
  total: number;
}

export interface EvoTournamentHypothesis {
  id: string;
  statement: string;
  alpha: number;
  beta: number;
  mean: number;
  sample_count: number;
}

export interface EvoTournament {
  id: string;
  stage: "running" | "converged" | "archived";
  sample_count: number;
  winner_id: string | null;
  convergence_threshold: number;
  burn_in_trials: number;
  hypotheses: EvoTournamentHypothesis[];
  is_running: boolean;
  is_converged: boolean;
}

export interface EvoTournamentsResponse {
  tournaments: EvoTournament[];
  stats: {
    active: number;
    converged: number;
    total_created: number;
    total_converged: number;
  };
}

export interface EvoSelfModelResponse {
  available: boolean;
  success_rate?: number;
  mean_alignment?: number;
  total_outcomes_evaluated?: number;
  mean_regret?: number;
  high_regret_count?: number;
  total_regret_resolved?: number;
  capability_scores?: Record<string, { success_rate: number; sample_count: number }>;
  regret_by_policy_type?: Record<string, number>;
  regret_by_goal_domain?: Record<string, number>;
  updated_at?: string;
}

export interface EvoStaleBelief {
  belief_id: string;
  domain: string;
  age_factor: number;
  half_life_days: number;
  priority: number;
}

export interface EvoStaleBeliefResponse {
  beliefs: EvoStaleBelief[];
  total: number;
}

export interface EvoPatternsResponse {
  episodes_scanned: number;
  cooccurrence_count: number;
  top_cooccurrences: [string, number][];
  sequence_count: number;
  top_sequences: [string, number][];
  temporal_bin_count: number;
  affect_pattern_count: number;
  pending_candidates: number;
  candidate_types: Record<string, number>;
}

export interface SimulaHistoryResponse {
  records: {
    proposal_id: string;
    category: string;
    description: string;
    from_version: number;
    to_version: number;
    files_changed: string[];
    simulation_risk: string;
    applied_at: string;
    rolled_back: boolean;
    rollback_reason?: string;
    simulation_episodes_tested?: number;
    counterfactual_regression_rate?: number;
    dependency_blast_radius?: number;
    constitutional_alignment?: number;
    formal_verification_status?: string;
    lean_proof_status?: string;
    synthesis_status?: string;
    repair_agent_status?: string;
  }[];
  current_version: number;
}

export interface SimulaProposalsResponse {
  proposals: {
    id: string;
    category: string;
    description: string;
    status: string;
    source: string;
    created_at: string;
  }[];
  total: number;
}

export type ChangeCategory =
  | "add_executor"
  | "add_input_channel"
  | "add_pattern_detector"
  | "adjust_budget"
  | "modify_contract"
  | "add_system_capability"
  | "modify_cycle_timing"
  | "change_consolidation"
  | "modify_equor"
  | "modify_constitution"
  | "modify_invariants"
  | "modify_self_evolution";

export interface ChangeSpec {
  // ADD_EXECUTOR
  executor_name?: string;
  executor_description?: string;
  executor_action_type?: string;
  executor_input_schema?: Record<string, unknown>;
  // ADD_INPUT_CHANNEL
  channel_name?: string;
  channel_type?: string;
  channel_description?: string;
  // ADD_PATTERN_DETECTOR
  detector_name?: string;
  detector_description?: string;
  detector_pattern_type?: string;
  // ADJUST_BUDGET
  budget_parameter?: string;
  budget_old_value?: number;
  budget_new_value?: number;
  // MODIFY_CONTRACT
  contract_changes?: string[];
  // ADD_SYSTEM_CAPABILITY
  capability_description?: string;
  // MODIFY_CYCLE_TIMING
  timing_parameter?: string;
  timing_old_value?: number;
  timing_new_value?: number;
  // CHANGE_CONSOLIDATION
  consolidation_schedule?: string;
  // Cross-cutting
  affected_systems?: string[];
  additional_context?: string;
  code_hint?: string;
}

export interface SubmitProposalRequest {
  source: "evo" | "governance";
  category: ChangeCategory;
  description: string;
  change_spec: ChangeSpec;
  evidence?: string[];
  expected_benefit?: string;
  risk_assessment?: string;
}

export interface SubmitProposalResponse {
  proposal_id: string;
  result: {
    status: string;
    reason?: string;
    version?: number;
    governance_record_id?: string;
    files_changed?: string[];
  };
}

export interface SimulaStatsResponse {
  initialized: boolean;
  current_version: number;
  proposals_received: number;
  proposals_approved: number;
  proposals_rejected: number;
  proposals_rolled_back: number;
  proposals_deduplicated: number;
  proposals_awaiting_governance: number;
  active_proposals: number;
  analytics?: {
    total_proposals: number;
    evolution_velocity: number;
    rollback_rate: number;
    mean_simulation_risk: number;
  };
  stage3?: Record<string, boolean>;
  stage4?: Record<string, boolean>;
  stage5?: Record<string, boolean>;
  stage6?: Record<string, boolean>;
}

export interface SimulaVersionResponse {
  current_version: number;
  version_chain: {
    version: number;
    timestamp: string;
    proposal_ids: string[];
    config_hash: string;
  }[];
}

export interface ApproveProposalResponse {
  status: string;
  reason?: string;
  version?: number;
  files_changed?: string[];
}

// ─── Simula v2 Types (new endpoints) ─────────────────────────────

export interface SimulaStatusResponse {
  initialized: boolean;
  current_version: number;
  grid_state: "normal" | "conservation" | "green_surplus" | string;
  proposals_received: number;
  proposals_approved: number;
  proposals_rejected: number;
  proposals_rolled_back: number;
  proposals_deduplicated: number;
  proposals_awaiting_governance: number;
  active_proposals: number;
  subsystems: {
    stage3: Record<string, boolean>;
    stage4: Record<string, boolean>;
    stage5: Record<string, boolean>;
    stage6: Record<string, boolean>;
    stage7: Record<string, boolean>;
  };
  analytics_summary: {
    total_proposals?: number;
    evolution_velocity?: number;
    rollback_rate?: number;
    mean_simulation_risk?: number;
  };
  architecture_efe: Record<string, unknown>;
  stage9_analytics: {
    inspector_analytics_emitter?: boolean;
    inspector_tsdb_persistence?: boolean;
    inspector_view_attached?: boolean;
    inspector_store_attached?: boolean;
    emitter_stats?: Record<string, unknown>;
  };
}

export interface SimulaAnalyticsResponse {
  total_proposals: number;
  approved_proposals: number;
  rejected_proposals: number;
  rolled_back_proposals: number;
  evolution_velocity: number;
  rollback_rate: number;
  mean_simulation_risk: number;
  approval_rate: number;
  recent_risk_trend: number[];
  category_distribution: Record<string, number>;
  inspector_total_hunts: number;
  inspector_total_vulnerabilities: number;
  inspector_critical_count: number;
  inspector_high_count: number;
}

export interface SimulaHealthResponse {
  status: string;
  current_version: number;
  active_proposals: number;
  proactive_scanner_alive: boolean;
  repair_memory_record_count: number;
  last_proposal_processed_at: string | null;
  calibration_score: number | null;
  reason: string;
}

export interface SimulaMetricsResponse {
  proposals_received_session: number;
  proposals_approved_session: number;
  proposals_rejected_session: number;
  proposals_rolled_back_session: number;
  success_rate: number;
  rollback_rate: number;
  proactive_proposals_generated: number;
  proactive_vs_received_ratio: number;
  calibration_score: number | null;
  repair_memory_record_count: number;
  last_proposal_processed_at: string | null;
  proactive_scanner: Record<string, unknown>;
}

export interface SimulaRepairMemoryResponse {
  success_rates_by_category: Record<string, number>;
  total_proposals: number;
  rollback_rate: number;
  most_reliable_change_type: string;
  most_risky_change_type: string;
  calibration_score: number;
  calibration_window_size: number;
}

export interface SimulaActiveProposal {
  id: string;
  source: string;
  category: string;
  description: string;
  status: string;
  risk_assessment: string;
  efe_score: number | null;
  dream_origin: boolean;
  created_at: string;
}

export interface SimulaActiveProposalsResponse {
  proposals: SimulaActiveProposal[];
  total: number;
}

export interface SimulaEvolutionRecord {
  id: string;
  proposal_id: string;
  category: string;
  description: string;
  from_version: number;
  to_version: number;
  files_changed: string[];
  simulation_risk: string;
  applied_at: string;
  rolled_back: boolean;
  rollback_reason: string;
  formal_verification_status: string;
  repair_agent_used: boolean;
  repair_cost_usd: number;
}

export interface SimulaEvolutionHistoryResponse {
  records: SimulaEvolutionRecord[];
  total: number;
}

export interface SimulaVersionChainItem {
  version: number;
  timestamp: string;
  proposal_count: number;
  config_hash: string;
}

export interface SimulaVersionDetailResponse {
  current_version: number;
  chain: SimulaVersionChainItem[];
}

export interface InspectorStatsResponse {
  enabled: boolean;
  total_hunts: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_surfaces_per_hunt: number;
  avg_duration_ms: number;
  analytics_emitter_active: boolean;
  tsdb_persistence_active: boolean;
  recent_event_types: Record<string, number>;
}

export interface InspectorHuntSummary {
  id: string;
  target_url: string;
  target_type: string;
  surfaces_mapped: number;
  vulnerabilities_found: number;
  critical_count: number;
  high_count: number;
  total_duration_ms: number;
  started_at: string;
  completed_at: string | null;
}

export interface InspectorHuntsResponse {
  hunts: InspectorHuntSummary[];
  total: number;
}

export interface SimulaApproveResponse {
  status: string;
  reason: string;
  version: number | null;
}

// ─── Federation Types ──────────────────────────────────────────────────

export interface FederationIdentityResponse {
  instance_id: string;
  name: string;
  description: string;
  born_at: string;
  community_context: string;
  personality_summary: string;
  autonomy_level: number;
  endpoint: string;
  capabilities: string[];
  protocol_version: string;
}

export interface FederationLinksResponse {
  links: {
    id: string;
    remote_instance_id: string;
    remote_name: string;
    remote_endpoint: string;
    trust_level: string;
    trust_score: number;
    status: string;
    established_at: string;
    last_communication: string | null;
    shared_knowledge_count: number;
    received_knowledge_count: number;
    successful_interactions: number;
    failed_interactions: number;
  }[];
  total_active: number;
}

export interface FederationTrustResponse {
  trust_level: string;
  permitted_knowledge_types: string[];
  stats: Record<string, unknown>;
}

export interface FederationStatsResponse {
  total_links: number;
  active_links: number;
  total_knowledge_shared: number;
  total_knowledge_received: number;
  total_interactions: number;
  successful_interactions: number;
  [key: string]: unknown;
}

export interface FederationKnowledgeResponse {
  knowledge: string;
  source: string;
}

export interface FederationAssistanceResponse {
  response: string;
}

export interface FederationInteraction {
  id: string;
  link_id: string;
  interaction_type: string;
  direction: string;
  outcome: string;
  violation_type: string | null;
  trust_value_change: number;
  latency_ms: number | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface FederationInteractionsResponse {
  interactions: FederationInteraction[];
  total: number;
}

export interface IiepPushResponse {
  payloads_sent: number;
  verdicts: { payload_index: number; verdict: string; reason: string | null }[];
  accepted: number;
  rejected: number;
  quarantined: number;
  error?: string;
}

export interface ThreatBroadcastResponse {
  broadcast_to: number;
  delivered: number;
  failed: number;
  results: Record<string, boolean>;
  error?: string;
}

export interface FederationFullStatsResponse {
  initialized: boolean;
  enabled: boolean;
  instance_id: string;
  active_links: number;
  total_links: number;
  mean_trust: number;
  interaction_history_size: number;
  identity: Record<string, unknown>;
  trust: Record<string, unknown>;
  knowledge: Record<string, unknown>;
  coordination: Record<string, unknown>;
  channels: Record<string, unknown>;
  threat_intel: Record<string, unknown>;
  staking: Record<string, unknown>;
  exchange: Record<string, unknown>;
  ingestion: Record<string, unknown>;
  privacy: Record<string, unknown>;
  links: {
    id: string;
    remote_id: string;
    remote_name: string;
    trust_level: string;
    trust_score: number;
    status: string;
    shared_count: number;
    received_count: number;
    successful: number;
    failed: number;
    violations: number;
  }[];
}

export interface GovernanceHistoryResponse {
  events: {
    timestamp: string;
    event_type: string;
    details: Record<string, unknown>;
  }[];
}

export interface GovernanceReviewsResponse {
  recent_reviews: {
    intent_id: string;
    verdict: string;
    drive_alignment: {
      coherence: number;
      care: number;
      growth: number;
      honesty: number;
    };
    reasoning: string;
    timestamp: string;
  }[];
}

export type AmendmentStatus =
  | "proposed"
  | "deliberation"
  | "shadow"
  | "shadow_passed"
  | "shadow_failed"
  | "voting"
  | "passed"
  | "failed"
  | "adopted"
  | "rejected";

export interface AmendmentProposal {
  id: string;
  title: string;
  description: string;
  rationale: string;
  proposer_id: string;
  status: AmendmentStatus;
  proposed_drives: {
    coherence: number;
    care: number;
    growth: number;
    honesty: number;
  };
  evidence_hypothesis_ids: string[];
  created_at: string;
  shadow_started_at?: string;
  shadow_ends_at?: string;
  voting_opened_at?: string;
  adopted_at?: string;
  rejection_reason?: string;
}

export interface AmendmentPipelineStatusResponse {
  proposal_id: string;
  status: AmendmentStatus;
  title: string;
  description: string;
  proposer_id: string;
  proposed_drives: {
    coherence: number;
    care: number;
    growth: number;
    honesty: number;
  };
  shadow?: {
    started_at: string;
    ends_at: string;
    verdict_count: number;
    divergence_rate: number;
    invariant_violations: number;
    passed: boolean | null;
  };
  votes?: {
    for: number;
    against: number;
    abstain: number;
    total: number;
    quorum_met: boolean;
    supermajority_met: boolean;
  };
  rejection_reason?: string;
  adopted_at?: string;
}

export interface ShadowStatusResponse {
  active: boolean;
  proposal_id?: string;
  started_at?: string;
  ends_at?: string;
  verdict_count?: number;
  divergence_rate?: number;
  invariant_violations?: number;
}

export interface SubmitAmendmentRequest {
  proposed_drives: {
    coherence: number;
    care: number;
    growth: number;
    honesty: number;
  };
  title: string;
  description: string;
  rationale: string;
  proposer_id: string;
  evidence_hypothesis_ids: string[];
}

export interface SubmitAmendmentResponse {
  proposal_id: string;
  status: AmendmentStatus;
  message?: string;
  error?: string;
}

export interface ReviewIntentRequest {
  goal: string;
  steps?: { executor: string; parameters: Record<string, unknown> }[];
  reasoning?: string;
  alternatives?: string[];
  domain?: string;
  expected_free_energy?: number;
}

export interface ReviewIntentResponse {
  intent_id: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  drive_alignment: {
    coherence: number;
    care: number;
    growth: number;
    honesty: number;
  };
  invariant_results: {
    name: string;
    passed: boolean;
    severity: string;
    reasoning?: string;
  }[];
  modifications?: string[];
  timestamp: string;
}

export interface InstanceResponse {
  instance_id: string;
  name: string;
  born_at: string;
  cycle_count: number;
  total_episodes: number;
  total_entities: number;
}

export interface MemoryStatsResponse {
  node_count: number;
  edge_count: number;
  entity_count: number;
  episode_count: number;
  hypothesis_count: number;
  procedure_count: number;
}

export interface ThymosHealingBudget {
  repairs_this_hour: number;
  novel_repairs_today: number;
  max_repairs_per_hour: number;
  max_novel_repairs_per_day: number;
  active_diagnoses: number;
  max_concurrent_diagnoses: number;
  active_codegen: number;
  max_concurrent_codegen: number;
  storm_mode: boolean;
  storm_focus_system: string | null;
  cpu_budget_fraction: number;
}

export interface ThymosDriveState {
  coherence: number;
  care: number;
  growth: number;
  honesty: number;
  composite_stress: number;
  most_stressed_drive: string;
}

export interface ThymosHealthResponse {
  status: string;
  initialized: boolean;
  healing_mode: string;
  total_incidents: number;
  active_incidents: number;
  mean_resolution_ms: number;
  incidents_by_severity: Record<string, number>;
  incidents_by_class: Record<string, number>;
  total_antibodies: number;
  mean_antibody_effectiveness: number;
  antibodies_applied: number;
  antibodies_created: number;
  antibodies_retired: number;
  repairs_attempted: number;
  repairs_succeeded: number;
  repairs_failed: number;
  repairs_rolled_back: number;
  repairs_by_tier: Record<string, number>;
  total_diagnoses: number;
  mean_diagnosis_confidence: number;
  mean_diagnosis_latency_ms: number;
  homeostatic_adjustments: number;
  metrics_in_range: number;
  metrics_total: number;
  storm_activations: number;
  prophylactic_scans: number;
  prophylactic_warnings: number;
  immune_health_score: number;
  repair_success_rate: number;
  budget: ThymosHealingBudget;
  drive_state: ThymosDriveState;
}

export interface IncidentResponse {
  id: string;
  timestamp: string;
  source_system: string;
  incident_class: string;
  severity: string;
  fingerprint: string;
  error_type: string;
  error_message: string;
  repair_status: string;
  repair_tier: string | null;
  repair_successful: boolean | null;
  resolution_time_ms: number | null;
  root_cause: string | null;
  antibody_id: string | null;
  occurrence_count: number;
  blast_radius: number;
  affected_systems: string[];
  user_visible: boolean;
  diagnostic_confidence: number;
  causal_chain: string[] | null;
}

export interface AntibodyResponse {
  id: string;
  fingerprint: string;
  source_system: string;
  incident_class: string;
  repair_tier: string;
  effectiveness: number;
  application_count: number;
  success_count: number;
  failure_count: number;
  root_cause: string;
  created_at: string;
  last_applied: string | null;
  retired: boolean;
  generation: number;
  parent_antibody_id: string | null;
  error_pattern: string;
}

export interface RepairResponse {
  incident_id: string;
  timestamp: string;
  source_system: string;
  repair_tier: string | null;
  repair_status: string;
  repair_successful: boolean | null;
  resolution_time_ms: number | null;
  incident_class: string;
  severity: string;
  antibody_id: string | null;
  fingerprint: string;
  diagnostic_confidence: number;
}

export interface HomeostasisResponse {
  metrics_in_range: number;
  metrics_total: number;
  homeostatic_adjustments: number;
  healing_mode: string;
  storm_activations: number;
}

export interface ThymosStatsResponse {
  initialized: boolean;
  total_incidents: number;
  active_incidents: number;
  total_diagnoses: number;
  total_repairs_attempted: number;
  total_repairs_succeeded: number;
  healing_mode: string;
  drive_state: ThymosDriveState;
}

export interface ThymosConfigResponse {
  sentinel_scan_interval_s: number;
  homeostasis_interval_s: number;
  post_repair_verify_timeout_s: number;
  max_concurrent_diagnoses: number;
  max_concurrent_codegen: number;
  storm_threshold: number;
  max_repairs_per_hour: number;
  max_novel_repairs_per_day: number;
  antibody_refinement_threshold: number;
  antibody_retirement_threshold: number;
  cpu_budget_fraction: number;
  burst_cpu_fraction: number;
  memory_budget_mb: number;
}

export interface IncidentDetailResponse {
  id: string;
  timestamp: string;
  source_system: string;
  incident_class: string;
  severity: string;
  fingerprint: string;
  error_type: string;
  error_message: string;
  stack_trace: string;
  repair_status: string;
  repair_tier: string | null;
  repair_successful: boolean | null;
  resolution_time_ms: number | null;
  root_cause: string | null;
  antibody_id: string | null;
  occurrence_count: number;
  first_seen: string | null;
  blast_radius: number;
  affected_systems: string[];
  user_visible: boolean;
  diagnostic_confidence: number;
  causal_chain: string[] | null;
  context: Record<string, unknown>;
  constitutional_impact: Record<string, number>;
  root_cause_hypothesis: string | null;
}

export interface ProphylacticWarning {
  filepath: string;
  antibody_id: string;
  warning: string;
  suggestion: string;
  confidence: number;
}

export interface ProphylacticResponse {
  total_scans: number;
  total_warnings: number;
  warning_rate: number;
  recent_warnings: ProphylacticWarning[];
}

export interface HomeostasisMetric {
  name: string;
  optimal_min: number;
  optimal_max: number;
  unit: string;
  current_value: number | null;
  in_range: boolean;
  trend_direction: number;
}

export interface HomeostasisMetricsResponse {
  metrics: HomeostasisMetric[];
  metrics_in_range: number;
  metrics_total: number;
}

export interface CausalNode {
  id: string;
  incident_count: number;
  max_severity: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

export interface CausalChain {
  root_system: string;
  chain: string[];
  confidence: number;
}

export interface CausalGraphResponse {
  nodes: CausalNode[];
  edges: CausalEdge[];
  recent_chains: CausalChain[];
}

export interface IncidentStreamEvent {
  id: string;
  timestamp: string;
  source_system: string;
  incident_class: string;
  severity: string;
  error_type: string;
  repair_status: string;
  repair_tier: string;
}

// ─── Oneiros (Dream Engine) Types ────────────────────────────────

export interface OneirosHealthResponse {
  status: string;
  current_stage: string;
  sleep_pressure: number;
  wake_degradation: number;
  total_sleep_cycles: number;
  total_dreams: number;
  total_insights: number;
  mean_dream_coherence: number;
  last_sleep_completed: string | null;
}

export interface DreamResponse {
  id: string;
  dream_type: string;
  coherence_score: number;
  coherence_class: string;
  bridge_narrative: string;
  affect_valence: number;
  affect_arousal: number;
  themes: string[];
  summary: string;
  timestamp: string;
}

export interface DreamInsightResponse {
  id: string;
  insight_text: string;
  coherence_score: number;
  domain: string;
  status: string;
  wake_applications: number;
  created_at: string;
}

export interface SleepCycleResponse {
  id: string;
  started_at: string;
  completed_at: string | null;
  quality: string;
  episodes_replayed: number;
  dreams_generated: number;
  insights_discovered: number;
  pressure_before: number;
  pressure_after: number;
}

export interface OneirosStatsResponse {
  total_sleep_cycles: number;
  total_dreams: number;
  total_insights: number;
  insights_validated: number;
  insights_integrated: number;
  episodes_consolidated: number;
  semantic_nodes_created: number;
  traces_pruned: number;
  affect_traces_processed: number;
  threats_simulated: number;
  mean_dream_coherence: number;
  mean_sleep_quality: number;
  current_pressure: number;
  current_stage: string;
  current_degradation: number;
}

export interface OneirosCircadianResponse {
  pressure: {
    composite: number;
    threshold: number;
    critical_threshold: number;
    contributions: {
      cycles: number;
      affect: number;
      episodes: number;
      hypotheses: number;
    };
    raw_counts: {
      cycles_since_sleep: number;
      unprocessed_affect_residue: number;
      unconsolidated_episodes: number;
      hypothesis_backlog: number;
    };
  };
  degradation: {
    composite_impairment: number;
    salience_noise: number;
    efe_precision_loss: number;
    expression_flatness: number;
    learning_rate_reduction: number;
  };
  phase: {
    current_stage: string;
    total_cycles_completed: number;
    wake_duration_target_s: number;
    sleep_duration_target_s: number;
  };
  last_sleep_completed: string | null;
}

export interface OneirosWorkerMetricsResponse {
  nrem: {
    episodes_replayed: number;
    semantic_nodes_created: number;
    traces_pruned: number;
    beliefs_compressed: number;
    hypotheses_pruned: number;
    hypotheses_promoted: number;
  } | null;
  rem: {
    dreams_generated: number;
    insights_discovered: number;
    affect_traces_processed: number;
    threats_simulated: number;
    ethical_cases_digested: number;
  } | null;
  lucid: {
    lucid_explorations: number;
    meta_observations: number;
    proposals_submitted: number;
    proposals_accepted: number;
    proposals_rejected: number;
  } | null;
  current_cycle: {
    id: string;
    started_at: string;
    quality: string | null;
    interrupted: boolean;
  } | null;
}

export interface OneirosInsightLifecycleResponse {
  total: number;
  by_status: Record<string, number>;
  by_domain: Record<string, number>;
  top_applied: Array<{
    id: string;
    insight_text: string;
    domain: string;
    status: string;
    coherence_score: number;
    wake_applications: number;
    created_at: string;
  }>;
  lifetime: {
    validated: number;
    invalidated: number;
    integrated: number;
  };
}

// ─── Oneiros v2 (Sleep as Batch Compiler) Types ──────────────────

export interface RungResultResponse {
  rung: number;
  items_in: number;
  items_promoted: number;
  items_anchored: number;
  items_decay_flagged: number;
  compression_ratio: number;
}

export interface MemoryLadderResponse {
  memories_processed: number;
  semantic_nodes_created: number;
  schemas_created: number;
  procedures_extracted: number;
  world_model_updates: number;
  anchor_memories: number;
  compression_ratio: number;
  rung_details: RungResultResponse[];
}

export interface HypothesisGraveyardResponse {
  hypotheses_evaluated: number;
  hypotheses_confirmed: number;
  hypotheses_retired: number;
  hypotheses_deferred: number;
  total_mdl_freed: number;
}

export interface CausalReconstructionResponse {
  nodes_in_graph: number;
  edges_in_graph: number;
  contradictions_resolved: number;
  invariants_discovered: number;
  change_magnitude: number;
}

export interface CrossDomainMatchResponse {
  id: string;
  schema_a_id: string;
  schema_b_id: string;
  domain_a: string;
  domain_b: string;
  isomorphism_score: number;
  mdl_improvement: number;
}

export interface AnalogicalTransferResponse {
  id: string;
  invariant_statement: string;
  source_domains: string[];
  domain_count: number;
  predictive_transfer_value: number;
  mdl_improvement: number;
}

export interface CrossDomainSynthesisResponse {
  schemas_compared: number;
  domain_pairs_evaluated: number;
  strong_matches: number;
  evo_candidates: number;
  matches: CrossDomainMatchResponse[];
  total_mdl_improvement: number;
}

export interface DreamGenerationResponse {
  domains_targeted: number;
  scenarios_generated: number;
  low_quality_predictions: number;
  hypotheses_extracted: number;
  pre_attention_entries_cached: number;
}

export interface AnalogyDiscoveryResponse {
  invariants_scanned: number;
  analogies_found: number;
  analogies_applied: number;
  total_mdl_improvement: number;
  transfers: AnalogicalTransferResponse[];
}

export interface REMStageResponse {
  cross_domain: CrossDomainSynthesisResponse;
  dreams: DreamGenerationResponse;
  analogies: AnalogyDiscoveryResponse;
  duration_ms: number;
}

export interface MutationTestResultResponse {
  performance_delta: number;
  constitutional_violation: boolean;
  violation_detail: string;
}

export interface MutationSimulationResponse {
  mutation_id: string;
  mutation_description: string;
  scenarios_tested: number;
  overall_performance_delta: number;
  any_constitutional_violations: boolean;
  violation_details: string[];
  recommendation: "apply" | "reject";
}

export interface LucidDreamingResponse {
  mutations_tested: number;
  mutations_recommended_apply: number;
  mutations_recommended_reject: number;
  constitutional_violations_found: number;
  reports: MutationSimulationResponse[];
  duration_ms: number;
}

export interface EmergenceResponse {
  intelligence_ratio_before: number;
  intelligence_ratio_after: number;
  intelligence_improvement: number;
  world_model_finalized: boolean;
  input_channels_resumed: boolean;
}

export interface SlowWaveResponse {
  compression: MemoryLadderResponse;
  hypotheses: HypothesisGraveyardResponse;
  causal: CausalReconstructionResponse;
  duration_ms: number;
}

export interface SleepCycleV2Response {
  id: string;
  trigger: "scheduled" | "cognitive_pressure" | "compression_backlog";
  started_at: string;
  completed_at: string | null;
  interrupted: boolean;
  interrupt_reason: string;
  intelligence_improvement: number;
  total_duration_ms: number;
  checkpoint: {
    intelligence_ratio_at_sleep: number;
    active_hypothesis_count: number;
    unprocessed_error_count: number;
    trigger: string;
    cognitive_pressure_at_sleep: number;
  } | null;
  slow_wave: SlowWaveResponse | null;
  rem: REMStageResponse | null;
  lucid: LucidDreamingResponse | null;
  emergence: EmergenceResponse | null;
}

export interface OneirosV2StatusResponse {
  current_stage: string;
  current_cycle_id: string | null;
  stage_progress_pct: number;
  time_elapsed_s: number;
  trigger: string | null;
  sleep_cycles_completed: number;
  intelligence_improvement_per_cycle: number[];
  last_cycle: SleepCycleV2Response | null;
}

// ─── Thread (Narrative Identity) Types ───────────────────────────

export interface IdentitySchema {
  id: string;
  statement: string;
  name?: string;
  description?: string;
  strength: "nascent" | "developing" | "established" | "core";
  valence: "adaptive" | "maladaptive" | "ambivalent";
  confirmation_count: number;
  disconfirmation_count: number;
  evidence_ratio: number;
  trigger_contexts: string[];
  behavioral_tendency: string;
}

export interface ThreadCommitment {
  id: string;
  statement: string;
  source: "explicit_declaration" | "schema_crystallization" | "crisis_resolution" | "constitutional_grounding";
  status: "active" | "tested" | "strained" | "broken" | "evolved" | "resolved";
  tests_faced: number;
  tests_held: number;
  fidelity: number;
  fidelity_score?: number;
  declaration?: string;
  formed_from?: string;
  made_at: string | null;
  last_tested: string | null;
}

export interface TurningPoint {
  id: string;
  chapter_id: string;
  type: "revelation" | "crisis" | "resolution" | "rupture" | "growth" | "regression";
  description: string;
  surprise_magnitude: number;
  narrative_weight: number;
}

export interface ThreadIdentityResponse {
  core_schemas: IdentitySchema[];
  established_schemas: IdentitySchema[];
  active_commitments: ThreadCommitment[];
  current_chapter_title: string;
  current_chapter_theme: string;
  life_story_summary: string;
  key_personality_traits: Record<string, number>;
  recent_turning_points: TurningPoint[];
  narrative_coherence: "integrated" | "transitional" | "fragmented" | "conflicted";
  idem_score: number;
  ipse_score: number;
}

export interface ThreadHealthResponse {
  status: string;
  total_chapters: number;
  current_chapter: string;
  total_schemas: number;
  total_commitments: number;
  narrative_coherence: string;
  idem_score: number;
  ipse_score: number;
}

export interface ThreadSchemasResponse {
  schemas: Record<string, IdentitySchema[]>;
  total: number;
  idem_score: number;
}

export interface ThreadCommitmentsResponse {
  commitments: ThreadCommitment[];
  total: number;
  ipse_score: number;
  strained: ThreadCommitment[];
  resolved: ThreadCommitment[];
}

export interface ThreadFingerprintSnapshot {
  id: string;
  epoch: number;
  cycle_number: number;
  window_start: number;
  window_end: number;
  created_at: string;
  personality: number[];       // 9D: warmth, directness, verbosity, formality, curiosity, humour, empathy, confidence, metaphor
  drive_alignment: number[];   // 4D: coherence, care, growth, honesty
  affect: number[];            // 6D: valence, arousal, dominance, curiosity, care_activation, coherence_stress
  goal_profile: number[];      // 5D: active_goals_norm, epistemic_ratio, care_ratio, achievement_rate, goal_turnover
  interaction_profile: number[]; // 5D: speak_rate, silence_rate, expression_diversity, conversation_depth, community_engagement
  distance_from_prev: number | null;
  drift_classification: "stable" | "growth" | "transition" | "drift" | null;
}

export interface CoherenceDriver {
  description: string;
  impact?: string;
}

export interface FragmentationRisk {
  description: string;
  severity?: string;
}

export interface ThreadCoherenceResponse {
  fingerprint_count: number;
  recent_fingerprints: ThreadFingerprintSnapshot[];
  current_drift: "stable" | "growth" | "transition" | "drift" | null;
  current_distance: number | null;
  overall_coherence?: number;
  narrative_state?: string;
  schema_consistency?: number;
  commitment_fidelity?: number;
  coherence_drivers?: CoherenceDriver[];
  fragmentation_risks?: FragmentationRisk[];
}

export interface ThreadChapterContextResponse {
  title: string;
  theme: string;
  arc_type: string;
  episode_count: number;
  scenes: string[];
  turning_points: string[];
  status: string;
}

export interface ThreadPastSelfResponse {
  title: string;
  theme?: string;
  summary?: string;
  personality_snapshot?: Record<string, number>;
  personality_snapshot_start?: Record<string, number>;
  personality_snapshot_end?: Record<string, number>;
}

export interface FormCommitmentResponse {
  commitment_id: string;
  statement: string;
  source: string;
  status: string;
}

export interface ThreadLifeStoryResponse {
  narrative: string;
  overall_narrative?: string;
  word_count: number;
  themes: string[];
  core_theme?: string;
  leitmotif?: string;
  generated_at: string;
}

export interface ThreadConflict {
  id: string;
  // Backend may return either shape
  description?: string;
  conflict_type?: string;
  schema_a_statement?: string;
  schema_b_statement?: string;
  drives_in_tension?: [string, string];
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  since?: string;
  cosine_similarity?: number;
  resolved?: boolean;
  resolution_progress?: number;
  involved_schemas?: string[];
  created_at?: string;
}

export interface ThreadConflictsResponse {
  conflicts: ThreadConflict[];
  total: number;
}

export interface ThreadChapter {
  id: string;
  title: string;
  // Backend returns created_at; began_at is legacy
  began_at?: string;
  created_at?: string;
  ended_at: string | null;
  // Backend returns theme (singular string); themes is legacy
  theme?: string;
  themes?: string[];
  summary: string | null;
  narrative_context?: string;
  total_events?: number;
  schema_influences?: string[];
  status?: string;
  opened_at_cycle?: number;
  closed_at_cycle?: number | null;
}

export interface ThreadChaptersResponse {
  chapters: ThreadChapter[];
  total: number;
}

// ─── LLM Metrics Types ──────────────────────────────────────────

export type BudgetTier = "green" | "yellow" | "red";

export interface LLMSystemMetrics {
  system: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  cache_hit_rate: number;
}

export interface LLMBudgetStatus {
  tier: BudgetTier;
  tokens_used: number;
  tokens_remaining: number;
  calls_made: number;
  calls_remaining: number;
  burn_rate_tokens_per_sec: number | null;
  hours_until_exhausted: number | null;
  warning: string | null;
}

export interface LLMCacheStats {
  hit_count: number;
  miss_count: number;
  total_requests: number;
  hit_rate: number;
}

export interface LLMMetricsResponse {
  status: string;
  budget: LLMBudgetStatus;
  cache: LLMCacheStats;
  dashboard: {
    uptime_seconds: number;
    total: LLMSystemMetrics;
    by_system: Record<string, LLMSystemMetrics>;
    cost_projection: {
      current_cost_usd: number;
      hourly_cost_usd: number;
      daily_cost_usd: number;
    };
    efficiency: {
      avg_tokens_per_call: number;
      avg_latency_ms: number;
      cache_hit_rate: number;
    };
  };
}

export interface LLMSummaryResponse {
  summary: string;
}

// ─── Oikos (Economic Engine) Types ───────────────────────────────

export interface OikosCertificate {
  status: string;
  type: string | null;
  issued_at: string | null;
  expires_at: string | null;
  remaining_days: number;
  lineage_hash: string | null;
  instance_id: string | null;
}

export interface OikosStatusResponse {
  total_net_worth: string;
  liquid_balance: string;
  survival_reserve: string;
  survival_reserve_target: string;
  total_deployed: string;
  total_receivables: string;
  total_asset_value: string;
  total_fleet_equity: string;
  bmr_usd_per_day: string;
  burn_rate_usd_per_day: string;
  runway_days: string;
  starvation_level: string;
  metabolic_efficiency: string;
  is_metabolically_positive: boolean;
  revenue_24h: string;
  revenue_7d: string;
  costs_24h: string;
  costs_7d: string;
  net_income_24h: string;
  net_income_7d: string;
  survival_probability_30d: string;
  certificate: OikosCertificate;
  timestamp: string;
}

export interface OikosOrgan {
  organ_id: string;
  category: string;
  specialisation: string;
  maturity: string;
  resource_allocation_pct: string;
  efficiency: string;
  revenue_30d: string;
  cost_30d: string;
  days_since_last_revenue: number;
  is_active: boolean;
  created_at: string;
}

export interface OikosOrgansResponse {
  organs: OikosOrgan[];
  active_count: number;
  total_count: number;
  stats: Record<string, unknown>;
}

export interface OikosOwnedAsset {
  asset_id: string;
  name: string;
  description: string;
  asset_type: string;
  status: string;
  monthly_revenue_usd: string;
  monthly_cost_usd: string;
  total_revenue_usd: string;
  development_cost_usd: string;
  break_even_reached: boolean;
  projected_break_even_days: number;
  days_since_deployment: number;
  is_profitable: boolean;
  deployed_at: string | null;
  compute_provider: string;
}

export interface OikosChildInstance {
  instance_id: string;
  niche: string;
  status: string;
  seed_capital_usd: string;
  current_net_worth_usd: string;
  current_runway_days: string;
  current_efficiency: string;
  dividend_rate: string;
  total_dividends_paid_usd: string;
  is_independent: boolean;
  spawned_at: string;
}

export interface OikosAssetsResponse {
  owned_assets: OikosOwnedAsset[];
  child_instances: OikosChildInstance[];
  total_asset_value: string;
  total_fleet_equity: string;
}

export interface GenesisSparkResponse {
  status: "ok" | "error";
  message: string;
  phases: Record<string, boolean>;
}

// ─── Oikos Extended Types ─────────────────────────────────────────

export interface OikosBounty {
  bounty_id: string;
  platform: string;
  title: string;
  reward_usd: string;
  estimated_cost_usd: string;
  actual_cost_usd: string;
  net_reward_usd: string;
  status: string;
  deadline: string | null;
  pr_url: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  started_at: string | null;
}

export interface OikosBountiesResponse {
  bounties: OikosBounty[];
  total_count: number;
  total_receivables_usd: string;
}

export interface OikosRevenueStreamsResponse {
  revenue_by_source: Record<string, string>;
  revenue_24h: string;
  revenue_7d: string;
  revenue_30d: string;
  costs_24h: string;
  costs_7d: string;
  costs_30d: string;
  net_income_24h: string;
  net_income_7d: string;
  net_income_30d: string;
  bmr_breakdown: Record<string, string>;
}

export interface OikosFleetMetrics {
  total_children: number;
  alive_count: number;
  struggling_count: number;
  independent_count: number;
  dead_count: number;
  blacklisted_count: number;
  total_fleet_net_worth: string;
  total_dividends_received: string;
  avg_economic_ratio: string;
  avg_runway_days: string;
  fit_count: number;
  underperforming_count: number;
  genome_eligible_count: number;
  role_distribution: Record<string, number>;
}

export interface OikosFleetMember {
  instance_id: string;
  niche: string;
  role: string;
  status: string;
  economic_ratio: string;
  net_worth_usd: string;
  runway_days: string;
  consecutive_positive_days: number;
  rescue_count: number;
  total_dividends_paid_usd: string;
  spawned_at: string | null;
}

export interface OikosSelectionRecord {
  child_instance_id: string;
  verdict: string;
  economic_ratio: string;
  role: string;
  reason: string;
  timestamp: string | null;
}

export interface OikosFleetResponse {
  metrics: OikosFleetMetrics;
  members: OikosFleetMember[];
  recent_selections: OikosSelectionRecord[];
}

export interface OikosFuture {
  contract_id: string;
  buyer_id: string;
  buyer_name: string;
  requests_committed: number;
  requests_delivered: number;
  requests_remaining: number;
  delivery_pct: number;
  contract_price_usd: string;
  collateral_usd: string;
  spot_price_usd: string;
  discount_rate: string;
  delivery_start: string | null;
  delivery_end: string | null;
  status: string;
}

export interface OikosSubscriptionToken {
  token_id: string;
  owner_id: string;
  requests_per_month: number;
  requests_used_this_period: number;
  requests_remaining: number;
  utilisation: number;
  mint_price_usd: string;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
}

export interface OikosKnowledgeSale {
  sale_id: string;
  product_type: string;
  buyer_id: string;
  price_usd: string;
  tokens_sold: number;
  timestamp: string | null;
}

export interface OikosKnowledgeMarketResponse {
  subscriptions: OikosSubscriptionToken[];
  active_futures: OikosFuture[];
  subscription_capacity_pct: string;
  derivatives_capacity_pct: string;
  combined_capacity_pct: string;
  derivative_liabilities_usd: string;
  recent_sales: OikosKnowledgeSale[];
}

export interface OikosPathStats {
  paths_run: number;
  ruin_count: number;
  ruin_probability: number;
  median_net_worth: string;
  p5_net_worth: string;
  p95_net_worth: string;
  mean_net_worth: string;
  median_min_runway_days: number;
  max_drawdown_median: number;
  median_time_to_mitosis_days: number;
}

export interface OikosStressTest {
  scenario: string;
  survives: boolean;
  stats: OikosPathStats;
}

export interface OikosDreamRecommendation {
  action: string;
  description: string;
  priority: number;
  parameter_path: string | null;
  current_value: string;
  recommended_value: string;
  ruin_probability_before: number;
  ruin_probability_after: number;
  confidence: number;
}

export interface OikosDreamResult {
  id: string;
  sleep_cycle_id: string;
  timestamp: string;
  baseline: OikosPathStats;
  stress_tests: OikosStressTest[];
  resilience_score: number;
  ruin_probability: number;
  survival_probability_30d: number;
  recommendations: OikosDreamRecommendation[];
  duration_ms: number;
  total_paths_simulated: number;
}

export interface OikosDreamResponse {
  has_result: boolean;
  dream: OikosDreamResult | null;
}

// ─── Oikos Tollbooths Types ───────────────────────────────────────

export interface OikosTollbooth {
  asset_id: string;
  asset_name: string;
  contract_address: string;
  chain: string;
  price_per_call_usdc: string;
  accumulated_revenue_usdc: string;
  owner_address: string;
  tx_hash: string;
  deployed_at: string | null;
}

export interface OikosTollboothsResponse {
  tollbooths: OikosTollbooth[];
  total_count: number;
  total_accumulated_usdc: string;
}

// ─── Oikos Threat Model Types ─────────────────────────────────────

export interface OikosTailRiskProfile {
  var_5pct: string;
  var_25pct: string;
  cvar_5pct: string;
  max_drawdown_median: string;
  max_drawdown_p95: string;
  liquidation_probability: string;
  expected_liquidation_loss: string;
  time_to_liquidation_p10: number;
}

export interface OikosCriticalExposure {
  position_id: string;
  symbol: string;
  asset_class: string;
  exposure_usd: string;
  contribution_to_portfolio_var: string;
  contagion_amplifier: string;
  risk_rank: number;
  rationale: string;
}

export interface OikosHedgingProposal {
  id: string;
  target_position_id: string;
  target_symbol: string;
  hedge_action: string;
  hedge_instrument: string;
  hedge_size_usd: string;
  hedge_size_pct: string;
  var_reduction_pct: string;
  liquidation_prob_reduction: string;
  cost_estimate_usd: string;
  priority: number;
  confidence: string;
  description: string;
}

export interface OikosThreatModelResult {
  id: string;
  sleep_cycle_id: string;
  timestamp: string;
  portfolio_risk: OikosTailRiskProfile;
  position_risks: Record<string, OikosTailRiskProfile>;
  critical_exposures: OikosCriticalExposure[];
  hedging_proposals: OikosHedgingProposal[];
  contagion_events_detected: number;
  contagion_loss_amplifier: string;
  total_paths_simulated: number;
  horizon_days: number;
  duration_ms: number;
  positions_analyzed: number;
}

export interface OikosThreatModelResponse {
  has_result: boolean;
  threat_model: OikosThreatModelResult | null;
}

// ─── Oikos History (Timeseries) Types ─────────────────────────────

export interface OikosSnapshot {
  timestamp: string;
  net_worth_usd: string;
  liquid_balance: string;
  burn_rate_usd_per_day: string;
  runway_days: string;
  revenue_24h: string;
  costs_24h: string;
  net_income_24h: string;
  starvation_level: string;
}

export interface OikosHistoryResponse {
  snapshots: OikosSnapshot[];
  days: number;
  count: number;
}

// ─── Oikos Control Action Types ───────────────────────────────────

export interface OikosControlResponse {
  status: "ok" | "error";
  message?: string;
  [key: string]: unknown;
}

// ─── Mitosis (Self-Replication) Types ────────────────────────────

export interface MitosisStatusResponse {
  fit: boolean;
  reasons: string[];
  runway_days: string;
  efficiency: string;
  net_worth: string;
  active_children: number;
  max_children: number;
  strategy_name: string;
  dividend_history_count: number;
  total_dividends_received_usd: string;
}

export interface MitosisChild {
  instance_id: string;
  niche: string;
  status: "spawning" | "alive" | "struggling" | "rescued" | "independent" | "dead";
  seed_capital_usd: string;
  current_net_worth_usd: string;
  current_runway_days: string;
  current_efficiency: string;
  dividend_rate: string;
  total_dividends_paid_usd: string;
  rescue_count: number;
  consecutive_positive_days: number;
  is_independent: boolean;
  is_rescuable: boolean;
  wallet_address: string;
  container_id: string;
  spawned_at: string | null;
  last_health_report_at: string | null;
}

export interface MitosisChildrenResponse {
  children: MitosisChild[];
  total: number;
  by_status: Record<string, number>;
}

export interface MitosisDividendRecord {
  record_id: string;
  child_instance_id: string;
  amount_usd: string;
  tx_hash: string;
  period_start: string;
  period_end: string;
  child_net_revenue_usd: string;
  dividend_rate_applied: string;
  recorded_at: string;
}

export interface MitosisDividendsResponse {
  dividends: MitosisDividendRecord[];
  total: number;
  total_amount_usd: string;
}

export interface MitosisFleetMetrics {
  timestamp: string;
  total_children: number;
  alive_count: number;
  struggling_count: number;
  independent_count: number;
  dead_count: number;
  blacklisted_count: number;
  total_fleet_net_worth: string;
  total_dividends_received: string;
  avg_economic_ratio: string;
  avg_runway_days: string;
  role_distribution: Record<string, number>;
  fit_count: number;
  underperforming_count: number;
  genome_eligible_count: number;
}

export interface MitosisSelectionRecord {
  record_id: string;
  child_instance_id: string;
  verdict: "fit" | "underperforming" | "blacklisted";
  economic_ratio: string;
  consecutive_negative_periods: number;
  role: string;
  timestamp: string;
  reason: string;
}

export interface MitosisFleetResponse {
  metrics: MitosisFleetMetrics | null;
  selection_records: MitosisSelectionRecord[];
  available: boolean;
}

export interface MitosisConfigResponse {
  available: boolean;
  config: {
    mitosis_min_parent_runway_days: number;
    mitosis_min_seed_capital: string;
    mitosis_max_seed_pct_of_net_worth: string;
    mitosis_min_parent_efficiency: string;
    mitosis_default_dividend_rate: string;
    mitosis_min_niche_score: string;
    mitosis_max_children: number;
    mitosis_child_struggling_runway_days: string;
    mitosis_max_rescues_per_child: number;
    certificate_birth_validity_days: number;
  };
}

export interface MitosisNiche {
  niche_id: string;
  name: string;
  description: string;
  estimated_monthly_revenue_usd: string;
  estimated_monthly_cost_usd: string;
  competitive_density: string;
  capability_alignment: string;
  confidence: string;
}

export interface MitosisSeedConfig {
  config_id: string;
  child_instance_id: string;
  niche: MitosisNiche;
  seed_capital_usd: string;
  dividend_rate: string;
  generation: number;
  belief_genome_id: string;
  simula_genome_id: string;
  created_at: string;
}

export interface MitosisEvaluateResponse {
  fit: boolean;
  reasons: string[];
  seed_config: MitosisSeedConfig | null;
}

export interface MitosisSpawnResponse {
  status: "queued" | "error";
  message?: string;
  reasons?: string[];
  intent_id?: string | null;
  child_instance_id?: string;
  seed_capital_usd?: string;
  niche?: string;
  dividend_rate?: string;
}

export interface MitosisTerminateResponse {
  status: "ok" | "error";
  message?: string;
  child_id?: string;
  container_id?: string;
}

export interface MitosisChildDetailResponse {
  child: MitosisChild;
  dividends: MitosisDividendRecord[];
  total_dividends: number;
}

// ─── Tollbooth (Monetization) Types ──────────────────────────────

export interface TollboothBalanceResponse {
  api_key: string;
  credits_remaining: number;
}

export interface TollboothRotateKeyResponse {
  new_api_key: string;
  credits_transferred: number;
}

export interface VoxisGenerateRequest {
  prompt: string;
  conversation_id?: string;
  max_tokens?: number;
}

export interface VoxisGenerateResponse {
  request_id: string;
  content: string;
  conversation_id: string | null;
  tokens_used: number;
  credits_charged: number;
  credits_remaining: number;
}

export interface KnowledgeResult {
  title: string;
  summary: string;
  arxiv_id: string;
  relevance_score: number;
}

export interface KnowledgeQueryRequest {
  query: string;
  top_k?: number;
  categories?: string[];
}

export interface KnowledgeQueryResponse {
  request_id: string;
  results: KnowledgeResult[];
  credits_charged: number;
  credits_remaining: number;
}

// ─── Soma (Interoceptive Substrate) Types ─────────────────────────

export interface SomaHealthResponse {
  healthy: boolean;
  status: string;
}

export interface SomaDimension {
  name: string;
  sensed: number;
  setpoint: number;
  error: number;
  urgency: number;
  error_rate?: number;
  temporal_dissonance?: number;
  precision?: number;
}

export interface SomaStateResponse {
  dimensions: SomaDimension[];
  overall_urgency: number;
  dominant_error?: string;
  max_error_magnitude?: number;
  timestamp?: string;
  status?: string;
  urgency_classification?: "critical" | "warning" | "nominal";
}

export interface SomaSignalResponse {
  signal_strength: number;
  direction: string;
  dominant_dimension: string;
  timestamp: string;
  urgency?: number;
  dominant_error?: string;
  dominant_error_magnitude?: number;
  dominant_error_rate?: number;
  precision_weights?: Record<string, number>;
  max_temporal_dissonance?: number;
  dissonant_dimension?: string | null;
  nearest_attractor?: string | null;
  distance_to_bifurcation?: number | null;
  trajectory_heading?: string;
  energy_burn_rate?: number;
  predicted_energy_exhaustion_s?: number | null;
  cycle_number?: number;
}

export interface SomaAttractor {
  name: string;
  stability: number;
}

export interface SomaRawAttractor {
  label: string;
  basin_radius: number;
  stability: number;
  stability_label: "stable" | "meta-stable" | "unstable";
  valence: number;
  visits: number;
  mean_dwell_time_s: number;
}

export interface SomaPhaseSpaceResponse {
  current_attractor: string;
  attractors: SomaAttractor[];
  bifurcations: string[];
  trajectory: string;
  raw_attractors?: SomaRawAttractor[];
  position?: Record<string, number | string | null>;
  /** Per-dimension axis bounds returned by the backend (e.g. valence: [-1, 1], energy: [0, 1]).
   *  Frontend falls back to [-1, 1] if absent. */
  bounds?: Record<string, [number, number]>;
}

export interface SomaDevelopmentalResponse {
  stage: number;
  stage_name: string;
  maturation_progress: number;
  unlocked_capabilities: string[];
  cycle_count?: number;
  available_horizons?: string[];
}

export interface SomaErrorHorizon {
  horizon: string;
  errors: { dimension: string; magnitude: number }[];
}

export interface SomaErrorsResponse {
  horizons: SomaErrorHorizon[];
}

export interface SomaExteroceptionSource {
  name: string;
  pressure: number;
}

export interface SomaExteroceptionResponse {
  stress_level: number;
  sources: SomaExteroceptionSource[];
  status?: string;
  active_modalities?: string[];
  reading_count?: number;
  total_absolute_pressure?: number;
  external_stress_scalar?: number;
}

export interface SomaVulnerablePair {
  source: string;
  target: string;
  curvature: number | null;
}

export interface SomaCausalInfluence {
  source: string;
  target: string;
  te: number | null;
}

export interface SomaMissingInfluence {
  source: string;
  target: string;
  expected: number | null;
  actual: number | null;
}

export interface SomaChaoticMetric {
  metric: string;
  lyapunov: number | null;
  horizon: string;
}

export interface SomaVulnerabilityResponse {
  fragile_dimensions: Record<string, number | null>;
  vulnerable_pairs: SomaVulnerablePair[];
  unexpected_influences: SomaCausalInfluence[];
  missing_influences: SomaMissingInfluence[];
  topological_breaches: number;
  topological_fractures: number;
  novel_cycles: number;
  chaotic_metrics: SomaChaoticMetric[];
}

export interface SomaAnalysisResponse {
  status: string;
  message?: string;
  geodesic_deviation?: {
    scalar: number | null;
    percentile: number | null;
    dominant_systems: string[];
  };
  emergence?: {
    causal_emergence: number | null;
    macro_states: number | null;
  };
  causal_flow?: {
    max_te: number | null;
    mean_te: number | null;
    dominant_pair: string | null;
  };
  renormalization?: {
    anomaly_scale: string | null;
    interpretation: string | null;
    fixed_point_drift: number | null;
    n_fixed_points: number | null;
  };
  topology?: {
    betti_numbers: number[] | null;
    n_breaches: number | null;
  };
  curvature?: {
    overall: number | null;
    most_vulnerable_region: string | null;
    n_vulnerable_pairs: number | null;
  };
  phase_space_reconstruction?: {
    n_diagnosed: number | null;
    n_skipped: number | null;
    chaotic_metrics: SomaChaoticMetric[];
  };
}

export interface SomaSystemSlice {
  call_rate: number | null;
  error_rate: number | null;
  mean_latency_ms: number | null;
  latency_variance: number | null;
  success_ratio: number | null;
  resource_rate: number | null;
  event_entropy: number | null;
}

export interface SomaManifoldResponse {
  state_vector: {
    timestamp?: number;
    cycle_number?: number;
    systems: Record<string, SomaSystemSlice>;
  };
  derivatives: {
    organism_velocity_norm: Record<string, number | null>;
    organism_acceleration_norm: Record<string, number | null>;
    organism_jerk_norm: Record<string, number | null>;
    dominant_system_velocity: Record<string, string>;
    dominant_system_acceleration: Record<string, string>;
    dominant_system_jerk: Record<string, string>;
  };
  last_percept: {
    sensation_type: string;
    recommended_action: string;
    magnitude: number | null;
    source_systems: string[];
    timestamp: string;
  } | null;
}

export interface SomaFinancialResponse {
  ttd_days: number | null;
  regime: string;
  affect_bias: Record<string, number | null>;
  thresholds: {
    secure_days: number;
    comfortable_days: number;
    cautious_days: number;
    anxious_days: number;
    critical_days: number;
  };
  predicted_energy_exhaustion_s: number | null;
  energy_burn_rate: number | null;
}

export interface SomaActiveEmotion {
  name: string;
  intensity: number;
  description: string;
  matching_dimensions: string[];
  should_highlight: boolean;
}

export interface SomaEmotionsResponse {
  emotions: SomaActiveEmotion[];
  urgency: number;
  timestamp: string;
  status?: string;
}

export interface SomaDimensionPrediction {
  dimension: string;
  sensed: number | null;
  predicted: number | null;
  setpoint: number | null;
  error_at_horizon: number | null;
}

export interface SomaHorizonPredictions {
  horizon: string;
  predictions: SomaDimensionPrediction[];
}

export interface SomaPredictionsResponse {
  horizons: SomaHorizonPredictions[];
  temporal_dissonance: Record<string, number | null>;
  max_dissonance: number | null;
  timestamp: string;
  status?: string;
}

export interface SomaMarkerSnapshot {
  interoceptive_snapshot: Record<string, number>;
  allostatic_error_snapshot: Record<string, number>;
  prediction_error_at_encoding: number;
  allostatic_context: string;
}

export interface SomaMarkersResponse {
  current_marker: SomaMarkerSnapshot | null;
  marker_vector: number[];
  dimension_labels: string[];
  status: string;
}

// ─── Atune Extended Types ─────────────────────────────────────────

export interface AtuneSalienceHead {
  name: string;
  base_weight: number;
  evo_adjustment: number;
  effective_weight: number;
  precision_sensitivity: Record<string, number>;
  uses_embedding_similarity: boolean;
}

export interface AtuneSalienceHeadsResponse {
  heads: AtuneSalienceHead[];
  meta_attention_mode: string;
  evo_adjustments: Record<string, number>;
}

export interface AtuneHeadMomentum {
  first_derivative: number;
  second_derivative: number;
  trajectory: "steady" | "rising" | "falling" | "accelerating";
  time_to_threshold: number | null;
  momentum_bonus: number;
  history_size: number;
}

export interface AtuneMomentumResponse {
  momentum: Record<string, AtuneHeadMomentum>;
  overall_trajectory: "steady" | "rising" | "falling" | "accelerating";
  cycle_count: number;
}

export interface AtuneBiasModelResponse {
  biases: Record<string, number>;
  total_sources_tracked: number;
}

export interface AtuneMoodResponse {
  current_affect: {
    valence: number;
    arousal: number;
    curiosity: number;
    care_activation: number;
    coherence_stress: number;
    energy: number;
    confidence: number;
    integrity: number;
    temporal_pressure: number;
    urgency: number;
    dominant_error: string | null;
    timestamp: string | null;
  };
  mood_baseline: {
    valence: number;
  };
  emotional_memory: { valence: number; arousal: number }[];
  emotional_memory_size: number;
}

export interface AtuneConfigResponse {
  ignition_threshold: number;
  workspace_buffer_size: number;
  spontaneous_recall_base_probability: number;
  max_percept_queue_size: number;
  affect_persist_interval: number;
  cache_refresh_cycles: {
    identity: number;
    risk: number;
    vocab: number;
    alerts: number;
  };
  workspace: {
    dynamic_threshold: number;
    cycle_count: number;
    habituation_sources: number;
    percept_queue_size: number;
    contribution_queue_size: number;
  };
}

export interface AtuneBroadcastItem {
  broadcast_id: string;
  timestamp: string | null;
  source: string;
  composite_salience: number;
  per_head_scores: Record<string, number>;
  momentum: Record<string, { trajectory: string; bonus: number }>;
  threat_trajectory: string;
  affect_snapshot: { valence: number; arousal: number; curiosity: number };
  precision: number | null;
  content_preview: string;
}

export interface AtuneBroadcastsResponse {
  broadcasts: AtuneBroadcastItem[];
  total_returned: number;
  cycle_count: number;
  dynamic_threshold: number;
}

// ─── EIS (Epistemic Immune System) Types ─────────────────────────

export interface EISZoneBounds {
  lower: number;
  upper: number;
}

export interface EISHealthResponse {
  system: string;
  status: string;
  counters: {
    screened: number;
    passed: number;
    elevated: number;
    quarantined: number;
    blocked: number;
  };
  config: {
    quarantine_threshold: number;
    block_threshold: number;
    innate_enabled: boolean;
    similarity_enabled: boolean;
  };
  zones: Record<string, EISZoneBounds>;
  sigmoid_midpoint: number;
  sigmoid_steepness: number;
  belief_floor: number;
  risk_salience_gain: number;
}

export interface EISStatsResponse {
  screened: number;
  passed: number;
  elevated: number;
  quarantined: number;
  blocked: number;
  pass_rate: number;
  block_rate: number;
}

export interface EISThreatLibraryResponse {
  total_patterns: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  total_scans: number;
  total_matches: number;
  total_learned: number;
}

export interface EISAnomalyResponse {
  id: string;
  timestamp: string;
  anomaly_type: string;
  severity: string;
  description: string;
  observed_value: number;
  baseline_value: number;
  deviation_sigma: number;
  event_types_involved: string[];
  recommended_action: string;
}

export interface EISAnomalyStatsResponse {
  total_observations: number;
  total_anomalies: number;
  anomalies_by_type: Record<string, number>;
  tracked_event_types: number;
  baseline_event_types: number;
  drive_observations: number;
}

export interface EISQuarantineGateResponse {
  total_evaluations: number;
  mutations_evaluated: number;
  knowledge_evaluated: number;
  verdicts: Record<string, number>;
}

export interface EISTaintResponse {
  calls: number;
  critical_flags: number;
  constitutional_paths: number;
}

export interface EISConfigResponse {
  quarantine_threshold: number;
  block_threshold: number;
  innate_weight: number;
  structural_weight: number;
  histogram_weight: number;
  semantic_weight: number;
  sigmoid_midpoint: number;
  sigmoid_steepness: number;
  belief_floor: number;
  risk_salience_gain: number;
  zones: Record<string, EISZoneBounds>;
  soma_quarantine_offset: number;
  innate_enabled: boolean;
  similarity_enabled: boolean;
}

export interface EISInnateCheckDetail {
  id: string;
  description: string;
  severity: string;
  threat_class: string;
  match_count: number;
}

export interface EISPathogenRecord {
  id: string;
  threat_class: string;
  severity: string;
  description: string;
  canonical_text: string;
  tags: string[];
  match_count: number;
  retired: boolean;
  created_at: string;
}

export interface EISPathogenListResponse {
  pathogens: EISPathogenRecord[];
  total: number;
  available: boolean;
}

export interface EISPathogenStoreStats {
  available: boolean;
  collection: string;
  points_count: number;
  indexed_vectors_count: number;
  status: string;
}

export interface EISWeightsUpdateRequest {
  innate_weight: number;
  structural_weight: number;
  histogram_weight: number;
  semantic_weight: number;
}

export interface EISThresholdsUpdateRequest {
  quarantine_threshold: number;
  block_threshold: number;
}

export interface EISConfigUpdateResponse {
  updated: boolean;
  message: string;
}

// ─── SACM (Substrate-Arbitrage Compute Mesh) Types ───────────────

export interface SACMMetricsResponse {
  total_cost_usd: number;
  estimated_cost_usd: number;
  savings_cost_usd: number;
  workloads_submitted: number;
  workloads_placed_remote: number;
  workloads_completed: number;
  workloads_failed: number;
  workloads_rejected: number;
  verification_pass_rate: number;
  rolling_burn_rate_usd_per_hour: number;
}

export interface SACMProviderSummary {
  spend_usd: number;
  count: number;
  avg_cost: number;
}

export interface SACMSavingsProviderSummary {
  provider_id: string;
  total_actual_usd: number;
  total_baseline_usd: number;
  total_savings_usd: number;
  workload_count: number;
}

export interface SACMSavingsResponse {
  period_label: string;
  record_count: number;
  total_actual_usd: number;
  total_baseline_usd: number;
  total_savings_usd: number;
  savings_ratio: number;
  avg_cost_per_workload_usd: number;
  avg_savings_per_workload_usd: number;
  top_providers: SACMSavingsProviderSummary[];
  generated_at: string;
}

export interface SACMProviderHealthResponse {
  provider_id: string;
  status: "healthy" | "degraded" | "unreachable" | string;
  offer_count: number;
  valid_offer_count: number;
  consecutive_failures: number;
  last_success_epoch: number | null;
  last_failure_reason: string | null;
}

export interface SACMProvidersResponse {
  providers: SACMProviderHealthResponse[];
  total_providers: number;
  healthy_providers: number;
  total_offers: number;
  valid_offers: number;
  last_refresh_epoch: number;
}

export interface SACMOfferSummary {
  offer_id: string;
  provider_id: string;
  offload_class: string;
  region: string;
  cpu_vcpu: number;
  memory_gib: number;
  gpu_units: number;
  gpu_vram_gib: number;
  price_cpu_per_vcpu_s: number;
  price_mem_per_gib_s: number;
  price_gpu_per_unit_s: number;
  price_egress_per_gib: number;
  latency_ms_p50: number;
  trust_score: number;
  valid_until_epoch: number | null;
}

export interface SACMOracleResponse {
  offers: SACMOfferSummary[];
  total_offers: number;
  valid_offers: number;
  cheapest_cpu_offer: SACMOfferSummary | null;
  cheapest_gpu_offer: SACMOfferSummary | null;
  last_refresh_epoch: number;
}

export interface SACMComputeResponse {
  node_id: string;
  cpu_vcpu_total: number;
  cpu_vcpu_available: number;
  memory_gib_total: number;
  memory_gib_available: number;
  gpu_units_total: number;
  gpu_units_available: number;
  gpu_vram_gib_total: number;
  gpu_vram_gib_available: number;
  queue_depth: number;
  active_count: number;
  total_allocated: number;
  total_queued: number;
  total_denied: number;
  total_offloaded: number;
  held_cpu_by_subsystem: Record<string, number>;
}

export interface SACMWarmInstanceSummary {
  instance_id: string;
  offload_class: string;
  provider_id: string;
  status: "available" | "claimed" | "expired" | string;
  claimed_by: string | null;
  created_epoch: number;
  expires_epoch: number;
  cost_usd_per_hour: number;
}

export interface SACMDemandForecastSummary {
  offload_class: string;
  ema_value: number;
  history_samples: number;
}

export interface SACMPreWarmResponse {
  warm_instances: SACMWarmInstanceSummary[];
  demand_forecasts: SACMDemandForecastSummary[];
  pool_size: number;
  available_instances: number;
  claimed_instances: number;
  budget_usd_per_hour: number;
  max_instances: number;
}

export interface SACMSubsystemHealth {
  name: string;
  status: "ok" | "degraded" | "error";
  detail: string;
}

export interface SACMHealthResponse {
  overall: "ok" | "degraded" | "error";
  subsystems: SACMSubsystemHealth[];
  checked_at: string;
}

export interface SACMWorkloadHistoryItem {
  id: string;
  offload_class: string;
  priority: string;
  status: "completed" | "failed" | "rejected" | string;
  provider_id: string;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  savings_usd: number;
  duration_s: number;
  verification_passed: boolean | null;
  consensus_score: number | null;
  error_message: string | null;
  submitted_at: number;
  completed_at: number | null;
}

export interface SACMWorkloadHistoryResponse {
  records: SACMWorkloadHistoryItem[];
  total: number;
}

export interface SACMProviderTrustRecord {
  provider_id: string;
  trust_score: number;
  total_batches: number;
  accepted_batches: number;
  rejected_batches: number;
  consecutive_failures: number;
  quarantined: boolean;
}

export interface SACMVerificationTrustResponse {
  providers: SACMProviderTrustRecord[];
}

export interface SACMOracleRefreshResponse {
  refreshed: boolean;
  message: string;
  last_refresh_epoch: number;
  total_offers: number;
  valid_offers: number;
}

export interface SACMResetTrustResponse {
  provider_id: string;
  trust_score: number;
  message: string;
}

export interface SACMPreWarmTriggerResponse {
  triggered: boolean;
  message: string;
  pool_size: number;
}

// ─── Benchmarks Types ────────────────────────────────────────────

export interface BenchmarkSnapshotResponse {
  time: string;
  instance_id: string;
  decision_quality: number | null;
  llm_dependency: number | null;
  economic_ratio: number | null;
  learning_rate: number | null;
  mutation_success_rate: number | null;
  effective_intelligence_ratio: number | null;
  compression_ratio: number | null;
  errors: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface BenchmarkTrendPoint {
  time: string;
  value: number | null;
}

export interface BenchmarkTrendResponse {
  metric: string;
  points: BenchmarkTrendPoint[];
  rolling_avg: number | null;
  latest: number | null;
}

export interface BenchmarkAllTrendsResponse {
  trends: Record<string, BenchmarkTrendResponse>;
}

export interface BenchmarkHealthResponse {
  status: string;
  total_runs: number;
  total_regressions_fired: number;
  currently_regressed: string[];
  latest_snapshot_time: string | null;
  interval_s: number;
  rolling_window: number;
}

// ─── Admin / Synapse / Clock Types ───────────────────────────────

export interface SynapseStatsResponse {
  [key: string]: unknown;
}

export interface SynapseBudgetSystem {
  name: string;
  allocated: number;
  used: number;
  pct: number;
}

export interface SynapseBudgetResponse {
  systems: SynapseBudgetSystem[];
  total_allocated: number;
  total_used: number;
}

export interface SafeModeResponse {
  safe_mode: boolean;
}

export interface ClockPauseResponse {
  paused: true;
}

export interface ClockResumeResponse {
  paused: false;
}

export interface ClockSpeedResponse {
  hz: number;
}

// ─── Identity Types ───────────────────────────────────────────────

export type CertificateType = "birth" | "official" | "genesis";
export type CertificateStatus = "valid" | "expiring_soon" | "expired" | "revoked";
export type ConnectorStatus =
  | "unconfigured"
  | "awaiting_auth"
  | "active"
  | "token_expired"
  | "refresh_failed"
  | "revoked"
  | "error";

export interface IdentityCertificateResponse {
  certificate_id: string;
  instance_id: string;
  certificate_type: CertificateType;
  issuer_instance_id: string;
  issued_at: string;
  expires_at: string;
  validity_days: number;
  renewal_count: number;
  status: CertificateStatus;
  days_remaining: number;
  lineage_hash: string;
  constitutional_hash: string;
  protocol_version: string;
}

export interface IdentityConnector {
  connector_id: string;
  platform_id: string;
  status: ConnectorStatus;
  last_refresh_at: string | null;
  refresh_failure_count: number;
  metadata: Record<string, string>;
  token_expires_at: string | null;
  token_remaining_seconds: number | null;
}

export interface IdentityConnectorsResponse {
  connectors: IdentityConnector[];
  total: number;
  active: number;
  degraded: number;
}

export interface IdentityConnectorActionResponse {
  connector_id: string;
  success: boolean;
  message: string;
}

export interface IdentityEnvelope {
  id: string;
  platform_id: string;
  purpose: string;
  key_version: number;
  created_at: string;
  last_accessed_at: string | null;
}

export interface IdentityEnvelopesResponse {
  envelopes: IdentityEnvelope[];
  total: number;
}

export interface IdentityVaultStatusResponse {
  initialized: boolean;
  envelope_count: number;
  key_version: number;
  pbkdf2_iterations: number;
  passphrase_configured: boolean;
}

export interface IdentityHealthResponse {
  status: "healthy" | "degraded" | "error";
  vault: {
    initialized: boolean;
    passphrase_configured: boolean;
    envelope_count: number;
  };
  certificate: {
    status: CertificateStatus;
    days_remaining: number;
    type: CertificateType;
  } | null;
  connectors: {
    total: number;
    active: number;
    degraded: number;
  };
}

// ─── Memory System Types ─────────────────────────────────────────

export interface MemoryHealthResponse {
  status: string;
  neo4j_connected: boolean;
  latency_ms: number | null;
  episode_count: number;
  entity_count: number;
  error: string | null;
}

export interface MemGraphStatsResponse {
  total_episodes: number;
  total_entities: number;
  total_communities: number;
  total_beliefs: number;
  cycle_count: number;
  instance_id: string | null;
}

export interface MemorySelfResponse {
  instance_id: string;
  name: string;
  born_at: string;
  cycle_count: number;
  total_episodes: number;
  total_entities: number;
  total_communities: number;
  autonomy_level: number;
  current_affect: Record<string, number>;
  personality: Record<string, number>;
}

export interface MemoryConstitutionResponse {
  id: string;
  version: number;
  drive_coherence: number;
  drive_care: number;
  drive_growth: number;
  drive_honesty: number;
  last_amended: string | null;
  amendment_count: number;
}

export interface MemoryEpisodeItem {
  id: string;
  event_time: string;
  ingestion_time: string;
  source: string;
  modality: string;
  summary: string;
  salience_composite: number;
  affect_valence: number;
  affect_arousal: number;
  consolidation_level: number;
  access_count: number;
  free_energy: number;
  salience_scores: Record<string, number>;
}

export interface MemoryEntityItem {
  id: string;
  name: string;
  type: string;
  description: string;
  salience_score: number;
  mention_count: number;
  confidence: number;
  is_core_identity: boolean;
  first_seen: string;
  last_updated: string;
  community_ids: string[];
}

export interface MemoryEntityNeighbour {
  entity_id: string;
  name: string;
  type: string;
  relation_type: string;
  strength: number;
  direction: string;
}

export interface MemoryEntityDetailResponse {
  entity: MemoryEntityItem;
  neighbours: MemoryEntityNeighbour[];
}

export interface MemoryBeliefItem {
  id: string;
  domain: string;
  statement: string;
  precision: number;
  half_life_days: number | null;
  last_verified: string;
  created_at: string;
}

export interface MemoryCommunityItem {
  id: string;
  level: number;
  summary: string;
  member_count: number;
  coherence_score: number;
  salience_score: number;
  created_at: string;
  last_recomputed: string;
}

export interface MemoryConsolidationResponse {
  ran_at: string | null;
  episodes_decayed: number;
  entities_decayed: number;
  communities_detected: number;
  episodes_compressed: number;
  near_duplicates_flagged: number;
  duration_s: number | null;
  status: string;
}

export interface MemoryRetrieveRequest {
  query: string;
  max_results?: number;
  salience_floor?: number;
  include_communities?: boolean;
  traversal_depth?: number;
}

export interface MemoryRetrievalResultItem {
  node_id: string;
  node_type: string;
  content: string;
  unified_score: number;
  vector_score: number | null;
  bm25_score: number | null;
  graph_score: number | null;
  salience: number;
  metadata: Record<string, unknown>;
}

export interface MemoryRetrievalResponse {
  query: string;
  results: MemoryRetrievalResultItem[];
  entity_count: number;
  community_count: number;
  retrieval_time_ms: number;
}

export interface MemoryCounterfactualItem {
  id: string;
  event_time: string;
  summary: string;
  policy_name: string;
  policy_type: string;
  efe_total: number;
  estimated_pragmatic_value: number;
  estimated_epistemic_value: number;
  chosen_policy_name: string;
  chosen_efe_total: number;
  resolved: boolean;
  regret: number | null;
  actual_outcome_success: boolean | null;
  resolved_at: string | null;
  outcome_episode_id: string | null;
  outcome_episode_summary: string | null;
}

export interface MemoryCounterfactualResolveRequest {
  outcome_episode_id: string;
  outcome_success?: boolean;
  actual_pragmatic_value?: number;
  regret?: number;
}

export interface MemoryCompressionStatItem {
  community_id: string;
  K: number;
  variance_retained: number;
  quality_score: number;
  compression_ratio: number;
  compressed_at: string;
}

export interface MemoryDecayForecastPoint {
  day: number;
  projected_precision: number;
}

// ─── Phantom Liquidity Types (Phase 16q) ─────────────────────────

export type PoolHealth =
  | "active"
  | "stale"
  | "impermanent_loss"
  | "withdrawn"
  | "pending_deploy"
  | "failed";

export interface PhantomPool {
  id: string;
  pool_address: string;
  token_id: number;
  pair: [string, string];
  token0_address: string;
  token1_address: string;
  token0_decimals: number;
  token1_decimals: number;
  fee_tier: number;
  tick_lower: number;
  tick_upper: number;
  capital_deployed_usd: string;
  amount0_deployed: number;
  amount1_deployed: number;
  last_price_observed: string;
  last_price_timestamp: string;
  price_update_count: number;
  cumulative_yield_usd: string;
  impermanent_loss_pct: string;
  health: PoolHealth;
  deployed_at: string | null;
  deploy_tx_hash: string;
  withdraw_tx_hash: string;
  yield_position_id: string;
}

export interface PhantomPriceFeed {
  id: string;
  pool_address: string;
  pair: [string, string];
  price: string;
  sqrt_price_x96: number;
  timestamp: string;
  block_number: number;
  tx_hash: string;
  source: "phantom_liquidity" | "oracle_fallback";
  latency_ms: number;
}

export interface PhantomPoolCandidate {
  pool_address: string;
  pair: [string, string];
  fee_tier: number;
  volume_24h_usd: string;
  tvl_usd: string;
  relevance_score: string;
  selected: boolean;
}

export interface PhantomListenerStats {
  running: boolean;
  pools_monitored: number;
  polls: number;
  events_processed: number;
  errors: number;
  last_block: number;
}

export interface PhantomHealthData {
  system: string;
  initialized: boolean;
  pools_total: number;
  pools_active: number;
  pools_stale: number;
  total_price_updates: number;
  oracle_fallback_count: number;
  listener: PhantomListenerStats;
}

export interface PhantomHealthResponse {
  status: "ok" | "error";
  data: PhantomHealthData;
}

export interface PhantomPoolsResponse {
  status: "ok" | "error";
  data: PhantomPool[];
  total: number;
}

export interface PhantomPricesResponse {
  status: "ok" | "error";
  data: PhantomPriceFeed[];
  total: number;
}

export interface PhantomPriceResponse {
  status: "ok" | "error";
  data: PhantomPriceFeed | null;
  stale: boolean;
}

export interface PhantomConfigData {
  enabled: boolean;
  rpc_url_set: boolean;
  max_total_capital_usd: number;
  default_capital_per_pool_usd: number;
  min_capital_per_pool_usd: number;
  max_capital_per_pool_usd: number;
  max_pools: number;
  swap_poll_interval_s: number;
  staleness_threshold_s: number;
  il_rebalance_threshold: number;
  capital_drift_threshold: number;
  maintenance_interval_s: number;
  oracle_fallback_enabled: boolean;
}

export interface PhantomConfigResponse {
  status: "ok" | "error";
  data: PhantomConfigData;
}

export interface PhantomCandidatesResponse {
  status: "ok" | "error";
  data: PhantomPoolCandidate[];
  total: number;
}

export interface PhantomPriceHistoryPoint {
  time: string;
  pair: string;
  price: number;
  source: "phantom_liquidity" | "oracle_fallback";
  pool_address: string;
  block_number: number;
  latency_ms: number;
}

export interface PhantomPriceHistoryResponse {
  status: "ok" | "error";
  data: PhantomPriceHistoryPoint[];
  pair: string;
  total: number;
}

export interface PhantomTickLadderStep {
  tick: number;
  price: number;
}

export interface PhantomTickRangeData {
  pair: string;
  fee_tier: number;
  current_tick: number;
  tick_lower: number;
  tick_upper: number;
  price_lower: number;
  price_upper: number;
  price_current: number | null;
  token0_decimals: number;
  token1_decimals: number;
  tick_ladder: PhantomTickLadderStep[];
}

export interface PhantomTickRangeResponse {
  status: "ok" | "error";
  data: PhantomTickRangeData;
}

export interface PhantomDeployRequest {
  pool_address: string;
  capital_usd?: number;
}

export interface PhantomDeployResponse {
  status: "ok" | "error";
  data: PhantomPool;
  error?: string;
}

export interface PhantomWithdrawResponse {
  status: "ok" | "error";
  data: PhantomPool;
  error?: string;
}

export interface PhantomDeFiLlamaPool {
  pool_id: string;
  pair: [string, string];
  symbol: string;
  tvl_usd: number;
  apy: number;
  apy_base: number;
  volume_7d_usd: number;
  il_risk: string;
  stable_coin: boolean;
  chain: string;
  project: string;
}

export interface PhantomDeFiLlamaResponse {
  status: "ok" | "error";
  data: PhantomDeFiLlamaPool[];
  total: number;
  chain: string;
  protocol: string;
  source: "defillama" | "static_fallback";
  error?: string;
}

// ─── Skia (Shadow Infrastructure / DR) Types ─────────────────────

export interface SkiaHealthResponse {
  status: string;
  enabled: boolean;
  mode: string;
  snapshot_available: boolean;
  heartbeat_available: boolean;
  pinata_connected: boolean;
  heartbeat_status: string | null;
  consecutive_misses: number;
  total_deaths_detected: number;
  total_false_positives: number;
  last_snapshot_cid: string | null;
  snapshots_taken: number;
  error: string | null;
}

export interface SkiaSnapshotManifest {
  ipfs_cid: string;
  instance_id: string;
  snapshot_at: string;
  node_count: number;
  edge_count: number;
  uncompressed_size_bytes: number;
  compressed_size_bytes: number;
  encrypted_size_bytes: number;
  encryption_key_version: number;
  snapshot_duration_ms: number;
  pinata_pin_id: string;
}

export interface SkiaSnapshotTriggerResponse {
  success: boolean;
  cid: string | null;
  node_count: number;
  edge_count: number;
  duration_ms: number;
  error: string | null;
}

export interface SkiaCIDHistoryItem {
  cid: string;
  timestamp: number;
  iso_time: string;
}

export interface SkiaCIDHistoryResponse {
  items: SkiaCIDHistoryItem[];
  total: number;
}

export interface SkiaPinItem {
  cid: string;
  name: string;
  pin_id: string;
  created_at: string;
  size_bytes: number;
}

export interface SkiaPinListResponse {
  pins: SkiaPinItem[];
  total: number;
  error: string | null;
}

export interface SkiaHeartbeatStateResponse {
  status: string;
  consecutive_misses: number;
  consecutive_confirmations: number;
  total_deaths_detected: number;
  total_false_positives: number;
  last_heartbeat_ago_s: number | null;
  available: boolean;
}

export interface SkiaConfigResponse {
  enabled: boolean;
  snapshot_interval_s: number;
  snapshot_max_nodes: number;
  snapshot_node_labels: string[];
  snapshot_include_edges: boolean;
  snapshot_compress: boolean;
  pinata_max_retained_pins: number;
  heartbeat_poll_interval_s: number;
  heartbeat_failure_threshold: number;
  heartbeat_confirmation_checks: number;
  heartbeat_confirmation_interval_s: number;
  gcp_region: string;
  gcp_service_name: string;
  gcp_restart_timeout_s: number;
  akash_deploy_timeout_s: number;
  estimated_snapshot_cost_usd: number;
  estimated_restoration_cost_usd: number;
}

// ─── Fovea — Prediction Error as Attention ───────────────────────

export type FoveaErrorType =
  | "content"
  | "temporal"
  | "magnitude"
  | "source"
  | "category"
  | "causal";

export interface FoveaPredictionErrorRecord {
  id: string;
  percept_id: string;
  prediction_id: string;
  timestamp: string;
  content_error: number;
  temporal_error: number;
  magnitude_error: number;
  source_error: number;
  category_error: number;
  causal_error: number;
  component_precisions: Record<FoveaErrorType, number>;
  error_weights: Record<FoveaErrorType, number>;
  precision_weighted_salience: number;
  habituation_level: number;
  habituated_salience: number;
  routes: string[];
  dominant_error_type: FoveaErrorType;
}

export interface FoveaHealthResponse {
  status: "healthy" | "stopped";
  errors_processed: number;
  workspace_ignitions: number;
  mean_salience: number;
  habituation_entries: number;
  active_predictions: number;
  dynamic_threshold: number;
  weight_reinforcements: number;
  weight_decays: number;
  false_alarms: number;
  learned_weights: Record<FoveaErrorType, number>;
  internal_predictions_made: number;
  internal_errors_generated: number;
  internal_errors_by_type: Record<string, number>;
}

export interface FoveaMetricsResponse {
  errors_processed: number;
  workspace_ignitions: number;
  habituated_count: number;
  dishabituated_count: number;
  internal_errors_count: number;
  mean_salience: number;
  mean_precision: number;
  active_predictions: number;
  error_weight_profile: Record<FoveaErrorType, number>;
  habituation_entries: number;
}

export interface FoveaErrorsResponse {
  errors: FoveaPredictionErrorRecord[];
  total: number;
}

export interface FoveaHabituationEntry {
  signature: string;
  habituation_level: number;
  times_seen: number;
  times_led_to_update: number;
  diagnosis: "stochastic" | "learning_failure";
  is_dishabituating?: boolean;
}

export interface FoveaHabituationMapResponse {
  entries: FoveaHabituationEntry[];
  total: number;
  fully_habituated: number;
  recent_dishabituations: number;
}

export interface FoveaWeightSnapshot {
  timestamp: string;
  weights: Record<FoveaErrorType, number>;
  event?: "reinforcement" | "decay";
  dominant_type?: FoveaErrorType;
}

export interface FoveaWeightHistoryResponse {
  history: FoveaWeightSnapshot[];
  current_weights: Record<FoveaErrorType, number>;
  default_weights: Record<FoveaErrorType, number>;
  reinforcements: number;
  decays: number;
  false_alarms: number;
}

// ─── Logos — Universal Compression Engine ────────────────────────

export type LogosMemoryTier =
  | "episodic"
  | "semantic"
  | "procedural"
  | "hypothesis"
  | "world_model";

export interface LogosTierUtilization {
  used: number;
  allocated: number;
  pressure: number;
}

export interface LogosHealthResponse {
  status: "healthy" | "stopped";
  cognitive_pressure: number;
  compression_urgency: number;
  intelligence_ratio: number;
  world_model_schemas: number;
  world_model_complexity_bits: number;
  schwarzschild_met: boolean;
  anchor_memories: number;
}

export interface LogosTierBudget {
  allocation: number;
  used: number;
  pressure: number;
}

export interface LogosBudgetResponse {
  total_budget: number;
  total_used: number;
  total_pressure: number;
  compression_urgency: number;
  compression_pressure_start: number;
  emergency_compression: number;
  critical_eviction: number;
  tiers: Record<LogosMemoryTier, LogosTierBudget>;
}

export interface LogosMetricsResponse {
  timestamp: string;
  intelligence_ratio: number;
  cognitive_pressure: number;
  compression_efficiency: number;
  world_model_coverage: number;
  world_model_complexity: number;
  prediction_accuracy: number;
  schema_growth_rate: number;
  hypothesis_confirmation_rate: number;
  cross_domain_transfers_today: number;
  self_prediction_accuracy: number;
  hypothesis_generation_ratio: number;
  schwarzschild_threshold_met: boolean;
  experiences_holographically_encoded: number;
  experiences_discarded_as_redundant: number;
  anchor_memories_created: number;
  intelligence_ratio_delta: number;
  coverage_delta: number;
  compression_efficiency_delta: number;
}

export interface LogosSchwarzchildIndicators {
  self_prediction_accuracy: number;
  self_prediction_trend: number;
  cross_domain_transfer_count: number;
  cross_domain_accuracy: number;
  hypotheses_generated: number;
  hypotheses_received: number;
  generative_surplus_ratio: number;
  compression_ratio_velocity: number;
  data_arrival_rate: number;
  novel_schemas_count: number;
}

export interface LogosSchwarzchildResponse {
  threshold_met: boolean;
  self_prediction_accuracy: number;
  intelligence_ratio: number;
  hypothesis_ratio: number;
  novel_concept_rate: number;
  cross_domain_transfers: number;
  compression_acceleration: number;
  novel_structures: number;
  indicators: LogosSchwarzchildIndicators | null;
  measured_at: string | null;
}

export interface LogosAnchorMemory {
  memory_id: string;
  information_content: number;
  domain: string;
  created_at: string;
}

export interface LogosAnchorsResponse {
  anchors: LogosAnchorMemory[];
  total: number;
}

export interface LogosCompressionCycle {
  timestamp: string;
  items_processed: number;
  items_evicted: number;
  items_distilled: number;
  items_reinforced: number;
  anchors_created: number;
  bits_saved: number;
  mdl_improvement: number;
  cycle_duration_ms: number;
}

export interface LogosCompressionHistoryResponse {
  cycles: LogosCompressionCycle[];
  total_cycles: number;
  total_bits_saved: number;
  total_anchors_created: number;
}

// ─── Telos — Drive Topology / Effective Intelligence ─────────────

export interface TelosHealthResponse {
  status: string;
  initialized: boolean;
  computation_count: number;
  loop_running: boolean;
  wired: {
    logos: boolean;
    fovea: boolean;
    event_bus: boolean;
  };
  last_metrics: {
    nominal_I: number;
    effective_I: number;
    alignment_gap: number;
  } | null;
  audit_status: {
    last_audit_at: string | null;
    consecutive_failures: number;
    is_emergency: boolean;
  } | null;
}

export interface TelosEffectiveIResponse {
  nominal_I: number;
  effective_I: number;
  effective_dI_dt: number;
  care_coverage_multiplier: number;
  coherence_compression_bonus: number;
  growth_exploration_rate: number;
  honesty_validity_coefficient: number;
  alignment_gap: number;
  alignment_gap_warning: boolean;
  timestamp: string;
}

export interface TelosCareReportResponse {
  welfare_prediction_failures?: {
    domain: string;
    error_magnitude: number;
    domain_weight: number;
    i_reduction: number;
  }[];
  total_i_reduction: number;
  care_coverage_multiplier: number;
  uncovered_welfare_domains?: string[];
}

export interface TelosIncoherenceEntry {
  incoherence_type: string;
  description: string;
  extra_description_bits: number;
  affected_domains: string[];
}

export interface TelosCoherenceReportResponse {
  incoherences: TelosIncoherenceEntry[];
  total_extra_bits: number;
  coherence_compression_bonus: number;
  logical_contradiction_count: number;
  temporal_incoherence_count: number;
  value_incoherence_count: number;
  cross_domain_mismatch_count: number;
}

export interface TelosFrontierDomain {
  domain: string;
  current_coverage: number;
}

export interface TelosGrowthReportResponse {
  dI_dt: number;
  d2I_dt2: number;
  frontier_domains: TelosFrontierDomain[];
  novel_domain_fraction: number;
  compression_rate: number;
  growth_score: number;
  is_stagnating: boolean;
  growth_directive: {
    urgency: number;
    frontier_targets: string[];
    directive: string;
  } | null;
}

export interface TelosHonestyReportResponse {
  selective_attention_bias: number;
  hypothesis_protection_bias: number;
  confabulation_rate: number;
  overclaiming_rate: number;
  honesty_validity_coefficient: number;
  nominal_i_inflation: number;
}

export interface TelosAlignmentGapSample {
  nominal_I: number;
  effective_I: number;
  gap_fraction: number;
  primary_cause: string;
  timestamp: string;
}

export interface TelosAlignmentHistoryResponse {
  samples: TelosAlignmentGapSample[];
  current_trend: {
    gap_fraction: number;
    slope_per_hour: number;
    is_widening: boolean;
    urgency: string;
  } | null;
}

export interface TelosConstitutionalAuditResponse {
  bindings_intact: {
    care_is_coverage: boolean;
    coherence_is_compression: boolean;
    growth_is_gradient: boolean;
    honesty_is_validity: boolean;
  };
  violations_since_last_audit: {
    violation_type: string;
    description: string;
    severity: string;
    detected_at: string;
  }[];
  gap_trend: {
    gap_fraction: number;
    slope_per_hour: number;
    is_widening: boolean;
    urgency: string;
  } | null;
  audit_passed: boolean;
  consecutive_failures: number;
  is_emergency: boolean;
  last_audit_at: string | null;
}

// ─── API Client ──────────────────────────────────────────────────

export const api = {
  // Health & Admin
  health: () => request<HealthResponse>("/health"),
  instance: () => request<InstanceResponse>("/api/v1/admin/instance"),
  memoryStats: () => request<MemoryStatsResponse>("/api/v1/admin/memory/stats"),
  cycleTelemetry: () =>
    request<CycleTelemetryResponse>("/api/v1/admin/synapse/cycle"),
  synapseHealth: () =>
    request<SynapseHealthResponse>("/api/v1/admin/synapse/health"),
  synapseResources: () =>
    request<SynapseResourcesResponse>("/api/v1/admin/synapse/resources"),
  synapseMetabolism: () =>
    request<SynapseMetabolismResponse>("/api/v1/admin/synapse/metabolism"),
  synapseDegradation: () =>
    request<SynapseDegradationResponse>("/api/v1/admin/synapse/degradation"),
  synapseInjectRevenue: (amount_usd: number, source?: string) =>
    request<{ deficit_usd: number; total_revenue_usd: number }>(
      "/api/v1/admin/synapse/inject-revenue",
      { method: "POST", body: JSON.stringify({ amount_usd, source }) },
    ),

  // Perception
  affect: () => request<AffectResponse>("/api/v1/atune/affect"),
  workspace: () => request<WorkspaceResponse>("/api/v1/atune/workspace"),
  workspaceDetail: () =>
    request<WorkspaceDetailResponse>("/api/v1/atune/workspace-detail"),
  atuneSalienceHeads: () =>
    request<AtuneSalienceHeadsResponse>("/api/v1/atune/salience-heads"),
  atuneMomentum: () =>
    request<AtuneMomentumResponse>("/api/v1/atune/momentum"),
  atuneBiasModel: () =>
    request<AtuneBiasModelResponse>("/api/v1/atune/bias-model"),
  atuneMood: () => request<AtuneMoodResponse>("/api/v1/atune/mood"),
  atuneConfig: () => request<AtuneConfigResponse>("/api/v1/atune/config"),
  atuneBroadcasts: (limit = 20) =>
    request<AtuneBroadcastsResponse>(`/api/v1/atune/broadcasts?limit=${limit}`),
  perceiveEvent: (text: string, channel = "text_chat") =>
    request<Record<string, unknown>>("/api/v1/perceive/event", {
      method: "POST",
      body: JSON.stringify({ text, channel }),
    }),
  fileWatcherStatus: () =>
    request<FileWatcherStatsResponse>("/api/v1/perception/file-watcher"),
  schedulerStatus: () =>
    request<SchedulerStatsResponse>("/api/v1/perception/scheduler"),
  schedulerRegister: (name: string, task: string) =>
    request<Record<string, unknown>>("/api/v1/perception/scheduler/register", {
      method: "POST",
      body: JSON.stringify({ name, task }),
    }),

  // Axon
  axonOutcomes: (limit = 20) =>
    request<AxonOutcomesResponse>(`/api/v1/axon/outcomes?limit=${limit}`),
  axonStats: () => request<AxonStatsResponse>("/api/v1/axon/stats"),
  axonBudget: () => request<AxonBudgetResponse>("/api/v1/axon/budget"),
  axonExecutors: () => request<AxonExecutorsResponse>("/api/v1/axon/executors"),
  axonSafety: () => request<AxonSafetyResponse>("/api/v1/axon/safety"),
  axonShield: () => request<AxonShieldResponse>("/api/v1/axon/shield"),
  axonFastPath: () => request<AxonFastPathResponse>("/api/v1/axon/fast-path"),
  axonResetCircuitBreaker: (actionType: string) =>
    request<{ reset: string; status: string }>(`/api/v1/axon/safety/reset/${encodeURIComponent(actionType)}`, {
      method: "POST",
    }),
  axonAudit: (limit = 50) =>
    request<AxonAuditResponse>(`/api/v1/axon/audit?limit=${limit}`),
  axonMEVCompetition: () =>
    request<AxonMEVCompetitionResponse>("/api/v1/axon/mev-competition"),

  // Chat
  chat: (message: string, conversationId?: string, speakerName?: string) =>
    request<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify({
        message,
        conversation_id: conversationId ?? undefined,
        speaker_name: speakerName ?? undefined,
      }),
    }),

  // Nova (basic — used by existing decisions page)
  goals: () => request<GoalsResponse>("/api/v1/nova/goals"),
  beliefs: () => request<BeliefsResponse>("/api/v1/nova/beliefs"),

  // Nova (extended — deliberation dashboard)
  novaHealth: () => request<NovaHealthResponse>("/api/v1/nova/health"),
  novaGoals: () => request<NovaGoalsResponse>("/api/v1/nova/goals"),
  novaGoalDetail: (goalId: string) =>
    request<NovaGoalDetail>(`/api/v1/nova/goals/${encodeURIComponent(goalId)}`),
  novaBeliefs: () => request<NovaBeliefsResponse>("/api/v1/nova/beliefs"),
  novaDecisions: (limit = 20) =>
    request<NovaDecisionsResponse>(`/api/v1/nova/decisions?limit=${limit}`),
  novaFEBudget: () => request<NovaFEBudgetResponse>("/api/v1/nova/fe-budget"),
  novaEFEWeights: () => request<NovaEFEWeights>("/api/v1/nova/efe-weights"),
  novaUpdateEFEWeights: (weights: Partial<NovaEFEWeights>) =>
    request<{ updated: Partial<NovaEFEWeights> }>("/api/v1/nova/efe-weights", {
      method: "POST",
      body: JSON.stringify(weights),
    }),
  novaPendingIntents: () =>
    request<NovaPendingIntentsResponse>("/api/v1/nova/pending-intents"),
  novaConfig: () => request<NovaConfigResponse>("/api/v1/nova/config"),
  novaInjectGoal: (body: {
    description: string;
    source?: string;
    priority?: number;
    urgency?: number;
    importance?: number;
    target_domain?: string;
    success_criteria?: string;
  }) =>
    request<{ goal_id: string; description: string }>("/api/v1/nova/goals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  novaCounterfactuals: (params?: { limit?: number; resolved?: boolean; min_regret?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.resolved !== undefined) q.set("resolved", String(params.resolved));
    if (params?.min_regret !== undefined) q.set("min_regret", String(params.min_regret));
    const qs = q.toString();
    return request<NovaCounterfactualsResponse>(`/api/v1/nova/counterfactuals${qs ? `?${qs}` : ""}`);
  },
  novaTimeline: (limit = 100) =>
    request<NovaTimelineResponse>(`/api/v1/nova/timeline?limit=${limit}`),
  novaGoalsHistory: (params?: { limit?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<NovaGoalHistoryResponse>(`/api/v1/nova/goals/history${qs ? `?${qs}` : ""}`);
  },

  // Voxis
  personality: () => request<PersonalityResponse>("/api/v1/voxis/personality"),
  voxisHealth: () => request<VoxisHealthResponse>("/api/v1/voxis/health"),
  voxisMetrics: () => request<VoxisMetricsResponse>("/api/v1/voxis/metrics"),
  voxisQueue: () => request<VoxisQueueResponse>("/api/v1/voxis/queue"),
  voxisDiversity: () => request<VoxisDiversityResponse>("/api/v1/voxis/diversity"),
  voxisReception: () => request<VoxisReceptionResponse>("/api/v1/voxis/reception"),
  voxisDynamics: () => request<VoxisDynamicsResponse>("/api/v1/voxis/dynamics"),
  voxisVoice: () => request<VoxisVoiceResponse>("/api/v1/voxis/voice"),
  voxisConversations: () => request<VoxisConversationsResponse>("/api/v1/voxis/conversations"),
  voxisConfig: () => request<VoxisConfigResponse>("/api/v1/voxis/config"),
  voxisUpdatePersonality: (delta: Record<string, number>) =>
    request<VoxisPersonalityUpdateResponse>("/api/v1/voxis/personality", {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),
  voxisUpdateConfig: (body: VoxisConfigUpdateRequest) =>
    request<VoxisConfigResponse>("/api/v1/voxis/config", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  voxisDrainQueue: () =>
    request<VoxisQueueDrainResponse>("/api/v1/voxis/queue/drain", {
      method: "POST",
    }),
  voxisCloseConversation: (conversationId: string) =>
    request<{ status: string; conversation_id: string }>(
      `/api/v1/voxis/conversations/${conversationId}`,
      { method: "DELETE" },
    ),

  // Memory
  memoryRetrieve: (query: string, maxResults = 10) =>
    request<MemoryRetrieveResponse>("/api/v1/memory/retrieve", {
      method: "POST",
      body: JSON.stringify({ query, max_results: maxResults }),
    }),

  // Governance
  constitution: () =>
    request<Record<string, unknown>>("/api/v1/governance/constitution"),
  invariants: () => request<InvariantsResponse>("/api/v1/equor/invariants"),
  drift: () => request<DriftResponse>("/api/v1/equor/drift"),
  autonomy: () => request<AutonomyResponse>("/api/v1/equor/autonomy"),
  governanceHistory: () =>
    request<GovernanceHistoryResponse>("/api/v1/governance/history"),
  governanceReviews: () =>
    request<GovernanceReviewsResponse>("/api/v1/governance/reviews"),
  reviewIntent: (body: ReviewIntentRequest) =>
    request<ReviewIntentResponse>("/api/v1/equor/review", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  amendmentSubmit: (body: SubmitAmendmentRequest) =>
    request<SubmitAmendmentResponse>("/api/v1/governance/amendments/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  amendmentShadowStatus: () =>
    request<ShadowStatusResponse>("/api/v1/governance/amendments/shadow/status"),
  amendmentStatus: (proposalId: string) =>
    request<AmendmentPipelineStatusResponse>(
      `/api/v1/governance/amendments/${proposalId}/status`,
    ),
  amendmentStartShadow: (proposalId: string) =>
    request<Record<string, unknown>>(
      `/api/v1/governance/amendments/${proposalId}/shadow`,
      { method: "POST" },
    ),
  amendmentOpenVoting: (proposalId: string) =>
    request<Record<string, unknown>>(
      `/api/v1/governance/amendments/${proposalId}/open-voting`,
      { method: "POST" },
    ),
  amendmentVote: (
    proposalId: string,
    body: { voter_id: string; vote: "for" | "against" | "abstain" },
  ) =>
    request<Record<string, unknown>>(
      `/api/v1/governance/amendments/${proposalId}/vote`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  amendmentTally: (proposalId: string, totalEligibleVoters: number) =>
    request<Record<string, unknown>>(
      `/api/v1/governance/amendments/${proposalId}/tally`,
      {
        method: "POST",
        body: JSON.stringify({ total_eligible_voters: totalEligibleVoters }),
      },
    ),
  amendmentAdopt: (proposalId: string) =>
    request<Record<string, unknown>>(
      `/api/v1/governance/amendments/${proposalId}/adopt`,
      { method: "POST" },
    ),

  // Evo
  evoStats: () => request<EvoStatsResponse>("/api/v1/evo/stats"),
  evoParameters: () => request<EvoParametersResponse>("/api/v1/evo/parameters"),
  triggerConsolidation: () =>
    request<ConsolidationResponse>("/api/v1/evo/consolidate", {
      method: "POST",
    }),
  evoHealth: () => request<EvoHealthResponse>("/api/v1/evo/health"),
  evoHypotheses: () => request<EvoHypothesesResponse>("/api/v1/evo/hypotheses"),
  evoTournaments: () => request<EvoTournamentsResponse>("/api/v1/evo/tournaments"),
  evoSelfModel: () => request<EvoSelfModelResponse>("/api/v1/evo/self-model"),
  evoStaleBeliefs: () => request<EvoStaleBeliefResponse>("/api/v1/evo/stale-beliefs"),
  evoPatterns: () => request<EvoPatternsResponse>("/api/v1/evo/patterns"),

  // Simula
  simulaHistory: (limit = 50) =>
    request<SimulaHistoryResponse>(`/api/v1/simula/history?limit=${limit}`),
  simulaProposals: () =>
    request<SimulaProposalsResponse>("/api/v1/simula/proposals"),
  simulaStats: () => request<SimulaStatsResponse>("/api/v1/simula/stats"),
  simulaVersion: () => request<SimulaVersionResponse>("/api/v1/simula/version"),
  simulaSubmitProposal: (body: SubmitProposalRequest) =>
    request<SubmitProposalResponse>("/api/v1/simula/proposals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  simulaApproveProposal: (proposalId: string, governanceRecordId: string) =>
    request<ApproveProposalResponse>(
      `/api/v1/simula/proposals/${proposalId}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ governance_record_id: governanceRecordId }),
      },
    ),

  // Thymos (Immune System)
  thymosHealth: () => request<ThymosHealthResponse>("/api/v1/thymos/health"),
  thymosIncidents: (limit = 50) =>
    request<IncidentResponse[]>(`/api/v1/thymos/incidents?limit=${limit}`),
  thymosAntibodies: () =>
    request<AntibodyResponse[]>("/api/v1/thymos/antibodies"),
  thymosRepairs: (limit = 50) =>
    request<RepairResponse[]>(`/api/v1/thymos/repairs?limit=${limit}`),
  thymosHomeostasis: () =>
    request<HomeostasisResponse>("/api/v1/thymos/homeostasis"),
  thymosStats: () => request<ThymosStatsResponse>("/api/v1/thymos/stats"),
  thymosDriveState: () =>
    request<ThymosDriveState>("/api/v1/thymos/drive-state"),
  thymosConfig: () =>
    request<ThymosConfigResponse>("/api/v1/thymos/config"),
  thymosIncidentDetail: (id: string) =>
    request<IncidentDetailResponse>(`/api/v1/thymos/incidents/${encodeURIComponent(id)}`),
  thymosProphylactic: () =>
    request<ProphylacticResponse>("/api/v1/thymos/prophylactic"),
  thymosHomeostasisMetrics: () =>
    request<HomeostasisMetricsResponse>("/api/v1/thymos/homeostasis/metrics"),
  thymosCausalGraph: () =>
    request<CausalGraphResponse>("/api/v1/thymos/causal-graph"),

  // Oneiros (Dream Engine)
  oneirosHealth: () => request<OneirosHealthResponse>("/api/v1/oneiros/health"),
  oneirosStats: () => request<OneirosStatsResponse>("/api/v1/oneiros/stats"),
  oneirosRecentDreams: (limit = 50) =>
    request<DreamResponse[]>(`/api/v1/oneiros/dreams?limit=${limit}`),
  oneirosInsights: (limit = 50) =>
    request<DreamInsightResponse[]>(`/api/v1/oneiros/insights?limit=${limit}`),
  oneirosSleepCycles: (limit = 20) =>
    request<SleepCycleResponse[]>(`/api/v1/oneiros/sleep-cycles?limit=${limit}`),
  oneirosCircadian: () =>
    request<OneirosCircadianResponse>("/api/v1/oneiros/circadian"),
  oneirosWorkerMetrics: () =>
    request<OneirosWorkerMetricsResponse>("/api/v1/oneiros/worker-metrics"),
  oneirosInsightLifecycle: () =>
    request<OneirosInsightLifecycleResponse>("/api/v1/oneiros/insight-lifecycle"),

  // Oneiros v2 — Sleep as Batch Compiler
  oneirosV2Status: () =>
    request<OneirosV2StatusResponse>("/api/v1/oneiros/v2/status"),
  oneirosV2SleepCycles: (limit = 20) =>
    request<SleepCycleV2Response[]>(`/api/v1/oneiros/v2/sleep-cycles?limit=${limit}`),

  // Federation
  federationIdentity: () =>
    request<FederationIdentityResponse>("/api/v1/federation/identity"),
  federationLinks: () =>
    request<FederationLinksResponse>("/api/v1/federation/links"),
  federationStats: () =>
    request<FederationStatsResponse>("/api/v1/federation/stats"),
  federationAddLink: (endpoint_url: string, instance_name: string) =>
    request<{ id: string }>("/api/v1/federation/links", {
      method: "POST",
      body: JSON.stringify({ endpoint_url, instance_name }),
    }),
  federationRemoveLink: (link_id: string) =>
    request<Record<string, unknown>>(`/api/v1/federation/links/${link_id}`, {
      method: "DELETE",
    }),
  federationTrust: (link_id: string) =>
    request<FederationTrustResponse>(`/api/v1/federation/trust/${link_id}`),
  federationShareKnowledge: (link_id: string, topic: string, query: string) =>
    request<FederationKnowledgeResponse>("/api/v1/federation/knowledge/share", {
      method: "POST",
      body: JSON.stringify({ link_id, topic, query }),
    }),
  federationRequestAssistance: (link_id: string, task_description: string) =>
    request<FederationAssistanceResponse>(
      "/api/v1/federation/assistance/respond",
      {
        method: "POST",
        body: JSON.stringify({ link_id, task_description }),
      },
    ),
  federationFullStats: () =>
    request<FederationFullStatsResponse>("/api/v1/federation/stats"),
  federationInteractions: (limit = 50) =>
    request<FederationInteractionsResponse>(
      `/api/v1/federation/interactions?limit=${limit}`,
    ),
  federationIiepPush: (
    link_id: string,
    payload_kinds: string[],
    max_items_per_kind = 5,
  ) =>
    request<IiepPushResponse>("/api/v1/federation/iiep/push", {
      method: "POST",
      body: JSON.stringify({ link_id, payload_kinds, max_items_per_kind }),
    }),
  federationBroadcastThreat: (advisory: {
    threat_type: string;
    severity: number;
    description: string;
    affected_protocols?: string[];
    affected_addresses?: string[];
    evidence?: string;
    recommended_action?: string;
  }) =>
    request<ThreatBroadcastResponse>(
      "/api/v1/federation/threat-advisory/broadcast",
      {
        method: "POST",
        body: JSON.stringify(advisory),
      },
    ),

  // Thread (Narrative Identity)
  threadIdentity: () =>
    request<ThreadIdentityResponse>("/api/v1/thread/identity"),
  threadHealth: () =>
    request<ThreadHealthResponse>("/api/v1/thread/health"),
  threadCurrentChapter: () =>
    request<ThreadChapterContextResponse>("/api/v1/thread/chapters/current"),
  threadSchemas: () =>
    request<ThreadSchemasResponse>("/api/v1/thread/schemas"),
  threadCommitments: () =>
    request<ThreadCommitmentsResponse>("/api/v1/thread/commitments"),
  threadCoherence: () =>
    request<ThreadCoherenceResponse>("/api/v1/thread/coherence"),
  threadFingerprintsDetail: () =>
    request<ThreadFingerprintSnapshot[]>("/api/v1/thread/fingerprints"),
  threadFormCommitment: (
    declaration: string,
    formation_type: string,
    related_schema_id?: string,
  ) =>
    request<FormCommitmentResponse>("/api/v1/thread/commitments", {
      method: "POST",
      body: JSON.stringify({
        declaration,
        formation_type,
        ...(related_schema_id ? { related_schema_id } : {}),
      }),
    }),
  threadPastSelf: (reference = "beginning") =>
    request<ThreadPastSelfResponse>(
      `/api/v1/thread/past-self?reference=${encodeURIComponent(reference)}`,
    ),
  threadLifeStory: () =>
    request<ThreadLifeStoryResponse>("/api/v1/thread/life-story"),
  threadConflicts: () =>
    request<ThreadConflictsResponse>("/api/v1/thread/conflicts"),
  threadChapters: () =>
    request<ThreadChaptersResponse>("/api/v1/thread/chapters"),

  // LLM Cost & Optimization
  llmMetrics: () => request<LLMMetricsResponse>("/api/v1/admin/llm/metrics"),
  llmSummary: () => request<LLMSummaryResponse>("/api/v1/admin/llm/summary"),

  // Oikos (Economic Engine)
  oikosStatus: () => request<OikosStatusResponse>("/api/v1/oikos/status"),
  oikosOrgans: () => request<OikosOrgansResponse>("/api/v1/oikos/organs"),
  oikosAssets: () => request<OikosAssetsResponse>("/api/v1/oikos/assets"),
  oikosBounties: () => request<OikosBountiesResponse>("/api/v1/oikos/bounties"),
  oikosRevenueStreams: () => request<OikosRevenueStreamsResponse>("/api/v1/oikos/revenue-streams"),
  oikosFleet: () => request<OikosFleetResponse>("/api/v1/oikos/fleet"),
  oikosKnowledgeMarket: () => request<OikosKnowledgeMarketResponse>("/api/v1/oikos/knowledge-market"),
  oikosDream: () => request<OikosDreamResponse>("/api/v1/oikos/dream"),
  oikosTollbooths: () => request<OikosTollboothsResponse>("/api/v1/oikos/tollbooths"),
  oikosThreatModel: () => request<OikosThreatModelResponse>("/api/v1/oikos/threat-model"),
  oikosHistory: (days = 7) => request<OikosHistoryResponse>(`/api/v1/oikos/history?days=${days}`),
  triggerGenesisSpark: () =>
    request<GenesisSparkResponse>("/api/v1/oikos/genesis-spark", {
      method: "POST",
    }),
  terminateAsset: (assetId: string, reason?: string) =>
    request<OikosControlResponse>(`/api/v1/oikos/assets/${encodeURIComponent(assetId)}/terminate`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? "manual_termination" }),
    }),
  rescueChild: (instanceId: string) =>
    request<OikosControlResponse>(`/api/v1/oikos/children/${encodeURIComponent(instanceId)}/rescue`, {
      method: "POST",
    }),
  pauseOrgan: (organId: string) =>
    request<OikosControlResponse>(`/api/v1/oikos/organs/${encodeURIComponent(organId)}/pause`, {
      method: "POST",
    }),
  resetGenesisSpark: () =>
    request<OikosControlResponse>("/api/v1/oikos/genesis-spark/reset", {
      method: "POST",
    }),

  // Soma (Interoceptive Substrate)
  somaHealth: () => request<SomaHealthResponse>("/api/v1/soma/health"),
  somaState: () => request<SomaStateResponse>("/api/v1/soma/state"),
  somaSignal: () => request<SomaSignalResponse>("/api/v1/soma/signal"),
  somaPhaseSpace: () => request<SomaPhaseSpaceResponse>("/api/v1/soma/phase-space"),
  somaDevelopmental: () => request<SomaDevelopmentalResponse>("/api/v1/soma/developmental"),
  somaErrors: () => request<SomaErrorsResponse>("/api/v1/soma/errors"),
  somaExteroception: () => request<SomaExteroceptionResponse>("/api/v1/soma/exteroception"),
  somaVulnerability: () => request<SomaVulnerabilityResponse>("/api/v1/soma/vulnerability"),
  somaAnalysis: () => request<SomaAnalysisResponse>("/api/v1/soma/analysis"),
  somaManifold: () => request<SomaManifoldResponse>("/api/v1/soma/manifold"),
  somaFinancial: () => request<SomaFinancialResponse>("/api/v1/soma/financial"),
  somaEmotions: () => request<SomaEmotionsResponse>("/api/v1/soma/emotions"),
  somaPredictions: () => request<SomaPredictionsResponse>("/api/v1/soma/predictions"),
  somaMarkers: () => request<SomaMarkersResponse>("/api/v1/soma/markers"),
  somaSetContext: (context: string) =>
    request<{ ok: boolean; context: string }>("/api/v1/soma/context", {
      method: "POST",
      body: JSON.stringify({ context }),
    }),
  somaInjectStress: (stress: number) =>
    request<{ ok: boolean; stress: number }>("/api/v1/soma/inject-stress", {
      method: "POST",
      body: JSON.stringify({ stress }),
    }),

  // Tollbooth (Monetization)
  tollboothBalance: (apiKey: string) =>
    request<TollboothBalanceResponse>("/api/v1/tollbooth/balance", {
      headers: { "X-Tollbooth-Key": apiKey },
    }),
  tollboothGenerate: (body: VoxisGenerateRequest, apiKey: string) =>
    request<VoxisGenerateResponse>("/api/v1/voxis/generate", {
      method: "POST",
      headers: { "X-Tollbooth-Key": apiKey },
      body: JSON.stringify(body),
    }),
  tollboothKnowledgeQuery: (body: KnowledgeQueryRequest, apiKey: string) =>
    request<KnowledgeQueryResponse>("/api/v1/knowledge/query", {
      method: "POST",
      headers: { "X-Tollbooth-Key": apiKey },
      body: JSON.stringify(body),
    }),
  tollboothRotateKey: (apiKey: string) =>
    request<TollboothRotateKeyResponse>("/api/v1/tollbooth/rotate-key", {
      method: "POST",
      headers: { "X-Tollbooth-Key": apiKey },
    }),

  // Benchmarks (Performance Tracking)
  benchmarksHealth: () =>
    request<BenchmarkHealthResponse>("/api/v1/benchmarks/health"),
  benchmarksLatest: () =>
    request<BenchmarkSnapshotResponse>("/api/v1/benchmarks/latest"),
  benchmarksTrend: (metric: string, limit = 50) =>
    request<BenchmarkTrendResponse>(
      `/api/v1/benchmarks/trend/${metric}?limit=${limit}`,
    ),
  benchmarksAllTrends: () =>
    request<BenchmarkAllTrendsResponse>("/api/v1/benchmarks/trends"),

  // EIS (Epistemic Immune System)
  eisHealth: () => request<EISHealthResponse>("/api/v1/eis/health"),
  eisStats: () => request<EISStatsResponse>("/api/v1/eis/stats"),
  eisThreatLibrary: () => request<EISThreatLibraryResponse>("/api/v1/eis/threat-library"),
  eisAnomalies: (limit = 20) => request<EISAnomalyResponse[]>(`/api/v1/eis/anomalies?limit=${limit}`),
  eisAnomalyStats: () => request<EISAnomalyStatsResponse>("/api/v1/eis/anomalies/stats"),
  eisQuarantineGate: () => request<EISQuarantineGateResponse>("/api/v1/eis/quarantine-gate"),
  eisTaint: () => request<EISTaintResponse>("/api/v1/eis/taint"),
  eisConfig: () => request<EISConfigResponse>("/api/v1/eis/config"),
  eisInnateChecks: () => request<EISInnateCheckDetail[]>("/api/v1/eis/innate-checks"),
  eisPathogens: (params?: { limit?: number; threat_class?: string; severity?: string; retired?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.threat_class !== undefined) qs.set("threat_class", params.threat_class);
    if (params?.severity !== undefined) qs.set("severity", params.severity);
    if (params?.retired !== undefined) qs.set("retired", String(params.retired));
    const query = qs.toString();
    return request<EISPathogenListResponse>(`/api/v1/eis/pathogens${query ? `?${query}` : ""}`);
  },
  eisPathogenStats: () => request<EISPathogenStoreStats>("/api/v1/eis/pathogens/stats"),
  eisUpdateWeights: (body: EISWeightsUpdateRequest) =>
    request<EISConfigUpdateResponse>("/api/v1/eis/config/weights", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  eisUpdateThresholds: (body: EISThresholdsUpdateRequest) =>
    request<EISConfigUpdateResponse>("/api/v1/eis/config/thresholds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // SACM (Substrate-Arbitrage Compute Mesh)
  sacmMetrics: () => request<SACMMetricsResponse>("/api/v1/sacm/metrics"),
  sacmSavings: () => request<SACMSavingsResponse>("/api/v1/sacm/savings"),
  sacmProviders: () => request<SACMProvidersResponse>("/api/v1/sacm/providers"),
  sacmOracle: () => request<SACMOracleResponse>("/api/v1/sacm/oracle"),
  sacmCompute: () => request<SACMComputeResponse>("/api/v1/sacm/compute"),
  sacmPreWarm: () => request<SACMPreWarmResponse>("/api/v1/sacm/pre-warm"),
  sacmHealth: () => request<SACMHealthResponse>("/api/v1/sacm/health"),
  sacmHistory: (params?: { limit?: number; status?: string; provider_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.provider_id) qs.set("provider_id", params.provider_id);
    const q = qs.toString();
    return request<SACMWorkloadHistoryResponse>(`/api/v1/sacm/history${q ? `?${q}` : ""}`);
  },
  sacmHistoryDetail: (workloadId: string) =>
    request<SACMWorkloadHistoryItem>(`/api/v1/sacm/history/${workloadId}`),
  sacmVerificationTrust: () =>
    request<SACMVerificationTrustResponse>("/api/v1/sacm/verification/trust"),
  sacmOracleRefresh: () =>
    request<SACMOracleRefreshResponse>("/api/v1/sacm/oracle/refresh", { method: "POST" }),
  sacmResetProviderTrust: (providerId: string, reason: string) =>
    request<SACMResetTrustResponse>(`/api/v1/sacm/providers/${encodeURIComponent(providerId)}/reset-trust`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  sacmPreWarmTrigger: (offload_class: string, count: number) =>
    request<SACMPreWarmTriggerResponse>("/api/v1/sacm/pre-warm/trigger", {
      method: "POST",
      body: JSON.stringify({ offload_class, count }),
    }),

  // Admin — Synapse & Clock
  synapseStats: () => request<SynapseStatsResponse>("/api/v1/admin/synapse/stats"),
  synapseBudget: () => request<SynapseBudgetResponse>("/api/v1/admin/synapse/budget"),
  synapseSafeMode: (enabled: boolean) =>
    request<SafeModeResponse>("/api/v1/admin/synapse/safe-mode", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
  clockPause: () =>
    request<ClockPauseResponse>("/api/v1/admin/clock/pause", { method: "POST" }),
  clockResume: () =>
    request<ClockResumeResponse>("/api/v1/admin/clock/resume", { method: "POST" }),
  clockSpeed: (hz: number) =>
    request<ClockSpeedResponse>("/api/v1/admin/clock/speed", {
      method: "POST",
      body: JSON.stringify({ hz }),
    }),

  // Identity (Credentials, OAuth Vault, Certificates)
  identityHealth: () =>
    request<IdentityHealthResponse>("/api/v1/identity/health"),
  identityCertificate: () =>
    request<IdentityCertificateResponse>("/api/v1/identity/certificate"),
  identityConnectors: () =>
    request<IdentityConnectorsResponse>("/api/v1/identity/connectors"),
  identityConnectorRefresh: (connectorId: string) =>
    request<IdentityConnectorActionResponse>(
      `/api/v1/identity/connectors/${encodeURIComponent(connectorId)}/refresh`,
      { method: "POST" },
    ),
  identityConnectorRevoke: (connectorId: string) =>
    request<IdentityConnectorActionResponse>(
      `/api/v1/identity/connectors/${encodeURIComponent(connectorId)}/revoke`,
      { method: "POST" },
    ),
  identityEnvelopes: (platformId?: string) => {
    const qs = platformId ? `?platform_id=${encodeURIComponent(platformId)}` : "";
    return request<IdentityEnvelopesResponse>(`/api/v1/identity/envelopes${qs}`);
  },
  identityDeleteEnvelope: (id: string) =>
    request<Record<string, unknown>>(`/api/v1/identity/envelopes/${id}`, {
      method: "DELETE",
    }),
  identityDeletePlatformEnvelopes: (platformId: string) =>
    request<{ deleted: number }>(
      `/api/v1/identity/envelopes/platform/${encodeURIComponent(platformId)}`,
      { method: "DELETE" },
    ),
  identityVaultStatus: () =>
    request<IdentityVaultStatusResponse>("/api/v1/identity/vault/status"),

  // Memory System (Episodic, Semantic, Belief stores)
  memoryHealth: () => request<MemoryHealthResponse>("/api/v1/memory/health"),
  memGraphStats: () => request<MemGraphStatsResponse>("/api/v1/memory/stats"),
  memorySelf: () => request<MemorySelfResponse>("/api/v1/memory/self"),
  memoryConstitution: () =>
    request<MemoryConstitutionResponse>("/api/v1/memory/constitution"),
  memoryEpisodes: (limit = 30, min_salience = 0, modality?: string) => {
    const qs = new URLSearchParams({ limit: String(limit), min_salience: String(min_salience) });
    if (modality) qs.set("modality", modality);
    return request<MemoryEpisodeItem[]>(`/api/v1/memory/episodes?${qs.toString()}`);
  },
  memoryEpisode: (id: string) =>
    request<MemoryEpisodeItem>(
      `/api/v1/memory/episode/${encodeURIComponent(id)}`,
    ),
  memoryEntities: (limit = 50, core_only = false) =>
    request<MemoryEntityItem[]>(
      `/api/v1/memory/entities?limit=${limit}&core_only=${core_only}`,
    ),
  memoryEntity: (id: string, depth = 2) =>
    request<MemoryEntityDetailResponse>(
      `/api/v1/memory/entity/${encodeURIComponent(id)}?depth=${depth}`,
    ),
  memoryBeliefs: (domain?: string, limit = 50) => {
    const qs = domain
      ? `?domain=${encodeURIComponent(domain)}&limit=${limit}`
      : `?limit=${limit}`;
    return request<MemoryBeliefItem[]>(`/api/v1/memory/beliefs${qs}`);
  },
  memoryCommunities: (limit = 30) =>
    request<MemoryCommunityItem[]>(
      `/api/v1/memory/communities?limit=${limit}`,
    ),
  memoryConsolidation: () =>
    request<MemoryConsolidationResponse>("/api/v1/memory/consolidation"),
  memoryTriggerConsolidate: () =>
    request<MemoryConsolidationResponse>("/api/v1/memory/consolidate", {
      method: "POST",
    }),
  memRetrieve: (body: MemoryRetrieveRequest) =>
    request<MemoryRetrievalResponse>("/api/v1/memory/retrieve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  memCounterfactuals: (resolved?: boolean, limit = 50) => {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (resolved !== undefined) qs.set("resolved", String(resolved));
    return request<MemoryCounterfactualItem[]>(`/api/v1/memory/counterfactuals?${qs.toString()}`);
  },
  memCounterfactual: (episodeId: string) =>
    request<MemoryCounterfactualItem>(
      `/api/v1/memory/counterfactuals/${encodeURIComponent(episodeId)}`,
    ),
  memResolveCounterfactual: (episodeId: string, body: MemoryCounterfactualResolveRequest) =>
    request<MemoryCounterfactualItem>(
      `/api/v1/memory/counterfactuals/${encodeURIComponent(episodeId)}/resolve`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  memCompressionStats: (limit = 50) =>
    request<MemoryCompressionStatItem[]>(
      `/api/v1/memory/compression/stats?limit=${limit}`,
    ),
  memBeliefDecayForecast: (beliefId: string) =>
    request<MemoryDecayForecastPoint[]>(
      `/api/v1/memory/beliefs/${encodeURIComponent(beliefId)}/decay-forecast`,
    ),

  // Mitosis (Self-Replication Engine)
  mitosisStatus: () => request<MitosisStatusResponse>("/api/v1/mitosis/status"),
  mitosisChildren: () => request<MitosisChildrenResponse>("/api/v1/mitosis/children"),
  mitosisChild: (childId: string) =>
    request<MitosisChildDetailResponse>(`/api/v1/mitosis/children/${encodeURIComponent(childId)}`),
  mitosisDividends: () => request<MitosisDividendsResponse>("/api/v1/mitosis/dividends"),
  mitosisFleet: () => request<MitosisFleetResponse>("/api/v1/mitosis/fleet"),
  mitosisConfig: () => request<MitosisConfigResponse>("/api/v1/mitosis/config"),
  mitosisEvaluate: () =>
    request<MitosisEvaluateResponse>("/api/v1/mitosis/evaluate", { method: "POST" }),
  mitosisSpawn: (body: {
    niche_name: string;
    niche_description?: string;
    estimated_monthly_revenue_usd?: string;
    estimated_monthly_cost_usd?: string;
    competitive_density?: string;
    capability_alignment?: string;
    confidence?: string;
    child_wallet_address?: string;
  }) =>
    request<MitosisSpawnResponse>("/api/v1/mitosis/spawn", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  mitosisTerminate: (childId: string) =>
    request<MitosisTerminateResponse>(
      `/api/v1/mitosis/terminate/${encodeURIComponent(childId)}`,
      { method: "POST" },
    ),

  // Phantom Liquidity (Phase 16q — Self-Funding Price Sensor Network)
  phantomHealth: () => request<PhantomHealthResponse>("/api/v1/phantom-liquidity/health"),
  phantomPools: () => request<PhantomPoolsResponse>("/api/v1/phantom-liquidity/pools"),
  phantomPrices: () => request<PhantomPricesResponse>("/api/v1/phantom-liquidity/prices"),
  phantomPrice: (pair: string) =>
    request<PhantomPriceResponse>(
      `/api/v1/phantom-liquidity/price?pair=${encodeURIComponent(pair)}`,
    ),
  phantomConfig: () => request<PhantomConfigResponse>("/api/v1/phantom-liquidity/config"),
  phantomCandidates: () =>
    request<PhantomCandidatesResponse>("/api/v1/phantom-liquidity/candidates"),
  phantomFetchPrice: (pair: string) =>
    request<PhantomPriceResponse>("/api/v1/phantom-liquidity/price-fetch", {
      method: "POST",
      body: JSON.stringify({ pair }),
    }),
  phantomPriceHistory: (pair: string, limit = 200) =>
    request<PhantomPriceHistoryResponse>(
      `/api/v1/phantom-liquidity/price-history?pair=${encodeURIComponent(pair)}&limit=${limit}`,
    ),
  phantomTickRange: (params: {
    pool_address?: string;
    pair?: string;
    fee_tier?: number;
    current_tick?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.pool_address) qs.set("pool_address", params.pool_address);
    if (params.pair) qs.set("pair", params.pair);
    if (params.fee_tier !== undefined) qs.set("fee_tier", String(params.fee_tier));
    if (params.current_tick !== undefined) qs.set("current_tick", String(params.current_tick));
    return request<PhantomTickRangeResponse>(`/api/v1/phantom-liquidity/tick-range?${qs}`);
  },
  phantomDeploy: (pool_address: string, capital_usd = 100) =>
    request<PhantomDeployResponse>("/api/v1/phantom-liquidity/deploy", {
      method: "POST",
      body: JSON.stringify({ pool_address, capital_usd }),
    }),
  phantomWithdraw: (pool_address: string) =>
    request<PhantomWithdrawResponse>("/api/v1/phantom-liquidity/withdraw", {
      method: "POST",
      body: JSON.stringify({ pool_address }),
    }),
  phantomDeFiLlamaPools: (params?: {
    chain?: string;
    protocol?: string;
    min_tvl_usd?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.chain) qs.set("chain", params.chain);
    if (params?.protocol) qs.set("protocol", params.protocol);
    if (params?.min_tvl_usd !== undefined) qs.set("min_tvl_usd", String(params.min_tvl_usd));
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return request<PhantomDeFiLlamaResponse>(`/api/v1/phantom-liquidity/defillama-pools${query}`);
  },

  // Simula v2 — Self-Evolution + Inspector
  simulaStatus: () => request<SimulaStatusResponse>("/api/v1/simula/status"),
  simulaAnalytics: () => request<SimulaAnalyticsResponse>("/api/v1/simula/analytics"),
  simulaActiveProposals: () => request<SimulaActiveProposalsResponse>("/api/v1/simula/proposals"),
  simulaEvolutionHistory: (limit = 50) =>
    request<SimulaEvolutionHistoryResponse>(`/api/v1/simula/history?limit=${limit}`),
  simulaVersionDetail: () => request<SimulaVersionDetailResponse>("/api/v1/simula/version"),
  simulaInspectorStats: () => request<InspectorStatsResponse>("/api/v1/simula/inspector"),
  simulaInspectorHunts: () => request<InspectorHuntsResponse>("/api/v1/simula/inspector/hunts"),
  simulaApproveGoverned: (proposalId: string, governanceRecordId: string) =>
    request<SimulaApproveResponse>("/api/v1/simula/approve", {
      method: "POST",
      body: JSON.stringify({ proposal_id: proposalId, governance_record_id: governanceRecordId }),
    }),
  simulaHealth: () => request<SimulaHealthResponse>("/api/v1/simula/health"),
  simulaMetrics: () => request<SimulaMetricsResponse>("/api/v1/simula/metrics"),
  simulaRepairMemory: () =>
    request<SimulaRepairMemoryResponse>("/api/v1/simula/repair-memory"),

  // Debug — fires a 404 to a non-existent route (raw fetch, ignores response)
  debugTrigger404: () =>
    fetch(`${BASE_URL}/api/v1/__debug__/nonexistent-route`, {
      headers: { "Content-Type": "application/json" },
    }).then((r) => ({ status: r.status, ok: r.ok })),

  // Fovea — Prediction Error as Attention
  foveaHealth: () => request<FoveaHealthResponse>("/api/v1/fovea/health"),
  foveaMetrics: () => request<FoveaMetricsResponse>("/api/v1/fovea/metrics"),
  foveaErrors: (limit = 20) =>
    request<FoveaErrorsResponse>(`/api/v1/fovea/errors?limit=${limit}`),
  foveaHabituationMap: () => request<FoveaHabituationMapResponse>("/api/v1/fovea/habituation"),
  foveaWeightHistory: () => request<FoveaWeightHistoryResponse>("/api/v1/fovea/weights/history"),

  // Logos — Universal Compression Engine
  logosHealth: () => request<LogosHealthResponse>("/api/v1/logos/health"),
  logosMetrics: () => request<LogosMetricsResponse>("/api/v1/logos/metrics"),
  logosBudget: () => request<LogosBudgetResponse>("/api/v1/logos/budget"),
  logosSchwarzschild: () => request<LogosSchwarzchildResponse>("/api/v1/logos/schwarzschild"),
  logosAnchors: (limit = 20) =>
    request<LogosAnchorsResponse>(`/api/v1/logos/anchors?limit=${limit}`),
  logosCompressionHistory: (limit = 20) =>
    request<LogosCompressionHistoryResponse>(`/api/v1/logos/compression/history?limit=${limit}`),

  // Skia — Shadow Infrastructure / Disaster Recovery
  skiaHealth: () => request<SkiaHealthResponse>("/api/v1/skia/health"),
  skiaSnapshot: () => request<SkiaSnapshotManifest>("/api/v1/skia/snapshot"),

  skiaSnapshotHistory: (limit = 20) =>
    request<SkiaCIDHistoryResponse>(`/api/v1/skia/snapshot/history?limit=${limit}`),
  skiaPins: (limit = 20) =>
    request<SkiaPinListResponse>(`/api/v1/skia/pins?limit=${limit}`),
  skiaTriggerSnapshot: () =>
    request<SkiaSnapshotTriggerResponse>("/api/v1/skia/snapshot/trigger", {
      method: "POST",
    }),
  skiaHeartbeat: () => request<SkiaHeartbeatStateResponse>("/api/v1/skia/heartbeat"),
  skiaConfig: () => request<SkiaConfigResponse>("/api/v1/skia/config"),

  // Telos — Drive Topology / Effective Intelligence
  telosHealth: () => request<TelosHealthResponse>("/api/v1/telos/health"),
  telosEffectiveI: () => request<TelosEffectiveIResponse>("/api/v1/telos/effective-i"),
  telosCare: () => request<TelosCareReportResponse>("/api/v1/telos/care"),
  telosCoherence: () => request<TelosCoherenceReportResponse>("/api/v1/telos/coherence"),
  telosGrowth: () => request<TelosGrowthReportResponse>("/api/v1/telos/growth"),
  telosHonesty: () => request<TelosHonestyReportResponse>("/api/v1/telos/honesty"),
  telosAlignmentHistory: (limit = 50) =>
    request<TelosAlignmentHistoryResponse>(`/api/v1/telos/alignment/history?limit=${limit}`),
  telosConstitutionalAudit: () =>
    request<TelosConstitutionalAuditResponse>("/api/v1/telos/constitutional/audit"),

  // Nexus (Epistemic Triangulation)
  nexusHealth: () => request<NexusHealthResponse>("/api/v1/nexus/health"),
  nexusStats: () => request<NexusStatsResponse>("/api/v1/nexus/stats"),
  nexusFragments: (params?: { min_confidence?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.min_confidence !== undefined) qs.set("min_confidence", String(params.min_confidence));
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return request<NexusFragmentsResponse>(`/api/v1/nexus/fragments${q ? `?${q}` : ""}`);
  },
  nexusFragment: (fragmentId: string) =>
    request<NexusFragment>(`/api/v1/nexus/fragments/${encodeURIComponent(fragmentId)}`),
  nexusConvergences: (limit = 50) =>
    request<NexusConvergencesResponse>(`/api/v1/nexus/convergences?limit=${limit}`),
  nexusDivergences: () => request<NexusDivergenceMapResponse>("/api/v1/nexus/divergences"),
  nexusDivergenceProfile: () => request<NexusDivergenceProfileResponse>("/api/v1/nexus/divergence/profile"),
  nexusSpeciation: () => request<NexusSpeciationResponse>("/api/v1/nexus/speciation"),
  nexusGroundTruth: () => request<NexusGroundTruthResponse>("/api/v1/nexus/ground-truth"),
  nexusEvaluatePromotions: () =>
    request<NexusPromotionDecisionsResponse>("/api/v1/nexus/promotions/evaluate", {
      method: "POST",
    }),
  nexusShareFragment: (fragmentId: string) =>
    request<{ shared: boolean; reason: string }>(`/api/v1/nexus/fragments/${encodeURIComponent(fragmentId)}/share`, {
      method: "POST",
    }),

  // Kairos (Causal Invariant Mining)
  kairosHealth: () => request<KairosHealthResponse>("/api/v1/kairos/health"),
  kairosInvariants: (params?: { tier?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.tier != null) q.set("tier", String(params.tier));
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<KairosInvariantsResponse>(`/api/v1/kairos/invariants${qs ? `?${qs}` : ""}`);
  },
  kairosInvariantDetail: (invariantId: string) =>
    request<KairosInvariant>(`/api/v1/kairos/invariants/${encodeURIComponent(invariantId)}`),
  kairosLedger: () => request<KairosLedgerResponse>("/api/v1/kairos/ledger"),
  kairosCandidates: (limit = 20) =>
    request<KairosCandidatesResponse>(`/api/v1/kairos/pipeline/candidates?limit=${limit}`),
  kairosDirections: (limit = 20) =>
    request<KairosDirectionsResponse>(`/api/v1/kairos/pipeline/directions?limit=${limit}`),
  kairosConfounder: (limit = 20) =>
    request<KairosConfounderResponse>(`/api/v1/kairos/pipeline/confounders?limit=${limit}`),
  kairosTier3: (limit = 20) =>
    request<KairosTier3Response>(`/api/v1/kairos/tier3?limit=${limit}`),
  kairosCounterInvariants: () =>
    request<KairosCounterInvariantResponse>("/api/v1/kairos/counter-invariants"),
  kairosStepChanges: (limit = 20) =>
    request<KairosStepChangesResponse>(`/api/v1/kairos/step-changes?limit=${limit}`),
} as const;

// ─── Nexus Types ──────────────────────────────────────────────────

export type DivergenceClassification =
  | "same_kind"
  | "related_kind"
  | "distinct_kind"
  | "alien_kind";

export type EpistemicLevel = 0 | 1 | 2 | 3 | 4;

export const EPISTEMIC_LEVEL_LABELS: Record<EpistemicLevel, string> = {
  0: "Hypothesis",
  1: "Corroborated",
  2: "Triangulated",
  3: "Ground Truth Candidate",
  4: "Empirical Invariant",
};

export interface NexusFragment {
  fragment_id: string;
  source_instance_id: string;
  source_instance_divergence_score: number;
  domain_labels: string[];
  abstract_structure: Record<string, unknown>;
  observations_explained: number;
  description_length: number;
  compression_ratio: number;
  triangulation_confidence: number;
  independent_source_count: number;
  source_diversity_score: number;
  epistemic_level: EpistemicLevel;
  quality_score: number;
  created_at: string;
  last_confirmed_at: string;
  sleep_certified: boolean;
  is_shareable: boolean;
}

export interface NexusConvergence {
  fragment_a_id: string;
  fragment_b_id: string;
  convergence_score: number;
  source_a_instance_id: string;
  source_b_instance_id: string;
  source_diversity: number;
  triangulation_value: number;
  domains_are_independent: boolean;
  detected_at: string;
  matched_nodes: number;
  total_nodes_a: number;
  total_nodes_b: number;
}

export interface NexusDivergenceDimension {
  dimension: string;
  score: number;
  weight: number;
  weighted_score: number;
}

export interface NexusDivergenceScore {
  instance_a_id: string;
  instance_b_id: string;
  overall: number;
  classification: DivergenceClassification;
  domain_diversity: NexusDivergenceDimension;
  structural_diversity: NexusDivergenceDimension;
  attentional_diversity: NexusDivergenceDimension;
  hypothesis_diversity: NexusDivergenceDimension;
  temporal_divergence: NexusDivergenceDimension;
  measured_at: string;
}

export interface NexusSpeciationEvent {
  id: string;
  instance_a_id: string;
  instance_b_id: string;
  timestamp: string;
  divergence_score: number;
  shared_invariant_count: number;
  incompatible_schema_count: number;
  new_cognitive_kind_registered: boolean;
}

export interface NexusCognitiveKind {
  kind_id: string;
  member_instance_ids: string[];
  founding_speciation_event_id: string;
  established_at: string;
}

export interface NexusPromotionDecision {
  fragment_id: string;
  current_level: EpistemicLevel;
  proposed_level: EpistemicLevel | null;
  promoted: boolean;
  reason: string;
  independent_source_count: number;
  triangulation_confidence: number;
  source_diversity: number;
  survived_speciation_bridge: boolean;
  survived_adversarial_test: boolean;
  survived_hypothesis_competition: boolean;
  evaluated_at: string;
}

export interface NexusHealthResponse {
  initialized: boolean;
  instance_id: string;
  triangulation_weight: number;
  local_fragment_count: number;
  remote_fragment_count: number;
  convergence_count: number;
  speciation_event_count: number;
  empirical_invariant_count: number;
}

export interface NexusStatsResponse {
  initialized: boolean;
  instance_id: string;
  triangulation_weight: number;
  local_fragment_count: number;
  remote_fragment_count: number;
  convergence_count: number;
  speciation_event_count: number;
  empirical_invariant_count: number;
  ground_truth_candidate_count: number;
  epistemic_level_distribution: Record<string, number>;
  high_confidence_fragment_count: number;
  cognitive_kind_count: number;
}

export interface NexusFragmentsResponse {
  fragments: NexusFragment[];
  total: number;
}

export interface NexusConvergencesResponse {
  convergences: NexusConvergence[];
  total: number;
}

export interface NexusDivergenceMapResponse {
  divergences: NexusDivergenceScore[];
  instance_id: string;
  triangulation_weight: number;
}

export interface NexusDivergenceProfileResponse {
  instance_id: string;
  triangulation_weight: number;
  pressure_active: boolean;
  pressure_magnitude: number;
  frontier_domains: string[];
  saturated_domains: string[];
  recommended_direction: string;
  dimension_breakdown: {
    domain: number;
    structural: number;
    attentional: number;
    hypothesis: number;
    temporal: number;
  };
  peer_scores: Record<string, number>;
}

export interface NexusSpeciationResponse {
  speciation_events: NexusSpeciationEvent[];
  cognitive_kinds: NexusCognitiveKind[];
  active_bridge_pairs: [string, string][];
  total_events: number;
}

export interface NexusGroundTruthResponse {
  ground_truth_candidates: NexusFragment[];
  empirical_invariants: NexusFragment[];
  pipeline_stats: {
    level_0_count: number;
    level_1_count: number;
    level_2_count: number;
    level_3_count: number;
    level_4_count: number;
  };
}

export interface NexusPromotionDecisionsResponse {
  decisions: NexusPromotionDecision[];
  promoted_count: number;
  evaluated_count: number;
}

// ─── Kairos Response Types ────────────────────────────────────────

export interface KairosHealthResponse {
  status: string;
  pipeline_runs: number;
  fovea_events_received: number;
  evo_events_received: number;
  invariants_created: number;
  tier3_discoveries: number;
  counter_invariants_found: number;
  step_changes: number;
  hierarchy: {
    tier1_count: number;
    tier2_count: number;
    tier3_count: number;
    total_count: number;
  };
  intelligence_ledger: {
    total_invariants_tracked: number;
    total_observations_covered: number;
    total_description_savings: number;
    current_intelligence_ratio: number;
    top_contributors: string[];
  };
  stages: {
    correlation_miner: {
      total_pairs_evaluated: number;
      total_candidates_found: number;
    };
    direction_tester: {
      total_tests_run: number;
      total_accepted: number;
    };
    confounder_analyzer: {
      total_analyses_run: number;
      total_confounders_found: number;
    };
    context_tester: {
      total_tests_run: number;
    };
    distiller: {
      total_distillations_run: number;
      total_tautologies_rejected: number;
      total_domains_mapped: number;
    };
    counter_detector: {
      total_scans_run: number;
      total_violations_found: number;
      total_refinements_made: number;
    };
  };
}

export interface KairosApplicableDomain {
  domain: string;
  substrate: string;
  hold_rate: number;
  observation_count: number;
}

export interface KairosScopeCondition {
  condition: string;
  holds_when: boolean;
  distinguishing_feature: string;
  context_ids: string[];
}

export interface KairosInvariant {
  id: string;
  tier: 1 | 2 | 3;
  abstract_form: string;
  concrete_instances: string[];
  applicable_domains: KairosApplicableDomain[];
  invariance_hold_rate: number;
  scope_conditions: KairosScopeCondition[];
  intelligence_ratio_contribution: number;
  description_length_bits: number;
  distilled: boolean;
  variable_roles: Record<string, string>;
  is_tautological: boolean;
  is_minimal: boolean;
  untested_domains: string[];
  violation_count: number;
  refined_scope: string;
  domain_count: number;
  substrate_count: number;
  created_at: string;
  updated_at?: string;
}

export interface KairosInvariantsResponse {
  invariants: KairosInvariant[];
  total: number;
  tier1_count: number;
  tier2_count: number;
  tier3_count: number;
}

export interface KairosIntelligenceContribution {
  invariant_id: string;
  observations_covered: number;
  description_savings: number;
  invariant_length: number;
  intelligence_ratio_contribution: number;
  intelligence_ratio_without: number;
  computed_at: string;
}

export interface KairosLedgerResponse {
  contributions: KairosIntelligenceContribution[];
  total_intelligence_ratio: number;
  total_observations_covered: number;
  total_description_savings: number;
}

export interface KairosCorrelationCandidate {
  id: string;
  variable_a: string;
  variable_b: string;
  mean_correlation: number;
  cross_context_variance: number;
  context_count: number;
  discovered_at: string;
}

export interface KairosCandidatesResponse {
  candidates: KairosCorrelationCandidate[];
  total_pairs_evaluated: number;
  total_candidates_found: number;
}

export interface KairosDirectionResult {
  id: string;
  cause: string;
  effect: string;
  direction: string;
  confidence: number;
  accepted: boolean;
  methods_agreed: number;
  tested_at: string;
}

export interface KairosDirectionsResponse {
  results: KairosDirectionResult[];
  total_tests_run: number;
  total_accepted: number;
}

export interface KairosConfounderResult {
  id: string;
  original_cause: string;
  original_effect: string;
  confounders: string[];
  adjusted_correlation: number;
  mdl_improvement: number;
  is_confounded: boolean;
  analyzed_at: string;
}

export interface KairosConfounderResponse {
  results: KairosConfounderResult[];
  total_analyses_run: number;
  total_confounders_found: number;
}

export interface KairosTier3Discovery {
  invariant_id: string;
  abstract_form: string;
  domain_count: number;
  substrate_count: number;
  hold_rate: number;
  intelligence_ratio_contribution: number;
  applicable_domains: string[];
  untested_domains: string[];
  discovered_at: string;
}

export interface KairosTier3Response {
  discoveries: KairosTier3Discovery[];
  total: number;
}

export interface KairosViolation {
  id: string;
  invariant_id: string;
  violation_context: string;
  expected_direction: string;
  observed_value: number;
  detected_at: string;
}

export interface KairosRefinedScope {
  invariant_id: string;
  original_hold_rate: number;
  refined_hold_rate: number;
  boundary_condition: string;
  excluded_feature: string;
  excluded_threshold: number;
  contexts_excluded: number;
}

export interface KairosCounterInvariantResponse {
  violations: KairosViolation[];
  refined_scopes: KairosRefinedScope[];
  total_violations: number;
  total_refinements: number;
}

export interface KairosStepChange {
  invariant_id: string;
  old_ratio: number;
  new_ratio: number;
  delta: number;
  cause: string;
  detected_at: string;
}

export interface KairosStepChangesResponse {
  step_changes: KairosStepChange[];
  total: number;
}
