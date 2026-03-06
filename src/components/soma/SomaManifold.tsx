"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaSystemSlice } from "@/lib/api-client";

const SCALES = ["fast", "medium", "slow"] as const;

function scaleBar(val: number | null, max = 20): string {
  if (val === null) return "0%";
  return `${Math.min(100, (Math.abs(val) / max) * 100)}%`;
}

function derivColor(val: number | null): string {
  if (val === null) return "text-white/20";
  const abs = Math.abs(val);
  if (abs >= 10) return "text-red-400";
  if (abs >= 5) return "text-orange-400";
  if (abs >= 2) return "text-yellow-400";
  return "text-white/50";
}

function SystemRow({ name, slice }: { name: string; slice: SomaSystemSlice }) {
  const errColor =
    (slice.error_rate ?? 0) >= 0.3
      ? "text-red-400"
      : (slice.error_rate ?? 0) >= 0.1
        ? "text-yellow-400"
        : "text-emerald-400";

  return (
    <tr className="border-b border-slate-700/30 hover:bg-white/[0.02] transition-colors">
      <td className="py-2 pr-4 text-sm text-white/70 capitalize whitespace-nowrap">
        {name.replace(/_/g, " ")}
      </td>
      <td className="py-2 pr-3 text-right text-xs font-mono text-white/50">
        {slice.call_rate?.toFixed(1) ?? "—"}
      </td>
      <td className={`py-2 pr-3 text-right text-xs font-mono font-semibold ${errColor}`}>
        {slice.error_rate !== null ? `${((slice.error_rate ?? 0) * 100).toFixed(1)}%` : "—"}
      </td>
      <td className="py-2 pr-3 text-right text-xs font-mono text-white/50">
        {slice.mean_latency_ms?.toFixed(1) ?? "—"}
      </td>
      <td className="py-2 pr-3 text-right text-xs font-mono text-white/50">
        {slice.success_ratio !== null ? `${((slice.success_ratio ?? 0) * 100).toFixed(0)}%` : "—"}
      </td>
      <td className="py-2 text-right text-xs font-mono text-white/40">
        {slice.event_entropy?.toFixed(2) ?? "—"}
      </td>
    </tr>
  );
}

export function SomaManifold() {
  const { data, loading, error } = useApi(() => api.somaManifold(), { intervalMs: 5000 });

  if (loading) return <div className="text-white/40 text-sm">Loading manifold state…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const sv = data.state_vector;
  const deriv = data.derivatives;
  const percept = data.last_percept;

  const systemEntries = Object.entries(sv.systems ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Last interoceptive percept */}
      {percept && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <div className="text-[11px] text-violet-300/50 uppercase tracking-widest mb-2">
            Last Interoceptive Percept
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-[11px] text-white/30">Sensation</span>
              <div className="text-sm font-semibold text-violet-200 capitalize mt-0.5">
                {percept.sensation_type.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-white/30">Action</span>
              <div className="text-sm font-semibold text-violet-200 capitalize mt-0.5">
                {percept.recommended_action.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-white/30">Magnitude</span>
              <div className="text-sm font-semibold text-white/70 mt-0.5">
                {percept.magnitude?.toFixed(3) ?? "—"}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-white/30">Time</span>
              <div className="text-sm text-white/50 mt-0.5">
                {new Date(percept.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          {percept.source_systems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {percept.source_systems.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded text-[11px] bg-violet-500/20 text-violet-300 border border-violet-500/30 capitalize"
                >
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-scale derivatives */}
      {deriv && Object.keys(deriv.organism_velocity_norm ?? {}).length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">
            Organism-Level Derivatives (velocity / acceleration / jerk)
          </h3>
          <div className="space-y-3">
            {SCALES.filter((s) => deriv.organism_velocity_norm[s] !== undefined).map((scale) => {
              const vel = deriv.organism_velocity_norm[scale] ?? null;
              const acc = deriv.organism_acceleration_norm[scale] ?? null;
              const jerk = deriv.organism_jerk_norm[scale] ?? null;
              return (
                <div key={scale} className="space-y-1">
                  <div className="text-[11px] text-white/20 uppercase tracking-widest">{scale}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "vel", val: vel },
                      { label: "acc", val: acc },
                      { label: "jerk", val: jerk },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/20">{label}</span>
                          <span className={`text-[11px] font-mono ${derivColor(val)}`}>
                            {val?.toFixed(2) ?? "—"}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full"
                            style={{ width: scaleBar(val) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-system state vector */}
      {systemEntries.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">
            System State Vector ({systemEntries.length} systems, cycle #{sv.cycle_number ?? "—"})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/30">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  {["System", "Calls/s", "Error rate", "Latency ms", "Success", "Entropy"].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-2.5 pr-3 first:pl-4 text-[10px] font-semibold text-white/20 uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {systemEntries.map(([name, slice]) => (
                  <SystemRow key={name} name={name} slice={slice} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {systemEntries.length === 0 && !percept && (
        <div className="text-sm text-white/30 italic py-8 text-center">
          Phase A manifold not yet ready (requires ~7 signal cycles)
        </div>
      )}
    </div>
  );
}
