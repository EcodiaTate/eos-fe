"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type EvoStatsResponse,
  type EvoParametersResponse,
  type ConsolidationResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";

export default function LearningPage() {
  const stats = useApi<EvoStatsResponse>(api.evoStats, { intervalMs: 10000 });
  const params = useApi<EvoParametersResponse>(api.evoParameters, {
    intervalMs: 30000,
  });
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] =
    useState<ConsolidationResponse | null>(null);

  const triggerConsolidation = useCallback(async () => {
    setConsolidating(true);
    try {
      const res = await api.triggerConsolidation();
      setConsolidationResult(res);
      stats.refetch();
      params.refetch();
    } catch (err) {
      setConsolidationResult(null);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setConsolidating(false);
    }
  }, [stats, params]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Learning"
        description="Evo — hypotheses, evidence, and parameter tuning"
      >
        <Button
          onClick={triggerConsolidation}
          disabled={consolidating}
          size="sm"
        >
          {consolidating ? "Consolidating..." : "Trigger Consolidation"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Hypothesis Engine</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Active", value: stats.data.hypotheses_active },
                    { label: "Supported", value: stats.data.hypotheses_supported },
                    { label: "Archived", value: stats.data.hypotheses_archived },
                    { label: "Procedures", value: stats.data.procedures_extracted },
                    { label: "Params Adjusted", value: stats.data.parameters_adjusted },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-[10px] text-white/25">{s.label}</div>
                      <div className="text-sm text-white/70 tabular-nums font-medium">
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {stats.data.last_consolidation && (
                  <div className="border-t border-white/[0.06] pt-3">
                    <div className="text-[10px] text-white/25">
                      Last Consolidation
                    </div>
                    <div className="text-xs text-white/50">
                      {new Date(stats.data.last_consolidation).toLocaleString()}
                    </div>
                  </div>
                )}

                {stats.data.hypotheses_active === 0 &&
                  stats.data.procedures_extracted === 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-400">
                      No hypotheses or procedures. Evo needs percepts and
                      episodes to learn from. Send messages and events first.
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Last Consolidation Result */}
        {consolidationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Consolidation Result</CardTitle>
              <Badge
                variant={
                  consolidationResult.status === "completed"
                    ? "success"
                    : "muted"
                }
              >
                {consolidationResult.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Duration", value: `${consolidationResult.duration_ms}ms` },
                  { label: "Hypotheses Evaluated", value: consolidationResult.hypotheses_evaluated },
                  { label: "Hypotheses Integrated", value: consolidationResult.hypotheses_integrated },
                  { label: "Procedures Extracted", value: consolidationResult.procedures_extracted },
                  { label: "Params Adjusted", value: consolidationResult.parameters_adjusted },
                  { label: "Total Delta", value: consolidationResult.total_parameter_delta.toFixed(4) },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] text-white/25">{s.label}</div>
                    <div className="text-sm text-white/70 tabular-nums">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tunable Parameters */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tunable Parameters</CardTitle>
            <span className="text-[10px] text-white/20">
              27 parameters across Atune, Nova, Voxis, Memory
            </span>
          </CardHeader>
          <CardContent>
            {params.data ? (
              <div className="space-y-4">
                {groupParams(params.data).map(([group, items]) => (
                  <div key={group}>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      {group}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5"
                        >
                          <span className="text-xs text-white/40 font-mono truncate max-w-[200px]">
                            {key.split(".").slice(1).join(".")}
                          </span>
                          <span className="text-xs text-white/60 tabular-nums font-medium">
                            {typeof value === "number"
                              ? value.toFixed(4)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
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
