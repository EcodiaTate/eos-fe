"use client";

import { useApi } from "@/hooks/use-api";
import { api, type ThymosConfigResponse, type ThymosHealthResponse } from "@/lib/api-client";
import { THYMOS_CONFIG_POLL_MS, THYMOS_CONFIG_STATUS_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ThymosConfig() {
  const config = useApi<ThymosConfigResponse>(api.thymosConfig, {
    intervalMs: THYMOS_CONFIG_POLL_MS,
  });
  const health = useApi<ThymosHealthResponse>(api.thymosHealth, {
    intervalMs: THYMOS_CONFIG_STATUS_POLL_MS,
  });

  if (!config.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading Thymos configuration...</div>
      </div>
    );
  }

  const cfg = config.data;
  const budget = health.data?.budget;

  return (
    <div className="space-y-6">
      {/* Budget Live State */}
      {budget && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Live Budget State</CardTitle>
            <div className="text-xs text-slate-400 mt-1">Current repair budget consumption</div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-600/20 rounded">
                <div className="text-2xl font-bold text-cyan-400">
                  {budget.repairs_this_hour}
                </div>
                <div className="text-xs text-slate-400 mt-1">Repairs this hour</div>
                <div className="text-xs text-slate-500">/ {budget.max_repairs_per_hour} max</div>
              </div>
              <div className="text-center p-3 bg-slate-600/20 rounded">
                <div className="text-2xl font-bold text-purple-400">
                  {budget.novel_repairs_today}
                </div>
                <div className="text-xs text-slate-400 mt-1">Novel repairs today</div>
                <div className="text-xs text-slate-500">/ {budget.max_novel_repairs_per_day} max</div>
              </div>
              <div className="text-center p-3 bg-slate-600/20 rounded">
                <div className="text-2xl font-bold text-blue-400">
                  {budget.active_diagnoses}
                </div>
                <div className="text-xs text-slate-400 mt-1">Active diagnoses</div>
                <div className="text-xs text-slate-500">/ {budget.max_concurrent_diagnoses} max</div>
              </div>
              <div className="text-center p-3 bg-slate-600/20 rounded">
                <div className="text-2xl font-bold text-yellow-400">
                  {budget.active_codegen}
                </div>
                <div className="text-xs text-slate-400 mt-1">Active codegen</div>
                <div className="text-xs text-slate-500">/ {budget.max_concurrent_codegen} max</div>
              </div>
            </div>
            {budget.storm_mode && (
              <div className="mt-4 p-3 bg-red-600/20 border border-red-500/50 rounded text-sm text-red-300">
                Storm mode active — focus system: <strong>{budget.storm_focus_system ?? "detecting"}</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timing Parameters */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Timing Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Sentinel scan interval", value: `${cfg.sentinel_scan_interval_s}s`, desc: "How often sentinels scan for exceptions, drift, stalls, threats" },
              { label: "Homeostasis interval", value: `${cfg.homeostasis_interval_s}s`, desc: "How often the homeostasis controller runs proactive metric tuning" },
              { label: "Post-repair verify timeout", value: `${cfg.post_repair_verify_timeout_s}s`, desc: "Deadline for post-repair verification before marking failed" },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-300 whitespace-nowrap">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Governor Budgets */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Healing Governor Budgets</CardTitle>
          <div className="text-xs text-slate-400 mt-1">Rate limits that prevent the immune system from overwhelming the organism</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Max concurrent diagnoses", value: cfg.max_concurrent_diagnoses, desc: "Parallel diagnosis slots" },
              { label: "Max concurrent codegen", value: cfg.max_concurrent_codegen, desc: "Only 1 Simula Code Agent at a time" },
              { label: "Storm threshold", value: `${cfg.storm_threshold} inc/min`, desc: "Incidents per 60s that trigger cytokine storm mode" },
              { label: "Max repairs per hour", value: cfg.max_repairs_per_hour, desc: "Absolute repair rate limit" },
              { label: "Max novel repairs per day", value: cfg.max_novel_repairs_per_day, desc: "Tier 4 codegen rate limit" },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-300 whitespace-nowrap">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Antibody Lifecycle */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Antibody Lifecycle Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                label: "Refinement threshold",
                value: `${(cfg.antibody_refinement_threshold * 100).toFixed(0)}%`,
                desc: "Effectiveness below this triggers antibody regeneration",
              },
              {
                label: "Retirement threshold",
                value: `${(cfg.antibody_retirement_threshold * 100).toFixed(0)}%`,
                desc: "Effectiveness below this (after 5+ applications) retires the antibody",
              },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-300 whitespace-nowrap">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Budget */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Resource Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Baseline CPU fraction", value: `${(cfg.cpu_budget_fraction * 100).toFixed(0)}%`, desc: "Normal operating CPU allocation" },
              { label: "Burst CPU fraction", value: `${(cfg.burst_cpu_fraction * 100).toFixed(0)}%`, desc: "CPU allocation during storm mode" },
              { label: "Memory budget", value: `${cfg.memory_budget_mb} MB`, desc: "In-memory incident buffer and antibody cache" },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-300 whitespace-nowrap">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
