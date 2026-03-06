"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaRawAttractor } from "@/lib/api-client";

const DEFAULT_BOUND: [number, number] = [-1, 1];

function stabilityColor(stabilityLabel: "stable" | "meta-stable" | "unstable"): string {
  if (stabilityLabel === "stable") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (stabilityLabel === "meta-stable") return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
  return "bg-red-500/20 text-red-300 border-red-500/40";
}

function stabilityLabelFromFloat(stability: number): "stable" | "meta-stable" | "unstable" {
  if (stability >= 0.8) return "stable";
  if (stability >= 0.5) return "meta-stable";
  return "unstable";
}

function valenceColor(v: number): string {
  if (v >= 0.6) return "text-emerald-400";
  if (v >= 0.2) return "text-teal-400";
  if (v >= -0.2) return "text-white/50";
  if (v >= -0.6) return "text-orange-400";
  return "text-red-400";
}

/** Normalise a value within [lo, hi] to a [0, 1] fraction, clamped. */
function norm(value: number, lo: number, hi: number): number {
  if (hi === lo) return 0.5;
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}

// ─── 2D attractor scatter chart ────────────────────────────────────────────────

interface PhaseChartProps {
  attractors: SomaRawAttractor[];
  current: string;
  xDim: string;
  yDim: string;
  xBound: [number, number];
  yBound: [number, number];
}

