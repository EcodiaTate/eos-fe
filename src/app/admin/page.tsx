"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SynapseStatsResponse, SynapseBudgetSystem } from "@/lib/api-client";

// ─── Safe Mode Toggle ─────────────────────────────────────────────

function SafeModeToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const apply = useCallback(async (next: boolean) => {
    setPending(true);
    setError(null);
    const prev = enabled;
    setEnabled(next); // optimistic
    try {
      const res = await api.synapseSafeMode(next);
      setEnabled(res.safe_mode);
    } catch (err) {
      setEnabled(prev); // revert
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
      setShowConfirm(false);
    }
  }, [enabled]);

  return (
    <>
      <div className={`rounded-xl border p-5 ${enabled ? "border-red-500/50 bg-red-500/15" : "border-emerald-500/50 bg-emerald-500/15"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold" style={{ color: "var(--ink)" }}>Safe Mode</div>
            <div className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {enabled ? "System running in restricted safe mode" : "System running normally"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* State pill */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              enabled ? "bg-red-500/30 text-red-300" : "bg-emerald-500/30 text-emerald-300"
            }`}>
              {enabled ? "ON" : "OFF"}
            </span>
            {/* Toggle button */}
            <button
              onClick={() => enabled ? apply(false) : setShowConfirm(true)}
              disabled={pending}
              className={`relative w-12 h-6 rounded-full transition-all focus:outline-none disabled:opacity-50 ${
                enabled ? "bg-red-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-xl border border-red-500/40 p-6 shadow-xl" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--ink)" }}>Enable Safe Mode?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
              Safe mode restricts all non-essential operations. This affects every running system.
              Are you sure you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ background: "var(--bg-button)", color: "var(--ink-soft)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => apply(true)}
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {pending ? "Enabling…" : "Enable Safe Mode"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Clock Controls ───────────────────────────────────────────────

function ClockControls() {
  const { data: cycle } = useApi(() => api.cycleTelemetry(), { intervalMs: 2000 });

  const [hz, setHz] = useState(10);
  const [pendingAction, setPendingAction] = useState<"pause" | "resume" | "speed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPaused = cycle?.paused ?? false;

  const runAction = useCallback(async (action: () => Promise<unknown>, type: "pause" | "resume" | "speed") => {
    setPendingAction(type);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingAction(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Status */}
      {cycle && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.5)" }}>
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Status</div>
            <div className={`text-base font-semibold mt-1 ${isPaused ? "text-yellow-400" : "text-emerald-400"}`}>
              {isPaused ? "Paused" : "Running"}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.5)" }}>
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Actual Hz</div>
            <div className="text-base font-semibold mt-1 text-cyan-400">{cycle.actual_rate_hz.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.5)" }}>
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Jitter</div>
            <div className="text-base font-semibold mt-1" style={{ color: "var(--ink-soft)" }}>{cycle.jitter_ms.toFixed(1)}ms</div>
          </div>
        </div>
      )}

      {/* Pause / Resume */}
      <div className="flex gap-3">
        <button
          onClick={() => runAction(() => api.clockPause(), "pause")}
          disabled={isPaused || pendingAction !== null}
          className="flex-1 py-2.5 rounded-lg bg-yellow-600/80 text-white text-sm font-medium hover:bg-yellow-500 transition-colors disabled:opacity-40"
        >
          {pendingAction === "pause" ? "Pausing…" : "⏸ Pause"}
        </button>
        <button
          onClick={() => runAction(() => api.clockResume(), "resume")}
          disabled={!isPaused || pendingAction !== null}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600/80 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40"
        >
          {pendingAction === "resume" ? "Resuming…" : "▶ Resume"}
        </button>
      </div>

      {/* Hz slider */}
      <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.5)" }}>
        <div className="flex items-center justify-between">
          <span className="text-base" style={{ color: "var(--ink-soft)" }}>Clock Speed</span>
          <span className="text-xl font-bold text-cyan-400">{hz} Hz</span>
        </div>
        <input
          type="range" min={1} max={20} value={hz}
          onChange={(e) => setHz(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
          <span>1 Hz</span>
          <span>20 Hz</span>
        </div>
        <button
          onClick={() => runAction(() => api.clockSpeed(hz), "speed")}
          disabled={pendingAction !== null}
          className="w-full py-2 rounded-lg bg-cyan-700/70 text-white text-sm font-medium hover:bg-cyan-600 transition-colors disabled:opacity-40"
        >
          {pendingAction === "speed" ? "Applying…" : `Set ${hz} Hz`}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Synapse Budget ───────────────────────────────────────────────

function BudgetBar({ sys }: { sys: SynapseBudgetSystem }) {
  const pct = Math.min(100, sys.pct);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-emerald-500";
  const textColor = pct >= 90 ? "text-red-400" : pct >= 70 ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.5)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-base capitalize" style={{ color: "var(--ink-soft)" }}>{sys.name.replace(/_/g, " ")}</span>
        <span className={`text-sm font-bold ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>used {sys.used.toLocaleString()}</span>
        <span>of {sys.allocated.toLocaleString()}</span>
      </div>
    </div>
  );
}

