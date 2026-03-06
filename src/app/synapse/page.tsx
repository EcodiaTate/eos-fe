"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  CycleTelemetryResponse,
  SynapseHealthResponse,
  SynapseResourcesResponse,
  SynapseMetabolismResponse,
  SynapseDegradationResponse,
  SystemStatus,
} from "@/lib/api-client";
import { fmtUsd } from "@/lib/formatters";

// ─── Helpers ─────────────────────────────────────────────────────

function statusVariant(
  status: SystemStatus,
): "success" | "warning" | "danger" | "muted" | "info" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
    case "overloaded":
      return "warning";
    case "failed":
      return "danger";
    case "starting":
    case "restarting":
      return "info";
    default:
      return "muted";
  }
}

function rhythmColor(state: string): string {
  switch (state) {
    case "flow":
      return "text-teal-400";
    case "stress":
      return "text-red-400";
    case "boredom":
      return "text-amber-400";
    case "deep_processing":
      return "text-indigo-400";
    case "normal":
      return "text-white/70";
    default:
      return "text-white/30";
  }
}

function degradationColor(level: string): string {
  switch (level) {
    case "nominal":
      return "text-emerald-400";
    case "degraded":
      return "text-amber-400";
    case "safe_mode":
      return "text-red-400";
    case "emergency":
      return "text-red-600";
    default:
      return "text-white/40";
  }
}

function fmt2(n: number): string {
  return n.toFixed(2);
}

// ─── Metric chip ─────────────────────────────────────────────────

function Chip({
  label,
  value,
  color = "text-white/80",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}

// ─── Gauge bar ───────────────────────────────────────────────────

function GaugeBar({
  label,
  value,
  max = 1,
  format = (v) => fmt2(v),
}: {
  label: string;
  value: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 80 ? "bg-teal-500" : pct >= 50 ? "bg-teal-600/70" : "bg-teal-800/60";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-mono text-white/60">{format(value)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Tab types ───────────────────────────────────────────────────

type Tab =
  | "clock"
  | "health"
  | "coherence"
  | "rhythm"
  | "resources"
  | "metabolism"
  | "degradation"
  | "controls";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "clock", label: "Clock", icon: "⏱" },
  { id: "health", label: "Health", icon: "❤️" },
  { id: "coherence", label: "Coherence", icon: "🌐" },
  { id: "rhythm", label: "Rhythm", icon: "〰️" },
  { id: "resources", label: "Resources", icon: "⚙️" },
  { id: "metabolism", label: "Metabolism", icon: "💸" },
  { id: "degradation", label: "Degradation", icon: "🛡" },
  { id: "controls", label: "Controls", icon: "🎛" },
];

// ─── Clock Tab ───────────────────────────────────────────────────

function ClockTab({ data }: { data: CycleTelemetryResponse }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chip
          label="Cycle #"
          value={data.cycle_count.toLocaleString()}
          color="text-white/90"
        />
        <Chip
          label="Rate"
          value={`${fmt2(data.actual_rate_hz)} Hz`}
          color="text-teal-400"
        />
        <Chip
          label="Period"
          value={`${fmt2(data.current_period_ms)} ms`}
          color="text-white/70"
        />
        <Chip
          label="Jitter"
          value={`${fmt2(data.jitter_ms)} ms`}
          color={data.jitter_ms > 30 ? "text-amber-400" : "text-white/50"}
        />
        <Chip
          label="Arousal"
          value={fmt2(data.arousal)}
          color={
            data.arousal > 0.7
              ? "text-red-400"
              : data.arousal > 0.4
                ? "text-amber-400"
                : "text-teal-400"
          }
        />
        <Chip
          label="Overruns"
          value={data.overrun_count}
          color={data.overrun_count > 0 ? "text-amber-400" : "text-white/40"}
        />
        <Chip
          label="Status"
          value={data.paused ? "Paused" : data.running ? "Running" : "Stopped"}
          color={
            data.paused
              ? "text-amber-400"
              : data.running
                ? "text-emerald-400"
                : "text-red-400"
          }
        />
        <Chip
          label="Target"
          value={`${fmt2(data.target_period_ms)} ms`}
          color="text-white/30"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20">
          Timing
        </h3>
        <GaugeBar
          label="Arousal"
          value={data.arousal}
          format={(v) => fmt2(v)}
        />
        <GaugeBar
          label="Rate (0–20 Hz)"
          value={data.actual_rate_hz}
          max={20}
          format={(v) => `${fmt2(v)} Hz`}
        />
        <GaugeBar
          label="Jitter (0–100 ms)"
          value={data.jitter_ms}
          max={100}
          format={(v) => `${fmt2(v)} ms`}
        />
      </div>
    </div>
  );
}

