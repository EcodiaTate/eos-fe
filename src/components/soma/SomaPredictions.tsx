"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaHorizonPredictions, SomaDimensionPrediction } from "@/lib/api-client";
import { errorColor } from "@/lib/magnitude-colors";

const HORIZON_ORDER = ["immediate", "moment", "episode", "session", "circadian", "narrative", "lunar", "seasonal", "annual"];

const HORIZON_META: Record<string, { label: string; span: string; color: string }> = {
  immediate: { label: "Immediate", span: "150ms", color: "#22d3ee" },
  moment:    { label: "Moment",    span: "5s",    color: "#818cf8" },
  episode:   { label: "Episode",   span: "1min",  color: "#a78bfa" },
  session:   { label: "Session",   span: "1hr",   color: "#c084fc" },
  circadian: { label: "Circadian", span: "24hr",  color: "#f0abfc" },
  narrative: { label: "Narrative", span: "1wk",   color: "#f472b6" },
  lunar:     { label: "Lunar",     span: "30d",   color: "#fb923c" },
  seasonal:  { label: "Seasonal",  span: "90d",   color: "#fbbf24" },
  annual:    { label: "Annual",    span: "1yr",   color: "#f87171" },
};

const DIM_SHORT: Record<string, string> = {
  energy: "Nrg",
  arousal: "Aro",
  valence: "Val",
  confidence: "Con",
  coherence: "Coh",
  social_charge: "Soc",
  curiosity_drive: "Cur",
  integrity: "Int",
  temporal_pressure: "Tpr",
};

function dissonanceColor(v: number | null): string {
  if (v === null) return "text-white/20";
  const abs = Math.abs(v);
  if (abs >= 0.3) return "text-orange-400";
  if (abs >= 0.15) return "text-yellow-400";
  return "text-white/30";
}

