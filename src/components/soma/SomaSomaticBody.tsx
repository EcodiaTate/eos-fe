"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaDimension } from "@/lib/api-client";
import { DIM_META } from "@/lib/soma-dimensions";

// ─── Felt State Body ──────────────────────────────────────────────────────────
// This is the organism's body. 9 dimensions arranged not as a spreadsheet
// but as a living thing — each dimension has a character, a pulse, a gap to close.

function pct(value: number, lo: number, hi: number): number {
  return Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
}

function gapText(error: number): string {
  if (Math.abs(error) < 0.01) return "at setpoint";
  return error > 0 ? `+${error.toFixed(3)} above` : `${error.toFixed(3)} below`;
}

function gapColor(error: number, urgency: number): string {
  if (Math.abs(error) < 0.01) return "text-emerald-400/60";
  if (urgency >= 0.5) return "text-red-400";
  if (urgency >= 0.25) return "text-yellow-400";
  return "text-orange-400/70";
}

function rateArrow(rate: number | undefined): string {
  if (rate === undefined || Math.abs(rate) < 0.001) return "→";
  if (rate > 0.01) return "↑↑";
  if (rate > 0.001) return "↑";
  if (rate < -0.01) return "↓↓";
  return "↓";
}

function rateColor(rate: number | undefined): string {
  if (rate === undefined || Math.abs(rate) < 0.001) return "text-white/20";
  if (rate > 0.01) return "text-red-400";
  if (rate > 0) return "text-orange-400";
  if (rate < -0.01) return "text-emerald-400";
  return "text-teal-400";
}

