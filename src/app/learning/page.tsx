"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type EvoStatsResponse,
  type EvoParametersResponse,
  type ConsolidationResponse,
  type EvoHealthResponse,
  type EvoHypothesesResponse,
  type EvoTournamentsResponse,
  type EvoSelfModelResponse,
  type EvoStaleBeliefResponse,
  type EvoPatternsResponse,
  type EvoHypothesis,
  type EvoTournament,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";

// ─── Tab types ─────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "hypotheses"
  | "tournaments"
  | "parameters"
  | "self-model"
  | "beliefs";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "hypotheses", label: "Hypotheses" },
  { id: "tournaments", label: "Tournaments" },
  { id: "parameters", label: "Parameters" },
  { id: "self-model", label: "Self-Model" },
  { id: "beliefs", label: "Stale Beliefs" },
];

// ─── Status helpers ─────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

function hypothesisBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "supported":
      return "success";
    case "testing":
      return "info";
    case "proposed":
      return "muted";
    case "refuted":
      return "danger";
    case "integrated":
      return "success";
    case "archived":
      return "muted";
    default:
      return "default";
  }
}

function categorySymbol(category: string): string {
  const map: Record<string, string> = {
    world_model: "◈",
    self_model: "◎",
    social: "◑",
    procedural: "≡",
    parameter: "↑",
  };
  return map[category] ?? "◉";
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  health,
  patterns,
  consolidationResult,
  consolidating,
  onConsolidate,
}: {
  stats: EvoStatsResponse | null;
  health: EvoHealthResponse | null;
  patterns: EvoPatternsResponse | null;
  consolidationResult: ConsolidationResponse | null;
  consolidating: boolean;
  onConsolidate: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Health Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {[
          {
            label: "Total Broadcasts",
            value: health?.total_broadcasts?.toLocaleString() ?? "—",
          },
          {
            label: "Evidence Evaluations",
            value: health?.total_evidence_evaluations?.toLocaleString() ?? "—",
          },
          {
            label: "Consolidations",
            value: health?.total_consolidations ?? "—",
          },
          {
            label: "Pending Candidates",
            value: health?.pending_candidates ?? "—",
          },
        ].map((m, i) => (
          <Card key={m.label} className={`float-up float-up-${(i % 4) + 1}`}>
            <CardContent style={{ paddingTop: "1rem", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              <div style={{ fontSize: "16px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Hypothesis Engine Stats */}
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
              <span style={{ color: "var(--lime)" }}>◉</span> Hypothesis Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { label: "Active", value: stats.hypotheses_active },
                  { label: "Supported", value: stats.hypotheses_supported },
                  { label: "Archived", value: stats.hypotheses_archived },
                  { label: "Procedures", value: stats.procedures_extracted },
                  { label: "Params Adjusted", value: stats.parameters_adjusted },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)", fontVariantNumeric: "tabular-nums" }}>
                      {s.value}
                    </div>
                  </div>
                ))}
                {stats.last_consolidation && (
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Last Consolidation
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                      {new Date(stats.last_consolidation).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Pattern Context */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
              <span style={{ color: "var(--lime-bright)" }}>≡</span> Pattern Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patterns ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {[
                    {
                      label: "Co-occurrences",
                      value: patterns.cooccurrence_count,
                    },
                    { label: "Sequences", value: patterns.sequence_count },
                    {
                      label: "Temporal Bins",
                      value: patterns.temporal_bin_count,
                    },
                    {
                      label: "Affect Patterns",
                      value: patterns.affect_pattern_count,
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                      <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {patterns.pending_candidates > 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Pending Candidates ({patterns.pending_candidates})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {Object.entries(patterns.candidate_types).map(
                        ([type, count]) => (
                          <span
                            key={type}
                            style={{ fontSize: "9px", padding: "0.25rem 0.5rem", borderRadius: "9999px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink-soft)" }}
                          >
                            {type}: {count}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {patterns.top_cooccurrences.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Top Co-occurrences
                    </div>
                    {patterns.top_cooccurrences.slice(0, 3).map(([pair, count]) => (
                      <div
                        key={pair}
                        style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--ink-soft)", paddingBlock: "0.25rem" }}
                      >
                        <span style={{ fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                          {pair}
                        </span>
                        <span style={{ marginLeft: "0.5rem", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* arXiv Scanner */}
        {health && (
          <Card className="float-up float-up-3">
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
                <span style={{ color: "var(--gold-bright)" }}>◆</span> arXiv Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Scans</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                    {health.arxiv_scanner.total_scans}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Papers Found</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                    {health.arxiv_scanner.total_papers_found}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consolidation Control */}
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
              <span style={{ color: "var(--lime-bright)" }}>⚡</span> Consolidation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "12px", color: "var(--ink-soft)", lineHeight: "1.4" }}>
                Triggers sleep-mode pipeline: hypothesis review, belief aging, procedure extraction, and parameter optimization.
              </p>
              <Button
                onClick={onConsolidate}
                disabled={consolidating}
                size="sm"
                className="w-full"
              >
                {consolidating ? "Running..." : "Trigger Now"}
              </Button>

              {consolidationResult && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: consolidationResult.status === "completed" ? "var(--lime)" : "var(--ink-soft)" }}>
                      {consolidationResult.status}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Duration</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                      {consolidationResult.duration_ms}ms
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Evaluated</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                      {consolidationResult.hypotheses_evaluated}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Integrated</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                      {consolidationResult.hypotheses_integrated}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Procedures</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                      {consolidationResult.procedures_extracted}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Param Δ</div>
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                      {consolidationResult.total_parameter_delta.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Hypotheses Tab ───────────────────────────────────────────────────────────

function HypothesesTab({ data }: { data: EvoHypothesesResponse | null }) {
  const [filter, setFilter] = useState<string>("all");

  if (!data) {
    return <div style={{ fontSize: "14px", color: "var(--ink-muted)", paddingBlock: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (data.total === 0) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid var(--gold-bright)", background: "rgba(232, 168, 32, 0.04)", padding: "1.5rem", fontSize: "14px", color: "var(--gold-bright)", textAlign: "center" }}>
        No active hypotheses. Evo needs percepts and episodes to learn from.
      </div>
    );
  }

  const statuses = ["all", "proposed", "testing", "supported", "refuted"];
  const filtered =
    filter === "all"
      ? data.hypotheses
      : data.hypotheses.filter((h) => h.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {statuses.map((s) => {
          const count =
            s === "all"
              ? data.total
              : data.hypotheses.filter((h) => h.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "500",
                border: "1px solid var(--border)",
                background: filter === s ? "var(--lime-bright)" : "var(--bg)",
                color: filter === s ? "var(--ink-strong)" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 200ms",
              }}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Hypothesis list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map((h, i) => (
          <HypothesisRow key={h.id} h={h} index={i} />
        ))}
      </div>
    </div>
  );
}

function HypothesisRow({ h, index }: { h: EvoHypothesis; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const evidenceColor = h.evidence_score > 0 ? "var(--lime)" : h.evidence_score < 0 ? "var(--gold-bright)" : "var(--ink-soft)";

  return (
    <div
      className={`float-up float-up-${(index % 8) + 1}`}
      style={{
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: h.volatility_flag === "HIGH_VOLATILITY" ? "rgba(232, 168, 32, 0.02)" : "transparent",
        borderColor: h.volatility_flag === "HIGH_VOLATILITY" ? "var(--gold-bright)" : "var(--border)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.75rem 1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <Badge variant={hypothesisBadgeVariant(h.status)}>
                {h.status}
              </Badge>
              <span style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>
                {categorySymbol(h.category)} {h.category.replace("_", " ")}
              </span>
              {h.volatility_flag === "HIGH_VOLATILITY" && (
                <span style={{ fontSize: "9px", color: "var(--gold-bright)", border: "1px solid var(--gold-bright)", borderRadius: "4px", padding: "0.25rem 0.375rem" }}>
                  volatile
                </span>
              )}
            </div>
            <p style={{ fontSize: "13px", fontFamily: "var(--font-prose)", color: "var(--ink)", lineHeight: "1.4", margin: 0 }}>{h.statement}</p>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Evidence</div>
            <div
              style={{
                fontSize: "13px",
                fontFamily: "var(--font-body)",
                fontWeight: "600",
                color: evidenceColor,
              }}
            >
              {h.evidence_score > 0 ? "+" : ""}
              {h.evidence_score.toFixed(3)}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formal Test</div>
            <p style={{ fontSize: "12px", fontFamily: "var(--font-prose)", color: "var(--ink-soft)", fontStyle: "italic", margin: 0 }}>{h.formal_test}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Supporting</div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--lime)" }}>
                {h.supporting_count}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contradicting</div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--gold-bright)" }}>
                {h.contradicting_count}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Complexity</div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-soft)" }}>
                {h.complexity_penalty.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Oscillations</div>
              <div
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-body)",
                  fontWeight: "600",
                  color: h.confidence_oscillations > 4 ? "var(--gold-bright)" : "var(--ink-soft)",
                }}
              >
                {h.confidence_oscillations}
              </div>
            </div>
          </div>

          {h.proposed_mutation && (
            <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", padding: "0.75rem" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Proposed Mutation
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--gold-bright)" }}>
                  {h.proposed_mutation.type}
                </span>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>
                  {h.proposed_mutation.target}
                </span>
                {h.proposed_mutation.value !== 0 && (
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--ink-muted)" }}>
                    Δ{h.proposed_mutation.value > 0 ? "+" : ""}
                    {h.proposed_mutation.value.toFixed(3)}
                  </span>
                )}
              </div>
              {h.proposed_mutation.description && (
                <p style={{ fontSize: "11px", fontFamily: "var(--font-prose)", color: "var(--ink-muted)", marginTop: "0.25rem", margin: 0 }}>
                  {h.proposed_mutation.description}
                </p>
              )}
            </div>
          )}

          {h.created_at && (
            <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>
              Created {new Date(h.created_at).toLocaleString()}
              {h.last_evidence_at && (
                <> · Last evidence {new Date(h.last_evidence_at).toLocaleString()}</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tournaments Tab ──────────────────────────────────────────────────────────

function TournamentsTab({ data }: { data: EvoTournamentsResponse | null }) {
  if (!data) {
    return <div style={{ fontSize: "14px", color: "var(--ink-muted)", paddingBlock: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {[
          { label: "Active", value: data.stats.active },
          { label: "Converged", value: data.stats.converged },
          { label: "Total Created", value: data.stats.total_created },
          { label: "Total Converged", value: data.stats.total_converged },
        ].map((s, i) => (
          <Card key={s.label} className={`float-up float-up-${(i % 4) + 1}`}>
            <CardContent style={{ paddingTop: "1rem", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: "16px", fontFamily: "var(--font-body)", fontWeight: "600", color: "var(--ink-strong)" }}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.tournaments.length === 0 ? (
        <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", padding: "2rem 1rem", fontSize: "14px", color: "var(--ink-soft)", textAlign: "center" }}>
          No tournaments yet. Tournaments are created when hypotheses have similar evidence scores within 1.0 delta.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.tournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ tournament: t, index }: { tournament: EvoTournament; index: number }) {
  return (
    <Card className={`float-up float-up-${(index % 8) + 1}`}>
      <CardHeader>
        <CardTitle style={{ fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.id}</CardTitle>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <Badge
            variant={
              t.stage === "converged" ? "success" : t.stage === "running" ? "info" : "muted"
            }
          >
            {t.stage}
          </Badge>
          {t.winner_id && (
            <span style={{ fontSize: "9px", color: "var(--lime)" }}>
              ✓ {t.winner_id.slice(0, 8)}...
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", fontSize: "12px", color: "var(--ink-soft)" }}>
          <span>
            {t.sample_count} trials
            {t.sample_count < t.burn_in_trials && (
              <span style={{ color: "var(--gold-bright)" }}> (burn-in)</span>
            )}
          </span>
          <span>convergence @ {(t.convergence_threshold * 100).toFixed(0)}%</span>
        </div>

        {/* Beta distributions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {t.hypotheses.map((h) => {
            const isWinner = h.id === t.winner_id;
            const pct = Math.round(h.mean * 100);
            return (
              <div key={h.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontFamily: "var(--font-body)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "240px",
                      color: isWinner ? "var(--lime)" : "var(--ink-soft)",
                    }}
                  >
                    {isWinner ? "✓ " : ""}
                    {h.statement.slice(0, 60)}
                    {h.statement.length > 60 ? "…" : ""}
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-body)", color: "var(--ink-soft)", marginLeft: "0.5rem", flexShrink: 0 }}>
                    α={h.alpha.toFixed(1)} β={h.beta.toFixed(1)} μ={pct}%
                  </span>
                </div>
                <div style={{ height: "4px", borderRadius: "2px", background: "var(--bg)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "2px",
                      background: isWinner ? "var(--lime)" : "var(--lime-bright)",
                      transition: "all 300ms",
                      width: `${pct}%`,
                      opacity: isWinner ? 1 : 0.6,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Parameters Tab ───────────────────────────────────────────────────────────

function ParametersTab({ data }: { data: Record<string, number> | null }) {
  if (!data) {
    return <div style={{ fontSize: "14px", color: "var(--ink-muted)", paddingBlock: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  const grouped = groupParams(data);

  if (grouped.length === 0) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", padding: "2rem 1rem", fontSize: "14px", color: "var(--ink-soft)", textAlign: "center" }}>
        No parameters tuned yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {grouped.map(([group, items], groupIdx) => (
        <div key={group}>
          <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
            {group}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.5rem" }}>
            {items.map(([key, value], itemIdx) => {
              const paramName = key.split(".").slice(1).join(".");
              const normalised = Math.min(Math.max(value, 0), 1);
              return (
                <div
                  key={key}
                  className={`float-up float-up-${((groupIdx * 4 + itemIdx) % 8) + 1}`}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    padding: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                      {paramName}
                    </span>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "500", color: "var(--ink-strong)", marginLeft: "0.5rem", flexShrink: 0 }}>
                      {value.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ height: "3px", borderRadius: "1.5px", background: "var(--bg)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "1.5px",
                        background: "var(--lime)",
                        width: `${normalised * 100}%`,
                        transition: "width 300ms",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupParams(
  params: Record<string, number>,
): [string, [string, number][]][] {
  const groups: Record<string, [string, number][]> = {};
  for (const [key, value] of Object.entries(params)) {
    const group = key.split(".")[0] ?? "other";
    (groups[group] ??= []).push([key, value]);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

// ─── Self-Model Tab ───────────────────────────────────────────────────────────

function SelfModelTab({ data }: { data: EvoSelfModelResponse | null }) {
  if (!data) {
    return <div style={{ fontSize: "14px", color: "var(--ink-muted)", paddingBlock: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!data.available) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", padding: "2rem 1rem", fontSize: "14px", color: "var(--ink-soft)", textAlign: "center" }}>
        Self-model not yet computed. Run a consolidation cycle first.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {[
          {
            label: "Success Rate",
            value:
              data.success_rate !== undefined
                ? `${(data.success_rate * 100).toFixed(1)}%`
                : "—",
            accent:
              (data.success_rate ?? 0) >= 0.7
                ? "var(--lime)"
                : "var(--gold-bright)",
          },
          {
            label: "Constitutional Align.",
            value:
              data.mean_alignment !== undefined
                ? data.mean_alignment.toFixed(3)
                : "—",
            accent: "var(--ink-strong)",
          },
          {
            label: "Mean Regret",
            value:
              data.mean_regret !== undefined
                ? data.mean_regret.toFixed(4)
                : "—",
            accent:
              (data.mean_regret ?? 0) < 0.1
                ? "var(--lime)"
                : "var(--gold-bright)",
          },
          {
            label: "High Regret Events",
            value: data.high_regret_count ?? "—",
            accent:
              (data.high_regret_count ?? 0) === 0
                ? "var(--ink-soft)"
                : "var(--gold-bright)",
          },
        ].map((m, i) => (
          <Card key={m.label} className={`float-up float-up-${(i % 4) + 1}`}>
            <CardContent style={{ paddingTop: "1rem", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              <div style={{ fontSize: "16px", fontFamily: "var(--font-body)", fontWeight: "600", color: m.accent }}>
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Capability scores */}
        {data.capability_scores &&
          Object.keys(data.capability_scores).length > 0 && (
            <Card className="float-up float-up-1">
              <CardHeader>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
                  <span style={{ color: "var(--lime)" }}>◎</span> Capability Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {Object.entries(data.capability_scores)
                    .sort(([, a], [, b]) => b.success_rate - a.success_rate)
                    .map(([cap, score]) => (
                      <div key={cap}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "0.25rem" }}>
                          <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>{cap}</span>
                          <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>
                            {(score.success_rate * 100).toFixed(0)}%{" "}
                            <span style={{ color: "var(--ink-muted)" }}>
                              n={score.sample_count}
                            </span>
                          </span>
                        </div>
                        <div style={{ height: "4px", borderRadius: "2px", background: "var(--bg)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "2px",
                              background:
                                score.success_rate >= 0.7
                                  ? "var(--lime)"
                                  : score.success_rate >= 0.4
                                    ? "var(--gold-bright)"
                                    : "var(--gold-bright)",
                              width: `${score.success_rate * 100}%`,
                              transition: "all 300ms",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Regret by policy type */}
        {data.regret_by_policy_type &&
          Object.keys(data.regret_by_policy_type).length > 0 && (
            <Card className="float-up float-up-2">
              <CardHeader>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
                  <span style={{ color: "var(--lime-bright)" }}>◑</span> Regret by Policy
                </CardTitle>
                <span style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Systematic bias per decision policy
                </span>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {Object.entries(data.regret_by_policy_type)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .map(([policy, regret]) => (
                      <div
                        key={policy}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                          {policy}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontFamily: "var(--font-body)",
                            marginLeft: "0.5rem",
                            color: Math.abs(regret) > 0.2 ? "var(--gold-bright)" : "var(--ink-soft)",
                          }}
                        >
                          {regret > 0 ? "+" : ""}
                          {regret.toFixed(4)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Regret by goal domain */}
        {data.regret_by_goal_domain &&
          Object.keys(data.regret_by_goal_domain).length > 0 && (
            <Card className="float-up float-up-3" style={{ gridColumn: "1 / -1" }}>
              <CardHeader>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", fontFamily: "var(--font-display)", fontWeight: "600", color: "var(--ink)" }}>
                  <span style={{ color: "var(--gold-bright)" }}>◈</span> Regret by Goal Domain
                </CardTitle>
                <span style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Systematic bias per goal category
                </span>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
                  {Object.entries(data.regret_by_goal_domain)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .map(([domain, regret]) => (
                      <div
                        key={domain}
                        style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", padding: "0.75rem" }}
                      >
                        <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {domain}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontFamily: "var(--font-body)",
                            fontWeight: "600",
                            color: Math.abs(regret) > 0.2 ? "var(--gold-bright)" : "var(--ink-soft)",
                          }}
                        >
                          {regret > 0 ? "+" : ""}
                          {regret.toFixed(4)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      {data.updated_at && (
        <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>
          Updated at {new Date(data.updated_at).toLocaleString()}
          {data.total_outcomes_evaluated !== undefined && (
            <> · {data.total_outcomes_evaluated} outcomes evaluated</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stale Beliefs Tab ────────────────────────────────────────────────────────

function StaleBeliefTab({ data }: { data: EvoStaleBeliefResponse | null }) {
  if (!data) {
    return <div style={{ fontSize: "14px", color: "var(--ink-muted)", paddingBlock: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (data.total === 0) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid var(--lime)", background: "rgba(90, 200, 38, 0.04)", padding: "1.5rem", fontSize: "14px", color: "var(--lime)", textAlign: "center" }}>
        No stale beliefs — all beliefs are within their freshness window.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Badge variant="warning">{data.total} stale</Badge>
        <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
          age_factor &lt; 0.5 (one half-life elapsed)
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.beliefs.map((b, i) => {
          const isCritical = b.age_factor < 0.25;
          return (
            <div
              key={b.belief_id}
              className={`float-up float-up-${(i % 8) + 1}`}
              style={{
                borderRadius: "8px",
                border: isCritical ? "1px solid var(--gold-bright)" : "1px solid var(--gold-bright)",
                background: isCritical ? "rgba(232, 168, 32, 0.04)" : "rgba(232, 168, 32, 0.02)",
                padding: "0.75rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    {isCritical && (
                      <Badge variant="danger">critical</Badge>
                    )}
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>
                      {b.domain}
                    </span>
                  </div>
                  <div style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.belief_id}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Age Factor</div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--font-body)",
                      fontWeight: "600",
                      color: isCritical ? "var(--gold-bright)" : "var(--gold-bright)",
                    }}
                  >
                    {b.age_factor.toFixed(3)}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.25rem" }}>
                    t½ {b.half_life_days.toFixed(1)}d
                  </div>
                </div>
              </div>
              {b.priority > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ height: "3px", borderRadius: "1.5px", background: "var(--bg)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "1.5px",
                        background: isCritical ? "var(--gold-bright)" : "var(--gold-bright)",
                        width: `${Math.min(b.priority * 100, 100)}%`,
                        transition: "width 300ms",
                        opacity: isCritical ? 1 : 0.7,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--ink-muted)", marginTop: "0.25rem" }}>
                    priority {b.priority.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LearningPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] =
    useState<ConsolidationResponse | null>(null);

  const stats = useApi<EvoStatsResponse>(api.evoStats, { intervalMs: 10000 });
  const health = useApi<EvoHealthResponse>(api.evoHealth, { intervalMs: 10000 });
  const hypotheses = useApi<EvoHypothesesResponse>(api.evoHypotheses, {
    intervalMs: tab === "hypotheses" ? 10000 : 60000,
  });
  const tournaments = useApi<EvoTournamentsResponse>(api.evoTournaments, {
    intervalMs: tab === "tournaments" ? 10000 : 60000,
  });
  const params = useApi<EvoParametersResponse>(api.evoParameters, {
    intervalMs: tab === "parameters" ? 15000 : 60000,
  });
  const selfModel = useApi<EvoSelfModelResponse>(api.evoSelfModel, {
    intervalMs: tab === "self-model" ? 15000 : 60000,
  });
  const staleBeliefs = useApi<EvoStaleBeliefResponse>(api.evoStaleBeliefs, {
    intervalMs: tab === "beliefs" ? 15000 : 60000,
  });
  const patterns = useApi<EvoPatternsResponse>(api.evoPatterns, {
    intervalMs: 10000,
  });

  const triggerConsolidation = useCallback(async () => {
    setConsolidating(true);
    try {
      const res = await api.triggerConsolidation();
      setConsolidationResult(res);
      stats.refetch();
      params.refetch();
      hypotheses.refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setConsolidating(false);
    }
  }, [stats, params, hypotheses]);

  const hypothesisCount = hypotheses.data?.total ?? 0;
  const tournamentCount = tournaments.data?.stats.active ?? 0;
  const staleCount = staleBeliefs.data?.total ?? 0;

  return (
    <div style={{ maxWidth: "80rem", marginLeft: "auto", marginRight: "auto" }}>
      <PageHeader
        title="Learning"
        description="Evo — evolutionary hypotheses, evidence tournaments, and parameter tuning"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {health.data && (
            <Badge variant={health.data.initialized ? "success" : "warning"}>
              {health.data.initialized ? "active" : "initializing"}
            </Badge>
          )}
          <Button
            onClick={triggerConsolidation}
            disabled={consolidating}
            size="sm"
          >
            {consolidating ? "Consolidating..." : "Consolidate"}
          </Button>
        </div>
      </PageHeader>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", overflowX: "auto" }}>
        {TABS.map((t) => {
          const badge =
            t.id === "hypotheses"
              ? hypothesisCount
              : t.id === "tournaments"
                ? tournamentCount
                : t.id === "beliefs"
                  ? staleCount
                  : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "500",
                whiteSpace: "nowrap",
                transition: "all 200ms",
                border: tab === t.id ? "1px solid var(--lime)" : "1px solid transparent",
                background: tab === t.id ? "var(--lime-bright)" : "transparent",
                color: tab === t.id ? "var(--ink-strong)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              {t.label}
              {badge !== null && badge > 0 && (
                <span
                  style={{
                    marginLeft: "0.375rem",
                    fontSize: "9px",
                    padding: "0.25rem 0.375rem",
                    borderRadius: "9999px",
                    background: t.id === "beliefs" && staleCount > 0 ? "var(--gold-bright)" : "var(--bg)",
                    color: t.id === "beliefs" && staleCount > 0 ? "var(--ink-strong)" : "var(--ink-soft)",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          stats={stats.data}
          health={health.data}
          patterns={patterns.data}
          consolidationResult={consolidationResult}
          consolidating={consolidating}
          onConsolidate={triggerConsolidation}
        />
      )}
      {tab === "hypotheses" && <HypothesesTab data={hypotheses.data} />}
      {tab === "tournaments" && <TournamentsTab data={tournaments.data} />}
      {tab === "parameters" && <ParametersTab data={params.data} />}
      {tab === "self-model" && <SelfModelTab data={selfModel.data} />}
      {tab === "beliefs" && <StaleBeliefTab data={staleBeliefs.data} />}
    </div>
  );
}