function PhaseChart({ attractors, current, xDim, yDim, xBound, yBound }: PhaseChartProps) {
  const W = 280;
  const H = 200;
  const PAD = 28;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  // Axis tick count
  const xTicks = [xBound[0], (xBound[0] + xBound[1]) / 2, xBound[1]];
  const yTicks = [yBound[0], (yBound[0] + yBound[1]) / 2, yBound[1]];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 220 }}
      aria-label={`Phase space: ${xDim} vs ${yDim}`}
    >
      {/* Axes */}
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* Grid lines */}
      {yTicks.map((_, i) => {
        const y = PAD + (innerH * i) / (yTicks.length - 1);
        return <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
      })}
      {xTicks.map((_, i) => {
        const x = PAD + (innerW * i) / (xTicks.length - 1);
        return <line key={i} x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
      })}

      {/* X-axis labels */}
      {xTicks.map((v, i) => {
        const x = PAD + (innerW * i) / (xTicks.length - 1);
        return (
          <text key={i} x={x} y={H - PAD + 10} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.2)">
            {v.toFixed(1)}
          </text>
        );
      })}

      {/* Y-axis labels (inverted: low at bottom) */}
      {yTicks.map((v, i) => {
        const y = PAD + (innerH * i) / (yTicks.length - 1);
        const label = yTicks[yTicks.length - 1 - i];
        return (
          <text key={i} x={PAD - 4} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.2)">
            {label.toFixed(1)}
          </text>
        );
      })}

      {/* Axis dimension labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.25)">
        {xDim.replace(/_/g, " ")}
      </text>
      <text
        x={8}
        y={H / 2}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(255,255,255,0.25)"
        transform={`rotate(-90, 8, ${H / 2})`}
      >
        {yDim.replace(/_/g, " ")}
      </text>

      {/* Attractor bubbles */}
      {attractors.map((a) => {
        // x maps to xDim dimension — use valence for X as default; centre for other dims uses stability proxy
        // We only have valence, stability, basin_radius directly; use valence for valence dim, stability for others
        const xRaw = xDim === "valence" ? a.valence : a.stability;
        const yRaw = yDim === "valence" ? a.valence : a.stability;
        const cx = PAD + norm(xRaw, xBound[0], xBound[1]) * innerW;
        // SVG y is top-down; invert so high values appear at top
        const cy = PAD + (1 - norm(yRaw, yBound[0], yBound[1])) * innerH;
        const r = Math.max(4, Math.min(14, a.basin_radius * 60));
        const isCurrent = a.label === current;
        const fill = isCurrent ? "rgba(99,102,241,0.6)" : "rgba(100,116,139,0.3)";
        const stroke = isCurrent ? "#818cf8" : "rgba(148,163,184,0.3)";

        return (
          <g key={a.label}>
            <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isCurrent ? 1.5 : 1} />
            {isCurrent && (
              <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#818cf8" strokeWidth={0.5} opacity={0.4} />
            )}
            <text
              x={cx}
              y={cy - r - 3}
              textAnchor="middle"
              fontSize={7}
              fill={isCurrent ? "#c7d2fe" : "rgba(255,255,255,0.3)"}
            >
              {a.label.replace(/_/g, " ")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SomaPhaseSpace() {
  const { data, loading, error } = useApi(() => api.somaPhaseSpace(), { intervalMs: 4000 });

  if (loading) return <div className="text-white/40 text-sm">Loading phase space…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const rawAttractors: SomaRawAttractor[] = data.raw_attractors ?? [];

  // Resolve axis bounds: prefer API-provided values, fall back to [-1, 1]
  const valenceBound: [number, number] = data.bounds?.valence ?? DEFAULT_BOUND;
  const stabilityBound: [number, number] = data.bounds?.stability ?? DEFAULT_BOUND;

  return (
    <div className="space-y-6">
      {/* Current attractor */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
        <div className="text-[11px] text-indigo-300/50 uppercase tracking-widest mb-1">Current Attractor</div>
        <div className="text-xl font-semibold text-indigo-200 capitalize">{data.current_attractor.replace(/_/g, " ")}</div>
        <div className="text-sm text-indigo-300/50 capitalize mt-1">{data.trajectory.replace(/_/g, " ")}</div>
      </div>

      {/* Phase space scatter chart */}
      {rawAttractors.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
            Phase Space — valence × stability
            {data.bounds ? null : (
              <span className="ml-2 text-yellow-500/50">(fallback bounds)</span>
            )}
          </div>
          <PhaseChart
            attractors={rawAttractors}
            current={data.current_attractor}
            xDim="valence"
            yDim="stability"
            xBound={valenceBound}
            yBound={stabilityBound}
          />
        </div>
      )}

      {/* Rich attractor table */}
      {rawAttractors.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Attractor Landscape ({rawAttractors.length})
          </h3>
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60">
                  {["Attractor", "Stability", "Valence", "Visits", "Dwell time"].map((h) => (
                    <th
                      key={h}
                      className="py-2.5 pr-3 first:pl-4 text-[10px] font-semibold text-white/20 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawAttractors
                  .slice()
                  .sort((a, b) => b.visits - a.visits)
                  .map((a) => (
                    <tr
                      key={a.label}
                      className={`border-b border-slate-700/30 transition-colors ${
                        a.label === data.current_attractor
                          ? "bg-indigo-500/10"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-3 text-sm capitalize">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              a.label === data.current_attractor ? "bg-indigo-400" : "bg-slate-600"
                            }`}
                          />
                          <span className="text-white/70">{a.label.replace(/_/g, " ")}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${a.stability * 100}%` }}
                            />
                          </div>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded border ${stabilityColor(a.stability_label)}`}>
                            {a.stability_label}
                          </span>
                        </div>
                      </td>
                      <td className={`py-2.5 pr-3 text-sm font-semibold font-mono ${valenceColor(a.valence)}`}>
                        {a.valence >= 0 ? "+" : ""}
                        {a.valence.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 text-sm font-mono text-white/50">{a.visits}</td>
                      <td className="py-2.5 pr-3 text-sm font-mono text-white/40">
                        {a.mean_dwell_time_s > 0
                          ? a.mean_dwell_time_s >= 60
                            ? `${(a.mean_dwell_time_s / 60).toFixed(1)}m`
                            : `${a.mean_dwell_time_s.toFixed(1)}s`
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Attractors</h3>
          <div className="space-y-2">
            {data.attractors.map((a) => (
              <div key={a.name} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.name === data.current_attractor ? "bg-indigo-400" : "bg-slate-500"}`} />
                  <span className="text-sm text-white/70 capitalize">{a.name.replace(/_/g, " ")}</span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${stabilityColor(stabilityLabelFromFloat(a.stability))}`}>
                  {stabilityLabelFromFloat(a.stability)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bifurcation warnings */}
      {data.bifurcations.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="text-[11px] text-yellow-400/60 uppercase tracking-widest mb-3">
            Bifurcation Warnings ({data.bifurcations.length})
          </div>
          <ul className="space-y-1.5">
            {data.bifurcations.map((b, i) => (
              <li key={i} className="text-sm text-yellow-200/70 flex items-start gap-2">
                <span className="mt-1 text-yellow-500">›</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