function DimensionOrb({ dim }: { dim: SomaDimension }) {
  const meta = DIM_META[dim.name];
  if (!meta) return null;

  const [lo, hi] = meta.range;
  const sensedPct = pct(dim.sensed, lo, hi);
  const setpointPct = pct(dim.setpoint, lo, hi);
  const errorAbs = Math.abs(dim.error);
  const dimUrgency = dim.urgency ?? 0;
  const isDistressed = dimUrgency >= 0.5;
  const isAlarm = dimUrgency >= 0.8;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-500 ${
        isAlarm
          ? "border-red-500/40 bg-red-500/5"
          : isDistressed
            ? "border-orange-500/30 bg-orange-500/5"
            : "border-slate-700/50 bg-slate-800/30"
      }`}
      style={{
        boxShadow: isDistressed
          ? `0 0 20px ${isAlarm ? "rgba(239,68,68,0.15)" : "rgba(251,146,60,0.1)"}`
          : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: meta.color }}>{meta.icon}</span>
          <div>
            <div className="text-sm font-semibold text-white/80">{meta.label}</div>
            <div className="text-[10px] text-white/25">{meta.desc}</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-xl font-bold tabular-nums font-mono ${
              isAlarm ? "text-red-400" : isDistressed ? "text-yellow-400" : "text-white/70"
            }`}
          >
            {dim.sensed.toFixed(3)}
          </div>
          <div className={`text-[10px] ${rateColor(dim.error_rate)}`}>
            {rateArrow(dim.error_rate)} {dim.error_rate !== undefined ? dim.error_rate.toFixed(4) : "—"}/s
          </div>
        </div>
      </div>

      {/* Sensed bar with setpoint marker */}
      <div className="relative h-3 bg-slate-700 rounded-full overflow-visible mb-2">
        {/* Sensed fill */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${sensedPct}%`,
            background: isAlarm
              ? "rgba(239,68,68,0.8)"
              : isDistressed
                ? "rgba(251,146,60,0.8)"
                : meta.color,
            boxShadow: isDistressed ? `0 0 8px ${meta.glow}` : undefined,
          }}
        />
        {/* Setpoint marker — the organism's target */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/30 rounded-full"
          style={{ left: `${setpointPct}%` }}
          title={`Setpoint: ${dim.setpoint.toFixed(3)}`}
        />
      </div>

      {/* Sensed vs Setpoint labels */}
      <div className="flex items-center justify-between text-[10px] mb-3">
        <span className="text-white/25">setpoint: {dim.setpoint.toFixed(3)}</span>
        <span className={gapColor(dim.error, dim.urgency ?? 0)}>
          {gapText(dim.error)}
        </span>
      </div>

      {/* Error bar */}
      {errorAbs > 0.005 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20 w-8">err</span>
          <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, errorAbs * 200)}%`,
                background: dim.error > 0 ? "#f87171" : "#22d3ee",
                opacity: 0.7,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/30 w-14 text-right">
            {dim.error > 0 ? "+" : ""}{dim.error.toFixed(3)}
          </span>
        </div>
      )}

      {/* Temporal dissonance indicator */}
      {dim.temporal_dissonance !== undefined && Math.abs(dim.temporal_dissonance) >= 0.1 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px]">
          <span className="text-white/20">⟺</span>
          <span className="text-orange-400/70">
            temporal dissonance {dim.temporal_dissonance > 0 ? "+" : ""}{dim.temporal_dissonance.toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Metabolic Summary ─────────────────────────────────────────────────────

function MetabolicBar({ signal }: { signal: {
  energy_burn_rate?: number;
  predicted_energy_exhaustion_s?: number | null;
} | null }) {
  if (!signal) return null;

  const burnRate = signal.energy_burn_rate ?? 0;
  const exhaustion = signal.predicted_energy_exhaustion_s;

  let exhaustionLabel = "∞";
  let exhaustionColor = "text-emerald-400";
  if (exhaustion !== null && exhaustion !== undefined) {
    if (exhaustion < 300) {
      exhaustionLabel = `${Math.round(exhaustion)}s`;
      exhaustionColor = "text-red-400";
    } else if (exhaustion < 3600) {
      exhaustionLabel = `${Math.round(exhaustion / 60)}m`;
      exhaustionColor = "text-yellow-400";
    } else if (exhaustion < 86400) {
      exhaustionLabel = `${(exhaustion / 3600).toFixed(1)}h`;
      exhaustionColor = "text-teal-400";
    } else {
      exhaustionLabel = `${(exhaustion / 86400).toFixed(1)}d`;
      exhaustionColor = "text-emerald-400";
    }
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="text-[11px] text-white/20 uppercase tracking-widest mb-3">
        Metabolic State
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-white/25 mb-1">ATP burn rate</div>
          <div className="text-lg font-bold font-mono text-white/70">
            {burnRate.toFixed(4)}
          </div>
          <div className="text-[10px] text-white/20">ATP/cycle</div>
        </div>
        <div>
          <div className="text-[10px] text-white/25 mb-1">Energy exhaustion</div>
          <div className={`text-lg font-bold font-mono ${exhaustionColor}`}>
            {exhaustionLabel}
          </div>
          <div className="text-[10px] text-white/20">predicted</div>
        </div>
      </div>
    </div>
  );
}

// ─── Somatic Memory Panel ─────────────────────────────────────────────────────

function SomaticMemory() {
  const { data, loading, error } = useApi(() => api.somaMarkers(), { intervalMs: 5000 });

  if (loading) return <div className="text-white/30 text-sm">Loading somatic memory…</div>;
  if (error) return <div className="text-red-400/60 text-sm">{error}</div>;
  if (!data || data.status === "no_marker" || !data.current_marker) {
    return (
      <div className="text-white/20 text-sm italic">No somatic markers encoded yet</div>
    );
  }

  const marker = data.current_marker;
  const vector = data.marker_vector;
  const labels = data.dimension_labels ?? [];

  // Split vector into [9 sensed, 9 errors, 1 pe]
  const sensedVals = vector.slice(0, 9);
  const errorVals = vector.slice(9, 18);
  const pe = vector[18] ?? 0;
  const dimNames = labels.slice(0, 9);

  return (
    <div className="space-y-4">
      {/* Marker context */}
      {marker.allostatic_context && (
        <div className="text-[11px] text-white/30 italic">
          Context: {marker.allostatic_context}
        </div>
      )}

      {/* 19D vector visualization */}
      <div>
        <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
          19D Somatic Vector — sensed (cyan) · errors (orange) · PE
        </div>
        <div className="flex gap-0.5 items-end h-12">
          {sensedVals.map((v, i) => (
            <div
              key={`s${i}`}
              className="flex-1 rounded-t-sm bg-cyan-500/50 transition-all"
              style={{ height: `${Math.abs(v) * 100}%` }}
              title={`${dimNames[i]}: ${v.toFixed(3)}`}
            />
          ))}
          <div className="w-px bg-white/10 self-stretch mx-0.5" />
          {errorVals.map((v, i) => (
            <div
              key={`e${i}`}
              className="flex-1 rounded-t-sm bg-orange-500/50 transition-all"
              style={{ height: `${Math.min(100, Math.abs(v) * 300)}%` }}
              title={`${dimNames[i]}_err: ${v.toFixed(3)}`}
            />
          ))}
          <div className="w-px bg-white/10 self-stretch mx-0.5" />
          <div
            className="w-3 rounded-t-sm bg-purple-500/50 transition-all"
            style={{ height: `${Math.min(100, pe * 200)}%` }}
            title={`Prediction error: ${pe.toFixed(3)}`}
          />
        </div>
        <div className="flex justify-between text-[9px] text-white/15 mt-1">
          <span>sensed (9D)</span>
          <span>errors (9D)</span>
          <span>PE</span>
        </div>
      </div>

      {/* Key values */}
      <div className="grid grid-cols-3 gap-2">
        {dimNames.map((name, i) => (
          <div key={name} className="text-[10px]">
            <span className="text-white/25 capitalize">{name.replace(/_/g, " ")}: </span>
            <span className="text-cyan-400/70 font-mono">{sensedVals[i]?.toFixed(2) ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/25 border-t border-slate-700/30 pt-2 mt-2">
        <span>Prediction error at encoding</span>
        <span className="font-mono text-purple-400/60">{pe.toFixed(4)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SomaSomaticBody() {
  const { data: stateData, loading, error } = useApi(() => api.somaState(), { intervalMs: 2000 });
  const { data: signalData } = useApi(() => api.somaSignal(), { intervalMs: 2000 });

  if (loading) return <div className="text-white/40 text-sm">Sensing body state…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!stateData) return null;

  const dims = stateData.dimensions ?? [];

  // Sort: highest urgency first, so the organism's distress is front-and-center
  const sorted = [...dims].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0));

  const urgency = stateData.overall_urgency ?? 0;
  const urgencyClassification = stateData.urgency_classification ?? "nominal";
  const dominantName = stateData.dominant_error?.replace(/_/g, " ") ?? "—";

  return (
    <div className="space-y-8">
      {/* Overall felt sense */}
      <div
        className={`rounded-2xl border p-6 ${
          urgencyClassification === "critical"
            ? "border-red-500/40 bg-red-500/5"
            : urgencyClassification === "warning"
              ? "border-yellow-500/30 bg-yellow-500/5"
              : "border-slate-700/50 bg-slate-800/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-white/20 uppercase tracking-widest mb-1">
              Felt Sense — Overall Allostatic Urgency
            </div>
            <div
              className={`text-5xl font-bold tabular-nums ${
                urgency >= 0.6 ? "text-red-400" : urgency >= 0.3 ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {(urgency * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/20 uppercase tracking-widest mb-1">Dominant gap</div>
            <div className="text-lg font-semibold text-white/60 capitalize">{dominantName}</div>
            {stateData.max_error_magnitude !== undefined && (
              <div className="text-[11px] text-white/25 font-mono">
                magnitude {stateData.max_error_magnitude.toFixed(3)}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              urgency >= 0.6 ? "bg-red-500" : urgency >= 0.3 ? "bg-yellow-500" : "bg-emerald-500"
            }`}
            style={{ width: `${urgency * 100}%` }}
          />
        </div>
      </div>

      {/* Metabolic state */}
      <MetabolicBar signal={signalData ?? null} />

      {/* 9D dimension orbs — the body itself */}
      <div>
        <div className="text-[11px] text-white/20 uppercase tracking-widest mb-3">
          The 9 Dimensions — sensed · setpoint · gap
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((dim) => (
            <DimensionOrb key={dim.name} dim={dim} />
          ))}
        </div>
      </div>

      {/* Somatic Memory */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-5">
        <div className="text-[11px] text-white/20 uppercase tracking-widest mb-4">
          Somatic Memory — current 19D marker vector
        </div>
        <SomaticMemory />
      </div>
    </div>
  );
}
