"use client";

import { useApi } from "@/hooks/use-api";
import { api, type IncidentResponse, type IncidentDetailResponse } from "@/lib/api-client";
import { THYMOS_STANDARD_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState } from "react";

function DriveBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-orange-400" : "bg-cyan-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-300 w-8 text-right">{pct}%</span>
    </div>
  );
}

function IncidentDetail({ incident }: { incident: IncidentDetailResponse }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-600 space-y-4">
      {/* Stack trace */}
      {incident.stack_trace && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">Stack Trace</div>
          <pre className="text-xs text-slate-300 bg-slate-900/60 rounded p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
            {incident.stack_trace}
          </pre>
        </div>
      )}

      {/* Context dict */}
      {Object.keys(incident.context).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">Context</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(incident.context).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-slate-500 shrink-0">{k}:</span>
                <span className="text-slate-300 font-mono truncate">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constitutional impact */}
      {Object.keys(incident.constitutional_impact).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">Constitutional Impact</div>
          <div className="space-y-1.5">
            {Object.entries(incident.constitutional_impact).map(([drive, val]) => (
              <DriveBar key={drive} label={drive} value={val} />
            ))}
          </div>
        </div>
      )}

      {/* Causal chain */}
      {incident.causal_chain && incident.causal_chain.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">Causal Chain</div>
          <div className="flex items-center gap-2 flex-wrap">
            {incident.causal_chain.map((step, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono">
                  {step}
                </span>
                {idx < incident.causal_chain!.length - 1 && (
                  <span className="text-slate-500 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blast radius + affected systems */}
      <div className="flex gap-6 text-xs">
        <div>
          <span className="text-slate-400">Blast Radius: </span>
          <span className="text-slate-200 font-semibold">{(incident.blast_radius * 100).toFixed(0)}%</span>
        </div>
        {incident.affected_systems.length > 0 && (
          <div className="flex gap-1 items-center">
            <span className="text-slate-400">Affected: </span>
            {incident.affected_systems.map((s) => (
              <span key={s} className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                {s}
              </span>
            ))}
          </div>
        )}
        <div>
          <span className="text-slate-400">Confidence: </span>
          <span className="text-slate-200">{(incident.diagnostic_confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  idx,
  isLast,
  severityColor,
  classIcon,
  repairTierLabel,
}: {
  incident: IncidentResponse;
  idx: number;
  isLast: boolean;
  severityColor: (s: string) => string;
  classIcon: (c: string) => string;
  repairTierLabel: (t: string | null) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const detail = useApi<IncidentDetailResponse>(
    () => api.thymosIncidentDetail(incident.id),
    { enabled: expanded }
  );

  return (
    <Card
      className="bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 transition-colors cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
    >
      <CardContent className="pt-4">
        <div className="flex gap-4">
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <div
              className={cn("w-3 h-3 rounded-full", {
                "bg-red-500": incident.severity === "CRITICAL",
                "bg-orange-500": incident.severity === "HIGH",
                "bg-yellow-500": incident.severity === "MEDIUM",
                "bg-blue-500": incident.severity === "LOW",
                "bg-slate-500": incident.severity === "INFO",
              })}
            />
            {!isLast && <div className="w-0.5 h-12 bg-slate-600 my-1" />}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{classIcon(incident.incident_class)}</span>
                  <span className="text-sm font-mono text-slate-400">
                    {new Date(incident.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">
                    {expanded ? "▲ collapse" : "▼ expand"}
                  </span>
                </div>
                <div className="text-sm text-slate-200 mb-2">
                  <span className="font-semibold">{incident.source_system}</span>
                  {" "}
                  <span className="text-slate-400">—</span>
                  {" "}
                  <span className="text-slate-300">{incident.error_type}</span>
                </div>
                <div className="text-xs text-slate-400 mb-3 line-clamp-2">
                  {incident.error_message}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("border", severityColor(incident.severity))}>
                    {incident.severity}
                  </Badge>
                  <Badge className="bg-slate-600 text-slate-300 border-slate-500 text-xs">
                    {incident.incident_class.replace(/_/g, " ")}
                  </Badge>
                  {incident.repair_tier && (
                    <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/50 text-xs">
                      {repairTierLabel(incident.repair_tier)}
                    </Badge>
                  )}
                  {incident.repair_successful !== null && (
                    <Badge
                      className={cn(
                        "text-xs border",
                        incident.repair_successful
                          ? "bg-green-600/30 text-green-300 border-green-500/50"
                          : "bg-red-600/30 text-red-300 border-red-500/50"
                      )}
                    >
                      {incident.repair_successful ? "✓ Fixed" : "✗ Failed"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="text-right space-y-1">
                {incident.resolution_time_ms != null && (
                  <div className="text-xs text-slate-400">
                    <div className="text-slate-300 font-semibold">
                      {incident.resolution_time_ms}ms
                    </div>
                    <div>resolution</div>
                  </div>
                )}
                {incident.root_cause && (
                  <div className="text-xs text-slate-400 max-w-xs">
                    <div className="font-semibold text-slate-300 mb-1">Root Cause:</div>
                    <div className="text-slate-400 line-clamp-2">{incident.root_cause}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable detail panel */}
            {expanded && (
              detail.loading ? (
                <div className="mt-4 pt-4 border-t border-slate-600 text-xs text-slate-400">
                  Loading detail…
                </div>
              ) : detail.error ? (
                <div className="mt-4 pt-4 border-t border-slate-600 text-xs text-red-400">
                  {detail.error}
                </div>
              ) : detail.data ? (
                <IncidentDetail incident={detail.data} />
              ) : null
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function IncidentTimeline() {
  const incidents = useApi<IncidentResponse[]>(() => api.thymosIncidents(100), {
    intervalMs: THYMOS_STANDARD_POLL_MS,
  });
  const [filter, setFilter] = useState<"all" | "critical" | "active">("all");

  if (!incidents.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading incidents...</div>
      </div>
    );
  }

  let filtered = incidents.data;
  if (filter === "critical") {
    filtered = filtered.filter(
      (i) => i.severity === "CRITICAL" || i.severity === "HIGH"
    );
  } else if (filter === "active") {
    filtered = filtered.filter(
      (i) => i.repair_status !== "resolved" && i.repair_status !== "accepted"
    );
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-300 border-red-500/50";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "LOW":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/50";
    }
  };

  const classIcon = (incidentClass: string) => {
    const icons: Record<string, string> = {
      crash: "💥",
      degradation: "📉",
      contract_violation: "⚖️",
      loop_severance: "🔗",
      drift: "📊",
      prediction_failure: "🧠",
      resource_exhaustion: "⚠️",
      cognitive_stall: "⏸️",
    };
    return icons[incidentClass] || "❓";
  };

  const repairTierLabel = (tier: string | null) => {
    if (!tier) return "—";
    const labels: Record<string, string> = {
      NOOP: "No-op",
      PARAMETER: "Parameter",
      RESTART: "Restart",
      KNOWN_FIX: "Antibody",
      NOVEL_FIX: "Codegen",
      ESCALATE: "Escalate",
    };
    return labels[tier] || tier;
  };

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        {(["all", "critical", "active"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded text-sm font-medium transition-all",
              filter === f
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            {f === "all" && "All"}
            {f === "critical" && "🔴 Critical"}
            {f === "active" && "🔧 Active"}
          </button>
        ))}
        <div className="ml-auto text-sm text-slate-400">{filtered.length} incidents</div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No incidents in this view</div>
        ) : (
          filtered.map((incident, idx) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              idx={idx}
              isLast={idx === filtered.length - 1}
              severityColor={severityColor}
              classIcon={classIcon}
              repairTierLabel={repairTierLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}
