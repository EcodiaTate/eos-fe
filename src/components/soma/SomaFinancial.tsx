"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

const REGIME_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; desc: string }
> = {
  secure: {
    label: "Secure",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    desc: "Full exploration, deep retrieval, creative mode active",
  },
  comfortable: {
    label: "Comfortable",
    color: "text-teal-300",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    desc: "Normal operation, all capabilities available",
  },
  cautious: {
    label: "Cautious",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    desc: "Mild urgency — Nova fast-path, reduced exploration",
  },
  anxious: {
    label: "Anxious",
    color: "text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    desc: "Affect shift active — shallow memory, revenue bias",
  },
  critical: {
    label: "Critical",
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    desc: "Survival mode — only Equor + minimal perception",
  },
  unknown: {
    label: "Unknown",
    color: "text-white/30",
    bg: "bg-slate-800/40",
    border: "border-slate-700",
    desc: "Financial horizon not yet initialized",
  },
};

function biasColor(v: number | null): string {
  if (v === null) return "text-white/20";
  const abs = Math.abs(v);
  if (abs >= 0.3) return v > 0 ? "text-orange-400" : "text-blue-400";
  if (abs >= 0.15) return v > 0 ? "text-yellow-400" : "text-cyan-400";
  return "text-white/40";
}

export function SomaFinancial() {
  const { data, loading, error } = useApi(() => api.somaFinancial(), { intervalMs: 10000 });

  if (loading) return <div className="text-white/40 text-sm">Loading financial depth…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const regime = REGIME_CONFIG[data.regime] ?? REGIME_CONFIG.unknown;
  const thresholds = data.thresholds;
  const biasEntries = Object.entries(data.affect_bias ?? {}).filter(([, v]) => v !== null && Math.abs(v ?? 0) > 0.001);

  return (
    <div className="space-y-6">
      {/* Regime header */}
      <div className={`rounded-xl border p-5 ${regime.bg} ${regime.border}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">
              Financial Regime
            </div>
            <div className={`text-2xl font-bold ${regime.color}`}>{regime.label}</div>
            <p className="text-sm text-white/40 mt-1">{regime.desc}</p>
          </div>
          {data.ttd_days !== null && (
            <div className="text-right">
              <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">TTD</div>
              <div className={`text-3xl font-bold tabular-nums ${regime.color}`}>
                {data.ttd_days >= 1000 ? `${(data.ttd_days / 365).toFixed(1)}y` : `${Math.round(data.ttd_days)}d`}
              </div>
            </div>
          )}
        </div>

        {/* TTD progress bar against thresholds */}
        {data.ttd_days !== null && (
          <div className="mt-4">
            <div className="relative h-3 bg-black/20 rounded-full overflow-hidden">
              {/* Threshold markers */}
              {[
                { days: thresholds.critical_days, color: "bg-red-500" },
                { days: thresholds.anxious_days, color: "bg-orange-500" },
                { days: thresholds.cautious_days, color: "bg-yellow-500" },
                { days: thresholds.comfortable_days, color: "bg-teal-500" },
              ].map(({ days, color }) => {
                const pct = Math.min(100, (days / thresholds.secure_days) * 100);
                return (
                  <div
                    key={days}
                    className={`absolute top-0 bottom-0 w-0.5 ${color} opacity-40`}
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
              {/* Fill */}
              <div
                className={`h-full rounded-full ${regime.bg} border ${regime.border}`}
                style={{
                  width: `${Math.min(100, (data.ttd_days / thresholds.secure_days) * 100)}%`,
                  background: "",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/20">
              <span>Critical ({thresholds.critical_days}d)</span>
              <span>Secure ({thresholds.secure_days}d)</span>
            </div>
          </div>
        )}
      </div>

      {/* Energy burn */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Energy Burn Rate</div>
          <div className="text-xl font-bold text-white/70">
            {data.energy_burn_rate !== null ? data.energy_burn_rate.toFixed(4) : "—"}
          </div>
          <div className="text-[11px] text-white/20 mt-1">ATP/cycle</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Energy Exhaustion</div>
          <div className="text-xl font-bold text-white/70">
            {data.predicted_energy_exhaustion_s !== null
              ? data.predicted_energy_exhaustion_s >= 3600
                ? `${(data.predicted_energy_exhaustion_s / 3600).toFixed(1)}h`
                : `${Math.round(data.predicted_energy_exhaustion_s)}s`
              : "∞"}
          </div>
          <div className="text-[11px] text-white/20 mt-1">predicted</div>
        </div>
      </div>

      {/* Affect bias from financial horizon */}
      {biasEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Financial Affect Bias (per dimension)
          </h3>
          <div className="space-y-2">
            {biasEntries
              .sort(([, a], [, b]) => Math.abs(b ?? 0) - Math.abs(a ?? 0))
              .map(([dim, bias]) => (
                <div
                  key={dim}
                  className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2.5"
                >
                  <span className="flex-1 text-sm text-white/60 capitalize">{dim.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    {/* Diverging bar */}
                    <div className="relative w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
                      <div
                        className="absolute top-0 bottom-0 bg-current"
                        style={{
                          left: (bias ?? 0) >= 0 ? "50%" : `${50 + ((bias ?? 0) / 0.4) * 50}%`,
                          width: `${Math.abs((bias ?? 0) / 0.4) * 50}%`,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono font-semibold w-14 text-right ${biasColor(bias)}`}>
                      {(bias ?? 0) > 0 ? "+" : ""}
                      {bias?.toFixed(3) ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-[11px] text-white/20 mt-2">
            Positive = heightened sensitivity. Negative = suppression. Max ±0.4.
          </p>
        </div>
      )}

      {/* Threshold reference */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
        <h3 className="text-[11px] font-semibold text-white/20 uppercase tracking-widest mb-3">
          Regime Thresholds
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Secure ≥", days: thresholds.secure_days, color: "text-emerald-400/70" },
            { label: "Comfortable ≥", days: thresholds.comfortable_days, color: "text-teal-400/70" },
            { label: "Cautious ≥", days: thresholds.cautious_days, color: "text-yellow-400/70" },
            { label: "Anxious ≥", days: thresholds.anxious_days, color: "text-orange-400/70" },
            { label: "Critical <", days: thresholds.critical_days, color: "text-red-400/70" },
          ].map(({ label, days, color }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/30">{label}</span>
              <span className={`font-mono ${color}`}>{days}d</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
