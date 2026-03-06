"use client";

import { useApi } from "@/hooks/use-api";
import { api, type ThymosHealthResponse, type AffectResponse } from "@/lib/api-client";
import { THYMOS_VITALS_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function ImmuneVitals() {
  const health = useApi<ThymosHealthResponse>(api.thymosHealth, {
    intervalMs: THYMOS_VITALS_POLL_MS,
  });
  // Integrity is the unified health signal — read from Soma via the affect endpoint
  const affect = useApi<AffectResponse>(api.affect, {
    intervalMs: THYMOS_VITALS_POLL_MS,
  });

  if (!health.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading immune vitals...</div>
      </div>
    );
  }

  const data = health.data;

  // Integrity comes from Soma — the single unified health signal post-consolidation
  const integrity = affect.data?.integrity ?? null;

  const healingModeColor = {
    normal: "bg-green-500/20 text-green-300 border-green-500/50",
    active: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
    storm: "bg-red-500/20 text-red-300 border-red-500/50",
  }[data.healing_mode] || "bg-slate-500/20 text-slate-300 border-slate-500/50";

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Integrity (Soma — unified health signal) */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {integrity !== null ? (
              <div className="flex items-end gap-4">
                <div className="text-4xl font-bold text-emerald-400">
                  {Math.round(integrity * 100)}
                </div>
                <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${integrity * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">—</div>
            )}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Active Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-400">
              {data.active_incidents}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {data.total_incidents} total
            </div>
          </CardContent>
        </Card>

        {/* Repair Success Rate */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Repair Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400">
              {Math.round(data.repair_success_rate)}%
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {data.repairs_succeeded} / {data.repairs_attempted}
            </div>
          </CardContent>
        </Card>

        {/* Antibody Effectiveness */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Antibody Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-400">
              {data.total_antibodies}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {(data.mean_antibody_effectiveness * 100).toFixed(0)}% avg
              effectiveness
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Healing Mode & Budget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Healing Mode */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">
              Healing Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge
              className={cn(
                "px-3 py-1.5 text-sm font-semibold border",
                healingModeColor
              )}
            >
              {data.healing_mode.toUpperCase()}
            </Badge>
            {data.healing_mode === "storm" && (
              <div className="text-xs text-yellow-300">
                🌪️ Cytokine storm mode active
              </div>
            )}
            {data.healing_mode === "active" && (
              <div className="text-xs text-yellow-300">
                🔧 Active repairs in progress
              </div>
            )}
            {data.healing_mode === "normal" && (
              <div className="text-xs text-green-300">
                ✓ Normal operation
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">
              Repair Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.budget && (
              <>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.budget.max_repairs_per_hour - data.budget.repairs_this_hour}
                </div>
                <div className="text-xs text-slate-400">
                  repairs remaining ({data.budget.repairs_this_hour}/{data.budget.max_repairs_per_hour} used)
                </div>
                {data.budget.storm_mode && (
                  <div className="text-xs text-red-300 mt-1">
                    Storm focus: {data.budget.storm_focus_system ?? "detecting"}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis Stats */}
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">
              Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-blue-400">
              {data.total_diagnoses}
            </div>
            <div className="text-xs text-slate-400">
              Avg confidence:{" "}
              <span className="text-blue-300">
                {(data.mean_diagnosis_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Severity Distribution */}
      <Card className="bg-slate-700/50 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Incident Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(data.incidents_by_severity).map(([severity, count]) => (
              <div key={severity} className="text-center">
                <div
                  className={cn("text-2xl font-bold mb-1", {
                    "text-red-400": severity === "CRITICAL",
                    "text-orange-400": severity === "HIGH",
                    "text-yellow-400": severity === "MEDIUM",
                    "text-blue-400": severity === "LOW",
                    "text-slate-400": severity === "INFO",
                  })}
                >
                  {count as number}
                </div>
                <div className="text-xs text-slate-400">{severity}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Repair Tier Distribution */}
      <Card className="bg-slate-700/50 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Repairs by Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(data.repairs_by_tier).map(([tier, count]) => (
              <div key={tier} className="text-center">
                <div className="text-lg font-bold text-cyan-400 mb-1">
                  {count as number}
                </div>
                <div className="text-xs text-slate-400">Tier {tier}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Avg Resolution Time</span>
              <span className="text-cyan-300 font-semibold">
                {Math.round(data.mean_resolution_ms)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Avg Diagnosis Latency</span>
              <span className="text-cyan-300 font-semibold">
                {Math.round(data.mean_diagnosis_latency_ms)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Prophylactic Scans</span>
              <span className="text-cyan-300 font-semibold">
                {data.prophylactic_scans}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Scan Warnings</span>
              <span className="text-yellow-300 font-semibold">
                {data.prophylactic_warnings}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Repair Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Succeeded</span>
              <span className="text-green-300 font-semibold">
                {data.repairs_succeeded}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Failed</span>
              <span className="text-red-300 font-semibold">
                {data.repairs_failed}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Rolled Back</span>
              <span className="text-orange-300 font-semibold">
                {data.repairs_rolled_back}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Storm Activations</span>
              <span className="text-red-300 font-semibold">
                {data.storm_activations}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Constitutional Drive Pressure */}
      {data.drive_state && (
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Constitutional Drive Pressure
            </CardTitle>
            <div className="text-xs text-slate-400 mt-1">
              Accumulated pressure from incidents and Equor rejections. High values indicate the organism is under constitutional stress.
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {(["coherence", "care", "growth", "honesty"] as const).map((drive) => {
                const val = data.drive_state[drive];
                const color =
                  val >= 0.7
                    ? "text-red-400"
                    : val >= 0.4
                    ? "text-yellow-400"
                    : "text-green-400";
                const barColor =
                  val >= 0.7
                    ? "bg-red-500"
                    : val >= 0.4
                    ? "bg-yellow-500"
                    : "bg-green-500";
                return (
                  <div key={drive}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400 capitalize">{drive}</span>
                      <span className={cn("text-sm font-bold", color)}>
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all", barColor)}
                        style={{ width: `${val * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-600 pt-3">
              <span className="text-slate-400">Composite stress</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      data.drive_state.composite_stress >= 0.7
                        ? "bg-red-500"
                        : data.drive_state.composite_stress >= 0.4
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{ width: `${data.drive_state.composite_stress * 100}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-300">
                  {(data.drive_state.composite_stress * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            {data.drive_state.most_stressed_drive && (
              <div className="text-xs text-slate-400 mt-2">
                Most stressed:{" "}
                <span className="text-yellow-300 font-semibold capitalize">
                  {data.drive_state.most_stressed_drive}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
