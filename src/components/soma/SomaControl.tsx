"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";

const CONTEXTS = [
  {
    id: "conversation",
    label: "Conversation",
    desc: "Social charge ↑, temporal pressure ↑, arousal ↑",
    accent: "border-blue-500/40 hover:border-blue-500/70 hover:bg-blue-500/10",
    active: "border-blue-500 bg-blue-500/15 text-blue-300",
  },
  {
    id: "deep_processing",
    label: "Deep Processing",
    desc: "Coherence ↑, confidence ↑, curiosity ↑",
    accent: "border-violet-500/40 hover:border-violet-500/70 hover:bg-violet-500/10",
    active: "border-violet-500 bg-violet-500/15 text-violet-300",
  },
  {
    id: "recovery",
    label: "Recovery",
    desc: "Energy ↑, integrity ↑, arousal ↓",
    accent: "border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/10",
    active: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
  },
  {
    id: "exploration",
    label: "Exploration",
    desc: "Curiosity ↑, temporal pressure ↓",
    accent: "border-cyan-500/40 hover:border-cyan-500/70 hover:bg-cyan-500/10",
    active: "border-cyan-500 bg-cyan-500/15 text-cyan-300",
  },
] as const;

export function SomaControl() {
  const { data: signal } = useApi(() => api.somaSignal(), { intervalMs: 3000 });
  const [settingContext, setSettingContext] = useState(false);
  const [contextMsg, setContextMsg] = useState<string | null>(null);
  const [stress, setStress] = useState(0);
  const [injectingStress, setInjectingStress] = useState(false);
  const [stressMsg, setStressMsg] = useState<string | null>(null);

  async function handleSetContext(ctx: string) {
    setSettingContext(true);
    setContextMsg(null);
    try {
      await api.somaSetContext(ctx);
      setContextMsg(`Context set to "${ctx}"`);
    } catch {
      setContextMsg("Failed to set context");
    } finally {
      setSettingContext(false);
      setTimeout(() => setContextMsg(null), 3000);
    }
  }

  async function handleInjectStress() {
    setInjectingStress(true);
    setStressMsg(null);
    try {
      await api.somaInjectStress(stress);
      setStressMsg(`Stress ${(stress * 100).toFixed(0)}% injected into TEMPORAL_PRESSURE`);
    } catch {
      setStressMsg("Failed to inject stress");
    } finally {
      setInjectingStress(false);
      setTimeout(() => setStressMsg(null), 4000);
    }
  }

  return (
    <div className="space-y-8">
      {/* Live signal summary */}
      {signal && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="text-[11px] text-white/30 uppercase tracking-widest mb-3">Current Signal</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[11px] text-white/20">Urgency</div>
              <div className="text-lg font-bold text-white/70">
                {((signal.signal_strength ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/20">Trajectory</div>
              <div className="text-lg font-bold text-white/70 capitalize">
                {signal.direction ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/20">Dominant dim</div>
              <div className="text-sm font-semibold text-white/70 capitalize mt-1">
                {signal.dominant_dimension?.replace(/_/g, " ") ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/20">Cycle</div>
              <div className="text-lg font-bold text-white/40 tabular-nums">
                {signal.cycle_number ?? "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allostatic context */}
      <div>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
          Set Allostatic Context
        </h3>
        <p className="text-sm text-white/30 mb-4">
          Adjusts setpoint targets for all 9 dimensions. Takes effect within ~20 theta cycles.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CONTEXTS.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => handleSetContext(ctx.id)}
              disabled={settingContext}
              className={`text-left rounded-xl border p-4 transition-all disabled:opacity-50 ${ctx.accent}`}
            >
              <div className="font-semibold text-white/80 mb-1">{ctx.label}</div>
              <div className="text-[12px] text-white/40">{ctx.desc}</div>
            </button>
          ))}
        </div>
        {contextMsg && (
          <p className="mt-3 text-sm text-emerald-400">{contextMsg}</p>
        )}
      </div>

      {/* Stress injection */}
      <div>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
          Inject External Stress
        </h3>
        <p className="text-sm text-white/30 mb-4">
          Directly modulates TEMPORAL_PRESSURE dimension by up to +0.3 at stress=1.0. Simulates
          economic or environmental volatility.
        </p>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stress}
              onChange={(e) => setStress(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-500"
            />
            <span className="text-2xl font-bold font-mono text-cyan-400 w-16 text-right">
              {(stress * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stress * 100}%`,
                  background:
                    stress >= 0.7
                      ? "rgb(248,113,113)"
                      : stress >= 0.4
                        ? "rgb(251,146,60)"
                        : "rgb(34,211,238)",
                }}
              />
            </div>
            <button
              onClick={handleInjectStress}
              disabled={injectingStress}
              className="px-5 py-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {injectingStress ? "Injecting…" : "Inject"}
            </button>
          </div>
          <div className="text-[11px] text-white/20 flex gap-6">
            <span>0% = no external pressure</span>
            <span>100% = maximum volatility stress</span>
          </div>
          {stressMsg && <p className="text-sm text-cyan-400">{stressMsg}</p>}
        </div>
      </div>
    </div>
  );
}
