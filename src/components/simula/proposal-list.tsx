"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { SimulaProposalsResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "info" | "muted"> = {
  applied: "success",
  rejected: "danger",
  rolled_back: "danger",
  awaiting_governance: "warning",
  simulating: "info",
  approved: "info",
  applying: "info",
  proposed: "muted",
};

interface ApproveFormProps {
  proposalId: string;
  onApproved: () => void;
}

function ApproveForm({ proposalId, onApproved }: ApproveFormProps) {
  const [govId, setGovId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.simulaApproveProposal(proposalId, govId);
      setResult(res.status);
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <div className="text-xs text-green-400/70">Approved → {result}</div>;
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-2">
      <Input
        value={govId}
        onChange={(e) => setGovId(e.target.value)}
        placeholder="governance_record_id"
        className="text-xs h-7 py-0"
        required
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "…" : "Approve"}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}

interface Props {
  data: SimulaProposalsResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export function ProposalList({ data, loading, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Proposals</CardTitle>
        <div className="flex items-center gap-2">
          {data && <Badge variant="muted">{data.total} total</Badge>}
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            ↻
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data && (
          <div className="text-sm text-white/20">Loading…</div>
        )}
        {data && data.proposals.length === 0 && (
          <div className="text-center py-6 text-xs text-white/25">
            No active proposals. Submit one using the form.
          </div>
        )}
        {data && data.proposals.length > 0 && (
          <div className="space-y-2">
            {data.proposals.map((p) => {
              const isExpanded = expandedId === p.id;
              const canApprove = p.status === "awaiting_governance";
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-white/60 flex-1 min-w-0">
                      {p.description}
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "muted"}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex gap-3 flex-wrap">
                    <span className="text-[10px] text-white/20 font-mono">{p.id.slice(0, 12)}…</span>
                    <span className="text-[10px] text-white/20">{p.category}</span>
                    <span className="text-[10px] text-white/20">src: {p.source}</span>
                    <span className="text-[10px] text-white/20">
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 border-t border-white/[0.06] pt-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1 mb-2">
                        <div className="text-[10px] text-white/20 uppercase tracking-widest">Full ID</div>
                        <div className="font-mono text-[10px] text-white/40 break-all">{p.id}</div>
                      </div>
                      {canApprove && (
                        <div>
                          <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
                            Approve (governance override)
                          </div>
                          <ApproveForm proposalId={p.id} onApproved={onRefresh} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
