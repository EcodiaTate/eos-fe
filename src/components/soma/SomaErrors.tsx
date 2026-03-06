"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { magnitudeColor, magnitudeBg } from "@/lib/magnitude-colors";

export function SomaErrors() {
  const { data, loading, error } = useApi(() => api.somaErrors(), { intervalMs: 3000 });

  if (loading) return <div className="text-white/40 text-sm">Loading error horizons…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const allEmpty = (data.horizons ?? []).every((h) => h.errors.length === 0);

  if (allEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl">✓</span>
        <p className="text-emerald-400 font-medium">All horizons clear</p>
        <p className="text-sm text-white/30">No prediction errors detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(data.horizons ?? []).map((horizon) => (
        <div key={horizon.horizon}>
          <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Horizon: {horizon.horizon}
          </div>
          {horizon.errors.length === 0 ? (
            <div className="text-sm text-white/20 italic px-1">No errors in this horizon</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {horizon.errors
                .slice()
                .sort((a, b) => b.magnitude - a.magnitude)
                .map((e) => (
                  <div
                    key={e.dimension}
                    className={`rounded-lg border p-3 ${magnitudeBg(e.magnitude)}`}
                  >
                    <div className="text-[11px] text-white/40 capitalize mb-2">{e.dimension.replace(/_/g, " ")}</div>
                    <div className="h-2 bg-black/20 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${magnitudeColor(e.magnitude)}`}
                        style={{ width: `${Math.min(100, e.magnitude * 100)}%` }}
                      />
                    </div>
                    <div className="text-right text-xs font-semibold text-white/70">
                      {e.magnitude.toFixed(3)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