function SynapseBudget() {
  const { data, loading, error } = useApi(() => api.synapseBudget(), { intervalMs: 5000 });

  if (loading) return <div className="text-white/40 text-sm">Loading budget…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const totalPct = data.total_allocated > 0
    ? Math.min(100, (data.total_used / data.total_allocated) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(30, 41, 59, 0.4)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-base" style={{ color: "var(--ink-soft)" }}>Total Budget Usage</span>
          <span className="text-xl font-bold" style={{ color: "var(--ink)" }}>{totalPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
          <div
            className={`h-full rounded-full transition-all ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
            style={{ width: `${totalPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
          <span>used {(data.total_used ?? 0).toLocaleString()}</span>
          <span>allocated {(data.total_allocated ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Per-system */}
      <div className="space-y-2">
        {(data.systems ?? []).map((sys) => (
          <BudgetBar key={sys.name} sys={sys} />
        ))}
      </div>
    </div>
  );
}

// ─── Synapse Stats Table ──────────────────────────────────────────

function SynapseStatsTable() {
  const { data, loading, error } = useApi(() => api.synapseStats(), { intervalMs: 5000 });

  if (loading) return <div className="text-white/40 text-sm">Loading stats…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const entries = Object.entries(data as SynapseStatsResponse).filter(
    ([, v]) => typeof v !== "object" || v === null,
  );

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-base">
        <thead>
          <tr style={{ borderBottom: `1px solid var(--border)`, background: "rgba(30, 41, 59, 0.6)" }}>
            <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest font-medium" style={{ color: "var(--ink-muted)" }}>Key</th>
            <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest font-medium" style={{ color: "var(--ink-muted)" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v], i) => (
            <tr key={k} style={{ borderBottom: "1px solid rgba(226, 232, 240, 0.1)", background: i % 2 === 0 ? "rgba(30, 41, 59, 0.2)" : undefined }}>
              <td className="px-4 py-2 capitalize" style={{ color: "var(--ink-soft)" }}>{k.replace(/_/g, " ")}</td>
              <td className="px-4 py-2 text-right font-mono text-cyan-300/80 text-sm">
                {typeof v === "number" ? v.toLocaleString() : String(v ?? "—")}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>No scalar stats returned</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: budget } = useApi(() => api.synapseBudget(), { intervalMs: 10000 });
  const safeModeEnabled = false; // default; real state lives inside SafeModeToggle

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader
          title="Admin Controls"
          description="Operational controls for Synapse budget management, safe mode, and cognitive clock speed"
        />

        <div className="space-y-10">
          {/* ── Synapse Controls ── */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <span>🧠</span> Synapse Controls
            </h2>
            <div className="space-y-6">
              <SafeModeToggle initialEnabled={safeModeEnabled} />

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ink-soft)" }}>Budget Usage</h3>
                <SynapseBudget />
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ink-soft)" }}>Synapse Stats</h3>
                <SynapseStatsTable />
              </div>
            </div>
          </section>

          {/* ── Clock Controls ── */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <span>⏱</span> Clock Controls
            </h2>
            <ClockControls />
          </section>
        </div>
      </div>
    </div>
  );
}
