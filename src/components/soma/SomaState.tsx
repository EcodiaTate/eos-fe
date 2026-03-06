"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaDimension } from "@/lib/api-client";
import { urgencyColor, urgencyBg } from "@/lib/status-colors";

function dissonanceColor(d: number | undefined): string {
  if (!d) return "text-white/20";
  const abs = Math.abs(d);
  if (abs >= 0.3) return "text-orange-400";
  if (abs >= 0.15) return "text-yellow-400";
  return "text-white/30";
}

function DimensionRow({ dim }: { dim: SomaDimension }) {
  const sensedPct = Number.isFinite(dim.sensed) ? Math.min(100, Math.abs(dim.sensed) * 100) : 0;
  const setpointPct = Number.isFinite(dim.setpoint) ? Math.min(100, Math.abs(dim.setpoint) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white/80 capitalize">{dim.name.replace(/_/g, " ")}</span>
        <div className="flex items-center gap-2">
          {dim.temporal_dissonance !== undefined && Math.abs(dim.temporal_dissonance) > 0.05 && (
            <span className={`text-[10px] font-mono ${dissonanceColor(dim.temporal_dissonance)}`}>
              Δ{dim.temporal_dissonance > 0 ? "+" : ""}
              {dim.temporal_dissonance.toFixed(2)}
            </span>
          )}
          <span className={`text-xs font-semibold ${urgencyColor(dim.urgency ?? 0)}`}>
            {Number.isFinite(dim.urgency) ? (dim.urgency * 100).toFixed(0) : "0"}%
          </span>
        </div>
      </div>

      {/* Sensed vs setpoint bars */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-white/40">sensed</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${sensedPct}%` }}
            />
          </div>
          <span className="w-10 text-right text-[11px] text-white/50">{dim.sensed.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-white/40">setpoint</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400/70 rounded-full transition-all"
              style={{ width: `${setpointPct}%` }}
            />
          </div>
          <span className="w-10 text-right text-[11px] text-white/50">{dim.setpoint.toFixed(2)}</span>
        </div>
      </div>

      {/* Error + urgency bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-16 text-[11px] text-white/40">error</span>
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyBg(dim.urgency)}`}
            style={{ width: `${Math.min(100, Math.abs(dim.error) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-[11px] text-white/50">{dim.error.toFixed(3)}</span>
      </div>

      {/* Error rate */}
      {dim.error_rate !== undefined && (
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-white/30">rate/s</span>
          <span
            className={`text-[11px] font-mono ${
              dim.error_rate > 0.02
                ? "text-red-400/70"
                : dim.error_rate < -0.02
                  ? "text-emerald-400/70"
                  : "text-white/20"
            }`}
          >
            {dim.error_rate > 0 ? "+" : ""}
            {dim.error_rate.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}

export function SomaState() {
  const { data, loading, error } = useApi(() => api.somaState(), { intervalMs: 3000 });

  if (loading) return <div className="text-white/40 text-sm">Loading soma state…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Overall urgency + dominant error */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-white/50 mb-1">Overall Urgency</div>
            <div className={`text-3xl font-bold ${urgencyColor(data.overall_urgency ?? 0)}`}>
              {Number.isFinite(data.overall_urgency) ? (data.overall_urgency * 100).toFixed(1) : "0.0"}%
            </div>
          </div>
          {data.dominant_error && (
            <div className="text-right">
              <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Dominant error</div>
              <div className="text-sm font-semibold text-white/70 capitalize">
                {data.dominant_error.replace(/_/g, " ")}
              </div>
              {data.max_error_magnitude !== undefined && (
                <div className="text-[11px] text-white/30">mag {data.max_error_magnitude.toFixed(3)}</div>
              )}
            </div>
          )}
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyBg(data.overall_urgency)}`}
            style={{ width: `${data.overall_urgency * 100}%` }}
          />
        </div>
      </div>

      {/* Per-dimension grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.dimensions ?? []).map((dim) => (
          <DimensionRow key={dim.name} dim={dim} />
        ))}
      </div>
    </div>
  );
}
