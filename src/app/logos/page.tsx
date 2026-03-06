"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useAliveStore } from "@/stores/alive-store";
import { api } from "@/lib/api-client";
import type {
  LogosHealthResponse,
  LogosBudgetResponse,
  LogosMetricsResponse,
  LogosSchwarzchildResponse,
  LogosAnchorsResponse,
  LogosCompressionHistoryResponse,
  LogosMemoryTier,
  LogosCompressionCycle,
} from "@/lib/api-client";
import type { SynapseEvent } from "@/lib/types";
import { fmtBits } from "@/lib/formatters";

// ─── Helpers ─────────────────────────────────────────────────────

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmt0(n: number): string {
  return n.toFixed(0);
}

function fmtKU(ku: number): string {
  if (ku >= 1_000_000) return `${(ku / 1_000_000).toFixed(2)}M KU`;
  if (ku >= 1_000) return `${(ku / 1_000).toFixed(1)}K KU`;
  return `${ku.toFixed(0)} KU`;
}

function pressureColor(p: number): string {
  if (p >= 0.95) return "text-red-400";
  if (p >= 0.90) return "text-red-300";
  if (p >= 0.75) return "text-amber-400";
  return "text-teal-400";
}

function pressureBg(p: number): string {
  if (p >= 0.95) return "bg-red-500";
  if (p >= 0.90) return "bg-red-400";
  if (p >= 0.75) return "bg-amber-500";
  if (p >= 0.5) return "bg-teal-500";
  return "bg-teal-700/60";
}

function tierColor(tier: LogosMemoryTier): string {
  switch (tier) {
    case "episodic":    return "bg-indigo-500/70";
    case "semantic":    return "bg-teal-500/70";
    case "procedural":  return "bg-violet-500/70";
    case "hypothesis":  return "bg-amber-500/70";
    case "world_model": return "bg-emerald-500/70";
  }
}

function tierLabel(tier: LogosMemoryTier): string {
  switch (tier) {
    case "episodic":    return "Episodic";
    case "semantic":    return "Semantic";
    case "procedural":  return "Procedural";
    case "hypothesis":  return "Hypothesis";
    case "world_model": return "World Model";
  }
}

function deltaSign(n: number): string {
  return n > 0 ? `+${fmt2(n)}` : fmt2(n);
}

function deltaColor(n: number): string {
  return n > 0.001 ? "text-teal-400" : n < -0.001 ? "text-red-400" : "text-white/30";
}

// ─── Shared sub-components ───────────────────────────────────────

function Chip({
  label,
  value,
  color = "text-white/80",
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
    </div>
  );
}

