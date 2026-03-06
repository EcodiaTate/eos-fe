"use client";

import { useApi } from "@/hooks/use-api";
import { api, type AntibodyResponse } from "@/lib/api-client";
import { THYMOS_STANDARD_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState } from "react";

export function AntibodyLibrary() {
  const antibodies = useApi<AntibodyResponse[]>(api.thymosAntibodies, {
    intervalMs: THYMOS_STANDARD_POLL_MS,
  });
  const [filter, setFilter] = useState<"all" | "active" | "retired">("all");
  const [sortBy, setSortBy] = useState<"effectiveness" | "recent" | "usage">("effectiveness");

  if (!antibodies.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading antibody library...</div>
      </div>
    );
  }

  let filtered = antibodies.data;
  if (filter === "active") {
    filtered = filtered.filter((a) => !a.retired);
  } else if (filter === "retired") {
    filtered = filtered.filter((a) => a.retired);
  }

  let sorted = [...filtered];
  if (sortBy === "effectiveness") {
    sorted.sort((a, b) => b.effectiveness - a.effectiveness);
  } else if (sortBy === "recent") {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "usage") {
    sorted.sort((a, b) => b.application_count - a.application_count);
  }

  const activeAntibodies = antibodies.data.filter((a) => !a.retired);
  const retiredAntibodies = antibodies.data.filter((a) => a.retired);
  const avgEffectiveness =
    activeAntibodies.length > 0
      ? activeAntibodies.reduce((sum, a) => sum + a.effectiveness, 0) / activeAntibodies.length
      : 0;

  const tierColor = (tier: string) => {
    switch (tier) {
      case "NOOP":
        return "bg-slate-600/30 text-slate-300";
      case "PARAMETER":
        return "bg-green-600/30 text-green-300";
      case "RESTART":
        return "bg-yellow-600/30 text-yellow-300";
      case "KNOWN_FIX":
        return "bg-blue-600/30 text-blue-300";
      case "NOVEL_FIX":
        return "bg-purple-600/30 text-purple-300";
      case "ESCALATE":
        return "bg-red-600/30 text-red-300";
      default:
        return "bg-slate-600/30 text-slate-300";
    }
  };

  const effectivenessToColor = (effectiveness: number) => {
    if (effectiveness >= 0.8) return "text-green-400";
    if (effectiveness >= 0.6) return "text-yellow-400";
    if (effectiveness >= 0.4) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-cyan-400 mb-1">
              {activeAntibodies.length}
            </div>
            <div className="text-xs text-slate-400">Active Antibodies</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className={cn("text-3xl font-bold mb-1", effectivenessToColor(avgEffectiveness))}>
              {(avgEffectiveness * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-400">Avg Effectiveness</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-orange-400 mb-1">
              {retiredAntibodies.length}
            </div>
            <div className="text-xs text-slate-400">Retired Antibodies</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {antibodies.data.reduce((sum, a) => sum + a.application_count, 0)}
            </div>
            <div className="text-xs text-slate-400">Total Applications</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {["all", "active", "retired"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-all",
                filter === f
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              {f === "all" && "All"}
              {f === "active" && "✓ Active"}
              {f === "retired" && "⊘ Retired"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["effectiveness", "recent", "usage"].map((s) => (
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
              {s === "effectiveness" && "📊 Effective"}
              {s === "recent" && "📅 Recent"}
              {s === "usage" && "📈 Usage"}
            </button>
          ))}
        </div>
      </div>

      {/* Antibodies Grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {filter === "retired"
            ? "No retired antibodies yet"
            : "No antibodies in library yet"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((antibody) => (
            <Card
              key={antibody.id}
              className={cn(
                "border transition-colors",
                antibody.retired
                  ? "bg-slate-800/50 border-slate-700 opacity-75"
                  : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
              )}
            >
              <CardContent className="pt-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-mono text-slate-400 mb-1">
                      {antibody.fingerprint}
                    </div>
                    <div className="text-sm font-semibold text-slate-200 line-clamp-2">
                      {antibody.root_cause}
                    </div>
                  </div>
                  {antibody.retired && (
                    <Badge className="bg-slate-600/30 text-slate-300 text-xs ml-2">
                      RETIRED
                    </Badge>
                  )}
                </div>

                {/* System & Class */}
                <div className="flex gap-2 mb-3">
                  <Badge className="bg-slate-600/30 text-slate-300 text-xs">
                    {antibody.source_system}
                  </Badge>
                  <Badge className="bg-slate-600/30 text-slate-300 text-xs">
                    {antibody.incident_class.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Effectiveness */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Effectiveness</span>
                    <span className={cn("text-sm font-bold", effectivenessToColor(antibody.effectiveness))}>
                      {(antibody.effectiveness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        antibody.effectiveness >= 0.8
                          ? "bg-green-500"
                          : antibody.effectiveness >= 0.6
                          ? "bg-yellow-500"
                          : antibody.effectiveness >= 0.4
                          ? "bg-orange-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${antibody.effectiveness * 100}%` }}
                    />
                  </div>
                </div>

                {/* Repair Tier */}
                <div className="mb-3">
                  <Badge className={cn("text-xs", tierColor(antibody.repair_tier))}>
                    Tier {antibody.repair_tier}
                  </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center px-2 py-2 bg-slate-600/20 rounded">
                    <div className="text-lg font-bold text-cyan-400">
                      {antibody.application_count}
                    </div>
                    <div className="text-xs text-slate-400">Applied</div>
                  </div>
                  <div className="text-center px-2 py-2 bg-green-600/20 rounded">
                    <div className="text-lg font-bold text-green-400">
                      {antibody.success_count}
                    </div>
                    <div className="text-xs text-slate-400">Success</div>
                  </div>
                  <div className="text-center px-2 py-2 bg-red-600/20 rounded">
                    <div className="text-lg font-bold text-red-400">
                      {antibody.failure_count}
                    </div>
                    <div className="text-xs text-slate-400">Failed</div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-xs text-slate-400 border-t border-slate-600 pt-3">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(antibody.created_at).toLocaleDateString()}</span>
                  </div>
                  {antibody.last_applied && (
                    <div className="flex justify-between">
                      <span>Last Applied:</span>
                      <span>{new Date(antibody.last_applied).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Generation:</span>
                    <span className="text-slate-300">{antibody.generation}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
