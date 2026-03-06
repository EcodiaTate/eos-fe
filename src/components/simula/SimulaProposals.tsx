"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SimulaActiveProposal } from "@/lib/api-client";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-700 text-slate-300",
  validating: "bg-blue-900/60 text-blue-300",
  simulating: "bg-violet-900/60 text-violet-300",
  governance: "bg-amber-900/60 text-amber-300",
  applying: "bg-cyan-900/60 text-cyan-300",
  approved: "bg-emerald-900/60 text-emerald-300",
  rejected: "bg-red-900/60 text-red-300",
  deduped: "bg-slate-700 text-slate-400",
};

const RISK_STYLES: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function ProposalRow({
  proposal,
  onApprove,
  approving,
}: {
  proposal: SimulaActiveProposal;
  onApprove: (id: string) => void;
  approving: string | null;
}) {
  const statusStyle = STATUS_STYLES[proposal.status] ?? "bg-slate-700 text-slate-300";
  const riskStyle = RISK_STYLES[proposal.risk_assessment?.toLowerCase()] ?? "text-white/50";

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
              {proposal.status}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300">
              {proposal.category.replace(/_/g, " ")}
            </span>
            {proposal.dream_origin && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-900/40 text-pink-300">
                dream
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 line-clamp-2">{proposal.description}</p>
        </div>
        {proposal.status === "governance" && (
          <button
            onClick={() => onApprove(proposal.id)}
            disabled={approving === proposal.id}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {approving === proposal.id ? "Approving…" : "Approve"}
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-white/40">
        <span>source: <span className="text-white/60">{proposal.source}</span></span>
        <span>risk: <span className={riskStyle}>{proposal.risk_assessment}</span></span>
        {proposal.efe_score !== null && (
          <span>efe: <span className="text-violet-300">{proposal.efe_score.toFixed(3)}</span></span>
        )}
        <span className="ml-auto">
          {new Date(proposal.created_at).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export function SimulaProposals() {
  const { data, loading, error, refetch } = useApi(() => api.simulaActiveProposals(), { intervalMs: 5000 });
  const [approving, setApproving] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  async function handleApprove(proposalId: string) {
    setApproving(proposalId);
    setApproveError(null);
    try {
      await api.simulaApproveGoverned(proposalId, proposalId);
      refetch();
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(null);
    }
  }

  if (loading) return <div className="text-white/40 text-sm">Loading proposals…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">{data.total} active proposal{data.total !== 1 ? "s" : ""}</span>
        {approveError && <span className="text-xs text-red-400">{approveError}</span>}
      </div>

      {data.proposals.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-white/30 text-sm">
          No active proposals
        </div>
      ) : (
        <div className="space-y-3">
          {data.proposals.map((p) => (
            <ProposalRow key={p.id} proposal={p} onApprove={handleApprove} approving={approving} />
          ))}
        </div>
      )}
    </div>
  );
}
