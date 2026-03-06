"use client";

import { useState } from "react";
import { api, type AmendmentPipelineStatusResponse, type AmendmentStatus } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_STAGE_INDEX: Record<AmendmentStatus, number> = {
  proposed: 0,
  deliberation: 1,
  shadow: 2,
  shadow_passed: 3,
  shadow_failed: 3,
  voting: 4,
  passed: 5,
  failed: 5,
  adopted: 6,
  rejected: 6,
};

const STAGES = ["Proposed", "Deliberation", "Shadow", "Shadow Done", "Voting", "Tallied", "Final"];

const STATUS_VARIANT: Record<AmendmentStatus, "success" | "warning" | "danger" | "muted"> = {
  proposed: "muted",
  deliberation: "warning",
  shadow: "warning",
  shadow_passed: "success",
  shadow_failed: "danger",
  voting: "warning",
  passed: "success",
  failed: "danger",
  adopted: "success",
  rejected: "danger",
};

function PipelineProgress({ status }: { status: AmendmentStatus }) {
  const current = STATUS_STAGE_INDEX[status];
  const failed = status === "shadow_failed" || status === "failed" || status === "rejected";
  return (
    <div className="flex items-center gap-1 mt-3">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1">
          <div
            className={`h-1.5 w-5 rounded-full transition-all ${
              i < current
                ? "bg-teal-400/60"
                : i === current
                  ? failed
                    ? "bg-red-400/80"
                    : "bg-teal-400"
                  : "bg-white/[0.07]"
            }`}
          />
        </div>
      ))}
      <span className="text-[9px] text-white/30 ml-1">{STAGES[current]}</span>
    </div>
  );
}

function ShadowBar({ divergence, violations }: { divergence: number; violations: number }) {
  const color = divergence < 0.1 ? "#34d399" : divergence < 0.15 ? "#fbbf24" : "#f87171";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/30">
        <span>Divergence</span>
        <span style={{ color }}>{(divergence * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(divergence * 100, 100)}%`, background: color }} />
      </div>
      {violations > 0 && (
        <div className="text-[10px] text-red-400/70">⚠ {violations} invariant violation{violations > 1 ? "s" : ""} detected</div>
      )}
    </div>
  );
}

function VoteBar({ votes }: { votes: NonNullable<AmendmentPipelineStatusResponse["votes"]> }) {
  const total = votes.total || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden">
        <div className="bg-emerald-400/70" style={{ width: `${(votes.for / total) * 100}%` }} />
        <div className="bg-red-400/60" style={{ width: `${(votes.against / total) * 100}%` }} />
        <div className="bg-white/[0.08]" style={{ width: `${(votes.abstain / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 text-[10px] text-white/30">
        <span className="text-emerald-400/70">For: {votes.for}</span>
        <span className="text-red-400/60">Against: {votes.against}</span>
        <span>Abstain: {votes.abstain}</span>
      </div>
      <div className="flex gap-2">
        <Badge variant={votes.quorum_met ? "success" : "muted"}>
          {votes.quorum_met ? "Quorum ✓" : "No quorum"}
        </Badge>
        <Badge variant={votes.supermajority_met ? "success" : "muted"}>
          {votes.supermajority_met ? "Supermajority ✓" : "No supermajority"}
        </Badge>
      </div>
    </div>
  );
}

function DriveComparison({
  drives,
}: {
  drives: AmendmentPipelineStatusResponse["proposed_drives"];
}) {
  const baseline = { coherence: 1.0, care: 1.0, growth: 1.0, honesty: 1.0 };
  return (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {(["coherence", "care", "growth", "honesty"] as const).map((drive) => {
        const delta = drives[drive] - baseline[drive];
        return (
          <div key={drive} className="text-center">
            <div className="text-[9px] text-white/25 uppercase tracking-widest">{drive}</div>
            <div className="text-sm font-mono text-white/70">{drives[drive].toFixed(2)}</div>
            <div
              className={`text-[10px] ${delta > 0 ? "text-emerald-400/60" : delta < 0 ? "text-red-400/60" : "text-white/25"}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AmendmentPipeline() {
  const [proposalId, setProposalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AmendmentPipelineStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function lookup() {
    if (!proposalId.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.amendmentStatus(proposalId.trim());
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function doAction(action: "shadow" | "open-voting" | "adopt") {
    if (!proposalId.trim()) return;
    setActionMsg(null);
    try {
      if (action === "shadow") await api.amendmentStartShadow(proposalId.trim());
      else if (action === "open-voting") await api.amendmentOpenVoting(proposalId.trim());
      else if (action === "adopt") await api.amendmentAdopt(proposalId.trim());
      setActionMsg(`Action '${action}' completed`);
      await lookup();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amendment Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Proposal ID"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
            <Button onClick={lookup} disabled={loading || !proposalId.trim()}>
              {loading ? "…" : "Look up"}
            </Button>
          </div>

          {error && (
            <div className="text-xs text-red-400/70 border border-red-400/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-white/80">{data.title}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{data.description}</div>
                </div>
                <Badge variant={STATUS_VARIANT[data.status]}>{data.status}</Badge>
              </div>

              <PipelineProgress status={data.status} />

              <div className="text-[10px] text-white/20 uppercase tracking-widest mt-2">Proposed Drives</div>
              <DriveComparison drives={data.proposed_drives} />

              {data.shadow && (
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Shadow Period</div>
                  <div className="text-[11px] text-white/40 mb-2">
                    {data.shadow.verdict_count} verdicts evaluated
                    {data.shadow.ends_at && (
                      <> · ends {new Date(data.shadow.ends_at).toLocaleDateString()}</>
                    )}
                  </div>
                  <ShadowBar
                    divergence={data.shadow.divergence_rate}
                    violations={data.shadow.invariant_violations}
                  />
                </div>
              )}

              {data.votes && (
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Votes</div>
                  <VoteBar votes={data.votes} />
                </div>
              )}

              {data.rejection_reason && (
                <div className="text-xs text-red-400/70 border border-red-400/20 rounded-md px-3 py-2">
                  Rejected: {data.rejection_reason}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {data.status === "deliberation" && (
                  <Button variant="outline" onClick={() => doAction("shadow")}>
                    Start Shadow Period
                  </Button>
                )}
                {data.status === "shadow_passed" && (
                  <Button variant="outline" onClick={() => doAction("open-voting")}>
                    Open Voting
                  </Button>
                )}
                {data.status === "passed" && (
                  <Button onClick={() => doAction("adopt")}>
                    Adopt Amendment
                  </Button>
                )}
              </div>

              {actionMsg && (
                <div className="text-xs text-white/40 border border-white/[0.08] rounded-md px-3 py-2">
                  {actionMsg}
                </div>
              )}
            </div>
          )}

          {!data && !loading && !error && (
            <div className="text-center py-6 text-xs text-white/20">
              Enter a proposal ID to view its pipeline status
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
