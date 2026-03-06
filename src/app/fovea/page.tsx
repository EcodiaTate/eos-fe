"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type FoveaErrorType,
  type FoveaErrorsResponse,
  type FoveaHabituationMapResponse,
  type FoveaHealthResponse,
  type FoveaMetricsResponse,
  type FoveaPredictionErrorRecord,
  type FoveaWeightHistoryResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, RefreshCw, Zap } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<FoveaErrorType, number> = {
  content: 0.2,
  temporal: 0.1,
  magnitude: 0.15,
  source: 0.15,
  category: 0.3,
  causal: 0.1,
};

const ERROR_TYPE_COLOR: Record<FoveaErrorType, string> = {
  content: "#5eead4",   // teal
  causal: "#fb7185",    // rose
  category: "#818cf8",  // indigo
  magnitude: "#f59e0b", // amber
  source: "#a78bfa",    // violet
  temporal: "#34d399",  // emerald
};

const ERROR_TYPE_BG: Record<FoveaErrorType, string> = {
  content: "bg-teal-400",
  causal: "bg-rose-400",
  category: "bg-indigo-400",
  magnitude: "bg-amber-400",
  source: "bg-violet-400",
  temporal: "bg-emerald-400",
};

// Prediction error dimension regrounding table (from integration.py _HEAD_ERROR_MAPPING)
const ATUNE_REGROUNDING: { head: string; dims: Partial<Record<FoveaErrorType, number>>; description: string }[] = [
  { head: "novelty",   dims: { content: 1.0 },                         description: "Content prediction error" },
  { head: "risk",      dims: { causal: 1.0 },                          description: "Causal prediction error" },
  { head: "identity",  dims: { category: 1.0 },                        description: "Category error (self-percepts)" },
  { head: "goal",      dims: { causal: 0.7, content: 0.3 },            description: "Causal weighted by goal relevance" },
  { head: "emotional", dims: { magnitude: 1.0 },                       description: "Magnitude error on affect signals" },
  { head: "causal",    dims: { causal: 1.0 },                          description: "Direct causal structure" },
  { head: "keyword",   dims: { source: 0.5, category: 0.5 },           description: "Source + category combined" },
  { head: "economic",  dims: { magnitude: 0.5, source: 0.5 },          description: "Financial signal error" },
];

const ERROR_TYPES: FoveaErrorType[] = ["content", "causal", "category", "magnitude", "source", "temporal"];

// ─── Sub-components ───────────────────────────────────────────────