// Heatmap view: dimensions as rows, horizons as columns
function HeatmapView({ horizons }: { horizons: SomaHorizonPredictions[] }) {
  const sorted = [...horizons].sort(
    (a, b) => HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon),
  );
  const dims = sorted[0]?.predictions.map((p) => p.dimension) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="w-20 py-2 pr-2 text-white/20 font-normal uppercase tracking-widest sticky left-0 bg-slate-900 z-10">
              Dim
            </th>
            {sorted.map((h) => {
              const meta = HORIZON_META[h.horizon];
              return (
                <th key={h.horizon} className="py-2 px-1 text-center font-normal whitespace-nowrap">
                  <div style={{ color: meta?.color ?? "#888" }} className="text-[10px] font-semibold">
                    {meta?.label ?? h.horizon}
                  </div>
                  <div className="text-white/20 text-[9px]">{meta?.span}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {dims.map((dim) => (
            <tr key={dim} className="border-t border-slate-800/60">
              <td className="py-1.5 pr-2 sticky left-0 bg-slate-900 z-10">
                <span className="text-white/50 capitalize">{DIM_SHORT[dim] ?? dim}</span>
              </td>
              {sorted.map((h) => {
                const pred = h.predictions.find((p) => p.dimension === dim);
                const err = pred?.error_at_horizon ?? null;
                const abs = err !== null ? Math.abs(err) : 0;
                const isDissonant = abs >= 0.2;
                return (
                  <td key={h.horizon} className="py-1 px-1 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-6 h-4 rounded-sm ${errorColor(err)} opacity-${isDissonant ? "90" : "40"}`}
                        title={err !== null ? `err: ${err.toFixed(3)}, predicted: ${pred?.predicted?.toFixed(3)}` : "no data"}
                      />
                      {pred?.predicted !== null && pred?.predicted !== undefined && (
                        <div className="text-[9px] text-white/30 font-mono">
                          {pred.predicted.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-white/30">
        <span>Error direction:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500/80 inline-block" /> overshoot</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500/80 inline-block" /> undershoot</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-600 inline-block" /> near setpoint</span>
      </div>
    </div>
  );
}

// Dimension detail view: one dim selected, all horizons
function DimensionDetail({ dim, horizons }: { dim: string; horizons: SomaHorizonPredictions[] }) {
  const sorted = [...horizons].sort(
    (a, b) => HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon),
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 uppercase tracking-widest mb-2 capitalize">
        {dim.replace(/_/g, " ")} — prediction trajectory
      </div>
      {sorted.map((h) => {
        const pred = h.predictions.find((p) => p.dimension === dim);
        if (!pred) return null;
        const meta = HORIZON_META[h.horizon];
        const sensed = pred.sensed ?? 0;
        const predicted = pred.predicted ?? sensed;
        const setpoint = pred.setpoint ?? sensed;
        const err = pred.error_at_horizon ?? 0;
        const errAbs = Math.abs(err);
        const isOvershoot = err > 0;
        const isSignificant = errAbs >= 0.1;

        return (
          <div key={h.horizon} className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: meta?.color ?? "#888" }}
                />
                <span className="text-sm font-medium text-white/70">{meta?.label ?? h.horizon}</span>
                <span className="text-[10px] text-white/30">{meta?.span}</span>
              </div>
              {isSignificant && (
                <span className={`text-[10px] font-semibold ${isOvershoot ? "text-red-400" : "text-cyan-400"}`}>
                  {isOvershoot ? "↑ overshoot" : "↓ undershoot"} {errAbs.toFixed(3)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {/* Predicted value bar */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-white/30">predicted</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.abs(predicted) * 100)}%`,
                      background: meta?.color ?? "#888",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-mono text-white/50">
                  {predicted.toFixed(3)}
                </span>
              </div>
              {/* Setpoint reference */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-white/20">setpoint</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400/50 rounded-full"
                    style={{ width: `${Math.min(100, Math.abs(setpoint) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-mono text-white/30">
                  {setpoint.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SomaPredictions() {
  const { data, loading, error } = useApi(() => api.somaPredictions(), { intervalMs: 3000 });
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [view, setView] = useState<"heatmap" | "detail">("heatmap");

  if (loading) return <div className="text-white/40 text-sm">Loading predictions…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  if (data.status === "no_state") {
    return (
      <div className="text-center py-12 text-white/30">
        <div className="text-4xl mb-3">◎</div>
        <p className="text-sm">Soma has not run a cycle yet. Predictions are unavailable.</p>
      </div>
    );
  }

  const horizons = data.horizons ?? [];
  const dissonance = data.temporal_dissonance ?? {};
  const dims = horizons[0]?.predictions.map((p) => p.dimension) ?? [];
  const dissonantDims = Object.entries(dissonance)
    .filter(([, v]) => v !== null && Math.abs(v ?? 0) >= 0.15)
    .sort(([, a], [, b]) => Math.abs(b ?? 0) - Math.abs(a ?? 0));

  return (
    <div className="space-y-6">
      {/* Temporal dissonance alert */}
      {dissonantDims.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="text-[11px] text-orange-400/60 uppercase tracking-widest mb-2">
            Temporal Dissonance — short & long-term predictions diverging
          </div>
          <div className="flex flex-wrap gap-2">
            {dissonantDims.map(([dim, v]) => (
              <div
                key={dim}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-medium ${
                  Math.abs(v ?? 0) >= 0.3
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-orange-500/20 border-orange-500/40 text-orange-300"
                }`}
              >
                <span className="capitalize">{dim.replace(/_/g, " ")}</span>
                <span className={`font-mono ${dissonanceColor(v)}`}>
                  {(v ?? 0) > 0 ? "+" : ""}{(v ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          {data.max_dissonance !== null && (
            <div className="text-[10px] text-white/20 mt-2">
              Max dissonance: {data.max_dissonance.toFixed(3)}
            </div>
          )}
        </div>
      )}

      {/* View toggle + dim selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5">
          {(["heatmap", "detail"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? "bg-indigo-600/80 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {v === "heatmap" ? "Heatmap" : "Dimension Detail"}
            </button>
          ))}
        </div>
        {view === "detail" && (
          <div className="flex flex-wrap gap-1.5">
            {dims.map((dim) => (
              <button
                key={dim}
                onClick={() => setSelectedDim(dim === selectedDim ? null : dim)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  selectedDim === dim
                    ? "bg-indigo-600/80 text-white"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                }`}
              >
                {DIM_SHORT[dim] ?? dim}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {view === "heatmap" ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
          <HeatmapView horizons={horizons} />
        </div>
      ) : (
        <div>
          {selectedDim ? (
            <DimensionDetail dim={selectedDim} horizons={horizons} />
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">
              Select a dimension above to explore its prediction trajectory
            </div>
          )}
        </div>
      )}
    </div>
  );
}
