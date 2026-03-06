"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

function RiskBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.round(value * 100));
  const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-white/50 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-white/50">{pct}%</span>
    </div>
  );
}

export function SimulaAnalytics() {
  const { data, loading, error } = useApi(() => api.simulaAnalytics(), { intervalMs: 10000 });

  if (loading) return <div className="text-white/40 text-sm">Loading analytics…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const trendMax = data.recent_risk_trend.length > 0 ? Math.max(...data.recent_risk_trend, 0.01) : 1;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Proposals", value: data.total_proposals, accent: "text-white" },
          { label: "Approved", value: data.approved_proposals, accent: "text-emerald-400" },
          { label: "Rolled Back", value: data.rolled_back_proposals, accent: "text-amber-400" },
          {
            label: "Approval Rate",
            value: `${(data.approval_rate * 100).toFixed(1)}%`,
            accent: data.approval_rate >= 0.7 ? "text-emerald-400" : "text-amber-400",
          },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${accent}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Evolution metrics */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
        <div className="text-sm font-medium text-white/60">Pipeline Metrics</div>
        <RiskBar value={data.rollback_rate} label="Rollback Rate" />
        <RiskBar value={data.mean_simulation_risk} label="Mean Sim. Risk" />
        <div className="flex items-center gap-3">
          <span className="w-28 text-xs text-white/50 flex-shrink-0">Evolution Velocity</span>
          <span className="text-violet-300 font-semibold">{data.evolution_velocity.toFixed(3)}</span>
          <span className="text-white/30 text-xs">proposals/hr</span>
        </div>
      </div>

      {/* Category distribution */}
      {Object.keys(data.category_distribution).length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="text-sm font-medium text-white/60 mb-4">Category Distribution</div>
          <div className="space-y-2">
            {Object.entries(data.category_distribution)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, count]) => {
                const pct = data.total_proposals > 0 ? (count as number) / data.total_proposals : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-40 text-xs text-white/50 truncate">{cat.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-white/40">{count as number}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Risk trend sparkline (text-based) */}
      {data.recent_risk_trend.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="text-sm font-medium text-white/60 mb-4">Recent Risk Trend</div>
          <div className="flex items-end gap-1 h-16">
            {data.recent_risk_trend.map((v, i) => {
              const h = Math.round((v / trendMax) * 100);
              const color = h >= 70 ? "bg-red-500" : h >= 40 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${color}`}
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`${(v * 100).toFixed(0)}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>oldest</span>
            <span>newest</span>
          </div>
        </div>
      )}

      {/* Inspector summary */}
      {data.inspector_total_hunts > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="text-sm font-medium text-white/60 mb-4">Inspector Summary</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-white/40">Total Hunts</div>
              <div className="text-xl font-bold text-white">{data.inspector_total_hunts}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Vulnerabilities</div>
              <div className="text-xl font-bold text-amber-400">{data.inspector_total_vulnerabilities}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Critical</div>
              <div className="text-xl font-bold text-red-400">{data.inspector_critical_count}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">High</div>
              <div className="text-xl font-bold text-orange-400">{data.inspector_high_count}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