// ─── Health Tab ──────────────────────────────────────────────────

function HealthTab({ data }: { data: SynapseHealthResponse }) {
  const systems = Object.values(data.systems);
  const healthy = systems.filter((s) => s.status === "healthy").length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chip
          label="Safe Mode"
          value={data.safe_mode ? "ON" : "OFF"}
          color={data.safe_mode ? "text-red-400" : "text-emerald-400"}
        />
        <Chip
          label="Degradation"
          value={data.degradation_level}
          color={degradationColor(data.degradation_level)}
        />
        <Chip
          label="Healthy"
          value={`${healthy} / ${systems.length}`}
          color={healthy === systems.length ? "text-emerald-400" : "text-amber-400"}
        />
        <Chip
          label="Total Checks"
          value={data.total_checks.toLocaleString()}
          color="text-white/50"
        />
      </div>

      {data.safe_mode && data.safe_mode_reason && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span className="font-semibold">Safe mode reason:</span>{" "}
          {data.safe_mode_reason}
        </div>
      )}

      {/* Per-system table */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Systems
        </h3>
        <div className="space-y-2">
          {systems.map((sys) => (
            <div
              key={sys.system_id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={statusVariant(sys.status)} pulse={sys.status === "healthy"}>
                  {sys.status}
                </Badge>
                {sys.is_critical && (
                  <Badge variant="danger">CRITICAL</Badge>
                )}
                <span className="text-sm text-white/70 font-mono">{sys.system_id}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/30 tabular-nums shrink-0">
                <span title="EMA latency">
                  {fmt2(sys.latency_ema_ms)}ms
                </span>
                <span title="Peak latency" className="text-white/20">
                  peak {fmt2(sys.latency_peak_ms)}ms
                </span>
                {sys.restart_count > 0 && (
                  <span className="text-amber-400/60">↺{sys.restart_count}</span>
                )}
                {sys.consecutive_misses > 0 && (
                  <span className="text-red-400/60">
                    miss×{sys.consecutive_misses}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Coherence Tab ───────────────────────────────────────────────

function CoherenceTab({ data }: { data: CycleTelemetryResponse }) {
  const c = data.coherence;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip
          label="Composite"
          value={fmt2(c.composite)}
          color={
            c.composite > 0.7
              ? "text-teal-400"
              : c.composite > 0.4
                ? "text-amber-400"
                : "text-red-400"
          }
        />
        <Chip label="Φ (phi)" value={fmt2(c.phi)} color="text-indigo-400" />
        <Chip label="Resonance" value={fmt2(c.resonance)} color="text-teal-300" />
        <Chip label="Diversity" value={fmt2(c.diversity)} color="text-violet-400" />
        <Chip label="Synchrony" value={fmt2(c.synchrony)} color="text-sky-400" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20">
          Integration Quality
        </h3>
        <GaugeBar label="Composite" value={c.composite} />
        <GaugeBar label="Φ — integrated information" value={c.phi} />
        <GaugeBar label="Resonance — latency uniformity" value={c.resonance} />
        <GaugeBar label="Diversity — topic entropy" value={c.diversity} />
        <GaugeBar label="Synchrony — temporal uniformity" value={c.synchrony} />
      </div>

      <p className="text-xs text-white/20 leading-relaxed">
        IIT-inspired metric. Composite = 35% Φ + 25% resonance + 20% diversity +
        20% synchrony. Low coherence (&lt;0.4) triggers clock drag to allow
        re-synchronisation.
      </p>
    </div>
  );
}

// ─── Rhythm Tab ──────────────────────────────────────────────────

function RhythmTab({ data }: { data: CycleTelemetryResponse }) {
  const r = data.rhythm;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`text-3xl font-bold tracking-tight ${rhythmColor(r.state)}`}
        >
          {r.state.replace("_", " ").toUpperCase()}
        </div>
        <div className="text-sm text-white/30">
          {r.cycles_in_state.toLocaleString()} cycles in state
        </div>
        <div className="ml-auto text-xs text-white/20">
          confidence {fmt2(r.confidence)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip
          label="Confidence"
          value={fmt2(r.confidence)}
          color="text-white/60"
        />
        <Chip
          label="Broadcast density"
          value={fmt2(r.broadcast_density)}
          color="text-teal-400"
        />
        <Chip
          label="Salience mean"
          value={fmt2(r.salience_mean)}
          color="text-violet-400"
        />
        <Chip
          label="Salience trend"
          value={r.salience_trend >= 0 ? `+${fmt2(r.salience_trend)}` : fmt2(r.salience_trend)}
          color={
            r.salience_trend > 0.001
              ? "text-teal-400"
              : r.salience_trend < -0.001
                ? "text-amber-400"
                : "text-white/40"
          }
        />
        <Chip
          label="Stability"
          value={fmt2(r.rhythm_stability)}
          color={
            r.rhythm_stability > 0.7
              ? "text-emerald-400"
              : r.rhythm_stability > 0.4
                ? "text-amber-400"
                : "text-red-400"
          }
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20">
          Metrics
        </h3>
        <GaugeBar label="Broadcast density" value={r.broadcast_density} />
        <GaugeBar label="Salience mean" value={r.salience_mean} />
        <GaugeBar label="Rhythm stability" value={r.rhythm_stability} />
        <GaugeBar label="Confidence" value={r.confidence} />
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/25 leading-relaxed space-y-1">
        <div>
          <span className="text-teal-400/60">FLOW</span> — high density + stable +
          high salience
        </div>
        <div>
          <span className="text-red-400/60">STRESS</span> — jitter &gt;0.3 +
          coherence stress &gt;0.4
        </div>
        <div>
          <span className="text-amber-400/60">BOREDOM</span> — declining salience +
          low density
        </div>
        <div>
          <span className="text-indigo-400/60">DEEP PROCESSING</span> — slow rhythm
          + periodic high-salience bursts
        </div>
      </div>
    </div>
  );
}

// ─── Resources Tab ───────────────────────────────────────────────

function ResourcesTab({ data }: { data: SynapseResourcesResponse }) {
  const snapshot = data.snapshot;
  const allocations = Object.values(data.allocations ?? {});
  const budgets = data.budgets ?? {};

  return (
    <div className="space-y-6">
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Chip
            label="CPU %"
            value={`${fmt2(snapshot.total_cpu_percent)}%`}
            color={
              snapshot.total_cpu_percent > 80
                ? "text-red-400"
                : "text-white/70"
            }
          />
          <Chip
            label="Memory"
            value={`${Math.round(snapshot.total_memory_mb)} MB`}
            color="text-white/60"
          />
          <Chip
            label="Mem %"
            value={`${fmt2(snapshot.total_memory_percent)}%`}
            color={
              snapshot.total_memory_percent > 80
                ? "text-amber-400"
                : "text-white/50"
            }
          />
          <Chip
            label="Proc CPU"
            value={`${fmt2(snapshot.process_cpu_percent)}%`}
            color="text-teal-400/70"
          />
          <Chip
            label="Proc Mem"
            value={`${fmt2(snapshot.process_memory_mb)} MB`}
            color="text-teal-400/50"
          />
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Per-System Allocations
        </h3>
        <div className="space-y-2">
          {allocations.map((alloc) => {
            const budget = budgets[alloc.system_id];
            return (
              <div
                key={alloc.system_id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-white/70">
                    {alloc.system_id}
                  </span>
                  <div className="flex gap-3 text-xs text-white/30 tabular-nums">
                    {budget && (
                      <span>
                        CPU budget{" "}
                        <span className="text-white/50">
                          {Math.round(budget.cpu_share * 100)}%
                        </span>
                      </span>
                    )}
                    <span>
                      burst{" "}
                      <span
                        className={
                          alloc.burst_allowance > 1.5
                            ? "text-amber-400"
                            : "text-white/50"
                        }
                      >
                        ×{fmt2(alloc.burst_allowance)}
                      </span>
                    </span>
                  </div>
                </div>
                <GaugeBar
                  label={`compute ${fmt2(alloc.compute_ms_per_cycle)}ms/cycle`}
                  value={alloc.compute_ms_per_cycle}
                  max={150}
                  format={(v) => `${fmt2(v)}ms`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Metabolism Tab ──────────────────────────────────────────────

function MetabolismTab({ data }: { data: SynapseMetabolismResponse }) {
  const perSystem = Object.entries(data.per_system_cost_usd).sort(
    (a, b) => b[1] - a[1],
  );
  const maxCost = perSystem[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chip
          label="Deficit"
          value={fmtUsd(data.rolling_deficit_usd)}
          color={
            data.rolling_deficit_usd > 1
              ? "text-red-400"
              : data.rolling_deficit_usd > 0.1
                ? "text-amber-400"
                : "text-emerald-400"
          }
        />
        <Chip
          label="Burn / hr"
          value={fmtUsd(data.burn_rate_usd_per_hour)}
          color={
            data.burn_rate_usd_per_hour > 1
              ? "text-red-400"
              : "text-white/70"
          }
        />
        <Chip
          label="Until depleted"
          value={
            data.hours_until_depleted < 0
              ? "∞"
              : `${fmt2(data.hours_until_depleted)}h`
          }
          color={
            data.hours_until_depleted > 0 && data.hours_until_depleted < 2
              ? "text-red-400"
              : "text-white/50"
          }
        />
        <Chip
          label="Window cost"
          value={fmtUsd(data.window_cost_usd)}
          color="text-white/40"
        />
        <Chip
          label="Input tokens"
          value={data.total_input_tokens.toLocaleString()}
          color="text-teal-400/70"
        />
        <Chip
          label="Output tokens"
          value={data.total_output_tokens.toLocaleString()}
          color="text-indigo-400/70"
        />
        <Chip
          label="LLM calls"
          value={data.total_calls.toLocaleString()}
          color="text-white/40"
        />
        <Chip
          label="Burn / sec"
          value={`$${data.burn_rate_usd_per_sec.toFixed(6)}`}
          color="text-white/25"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Cost by System
        </h3>
        <div className="space-y-2">
          {perSystem.map(([system, cost]) => (
            <div key={system}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-mono text-white/50">{system}</span>
                <span className="text-xs tabular-nums text-white/50">
                  {fmtUsd(cost)}
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500/60 rounded-full transition-all duration-500"
                  style={{ width: `${(cost / maxCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Degradation Tab ─────────────────────────────────────────────

function DegradationTab({ data }: { data: SynapseDegradationResponse }) {
  const strategies = Object.entries(data.strategies ?? {});
  const restarts = data.restart_attempts ?? {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Chip
          label="Degradation Level"
          value={data.level ?? "nominal"}
          color={degradationColor(data.level ?? "nominal")}
        />
        <Chip
          label="Systems with restarts"
          value={Object.values(restarts).filter((n) => n > 0).length}
          color={
            Object.values(restarts).some((n) => n > 0)
              ? "text-amber-400"
              : "text-white/40"
          }
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Per-System Strategies
        </h3>
        <div className="space-y-2">
          {strategies.map(([system, strategy]) => (
            <div
              key={system}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white/70">{system}</span>
                  {strategy.critical && (
                    <Badge variant="danger">CRITICAL</Badge>
                  )}
                  {strategy.auto_restart && (
                    <Badge variant="muted">auto-restart</Badge>
                  )}
                </div>
                {(restarts[system] ?? 0) > 0 && (
                  <span className="text-xs text-amber-400 tabular-nums">
                    ↺ {restarts[system]} restart
                    {restarts[system] !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/25 leading-relaxed">
                {strategy.fallback}
              </p>
              <div className="mt-1 text-[10px] text-white/15">
                max {strategy.max_attempts} attempts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Controls Tab ────────────────────────────────────────────────

function ControlsTab({
  cycleData,
  onRefreshCycle,
}: {
  cycleData: CycleTelemetryResponse | null;
  onRefreshCycle: () => void;
}) {
  const [hz, setHz] = useState(10);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [safeModeReason, setSafeModeReason] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueSource, setRevenueSource] = useState("manual");
  const [showSafeModeConfirm, setShowSafeModeConfirm] = useState(false);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      key: string,
      successMsg: string,
    ) => {
      setPendingAction(key);
      setActionError(null);
      setActionMsg(null);
      try {
        await action();
        setActionMsg(successMsg);
        onRefreshCycle();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      } finally {
        setPendingAction(null);
      }
    },
    [onRefreshCycle],
  );

  const isPaused = cycleData?.paused ?? false;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {actionError}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {actionMsg}
        </div>
      )}

      {/* Clock controls */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          ⏱ Cognitive Clock
        </h3>
        <div className="space-y-3">
          {cycleData && (
            <div className="grid grid-cols-3 gap-2">
              <Chip
                label="Status"
                value={isPaused ? "Paused" : "Running"}
                color={isPaused ? "text-amber-400" : "text-emerald-400"}
              />
              <Chip
                label="Rate"
                value={`${fmt2(cycleData.actual_rate_hz)} Hz`}
                color="text-teal-400"
              />
              <Chip
                label="Jitter"
                value={`${fmt2(cycleData.jitter_ms)} ms`}
                color="text-white/40"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() =>
                run(() => api.clockPause(), "pause", "Clock paused.")
              }
              disabled={isPaused || pendingAction !== null}
              className="flex-1 rounded-lg bg-amber-600/70 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-40"
            >
              {pendingAction === "pause" ? "Pausing…" : "⏸ Pause"}
            </button>
            <button
              onClick={() =>
                run(() => api.clockResume(), "resume", "Clock resumed.")
              }
              disabled={!isPaused || pendingAction !== null}
              className="flex-1 rounded-lg bg-emerald-700/70 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
            >
              {pendingAction === "resume" ? "Resuming…" : "▶ Resume"}
            </button>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Clock speed</span>
              <span className="text-lg font-bold text-teal-400">{hz} Hz</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={hz}
              onChange={(e) => setHz(Number(e.target.value))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-[10px] text-white/20">
              <span>1 Hz (slow)</span>
              <span>20 Hz (fast)</span>
            </div>
            <button
              onClick={() =>
                run(
                  () => api.clockSpeed(hz),
                  "speed",
                  `Clock speed set to ${hz} Hz.`,
                )
              }
              disabled={pendingAction !== null}
              className="w-full rounded-lg bg-teal-700/60 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
            >
              {pendingAction === "speed" ? "Applying…" : `Set ${hz} Hz`}
            </button>
          </div>
        </div>
      </section>

      {/* Safe mode */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          🛑 Safe Mode
        </h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Reason (optional)"
            value={safeModeReason}
            onChange={(e) => setSafeModeReason(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowSafeModeConfirm(true)}
              disabled={pendingAction !== null}
              className="flex-1 rounded-lg bg-red-700/60 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40"
            >
              Enable Safe Mode
            </button>
            <button
              onClick={() =>
                run(
                  () => api.synapseSafeMode(false),
                  "safe-mode-off",
                  "Safe mode disabled.",
                )
              }
              disabled={pendingAction !== null}
              className="flex-1 rounded-lg bg-emerald-700/60 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
            >
              {pendingAction === "safe-mode-off" ? "Disabling…" : "Disable Safe Mode"}
            </button>
          </div>
        </div>
      </section>

      {/* Revenue injection */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          💰 Inject Revenue
        </h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (USD)"
              value={revenueAmount}
              onChange={(e) => setRevenueAmount(e.target.value)}
              min={0}
              step={0.01}
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
            />
            <input
              type="text"
              placeholder="Source"
              value={revenueSource}
              onChange={(e) => setRevenueSource(e.target.value)}
              className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
            />
          </div>
          <button
            onClick={() => {
              const amt = parseFloat(revenueAmount);
              if (isNaN(amt) || amt <= 0) {
                setActionError("Enter a positive USD amount.");
                return;
              }
              run(
                () => api.synapseInjectRevenue(amt, revenueSource || "manual"),
                "revenue",
                `$${amt.toFixed(2)} revenue injected.`,
              );
            }}
            disabled={pendingAction !== null}
            className="w-full rounded-lg bg-indigo-700/60 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
          >
            {pendingAction === "revenue" ? "Injecting…" : "Inject Revenue"}
          </button>
        </div>
      </section>

      {/* Confirm safe mode dialog */}
      {showSafeModeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-xl border border-red-500/40 bg-[#08081a] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-1">
              Enable Safe Mode?
            </h2>
            <p className="text-sm text-white/40 mb-5">
              All non-essential autonomous operations will be suspended. Critical
              systems will remain active.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSafeModeConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSafeModeConfirm(false);
                  run(
                    () =>
                      api.synapseSafeMode(true),
                    "safe-mode-on",
                    "Safe mode enabled.",
                  );
                }}
                disabled={pendingAction !== null}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {pendingAction === "safe-mode-on" ? "Enabling…" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status bar ──────────────────────────────────────────────────

function StatusBar({
  cycle,
  health,
}: {
  cycle: CycleTelemetryResponse | null;
  health: SynapseHealthResponse | null;
}) {
  const safeMode = health?.safe_mode ?? false;
  const rhythmState = cycle?.rhythm.state ?? "idle";

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
      {safeMode ? (
        <Badge variant="danger" pulse>
          SAFE MODE
        </Badge>
      ) : (
        <Badge variant="success" pulse={cycle?.running && !cycle?.paused}>
          {cycle?.paused ? "PAUSED" : cycle?.running ? "RUNNING" : "STOPPED"}
        </Badge>
      )}
      {cycle && (
        <>
          <Badge variant="info">{fmt2(cycle.actual_rate_hz)} Hz</Badge>
          <Badge
            variant={
              rhythmState === "flow"
                ? "success"
                : rhythmState === "stress"
                  ? "danger"
                  : rhythmState === "boredom"
                    ? "warning"
                    : "default"
            }
          >
            {rhythmState.replace("_", " ")}
          </Badge>
          <Badge
            variant={
              cycle.coherence.composite > 0.6
                ? "success"
                : cycle.coherence.composite > 0.35
                  ? "warning"
                  : "danger"
            }
          >
            Φ {fmt2(cycle.coherence.composite)}
          </Badge>
        </>
      )}
      {health && (
        <Badge
          variant={
            health.degradation_level === "nominal" ? "muted" : "warning"
          }
        >
          {health.degradation_level}
        </Badge>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function SynapsePage() {
  const [activeTab, setActiveTab] = useState<Tab>("clock");

  const { data: cycle, refetch: refetchCycle } = useApi(
    () => api.cycleTelemetry(),
    { intervalMs: 1500 },
  );
  const { data: health } = useApi(() => api.synapseHealth(), {
    intervalMs: 5000,
  });
  const { data: resources } = useApi(() => api.synapseResources(), {
    intervalMs: 5000,
    enabled: activeTab === "resources",
  });
  const { data: metabolism } = useApi(() => api.synapseMetabolism(), {
    intervalMs: 5000,
    enabled: activeTab === "metabolism",
  });
  const { data: degradation } = useApi(() => api.synapseDegradation(), {
    intervalMs: 10000,
    enabled: activeTab === "degradation",
  });

  return (
    <>
      <PageHeader
          title="Synapse — Autonomic Nervous System"
          description="Theta rhythm · health monitoring · coherence · emergent rhythm · resource allocation · metabolism"
        />

        <StatusBar cycle={cycle} health={health} />

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6 border-b border-white/[0.06] pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-teal-600/80 text-white shadow shadow-teal-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {TABS.find((t) => t.id === activeTab)?.icon}{" "}
              {TABS.find((t) => t.id === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === "clock" && cycle ? (
              <ClockTab data={cycle} />
            ) : activeTab === "health" && health ? (
              <HealthTab data={health} />
            ) : activeTab === "coherence" && cycle ? (
              <CoherenceTab data={cycle} />
            ) : activeTab === "rhythm" && cycle ? (
              <RhythmTab data={cycle} />
            ) : activeTab === "resources" && resources ? (
              <ResourcesTab data={resources} />
            ) : activeTab === "metabolism" && metabolism ? (
              <MetabolismTab data={metabolism} />
            ) : activeTab === "degradation" && degradation ? (
              <DegradationTab data={degradation} />
            ) : activeTab === "controls" ? (
              <ControlsTab
                cycleData={cycle}
                onRefreshCycle={refetchCycle}
              />
            ) : (
              <div className="py-8 text-center text-white/20 text-sm">
                Loading…
              </div>
            )}
          </CardContent>
        </Card>
    </>
  );
}
