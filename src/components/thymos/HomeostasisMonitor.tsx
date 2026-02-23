"use client";

import { useApi } from "@/hooks/use-api";
import { api, type ThymosHealthResponse, type HomeostasisResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function HomeostasisMonitor() {
  const health = useApi<ThymosHealthResponse>(api.thymosHealth, {
    intervalMs: 2000,
  });
  const homeostasis = useApi<HomeostasisResponse>(api.thymosHomeostasis, {
    intervalMs: 2000,
  });

  if (!health.data || !homeostasis.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading homeostasis data...</div>
      </div>
    );
  }

  const metricsData = [
    {
      name: "synapse.cycle.latency_ms",
      range: [80, 180],
      description: "Cognitive cycle latency",
      icon: "⏱️",
    },
    {
      name: "memory.retrieval.latency_ms",
      range: [10, 150],
      description: "Memory retrieval latency",
      icon: "🧠",
    },
    {
      name: "synapse.resources.memory_mb",
      range: [0, 3072],
      description: "Memory utilization",
      icon: "💾",
    },
    {
      name: "atune.coherence.phi",
      range: [0.3, 1.0],
      description: "Integrated information (Φ)",
      icon: "🎯",
    },
    {
      name: "evo.self_model.success_rate",
      range: [0.5, 1.0],
      description: "Self-model accuracy",
      icon: "📊",
    },
    {
      name: "nova.intent_rate",
      range: [0.01, 0.5],
      description: "Goal generation rate",
      icon: "🎲",
    },
  ];

  const getMetricStatus = (inRange: number, total: number, idx: number) => {
    const isInRange = idx < inRange;
    return {
      isInRange,
      status: isInRange ? "in_range" : "out_of_range",
      color: isInRange ? "text-green-400" : "text-orange-400",
      bgColor: isInRange ? "bg-green-600/20" : "bg-orange-600/20",
    };
  };

  return (
    <div className="space-y-6">
      {/* Overall Homeostasis Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Metrics In Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="text-4xl font-bold text-green-400">
                {homeostasis.data.metrics_in_range}/6
              </div>
              <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${(homeostasis.data.metrics_in_range / 6) * 100}%` }}
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
            <CardTitle className="text-sm font-medium text-slate-300">
              Adjustments Made
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-slate-300">
              Healing Mode
            </CardTitle>
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

      {/* Key Metrics Grid */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Homeostatic Metrics Status
          </CardTitle>
          <div className="text-xs text-slate-400 mt-1">
            Each metric maintains an optimal operating range. Green = in range, Orange = approaching limits
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metricsData.map((metric, idx) => {
              const status = getMetricStatus(
                homeostasis.data!.metrics_in_range,
                metricsData.length,
                idx
              );
              return (
                <div
                  key={metric.name}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    status.bgColor,
                    status.isInRange
                      ? "border-green-500/50"
                      : "border-orange-500/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{metric.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200 text-sm">
                        {metric.description}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {metric.name}
                      </div>
                    </div>
                  </div>

                  {/* Range visualization */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{metric.range[0]}</span>
                      <span className={status.color}>
                        {status.isInRange ? "✓ IN RANGE" : "⚠ OUT OF RANGE"}
                      </span>
                      <span>{metric.range[1]}</span>
                    </div>
                    <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          status.isInRange
                            ? "bg-green-500 w-1/2"
                            : "bg-orange-500 w-1/3"
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Homeostatic Philosophy */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Homeostatic Regulation
          </CardTitle>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-600/10 p-3 rounded border border-green-600/30">
              <div className="font-semibold text-green-300 mb-1">✓ Metrics In Range</div>
              <div className="text-xs text-slate-400">
                System operating within optimal parameters. Minimal intervention needed.
              </div>
            </div>
            <div className="bg-orange-600/10 p-3 rounded border border-orange-600/30">
              <div className="font-semibold text-orange-300 mb-1">
                ⚠ Trending Toward Limits
              </div>
              <div className="text-xs text-slate-400">
                Proactive micro-adjustments triggered to prevent breaching limits.
              </div>
            </div>
          </div>

          <div className="bg-slate-600/20 p-3 rounded border border-slate-600">
            <div className="font-semibold text-slate-200 mb-2">📊 Current Adjustments</div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>
                • {homeostasis.data.homeostatic_adjustments} proactive parameter adjustments made
              </div>
              <div>• Healing mode: {homeostasis.data.healing_mode.toUpperCase()}</div>
              <div>
                • {homeostasis.data.metrics_in_range} of 6 key metrics in optimal range
              </div>
              {homeostasis.data.storm_activations > 0 && (
                <div>
                  • Storm mode activated {homeostasis.data.storm_activations} times
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Budget */}
      {health.data && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Immune System Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-slate-400 mb-3">
              Thymos operates within a CPU budget to avoid overwhelming the organism
            </div>

            {health.data.budget && Object.keys(health.data.budget).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(health.data.budget).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-400 capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-slate-300">
                      {typeof value === "number" ? value.toFixed(2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                Budget allocation: 5% baseline monitoring + homeostasis
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
