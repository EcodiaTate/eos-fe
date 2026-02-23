"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type InvariantsResponse,
  type DriftResponse,
  type AutonomyResponse,
  type GovernanceReviewsResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GovernancePage() {
  const invariants = useApi<InvariantsResponse>(api.invariants, {
    intervalMs: 30000,
  });
  const drift = useApi<DriftResponse>(api.drift, { intervalMs: 10000 });
  const autonomy = useApi<AutonomyResponse>(api.autonomy, {
    intervalMs: 30000,
  });
  const reviews = useApi<GovernanceReviewsResponse>(api.governanceReviews, {
    intervalMs: 10000,
  });
  const constitution = useApi<Record<string, unknown>>(api.constitution, {
    intervalMs: 60000,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Governance"
        description="Equor — constitutional ethics, invariants, and drift"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Autonomy */}
        <Card glow>
          <CardHeader>
            <CardTitle>Autonomy Level</CardTitle>
          </CardHeader>
          <CardContent>
            {autonomy.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full border-2 border-teal-400/30 bg-teal-400/[0.06]">
                    <span className="text-2xl font-bold text-teal-400/70">
                      {autonomy.data.current_level}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/80">
                      {autonomy.data.level_name}
                    </div>
                    <div className="text-xs text-white/30">
                      Level {autonomy.data.current_level} of 3
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
                    Promotion
                  </div>
                  <div className="text-xs text-white/40">
                    {autonomy.data.promotion_eligibility.required_evidence}
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-teal-400/50 transition-all"
                      style={{
                        width: `${autonomy.data.promotion_eligibility.current_readiness * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Drift */}
        <Card>
          <CardHeader>
            <CardTitle>Constitutional Drift</CardTitle>
            {drift.data && (
              <Badge
                variant={
                  drift.data.drift_level < 0.2
                    ? "success"
                    : drift.data.drift_level < 0.5
                      ? "warning"
                      : "danger"
                }
              >
                {(drift.data.drift_level * 100).toFixed(0)}%
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {drift.data ? (
              <div className="space-y-3">
                <div className="h-2 w-full rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${drift.data.drift_level * 100}%`,
                      background:
                        drift.data.drift_level < 0.2
                          ? "#34d399"
                          : drift.data.drift_level < 0.5
                            ? "#fbbf24"
                            : "#f87171",
                    }}
                  />
                </div>

                {(drift.data.violations?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-red-400/60 uppercase tracking-widest mb-1">
                      Violations
                    </div>
                    {drift.data.violations.map((v, i) => (
                      <div
                        key={i}
                        className="text-xs text-red-400/70 border-l-2 border-red-400/30 pl-2 mb-1"
                      >
                        {JSON.stringify(v)}
                      </div>
                    ))}
                  </div>
                )}

                {(drift.data.warnings?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-amber-400/60 uppercase tracking-widest mb-1">
                      Warnings
                    </div>
                    {drift.data.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="text-xs text-amber-400/60 border-l-2 border-amber-400/30 pl-2 mb-1"
                      >
                        {JSON.stringify(w)}
                      </div>
                    ))}
                  </div>
                )}

                {(drift.data.violations?.length ?? 0) === 0 &&
                  (drift.data.warnings?.length ?? 0) === 0 && (
                    <div className="text-xs text-white/25 text-center py-2">
                      No drift detected. Constitution is holding.
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Invariants */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Invariants</CardTitle>
          </CardHeader>
          <CardContent>
            {invariants.data ? (
              <div className="space-y-4">
                {(invariants.data.hardcoded_invariants?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Hardcoded (Sacred)
                    </div>
                    <div className="space-y-1.5">
                      {invariants.data.hardcoded_invariants.map((inv) => (
                        <div
                          key={inv.name}
                          className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                        >
                          <Badge
                            variant={
                              inv.severity === "critical" ? "danger" : "warning"
                            }
                          >
                            {inv.severity}
                          </Badge>
                          <div>
                            <div className="text-xs text-white/60 font-medium">
                              {inv.name}
                            </div>
                            <div className="text-[11px] text-white/35 mt-0.5">
                              {inv.rule}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(invariants.data.community_invariants?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Community-Defined
                    </div>
                    <div className="space-y-1.5">
                      {invariants.data.community_invariants.map((inv) => (
                        <div
                          key={inv.name}
                          className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                        >
                          <Badge variant="muted">{inv.severity}</Badge>
                          <div>
                            <div className="text-xs text-white/60 font-medium">
                              {inv.name}
                            </div>
                            <div className="text-[11px] text-white/35 mt-0.5">
                              {inv.rule}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Constitutional Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.data ? (
              (reviews.data.recent_reviews?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {reviews.data.recent_reviews.map((review) => (
                    <div
                      key={review.intent_id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            review.verdict === "approved"
                              ? "success"
                              : review.verdict === "modified"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {review.verdict}
                        </Badge>
                        <span className="text-[10px] text-white/20">
                          {new Date(review.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        {review.reasoning}
                      </div>
                      <div className="mt-2 flex gap-3">
                        {Object.entries(review.drive_alignment).map(
                          ([drive, score]) => (
                            <span
                              key={drive}
                              className="text-[10px] text-white/25"
                            >
                              {drive}: {(score as number).toFixed(2)}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/25">
                  No reviews yet. Equor has not evaluated any intents.
                </div>
              )
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
