"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { InspectorHuntSummary } from "@/lib/api-client";

function SeverityBar({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-[11px] text-white/50">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{count}</span>
    </div>
  );
}

function HuntRow({ hunt }: { hunt: InspectorHuntSummary }) {
  const durationS = hunt.total_duration_ms > 0 ? (hunt.total_duration_ms / 1000).toFixed(1) : "—";
  const hasCritical = hunt.critical_count > 0;
  const hasHigh = hunt.high_count > 0;

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${hasCritical ? "border-red-700/50 bg-red-900/5" : "border-slate-700 bg-slate-800/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {hunt.target_type}
            </span>
            {hasCritical && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 font-medium">
                {hunt.critical_count} critical
              </span>
            )}
            {!hasCritical && hasHigh && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-300">
                {hunt.high_count} high
              </span>
            )}
            {hunt.completed_at === null && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 animate-pulse">
                running
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 truncate">{hunt.target_url}</p>
        </div>
        <div className="text-right flex-shrink-0 text-[11px] text-white/40">
          <div>{hunt.vulnerabilities_found} vuln{hunt.vulnerabilities_found !== 1 ? "s" : ""}</div>
          <div>{hunt.surfaces_mapped} surfaces</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-white/30">
        <span>{durationS}s</span>
        <span>{new Date(hunt.started_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function SimulaInspector() {
  const { data: stats, loading: statsLoading, error: statsError } = useApi(
    () => api.simulaInspectorStats(),
    { intervalMs: 10000 }
  );
  const { data: hunts, loading: huntsLoading, error: huntsError } = useApi(
    () => api.simulaInspectorHunts(),
    { intervalMs: 15000 }
  );

  if (statsLoading && huntsLoading) return <div className="text-white/40 text-sm">Loading inspector…</div>;
  if (statsError) return <div className="text-red-400 text-sm">{statsError}</div>;
  if (!stats) return null;

  const totalVulns = stats.total_vulnerabilities;

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white/60">Inspector Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stats.enabled ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className="text-xs text-white/50">{stats.enabled ? "enabled" : "disabled"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-white/40 mb-1">Total Hunts</div>
            <div className="text-2xl font-bold text-white">{stats.total_hunts}</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Vulnerabilities</div>
            <div className="text-2xl font-bold text-amber-400">{totalVulns}</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Avg Surfaces</div>
            <div className="text-2xl font-bold text-violet-300">{stats.avg_surfaces_per_hunt.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-white/70">{(stats.avg_duration_ms / 1000).toFixed(1)}s</div>
          </div>
        </div>
      </div>

      {/* Severity breakdown */}
      {totalVulns > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="text-sm font-medium text-white/60 mb-4">Severity Breakdown</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SeverityBar label="Critical" count={stats.critical_count} color="text-red-400" />
            <SeverityBar label="High" count={stats.high_count} color="text-orange-400" />
            <SeverityBar label="Medium" count={stats.medium_count} color="text-amber-400" />
            <SeverityBar label="Low" count={stats.low_count} color="text-emerald-400" />
          </div>
        </div>
      )}

      {/* Observability flags */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <div className="text-sm font-medium text-white/60 mb-3">Observability</div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${stats.analytics_emitter_active ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className="text-white/50">analytics emitter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${stats.tsdb_persistence_active ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className="text-white/50">TSDB persistence</span>
          </div>
        </div>
        {Object.keys(stats.recent_event_types).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.recent_event_types).map(([ev, cnt]) => (
              <span key={ev} className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-white/40">
                {ev}: {cnt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recent hunts */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-white/60">
          Recent Hunts
          {hunts && <span className="text-white/30 font-normal ml-2">({hunts.total} total)</span>}
        </div>
        {huntsLoading && <div className="text-white/40 text-sm">Loading hunts…</div>}
        {huntsError && <div className="text-red-400 text-sm">{huntsError}</div>}
        {hunts && hunts.hunts.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-white/30 text-sm">
            No hunts recorded yet
          </div>
        )}
        {hunts && hunts.hunts.map((h) => <HuntRow key={h.id} hunt={h} />)}
      </div>
    </div>
  );
}