function GaugeBar({
  label,
  value,
  max = 1,
  format = (v) => fmt2(v),
  colorFn,
  markers,
}: {
  label: string;
  value: number;
  max?: number;
  format?: (v: number) => string;
  colorFn?: (pct: number) => string;
  markers?: { at: number; color: string }[];
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color = colorFn
    ? colorFn(pct / 100)
    : pct >= 80 ? "bg-teal-500" : pct >= 50 ? "bg-teal-600/70" : "bg-teal-800/60";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-mono text-white/60">{format(value)}</span>
      </div>
      <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
        {markers?.map((m) => (
          <div
            key={m.at}
            className={`absolute top-0 bottom-0 w-px ${m.color}`}
            style={{ left: `${m.at * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Live Synapse event feed ──────────────────────────────────────

interface LogosEvent {
  id: string;
  type: string;
  ts: string;
  data: Record<string, unknown>;
}

function useLogosEvents(maxEvents = 30): LogosEvent[] {
  const [events, setEvents] = useState<LogosEvent[]>([]);

  // connected state used to gate connection timing (optional)
  const connected = useAliveStore((s) => s.connected);

  // Patch: intercept synapse events before they reach the store
  // We do this by watching the store's last-event reference via a side-channel.
  // Since the store doesn't expose raw events, we use a module-level ref.
  useEffect(() => {
    const logos_types = new Set([
      "cognitive_pressure",
      "intelligence_metrics",
      "compression_cycle_complete",
      "anchor_memory_created",
      "schwarzschild_threshold_met",
      "world_model_updated",
    ]);

    // Intercept by monkey-patching the WS message handler
    // Actually, the cleanest approach for this codebase is to subscribe
    // to the WebSocket directly for Logos events, reading from the store's
    // connected state. We'll use a separate lightweight WS listener.
    const WS_URL =
      (typeof window !== "undefined" &&
        (process.env.NEXT_PUBLIC_WS_URL ??
          `ws://${window.location.hostname}:8001/ws/alive`)) ||
      "ws://localhost:8001/ws/alive";

    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      ws = new WebSocket(WS_URL as string);

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            stream: string;
            payload: SynapseEvent;
          };
          if (msg.stream !== "synapse") return;
          const event = msg.payload;
          if (!logos_types.has(event.type)) return;

          setEvents((prev) => {
            const next = [
              {
                id: event.id,
                type: event.type,
                ts: event.ts,
                data: event.data,
              },
              ...prev,
            ].slice(0, maxEvents);
            return next;
          });
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!dead) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [maxEvents]);

  void connected; // gate: establishes WS connection intent

  return events;
}

// ─── Intelligence Ratio sparkline (last N data points) ───────────

function useIRatioHistory(maxPoints = 60) {
  const [history, setHistory] = useState<{ t: number; v: number }[]>([]);

  useEffect(() => {
    const logos_types = new Set(["intelligence_metrics"]);
    const WS_URL =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_WS_URL ??
            `ws://${window.location.hostname}:8001/ws/alive`)
        : "ws://localhost:8001/ws/alive";

    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      ws = new WebSocket(WS_URL);

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            stream: string;
            payload: SynapseEvent;
          };
          if (msg.stream !== "synapse") return;
          const event = msg.payload;
          if (!logos_types.has(event.type)) return;
          const ratio = event.data.intelligence_ratio as number | undefined;
          if (typeof ratio !== "number") return;

          setHistory((prev) => {
            const next = [...prev, { t: Date.now(), v: ratio }];
            return next.slice(-maxPoints);
          });
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!dead) reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [maxPoints]);

  return history;
}

// ─── Sparkline SVG ───────────────────────────────────────────────

function Sparkline({
  data,
  width = 320,
  height = 48,
  color = "#5eead4",
}: {
  data: { t: number; v: number }[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-[10px] text-white/20"
      >
        Waiting for data…
      </div>
    );
  }

  const minV = Math.min(...data.map((d) => d.v));
  const maxV = Math.max(...data.map((d) => d.v));
  const range = maxV - minV || 1;

  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.v - minV) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const x = width;
        const y = height - ((last.v - minV) / range) * (height - 8) - 4;
        return <circle cx={x} cy={y} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// ─── Tab types ───────────────────────────────────────────────────

type Tab =
  | "budget"
  | "intelligence"
  | "world_model"
  | "compression"
  | "schwarzschild";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "budget",         label: "Cognitive Budget",   icon: "🧠" },
  { id: "intelligence",   label: "Intelligence Ratio", icon: "📈" },
  { id: "world_model",    label: "World Model",        icon: "🌐" },
  { id: "compression",    label: "Compression",        icon: "⚙️" },
  { id: "schwarzschild",  label: "Schwarzschild",      icon: "⚫" },
];

// ─── Budget Tab ───────────────────────────────────────────────────

const TIER_ORDER: LogosMemoryTier[] = [
  "episodic",
  "semantic",
  "procedural",
  "hypothesis",
  "world_model",
];

