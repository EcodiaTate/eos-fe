// ─── Polling Intervals (ms) ───────────────────────────────────────────────────
//
// All useApi intervalMs values are defined here so they can be tuned in one
// place and remain self-documenting at the call site.

// ── Soma ──────────────────────────────────────────────────────────────────────

/** Fast somatic signal poll — urgency, trajectory, dominant error. */
export const SOMA_SIGNAL_POLL_MS = 2000;

/** Somatic state poll — 9D dimensions, setpoints, errors. */
export const SOMA_STATE_POLL_MS = 3000;

/** Emotions poll — valence/arousal, felt affect vector. */
export const SOMA_EMOTIONS_POLL_MS = 2500;

/** Phase-space poll — attractor, trajectory, bifurcation distance. */
export const SOMA_PHASE_POLL_MS = 5000;

/** Financial/metabolic poll — TTD days, regime. */
export const SOMA_FINANCIAL_POLL_MS = 10000;

/** Developmental stage poll — slow-moving, 15 s is fine. */
export const SOMA_DEVELOPMENTAL_POLL_MS = 15000;

// ── Oneiros ───────────────────────────────────────────────────────────────────

/** Live sleep-status poll — current stage, trigger. */
export const ONEIROS_STATUS_POLL_MS = 3000;

/** Historical sleep-cycles poll — recent cycle list, refreshes slowly. */
export const ONEIROS_CYCLES_POLL_MS = 15000;

// ── Thymos ────────────────────────────────────────────────────────────────────

/** Immune vitals fast poll — overall health score. */
export const THYMOS_VITALS_POLL_MS = 2000;

/** Incident timeline, repair history, antibody library, causal-graph nodes. */
export const THYMOS_STANDARD_POLL_MS = 3000;

/** Homeostasis monitor + causal-graph edges — slightly slower than incidents. */
export const THYMOS_HOMEOSTASIS_POLL_MS = 5000;

/** Prophylactic panel — early-warning signals, moderate cadence. */
export const THYMOS_PROPHYLACTIC_POLL_MS = 10000;

/** Thymos config poll — threshold settings, changes rarely. */
export const THYMOS_CONFIG_POLL_MS = 30000;

/** ThymosConfig status sub-poll — slightly more frequent than full config. */
export const THYMOS_CONFIG_STATUS_POLL_MS = 5000;

// ── Thymos history cap ────────────────────────────────────────────────────────

/** Maximum live events kept in the IncidentStream rolling buffer. */
export const THYMOS_MAX_STREAM_EVENTS = 50;
