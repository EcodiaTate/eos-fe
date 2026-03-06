"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import {
  api,
  type InvariantsResponse,
  type DriftResponse,
  type AutonomyResponse,
  type GovernanceReviewsResponse,
  type GovernanceHistoryResponse,
  type ShadowStatusResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DriveAlignmentPanel } from "@/components/equor/DriveAlignment";
import { AmendmentSubmitForm } from "@/components/equor/AmendmentSubmitForm";
import { AmendmentPipeline } from "@/components/equor/AmendmentPipeline";
import { ReviewInspector } from "@/components/equor/ReviewInspector";

// ─── Tab types ────────────────────────────────────────────────────

type Tab = "overview" | "reviews" | "drives" | "amendments" | "inspector" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "drives", label: "Drive Alignment" },
  { id: "amendments", label: "Amendments" },
  { id: "inspector", label: "Inspector" },
  { id: "history", label: "History" },
];

// ─── Verdict badge variant ────────────────────────────────────────

function verdictVariant(verdict: string): "success" | "warning" | "danger" | "muted" {
  if (verdict === "approved") return "success";
  if (verdict === "modified" || verdict === "escalated" || verdict === "suspended") return "warning";
  if (verdict === "blocked") return "danger";
  return "muted";
}

// ─── Sub-panels ───────────────────────────────────────────────────

function AutonomyCard({ data }: { data: AutonomyResponse | null }) {
  const levelColors = ["", "#5ac826", "#78e03a", "#e8a820"];
  const ringBgColor =
    data?.current_level === 1 ? "rgba(90, 200, 38, 0.08)" :
    data?.current_level === 2 ? "rgba(120, 224, 58, 0.08)" :
    "rgba(232, 168, 32, 0.08)";
  const ringBorderColor =
    data?.current_level === 1 ? "rgba(90, 200, 38, 0.35)" :
    data?.current_level === 2 ? "rgba(120, 224, 58, 0.35)" :
    "rgba(232, 168, 32, 0.35)";

  return (
    <Card glow className="float-up float-up-1">
      <CardHeader>
        <CardTitle>◉ Autonomy Level</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: `2px solid ${ringBorderColor}`,
                  background: ringBgColor,
                }}
              >
                <span style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: levelColors[data.current_level] ?? "var(--ink-muted)",
                  fontFamily: "var(--font-display)",
                }}>
                  {data.current_level}
                </span>
              </div>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-strong)",
                  fontFamily: "var(--font-display)",
                }}>
                  {data.level_name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  marginTop: 2,
                }}>
                  Level {data.current_level} of 3
                </div>
              </div>
            </div>

            {data.current_level < 3 && data.promotion_eligibility && (
              <div style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <div style={{
                  fontSize: 9,
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                }}>
                  Next Promotion
                </div>
                <div style={{
                  fontSize: 11,
                  color: "var(--ink-soft)",
                }}>
                  {data.promotion_eligibility.required_evidence}
                </div>
                <div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 9,
                    color: "var(--ink-muted)",
                    marginBottom: 4,
                    fontFamily: "var(--font-body)",
                  }}>
                    <span>Readiness</span>
                    <span>
                      {(data.promotion_eligibility.current_readiness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${data.promotion_eligibility.current_readiness * 100}%`,
                        background: data.current_level === 1 ? "var(--lime)" : "var(--lime-bright)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {data.current_level === 3 && (
              <div style={{
                fontSize: 11,
                color: "var(--lime)",
                paddingTop: 4,
                fontFamily: "var(--font-prose)",
              }}>
                Steward — full autonomy granted
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>
        )}
      </CardContent>
    </Card>
  );
}

function DriftCard({ data }: { data: DriftResponse | null }) {
  const driftPct = data ? data.drift_level * 100 : 0;
  const driftColor =
    !data
      ? "var(--ink-muted)"
      : data.drift_level < 0.2
        ? "var(--lime)"
        : data.drift_level < 0.5
          ? "var(--gold-bright)"
          : "var(--status-danger)";

  return (
    <Card className="float-up float-up-2">
      <CardHeader>
        <CardTitle>◎ Constitutional Drift</CardTitle>
        {data && (
          <Badge
            variant={
              data.drift_level < 0.2 ? "success" : data.drift_level < 0.5 ? "warning" : "danger"
            }
          >
            {driftPct.toFixed(0)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${driftPct}%`, background: driftColor }}
              />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              textAlign: "center",
            }}>
              <div>
                <div style={{
                  fontSize: 10,
                  color: "var(--lime)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}>
                  &lt;20%
                </div>
                <div style={{
                  fontSize: 9,
                  color: "var(--ink-muted)",
                  marginTop: 2,
                }}>
                  Log only
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 10,
                  color: "var(--gold-bright)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}>
                  20–50%
                </div>
                <div style={{
                  fontSize: 9,
                  color: "var(--ink-muted)",
                  marginTop: 2,
                }}>
                  Self-correct
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 10,
                  color: "var(--status-danger)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}>
                  &gt;80%
                </div>
                <div style={{
                  fontSize: 9,
                  color: "var(--ink-muted)",
                  marginTop: 2,
                }}>
                  Demote
                </div>
              </div>
            </div>

            {(data.violations?.length ?? 0) > 0 && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: "var(--status-danger)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  marginBottom: 4,
                }}>
                  Violations
                </div>
                {data.violations.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: "var(--status-danger)",
                      borderLeft: "2px solid rgba(220, 38, 38, 0.35)",
                      paddingLeft: 8,
                      marginBottom: 4,
                    }}
                  >
                    {JSON.stringify(v)}
                  </div>
                ))}
              </div>
            )}

            {(data.warnings?.length ?? 0) > 0 && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: "var(--gold-bright)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  marginBottom: 4,
                }}>
                  Warnings
                </div>
                {data.warnings.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: "var(--gold)",
                      borderLeft: "2px solid rgba(176, 125, 10, 0.35)",
                      paddingLeft: 8,
                      marginBottom: 4,
                    }}
                  >
                    {JSON.stringify(w)}
                  </div>
                ))}
              </div>
            )}

            {(data.violations?.length ?? 0) === 0 && (data.warnings?.length ?? 0) === 0 && (
              <div style={{
                fontSize: 11,
                color: "var(--ink-muted)",
                textAlign: "center",
                padding: "4px 0",
              }}>
                Constitution holding — no drift detected
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>
        )}
      </CardContent>
    </Card>
  );
}

