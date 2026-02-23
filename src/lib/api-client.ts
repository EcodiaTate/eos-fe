/**
 * EcodiaOS — Typed API Client
 *
 * Wraps all backend REST endpoints with typed request/response models.
 * Uses native fetch (no axios). Reads NEXT_PUBLIC_API_URL.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://ecodiaos-core-929871567697.australia-southeast1.run.app";

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
  perceiveEvent: (text: string, channel = "text_chat") =>
    request<Record<string, unknown>>("/api/v1/perceive/event", {
      method: "POST",
      body: JSON.stringify({ text, channel }),
    }),

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
  simulaHistory: () => request<SimulaHistoryResponse>("/api/v1/simula/history"),
  simulaProposals: () =>
    request<SimulaProposalsResponse>("/api/v1/simula/proposals"),

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

  // Federation
  federationIdentity: () =>
    request<FederationIdentityResponse>("/api/v1/federation/identity"),
  federationLinks: () =>
    request<FederationLinksResponse>("/api/v1/federation/links"),
  federationStats: () =>
    request<Record<string, unknown>>("/api/v1/federation/stats"),
} as const;
