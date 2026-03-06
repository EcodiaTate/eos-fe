"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useAxonStream } from "@/hooks/use-axon-stream";
import {
  api,
  type AxonStatsResponse,
  type AxonBudgetResponse,
  type AxonExecutorsResponse,
  type AxonSafetyResponse,
  type AxonShieldResponse,
  type AxonFastPathResponse,
  type AxonOutcomesResponse,
  type AxonAuditResponse,
  type AxonMEVCompetitionResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tab = "overview" | "executors" | "safety" | "shield" | "history" | "audit";

/* ─── Metric cell ───────────────────────────────────────────────────────── */
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: "var(--bg)",
        borderRadius: 7,
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 9,
          color: "var(--ink-strong)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = "var(--lime)",
  label,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 10,
              color: "var(--ink-soft)",
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 10,
              color: "var(--ink-mid)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}/{max}
          </span>
        </div>
      )}
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    closed: "var(--lime)",
    open: "#dc4040",
    half_open: "var(--gold-bright)",
    success: "var(--lime)",
    failure: "#dc4040",
    partial: "var(--gold-bright)",
  };
  const color = colors[status] ?? "var(--ink-muted)";
  return (
    <div
      style={{
        display: "inline-flex",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function ExecutionStatusBadge({ status, success, partial }: { status: string; success: boolean; partial: boolean }) {
  if (success && !partial) return <Badge variant="success">{status}</Badge>;
  if (partial) return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="danger">{status}</Badge>;
}

/** Pulsing dot indicating a live SSE connection */
function LiveDot({ connected }: { connected: boolean }) {
  if (!connected) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        width: 6,
        height: 6,
        color: "var(--lime)",
      }}
      className="status-dot"
    >
      <div className="ping" style={{ animationDuration: "2.5s" }} />
      <div className="core" style={{ width: 5, height: 5 }} />
    </div>
  );
}

/** Verdict badge for audit records */
function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === "approved") return <Badge variant="success">approved</Badge>;
  if (verdict === "modified") return <Badge variant="warning">modified</Badge>;
  return <Badge variant="danger">blocked</Badge>;
}

/** Result badge for audit records */
function ResultBadge({ result }: { result: string }) {
  if (result === "success") return <Badge variant="success">success</Badge>;
  if (result === "partial") return <Badge variant="warning">partial</Badge>;
  if (result === "rolled_back") return <Badge variant="warning">rolled back</Badge>;
  return <Badge variant="danger">{result || "failure"}</Badge>;
}

/** Competition level badge */
function CompetitionBadge({ level }: { level: string }) {
  if (level === "LOW") return <Badge variant="success">LOW</Badge>;
  if (level === "MEDIUM") return <Badge variant="warning">MEDIUM</Badge>;
  if (level === "HIGH") return <Badge variant="danger">HIGH</Badge>;
  return <Badge variant="muted">UNKNOWN</Badge>;
}