function BudgetTab({ data }: { data: LogosBudgetResponse }) {
  const totalPct = data.total_pressure * 100;

  return (
    <div className="space-y-6">
      {/* Main pressure gauge */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">
              Total Cognitive Pressure
            </div>
            <div className={`text-4xl font-bold tabular-nums ${pressureColor(data.total_pressure)}`}>
              {fmt2(totalPct)}%
            </div>
            <div className="text-xs text-white/30 mt-1">
              {fmtKU(data.total_used)} / {fmtKU(data.total_budget)} KU
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-white/25">
              Urgency
            </div>
            <div className={`text-2xl font-semibold tabular-nums ${pressureColor(data.compression_urgency)}`}>
              {fmt2(data.compression_urgency * 100)}%
            </div>
          </div>
        </div>

        {/* Segmented gauge bar */}
        <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
          {/* Used fill */}
          <div
            className={`h-full rounded-full transition-all duration-700 ${pressureBg(data.total_pressure)}`}
            style={{ width: `${Math.min(100, totalPct)}%` }}
          />
          {/* Threshold markers */}
          <div
            className="absolute top-0 bottom-0 w-px bg-amber-400/60"
            style={{ left: `${data.compression_pressure_start * 100}%` }}
            title="Compression starts"
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400/60"
            style={{ left: `${data.emergency_compression * 100}%` }}
            title="Emergency compression"
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-red-600/80"
            style={{ left: `${data.critical_eviction * 100}%` }}
            title="Critical eviction"
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/20">
          <span>0%</span>
          <span className="text-amber-400/60">
            {fmt0(data.compression_pressure_start * 100)}% compress
          </span>
          <span className="text-red-400/60">
            {fmt0(data.emergency_compression * 100)}% emergency
          </span>
          <span className="text-red-600/80">
            {fmt0(data.critical_eviction * 100)}% critical
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Urgency curve explanation */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-white/20 mb-2">
          Compression Urgency Curve
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/30">0 → 75%</span>
              <span className="text-teal-400/70">No pressure</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/30">75% → 90%</span>
              <span className="text-amber-400/70">Passive compression</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/30">90% → 95%</span>
              <span className="text-red-400/70">Emergency compression</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/30">95%+</span>
              <span className="text-red-600">Critical eviction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-tier breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Memory Tiers
        </h3>
        <div className="space-y-3">
          {TIER_ORDER.map((tier) => {
            const t = data.tiers[tier];
            if (!t) return null;
            return (
              <div
                key={tier}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${tierColor(tier)}`}
                    />
                    <span className="text-sm text-white/70 font-medium">
                      {tierLabel(tier)}
                    </span>
                    <span className="text-[10px] text-white/25 uppercase tracking-widest">
                      {fmt0(t.allocation * 100)}% budget
                    </span>
                  </div>
                  <span
                    className={`text-sm tabular-nums font-semibold ${pressureColor(t.pressure)}`}
                  >
                    {fmt2(t.pressure * 100)}%
                  </span>
                </div>
                <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${tierColor(tier)}`}
                    style={{ width: `${Math.min(100, t.pressure * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/20 text-right tabular-nums">
                  {fmtKU(t.used)} / {fmtKU(t.allocated)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Intelligence Tab ─────────────────────────────────────────────

function IntelligenceTab({
  metrics,
  history,
}: {
  metrics: LogosMetricsResponse;
  history: { t: number; v: number }[];
}) {
  const ir = metrics.intelligence_ratio;
  const irColor =
    ir >= 100 ? "text-teal-400" : ir >= 10 ? "text-emerald-400" : "text-white/60";

  return (
    <div className="space-y-6">
      {/* Primary metric */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">
          Intelligence Ratio — I = K(reality modeled) / K(model)
        </div>
        <div className="flex items-end gap-4">
          <div className={`text-5xl font-bold tabular-nums ${irColor}`}>
            {ir >= 1000
              ? `${(ir / 1000).toFixed(2)}K`
              : ir >= 100
                ? fmt2(ir)
                : ir.toFixed(4)}
          </div>
          <div className={`text-lg font-medium pb-1 ${deltaColor(metrics.intelligence_ratio_delta)}`}>
            {deltaSign(metrics.intelligence_ratio_delta)} Δ24h
          </div>
        </div>
        <div className="text-xs text-white/25 mt-1">
          Threshold for Schwarzschild: 100.0
        </div>
      </div>

      {/* Growth trajectory */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-widest text-white/25 mb-3">
          Growth Trajectory (last {history.length} readings · 60s interval)
        </div>
        {history.length >= 2 ? (
          <div className="w-full overflow-hidden">
            <Sparkline data={history} width={600} height={56} color="#5eead4" />
          </div>
        ) : (
          <div className="h-14 flex items-center justify-center text-xs text-white/20">
            Accumulating data…
          </div>
        )}
        {history.length >= 2 && (
          <div className="flex justify-between text-[10px] text-white/20 mt-1">
            <span>
              {new Date(history[0].t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>
              {new Date(history[history.length - 1].t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Supporting metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip
          label="Compression Efficiency"
          value={`${fmt2(metrics.compression_efficiency * 100)}%`}
          color={metrics.compression_efficiency > 0.7 ? "text-teal-400" : "text-amber-400"}
        />
        <Chip
          label="Prediction Accuracy"
          value={`${fmt2(metrics.prediction_accuracy * 100)}%`}
          color={metrics.prediction_accuracy > 0.7 ? "text-emerald-400" : "text-white/60"}
        />
        <Chip
          label="Self-Prediction"
          value={`${fmt2(metrics.self_prediction_accuracy * 100)}%`}
          color={metrics.self_prediction_accuracy >= 0.7 ? "text-teal-400" : "text-white/50"}
          sub="≥70% → Schwarzschild"
        />
        <Chip
          label="Hypothesis Gen Ratio"
          value={fmt2(metrics.hypothesis_generation_ratio)}
          color={metrics.hypothesis_generation_ratio >= 1 ? "text-teal-400" : "text-white/50"}
          sub="≥1.0 → Schwarzschild"
        />
        <Chip
          label="Schema Growth"
          value={`${fmt2(metrics.schema_growth_rate)}/hr`}
          color="text-indigo-400"
        />
        <Chip
          label="Cross-Domain"
          value={metrics.cross_domain_transfers_today}
          color="text-violet-400"
          sub="transfers today"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20">
          24h Deltas
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
              I-Ratio Δ
            </div>
            <div className={`text-sm font-semibold tabular-nums ${deltaColor(metrics.intelligence_ratio_delta)}`}>
              {deltaSign(metrics.intelligence_ratio_delta)}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
              Coverage Δ
            </div>
            <div className={`text-sm font-semibold tabular-nums ${deltaColor(metrics.coverage_delta)}`}>
              {deltaSign(metrics.coverage_delta)}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
              Efficiency Δ
            </div>
            <div className={`text-sm font-semibold tabular-nums ${deltaColor(metrics.compression_efficiency_delta)}`}>
              {deltaSign(metrics.compression_efficiency_delta)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── World Model Tab ──────────────────────────────────────────────

function WorldModelTab({ metrics }: { metrics: LogosMetricsResponse }) {
  const coveragePct = metrics.world_model_coverage * 100;
  const hypoConfirmRate = metrics.hypothesis_confirmation_rate;

  return (
    <div className="space-y-6">
      {/* Vital signs row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip
          label="Coverage"
          value={`${fmt2(coveragePct)}%`}
          color={coveragePct > 70 ? "text-emerald-400" : coveragePct > 40 ? "text-teal-400" : "text-amber-400"}
          sub="episodes predictable"
        />
        <Chip
          label="Complexity"
          value={fmtBits(metrics.world_model_complexity)}
          color="text-indigo-400"
        />
        <Chip
          label="Schema Growth"
          value={`${fmt2(metrics.schema_growth_rate)}/hr`}
          color="text-indigo-300"
        />
        <Chip
          label="Prediction Accuracy"
          value={`${fmt2(metrics.prediction_accuracy * 100)}%`}
          color={metrics.prediction_accuracy > 0.7 ? "text-teal-400" : "text-white/60"}
        />
        <Chip
          label="Hypothesis Confirm"
          value={`${fmt2(hypoConfirmRate * 100)}%`}
          color={hypoConfirmRate > 0.6 ? "text-emerald-400" : "text-amber-400"}
        />
        <Chip
          label="Cross-Domain"
          value={metrics.cross_domain_transfers_today}
          color="text-violet-400"
          sub="today"
        />
      </div>

      {/* Gauge bars */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20">
          Generative Core Quality
        </h3>
        <GaugeBar
          label="World Model Coverage (episodes predictable)"
          value={metrics.world_model_coverage}
          format={(v) => `${fmt2(v * 100)}%`}
          colorFn={(p) =>
            p > 0.7 ? "bg-emerald-500" : p > 0.4 ? "bg-teal-500" : "bg-amber-500/70"
          }
        />
        <GaugeBar
          label="Prediction Accuracy"
          value={metrics.prediction_accuracy}
          format={(v) => `${fmt2(v * 100)}%`}
          colorFn={(p) =>
            p > 0.7 ? "bg-emerald-500" : p > 0.4 ? "bg-teal-500" : "bg-amber-500/70"
          }
        />
        <GaugeBar
          label="Hypothesis Confirmation Rate"
          value={metrics.hypothesis_confirmation_rate}
          format={(v) => `${fmt2(v * 100)}%`}
          colorFn={(p) =>
            p > 0.6 ? "bg-teal-500" : p > 0.35 ? "bg-amber-500/70" : "bg-red-500/60"
          }
        />
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/25 leading-relaxed space-y-1">
        <div>
          <span className="text-indigo-400/60">Schema growth</span> — rate of new
          causal structures being integrated from experiences.
        </div>
        <div>
          <span className="text-violet-400/60">Cross-domain transfer</span> — schemas
          applied outside their origin domain (Kolmogorov generalization).
        </div>
        <div>
          <span className="text-emerald-400/60">Coverage</span> — fraction of
          episodic memory whose variance can be explained by the world model.
        </div>
      </div>
    </div>
  );
}

// ─── Compression Tab ─────────────────────────────────────────────

function CompressionTab({
  metrics,
  history,
  anchors,
  events,
}: {
  metrics: LogosMetricsResponse;
  history: LogosCompressionHistoryResponse | null;
  anchors: LogosAnchorsResponse | null;
  events: LogosEvent[];
}) {
  const compressionEvents = events.filter(
    (e) =>
      e.type === "compression_cycle_complete" ||
      e.type === "anchor_memory_created",
  );

  return (
    <div className="space-y-6">
      {/* Today's summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chip
          label="Encoded Today"
          value={metrics.experiences_holographically_encoded.toLocaleString()}
          color="text-teal-400"
          sub="holographic stage"
        />
        <Chip
          label="Discarded"
          value={metrics.experiences_discarded_as_redundant.toLocaleString()}
          color="text-white/40"
          sub="redundant"
        />
        <Chip
          label="Anchors Created"
          value={metrics.anchor_memories_created.toLocaleString()}
          color="text-amber-400"
          sub="irreducible"
        />
        <Chip
          label="Compression Efficiency"
          value={`${fmt2(metrics.compression_efficiency * 100)}%`}
          color={metrics.compression_efficiency > 0.7 ? "text-emerald-400" : "text-amber-400"}
        />
      </div>

      {/* Live event feed */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Live Compression Events
        </h3>
        {compressionEvents.length === 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-xs text-white/20">
            Waiting for compression events (every ~300s)…
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {compressionEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {ev.type === "anchor_memory_created" ? (
                      <Badge variant="warning">ANCHOR</Badge>
                    ) : (
                      <Badge variant="info">CYCLE</Badge>
                    )}
                    <span className="text-xs font-mono text-white/40">
                      {new Date(ev.ts).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {ev.type === "compression_cycle_complete" && (
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-white/40 tabular-nums">
                    <span>
                      evicted{" "}
                      <span className="text-red-400/70">
                        {String(ev.data.items_evicted ?? 0)}
                      </span>
                    </span>
                    <span>
                      distilled{" "}
                      <span className="text-teal-400/70">
                        {String(ev.data.items_distilled ?? 0)}
                      </span>
                    </span>
                    <span>
                      anchors{" "}
                      <span className="text-amber-400/70">
                        {String(ev.data.anchors_created ?? 0)}
                      </span>
                    </span>
                    <span>
                      MDL Δ{" "}
                      <span className="text-indigo-400/70">
                        {typeof ev.data.mdl_improvement === "number"
                          ? fmt2(ev.data.mdl_improvement as number)
                          : "—"}
                      </span>
                    </span>
                  </div>
                )}
                {ev.type === "anchor_memory_created" && (
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-white/40">
                    <span>
                      id{" "}
                      <span className="text-white/60 font-mono">
                        {String(ev.data.memory_id ?? "").slice(0, 8)}…
                      </span>
                    </span>
                    <span>
                      domain{" "}
                      <span className="text-violet-400/70">
                        {String(ev.data.domain ?? "unknown")}
                      </span>
                    </span>
                    <span>
                      info{" "}
                      <span className="text-amber-400/70">
                        {typeof ev.data.information_content === "number"
                          ? fmt2(ev.data.information_content as number)
                          : "—"}{" "}
                        bits
                      </span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical cycles */}
      {history && history.cycles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
            Compression History
            <span className="ml-2 text-white/20 font-normal normal-case">
              {fmtBits(history.total_bits_saved)} saved · {history.total_anchors_created} anchors
            </span>
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.cycles.map((cycle: LogosCompressionCycle, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/25 tabular-nums">
                    {new Date(cycle.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex gap-3 text-[10px] tabular-nums text-white/30">
                    <span>
                      evicted{" "}
                      <span className="text-red-400/60">{cycle.items_evicted}</span>
                    </span>
                    <span>
                      distilled{" "}
                      <span className="text-teal-400/60">{cycle.items_distilled}</span>
                    </span>
                    <span>
                      reinforced{" "}
                      <span className="text-indigo-400/60">{cycle.items_reinforced}</span>
                    </span>
                    <span>
                      saved{" "}
                      <span className="text-emerald-400/60">
                        {fmtBits(cycle.bits_saved)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anchor memories */}
      {anchors && anchors.anchors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
            Anchor Memories
            <span className="ml-2 text-amber-400/60 font-normal normal-case">
              {anchors.total} irreducible
            </span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {anchors.anchors.map((a) => (
              <div
                key={a.memory_id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs font-mono text-white/50 truncate">
                    {a.memory_id.slice(0, 12)}…
                  </span>
                  <Badge variant="muted">{a.domain}</Badge>
                </div>
                <span className="text-xs text-amber-400/70 tabular-nums shrink-0">
                  {fmt2(a.information_content)} bits
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schwarzschild Tab ────────────────────────────────────────────

type IndicatorId =
  | "self_prediction"
  | "cross_domain"
  | "generative_surplus"
  | "compression_acceleration"
  | "novel_structure";

interface IndicatorSpec {
  id: IndicatorId;
  label: string;
  description: string;
  getValue: (s: LogosSchwarzchildResponse) => number;
  threshold: number;
  format: (v: number) => string;
}

const INDICATORS: IndicatorSpec[] = [
  {
    id: "self_prediction",
    label: "Self-Prediction Accuracy",
    description: "System can predict its own internal states",
    getValue: (s) => s.self_prediction_accuracy,
    threshold: 0.70,
    format: (v) => `${fmt2(v * 100)}%`,
  },
  {
    id: "cross_domain",
    label: "Cross-Domain Transfer",
    description: "Schemas applied successfully outside origin domain",
    getValue: (s) => s.cross_domain_transfers,
    threshold: 5,
    format: (v) => fmt0(v),
  },
  {
    id: "generative_surplus",
    label: "Generative Surplus",
    description: "Hypotheses generated ÷ received — generative ratio ≥ 1",
    getValue: (s) => s.hypothesis_ratio,
    threshold: 1.0,
    format: (v) => fmt2(v),
  },
  {
    id: "compression_acceleration",
    label: "Compression Acceleration",
    description: "MDL improvement rate is increasing (second-order growth)",
    getValue: (s) => s.compression_acceleration,
    threshold: 0.0,
    format: (v) => `${fmt2(v)}`,
  },
  {
    id: "novel_structure",
    label: "Novel Structure Emergence",
    description: "New schemas not derivable from prior knowledge",
    getValue: (s) => s.novel_structures,
    threshold: 1,
    format: (v) => fmt0(v),
  },
];

function SchwarzchildTab({
  data,
  events,
}: {
  data: LogosSchwarzchildResponse;
  events: LogosEvent[];
}) {
  const thresholdEvent = events.find(
    (e) => e.type === "schwarzschild_threshold_met",
  );

  const thresholdMet = data.threshold_met;

  // Hard threshold conditions (from backend):
  // self_prediction >= 0.70 AND intelligence_ratio >= 100 AND hypothesis_ratio >= 1.0
  const condSelfPred = data.self_prediction_accuracy >= 0.70;
  const condIRatio = data.intelligence_ratio >= 100.0;
  const condHypRatio = data.hypothesis_ratio >= 1.0;

  const metCount = [condSelfPred, condIRatio, condHypRatio].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Threshold status — the centrepiece */}
      <div
        className={`rounded-xl border p-6 ${
          thresholdMet
            ? "border-teal-400/40 bg-teal-400/[0.06] shadow-[0_0_40px_rgba(94,234,212,0.08)]"
            : "border-white/[0.06] bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`text-5xl ${thresholdMet ? "animate-pulse" : "opacity-30"}`}
          >
            ⚫
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">
              Schwarzschild Threshold
            </div>
            <div
              className={`text-3xl font-bold ${
                thresholdMet ? "text-teal-400" : "text-white/40"
              }`}
            >
              {thresholdMet ? "THRESHOLD MET" : "NOT YET MET"}
            </div>
            {thresholdEvent && (
              <div className="text-xs text-teal-400/60 mt-1">
                Crossed {new Date(thresholdEvent.ts).toLocaleString()}
              </div>
            )}
            {!thresholdMet && (
              <div className="text-xs text-white/25 mt-1">
                {metCount}/3 hard conditions met
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Hard conditions */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          Hard Threshold Conditions (all 3 must be met)
        </h3>
        <div className="space-y-2">
          {[
            {
              label: "Self-Prediction Accuracy ≥ 70%",
              met: condSelfPred,
              value: `${fmt2(data.self_prediction_accuracy * 100)}%`,
            },
            {
              label: "Intelligence Ratio ≥ 100",
              met: condIRatio,
              value: fmt2(data.intelligence_ratio),
            },
            {
              label: "Hypothesis Generation Ratio ≥ 1.0",
              met: condHypRatio,
              value: fmt2(data.hypothesis_ratio),
            },
          ].map((cond) => (
            <div
              key={cond.label}
              className={`rounded-lg border px-4 py-3 flex items-center justify-between ${
                cond.met
                  ? "border-teal-500/30 bg-teal-500/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    cond.met ? "bg-teal-400 shadow-[0_0_6px_rgba(94,234,212,0.6)]" : "bg-white/20"
                  }`}
                />
                <span className={`text-sm ${cond.met ? "text-white/80" : "text-white/40"}`}>
                  {cond.label}
                </span>
              </div>
              <span
                className={`text-sm tabular-nums font-semibold ${
                  cond.met ? "text-teal-400" : "text-white/30"
                }`}
              >
                {cond.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Soft indicators */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
          5 Soft Indicators
        </h3>
        <div className="space-y-3">
          {INDICATORS.map((ind) => {
            const value = ind.getValue(data);
            const normalised = Math.min(1, value / (ind.threshold * 2 || 1));
            const aboveThreshold = value >= ind.threshold;

            return (
              <div
                key={ind.id}
                className={`rounded-lg border px-4 py-3 ${
                  aboveThreshold
                    ? "border-teal-500/20 bg-teal-500/[0.03]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        aboveThreshold ? "bg-teal-400" : "bg-white/20"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        aboveThreshold ? "text-white/80" : "text-white/40"
                      }`}
                    >
                      {ind.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm tabular-nums font-semibold ${
                        aboveThreshold ? "text-teal-400" : "text-white/40"
                      }`}
                    >
                      {ind.format(value)}
                    </span>
                    <span className="text-[10px] text-white/20">
                      / {ind.format(ind.threshold)}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      aboveThreshold ? "bg-teal-500" : "bg-white/20"
                    }`}
                    style={{ width: `${Math.min(100, normalised * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/20">{ind.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicators breakdown from backend */}
      {data.indicators && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-3">
            Raw Indicator Signals
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Chip
              label="Self-Pred Trend"
              value={deltaSign(data.indicators.self_prediction_trend)}
              color={deltaColor(data.indicators.self_prediction_trend)}
            />
            <Chip
              label="Cross-Domain Accuracy"
              value={`${fmt2(data.indicators.cross_domain_accuracy * 100)}%`}
              color="text-violet-400"
            />
            <Chip
              label="Generative Surplus"
              value={fmt2(data.indicators.generative_surplus_ratio)}
              color={data.indicators.generative_surplus_ratio >= 1 ? "text-teal-400" : "text-white/40"}
            />
            <Chip
              label="Hypotheses Generated"
              value={data.indicators.hypotheses_generated}
              color="text-indigo-400"
            />
            <Chip
              label="Hypotheses Received"
              value={data.indicators.hypotheses_received}
              color="text-white/50"
            />
            <Chip
              label="Novel Schemas"
              value={data.indicators.novel_schemas_count}
              color="text-amber-400"
            />
          </div>
        </div>
      )}

      {/* What this means */}
      <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-3 text-xs text-white/20 leading-relaxed space-y-1.5">
        <div>
          The Schwarzschild threshold is named for the gravitational radius beyond
          which escape velocity exceeds light speed.
        </div>
        <div>
          When met, the system has developed a generative model rich enough to
          produce more knowledge than it receives — a cognitive singularity.
        </div>
        <div className="text-white/15">
          This event fires exactly once, is permanently recorded, and cannot be unmet.
        </div>
      </div>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────

function StatusBar({
  health,
  metrics,
}: {
  health: LogosHealthResponse | null;
  metrics: LogosMetricsResponse | null;
}) {
  const pressure = health?.cognitive_pressure ?? 0;
  const ir = health?.intelligence_ratio ?? 0;
  const schw = health?.schwarzschild_met ?? false;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
      <Badge
        variant={
          health?.status === "healthy"
            ? "success"
            : health?.status === "stopped"
              ? "danger"
              : "muted"
        }
        pulse={health?.status === "healthy"}
      >
        {health?.status ?? "—"}
      </Badge>
      {pressure > 0 && (
        <Badge
          variant={
            pressure >= 0.95 ? "danger" : pressure >= 0.75 ? "warning" : "default"
          }
        >
          {fmt2(pressure * 100)}% pressure
        </Badge>
      )}
      {ir > 0 && (
        <Badge variant={ir >= 100 ? "success" : "info"}>
          I = {ir >= 1000 ? `${(ir / 1000).toFixed(1)}K` : fmt2(ir)}
        </Badge>
      )}
      {schw && (
        <Badge variant="success" pulse>
          ⚫ SCHWARZSCHILD
        </Badge>
      )}
      {health && (
        <Badge variant="muted">
          {health.anchor_memories} anchors
        </Badge>
      )}
      {metrics?.world_model_coverage !== undefined && (
        <Badge variant="muted">
          {fmt2(metrics.world_model_coverage * 100)}% coverage
        </Badge>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function LogosPage() {
  const [activeTab, setActiveTab] = useState<Tab>("budget");

  const { data: health } = useApi(() => api.logosHealth(), { intervalMs: 5000 });
  const { data: budget } = useApi(() => api.logosBudget(), {
    intervalMs: 5000,
    enabled: activeTab === "budget",
  });
  const { data: metrics } = useApi(() => api.logosMetrics(), {
    intervalMs: 10000,
    enabled:
      activeTab === "intelligence" ||
      activeTab === "world_model" ||
      activeTab === "compression",
  });
  const { data: schwarzchild } = useApi(() => api.logosSchwarzschild(), {
    intervalMs: 30000,
    enabled: activeTab === "schwarzschild",
  });
  const { data: compressionHistory } = useApi(
    () => api.logosCompressionHistory(20),
    { intervalMs: 30000, enabled: activeTab === "compression" },
  );
  const { data: anchors } = useApi(() => api.logosAnchors(20), {
    intervalMs: 30000,
    enabled: activeTab === "compression",
  });

  // Live events from WebSocket
  const logosEvents = useLogosEvents(30);
  const iRatioHistory = useIRatioHistory(60);

  return (
    <>
      <PageHeader
        title="Logos — Universal Compression Engine"
        description="MDL scoring · cognitive budget · Schwarzschild threshold · knowledge compression"
      />

        <StatusBar health={health} metrics={metrics} />

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
            {activeTab === "budget" && budget ? (
              <BudgetTab data={budget} />
            ) : activeTab === "intelligence" && metrics ? (
              <IntelligenceTab metrics={metrics} history={iRatioHistory} />
            ) : activeTab === "world_model" && metrics ? (
              <WorldModelTab metrics={metrics} />
            ) : activeTab === "compression" ? (
              metrics ? (
                <CompressionTab
                  metrics={metrics}
                  history={compressionHistory}
                  anchors={anchors}
                  events={logosEvents}
                />
              ) : health ? (
                <CompressionTab
                  metrics={{
                    experiences_holographically_encoded: 0,
                    experiences_discarded_as_redundant: 0,
                    anchor_memories_created: health.anchor_memories,
                    compression_efficiency: 0,
                    intelligence_ratio: health.intelligence_ratio,
                    cognitive_pressure: health.cognitive_pressure,
                    world_model_coverage: 0,
                    world_model_complexity: health.world_model_complexity_bits,
                    prediction_accuracy: 0,
                    schema_growth_rate: 0,
                    hypothesis_confirmation_rate: 0,
                    cross_domain_transfers_today: 0,
                    self_prediction_accuracy: 0,
                    hypothesis_generation_ratio: 0,
                    schwarzschild_threshold_met: health.schwarzschild_met,
                    intelligence_ratio_delta: 0,
                    coverage_delta: 0,
                    compression_efficiency_delta: 0,
                    timestamp: new Date().toISOString(),
                  }}
                  history={compressionHistory}
                  anchors={anchors}
                  events={logosEvents}
                />
              ) : (
                <div className="py-8 text-center text-white/20 text-sm">Loading…</div>
              )
            ) : activeTab === "schwarzschild" && schwarzchild ? (
              <SchwarzchildTab data={schwarzchild} events={logosEvents} />
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
