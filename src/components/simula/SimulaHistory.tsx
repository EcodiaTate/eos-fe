"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SimulaEvolutionRecord } from "@/lib/api-client";

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-900/50 text-emerald-300",
  medium: "bg-amber-900/50 text-amber-300",
  high: "bg-orange-900/50 text-orange-300",
  critical: "bg-red-900/50 text-red-300",
};

const FV_BADGE: Record<string, string> = {
  passed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-white/30",
  pending: "text-amber-400",
};

function HistoryRow({ record }: { record: SimulaEvolutionRecord }) {
  const riskStyle = RISK_BADGE[record.simulation_risk?.toLowerCase()] ?? "bg-slate-700 text-slate-300";
  const fvStyle = FV_BADGE[record.formal_verification_status?.toLowerCase()] ?? "text-white/40";

  return (
    <div
      className={`rounded-lg border p-4 space-y-2 ${
        record.rolled_back
          ? "border-amber-700/50 bg-amber-900/10"
          : "border-slate-700 bg-slate-800/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${riskStyle}`}>
              {record.simulation_risk} risk
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300">
              {record.category.replace(/_/g, " ")}
            </span>
            {record.rolled_back && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300">
                rolled back
              </span>
            )}
            {record.repair_agent_used && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-900/40 text-pink-300">
                repair agent
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 line-clamp-2">{record.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-white/50">
            v{record.from_version} → v{record.to_version}
          </div>
          <div className={`text-[11px] ${fvStyle}`}>
            fv: {record.formal_verification_status}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-white/30">
        {record.files_changed.length > 0 && (
          <span>{record.files_changed.length} file{record.files_changed.length !== 1 ? "s" : ""} changed</span>
        )}
        {record.repair_cost_usd > 0 && (
          <span>repair: <span className="text-amber-300">${record.repair_cost_usd.toFixed(4)}</span></span>
        )}
        {record.rolled_back && record.rollback_reason && (
          <span className="text-amber-300/70 truncate max-w-xs">{record.rollback_reason}</span>
        )}
        <span className="ml-auto">{new Date(record.applied_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function SimulaHistory() {
  const { data, loading, error } = useApi(() => api.simulaEvolutionHistory(50), { intervalMs: 15000 });

  if (loading) return <div className="text-white/40 text-sm">Loading history…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const rollbacks = data.records.filter((r) => r.rolled_back).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-white/40">
        <span>{data.total} total records</span>
        {rollbacks > 0 && (
          <span className="text-amber-400">{rollbacks} rollback{rollbacks !== 1 ? "s" : ""}</span>
        )}
      </div>

      {data.records.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-white/30 text-sm">
          No evolution history yet
        </div>
      ) : (
        <div className="space-y-3">
          {data.records.map((r) => (
            <HistoryRow key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}