function ShadowStatusCard({ data }: { data: ShadowStatusResponse | null }) {
  if (!data) return null;
  if (!data.active) {
    return (
      <div style={{
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-card-alt)",
        padding: "12px 16px",
        fontSize: 12,
        color: "var(--ink-muted)",
        textAlign: "center",
      }}>
        No shadow period active
      </div>
    );
  }
  const divergePct = ((data.divergence_rate ?? 0) * 100).toFixed(1);
  const divergeColor =
    (data.divergence_rate ?? 0) < 0.1
      ? "var(--lime)"
      : (data.divergence_rate ?? 0) < 0.15
        ? "var(--gold-bright)"
        : "var(--status-danger)";

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--gold-bright, var(--border-accent))",
      background: "var(--gold-ghost)",
      padding: "12px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: 11,
          color: "var(--gold-bright)",
          fontWeight: 600,
          fontFamily: "var(--font-body)",
        }}>
          Shadow Period Active
        </span>
        <Badge variant="warning">shadow</Badge>
      </div>
      <div style={{
        fontSize: 10,
        color: "var(--ink-soft)",
        fontFamily: "var(--font-body)",
      }}>
        Proposal: {data.proposal_id}
      </div>
      <div style={{
        display: "flex",
        gap: 16,
        fontSize: 10,
        fontFamily: "var(--font-body)",
      }}>
        <span style={{ color: "var(--ink-muted)" }}>Verdicts: {data.verdict_count ?? 0}</span>
        <span style={{ color: divergeColor }}>Divergence: {divergePct}%</span>
        {(data.invariant_violations ?? 0) > 0 && (
          <span style={{ color: "var(--status-danger)" }}>⚠ {data.invariant_violations} invariant violations</span>
        )}
      </div>
      {data.ends_at && (
        <div style={{
          fontSize: 9,
          color: "var(--ink-muted)",
          fontFamily: "var(--font-body)",
        }}>
          Ends: {new Date(data.ends_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function InvariantsTab({ data }: { data: InvariantsResponse | null }) {
  if (!data) return <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Hardcoded */}
      {data.hardcoded_invariants.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              fontSize: 9,
              color: "var(--ink-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}>
              Hardcoded (Sacred — Immutable)
            </div>
            <Badge variant="danger">{data.hardcoded_invariants.length}</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.hardcoded_invariants.map((inv) => (
              <div
                key={inv.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card-alt)",
                  padding: "10px 12px",
                }}
              >
                <Badge variant={inv.severity === "critical" ? "danger" : "warning"}>
                  {inv.severity}
                </Badge>
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                  }}>
                    {inv.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "var(--ink-soft)",
                    marginTop: 3,
                    lineHeight: 1.6,
                  }}>
                    {inv.rule}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community */}
      {data.community_invariants.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              fontSize: 9,
              color: "var(--ink-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}>
              Community-Defined (Amendable)
            </div>
            <Badge variant="muted">{data.community_invariants.length}</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.community_invariants.map((inv) => (
              <div
                key={inv.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card-alt)",
                  padding: "10px 12px",
                }}
              >
                <Badge variant="muted">{inv.severity}</Badge>
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                  }}>
                    {inv.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "var(--ink-soft)",
                    marginTop: 3,
                    lineHeight: 1.6,
                  }}>
                    {inv.rule}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.hardcoded_invariants.length === 0 && data.community_invariants.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "32px 0",
          fontSize: 11,
          color: "var(--ink-muted)",
        }}>
          No invariants loaded
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ data }: { data: GovernanceReviewsResponse | null }) {
  if (!data) return <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>;
  const reviews = data.recent_reviews ?? [];

  return reviews.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reviews.map((review) => (
        <div
          key={review.intent_id}
          style={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-card-alt)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Badge variant={verdictVariant(review.verdict)}>{review.verdict}</Badge>
            <span style={{
              fontSize: 9,
              color: "var(--ink-muted)",
              fontFamily: "var(--font-body)",
            }}>
              {new Date(review.timestamp).toLocaleString()}
            </span>
          </div>
          <div style={{
            fontSize: 11,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
            marginBottom: 8,
          }}>
            {review.reasoning}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {(["coherence", "care", "growth", "honesty"] as const).map((d) => {
              const v = review.drive_alignment[d];
              return (
                <span
                  key={d}
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-body)",
                    color: v >= 0 ? "var(--lime)" : "var(--status-danger)",
                    fontWeight: 600,
                  }}
                >
                  {d[0].toUpperCase()}: {v >= 0 ? "+" : ""}
                  {v.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div style={{
      textAlign: "center",
      padding: "32px 0",
      fontSize: 11,
      color: "var(--ink-muted)",
    }}>
      No reviews yet. Equor has not evaluated any intents.
    </div>
  );
}

function HistoryTab({ data }: { data: GovernanceHistoryResponse | null }) {
  if (!data) return <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>;
  const events = data.events ?? [];

  return events.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((ev, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            fontSize: 10,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-card-alt)",
            padding: "10px 12px",
          }}
        >
          <span style={{
            color: "var(--ink-muted)",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
          }}>
            {new Date(ev.timestamp).toLocaleString()}
          </span>
          <Badge variant="muted">{ev.event_type}</Badge>
          <span style={{
            color: "var(--ink-soft)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "var(--font-body)",
          }}>
            {JSON.stringify(ev.details)}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <div style={{
      textAlign: "center",
      padding: "32px 0",
      fontSize: 11,
      color: "var(--ink-muted)",
    }}>
      No governance events recorded
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const invariants = useApi<InvariantsResponse>(api.invariants, { intervalMs: 30000 });
  const drift = useApi<DriftResponse>(api.drift, { intervalMs: 10000 });
  const autonomy = useApi<AutonomyResponse>(api.autonomy, { intervalMs: 30000 });
  const reviews = useApi<GovernanceReviewsResponse>(api.governanceReviews, { intervalMs: 10000 });
  const history = useApi<GovernanceHistoryResponse>(api.governanceHistory, {
    intervalMs: 30000,
    enabled: activeTab === "history",
  });
  const shadowStatus = useApi<ShadowStatusResponse>(api.amendmentShadowStatus, {
    intervalMs: 15000,
    enabled: activeTab === "amendments" || activeTab === "overview",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Governance"
        description="Equor — constitutional ethics, invariants, autonomy, drift, and amendments"
      />

      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              borderRadius: "10px 10px 0 0",
              transition: "all 0.2s ease",
              border: "none",
              background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid var(--lime)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ paddingTop: 4 }}>
        {/* Overview tab */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Shadow status banner */}
            <ShadowStatusCard data={shadowStatus.data} />

            {/* Row 1: Autonomy + Drift */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}>
              <AutonomyCard data={autonomy.data} />
              <DriftCard data={drift.data} />
            </div>

            {/* Row 2: Invariant counts */}
            <Card className="float-up float-up-3">
              <CardHeader>
                <CardTitle>≡ Constitution Summary</CardTitle>
                {invariants.data && (
                  <Badge variant="muted">
                    {(invariants.data.hardcoded_invariants?.length ?? 0) +
                      (invariants.data.community_invariants?.length ?? 0)}{" "}
                    invariants
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {invariants.data ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--status-danger)",
                        fontFamily: "var(--font-display)",
                      }}>
                        {invariants.data.hardcoded_invariants.length}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: "var(--ink-muted)",
                        marginTop: 4,
                        fontFamily: "var(--font-body)",
                      }}>
                        Immutable (sacred)
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--lime)",
                        fontFamily: "var(--font-display)",
                      }}>
                        {invariants.data.community_invariants.length}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: "var(--ink-muted)",
                        marginTop: 4,
                        fontFamily: "var(--font-body)",
                      }}>
                        Community-defined
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</div>
                )}
              </CardContent>
            </Card>

            {/* Row 3: Recent reviews summary */}
            <Card className="float-up float-up-4">
              <CardHeader>
                <CardTitle>↑ Recent Reviews</CardTitle>
                {reviews.data && (
                  <Badge variant="muted">{reviews.data.recent_reviews?.length ?? 0}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {reviews.data && (reviews.data.recent_reviews?.length ?? 0) > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {reviews.data.recent_reviews.slice(0, 10).map((r) => (
                      <Badge key={r.intent_id} variant={verdictVariant(r.verdict)}>
                        {r.verdict}
                      </Badge>
                    ))}
                    {reviews.data.recent_reviews.length > 10 && (
                      <span style={{
                        fontSize: 10,
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)",
                      }}>
                        +{reviews.data.recent_reviews.length - 10} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>No reviews yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <Card className="float-up float-up-1">
            <CardHeader>
              <CardTitle>◎ Constitutional Reviews</CardTitle>
              {reviews.data && (
                <Badge variant="muted">{reviews.data.recent_reviews?.length ?? 0} recent</Badge>
              )}
            </CardHeader>
            <CardContent>
              <ReviewsTab data={reviews.data} />
            </CardContent>
          </Card>
        )}

        {/* Drive alignment tab */}
        {activeTab === "drives" && (
          <Card className="float-up float-up-1">
            <CardHeader>
              <CardTitle>◈ Drive Alignment</CardTitle>
              <div style={{
                fontSize: 10,
                color: "var(--ink-soft)",
                fontFamily: "var(--font-prose)",
              }}>
                Four constitutional drives — computed mean alignment over recent reviews
              </div>
            </CardHeader>
            <CardContent>
              <DriveAlignmentPanel reviews={reviews.data?.recent_reviews ?? null} />
            </CardContent>
          </Card>
        )}

        {/* Amendments tab */}
        {activeTab === "amendments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ShadowStatusCard data={shadowStatus.data} />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}>
              <AmendmentSubmitForm
                onSubmitted={() => {
                  shadowStatus.refetch();
                }}
              />
              <AmendmentPipeline />
            </div>
            <Card className="float-up float-up-3">
              <CardHeader>
                <CardTitle>▣ Amendment Process</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 4,
                  textAlign: "center",
                }}>
                  {[
                    { stage: "1", label: "Propose", desc: "Submit with evidence" },
                    { stage: "2", label: "Validate", desc: "Structural checks" },
                    { stage: "3", label: "Shadow", desc: "7-day parallel run" },
                    { stage: "4", label: "Drift Gate", desc: "≤15% divergence" },
                    { stage: "5", label: "Vote", desc: "75% supermajority" },
                    { stage: "6", label: "Adopt", desc: "Apply change" },
                    { stage: "7", label: "Cooldown", desc: "90-day lock" },
                  ].map(({ stage, label, desc }) => (
                    <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        margin: "0 auto",
                        borderRadius: "50%",
                        background: "var(--bg-card-alt)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <span style={{
                          fontSize: 8,
                          color: "var(--ink-muted)",
                          fontWeight: 600,
                          fontFamily: "var(--font-body)",
                        }}>
                          {stage}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: "var(--ink-soft)",
                        fontFamily: "var(--font-body)",
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontSize: 7,
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)",
                      }}>
                        {desc}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inspector tab */}
        {activeTab === "inspector" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ReviewInspector />
            <Card className="float-up float-up-2">
              <CardHeader>
                <CardTitle>◈ Invariants</CardTitle>
              </CardHeader>
              <CardContent>
                <InvariantsTab data={invariants.data} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <Card className="float-up float-up-1">
            <CardHeader>
              <CardTitle>⚡ Governance History</CardTitle>
              {history.data && (
                <Badge variant="muted">{history.data.events?.length ?? 0} events</Badge>
              )}
            </CardHeader>
            <CardContent>
              <HistoryTab data={history.data} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
