"use client";

/**
 * EcodiaOS — DecisionStream
 *
 * Real-time Axon outcomes from the Nova→Equor→Axon pipeline.
 * Shows what actions the organism has attempted and their verdicts.
 *
 * Reads from the Zustand alive-store (pushed via /ws/alive outcomes stream).
 * Falls back to polling /api/v1/axon/outcomes on first load.
 */

import { useAliveStore } from "@/stores/alive-store";
import { useApi } from "@/hooks/use-api";
import { api, type AxonOutcomesResponse } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function StatusBadge({ success, partial, status }: { success: boolean; partial: boolean; status: string }) {
  if (success) return <Badge variant="success">success</Badge>;
  if (partial) return <Badge variant="warning">partial</Badge>;
  if (status === "rate_limited") return <Badge variant="muted">rate limited</Badge>;
  if (status === "circuit_open") return <Badge variant="muted">circuit open</Badge>;
  return <Badge variant="danger">failed</Badge>;
}

export function DecisionStream() {
  // Primary: live WS data
  const wsOutcomes = useAliveStore((s) => s.outcomes);

  // Poll for initial data; WS stream pushes updates when new outcomes arrive
  const fallback = useApi<AxonOutcomesResponse>(api.axonOutcomes, {
    intervalMs: 10000,
  });

  const outcomes = wsOutcomes?.outcomes ?? fallback.data?.outcomes ?? [];
  const total = wsOutcomes?.total ?? fallback.data?.total ?? 0;
  const successful = wsOutcomes?.successful ?? fallback.data?.successful ?? 0;
  const failed = wsOutcomes?.failed ?? fallback.data?.failed ?? 0;

  const successRate = total > 0 ? (successful / total) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Aggregate stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-white/25">Total</div>
          <div className="text-sm text-white/70 tabular-nums font-medium">
            {total.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/25">Succeeded</div>
          <div className="text-sm text-teal-400/80 tabular-nums font-medium">
            {successful.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/25">Failed</div>
          <div className={cn(
            "text-sm tabular-nums font-medium",
            failed > 0 ? "text-rose-400/80" : "text-white/40",
          )}>
            {failed.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Success rate bar */}
      {successRate !== null && (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-[10px] text-white/20">Success rate</div>
            <div className="text-[10px] text-white/40 tabular-nums">
              {successRate.toFixed(0)}%
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                successRate > 70 ? "bg-teal-400/60" : successRate > 40 ? "bg-amber-400/50" : "bg-rose-400/60",
              )}
              style={{ width: `${Math.min(100, successRate)}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent outcomes */}
      <div>
        <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
          Recent Executions
        </div>

        {outcomes.length > 0 ? (
          <div className="space-y-1.5">
            {outcomes.map((o, i) => (
              <div
                key={o.execution_id || i}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  o.success
                    ? "border-teal-500/10 bg-teal-500/[0.04]"
                    : o.partial
                      ? "border-amber-500/10 bg-amber-500/[0.04]"
                      : "border-rose-500/10 bg-rose-500/[0.04]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {/* Step action types */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {o.steps.length > 0 ? (
                        o.steps.map((s, si) => (
                          <span
                            key={si}
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded",
                              s.success
                                ? "bg-white/[0.06] text-white/50"
                                : "bg-rose-500/10 text-rose-400/80",
                            )}
                          >
                            {s.action_type}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-white/25 font-mono">
                          {o.execution_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    {/* World state changes */}
                    {o.world_state_changes.length > 0 && (
                      <p className="text-[11px] text-white/40 leading-relaxed line-clamp-1">
                        {o.world_state_changes[0]}
                      </p>
                    )}
                    {/* Failure reason */}
                    {!o.success && o.failure_reason && (
                      <p className="text-[11px] text-rose-400/60 leading-relaxed line-clamp-1">
                        {o.failure_reason}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge
                      success={o.success}
                      partial={o.partial}
                      status={o.status}
                    />
                    <span className="text-[10px] text-white/20 tabular-nums">
                      {o.duration_ms}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-white/20 text-center py-6">
            No actions yet. Nova has not yet executed any intents.
          </div>
        )}
      </div>
    </div>
  );
}
