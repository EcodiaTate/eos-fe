"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type ThymosHealthResponse,
  type HomeostasisResponse,
  type HomeostasisMetric,
  type HomeostasisMetricsResponse,
} from "@/lib/api-client";
import { THYMOS_HOMEOSTASIS_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const METRIC_META: Record<string, { description: string; icon: string }> = {
  "synapse.cycle.latency_ms": { description: "Cognitive cycle latency", icon: "⏱️" },
  "memory.retrieval.latency_ms": { description: "Memory retrieval latency", icon: "🧠" },
  "synapse.resources.memory_mb": { description: "Memory utilization", icon: "💾" },
  "atune.coherence.phi": { description: "Integrated information (Φ)", icon: "🎯" },
  "evo.self_model.success_rate": { description: "Self-model accuracy", icon: "📊" },
  "nova.intent_rate": { description: "Goal generation rate", icon: "🎲" },
};

function MetricRangeBar({ metric }: { metric: HomeostasisMetric }) {
  const { optimal_min, optimal_max, current_value, in_range, trend_direction, unit } = metric;

  // Position of current value within [0, optimal_max * 1.2] for visualization
  let positionPct: number | null = null;
  if (current_value !== null) {
    const visMax = optimal_max * 1.2 || 1;
    positionPct = Math.min(100, Math.max(0, (current_value / visMax) * 100));
  }

  const rangeStartPct = (optimal_min / (optimal_max * 1.2 || 1)) * 100;
  const rangeWidthPct = ((optimal_max - optimal_min) / (optimal_max * 1.2 || 1)) * 100;

  const trendIcon = trend_direction > 0.01 ? "↑" : trend_direction < -0.01 ? "↓" : "→";
  const trendColor = !in_range
    ? trend_direction > 0 ? "text-red-400" : "text-green-400"
    : "text-slate-400";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-slate-500">{optimal_min}{unit}</span>
        {current_value !== null ? (
          <span className={cn("font-semibold font-mono", in_range ? "text-green-400" : "text-orange-400")}>
            {current_value % 1 === 0 ? current_value.toFixed(0) : current_value.toFixed(3)}{unit}
            {" "}
            <span className={cn("text-xs", trendColor)}>{trendIcon}</span>
          </span>
        ) : (
          <span className="text-slate-500 italic">no data</span>
        )}
        <span className="text-slate-500">{optimal_max}{unit}</span>
      </div>

      {/* Range track */}
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        {/* Optimal zone highlight */}
        <div
          className="absolute h-full bg-green-900/60 rounded-full"
          style={{ left: `${rangeStartPct}%`, width: `${rangeWidthPct}%` }}
        />
        {/* Current value marker */}
        {positionPct !== null && (
          <div
            className={cn(
              "absolute top-0 w-1 h-full rounded-sm transition-all",
              in_range ? "bg-green-400" : "bg-orange-400"
            )}
            style={{ left: `calc(${positionPct}% - 2px)` }}
          />
        )}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: HomeostasisMetric }) {
  const meta = METRIC_META[metric.name] ?? { description: metric.name, icon: "📏" };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-colors",
        metric.in_range
          ? "bg-green-600/10 border-green-500/30"
          : "bg-orange-600/10 border-orange-500/40"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-200 text-sm">{meta.description}</div>
          <div className="text-xs text-slate-400 font-mono truncate">{metric.name}</div>
        </div>
        <span
          className={cn(
            "text-xs font-semibold",
            metric.in_range ? "text-green-400" : "text-orange-400"
          )}
        >
          {metric.in_range ? "✓ IN RANGE" : "⚠ OUT OF RANGE"}
        </span>
      </div>
      <MetricRangeBar metric={metric} />
    </div>
  );
}

