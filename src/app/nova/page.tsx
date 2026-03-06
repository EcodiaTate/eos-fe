"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  NovaHealthResponse,
  NovaGoalsResponse,
  NovaBeliefsResponse,
  NovaDecisionsResponse,
  NovaFEBudgetResponse,
  NovaEFEWeights,
  NovaPendingIntentsResponse,
  NovaConfigResponse,
  NovaGoalDetail,
  NovaDecisionRecord,
  NovaCounterfactualsResponse,
  NovaCounterfactualRecord,
  NovaTimelineResponse,
  NovaGoalHistoryResponse,
  NovaGoalHistoryItem,
} from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { pct, fmtUsd, fmtNats, fmtMs } from "@/lib/formatters";

// ─── Tab definition ───────────────────────────────────────────────

type Tab =
  | "overview"
  | "goals"
  | "beliefs"
  | "decisions"
  | "timeline"
  | "counterfactuals"
  | "fe-budget"
  | "pending"
  | "config";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "beliefs", label: "Beliefs" },
  { id: "decisions", label: "Decisions" },
  { id: "timeline", label: "Timeline" },
  { id: "counterfactuals", label: "Counterfactuals" },
  { id: "fe-budget", label: "FE Budget" },
  { id: "pending", label: "Pending" },
  { id: "config", label: "Config" },
];

// ─── Helpers ──────────────────────────────────────────────────────

function ts(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleTimeString();
  } catch {
    return s;
  }
}

function pathBadgeVariant(path: string) {
  if (path === "fast") return "success" as const;
  if (path === "slow") return "info" as const;
  if (path === "budget_exhausted") return "danger" as const;
  return "muted" as const;
}

function statusVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "suspended") return "warning" as const;
  if (status === "achieved") return "info" as const;
  return "muted" as const;
}

// ─── Sub-components ───────────────────────────────────────────────

function Meter({
  value,
  label,
  danger,
  warn,
}: {
  value: number;
  label: string;
  danger?: number;
  warn?: number;
}) {
  const color =
    danger !== undefined && value >= danger
      ? "var(--lime-bright)"
      : warn !== undefined && value >= warn
        ? "var(--gold-bright)"
        : "var(--lime)";
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <span style={{ fontSize: "9px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
          {pct(value)}
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: pct(value), background: color }}
        />
      </div>
    </div>
  );
}

function DriveBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const colors: Record<string, string> = {
    coherence: "var(--lime)",
    care: "var(--lime-bright)",
    growth: "var(--gold-bright)",
    honesty: "var(--lime)",
  };
  const color = colors[label] ?? "var(--lime)";
  const norm = Math.min(value / 2, 1); // normalize 0-2 range to 0-1
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "capitalize" }}>
          {label}
        </span>
        <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: pct(norm), background: color }}
        />
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: NovaGoalDetail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      className="w-full text-left rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/80 truncate">{goal.description}</div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant(goal.status)}>{goal.status}</Badge>
            <span className="text-[10px] text-white/25">{goal.source}</span>
            {goal.target_domain && (
              <span className="text-[10px] text-white/25">{goal.target_domain}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-white/40 tabular-nums">
            p={goal.priority.toFixed(2)}
          </span>
          <span className="text-[10px] text-white/25 tabular-nums">
            u={goal.urgency.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-teal-400/60 transition-all"
            style={{ width: pct(goal.progress) }}
          />
        </div>
        <span className="text-[10px] text-white/30 tabular-nums">
          {pct(goal.progress)}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/[0.05] pt-2">
          {goal.success_criteria && (
            <div>
              <div className="text-[10px] text-white/25 mb-0.5">Criteria</div>
              <div className="text-xs text-white/50">{goal.success_criteria}</div>
            </div>
          )}
          {Object.keys(goal.drive_alignment).length > 0 && (
            <div>
              <div className="text-[10px] text-white/25 mb-1">Drive Alignment</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {Object.entries(goal.drive_alignment).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[10px] text-white/30 capitalize">{k}</span>
                    <span className="text-[10px] text-white/50 tabular-nums">
                      {(v as number).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-4 flex-wrap">
            <div>
              <div className="text-[10px] text-white/25">Importance</div>
              <div className="text-xs text-white/50 tabular-nums">
                {goal.importance.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/25">Intents</div>
              <div className="text-xs text-white/50 tabular-nums">
                {goal.intents_issued}
              </div>
            </div>
            {goal.created_at && (
              <div>
                <div className="text-[10px] text-white/25">Created</div>
                <div className="text-xs text-white/50">{ts(goal.created_at)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

function DecisionRow({ record }: { record: NovaDecisionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const sa = record.situation_assessment;
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "7px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "10px 12px",
        cursor: "pointer",
        transition: "background 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
      onClick={() => setExpanded((e) => !e)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <Badge variant={pathBadgeVariant(record.path)}>{record.path}</Badge>
        <span style={{ fontSize: "11px", color: "var(--ink-mid)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {record.goal_description || record.goal_id || "no goal"}
        </span>
        <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
          {fmtMs(record.latency_ms)}
        </span>
        <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
          {ts(record.timestamp)}
        </span>
      </div>

      {record.selected_policy_name && (
        <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
          policy: {record.selected_policy_name}
          {record.equor_verdict && (
            <span
              style={{
                marginLeft: "12px",
                color:
                  record.equor_verdict === "approved"
                    ? "var(--lime)"
                    : record.equor_verdict === "blocked"
                      ? "var(--lime-bright)"
                      : "var(--ink-muted)",
              }}
            >
              equor: {record.equor_verdict}
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Situation assessment */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                novelty
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {sa.novelty.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                risk
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {sa.risk.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                emotion
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {sa.emotional_intensity.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                precision
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {sa.broadcast_precision.toFixed(2)}
              </span>
            </div>
          </div>

          {/* EFE scores */}
          {Object.keys(record.efe_scores).length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--ink-muted)", marginBottom: "8px", fontFamily: "var(--font-body)" }}>
                EFE Scores
              </div>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(record.efe_scores).map(([policy, score]) => (
                  <div
                    key={policy}
                    style={{
                      borderRadius: "4px",
                      background: "rgba(90, 200, 38, 0.05)",
                      border: "1px solid var(--border)",
                      padding: "6px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {policy}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                      {(score as number).toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cognition cost */}
          {record.cognition_cost_total_usd !== null && (
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                  cost
                </div>
                <div style={{ fontSize: "11px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                  {fmtUsd(record.cognition_cost_total_usd ?? 0)}
                </div>
              </div>
              {record.cognition_budget_allocated_usd !== null && (
                <div>
                  <div className="text-[10px] text-white/25">budget</div>
                  <div className="text-xs text-white/50 tabular-nums">
                    {fmtUsd(record.cognition_budget_allocated_usd ?? 0)}
                  </div>
                </div>
              )}
              {record.cognition_budget_importance && (
                <div>
                  <div className="text-[10px] text-white/25">importance</div>
                  <div className="text-xs text-white/50">
                    {record.cognition_budget_importance}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FE budget */}
          {record.fe_budget_spent_nats !== null && (
            <div className="flex gap-4 flex-wrap">
              <div>
                <div className="text-[10px] text-white/25">FE spent</div>
                <div className="text-xs text-white/50 tabular-nums">
                  {fmtNats(record.fe_budget_spent_nats ?? 0)}
                </div>
              </div>
              {record.fe_budget_remaining_nats !== null && (
                <div>
                  <div className="text-[10px] text-white/25">FE remaining</div>
                  <div className="text-xs text-white/50 tabular-nums">
                    {fmtNats(record.fe_budget_remaining_nats ?? 0)}
                  </div>
                </div>
              )}
              {record.fe_budget_interrupt && (
                <Badge variant="warning">interrupt</Badge>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Counterfactual components ────────────────────────────────────

function regretColor(regret: number | null): string {
  if (regret === null) return "var(--ink-muted)";
  if (regret > 0.1) return "var(--lime-bright)";
  if (regret < -0.1) return "var(--lime)";
  return "var(--ink-mid)";
}

function CounterfactualRow({ record }: { record: NovaCounterfactualRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "7px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "12px",
        cursor: "pointer",
        transition: "background 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={record.resolved ? "success" : "muted"}>
          {record.resolved ? "resolved" : "pending"}
        </Badge>
        <span style={{ fontSize: "11px", color: "var(--ink-mid)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {record.policy_name}
        </span>
        {record.regret !== null && (
          <span style={{ fontSize: "10px", color: regretColor(record.regret), fontFamily: "var(--font-body)" }}>
            regret: {record.regret >= 0 ? "+" : ""}{record.regret.toFixed(3)}
          </span>
        )}
        <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
          {ts(record.timestamp)}
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Policy comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ borderRadius: "7px", border: "1px solid var(--border)", background: "rgba(90, 200, 38, 0.03)", padding: "12px" }}>
              <div style={{ fontSize: "8px", color: "var(--ink-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                Rejected
              </div>
              <div style={{ fontSize: "11px", color: "var(--ink-mid)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {record.policy_name}
              </div>
              <div style={{ fontSize: "10px", color: "var(--ink-muted)", marginTop: "6px", fontFamily: "var(--font-body)" }}>
                type: <span style={{ fontFamily: "var(--font-body)" }}>{record.policy_type}</span>
              </div>
              <div style={{ fontSize: "10px", color: "var(--ink-mid)", marginTop: "8px", fontFamily: "var(--font-body)" }}>
                EFE: {record.efe_total.toFixed(4)}
              </div>
              <div style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                pragmatic: {record.estimated_pragmatic_value.toFixed(3)}
              </div>
            </div>
            <div style={{ borderRadius: "7px", border: "1px solid var(--border)", background: "rgba(120, 224, 58, 0.03)", padding: "12px" }}>
              <div style={{ fontSize: "8px", color: "var(--ink-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                Chosen
              </div>
              <div style={{ fontSize: "11px", color: "var(--ink-mid)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {record.chosen_policy_name}
              </div>
              <div style={{ fontSize: "10px", color: "var(--ink-mid)", marginTop: "8px", fontFamily: "var(--font-body)" }}>
                EFE: {record.chosen_efe_total.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Outcome */}
          {record.resolved && (
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "10px" }}>
              <div>
                <div style={{ color: "var(--ink-muted)", marginBottom: "4px" }}>Outcome</div>
                <div style={{ color: record.actual_outcome_success ? "var(--lime)" : "var(--lime-bright)" }}>
                  {record.actual_outcome_success ? "success" : "failure"}
                </div>
              </div>
              {record.actual_pragmatic_value !== null && (
                <div>
                  <div style={{ color: "var(--ink-muted)", marginBottom: "4px" }}>Actual pragmatic</div>
                  <div style={{ color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                    {record.actual_pragmatic_value.toFixed(3)}
                  </div>
                </div>
              )}
              {record.regret !== null && (
                <div>
                  <div style={{ color: "var(--ink-muted)", marginBottom: "4px" }}>Regret</div>
                  <div style={{ color: regretColor(record.regret), fontFamily: "var(--font-body)", fontWeight: 500 }}>
                    {record.regret >= 0 ? "+" : ""}{record.regret.toFixed(4)}
                  </div>
                  <div style={{ color: "var(--ink-muted)", fontSize: "9px", marginTop: "2px" }}>
                    {record.regret > 0 ? "chose poorly" : "chose well"}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            intent: {record.intent_id.slice(0, 16)}…
          </div>
        </div>
      )}
    </button>
  );
}

function CounterfactualsTab({
  data,
}: {
  data: NovaCounterfactualsResponse | null;
}) {
  const [resolvedFilter, setResolvedFilter] = useState<boolean | null>(null);
  const [minRegret, setMinRegret] = useState(0);

  if (!data) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  const filtered = data.records.filter((r) => {
    if (resolvedFilter !== null && r.resolved !== resolvedFilter) return false;
    if (minRegret > 0 && (r.regret === null || r.regret < minRegret)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: data.total.toLocaleString() },
          {
            label: "Resolved",
            value: data.total > 0
              ? `${((data.resolved_count / data.total) * 100).toFixed(0)}%`
              : "—",
          },
          {
            label: "Mean Regret",
            value: data.mean_regret !== null ? data.mean_regret.toFixed(4) : "—",
          },
          {
            label: "Max Regret",
            value: data.max_regret !== null ? data.max_regret.toFixed(4) : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-display)", marginTop: "4px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {([null, true, false] as const).map((v) => (
            <button
              key={String(v)}
              onClick={() => setResolvedFilter(v)}
              style={{
                padding: "6px 10px",
                fontSize: "10px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: resolvedFilter === v ? "rgba(90, 200, 38, 0.15)" : "transparent",
                color: resolvedFilter === v ? "var(--lime)" : "var(--ink-muted)",
                cursor: "pointer",
                transition: "all 200ms",
                fontFamily: "var(--font-body)",
              }}
            >
              {v === null ? "all" : v ? "resolved" : "unresolved"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
            min regret
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minRegret}
            onChange={(e) => setMinRegret(parseFloat(e.target.value))}
            style={{ width: "96px", height: "6px", accentColor: "var(--lime)" }}
          />
          <span style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)", width: "32px" }}>
            {minRegret > 0 ? minRegret.toFixed(2) : "off"}
          </span>
        </div>
        <span style={{ fontSize: "10px", color: "var(--ink-muted)", marginLeft: "auto", fontFamily: "var(--font-body)" }}>
          {filtered.length} / {data.total} shown
        </span>
      </div>

      {/* Records */}
      {filtered.length > 0 ? (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <CounterfactualRow key={r.id} record={r} />
          ))}
        </div>
      ) : (
        <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>
          No counterfactual records match the current filters.
        </div>
      )}
    </div>
  );
}

// ─── Timeline components ──────────────────────────────────────────

function TimelineTab({ data }: { data: NovaTimelineResponse | null }) {
  if (!data) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  const points = data.points;

  // SVG sparkline for latency
  const latencies = points.map((p) => p.latency_ms).filter((v) => v > 0);
  const maxLat = Math.max(...latencies, 1);
  const sparkW = 400;
  const sparkH = 48;
  const sparkPoints = latencies
    .slice(0, 60)
    .reverse()
    .map((v, i, arr) => {
      const x = (i / Math.max(arr.length - 1, 1)) * sparkW;
      const y = sparkH - (v / maxLat) * sparkH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Stacked path dot chart: buckets
  const maxBucketTotal = Math.max(
    ...data.buckets.map((b) => b.fast + b.slow + b.nothing),
    1,
  );

  return (
    <div className="space-y-4">
      {/* Rolling stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Decisions / min", value: data.decisions_per_min.toFixed(2) },
          { label: "Avg latency (last 10)", value: fmtMs(data.avg_latency_last10_ms) },
          { label: "Est cost / hr", value: fmtUsd(data.cost_per_hr_usd) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="text-[10px] text-white/25">{label}</div>
            <div className="text-base font-semibold text-white/70 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Latency sparkline */}
      {latencies.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Latency</CardTitle>
            <span className="text-[10px] text-white/20">
              recent {latencies.length} decisions · max {fmtMs(maxLat)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden">
              <svg
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                className="w-full h-12"
                preserveAspectRatio="none"
              >
                <polyline
                  points={sparkPoints}
                  fill="none"
                  stroke="rgba(45,212,191,0.5)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[9px] text-white/20 mt-1">
              <span>older</span>
              <span>newer</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Path distribution over time */}
      {data.buckets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Path Distribution</CardTitle>
            <div className="flex gap-2 text-[10px]">
              <span className="text-teal-400/70">■ fast</span>
              <span className="text-sky-400/70">■ slow</span>
              <span className="text-white/30">■ nothing</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-20 overflow-x-auto">
              {data.buckets.map((b) => {
                const total = b.fast + b.slow + b.nothing;
                const heightPct = (total / maxBucketTotal) * 100;
                const fastPct = total > 0 ? (b.fast / total) * 100 : 0;
                const slowPct = total > 0 ? (b.slow / total) * 100 : 0;
                const nothingPct = total > 0 ? (b.nothing / total) * 100 : 0;
                return (
                  <div
                    key={b.minute}
                    className="flex flex-col-reverse shrink-0"
                    style={{ height: "100%", width: "12px" }}
                    title={`${b.minute.slice(11)}: fast=${b.fast} slow=${b.slow} nothing=${b.nothing}`}
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="flex flex-col-reverse overflow-hidden rounded-t-sm"
                    >
                      <div
                        style={{ height: `${nothingPct}%` }}
                        className="bg-white/[0.12] shrink-0"
                      />
                      <div
                        style={{ height: `${slowPct}%` }}
                        className="bg-sky-400/50 shrink-0"
                      />
                      <div
                        style={{ height: `${fastPct}%` }}
                        className="bg-teal-400/60 shrink-0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-white/20 mt-1">
              <span>{data.buckets[0]?.minute.slice(11) ?? ""}</span>
              <span>{data.buckets[data.buckets.length - 1]?.minute.slice(11) ?? ""}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent decision list */}
      {points.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Decisions</CardTitle>
            <span className="text-[10px] text-white/20">{points.length} records</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {points.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-0.5 text-[10px]"
                >
                  <span
                    className={cn(
                      "w-10 shrink-0 font-mono",
                      p.path === "fast"
                        ? "text-teal-400/70"
                        : p.path === "slow"
                          ? "text-sky-400/70"
                          : "text-white/30",
                    )}
                  >
                    {p.path}
                  </span>
                  <span className="text-white/40 tabular-nums w-14 shrink-0">{fmtMs(p.latency_ms)}</span>
                  {p.fe_budget_utilisation !== null && (
                    <span className="text-white/20 tabular-nums w-10 shrink-0">
                      {pct(p.fe_budget_utilisation)}
                    </span>
                  )}
                  <span className="text-white/15 shrink-0 ml-auto">{ts(p.timestamp)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {points.length === 0 && (
        <div className="py-12 text-center text-sm text-white/20">
          No decision records yet.
        </div>
      )}
    </div>
  );
}

// ─── Goal History component ───────────────────────────────────────

function GoalHistoryCard({ goal }: { goal: NovaGoalHistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "7px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "12px",
        cursor: "pointer",
        transition: "background 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
      onClick={() => setExpanded((e) => !e)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", color: "var(--ink-mid)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {goal.description}
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Badge variant={goal.status === "achieved" ? "success" : "muted"}>
              {goal.status}
            </Badge>
            <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              {goal.source}
            </span>
            {goal.persisted && (
              <span style={{ fontSize: "9px", color: "var(--lime)", border: "1px solid rgba(90, 200, 38, 0.3)", borderRadius: "3px", padding: "2px 6px" }}>
                persisted
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: "10px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
          {pct(goal.progress)}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {goal.success_criteria && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                Criteria
              </div>
              <div style={{ fontSize: "11px", color: "var(--ink-mid)" }}>
                {goal.success_criteria}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "10px" }}>
            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                Created
              </div>
              <div style={{ color: "var(--ink-mid)" }}>
                {ts(goal.created_at)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                Updated
              </div>
              <div style={{ color: "var(--ink-mid)" }}>
                {ts(goal.updated_at)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                Intents
              </div>
              <div style={{ color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {goal.intents_issued}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: "4px", fontFamily: "var(--font-body)" }}>
                Priority
              </div>
              <div style={{ color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                {goal.priority.toFixed(2)}
              </div>
            </div>
          </div>
          {Object.keys(goal.drive_alignment).length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(goal.drive_alignment).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "capitalize" }}>
                    {k}
                  </span>
                  <span style={{ color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
                    {v.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────

function OverviewTab({
  health,
  feBudget,
}: {
  health: NovaHealthResponse | null;
  feBudget: NovaFEBudgetResponse | null;
}) {
  if (!health) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  const total = health.total_decisions || 1;
  const fastRatio = health.fast_path_decisions / total;
  const slowRatio = health.slow_path_decisions / total;
  const nothingRatio = health.do_nothing_decisions / total;
  const intentApprovalRate =
    health.intents_issued > 0
      ? health.intents_approved / health.intents_issued
      : 0;
  const outcomeSuccessRate =
    health.outcomes_success + health.outcomes_failure > 0
      ? health.outcomes_success / (health.outcomes_success + health.outcomes_failure)
      : 0;

  return (
    <div className="space-y-4">
      {/* Status + identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Badge
          variant={
            health.status === "healthy"
              ? "success"
              : health.status === "degraded"
                ? "warning"
                : "danger"
          }
        >
          {health.status}
        </Badge>
        {health.instance_name && (
          <span style={{ fontSize: "13px", color: "var(--ink-mid)" }}>
            {health.instance_name}
          </span>
        )}
        <span style={{ fontSize: "10px", color: "var(--ink-muted)", marginLeft: "auto", fontFamily: "var(--font-body)" }}>
          rhythm: {health.rhythm_state}
        </span>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Broadcasts", value: health.total_broadcasts.toLocaleString() },
          { label: "Decisions", value: health.total_decisions.toLocaleString() },
          { label: "Intents Issued", value: health.intents_issued.toLocaleString() },
          { label: "Outcomes ✓", value: health.outcomes_success.toLocaleString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-display)", marginTop: "4px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Decision path breakdown */}
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ◎ Decision Paths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter value={fastRatio} label="Fast path" />
            <Meter value={slowRatio} label="Slow path" warn={0.6} />
            <Meter value={nothingRatio} label="Do nothing" warn={0.5} danger={0.8} />
          </CardContent>
        </Card>

        {/* Intent & outcome rates */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ⚡ Intent Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter value={intentApprovalRate} label="Approval rate" warn={0.3} />
            <Meter value={outcomeSuccessRate} label="Outcome success" warn={0.4} danger={0.2} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--ink-muted)", paddingTop: "8px", fontFamily: "var(--font-body)" }}>
              <span>blocked: {health.intents_blocked.toLocaleString()}</span>
              <span>failed: {health.outcomes_failure.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Belief state */}
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ◈ Belief State
            </CardTitle>
            <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              {health.entity_count} entities
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter
              value={health.belief_confidence}
              label="Confidence"
              warn={0.3}
            />
            <Meter
              value={health.belief_free_energy}
              label="Free energy (lower = better)"
              warn={0.6}
              danger={0.8}
            />
          </CardContent>
        </Card>

        {/* Drive weights */}
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ▣ Drive Weights
            </CardTitle>
            <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              goals: {health.active_goal_count} / pending: {health.pending_intent_count}
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(health.drive_weights).map(([k, v]) => (
              <DriveBar key={k} label={k} value={v as number} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* FE Budget inline */}
      {feBudget && (
        <Card>
          <CardHeader>
            <CardTitle>Free Energy Budget</CardTitle>
            <div className="flex gap-2">
              {feBudget.is_exhausted && <Badge variant="danger">exhausted</Badge>}
              {feBudget.is_pressured && !feBudget.is_exhausted && (
                <Badge variant="warning">pressured</Badge>
              )}
              {!feBudget.is_pressured && !feBudget.is_exhausted && (
                <Badge variant="muted">nominal</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter
              value={feBudget.utilisation}
              label={`Spent: ${fmtNats(feBudget.spent_nats)} / ${fmtNats(feBudget.budget_nats)}`}
              warn={0.6}
              danger={0.8}
            />
            <div className="flex gap-4 text-[10px] text-white/30">
              <span>k={feBudget.effective_k} policies</span>
              <span>interrupts: {feBudget.interrupts_triggered}</span>
              <span>threshold: {fmtNats(feBudget.threshold_nats)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cognition cost */}
      {health.cognition_cost_enabled && (
        <div className="flex items-center gap-3 text-[10px] text-white/25 border-t border-white/[0.04] pt-3">
          <span>metabolic cost today:</span>
          <span className="text-white/50 tabular-nums font-medium">
            {fmtUsd(health.cognition_cost_daily_usd)}
          </span>
        </div>
      )}
    </div>
  );
}

function GoalsTab({
  goals,
  goalHistory,
  persistenceActive,
  onInjectGoal,
}: {
  goals: NovaGoalsResponse | null;
  goalHistory: NovaGoalHistoryResponse | null;
  persistenceActive: boolean;
  onInjectGoal: () => void;
}) {
  const [historyStatus, setHistoryStatus] = useState<"achieved" | "abandoned">("achieved");

  if (!goals) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="success">{goals.total_active} active</Badge>
          {goals.total_suspended > 0 && (
            <Badge variant="warning">{goals.total_suspended} suspended</Badge>
          )}
          <span className="text-[10px] text-white/20">
            max: {goals.max_active}
          </span>
          {persistenceActive && (
            <span className="text-[9px] text-teal-400/40 border border-teal-400/20 rounded px-1">
              persisted
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onInjectGoal}>
          + Inject Goal
        </Button>
      </div>

      {goals.active_goals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">Active</div>
          {goals.active_goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {goals.suspended_goals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">Suspended</div>
          {goals.suspended_goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {goals.achieved_goals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">
            Recently Achieved / Abandoned
          </div>
          {goals.achieved_goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {goals.active_goals.length === 0 &&
        goals.suspended_goals.length === 0 && (
          <div className="py-8 text-center text-sm text-white/20">
            No goals currently active.
          </div>
        )}

      {/* ── History section (from Neo4j) ── */}
      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">
            History
            {goalHistory?.persistence_active && (
              <span className="ml-2 text-teal-400/40 normal-case">· Neo4j</span>
            )}
          </div>
          <div className="flex gap-1">
            {(["achieved", "abandoned"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setHistoryStatus(s)}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded transition-colors",
                  historyStatus === s
                    ? "bg-teal-400/20 text-teal-400/90"
                    : "text-white/30 hover:text-white/60",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!goalHistory ? (
          <div className="text-sm text-white/15 text-center py-4">
            Loading history…
          </div>
        ) : goalHistory.goals.length === 0 ? (
          <div className="text-sm text-white/15 text-center py-4">
            No {historyStatus} goals in Neo4j yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {goalHistory.goals.map((g) => (
              <GoalHistoryCard key={g.id} goal={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BeliefsTab({ beliefs }: { beliefs: NovaBeliefsResponse | null }) {
  if (!beliefs) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Confidence", value: pct(beliefs.overall_confidence) },
          { label: "Free Energy", value: beliefs.free_energy.toFixed(3) },
          { label: "Entities", value: beliefs.entity_count.toLocaleString() },
          { label: "Individuals", value: beliefs.individual_count.toLocaleString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-display)", marginTop: "4px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Context belief */}
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ◎ Context
            </CardTitle>
            <Badge variant={beliefs.context.is_active_dialogue ? "success" : "muted"}>
              {beliefs.context.is_active_dialogue ? "dialogue" : "idle"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {beliefs.context.summary && (
              <div className="text-xs text-white/50">{beliefs.context.summary}</div>
            )}
            <div className="flex gap-4 flex-wrap">
              {beliefs.context.domain && (
                <div>
                  <div className="text-[10px] text-white/25">domain</div>
                  <div className="text-xs text-white/50">{beliefs.context.domain}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] text-white/25">confidence</div>
                <div className="text-xs text-white/50 tabular-nums">
                  {pct(beliefs.context.confidence)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">prediction error</div>
                <div className="text-xs text-white/50 tabular-nums">
                  {pct(beliefs.context.prediction_error_magnitude)}
                </div>
              </div>
            </div>
            {beliefs.context.user_intent_estimate && (
              <div className="text-[10px] text-white/30 italic">
                user intent: {beliefs.context.user_intent_estimate}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Self belief */}
        <Card>
          <CardHeader>
            <CardTitle>Self Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter
              value={beliefs.self_belief.epistemic_confidence}
              label="Epistemic confidence"
              warn={0.3}
            />
            <Meter
              value={beliefs.self_belief.cognitive_load}
              label="Cognitive load"
              warn={0.7}
              danger={0.9}
            />
            <Meter
              value={beliefs.self_belief.goal_capacity_remaining}
              label="Goal capacity remaining"
              warn={0.3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Individuals */}
      {beliefs.individuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Individuals</CardTitle>
            <span className="text-[10px] text-white/20">
              {beliefs.individuals.length} tracked
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {beliefs.individuals.map((ind) => (
                <div
                  key={ind.individual_id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] px-3 py-2"
                >
                  <div className="flex-1 text-sm text-white/60">
                    {ind.name || ind.individual_id}
                  </div>
                  <div className="text-[10px] text-white/30 tabular-nums">
                    valence:{" "}
                    <span
                      className={
                        ind.estimated_valence > 0.2
                          ? "text-emerald-400/60"
                          : ind.estimated_valence < -0.2
                            ? "text-rose-400/60"
                            : "text-white/40"
                      }
                    >
                      {ind.estimated_valence.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/25 tabular-nums">
                    trust: {ind.relationship_trust.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entities */}
      {beliefs.entities.length > 0 && (
        <Card className="float-up float-up-5">
          <CardHeader>
            <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
              ◉ Entities
            </CardTitle>
            <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              top {beliefs.entities.length} by confidence
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {beliefs.entities.map((e) => (
                <div
                  key={e.entity_id}
                  style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px" }}
                >
                  <div style={{ width: "96px", color: "var(--ink-muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.entity_type}
                  </div>
                  <div style={{ flex: 1, color: "var(--ink-mid)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.name || e.entity_id}
                  </div>
                  <div style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)", width: "48px", textAlign: "right" }}>
                    {pct(e.confidence)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DecisionsTab({
  decisions,
}: {
  decisions: NovaDecisionsResponse | null;
}) {
  if (!decisions) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fast", value: decisions.fast_path_count, color: "var(--lime)" },
          { label: "Slow", value: decisions.slow_path_count, color: "var(--lime-bright)" },
          { label: "Do Nothing", value: decisions.do_nothing_count, color: "var(--ink-mid)" },
          {
            label: "Avg Latency",
            value: fmtMs(decisions.avg_latency_ms),
            color: "var(--ink-mid)",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color, fontFamily: "var(--font-display)", marginTop: "4px" }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
          </div>
        ))}
      </div>

      {/* Decision list */}
      {decisions.decisions.length > 0 ? (
        <div className="space-y-1.5">
          {decisions.decisions.map((d) => (
            <DecisionRow key={d.id} record={d} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-white/20">
          No decision records yet.
        </div>
      )}
    </div>
  );
}

function FEBudgetTab({ feBudget }: { feBudget: NovaFEBudgetResponse | null }) {
  if (!feBudget) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Budget", value: fmtNats(feBudget.budget_nats) },
          { label: "Spent", value: fmtNats(feBudget.spent_nats) },
          { label: "Remaining", value: fmtNats(feBudget.remaining_nats) },
          { label: "Threshold", value: fmtNats(feBudget.threshold_nats) },
          { label: "Effective K", value: `${feBudget.effective_k} policies` },
          { label: "Interrupts", value: feBudget.interrupts_triggered.toLocaleString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-mid)", fontFamily: "var(--font-body)", marginTop: "4px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
            ≡ Budget Utilisation
          </CardTitle>
          <div className="flex gap-2">
            {feBudget.is_exhausted && <Badge variant="danger">exhausted</Badge>}
            {feBudget.is_pressured && !feBudget.is_exhausted && (
              <Badge variant="warning">pressured — k={feBudget.reduced_k}</Badge>
            )}
            {!feBudget.is_pressured && !feBudget.is_exhausted && (
              <Badge variant="muted">nominal — k={feBudget.normal_k}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Meter
            value={feBudget.utilisation}
            label="Utilisation"
            warn={0.6}
            danger={0.8}
          />
          <div className="space-y-1 text-[10px] text-white/30">
            <div>
              Spent {fmtNats(feBudget.spent_nats)} of {fmtNats(feBudget.budget_nats)} total
              budget
            </div>
            <div>
              Threshold at {fmtNats(feBudget.threshold_nats)} ({(feBudget.threshold_nats / feBudget.budget_nats * 100).toFixed(0)}%)
              — when crossed, triggers Evo consolidation + reduces policy K to{" "}
              {feBudget.reduced_k}
            </div>
            <div>
              Current effective K: {feBudget.effective_k} (normal: {feBudget.normal_k},
              reduced: {feBudget.reduced_k})
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingTab({
  pending,
}: {
  pending: NovaPendingIntentsResponse | null;
}) {
  if (!pending) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant={pending.total > 0 ? "info" : "muted"}>
          {pending.total} pending
        </Badge>
        {pending.heavy_executor_count > 0 && (
          <Badge variant="warning">{pending.heavy_executor_count} heavy</Badge>
        )}
      </div>

      {pending.pending_intents.length > 0 ? (
        <div className="space-y-2">
          {pending.pending_intents.map((p) => (
            <div
              key={p.intent_id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60 truncate">{p.goal_id}</div>
                  {p.policy_name && (
                    <div className="text-[10px] text-white/30">{p.policy_name}</div>
                  )}
                </div>
                <Badge variant="info">{p.routed_to}</Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                {p.executors.map((ex) => (
                  <span key={ex} className="text-[10px] text-white/30 font-mono">
                    {ex}
                  </span>
                ))}
                <span className="text-[10px] text-white/20 ml-auto">
                  {ts(p.dispatched_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-white/20">
          No pending intents.
        </div>
      )}
    </div>
  );
}

function EFEWeightsEditor({
  weights,
  onSave,
  saving,
}: {
  weights: NovaEFEWeights;
  onSave: (w: NovaEFEWeights) => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState<NovaEFEWeights>({ ...weights });

  const components: (keyof NovaEFEWeights)[] = [
    "pragmatic",
    "epistemic",
    "constitutional",
    "feasibility",
    "risk",
    "cognition_cost",
  ];

  const sum = Object.values(local).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {components.map((k) => (
        <div key={k} className="space-y-1">
          <div className="flex justify-between">
            <label className="text-[10px] text-white/40 capitalize">{k}</label>
            <span className="text-[10px] text-white/50 tabular-nums">
              {local[k].toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={local[k]}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, [k]: parseFloat(e.target.value) }))
            }
            className="w-full h-1.5 accent-teal-400"
          />
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <span
          className={cn(
            "text-[10px] tabular-nums",
            Math.abs(sum - 1.0) > 0.05 ? "text-amber-400/60" : "text-white/30",
          )}
        >
          sum: {sum.toFixed(2)} {Math.abs(sum - 1.0) > 0.05 ? "(≠ 1)" : ""}
        </span>
        <Button
          size="sm"
          onClick={() => onSave(local)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Apply Weights"}
        </Button>
      </div>
    </div>
  );
}

function ConfigTab({
  config,
  weights,
  onSaveWeights,
  savingWeights,
}: {
  config: NovaConfigResponse | null;
  weights: NovaEFEWeights | null;
  onSaveWeights: (w: NovaEFEWeights) => void;
  savingWeights: boolean;
}) {
  if (!config) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timing */}
        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[
                { label: "Fast path timeout", value: fmtMs(config.fast_path_timeout_ms) },
                { label: "Slow path timeout", value: fmtMs(config.slow_path_timeout_ms) },
                {
                  label: "Memory retrieval timeout",
                  value: fmtMs(config.memory_retrieval_timeout_ms),
                },
                {
                  label: "Heartbeat interval",
                  value: `${config.heartbeat_interval_seconds}s`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[11px]">
                  <span className="text-white/30">{label}</span>
                  <span className="text-white/50 tabular-nums font-mono">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals & policies */}
        <Card>
          <CardHeader>
            <CardTitle>Goals & Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[
                {
                  label: "Max active goals",
                  value: config.max_active_goals,
                },
                {
                  label: "Max policies per cycle",
                  value: config.max_policies_per_deliberation,
                },
                {
                  label: "LLM EFE estimation",
                  value: config.use_llm_efe_estimation ? "enabled" : "disabled",
                },
                {
                  label: "Hunger threshold",
                  value: fmtUsd(config.hunger_balance_threshold_usd),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[11px]">
                  <span className="text-white/30">{label}</span>
                  <span className="text-white/50 tabular-nums font-mono">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cognition budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Cognition Budgets</CardTitle>
            <Badge variant={config.cognition_cost_enabled ? "success" : "muted"}>
              {config.cognition_cost_enabled ? "enabled" : "disabled"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[
                { tier: "LOW", usd: config.cognition_budget_low },
                { tier: "MEDIUM", usd: config.cognition_budget_medium },
                { tier: "HIGH", usd: config.cognition_budget_high },
                { tier: "CRITICAL", usd: config.cognition_budget_critical },
              ].map(({ tier, usd }) => (
                <div key={tier} className="flex justify-between text-[11px]">
                  <span className="text-white/30">{tier}</span>
                  <span className="text-white/50 tabular-nums font-mono">
                    {fmtUsd(usd)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* EFE weight editor */}
        <Card>
          <CardHeader>
            <CardTitle>EFE Weights</CardTitle>
            <span className="text-[10px] text-white/20">Evo-tunable</span>
          </CardHeader>
          <CardContent>
            {weights ? (
              <EFEWeightsEditor
                weights={weights}
                onSave={onSaveWeights}
                saving={savingWeights}
              />
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Inject Goal Modal ────────────────────────────────────────────

function InjectGoalModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (body: {
    description: string;
    source: string;
    priority: number;
    urgency: number;
    importance: number;
  }) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("governance");
  const [priority, setPriority] = useState(0.5);
  const [urgency, setUrgency] = useState(0.3);
  const [importance, setImportance] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ description, source, priority, urgency, importance });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to inject goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Inject Goal</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 text-lg"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-white/40">Description *</label>
            <textarea
              className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-teal-400/40"
              rows={3}
              placeholder="Goal description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40">Source</label>
            <select
              className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 focus:outline-none focus:border-teal-400/40"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {["governance", "user_request", "self_generated", "care_response", "maintenance", "epistemic"].map((s) => (
                <option key={s} value={s} className="bg-[#0a0a0a]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {[
            { label: "Priority", value: priority, set: setPriority },
            { label: "Urgency", value: urgency, set: setUrgency },
            { label: "Importance", value: importance, set: setImportance },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-white/40">{label}</label>
                <span className="text-[10px] text-white/50 tabular-nums">
                  {value.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={value}
                onChange={(e) => set(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-teal-400"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="text-xs text-rose-400/80 border border-rose-500/20 rounded-md px-3 py-2 bg-rose-500/[0.04]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Injecting…" : "Inject"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function NovaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);
  const [goalHistoryStatus, setGoalHistoryStatus] = useState<"achieved" | "abandoned">("achieved");

  const health = useApi<NovaHealthResponse>(api.novaHealth, {
    intervalMs: 5000,
  });
  const goals = useApi<NovaGoalsResponse>(api.novaGoals, {
    intervalMs: 10000,
    enabled: activeTab === "goals" || activeTab === "overview",
  });
  const beliefs = useApi<NovaBeliefsResponse>(api.novaBeliefs, {
    intervalMs: 10000,
    enabled: activeTab === "beliefs" || activeTab === "overview",
  });
  const decisions = useApi<NovaDecisionsResponse>(
    () => api.novaDecisions(30),
    {
      intervalMs: 8000,
      enabled: activeTab === "decisions",
    },
  );
  const feBudget = useApi<NovaFEBudgetResponse>(api.novaFEBudget, {
    intervalMs: 5000,
    enabled: activeTab === "fe-budget" || activeTab === "overview",
  });
  const efeWeights = useApi<NovaEFEWeights>(api.novaEFEWeights, {
    intervalMs: 30000,
    enabled: activeTab === "config",
  });
  const pending = useApi<NovaPendingIntentsResponse>(api.novaPendingIntents, {
    intervalMs: 5000,
    enabled: activeTab === "pending" || activeTab === "overview",
  });
  const config = useApi<NovaConfigResponse>(api.novaConfig, {
    intervalMs: 60000,
    enabled: activeTab === "config",
  });
  const counterfactuals = useApi<NovaCounterfactualsResponse>(
    () => api.novaCounterfactuals({ limit: 50 }),
    {
      intervalMs: 30000,
      enabled: activeTab === "counterfactuals",
    },
  );
  const timeline = useApi<NovaTimelineResponse>(
    () => api.novaTimeline(100),
    {
      intervalMs: 10000,
      enabled: activeTab === "timeline",
    },
  );
  const goalHistory = useApi<NovaGoalHistoryResponse>(
    () => api.novaGoalsHistory({ limit: 50, status: goalHistoryStatus }),
    {
      intervalMs: 60000,
      enabled: activeTab === "goals",
    },
  );

  async function handleInjectGoal(body: {
    description: string;
    source: string;
    priority: number;
    urgency: number;
    importance: number;
  }) {
    await api.novaInjectGoal(body);
    goals.refetch();
    health.refetch();
  }

  async function handleSaveWeights(w: NovaEFEWeights) {
    setSavingWeights(true);
    try {
      await api.novaUpdateEFEWeights(w);
      efeWeights.refetch();
    } finally {
      setSavingWeights(false);
    }
  }

  const h = health.data;
  const budgetPressured = feBudget.data?.is_pressured || feBudget.data?.is_exhausted;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Nova"
        description="Deliberation engine — Expected Free Energy, goal management, belief state"
      >
        <div className="flex items-center gap-2">
          {h && (
            <Badge
              variant={
                h.status === "healthy"
                  ? "success"
                  : h.status === "degraded"
                    ? "warning"
                    : "danger"
              }
            >
              {h.status}
            </Badge>
          )}
          {budgetPressured && (
            <Badge variant={feBudget.data?.is_exhausted ? "danger" : "warning"}>
              {feBudget.data?.is_exhausted ? "FE exhausted" : "FE pressured"}
            </Badge>
          )}
          {h && (
            <Badge variant="muted">
              {h.active_goal_count}g / {h.pending_intent_count}p
            </Badge>
          )}
        </div>
      </PageHeader>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 12px",
              fontSize: "12px",
              borderTopLeftRadius: "6px",
              borderTopRightRadius: "6px",
              transition: "all 200ms",
              whiteSpace: "nowrap",
              background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--lime)" : "none",
              fontFamily: activeTab === tab.id ? "var(--font-body)" : "var(--font-body)",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {activeTab === "overview" && (
          <OverviewTab health={h ?? null} feBudget={feBudget.data ?? null} />
        )}
        {activeTab === "goals" && (
          <GoalsTab
            goals={goals.data ?? null}
            goalHistory={goalHistory.data ?? null}
            persistenceActive={goalHistory.data?.persistence_active ?? false}
            onInjectGoal={() => setShowInjectModal(true)}
          />
        )}
        {activeTab === "beliefs" && (
          <BeliefsTab beliefs={beliefs.data ?? null} />
        )}
        {activeTab === "decisions" && (
          <DecisionsTab decisions={decisions.data ?? null} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab data={timeline.data ?? null} />
        )}
        {activeTab === "counterfactuals" && (
          <CounterfactualsTab data={counterfactuals.data ?? null} />
        )}
        {activeTab === "fe-budget" && (
          <FEBudgetTab feBudget={feBudget.data ?? null} />
        )}
        {activeTab === "pending" && (
          <PendingTab pending={pending.data ?? null} />
        )}
        {activeTab === "config" && (
          <ConfigTab
            config={config.data ?? null}
            weights={efeWeights.data ?? null}
            onSaveWeights={handleSaveWeights}
            savingWeights={savingWeights}
          />
        )}
      </div>

      {/* Inject Goal Modal */}
      {showInjectModal && (
        <InjectGoalModal
          onClose={() => setShowInjectModal(false)}
          onSubmit={handleInjectGoal}
        />
      )}
    </div>
  );
}
