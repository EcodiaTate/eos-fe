"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

const STAGES = ["Reflexive", "Associative", "Deliberative", "Reflective", "Generative"];

export function SomaDevelopment() {
  const { data, loading, error } = useApi(() => api.somaDevelopmental(), { intervalMs: 10000 });

  if (loading) return <div className="text-white/40 text-sm">Loading development…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const pct = Number.isFinite(data.maturation_progress) ? Math.round(data.maturation_progress * 100) : 0;
  const stageIdx = typeof data.stage === "number" ? data.stage : 0;

  return (
    <div className="space-y-6">
      {/* Stage header */}
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] text-teal-300/50 uppercase tracking-widest">Developmental Stage</div>
          <div className="text-xs text-teal-300/50">
            {data.cycle_count !== undefined ? `${data.cycle_count.toLocaleString()} cycles` : ""}
          </div>
        </div>
        <div className="text-xl font-semibold text-teal-200 capitalize">{data.stage_name}</div>
      </div>

      {/* Stage timeline */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex justify-between mb-3">
          {STAGES.map((s, i) => (
            <div
              key={s}
              className={`text-[10px] text-center flex-1 ${
                i === stageIdx
                  ? "text-teal-300 font-semibold"
                  : i < stageIdx
                    ? "text-white/40"
                    : "text-white/15"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all"
            style={{ width: `${((stageIdx + data.maturation_progress) / STAGES.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/20">
          <span>Birth</span>
          <span>{pct}% in stage</span>
          <span>Generative</span>
        </div>
      </div>

      {/* Available prediction horizons */}
      {(data.available_horizons ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Active Prediction Horizons ({(data.available_horizons ?? []).length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(data.available_horizons ?? []).map((h) => (
              <span
                key={h}
                className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 capitalize"
              >
                {h.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unlocked capabilities */}
      <div>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
          Unlocked Capabilities ({(data.unlocked_capabilities ?? []).length})
        </h3>
        {(data.unlocked_capabilities ?? []).length === 0 ? (
          <div className="text-sm text-white/30 italic">No capabilities unlocked yet</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(data.unlocked_capabilities ?? []).map((cap) => (
              <span
                key={cap}
                className="px-3 py-1 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30 capitalize"
              >
                {cap.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
