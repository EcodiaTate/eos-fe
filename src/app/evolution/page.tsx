"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type SimulaHistoryResponse,
  type SimulaProposalsResponse,
  type SimulaStatsResponse,
  type SimulaVersionResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimulaStats } from "@/components/simula/simula-stats";
import { ProposalSubmitForm } from "@/components/simula/proposal-submit-form";
import { ProposalList } from "@/components/simula/proposal-list";
import { VersionChain } from "@/components/simula/version-chain";

const RISK_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  low: "success",
  moderate: "warning",
  high: "danger",
  unacceptable: "danger",
};

export default function EvolutionPage() {
  const stats = useApi<SimulaStatsResponse>(api.simulaStats, { intervalMs: 5000 });
  const history = useApi<SimulaHistoryResponse>(() => api.simulaHistory(50), { intervalMs: 15000 });
  const proposals = useApi<SimulaProposalsResponse>(api.simulaProposals, { intervalMs: 3000 });
  const version = useApi<SimulaVersionResponse>(api.simulaVersion, { intervalMs: 15000 });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Evolution"
        description="Simula — self-modification proposals, simulation pipeline, and version history"
      />

      {/* Row 1: Stats + Submit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimulaStats data={stats.data} loading={stats.loading} />
        <ProposalSubmitForm onSubmitted={() => { proposals.refetch(); stats.refetch(); version.refetch(); }} />
      </div>

      {/* Row 2: Active proposals + Version chain */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProposalList
          data={proposals.data}
          loading={proposals.loading}
          onRefresh={() => { proposals.refetch(); stats.refetch(); }}
        />
        <VersionChain data={version.data} loading={version.loading} />
      </div>

      {/* Row 3: Full evolution history */}
      <Card>
        <CardHeader>
          <CardTitle>Evolution History</CardTitle>
          {history.data && (
            <Badge variant="muted">{history.data.records.length} records</Badge>
          )}
        </CardHeader>
        <CardContent>
          {history.loading && !history.data && (
            <div className="text-sm text-white/20">Loading…</div>
          )}
          {history.data && history.data.records.length === 0 && (
            <div className="text-center py-8 text-xs text-white/25">
              No evolution records. Simula has not modified herself yet.
            </div>
          )}
          {history.data && history.data.records.length > 0 && (
            <div className="space-y-2">
              {history.data.records.map((record) => (
                <div
                  key={record.proposal_id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-white/60 flex-1 min-w-0">
                      {record.description}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Badge variant={RISK_VARIANT[record.simulation_risk] ?? "muted"}>
                        {record.simulation_risk}
                      </Badge>
                      {record.rolled_back && (
                        <Badge variant="danger">rolled back</Badge>
                      )}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="mt-1.5 flex gap-3 flex-wrap">
                    <span className="text-[10px] text-white/20">{record.category}</span>
                    <span className="text-[10px] text-white/20">
                      v{record.from_version} → v{record.to_version}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {new Date(record.applied_at).toLocaleString()}
                    </span>
                    {record.simulation_episodes_tested !== undefined && record.simulation_episodes_tested > 0 && (
                      <span className="text-[10px] text-white/20">
                        {record.simulation_episodes_tested} eps tested
                      </span>
                    )}
                    {record.dependency_blast_radius !== undefined && record.dependency_blast_radius > 0 && (
                      <span className="text-[10px] text-white/20">
                        blast radius: {record.dependency_blast_radius}
                      </span>
                    )}
                  </div>

                  {/* Verification badges */}
                  {(record.formal_verification_status || record.lean_proof_status || record.synthesis_status || record.repair_agent_status) && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {record.formal_verification_status && record.formal_verification_status !== "" && (
                        <Badge variant={record.formal_verification_status === "verified" ? "success" : "muted"} className="text-[9px]">
                          fv: {record.formal_verification_status}
                        </Badge>
                      )}
                      {record.lean_proof_status && record.lean_proof_status !== "" && (
                        <Badge variant={record.lean_proof_status === "proved" ? "success" : "muted"} className="text-[9px]">
                          lean: {record.lean_proof_status}
                        </Badge>
                      )}
                      {record.synthesis_status && record.synthesis_status !== "" && (
                        <Badge variant={record.synthesis_status === "synthesized" ? "success" : "muted"} className="text-[9px]">
                          synth: {record.synthesis_status}
                        </Badge>
                      )}
                      {record.repair_agent_status && record.repair_agent_status !== "" && (
                        <Badge variant={record.repair_agent_status === "repaired" ? "success" : "muted"} className="text-[9px]">
                          repair: {record.repair_agent_status}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Files changed */}
                  {(record.files_changed?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.files_changed.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] text-white/20 font-mono bg-white/[0.03] rounded px-1.5 py-0.5"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rollback reason */}
                  {record.rolled_back && record.rollback_reason && (
                    <div className="mt-2 text-[10px] text-red-400/60">
                      Reason: {record.rollback_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