function ErrorLandscapeBar({
  type,
  error,
  precision,
  weight,
}: {
  type: FoveaErrorType;
  error: number;
  precision: number;
  weight: number;
}) {
  const color = ERROR_TYPE_COLOR[type];
  const contribution = error * precision * weight;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: contribution > 0.05 ? color : "rgba(255,255,255,0.1)" }}
          />
          <span className="text-[11px] text-white/60 capitalize w-20">{type}</span>
          <span className="text-[9px] text-white/25">
            ×{precision.toFixed(2)} ×{weight.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[11px] tabular-nums font-mono",
              error > 0.5 ? "text-rose-400/80" : error > 0.2 ? "text-amber-400/60" : "text-white/40",
            )}
          >
            {error.toFixed(3)}
          </span>
          <span className="text-[9px] text-white/20 tabular-nums font-mono w-12 text-right">
            →{contribution.toFixed(3)}
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full bg-white/[0.04]">
        {/* Raw error */}
        <div
          className="absolute top-0 left-0 h-full rounded-full opacity-20"
          style={{ width: `${error * 100}%`, background: color }}
        />
        {/* Contribution (error × precision × weight) */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(contribution * 100, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ErrorStreamCard({ error }: { error: FoveaPredictionErrorRecord }) {
  const [expanded, setExpanded] = useState(false);
  const dominantColor = ERROR_TYPE_COLOR[error.dominant_error_type] ?? "#ffffff";
  const isIgnited = error.routes.includes("workspace");
  const isDishabituating = error.habituation_level === 0 && error.habituated_salience > error.precision_weighted_salience;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/[0.02]",
        isIgnited
          ? "border-teal-500/30 shadow-[0_0_12px_rgba(94,234,212,0.08)]"
          : isDishabituating
            ? "border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)]"
            : "border-white/[0.06]",
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dominant error type dot */}
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: dominantColor }}
            />
            <span className="text-xs text-white/60 capitalize">{error.dominant_error_type}</span>
            {isIgnited && (
              <Badge variant="success" pulse>ignition</Badge>
            )}
            {isDishabituating && (
              <Badge variant="warning" pulse>dis-habit</Badge>
            )}
            {error.routes.includes("kairos") && (
              <Badge variant="info">kairos</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-xs tabular-nums font-mono",
                error.habituated_salience > 0.5
                  ? "text-rose-400/80"
                  : error.habituated_salience > 0.25
                    ? "text-amber-400/70"
                    : "text-white/50",
              )}
            >
              {error.habituated_salience.toFixed(3)}
            </span>
            {expanded ? (
              <ChevronUp size={12} className="text-white/20" />
            ) : (
              <ChevronDown size={12} className="text-white/20" />
            )}
          </div>
        </div>

        {/* Salience bar */}
        <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${error.habituated_salience * 100}%`,
              background: isDishabituating ? "#f59e0b" : dominantColor,
              opacity: 0.7,
            }}
          />
        </div>

        <div className="mt-1 text-[10px] text-white/20">
          {new Date(error.timestamp).toLocaleTimeString()} ·{" "}
          <span className="text-white/30">{error.id.slice(0, 12)}…</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.04] space-y-3">
          {/* Error decomposition */}
          <div className="pt-2">
            <div className="text-[10px] text-white/25 mb-2">Error decomposition</div>
            <div className="space-y-1.5">
              {ERROR_TYPES.map((type) => {
                const errorVal = error[`${type}_error` as keyof FoveaPredictionErrorRecord] as number;
                const precision = error.component_precisions[type] ?? 1;
                const weight = error.error_weights[type] ?? DEFAULT_WEIGHTS[type];
                return (
                  <ErrorLandscapeBar
                    key={type}
                    type={type}
                    error={errorVal}
                    precision={precision}
                    weight={weight}
                  />
                );
              })}
            </div>
          </div>

          {/* Precision & habituation */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "PWS", value: error.precision_weighted_salience.toFixed(4) },
              { label: "Habituation", value: error.habituation_level.toFixed(3) },
              { label: "Hab. salience", value: error.habituated_salience.toFixed(4) },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 text-center">
                <div className="text-[9px] text-white/20">{s.label}</div>
                <div className="text-xs text-white/60 tabular-nums font-mono">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Routes */}
          {error.routes.length > 0 && (
            <div>
              <div className="text-[10px] text-white/25 mb-1">Routes</div>
              <div className="flex gap-1.5 flex-wrap">
                {error.routes.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/40 font-mono"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HabituationRow({ entry }: { entry: { signature: string; habituation_level: number; times_seen: number; times_led_to_update: number; diagnosis: string; is_dishabituating?: boolean } }) {
  const isFullyHabituated = entry.habituation_level >= 0.8;
  const isDishab = entry.is_dishabituating ?? false;
  const pct = entry.habituation_level * 100;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2",
        isDishab
          ? "border-amber-500/40 bg-amber-500/[0.04] shadow-[0_0_12px_rgba(245,158,11,0.1)]"
          : isFullyHabituated
            ? "border-white/[0.04] bg-white/[0.01]"
            : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      {isDishab && (
        <div className="h-2 w-2 rounded-full shrink-0 bg-amber-400 animate-ping" />
      )}
      {!isDishab && (
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: isFullyHabituated ? "rgba(255,255,255,0.08)" : "rgba(94,234,212,0.4)" }}
        />
      )}

      <span className="text-[10px] text-white/30 font-mono truncate w-24 shrink-0">
        {entry.signature}
      </span>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              isDishab ? "bg-amber-400/70" : isFullyHabituated ? "bg-white/20" : "bg-teal-400/50",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <span className="text-[11px] tabular-nums font-mono text-white/40 w-10 text-right shrink-0">
        {entry.habituation_level.toFixed(2)}
      </span>

      <span className="text-[10px] text-white/20 w-12 text-right shrink-0">
        {entry.times_seen}× / {entry.times_led_to_update}✓
      </span>

      <span
        className={cn(
          "text-[9px] shrink-0",
          entry.diagnosis === "learning_failure" ? "text-rose-400/60" : "text-white/20",
        )}
      >
        {entry.diagnosis === "learning_failure" ? "fail" : "stoch"}
      </span>
    </div>
  );
}

function WeightBar({
  type,
  current,
  defaultWeight,
}: {
  type: FoveaErrorType;
  current: number;
  defaultWeight: number;
}) {
  const color = ERROR_TYPE_COLOR[type];
  const delta = current - defaultWeight;
  const isReinforced = delta > 0.01;
  const isDecayed = delta < -0.01;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", ERROR_TYPE_BG[type])} />
          <span className="text-[11px] text-white/60 capitalize w-20">{type}</span>
        </div>
        <div className="flex items-center gap-2">
          {(isReinforced || isDecayed) && (
            <span
              className={cn(
                "text-[10px] tabular-nums font-mono",
                isReinforced ? "text-teal-400/70" : "text-rose-400/70",
              )}
            >
              {delta > 0 ? "+" : ""}{delta.toFixed(3)}
            </span>
          )}
          <span className="text-[11px] text-white/60 tabular-nums font-mono w-12 text-right">
            {current.toFixed(3)}
          </span>
        </div>
      </div>
      {/* Current weight bar */}
      <div className="relative h-2 w-full rounded-full bg-white/[0.04]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${current * 100}%`, background: color }}
        />
        {/* Default weight marker */}
        <div
          className="absolute top-0 h-full w-px bg-white/20"
          style={{ left: `${defaultWeight * 100}%` }}
        />
      </div>
    </div>
  );
}

