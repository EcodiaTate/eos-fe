"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { strengthRing } from "@/lib/magnitude-colors";

function directionArrow(direction: string): string {
  const d = direction.toLowerCase();
  if (d === "up" || d === "increasing" || d === "rising") return "↑";
  if (d === "down" || d === "decreasing" || d === "falling") return "↓";
  if (d === "stable" || d === "neutral") return "→";
  return "↗";
}

function strengthColor(s: number): string {
  if (s >= 0.75) return "text-red-400";
  if (s >= 0.5) return "text-yellow-400";
  if (s >= 0.25) return "text-cyan-400";
  return "text-emerald-400";
}

export function SomaSignal() {
  const { data, loading, error } = useApi(() => api.somaSignal(), { intervalMs: 2000 });

  if (loading) return <div className="text-white/40 text-sm">Loading signal…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const strength = Number.isFinite(data.signal_strength) ? data.signal_strength : 0;
  const pct = Math.round(strength * 100);

  return (
    <div className="space-y-8">
      {/* Gauge */}
      <div className="flex flex-col items-center gap-6 pt-4">
        <div
          className={`relative flex items-center justify-center w-48 h-48 rounded-full border-4 bg-slate-900 ${strengthRing(strength)} transition-all`}
        >
          {/* SVG arc gauge */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - strength)}`}
              className={strengthColor(strength)}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="text-center z-10">
            <div className={`text-4xl font-bold ${strengthColor(strength)}`}>{pct}%</div>
            <div className="text-[11px] text-white/30 mt-1">signal</div>
          </div>
        </div>

        {/* Direction arrow */}
        <div className="flex items-center gap-3">
          <span className={`text-5xl font-light ${strengthColor(strength)}`}>
            {directionArrow(data.direction)}
          </span>
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest">direction</div>
            <div className="text-white/70 font-medium capitalize">{data.direction}</div>
          </div>
        </div>
      </div>

      {/* Dominant dimension + timestamp */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Dominant Dimension</div>
          <div className="text-white font-semibold capitalize">{data.dominant_dimension.replace(/_/g, " ")}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Last Updated</div>
          <div className="text-white/70 text-sm">{new Date(data.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}
