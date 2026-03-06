"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SimulaStatusResponse } from "@/lib/api-client";

function GridStateBadge({ state }: { state: string }) {
  const map: Record<string, { color: string; label: string }> = {
    normal: { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "Normal" },
    conservation: { color: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "Conservation" },
    green_surplus: { color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40", label: "Green Surplus" },
  };
  const s = map[state] ?? { color: "bg-slate-500/20 text-slate-300 border-slate-500/40", label: state };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

function SubsystemGrid({ title, stage }: { title: string; stage: Record<string, boolean> }) {
  if (!stage || Object.keys(stage).length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(stage).map(([key, active]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className={`text-xs ${active ? "text-white/70" : "text-white/30"}`}>
              {key.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ?? "text-white"}`}>{value}</div>
    </div>
  );
}

export function SimulaStatus() {
  const { data, loading, error } = useApi(() => api.simulaStatus(), { intervalMs: 5000 });

  if (loading) return <div className="text-white/40 text-sm">Loading Simula status…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const approvalRate =
    data.proposals_received > 0
      ? ((data.proposals_approved / data.proposals_received) * 100).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Header: version + grid state */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-white/40 mb-1">Config Version</div>
          <div className="text-3xl font-bold text-violet-300">v{data.current_version}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40 mb-1">Grid State</div>
          <GridStateBadge state={data.grid_state} />
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40 mb-1">Engine</div>
          <span
            className={`px-2 py-0.5 rounded border text-xs font-medium ${
              data.initialized
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-red-500/20 text-red-300 border-red-500/40"
            }`}
          >
            {data.initialized ? "Initialized" : "Not Ready"}
          </span>
        </div>
      </div>

      {/* Proposal counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Received" value={data.proposals_received} />
        <StatCard label="Approved" value={data.proposals_approved} accent="text-emerald-400" />
        <StatCard label="Rejected" value={data.proposals_rejected} accent="text-red-400" />
        <StatCard label="Rolled Back" value={data.proposals_rolled_back} accent="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active" value={data.active_proposals} accent="text-violet-300" />
        <StatCard label="Awaiting Gov." value={data.proposals_awaiting_governance} accent="text-blue-300" />
        <StatCard label="Deduplicated" value={data.proposals_deduplicated} />
        <StatCard label="Approval Rate" value={`${approvalRate}%`} accent="text-cyan-300" />
      </div>

      {/* Subsystem stages */}
      <div>
        <div className="text-sm font-medium text-white/60 mb-3">Subsystem Stages</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SubsystemGrid title="Stage 3 — Verification" stage={data.subsystems.stage3} />
          <SubsystemGrid title="Stage 4 — Proofs & Fine-Tuning" stage={data.subsystems.stage4} />
          <SubsystemGrid title="Stage 5 — Synthesis & Repair" stage={data.subsystems.stage5} />
          <SubsystemGrid title="Stage 6 — Audit & Co-Evolution" stage={data.subsystems.stage6} />
          <SubsystemGrid title="Stage 7 — Inspector" stage={data.subsystems.stage7} />
        </div>
      </div>

      {/* Analytics summary if cached */}
      {Object.keys(data.analytics_summary).length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Cached Analytics
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {data.analytics_summary.total_proposals != null && (
              <div>
                <div className="text-white/40 text-xs">Total Proposals</div>
                <div className="text-white font-medium">{data.analytics_summary.total_proposals}</div>
              </div>
            )}
            {data.analytics_summary.evolution_velocity != null && (
              <div>
                <div className="text-white/40 text-xs">Velocity (proposals/hr)</div>
                <div className="text-white font-medium">
                  {(data.analytics_summary.evolution_velocity as number).toFixed(2)}
                </div>
              </div>
            )}
            {data.analytics_summary.rollback_rate != null && (
              <div>
                <div className="text-white/40 text-xs">Rollback Rate</div>
                <div className="text-amber-400 font-medium">
                  {((data.analytics_summary.rollback_rate as number) * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {data.analytics_summary.mean_simulation_risk != null && (
              <div>
                <div className="text-white/40 text-xs">Mean Sim. Risk</div>
                <div className="text-white font-medium">
                  {((data.analytics_summary.mean_simulation_risk as number) * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspector analytics observability */}
      {(data.stage9_analytics.inspector_analytics_emitter !== undefined) && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Inspector Observability
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              ["Analytics Emitter", data.stage9_analytics.inspector_analytics_emitter],
              ["TSDB Persistence", data.stage9_analytics.inspector_tsdb_persistence],
              ["View Attached", data.stage9_analytics.inspector_view_attached],
              ["Store Attached", data.stage9_analytics.inspector_store_attached],
            ].map(([label, active]) => (
              <div key={label as string} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span className={active ? "text-white/70" : "text-white/30"}>{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
