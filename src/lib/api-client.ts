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
  dominance: number;
  curiosity: number;
  care_activation: number;
  coherence_stress: number;
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
  storm_activations: number;
  prophylactic_scans: number;
  prophylactic_warnings: number;
  budget: Record<string, unknown>;
}

export interface IncidentResponse {
  id: string;
  timestamp: string;
  source_system: string;
  incident_class: string;
  severity: string;
  error_type: string;
  error_message: string;
  repair_status: string;
  repair_tier: string | null;
  repair_successful: boolean | null;
  resolution_time_ms: number | null;
  root_cause: string | null;
  antibody_id: string | null;
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
}

export interface HomeostasisResponse {
  metrics_in_range: number;
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

// ─── Thread (Narrative Identity) Types ───────────────────────────

export interface IdentitySchema {
  id: string;
  statement: string;
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
  status: "active" | "tested" | "strained" | "broken" | "evolved";
  tests_faced: number;
  tests_held: number;
  fidelity: number;
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
  strained: string[];
}

export interface ThreadCoherenceResponse {
  fingerprint_count: number;
  recent_fingerprints: {
    id: string;
    epoch: number;
    window_start: number;
    window_end: number;
  }[];
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

// ─── API Client ──────────────────────────────────────────────────

export const api = {
  // Health & Admin
  health: () => request<HealthResponse>("/health"),
  instance: () => request<InstanceResponse>("/api/v1/admin/instance"),
  memoryStats: () => request<MemoryStatsResponse>("/api/v1/admin/memory/stats"),
  cycleTelemetry: () =>
    request<CycleTelemetryResponse>("/api/v1/admin/synapse/cycle"),

  // Perception
  affect: () => request<AffectResponse>("/api/v1/atune/affect"),
  workspace: () => request<WorkspaceResponse>("/api/v1/atune/workspace"),
  workspaceDetail: () =>
    request<WorkspaceDetailResponse>("/api/v1/atune/workspace-detail"),
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

  // Axon outcomes
  axonOutcomes: (limit = 20) =>
    request<AxonOutcomesResponse>(`/api/v1/axon/outcomes?limit=${limit}`),

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

  // Nova
  goals: () => request<GoalsResponse>("/api/v1/nova/goals"),
  beliefs: () => request<BeliefsResponse>("/api/v1/nova/beliefs"),

  // Voxis
  personality: () => request<PersonalityResponse>("/api/v1/voxis/personality"),

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

  // Evo
  evoStats: () => request<EvoStatsResponse>("/api/v1/evo/stats"),
  evoParameters: () => request<EvoParametersResponse>("/api/v1/evo/parameters"),
  triggerConsolidation: () =>
    request<ConsolidationResponse>("/api/v1/evo/consolidate", {
      method: "POST",
    }),

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

  // Oneiros (Dream Engine)
  oneirosHealth: () => request<OneirosHealthResponse>("/api/v1/oneiros/health"),
  oneirosStats: () => request<OneirosStatsResponse>("/api/v1/oneiros/stats"),
  oneirosRecentDreams: (limit = 50) =>
    request<DreamResponse[]>(`/api/v1/oneiros/dreams?limit=${limit}`),
  oneirosInsights: (limit = 50) =>
    request<DreamInsightResponse[]>(`/api/v1/oneiros/insights?limit=${limit}`),
  oneirosSleepCycles: (limit = 20) =>
    request<SleepCycleResponse[]>(`/api/v1/oneiros/sleep-cycles?limit=${limit}`),

  // Federation
  federationIdentity: () =>
    request<FederationIdentityResponse>("/api/v1/federation/identity"),
  federationLinks: () =>
    request<FederationLinksResponse>("/api/v1/federation/links"),
  federationStats: () =>
    request<Record<string, unknown>>("/api/v1/federation/stats"),

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
  threadFormCommitment: (statement: string, source = "explicit_declaration") =>
    request<FormCommitmentResponse>("/api/v1/thread/commitments", {
      method: "POST",
      body: JSON.stringify({ statement, source }),
    }),
  threadPastSelf: (reference = "beginning") =>
    request<ThreadPastSelfResponse>(`/api/v1/thread/past-self?reference=${encodeURIComponent(reference)}`),

  // LLM Cost & Optimization
  llmMetrics: () => request<LLMMetricsResponse>("/api/v1/admin/llm/metrics"),
  llmSummary: () => request<LLMSummaryResponse>("/api/v1/admin/llm/summary"),

  // Oikos (Economic Engine)
  oikosStatus: () => request<OikosStatusResponse>("/api/v1/oikos/status"),
  oikosOrgans: () => request<OikosOrgansResponse>("/api/v1/oikos/organs"),
  oikosAssets: () => request<OikosAssetsResponse>("/api/v1/oikos/assets"),
  triggerGenesisSpark: () =>
    request<GenesisSparkResponse>("/api/v1/oikos/genesis-spark", {
      method: "POST",
    }),
} as const;
