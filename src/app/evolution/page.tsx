"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type SimulaHistoryResponse,
  type SimulaProposalsResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EvolutionPage() {
  const history = useApi<SimulaHistoryResponse>(api.simulaHistory, {
    intervalMs: 30000,
  });
  const proposals = useApi<SimulaProposalsResponse>(api.simulaProposals, {
    intervalMs: 10000,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Evolution"
        description="Simula — self-modification proposals, history, and versioning"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Version */}
        <Card glow>
          <CardHeader>
            <CardTitle>Config Version</CardTitle>
          </CardHeader>
          <CardContent>
            {history.data ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-14 w-14 rounded-full border-2 border-indigo-400/30 bg-indigo-400/[0.06]">
                  <span className="text-2xl font-bold text-indigo-400/70">
                    {history.data.current_version}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-white/60">
                    Current version
                  </div>
                  <div className="text-xs text-white/30">
                    {history.data.records?.length ?? 0} changes applied
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Active Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
            {proposals.data && (
              <Badge variant="muted">{proposals.data.total} total</Badge>
            )}
          </CardHeader>
          <CardContent>
            {proposals.data ? (
              (proposals.data.proposals?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {proposals.data.proposals.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-white/60">
                          {p.description}
                        </div>
                        <Badge
                          variant={
                            p.status === "applied"
                              ? "success"
                              : p.status === "rejected" ||
                                  p.status === "rolled_back"
                                ? "danger"
                                : "info"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex gap-3">
                        <span className="text-[10px] text-white/20">
                          {p.category}
                        </span>
                        <span className="text-[10px] text-white/20">
                          src: {p.source}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/25">
                  No proposals yet. Evo and governance can submit
                  self-evolution proposals.
                </div>
              )
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Evolution History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.data ? (
              (history.data.records?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {history.data.records.map((record) => (
                    <div
                      key={record.proposal_id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-white/60">
                          {record.description}
                        </div>
                        <div className="flex gap-1.5">
                          <Badge
                            variant={
                              record.simulation_risk === "low"
                                ? "success"
                                : record.simulation_risk === "moderate"
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {record.simulation_risk}
                          </Badge>
                          {record.rolled_back && (
                            <Badge variant="danger">rolled back</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 flex gap-3">
                        <span className="text-[10px] text-white/20">
                          {record.category}
                        </span>
                        <span className="text-[10px] text-white/20">
                          v{record.from_version} → v{record.to_version}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {new Date(record.applied_at).toLocaleString()}
                        </span>
                      </div>
                      {(record.files_changed?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {record.files_changed.map((f) => (
                            <span
                              key={f}
                              className="text-[10px] text-white/20 font-mono bg-white/[0.03] rounded px-1 py-0.5"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/25">
                  No evolution records. Aurora has not modified herself yet.
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
