"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

function pressureColor(p: number): string {
  if (p >= 0.7) return "bg-red-500";
  if (p >= 0.4) return "bg-orange-500";
  if (p >= 0.2) return "bg-yellow-500";
  return "bg-emerald-500";
}

function stressColor(s: number): string {
  if (s >= 0.7) return "text-red-400";
  if (s >= 0.4) return "text-orange-400";
  if (s >= 0.2) return "text-yellow-400";
  return "text-emerald-400";
}

export function SomaExteroception() {
  const { data, loading, error } = useApi(() => api.somaExteroception(), { intervalMs: 3000 });

  if (loading) return <div className="text-white/40 text-sm">Loading exteroception…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const sorted = [...(data.sources ?? [])].sort((a, b) => b.pressure - a.pressure);

  return (
    <div className="space-y-6">
      {/* Overall stress */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/50">External Stress Level</span>
          <span className={`text-3xl font-bold ${stressColor(data.stress_level ?? 0)}`}>
            {Number.isFinite(data.stress_level) ? (data.stress_level * 100).toFixed(1) : "0.0"}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pressureColor(data.stress_level)}`}
            style={{ width: `${data.stress_level * 100}%` }}
          />
        </div>
      </div>

      {/* Ranked stress sources */}
      <div>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
          Pressure Sources ({(data.sources ?? []).length})
        </h3>
        {sorted.length === 0 ? (
          <div className="text-sm text-white/30 italic">No external pressure sources</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((source, idx) => (
              <div key={source.name} className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                <span className="text-white/20 text-sm font-mono w-5">{idx + 1}</span>
                <span className="flex-1 text-sm text-white/70 capitalize">{source.name.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pressureColor(source.pressure)}`}
                      style={{ width: `${Math.min(100, source.pressure * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50 w-12 text-right">{Number.isFinite(source.pressure) ? (source.pressure * 100).toFixed(1) : "0.0"}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
