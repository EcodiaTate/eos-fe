"use client";

import { useApi } from "@/hooks/use-api";
import { api, type IncidentResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Lazy load Three.js component to avoid SSR issues
const Graph3D = dynamic(() => import("./Graph3D"), { ssr: false });

export function CausalGraph() {
  const incidents = useApi<IncidentResponse[]>(() => api.thymosIncidents(100), {
    intervalMs: 3000,
  });
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  if (!incidents.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading causal graph data...</div>
      </div>
    );
  }

  // Build system dependency graph
  const systems = useMemo(() => {
    if (!incidents.data) return [];
    const systemSet = new Set<string>();
    incidents.data.forEach((i) => systemSet.add(i.source_system));
    return Array.from(systemSet);
  }, [incidents.data]);

  const systemIncidents = useMemo(() => {
    if (!incidents.data) return {};
    const map: Record<string, IncidentResponse[]> = {};
    systems.forEach((sys) => {
      map[sys] = incidents.data!.filter((i) => i.source_system === sys);
    });
    return map;
  }, [incidents.data, systems]);

  const cascadeChains = useMemo(() => {
    if (!incidents.data) return [];
    const chains: Array<{
      primary: IncidentResponse;
      cascade: IncidentResponse[];
    }> = [];

    incidents.data.forEach((incident, idx) => {
      const laterIncidents = incidents.data!.slice(idx + 1, idx + 10);
      const related = laterIncidents.filter((i) => {
        const timeDiff = new Date(i.timestamp).getTime() - new Date(incident.timestamp).getTime();
        return timeDiff < 5000 && timeDiff > 0;
      });

      if (related.length > 0) {
        chains.push({
          primary: incident,
          cascade: related,
        });
      }
    });

    return chains;
  }, [incidents.data]);

  // Calculate severity distribution
  const severityDist = useMemo(() => {
    const dist: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    if (incidents.data) {
      incidents.data.forEach((i) => {
        if (i.severity in dist) dist[i.severity]++;
      });
    }
    return dist;
  }, [incidents.data]);

  return (
    <div className="space-y-6">
      {/* 3D Graph Visualization */}
      <Card className="bg-slate-700/30 border-slate-600 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            System Dependency & Incident Causal Chain
          </CardTitle>
          <div className="text-xs text-slate-400 mt-2">
            3D visualization of system interactions and failure cascades. Hover over nodes to explore.
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-96 bg-slate-800">
            <Graph3D systems={systems} incidents={incidents.data} />
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Systems & Incident Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {systems.map((sys) => {
              const count = systemIncidents[sys].length;
              const severity = systemIncidents[sys].reduce(
                (max, i) => {
                  const order = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
                  return Math.max(max, order[i.severity as keyof typeof order] || 0);
                },
                0
              );

              return (
                <div
                  key={sys}
                  onClick={() => setSelectedSystem(selectedSystem === sys ? null : sys)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedSystem === sys
                      ? "bg-cyan-600/30 border-cyan-500 ring-2 ring-cyan-500/50"
                      : "bg-slate-600/20 border-slate-600 hover:bg-slate-600/40"
                  )}
                >
                  <div className="font-semibold text-slate-200 text-sm capitalize">
                    {sys}
                  </div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">
                    {count}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    incidents
                  </div>
                  {severity > 0 && (
                    <div className="text-xs mt-2">
                      <div
                        className={cn(
                          "inline-block px-2 py-0.5 rounded",
                          severity >= 5
                            ? "bg-red-600/30 text-red-300"
                            : severity >= 4
                            ? "bg-orange-600/30 text-orange-300"
                            : severity >= 3
                            ? "bg-yellow-600/30 text-yellow-300"
                            : "bg-blue-600/30 text-blue-300"
                        )}
                      >
                        {["—", "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"][
                          severity
                        ]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cascade Analysis */}
      {cascadeChains.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Detected Failure Cascades
            </CardTitle>
            <div className="text-xs text-slate-400 mt-1">
              {cascadeChains.length} cascade chains where one incident likely triggered others
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cascadeChains.slice(0, 5).map((chain, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-600/20 rounded border border-slate-600"
                >
                  <div className="font-semibold text-slate-200 text-sm mb-2">
                    Cascade {idx + 1}
                  </div>
                  <div className="space-y-2">
                    {/* Primary incident */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-300">
                          {chain.primary.source_system}
                        </div>
                        <div className="text-xs text-slate-400">
                          {chain.primary.incident_class} ({chain.primary.severity})
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <div className="h-4 border-l-2 border-dashed border-slate-500" />
                    </div>

                    {/* Cascading incidents */}
                    {chain.cascade.slice(0, 2).map((inc, cidx) => (
                      <div key={cidx} className="flex items-center gap-2 ml-4">
                        <div className="w-6 h-6 rounded-full bg-orange-600/30 flex items-center justify-center text-xs font-bold">
                          {cidx + 2}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-300">
                            {inc.source_system}
                          </div>
                          <div className="text-xs text-slate-400">
                            {inc.incident_class}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chain.cascade.length > 2 && (
                      <div className="text-xs text-slate-400 ml-4">
                        +{chain.cascade.length - 2} more incidents
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Severity Heat Map */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(severityDist).map(([severity, count]) => (
              <div key={severity} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    {
                      "bg-red-500": severity === "CRITICAL",
                      "bg-orange-500": severity === "HIGH",
                      "bg-yellow-500": severity === "MEDIUM",
                      "bg-blue-500": severity === "LOW",
                      "bg-slate-500": severity === "INFO",
                    }
                  )}
                />
                <span className="text-sm text-slate-300 w-16">{severity}</span>
                <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      {
                        "bg-red-500": severity === "CRITICAL",
                        "bg-orange-500": severity === "HIGH",
                        "bg-yellow-500": severity === "MEDIUM",
                        "bg-blue-500": severity === "LOW",
                        "bg-slate-500": severity === "INFO",
                      }
                    )}
                    style={{
                      width: `${(count / Math.max(...Object.values(severityDist))) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-300 w-8">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Graph Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>System node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Critical incident</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>High severity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
              <span>System dependency edge</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