export function HomeostasisMonitor() {
  const health = useApi<ThymosHealthResponse>(api.thymosHealth, { intervalMs: THYMOS_HOMEOSTASIS_POLL_MS });
  const homeostasis = useApi<HomeostasisResponse>(api.thymosHomeostasis, { intervalMs: THYMOS_HOMEOSTASIS_POLL_MS });
  const metrics = useApi<HomeostasisMetricsResponse>(api.thymosHomeostasisMetrics, {
    intervalMs: THYMOS_HOMEOSTASIS_POLL_MS,
  });

  if (!health.data || !homeostasis.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading homeostasis data...</div>
      </div>
    );
  }

  const metricsTotal = metrics.data?.metrics_total ?? homeostasis.data.metrics_total ?? 6;
  const metricsInRange = metrics.data?.metrics_in_range ?? homeostasis.data.metrics_in_range;

  return (
    <div className="space-y-6">
      {/* Overall status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Metrics In Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="text-4xl font-bold text-green-400">
                {metricsInRange}/{metricsTotal}
              </div>
              <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${(metricsInRange / (metricsTotal || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              System maintaining optimal operating ranges
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Adjustments Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-400">
              {homeostasis.data.homeostatic_adjustments}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Proactive optimizations this session
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Healing Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={cn(
                "px-3 py-1.5 text-sm font-semibold border mb-2",
                homeostasis.data.healing_mode === "normal"
                  ? "bg-green-600/30 text-green-300 border-green-500/50"
                  : homeostasis.data.healing_mode === "active"
                  ? "bg-yellow-600/30 text-yellow-300 border-yellow-500/50"
                  : "bg-red-600/30 text-red-300 border-red-500/50"
              )}
            >
              {homeostasis.data.healing_mode.toUpperCase()}
            </Badge>
            <div className="text-xs text-slate-400">
              {homeostasis.data.healing_mode === "normal"
                ? "Stable operation"
                : homeostasis.data.healing_mode === "active"
                ? "Repairs in progress"
                : "Cytokine storm detected"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric cards — real values from /homeostasis/metrics */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Homeostatic Metrics</CardTitle>
          <div className="text-xs text-slate-400 mt-1">
            Green zone = optimal range. Marker shows current reading. Arrow shows trend.
          </div>
        </CardHeader>
        <CardContent>
          {metrics.data && metrics.data.metrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.data.metrics.map((metric) => (
                <MetricCard key={metric.name} metric={metric} />
              ))}
            </div>
          ) : (
            // Fallback: render static cards without values while metrics load
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(METRIC_META).map(([name, meta], idx) => (
                <div
                  key={name}
                  className={cn(
                    "p-4 rounded-lg border",
                    idx < metricsInRange
                      ? "bg-green-600/10 border-green-500/30"
                      : "bg-orange-600/10 border-orange-500/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200 text-sm">{meta.description}</div>
                      <div className="text-xs text-slate-400 font-mono">{name}</div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        idx < metricsInRange ? "text-green-400" : "text-orange-400"
                      )}
                    >
                      {idx < metricsInRange ? "✓ IN RANGE" : "⚠ OUT OF RANGE"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Philosophy + stats */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Homeostatic Regulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div className="bg-slate-600/20 p-3 rounded border border-slate-600">
            <div className="font-semibold text-slate-200 mb-1">⚖️ Philosophy</div>
            <div className="text-xs text-slate-400">
              The organism maintains itself the way a body regulates temperature.
              Homeostasis is proactive health optimization, not just reactive error recovery.
              Small preemptive adjustments prevent crisis.
            </div>
          </div>

          <div className="bg-slate-600/20 p-3 rounded border border-slate-600">
            <div className="font-semibold text-slate-200 mb-2">📊 Current Adjustments</div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>• {homeostasis.data.homeostatic_adjustments} proactive parameter adjustments made</div>
              <div>• Healing mode: {homeostasis.data.healing_mode.toUpperCase()}</div>
              <div>• {metricsInRange} of {metricsTotal} key metrics in optimal range</div>
              {homeostasis.data.storm_activations > 0 && (
                <div>• Storm mode activated {homeostasis.data.storm_activations} times</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Budget */}
      {health.data.budget && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Immune System Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-slate-400 mb-3">
              Thymos operates within a CPU budget to avoid overwhelming the organism
            </div>
            <div className="space-y-2">
              {Object.entries(health.data.budget).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-300">
                    {typeof value === "number" ? value.toFixed(2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
