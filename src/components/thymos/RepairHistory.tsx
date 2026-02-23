"use client";

import { useApi } from "@/hooks/use-api";
import { api, type RepairResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState } from "react";

export function RepairHistory() {
  const repairs = useApi<RepairResponse[]>(() => api.thymosRepairs(100), {
    intervalMs: 3000,
  });
  const [sortBy, setSortBy] = useState<"recent" | "tier" | "success">("recent");

  if (!repairs.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading repair history...</div>
      </div>
    );
  }

  let sorted = [...repairs.data];
  if (sortBy === "tier") {
    sorted.sort((a, b) => {
      const tierOrder = { ESCALATE: 5, NOVEL_FIX: 4, KNOWN_FIX: 3, RESTART: 2, PARAMETER: 1, NOOP: 0 };
      const aOrder = tierOrder[a.repair_tier as keyof typeof tierOrder] ?? -1;
      const bOrder = tierOrder[b.repair_tier as keyof typeof tierOrder] ?? -1;
      return bOrder - aOrder;
    });
  } else if (sortBy === "success") {
    sorted.sort((a, b) => {
      if (a.repair_successful === null) return 1;
      if (b.repair_successful === null) return 1;
      return (b.repair_successful ? 1 : 0) - (a.repair_successful ? 1 : 0);
    });
  }

  const tierColor = (tier: string | null) => {
    switch (tier) {
      case "ESCALATE":
        return "bg-red-600/30 text-red-300 border-red-500/50";
      case "NOVEL_FIX":
        return "bg-purple-600/30 text-purple-300 border-purple-500/50";
      case "KNOWN_FIX":
        return "bg-blue-600/30 text-blue-300 border-blue-500/50";
      case "RESTART":
        return "bg-yellow-600/30 text-yellow-300 border-yellow-500/50";
      case "PARAMETER":
        return "bg-green-600/30 text-green-300 border-green-500/50";
      default:
        return "bg-slate-600/30 text-slate-300 border-slate-500/50";
    }
  };

  const tierLabel = (tier: string | null) => {
    if (!tier) return "Unknown";
    const labels: Record<string, string> = {
      NOOP: "No-op (Tier 0)",
      PARAMETER: "Parameter Adjustment (Tier 1)",
      RESTART: "System Restart (Tier 2)",
      KNOWN_FIX: "Known Antibody (Tier 3)",
      NOVEL_FIX: "Novel Repair (Tier 4)",
      ESCALATE: "Human Escalation (Tier 5)",
    };
    return labels[tier];
  };

  // Calculate stats
  const successCount = repairs.data.filter(r => r.repair_successful === true).length;
  const failureCount = repairs.data.filter(r => r.repair_successful === false).length;
  const tierCounts = repairs.data.reduce((acc, r) => {
    if (r.repair_tier) {
      acc[r.repair_tier] = (acc[r.repair_tier] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const tierSuccessRates = repairs.data.reduce((acc, r) => {
    if (r.repair_tier) {
      if (!acc[r.repair_tier]) acc[r.repair_tier] = { total: 0, success: 0 };
      acc[r.repair_tier].total += 1;
      if (r.repair_successful) acc[r.repair_tier].success += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; success: number }>);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {successCount}
            </div>
            <div className="text-xs text-slate-400">Successful</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-400 mb-1">
              {failureCount}
            </div>
            <div className="text-xs text-slate-400">Failed</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {repairs.data.length}
            </div>
            <div className="text-xs text-slate-400">Total Repairs</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {repairs.data.length > 0
                ? Math.round((successCount / repairs.data.length) * 100)
                : 0}
              %
            </div>
            <div className="text-xs text-slate-400">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Effectiveness */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Effectiveness by Repair Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(tierSuccessRates)
              .sort((a, b) => {
                const tierOrder = { ESCALATE: 5, NOVEL_FIX: 4, KNOWN_FIX: 3, RESTART: 2, PARAMETER: 1, NOOP: 0 };
                const aOrder = tierOrder[a[0] as keyof typeof tierOrder] ?? -1;
                const bOrder = tierOrder[b[0] as keyof typeof tierOrder] ?? -1;
                return bOrder - aOrder;
              })
              .map(([tier, { total, success }]) => {
                const rate = total > 0 ? (success / total) * 100 : 0;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-300">
                      {tierLabel(tier).split("(")[0].trim()}
                    </div>
                    <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          rate >= 80
                            ? "bg-green-500"
                            : rate >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="text-sm font-semibold text-slate-300 w-16 text-right">
                      {Math.round(rate)}% ({success}/{total})
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex gap-2">
        {["recent", "tier", "success"].map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s as any)}
            className={cn(
              "px-3 py-1 rounded text-sm font-medium transition-all",
              sortBy === s
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            {s === "recent" && "📅 Recent"}
            {s === "tier" && "📊 By Tier"}
            {s === "success" && "📈 By Success"}
          </button>
        ))}
      </div>

      {/* Repairs List */}
      <div className="space-y-3">
        {sorted.map((repair) => (
          <Card
            key={repair.incident_id}
            className="bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 transition-colors"
          >
            <CardContent className="pt-4">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-slate-500">
                      {new Date(repair.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-200">
                      {repair.source_system}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">
                    {repair.incident_class} — {repair.severity} severity
                  </div>
                </div>
                <div className="text-right text-sm text-slate-400">
                  {repair.resolution_time_ms && (
                    <div className="font-semibold text-slate-300">
                      {repair.resolution_time_ms}ms
                    </div>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("border text-xs", tierColor(repair.repair_tier))}>
                  {tierLabel(repair.repair_tier)}
                </Badge>
                {repair.repair_successful !== null && (
                  <Badge
                    className={cn(
                      "text-xs border",
                      repair.repair_successful
                        ? "bg-green-600/30 text-green-300 border-green-500/50"
                        : "bg-red-600/30 text-red-300 border-red-500/50"
                    )}
                  >
                    {repair.repair_successful ? "✓ Success" : "✗ Failed"}
                  </Badge>
                )}
                {repair.antibody_id && (
                  <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/50 text-xs">
                    🛡️ Antibody {repair.antibody_id.slice(0, 8)}
                  </Badge>
                )}
                <Badge className={cn(
                  "text-xs border",
                  {
                    "bg-red-600/30 text-red-300 border-red-500/50": repair.severity === "CRITICAL",
                    "bg-orange-600/30 text-orange-300 border-orange-500/50": repair.severity === "HIGH",
                    "bg-yellow-600/30 text-yellow-300 border-yellow-500/50": repair.severity === "MEDIUM",
                    "bg-blue-600/30 text-blue-300 border-blue-500/50": repair.severity === "LOW",
                  }
                )}>
                  {repair.severity}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {repairs.data.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No repairs recorded yet
        </div>
      )}
    </div>
  );
}