function ThresholdDistribution({
  errors,
  threshold,
}: {
  errors: FoveaPredictionErrorRecord[];
  threshold: number;
}) {
  if (errors.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-white/15 text-xs">
        No errors recorded yet
      </div>
    );
  }

  // Build histogram with 20 buckets from 0 to 1
  const BUCKETS = 20;
  const counts = new Array<number>(BUCKETS).fill(0);
  for (const e of errors) {
    const bucket = Math.min(Math.floor(e.habituated_salience * BUCKETS), BUCKETS - 1);
    counts[bucket]++;
  }
  const maxCount = Math.max(...counts, 1);
  const thresholdBucket = Math.min(Math.floor(threshold * BUCKETS), BUCKETS - 1);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-0.5 h-14 w-full relative">
        {counts.map((count, i) => {
          const height = (count / maxCount) * 100;
          const isAboveThreshold = i >= thresholdBucket;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-500 relative"
              style={{
                height: `${Math.max(height, 2)}%`,
                background: isAboveThreshold ? "rgba(94,234,212,0.4)" : "rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
        {/* Threshold line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-teal-400/60"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/15">
        <span>0</span>
        <span className="text-teal-400/50">θ={threshold.toFixed(3)}</span>
        <span>1.0</span>
      </div>
    </div>
  );
}

function AtuneRegoundingTable({
  latestError,
}: {
  latestError: FoveaPredictionErrorRecord | null;
}) {
  return (
    <div className="space-y-1.5">
      {ATUNE_REGROUNDING.map((row) => {
        // Compute head score from latest error's error vector
        let score = 0;
        if (latestError) {
          for (const [dim, w] of Object.entries(row.dims) as [FoveaErrorType, number][]) {
            const errVal = latestError[`${dim}_error` as keyof FoveaPredictionErrorRecord] as number;
            score += (errVal ?? 0) * w;
          }
          score = Math.min(score, 1);
        }

        const headColor = score > 0.4 ? "#5eead4" : score > 0.15 ? "#f59e0b" : undefined;

        return (
          <div
            key={row.head}
            className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
          >
            <span className="text-xs text-white/50 capitalize w-20 shrink-0">{row.head}</span>
            <div className="flex-1 min-w-0">
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                {latestError && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score * 100}%`,
                      background: headColor ?? "rgba(255,255,255,0.15)",
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {Object.entries(row.dims).map(([dim, w]) => (
                <span key={dim} className="text-[9px] text-white/20 font-mono">
                  {dim.slice(0, 3)}×{w}
                </span>
              ))}
            </div>
            {latestError && (
              <span className="text-[11px] text-white/40 tabular-nums font-mono w-10 text-right shrink-0">
                {score.toFixed(3)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function FoveaPage() {
  const health = useApi<FoveaHealthResponse>(api.foveaHealth, { intervalMs: 3000 });
  const metrics = useApi<FoveaMetricsResponse>(api.foveaMetrics, { intervalMs: 2000 });
  const errors = useApi<FoveaErrorsResponse>(
    () => api.foveaErrors(30),
    { intervalMs: 1500 },
  );
  const habituation = useApi<FoveaHabituationMapResponse>(api.foveaHabituationMap, { intervalMs: 3000 });
  const weightHistory = useApi<FoveaWeightHistoryResponse>(api.foveaWeightHistory, { intervalMs: 5000 });

  const latestErrors = errors.data?.errors ?? [];
  const latestError = latestErrors[0] ?? null;
  const currentWeights = weightHistory.data?.current_weights ?? health.data?.learned_weights ?? DEFAULT_WEIGHTS;
  const dynamicThreshold = health.data?.dynamic_threshold ?? 0.3;
  const isHealthy = health.data?.status === "healthy";

  // Current aggregate error landscape from most recent error
  const landscapeError = latestError ?? null;

  // Dis-habituating entries
  const dishab = habituation.data?.entries.filter((e) => e.is_dishabituating) ?? [];
  const habEntries = habituation.data?.entries ?? [];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Fovea"
        description="Prediction error as attention — the shape of ignorance made visible"
      >
        <div className="flex items-center gap-2">
          {health.data && (
            <Badge variant={isHealthy ? "success" : "danger"} pulse={isHealthy}>
              {isHealthy ? "running" : "stopped"}
            </Badge>
          )}
          {dishab.length > 0 && (
            <Badge variant="warning" pulse>
              {dishab.length} dis-habit
            </Badge>
          )}
          {health.data && (
            <div className="text-[11px] text-white/20 tabular-nums">
              {health.data.errors_processed.toLocaleString()} errors processed
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* ── Error Landscape ── */}
        <Card glow className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Activity size={14} className="inline mr-1.5 opacity-50" />
              Error Landscape
            </CardTitle>
            {landscapeError && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20">
                  dominant:{" "}
                  <span style={{ color: ERROR_TYPE_COLOR[landscapeError.dominant_error_type] }}>
                    {landscapeError.dominant_error_type}
                  </span>
                </span>
                <span className="text-[10px] text-white/20">
                  precision×weight contribution
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {landscapeError ? (
              <div className="space-y-2.5">
                {ERROR_TYPES.map((type) => {
                  const errVal = landscapeError[`${type}_error` as keyof FoveaPredictionErrorRecord] as number;
                  const precision = landscapeError.component_precisions[type] ?? 1;
                  const weight = currentWeights[type] ?? DEFAULT_WEIGHTS[type];
                  return (
                    <ErrorLandscapeBar
                      key={type}
                      type={type}
                      error={errVal}
                      precision={precision}
                      weight={weight}
                    />
                  );
                })}
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                  <div className="flex gap-3 text-[10px] text-white/30">
                    <span>solid = contribution (error × precision × weight)</span>
                    <span className="text-white/15">ghost = raw error</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-teal-400/50" />
                    <span className="text-[11px] text-teal-400/60 tabular-nums font-mono">
                      PWS {landscapeError.precision_weighted_salience.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="text-2xl opacity-10 mb-2">∅</div>
                <p className="text-xs text-white/20">Waiting for first prediction error.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── System Metrics ── */}
        <Card>
          <CardHeader>
            <CardTitle>Fovea Metrics</CardTitle>
            {metrics.data && (
              <span className="text-[10px] text-white/20">
                μ salience {metrics.data.mean_salience.toFixed(4)}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {metrics.data || health.data ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Errors processed",
                    value: (metrics.data?.errors_processed ?? health.data?.errors_processed ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "WS ignitions",
                    value: (metrics.data?.workspace_ignitions ?? health.data?.workspace_ignitions ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "Habituated",
                    value: (metrics.data?.habituated_count ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "Dis-habituated",
                    value: (metrics.data?.dishabituated_count ?? 0).toLocaleString(),
                    warn: (metrics.data?.dishabituated_count ?? 0) > 0,
                  },
                  {
                    label: "Active preds",
                    value: (metrics.data?.active_predictions ?? health.data?.active_predictions ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "Hab. entries",
                    value: (metrics.data?.habituation_entries ?? health.data?.habituation_entries ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "Reinforcements",
                    value: (health.data?.weight_reinforcements ?? 0).toLocaleString(),
                    warn: false,
                  },
                  {
                    label: "False alarms",
                    value: (health.data?.false_alarms ?? 0).toLocaleString(),
                    warn: (health.data?.false_alarms ?? 0) > 10,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                  >
                    <div className="text-[9px] text-white/20">{s.label}</div>
                    <div
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        s.warn ? "text-amber-400/80" : "text-white/60",
                      )}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Attention Profile (learned weights) ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attention Profile</CardTitle>
            {weightHistory.data && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20">
                  {weightHistory.data.reinforcements} reinforcements ·{" "}
                  {weightHistory.data.decays} decays
                </span>
                <span className="text-[10px] text-white/15">
                  line = default weight
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {ERROR_TYPES.map((type) => (
                <WeightBar
                  key={type}
                  type={type}
                  current={currentWeights[type] ?? DEFAULT_WEIGHTS[type]}
                  defaultWeight={DEFAULT_WEIGHTS[type]}
                />
              ))}
            </div>

            {/* Weight history sparklines (last 20 snapshots) */}
            {weightHistory.data && weightHistory.data.history.length > 1 && (
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="text-[10px] text-white/25 mb-2">Weight evolution (recent)</div>
                <div className="space-y-1.5">
                  {ERROR_TYPES.map((type) => {
                    const history = weightHistory.data!.history.slice(-20);
                    const values = history.map((h) => h.weights[type] ?? DEFAULT_WEIGHTS[type]);
                    const min = Math.min(...values, 0);
                    const max = Math.max(...values, 0.6);
                    const range = max - min || 0.01;
                    const color = ERROR_TYPE_COLOR[type];

                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-[9px] text-white/25 capitalize w-16 shrink-0">{type}</span>
                        <div className="flex items-end gap-px flex-1 h-6">
                          {values.map((v, i) => {
                            const snap = history[i];
                            const isReinforce = snap.event === "reinforcement" && snap.dominant_type === type;
                            const isDecay = snap.event === "decay" && snap.dominant_type === type;
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-sm"
                                style={{
                                  height: `${((v - min) / range) * 100}%`,
                                  minHeight: "2px",
                                  background: isReinforce
                                    ? "#5eead4"
                                    : isDecay
                                      ? "#fb7185"
                                      : color,
                                  opacity: isReinforce || isDecay ? 1 : 0.4,
                                }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[9px] text-white/30 tabular-nums font-mono w-10 text-right shrink-0">
                          {(currentWeights[type] ?? DEFAULT_WEIGHTS[type]).toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Dynamic Threshold ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Zap size={14} className="inline mr-1.5 opacity-50" />
              Dynamic Threshold
            </CardTitle>
            <span className="text-[10px] text-white/20 tabular-nums font-mono">
              θ={dynamicThreshold.toFixed(4)}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-[10px] text-white/25 mb-2">
                Error distribution (habituated salience)
              </div>
              <ThresholdDistribution
                errors={latestErrors}
                threshold={dynamicThreshold}
              />
            </div>

            <div className="space-y-2">
              {[
                { label: "Floor", value: "0.150", desc: "never drops below" },
                { label: "Current θ", value: dynamicThreshold.toFixed(4), desc: "75th percentile", highlight: true },
                { label: "Ceiling", value: "0.850", desc: "never exceeds" },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2",
                    row.highlight
                      ? "border-teal-500/20 bg-teal-500/[0.04]"
                      : "border-white/[0.04] bg-white/[0.01]",
                  )}
                >
                  <div>
                    <div className={cn("text-xs", row.highlight ? "text-teal-400/80" : "text-white/50")}>
                      {row.label}
                    </div>
                    <div className="text-[9px] text-white/20">{row.desc}</div>
                  </div>
                  <span
                    className={cn(
                      "text-sm tabular-nums font-mono",
                      row.highlight ? "text-teal-400" : "text-white/40",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {metrics.data && (
              <div className="pt-2 border-t border-white/[0.04] text-[10px] text-white/20">
                {metrics.data.workspace_ignitions} ignitions from {metrics.data.errors_processed} errors
                {metrics.data.errors_processed > 0 && (
                  <span className="ml-1 text-white/30">
                    ({((metrics.data.workspace_ignitions / metrics.data.errors_processed) * 100).toFixed(1)}% ignition rate)
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Prediction-Error Stream ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prediction-Error Stream</CardTitle>
            <div className="flex items-center gap-2">
              {errors.data && (
                <Badge variant="muted">{errors.data.total} total</Badge>
              )}
              <button
                onClick={() => errors.refetch()}
                className="rounded-md p-1 text-white/25 hover:text-white/50 hover:bg-white/[0.04]"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {latestErrors.length > 0 ? (
              <div className="space-y-1.5">
                {latestErrors.map((e) => (
                  <ErrorStreamCard key={e.id} error={e} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="text-2xl opacity-10 mb-2">◌</div>
                <p className="text-xs text-white/20">
                  No prediction errors yet. Inject a percept from Atune.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Habituation Map ── */}
        <Card>
          <CardHeader>
            <CardTitle>Habituation Map</CardTitle>
            {habituation.data && (
              <div className="flex items-center gap-2">
                <Badge variant="muted">{habituation.data.total} signatures</Badge>
                {habituation.data.recent_dishabituations > 0 && (
                  <Badge variant="warning" pulse>
                    {habituation.data.recent_dishabituations} dis-hab
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {habEntries.length > 0 ? (
              <div className="space-y-1.5">
                {/* Dis-habituating entries first (visually pop) */}
                {dishab.map((e) => (
                  <HabituationRow key={e.signature} entry={e} />
                ))}
                {/* Then sorted by habituation level desc */}
                {habEntries
                  .filter((e) => !e.is_dishabituating)
                  .sort((a, b) => b.habituation_level - a.habituation_level)
                  .slice(0, 15)
                  .map((e) => (
                    <HabituationRow key={e.signature} entry={e} />
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="text-2xl opacity-10 mb-2">≋</div>
                <p className="text-xs text-white/20">
                  Habituation accumulates after repeated identical errors.
                </p>
              </div>
            )}

            {habituation.data && (
              <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-2">
                {[
                  { label: "Fully habituated (≥0.8)", value: habituation.data.fully_habituated },
                  { label: "Recent dis-habituations", value: habituation.data.recent_dishabituations, warn: habituation.data.recent_dishabituations > 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-2.5 py-2">
                    <div className="text-[9px] text-white/20">{s.label}</div>
                    <div
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        "warn" in s && s.warn ? "text-amber-400/80" : "text-white/50",
                      )}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Atune Integration / Regrounding Table ── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Atune Integration — Prediction Error Decomposition</CardTitle>
            <span className="text-[10px] text-white/20">
              How Fovea's 6-dimensional prediction error drives salience (content / timing / magnitude / source / category / causal)
            </span>
          </CardHeader>
          <CardContent>
            <AtuneRegoundingTable latestError={latestError} />
            <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10px] text-white/15 leading-relaxed">
              Fovea replaces per-head independent scoring with a single{" "}
              <span className="text-white/30">precision_weighted_salience</span> derived from the 6-dimensional
              prediction error decomposition. Each head score is re-derived from the error vector for Atune
              compatibility. Category errors carry the highest default weight (0.30) — they imply the organism's
              fundamental ontology is wrong.
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
