"use client";

import { useApi } from "@/hooks/use-api";
import { api, type IncidentResponse, type CausalGraphResponse, type CausalEdge } from "@/lib/api-client";
import { THYMOS_STANDARD_POLL_MS, THYMOS_HOMEOSTASIS_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";

const Graph3D = dynamic(() => import("./Graph3D"), { ssr: false });

export function CausalGraph() {
  const incidents = useApi<IncidentResponse[]>(() => api.thymosIncidents(100), {
    intervalMs: THYMOS_STANDARD_POLL_MS,
  });
  const graphData = useApi<CausalGraphResponse>(api.thymosCausalGraph, {
    intervalMs: THYMOS_HOMEOSTASIS_POLL_MS,
  });
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  const systems = useMemo(() => {
    if (graphData.data?.nodes) {
      return graphData.data.nodes.map((n) => n.id);
    }
    return [...new Set((incidents.data ?? []).map((i) => i.source_system))];
  }, [graphData.data, incidents.data]);

  const edges: CausalEdge[] = graphData.data?.edges ?? [];

  const nodeStats = useMemo(() => {
    const map: Record<string, { count: number; maxSeverity: string }> = {};
    if (graphData.data?.nodes) {
      for (const n of graphData.data.nodes) {
        map[n.id] = { count: n.incident_count, maxSeverity: n.max_severity };
      }
    }
    return map;
  }, [graphData.data]);

  const recentChains = graphData.data?.recent_chains ?? [];

  const severityDist = useMemo(() => {
    const dist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const inc of incidents.data ?? []) {
      if (inc.severity in dist) {
        dist[inc.severity as keyof typeof dist]++;
      }
    }
    return dist;
  }, [incidents.data]);

  const totalSeverity = Object.values(severityDist).reduce((a, b) => a + b, 0);

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-blue-500",
    INFO: "bg-slate-400",
  };

  const maxSeverityRank = (sev: string): number => {
    const rank: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
    return rank[sev] ?? 0;
  };

  return (
    <div className="space-y-4">
      {/* 3D graph */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Causal Dependency Graph</CardTitle>
        </CardHeader>
        <CardContent className="h-96 p-0 rounded-b-lg overflow-hidden">
          <Graph3D
            systems={systems}
            incidents={incidents.data ?? []}
            edges={edges}
          />
        </CardContent>
      </Card>

      {/* System nodes */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Systems ({systems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {systems.map((sys) => {
              const stat = nodeStats[sys];
              const maxSev = stat?.maxSeverity ?? "INFO";
              const rank = maxSeverityRank(maxSev);
              return (
                <button
                  key={sys}
                  onClick={() => setSelectedSystem(selectedSystem === sys ? null : sys)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    selectedSystem === sys
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-600 bg-slate-700/30 hover:bg-slate-700/50"
                  )}
                >
                  <div className="font-mono text-sm text-slate-200 mb-1">{sys}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {stat?.count ?? 0} incidents
                    </span>
                    {(stat?.count ?? 0) > 0 && (
                      <Badge
                        className={cn(
                          "text-xs border",
                          rank >= 5
                            ? "bg-red-500/20 text-red-300 border-red-500/50"
                            : rank >= 4
                            ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                            : rank >= 3
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/50"
                        )}
                      >
                        {maxSev}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dependency edges */}
      {edges.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dependencies ({edges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {edges.map((edge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs bg-slate-800/40 rounded px-3 py-2"
                >
                  <span className="font-mono text-slate-300">{edge.source}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-mono text-slate-300">{edge.target}</span>
                  <Badge className="ml-auto bg-slate-700 text-slate-400 border-slate-600 text-xs">
                    {edge.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent causal chains */}
      {recentChains.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Causal Chains ({recentChains.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentChains.slice(0, 5).map((chain, idx) => (
                <div key={idx} className="bg-slate-800/40 rounded p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {chain.chain.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded font-mono",
                            step === chain.root_system
                              ? "bg-red-500/20 text-red-300"
                              : "bg-slate-700 text-slate-200"
                          )}
                        >
                          {step}
                        </span>
                        {stepIdx < chain.chain.length - 1 && (
                          <span className="text-slate-500 text-xs">→</span>
                        )}
                      </div>
                    ))}
                    <span className="ml-auto text-xs text-slate-500">
                      {(chain.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Root: <span className="text-slate-300">{chain.root_system}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Severity distribution */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(severityDist).map(([sev, count]) => (
              <div key={sev} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">{sev}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", severityColors[sev])}
                    style={{
                      width: totalSeverity > 0 ? `${(count / totalSeverity) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span>System node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>CRITICAL incidents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>HIGH incidents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-slate-500 to-slate-400" />
              <span>Dependency edge</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
