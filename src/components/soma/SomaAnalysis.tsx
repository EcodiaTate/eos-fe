"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

function MetricRow({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  warn?: boolean;
}) {
  const display = value !== null && value !== undefined ? value.toFixed(3) : "—";
  const color = warn ? "text-orange-400" : "text-white/70";
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color}`}>
        {display}
        {unit && value !== null && value !== undefined ? (
          <span className="text-white/30 font-normal ml-1">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ?? "border-slate-700 bg-slate-800/40"}`}>
      <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function SomaAnalysis() {
  const { data, loading, error } = useApi(() => api.somaAnalysis(), { intervalMs: 30000 });

  if (loading) return <div className="text-white/40 text-sm">Waiting for deep analysis…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  if (data.status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl animate-pulse">⏳</span>
        <p className="text-white/50 font-medium">Deep analysis pending</p>
        <p className="text-sm text-white/30">Phase C/D paths run every ~15–75 cycles. Check back soon.</p>
      </div>
    );
  }

  const geo = data.geodesic_deviation;
  const curv = data.curvature;
  const emerge = data.emergence;
  const causal = data.causal_flow;
  const rg = data.renormalization;
  const topo = data.topology;
  const psr = data.phase_space_reconstruction;

  return (
    <div className="space-y-4">
      {/* Fisher geodesic deviation */}
      {geo && (
        <SectionCard
          title="Fisher Manifold — Geodesic Deviation"
          accent={
            (geo.scalar ?? 0) >= 2
              ? "border-orange-500/30 bg-orange-500/10"
              : "border-slate-700 bg-slate-800/40"
          }
        >
          <MetricRow label="Scalar deviation" value={geo.scalar} warn={(geo.scalar ?? 0) >= 2} />
          <MetricRow label="Percentile" value={geo.percentile} unit="%" />
          {(geo.dominant_systems ?? []).length > 0 && (
            <div className="mt-2">
              <span className="text-[11px] text-white/30">Dominant systems: </span>
              <span className="text-sm text-white/60">{geo.dominant_systems.join(", ")}</span>
            </div>
          )}
        </SectionCard>
      )}

      {/* Curvature */}
      {curv && (
        <SectionCard
          title="Ricci Curvature"
          accent={
            (curv.overall ?? 0) >= 0.5
              ? "border-red-500/30 bg-red-500/10"
              : "border-slate-700 bg-slate-800/40"
          }
        >
          <MetricRow label="Overall curvature" value={curv.overall} warn={(curv.overall ?? 0) >= 0.5} />
          <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
            <span className="text-sm text-white/50">Most vulnerable region</span>
            <span className="text-sm text-white/70 capitalize">
              {curv.most_vulnerable_region?.replace(/_/g, " ") ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">Vulnerable pairs</span>
            <span className="text-sm font-mono text-white/70">{curv.n_vulnerable_pairs ?? "—"}</span>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Causal flow */}
        {causal && (
          <SectionCard title="Causal Flow (Transfer Entropy)">
            <MetricRow label="Max TE" value={causal.max_te} />
            <MetricRow label="Mean TE" value={causal.mean_te} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-white/50">Dominant pair</span>
              <span className="text-sm text-white/70 capitalize">
                {causal.dominant_pair?.replace(/_/g, " ") ?? "—"}
              </span>
            </div>
          </SectionCard>
        )}

        {/* Causal emergence */}
        {emerge && (
          <SectionCard title="Causal Emergence">
            <MetricRow label="Emergence index" value={emerge.causal_emergence} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-white/50">Macro states</span>
              <span className="text-sm font-mono text-white/70">{emerge.macro_states ?? "—"}</span>
            </div>
          </SectionCard>
        )}

        {/* Topology */}
        {topo && (
          <SectionCard title="Persistent Homology (Topology)">
            {topo.betti_numbers ? (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                <span className="text-sm text-white/50">Betti numbers</span>
                <span className="text-sm font-mono text-white/70">
                  [{topo.betti_numbers.join(", ")}]
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-white/50">Topological breaches</span>
              <span
                className={`text-sm font-mono font-semibold ${(topo.n_breaches ?? 0) > 0 ? "text-red-400" : "text-white/40"}`}
              >
                {topo.n_breaches ?? "—"}
              </span>
            </div>
          </SectionCard>
        )}

        {/* Renormalization */}
        {rg && (
          <SectionCard
            title="Renormalization Group Flow"
            accent={
              rg.anomaly_scale
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-slate-700 bg-slate-800/40"
            }
          >
            <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
              <span className="text-sm text-white/50">Anomaly scale</span>
              <span className={`text-sm ${rg.anomaly_scale ? "text-yellow-400" : "text-white/40"}`}>
                {rg.anomaly_scale ?? "none"}
              </span>
            </div>
            <MetricRow label="Fixed point drift" value={rg.fixed_point_drift} />
            <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
              <span className="text-sm text-white/50">Fixed points</span>
              <span className="text-sm font-mono text-white/70">{rg.n_fixed_points ?? "—"}</span>
            </div>
            {rg.interpretation && (
              <p className="text-xs text-white/40 mt-2 italic">{rg.interpretation}</p>
            )}
          </SectionCard>
        )}
      </div>

      {/* Phase space reconstruction */}
      {psr && (
        <SectionCard title="Phase Space Reconstruction (Lyapunov)">
          <div className="flex gap-6 mb-3">
            <div>
              <span className="text-[11px] text-white/30">Diagnosed</span>
              <div className="text-lg font-bold text-white/70">{psr.n_diagnosed ?? "—"}</div>
            </div>
            <div>
              <span className="text-[11px] text-white/30">Skipped</span>
              <div className="text-lg font-bold text-white/40">{psr.n_skipped ?? "—"}</div>
            </div>
          </div>
          {(psr.chaotic_metrics ?? []).length > 0 && (
            <div className="space-y-1.5">
              {psr.chaotic_metrics.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm rounded bg-red-500/10 border border-red-500/20 px-3 py-2"
                >
                  <span className="text-white/60 capitalize">{m.metric.replace(/_/g, " ")}</span>
                  <span className="font-mono text-red-400">λ={m.lyapunov?.toFixed(4) ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