export default function AxonPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [resettingCb, setResettingCb] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const stats = useApi<AxonStatsResponse>(api.axonStats, { intervalMs: 5000 });
  const budget = useApi<AxonBudgetResponse>(api.axonBudget, { intervalMs: 3000 });
  const executors = useApi<AxonExecutorsResponse>(api.axonExecutors, { intervalMs: 30000 });
  const safety = useApi<AxonSafetyResponse>(api.axonSafety, { intervalMs: 5000 });
  const shield = useApi<AxonShieldResponse>(api.axonShield, { intervalMs: 5000 });
  const fastPath = useApi<AxonFastPathResponse>(api.axonFastPath, { intervalMs: 5000 });
  // Fallback outcomes for overview (used when SSE not yet connected)
  const outcomes = useApi<AxonOutcomesResponse>(() => api.axonOutcomes(50), { intervalMs: 5000 });
  const audit = useApi<AxonAuditResponse>(() => api.axonAudit(50), { intervalMs: 15000 });
  const mevCompetition = useApi<AxonMEVCompetitionResponse>(api.axonMEVCompetition, { intervalMs: 3000 });

  // SSE stream for History tab
  const { outcomes: streamOutcomes, status: streamStatus } = useAxonStream(5000);
  const isLive = streamStatus === "connected";

  async function handleResetCb(actionType: string) {
    setResettingCb(actionType);
    setResetMsg(null);
    try {
      await api.axonResetCircuitBreaker(actionType);
      setResetMsg(`Reset ${actionType}`);
      safety.refetch();
    } catch {
      setResetMsg(`Failed to reset ${actionType}`);
    } finally {
      setResettingCb(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "executors", label: "Executors" },
    { id: "safety", label: "Safety" },
    { id: "shield", label: "Shield & MEV" },
    { id: "history", label: "History" },
    { id: "audit", label: "Audit" },
  ];

  const successRate = stats.data?.success_rate ?? 0;
  const budgetUtil = budget.data?.utilisation ?? 0;

  return (
    <div>
      <div className="float-up">
        <PageHeader
          title="Axon"
          description="Action executor — reflex arc for Nova→Equor→real-world effects"
        />

        {/* Decorative pulse line */}
        <div
          style={{
            height: 1.5,
            borderRadius: 1,
            background: "linear-gradient(90deg, var(--lime-bright) 0%, var(--gold-bright) 40%, var(--lime) 70%, transparent 100%)",
            opacity: 0.4,
            marginTop: 12,
            marginBottom: 24,
            animation: "photon-drift 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 8,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              borderRadius: "4px 4px 0 0",
              border: "none",
              background: "transparent",
              color: activeTab === t.id ? "var(--ink)" : "var(--ink-muted)",
              borderBottom: activeTab === t.id ? "2px solid var(--lime)" : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontWeight: activeTab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
            gridAutoRows: "minmax(240px, auto)",
          }}
        >
          {/* Execution Stats */}
          <Card glow className="float-up float-up-1" style={{ gridColumn: "span 4" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--lime)", fontSize: 14 }}>⚡</span>
                Execution Stats
              </CardTitle>
              {stats.data && (
                <Badge variant={stats.data.initialized ? "success" : "danger"}>
                  {stats.data.initialized ? "online" : "offline"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {stats.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        border: "2px solid var(--lime)",
                        background: "var(--bg)",
                        opacity: 0.8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--lime)",
                        }}
                      >
                        {(successRate * 100).toFixed(0)}<span style={{ fontSize: 11 }}>%</span>
                      </span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--ink-strong)", letterSpacing: "0.06em" }}>
                        Success Rate
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-soft)" }}>
                        {stats.data.successful_executions} of {stats.data.total_executions}
                      </div>
                    </div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${successRate * 100}%`,
                        background: successRate > 0.8 ? "var(--lime)" : successRate > 0.5 ? "var(--gold-bright)" : "#dc4040",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric label="Total" value={stats.data.total_executions} />
                    <Metric label="Failed" value={stats.data.failed_executions} />
                    <Metric label="Executors" value={stats.data.executor_count} />
                    <Metric label="Queued" value={stats.data.recent_outcomes_count} />
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Budget */}
          <Card className="float-up float-up-2" style={{ gridColumn: "span 4" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>◎</span>
                Cycle Budget
              </CardTitle>
              {budget.data && (
                <Badge
                  variant={
                    budgetUtil < 0.7 ? "success" : budgetUtil < 0.9 ? "warning" : "danger"
                  }
                >
                  {(budgetUtil * 100).toFixed(0)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {budget.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ProgressBar
                    value={budget.data.actions_used}
                    max={budget.data.actions_max}
                    label="Actions"
                    color={budget.data.actions_used >= budget.data.actions_max ? "#dc4040" : "var(--lime)"}
                  />
                  <ProgressBar
                    value={budget.data.concurrent_used}
                    max={budget.data.concurrent_max}
                    label="Concurrent"
                    color={budget.data.concurrent_used >= budget.data.concurrent_max ? "#dc4040" : "var(--lime-dim)"}
                  />
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric
                      label="Cycle age"
                      value={`${(budget.data.cycle_age_ms / 1000).toFixed(1)}s`}
                    />
                    <Metric
                      label="Timeout"
                      value={`${((budget.data.budget_config.total_timeout_per_cycle_ms ?? 30000) / 1000).toFixed(0)}s`}
                    />
                    <Metric
                      label="API/min"
                      value={budget.data.budget_config.max_api_calls_per_minute ?? 30}
                    />
                    <Metric
                      label="Notifs/hr"
                      value={budget.data.budget_config.max_notifications_per_hour ?? 10}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Fast-Path */}
          <Card className="float-up float-up-3" style={{ gridColumn: "span 4" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "#a78bfa", fontSize: 14 }}>◑</span>
                Fast-Path
              </CardTitle>
              {fastPath.data && (
                <Badge variant={fastPath.data.active_templates > 0 ? "info" : "muted"}>
                  {fastPath.data.active_templates} templates
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {fastPath.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric label="Executions" value={fastPath.data.total_executions} />
                    <Metric
                      label="Success"
                      value={fastPath.data.total_executions > 0
                        ? `${((fastPath.data.successful_executions / fastPath.data.total_executions) * 100).toFixed(0)}%`
                        : "—"}
                    />
                    <Metric
                      label="Avg latency"
                      value={fastPath.data.mean_latency_ms > 0
                        ? `${fastPath.data.mean_latency_ms.toFixed(0)}ms`
                        : "—"}
                    />
                    <Metric
                      label="Capital"
                      value={fastPath.data.capital_deployed > 0
                        ? `$${fastPath.data.capital_deployed.toFixed(2)}`
                        : "$0"}
                    />
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    Pre-approved patterns skipping Nova+Equor pipeline. Target &lt;200ms.
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Shield Summary */}
          <Card className="float-up float-up-4" style={{ gridColumn: "span 4" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--lime)", fontSize: 14 }}>◈</span>
                TX Shield
              </CardTitle>
              {shield.data && (
                <Badge
                  variant={
                    shield.data.total_rejected === 0 ? "success" : "warning"
                  }
                >
                  {shield.data.total_rejected} rejected
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {shield.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric label="Evaluated" value={shield.data.total_evaluated} />
                    <Metric
                      label="Reject rate"
                      value={`${(shield.data.rejection_rate * 100).toFixed(1)}%`}
                    />
                    <Metric label="MEV shielded" value={shield.data.mev_protected} />
                    <Metric
                      label="MEV saved"
                      value={shield.data.mev_saved_usd > 0
                        ? `$${shield.data.mev_saved_usd.toFixed(2)}`
                        : "$0"}
                    />
                  </div>
                  {shield.data.last_mev_risk_score !== null && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                        Last MEV Risk
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(shield.data.last_mev_risk_score ?? 0) * 100}%`,
                            background:
                              (shield.data.last_mev_risk_score ?? 0) > 0.7
                                ? "#dc4040"
                                : (shield.data.last_mev_risk_score ?? 0) > 0.4
                                ? "var(--gold-bright)"
                                : "var(--lime)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      {shield.data.last_mev_strategy && (
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)", marginTop: 4 }}>
                          via {shield.data.last_mev_strategy.replace(/_/g, " ").toLowerCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Outcomes Mini */}
          <Card className="float-up float-up-5" style={{ gridColumn: "span 8" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>⚡</span>
                Recent Executions
              </CardTitle>
              {outcomes.data && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                  {outcomes.data.total} total
                </span>
              )}
            </CardHeader>
            <CardContent>
              {outcomes.data ? (
                outcomes.data.outcomes.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {outcomes.data.outcomes.slice(0, 6).map((o) => (
                      <div
                        key={o.execution_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 7,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <StatusDot
                          status={o.success ? "success" : o.partial ? "partial" : "failure"}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.steps.map((s) => s.action_type).join(" → ")}
                          </div>
                          {o.failure_reason && (
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "#dc4040", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>
                              {o.failure_reason}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                          {o.duration_ms}ms
                        </span>
                        <ExecutionStatusBadge
                          status={o.status}
                          success={o.success}
                          partial={o.partial}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 24, paddingBottom: 24, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    No executions yet. Axon is waiting for Nova intents.
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── EXECUTORS ── */}
      {activeTab === "executors" && (
        <div className="float-up float-up-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "#a78bfa", fontSize: 14 }}>◉</span>
                Executor Registry
              </CardTitle>
              {executors.data && (
                <Badge variant="info">{executors.data.total} registered</Badge>
              )}
            </CardHeader>
            <CardContent>
              {executors.data ? (
                executors.data.executors.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {executors.data.executors.map((ex) => (
                      <div
                        key={ex.action_type}
                        style={{
                          padding: "10px",
                          borderRadius: 7,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <code style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--lime)", fontWeight: 500 }}>
                              {ex.action_type}
                            </code>
                            <div style={{ display: "flex", gap: 4 }}>
                              {ex.reversible && (
                                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, padding: "3px 6px", borderRadius: 3, background: "rgba(168, 139, 250, 0.1)", color: "#a78bfa" }}>
                                  rollback
                                </span>
                              )}
                              {!ex.counts_toward_budget && (
                                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, padding: "3px 6px", borderRadius: 3, background: "var(--bg)", color: "var(--ink-muted)" }}>
                                  internal
                                </span>
                              )}
                              {!ex.emits_to_atune && (
                                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, padding: "3px 6px", borderRadius: 3, background: "var(--bg)", color: "var(--ink-muted)" }}>
                                  no-atune
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)" }}>
                              lvl {ex.required_autonomy}
                            </span>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                              {ex.max_duration_ms / 1000}s max
                            </span>
                          </div>
                        </div>
                        {ex.description && (
                          <div style={{ fontFamily: "var(--font-prose)", fontSize: 9, color: "var(--ink-soft)", marginTop: 6 }}>
                            {ex.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 24, paddingBottom: 24, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    No executors registered.
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SAFETY ── */}
      {activeTab === "safety" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {resetMsg && (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--lime)", border: "1px solid var(--lime)", background: "rgba(90, 200, 38, 0.08)", borderRadius: 7, padding: "8px 10px" }}>
              {resetMsg}
            </div>
          )}

          {/* Circuit Breakers */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>⚡</span>
                Circuit Breakers
              </CardTitle>
              {safety.data && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                  trip @ {safety.data.failure_threshold} failures · reset after {safety.data.recovery_timeout_s}s
                </span>
              )}
            </CardHeader>
            <CardContent>
              {safety.data ? (
                safety.data.circuit_breakers.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {safety.data.circuit_breakers.map((cb) => (
                      <div
                        key={cb.action_type}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 7,
                          border: "1px solid var(--border)",
                          background: cb.status === "open" ? "rgba(220, 64, 64, 0.08)" : cb.status === "half_open" ? "rgba(232, 168, 32, 0.08)" : "var(--bg)",
                        }}
                      >
                        <StatusDot status={cb.status} />
                        <code style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)", flex: 1 }}>
                          {cb.action_type}
                        </code>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)" }}>
                          {cb.consecutive_failures} fail
                        </span>
                        <Badge
                          variant={
                            cb.status === "closed"
                              ? "success"
                              : cb.status === "open"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {cb.status.replace("_", " ")}
                        </Badge>
                        {cb.status !== "closed" && (
                          <button
                            onClick={() => handleResetCb(cb.action_type)}
                            disabled={resettingCb === cb.action_type}
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 9,
                              padding: "4px 8px",
                              borderRadius: 3,
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "var(--ink-muted)",
                              cursor: resettingCb === cb.action_type ? "default" : "pointer",
                              opacity: resettingCb === cb.action_type ? 0.5 : 1,
                              transition: "all 0.2s ease",
                            }}
                          >
                            {resettingCb === cb.action_type ? "…" : "reset"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 16, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    No circuit breaker data. All executors clear.
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Rate Limiters */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "#a78bfa", fontSize: 14 }}>◑</span>
                Rate Limiters
              </CardTitle>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>sliding window per executor</span>
            </CardHeader>
            <CardContent>
              {safety.data ? (
                safety.data.rate_limiters.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {safety.data.rate_limiters.map((rl) => (
                      <div key={rl.action_type}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <code style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)" }}>
                            {rl.action_type}
                          </code>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {rl.current_count} / {rl.window_seconds}s
                          </span>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.min(rl.current_count * 3, 100)}%`,
                              background: rl.current_count > 25 ? "var(--gold-bright)" : "var(--lime)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 16, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    No active rate limit windows.
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SHIELD & MEV ── */}
      {activeTab === "shield" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
            gridAutoRows: "minmax(240px, auto)",
          }}
        >
          {/* Shield Overview */}
          <Card glow className="float-up float-up-6" style={{ gridColumn: "span 6" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--lime)", fontSize: 14 }}>◈</span>
                TransactionShield
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shield.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric label="Evaluated" value={shield.data.total_evaluated} />
                    <Metric label="Rejected" value={shield.data.total_rejected} />
                    <Metric
                      label="Rejection rate"
                      value={`${(shield.data.rejection_rate * 100).toFixed(1)}%`}
                    />
                    <Metric
                      label="Blacklisted"
                      value={shield.data.blacklisted_addresses}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                      Pass Rate
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(1 - shield.data.rejection_rate) * 100}%`,
                          background:
                            shield.data.rejection_rate < 0.05
                              ? "var(--lime)"
                              : shield.data.rejection_rate < 0.2
                              ? "var(--gold-bright)"
                              : "#dc4040",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    Checks: blacklist · slippage ≤50bps · gas ROI ≥2× · simulation · MEV analysis
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* MEV Protection */}
          <Card className="float-up float-up-7" style={{ gridColumn: "span 6" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>⚡</span>
                MEV Protection
              </CardTitle>
              {shield.data?.mev_protected !== undefined && (
                <Badge variant={shield.data.mev_protected > 0 ? "warning" : "success"}>
                  {shield.data.mev_protected} shielded
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {shield.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Metric label="MEV shielded" value={shield.data.mev_protected} />
                    <Metric
                      label="Value saved"
                      value={
                        shield.data.mev_saved_usd > 0
                          ? `$${shield.data.mev_saved_usd.toFixed(2)}`
                          : "$0"
                      }
                    />
                  </div>
                  {shield.data.last_mev_risk_score !== null && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Last MEV Analysis
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-soft)" }}>Risk score</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)", fontVariantNumeric: "tabular-nums" }}>
                            {((shield.data.last_mev_risk_score ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(shield.data.last_mev_risk_score ?? 0) * 100}%`,
                              background:
                                (shield.data.last_mev_risk_score ?? 0) > 0.7
                                  ? "#dc4040"
                                  : (shield.data.last_mev_risk_score ?? 0) > 0.4
                                  ? "var(--gold-bright)"
                                  : "var(--lime)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                      {shield.data.last_mev_strategy && (
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)" }}>
                          Strategy: <span style={{ color: "var(--ink-mid)" }}>{shield.data.last_mev_strategy.replace(/_/g, " ").toLowerCase()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    High risk (&gt;0.7) routed via Flashbots Protect. Cost cap: 5% of tx value.
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>

          {/* Block Competition */}
          <Card className="float-up float-up-8" style={{ gridColumn: "span 12" }}>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "#a78bfa", fontSize: 14 }}>◑</span>
                Block Competition
              </CardTitle>
              {mevCompetition.data && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CompetitionBadge level={mevCompetition.data.competition_level} />
                  {!mevCompetition.data.mev_enabled && (
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>MEV analyzer disabled</span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {mevCompetition.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    <Metric
                      label="Base fee"
                      value={
                        mevCompetition.data.base_fee_gwei > 0
                          ? `${mevCompetition.data.base_fee_gwei.toFixed(3)} gwei`
                          : "—"
                      }
                    />
                    <Metric
                      label="Priority fee"
                      value={
                        mevCompetition.data.priority_fee_gwei > 0
                          ? `${mevCompetition.data.priority_fee_gwei.toFixed(3)} gwei`
                          : "—"
                      }
                    />
                    <Metric
                      label="Pending txs"
                      value={
                        mevCompetition.data.pending_tx_count > 0
                          ? mevCompetition.data.pending_tx_count.toLocaleString()
                          : "—"
                      }
                    />
                    <Metric
                      label="Competition"
                      value={`${(mevCompetition.data.competition_score * 100).toFixed(0)}%`}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Pressure
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)", fontVariantNumeric: "tabular-nums" }}>
                        {(mevCompetition.data.competition_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${mevCompetition.data.competition_score * 100}%`,
                          background:
                            mevCompetition.data.competition_score < 0.3
                              ? "var(--lime)"
                              : mevCompetition.data.competition_score < 0.7
                              ? "var(--gold-bright)"
                              : "#dc4040",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                  {mevCompetition.data.timestamp_ms > 0 && (
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)" }}>
                      Last updated {new Date(mevCompetition.data.timestamp_ms).toLocaleTimeString()} · polls every 3s (Base L2 block time ~2s)
                    </div>
                  )}
                  {!mevCompetition.data.mev_enabled && (
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                      MEV analyzer not wired. Configure RPC_URL and mev.enabled=true to enable.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── HISTORY (SSE-powered) ── */}
      {activeTab === "history" && (
        <div className="float-up float-up-9">
          <Card>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>▣</span>
                Execution History
              </CardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LiveDot connected={isLive} />
                {isLive ? (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--lime)" }}>live</span>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    {streamStatus === "connecting" ? "connecting…" : "polling"}
                  </span>
                )}
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                  {streamOutcomes.length} records
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {streamOutcomes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {streamOutcomes.map((o) => (
                    <div
                      key={o.execution_id || o.intent_id}
                      style={{
                        padding: "10px",
                        borderRadius: 7,
                        border: "1px solid var(--border)",
                        background: o.success && !o.partial ? "rgba(90, 200, 38, 0.08)" : o.partial ? "rgba(232, 168, 32, 0.08)" : "rgba(220, 64, 64, 0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusDot
                            status={o.success ? "success" : o.partial ? "partial" : "failure"}
                          />
                          <code style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-mid)" }}>
                            {o.execution_id ? `${o.execution_id.slice(0, 12)}…` : o.intent_id?.slice(0, 12)}
                          </code>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {o.duration_ms}ms
                          </span>
                          <ExecutionStatusBadge
                            status={o.status}
                            success={o.success}
                            partial={o.partial ?? false}
                          />
                        </div>
                      </div>

                      {/* Steps */}
                      {o.steps && o.steps.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {o.steps.map((s, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 9,
                                padding: "4px 6px",
                                borderRadius: 3,
                                background: s.success ? "rgba(90, 200, 38, 0.15)" : "rgba(220, 64, 64, 0.15)",
                                color: s.success ? "var(--lime)" : "#dc4040",
                              }}
                            >
                              {s.action_type} <span style={{ color: "var(--ink-muted)", marginLeft: 4 }}>{s.duration_ms}ms</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ACTION_COMPLETED event shape (no steps, has action_types) */}
                      {(!o.steps || o.steps.length === 0) && o.action_types && o.action_types.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {o.action_types.map((at, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 9,
                                padding: "4px 6px",
                                borderRadius: 3,
                                background: "var(--bg)",
                                color: "var(--ink-muted)",
                              }}
                            >
                              {at}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Failure reason */}
                      {o.failure_reason && (
                        <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 9, color: "#dc4040", borderLeft: "2px solid #dc4040", paddingLeft: 8 }}>
                          {o.failure_reason}
                        </div>
                      )}

                      {/* World state changes */}
                      {o.world_state_changes && o.world_state_changes.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                          {o.world_state_changes.map((change, i) => (
                            <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)" }}>
                              ↳ {change}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                  {streamStatus === "connecting"
                    ? "Connecting to live stream…"
                    : "No execution history. Axon has not executed any intents yet."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── AUDIT ── */}
      {activeTab === "audit" && (
        <div className="float-up float-up-10">
          <Card>
            <CardHeader>
              <CardTitle>
                <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>▣</span>
                Audit Trail
              </CardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {audit.data && (
                  <>
                    <Badge variant="muted">{audit.data.total} records</Badge>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                      source: {audit.data.source}
                    </span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {audit.data ? (
                audit.data.records.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {audit.data.records.map((r) => (
                      <div
                        key={r.execution_id}
                        style={{
                          padding: "10px",
                          borderRadius: 7,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-mid)" }}>
                              {r.execution_id.startsWith("[audit-")
                                ? r.execution_id
                                : `${r.execution_id.slice(0, 12)}…`}
                            </code>
                            <VerdictBadge verdict={r.equor_verdict} />
                            <ResultBadge result={r.result} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                              {r.duration_ms}ms
                            </span>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-muted)" }}>
                              lvl {r.autonomy_level}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 8px" }}>
                          <div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                              Action
                            </div>
                            <code style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--lime)" }}>
                              {r.action_type}
                            </code>
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                              Params Hash
                            </div>
                            <code style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)" }}>
                              {r.parameters_hash.startsWith("[audit-")
                                ? r.parameters_hash
                                : `${r.parameters_hash.slice(0, 12)}…`}
                            </code>
                          </div>
                          {r.affect_valence !== 0 && (
                            <div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                                Affect
                              </div>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)", fontVariantNumeric: "tabular-nums" }}>
                                {r.affect_valence > 0 ? "+" : ""}{r.affect_valence.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {r.timestamp && (
                            <div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                                Time
                              </div>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-mid)" }}>
                                {new Date(r.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>
                    No audit records yet. Records appear after Axon executes intents.
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-muted)" }}>Loading…</div>
              )}

              <div style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                Parameters are SHA-256 hashed and never stored raw. Records are written to Neo4j Memory as GovernanceRecord nodes (type: action_audit).
                {audit.data?.source === "outcomes" && (
                  <> Showing reconstructed records from outcomes ring buffer (Memory unavailable).</>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
