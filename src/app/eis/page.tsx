"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  EISHealthResponse,
  EISStatsResponse,
  EISThreatLibraryResponse,
  EISAnomalyResponse,
  EISAnomalyStatsResponse,
  EISQuarantineGateResponse,
  EISTaintResponse,
  EISConfigResponse,
  EISZoneBounds,
  EISInnateCheckDetail,
  EISPathogenListResponse,
  EISPathogenStoreStats,
  EISWeightsUpdateRequest,
  EISThresholdsUpdateRequest,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// ─── Shared primitives ────────────────────────────────────────────

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25 uppercase tracking-widest">{label}</div>
      <div className="text-sm text-white/80 tabular-nums font-medium">{value}</div>
      {sub && <div className="text-[10px] text-white/25">{sub}</div>}
    </div>
  );
}

function Bar({
  label,
  value,
  max = 1,
  color,
  fmt,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  fmt?: (v: number) => string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const display = fmt ? fmt(value) : value.toFixed(3);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "critical"
      ? "danger"
      : severity === "high"
        ? "warning"
        : severity === "medium"
          ? "info"
          : "muted";
  return <Badge variant={variant}>{severity}</Badge>;
}

function LoadingSlot() {
  return <div className="text-sm text-white/20 py-4 text-center">Loading…</div>;
}

function EmptySlot({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <div className="text-xl opacity-10 mb-2">~</div>
      <div className="text-xs text-white/20">{message}</div>
    </div>
  );
}

// ─── Score Zone Ruler ─────────────────────────────────────────────

const ZONE_DEFS: { key: string; label: string; fallback: EISZoneBounds; color: string }[] = [
  { key: "clean", label: "Clean", fallback: { lower: 0, upper: 0.2 }, color: "#34d399" },
  { key: "elevated", label: "Elevated", fallback: { lower: 0.2, upper: 0.45 }, color: "#fbbf24" },
  { key: "antigenic_zone", label: "Antigenic", fallback: { lower: 0.45, upper: 0.85 }, color: "#f97316" },
  { key: "known_attack", label: "Known Attack", fallback: { lower: 0.85, upper: 1.0 }, color: "#ef4444" },
];

function ScoreZoneRuler({
  zones,
  quarantineThreshold,
  blockThreshold,
}: {
  zones: Record<string, EISZoneBounds>;
  quarantineThreshold: number;
  blockThreshold: number;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
        Composite Score Zones
      </div>

      {/* Segmented ruler */}
      <div className="relative h-6 w-full rounded-full overflow-hidden flex">
        {ZONE_DEFS.map(({ key, label, fallback, color }) => {
          const bounds = zones[key] ?? fallback;
          const widthPct = (bounds.upper - bounds.lower) * 100;
          return (
            <div
              key={key}
              className="h-full flex items-center justify-center"
              style={{ width: `${widthPct}%`, background: color, opacity: 0.75 }}
              title={`${label}: ${bounds.lower.toFixed(2)}–${bounds.upper.toFixed(2)}`}
            >
              <span className="text-[9px] font-medium text-black/60 truncate px-1 select-none">
                {label}
              </span>
            </div>
          );
        })}

        {/* Quarantine threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80"
          style={{ left: `${quarantineThreshold * 100}%` }}
          title={`Quarantine @ ${quarantineThreshold}`}
        />
        {/* Block threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white"
          style={{ left: `${blockThreshold * 100}%` }}
          title={`Block @ ${blockThreshold}`}
        />
      </div>

      {/* Threshold labels */}
      <div className="relative h-4 w-full">
        <div
          className="absolute -translate-x-1/2 text-[9px] text-white/50 tabular-nums"
          style={{ left: `${quarantineThreshold * 100}%` }}
        >
          Q {quarantineThreshold.toFixed(2)}
        </div>
        <div
          className="absolute -translate-x-1/2 text-[9px] text-white/70 tabular-nums"
          style={{ left: `${blockThreshold * 100}%` }}
        >
          B {blockThreshold.toFixed(2)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {ZONE_DEFS.map(({ key, label, fallback, color }) => {
          const bounds = zones[key] ?? fallback;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[10px] text-white/40">
                {label}{" "}
                <span className="text-white/25 tabular-nums">
                  {bounds.lower.toFixed(2)}–{bounds.upper.toFixed(2)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────

function OverviewTab({
  health,
  stats,
}: {
  health: EISHealthResponse | null;
  stats: EISStatsResponse | null;
}) {
  if (!health) return <LoadingSlot />;

  const isHealthy = health.status === "healthy";
  const screened = health.counters.screened;
  const passRate = stats ? stats.pass_rate : 0;
  const blockRate = stats ? stats.block_rate : 0;

  return (
    <div className="space-y-6">
      {/* Status + counters row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <Badge variant={isHealthy ? "success" : "danger"} pulse={isHealthy}>
              {health.status}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Metric label="Screened" value={screened.toLocaleString()} />
            <Metric label="Passed" value={health.counters.passed.toLocaleString()} />
            <Metric label="Elevated" value={health.counters.elevated.toLocaleString()} />
            <Metric label="Quarantined" value={health.counters.quarantined.toLocaleString()} />
            <Metric label="Blocked" value={health.counters.blocked.toLocaleString()} />
            <Metric
              label="Pass Rate"
              value={`${(passRate * 100).toFixed(1)}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust Sigmoid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar
              label={`Midpoint (quarantine @ ${health.config.quarantine_threshold})`}
              value={health.sigmoid_midpoint}
              max={1}
              color="#818cf8"
            />
            <Bar
              label="Steepness"
              value={health.sigmoid_steepness}
              max={20}
              color="#a78bfa"
            />
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Belief Floor" value={health.belief_floor.toFixed(3)} />
                <Metric label="Salience Gain" value={health.risk_salience_gain.toFixed(2)} />
                <Metric
                  label="Block Threshold"
                  value={health.config.block_threshold.toFixed(2)}
                />
                <Metric
                  label="Block Rate"
                  value={`${(blockRate * 100).toFixed(2)}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threat Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreZoneRuler
              zones={health.zones}
              quarantineThreshold={health.config.quarantine_threshold}
              blockThreshold={health.config.block_threshold}
            />
          </CardContent>
        </Card>
      </div>

      {/* Screened flow */}
      {stats && screened > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Percept Flow</CardTitle>
            <span className="text-[10px] text-white/25">{screened.toLocaleString()} total</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <Bar
              label="Passed"
              value={stats.passed}
              max={screened}
              color="#34d399"
              fmt={(v) => `${v.toLocaleString()} (${(stats.pass_rate * 100).toFixed(1)}%)`}
            />
            <Bar
              label="Elevated"
              value={stats.elevated}
              max={screened}
              color="#fbbf24"
              fmt={(v) => `${v.toLocaleString()} (${screened > 0 ? ((v / screened) * 100).toFixed(1) : 0}%)`}
            />
            <Bar
              label="Quarantined"
              value={stats.quarantined}
              max={screened}
              color="#f97316"
              fmt={(v) => `${v.toLocaleString()} (${screened > 0 ? ((v / screened) * 100).toFixed(1) : 0}%)`}
            />
            <Bar
              label="Blocked"
              value={stats.blocked}
              max={screened}
              color="#ef4444"
              fmt={(v) => `${v.toLocaleString()} (${(stats.block_rate * 100).toFixed(2)}%)`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Threat Library ──────────────────────────────────────────

function ThreatLibraryTab({ data }: { data: EISThreatLibraryResponse | null }) {
  if (!data) return <LoadingSlot />;

  const statusColors: Record<string, string> = {
    active: "#34d399",
    decayed: "#fbbf24",
    retired: "#6b7280",
  };

  const categoryLabels: Record<string, string> = {
    mutation_rollback: "Mutation Rollback",
    mutation_blocked: "Mutation Blocked",
    knowledge_rejected: "Knowledge Rejected",
    behavioral_precursor: "Behavioral Precursor",
    quarantine_confirmed: "Quarantine Confirmed",
    drift_precursor: "Drift Precursor",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Pattern Memory</CardTitle>
            <span className="text-xs text-white/30">{data.total_patterns.toLocaleString()} patterns</span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Total" value={data.total_patterns.toLocaleString()} />
              <Metric label="Scans" value={data.total_scans.toLocaleString()} />
              <Metric label="Matches" value={data.total_matches.toLocaleString()} />
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <Metric label="Auto-learned" value={data.total_learned.toLocaleString()} sub="from rollbacks, rejections, quarantine" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: statusColors[status] ?? "#6b7280" }}
                  />
                  <span className="text-sm text-white/60 capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${data.total_patterns > 0 ? (count / data.total_patterns) * 100 : 0}%`,
                        background: statusColors[status] ?? "#6b7280",
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/40 tabular-nums w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.by_status).length === 0 && (
              <EmptySlot message="No patterns yet. Library learns automatically from events." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Category</CardTitle>
          <span className="text-[10px] text-white/25">Pattern origin classification</span>
        </CardHeader>
        <CardContent>
          {Object.keys(data.by_category).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.by_category)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/60">
                        {categoryLabels[cat] ?? cat}
                      </div>
                    </div>
                    <div className="w-32 h-1.5 rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-indigo-400/60"
                        style={{
                          width: `${data.total_patterns > 0 ? (count / data.total_patterns) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/40 tabular-nums w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <EmptySlot message="Patterns are auto-learned from rollbacks, governance rejections, and confirmed quarantine verdicts." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Anomalies ───────────────────────────────────────────────

function AnomaliesTab({
  anomalies,
  anomalyStats,
}: {
  anomalies: EISAnomalyResponse[] | null;
  anomalyStats: EISAnomalyStatsResponse | null;
}) {
  const typeLabels: Record<string, string> = {
    rejection_spike: "Rejection Spike",
    block_rate_spike: "Block Rate Spike",
    mutation_burst: "Mutation Burst",
    drive_drift: "Drive Drift",
    event_rate_anomaly: "Event Rate",
    system_failure_cascade: "Failure Cascade",
    rollback_cluster: "Rollback Cluster",
  };

  return (
    <div className="space-y-4">
      {anomalyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card glow>
            <CardHeader>
              <CardTitle>Detector Baseline</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Metric label="Observations" value={anomalyStats.total_observations.toLocaleString()} />
              <Metric label="Anomalies" value={anomalyStats.total_anomalies.toLocaleString()} />
              <Metric label="Event Types" value={anomalyStats.tracked_event_types.toLocaleString()} />
              <Metric label="Baselined" value={anomalyStats.baseline_event_types.toLocaleString()} />
              <Metric label="Drive Obs" value={anomalyStats.drive_observations.toLocaleString()} />
              <Metric
                label="Anomaly Rate"
                value={
                  anomalyStats.total_observations > 0
                    ? `${((anomalyStats.total_anomalies / anomalyStats.total_observations) * 100).toFixed(3)}%`
                    : "0%"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(anomalyStats.anomalies_by_type).length > 0 ? (
                Object.entries(anomalyStats.anomalies_by_type)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{typeLabels[type] ?? type}</span>
                      <span className="text-xs text-white/40 tabular-nums">{count}</span>
                    </div>
                  ))
              ) : (
                <EmptySlot message="No anomalies detected. Baselines are still forming (requires 10+ observations per event type)." />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Anomalies</CardTitle>
          <span className="text-[10px] text-white/25">Most recent first</span>
        </CardHeader>
        <CardContent>
          {!anomalies ? (
            <LoadingSlot />
          ) : anomalies.length === 0 ? (
            <EmptySlot message="No anomalies detected. The system is within normal behavioral baselines." />
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={a.severity} />
                      <span className="text-xs text-white/60">
                        {typeLabels[a.anomaly_type] ?? a.anomaly_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/25 flex-shrink-0 tabular-nums">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">{a.description}</div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-white/30">
                    <span>Observed: <span className="text-white/50 tabular-nums">{a.observed_value.toFixed(3)}</span></span>
                    <span>Baseline: <span className="text-white/50 tabular-nums">{a.baseline_value.toFixed(3)}</span></span>
                    <span>Sigma: <span className="text-white/50 tabular-nums">{a.deviation_sigma.toFixed(2)}σ</span></span>
                  </div>
                  {a.recommended_action && (
                    <div className="text-[10px] text-amber-400/70 border-t border-white/[0.04] pt-2">
                      → {a.recommended_action}
                    </div>
                  )}
                  {a.event_types_involved.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {a.event_types_involved.map((et) => (
                        <span
                          key={et}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-white/30"
                        >
                          {et}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Quarantine Gate ─────────────────────────────────────────

function QuarantineGateTab({ data }: { data: EISQuarantineGateResponse | null }) {
  if (!data) return <LoadingSlot />;

  const verdictColors: Record<string, string> = {
    allowed: "#34d399",
    held: "#fbbf24",
    blocked: "#ef4444",
    defensive: "#a78bfa",
  };

  const total = data.total_evaluations;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Pre-Action Gate</CardTitle>
            <span className="text-[10px] text-white/25">Mutations + federated knowledge</span>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Metric label="Total Evaluations" value={total.toLocaleString()} />
            <Metric label="Mutations" value={data.mutations_evaluated.toLocaleString()} />
            <Metric label="Knowledge" value={data.knowledge_evaluated.toLocaleString()} />
            <Metric
              label="Allow Rate"
              value={total > 0 ? `${(((data.verdicts.allowed ?? 0) / total) * 100).toFixed(1)}%` : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdict Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.verdicts).length > 0 ? (
              Object.entries(data.verdicts)
                .sort(([, a], [, b]) => b - a)
                .map(([verdict, count]) => (
                  <div key={verdict} className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: verdictColors[verdict] ?? "#6b7280" }}
                    />
                    <span className="text-xs text-white/60 capitalize flex-1">{verdict}</span>
                    <div className="w-24 h-1.5 rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${total > 0 ? (count / total) * 100 : 0}%`,
                          background: verdictColors[verdict] ?? "#6b7280",
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/40 tabular-nums w-8 text-right">{count}</span>
                  </div>
                ))
            ) : (
              <EmptySlot message="No gate evaluations yet. Gate runs when Simula proposes mutations or federated knowledge arrives." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gate Logic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-white/40">
          <div className="grid grid-cols-1 gap-2">
            {[
              { verdict: "ALLOW", color: "#34d399", desc: "Safe to proceed. Taint: CLEAR, no threat library matches, no anomaly context." },
              { verdict: "HOLD", color: "#fbbf24", desc: "Queued for human or governance review. Taint: ADVISORY or ELEVATED." },
              { verdict: "BLOCK", color: "#ef4444", desc: "Rejected immediately. Taint: CRITICAL or known threat library match." },
              { verdict: "DEFENSIVE", color: "#a78bfa", desc: "Block + recommend Thymos defensive mode. Active anomaly + critical taint." },
            ].map(({ verdict, color, desc }) => (
              <div key={verdict} className="flex gap-2 items-start">
                <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1" style={{ background: color }} />
                <div>
                  <span className="text-white/60 font-medium">{verdict}</span>
                  <span className="text-white/30"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Taint Engine ────────────────────────────────────────────

function TaintTab({ data }: { data: EISTaintResponse | null }) {
  if (!data) return <LoadingSlot />;

  const criticalRate = data.calls > 0 ? (data.critical_flags / data.calls) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Mutation Safety Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Total Analyses" value={data.calls.toLocaleString()} />
              <Metric label="Critical Flags" value={data.critical_flags.toLocaleString()} />
              <Metric
                label="Critical Rate"
                value={`${criticalRate.toFixed(2)}%`}
              />
              <Metric
                label="Constitutional Paths"
                value={data.constitutional_paths.toLocaleString()}
              />
            </div>
            {data.calls > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <Bar
                  label="Critical flag rate"
                  value={criticalRate}
                  max={100}
                  color="#ef4444"
                  fmt={(v) => `${v.toFixed(2)}%`}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity Ladder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-white/40">
            {[
              { level: "CLEAR", color: "#34d399", desc: "Normal Equor review path." },
              { level: "ADVISORY", color: "#fbbf24", desc: "Flag for human awareness, proceed with review." },
              { level: "ELEVATED", color: "#f97316", desc: "Require explicit review before applying." },
              { level: "CRITICAL", color: "#ef4444", desc: "Block until human amendment approval." },
            ].map(({ level, color, desc }) => (
              <div key={level} className="flex gap-2 items-start">
                <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1" style={{ background: color }} />
                <div>
                  <span className="text-white/60 font-medium">{level}</span>
                  <span className="text-white/30"> — {desc}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Constitutional Path Graph</CardTitle>
          <span className="text-[10px] text-white/25">{data.constitutional_paths} paths registered</span>
        </CardHeader>
        <CardContent className="text-xs text-white/30 space-y-1">
          <p>
            The taint engine traverses a dependency graph of constitutional paths — files and functions
            that, if modified, could damage EcodiaOS&apos;s safety invariants.
          </p>
          <p className="pt-2 text-white/20">
            Taint propagates transitively through <code className="text-white/35">feeds_into</code> edges,
            so modifying a utility function that feeds the gate pipeline is flagged even without a direct match.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Innate Checks ───────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

const THREAT_CLASS_COLORS: Record<string, string> = {
  prompt_injection: "#f97316",
  jailbreak: "#ef4444",
  data_exfiltration: "#fbbf24",
  context_poisoning: "#a78bfa",
  identity_spoofing: "#60a5fa",
  hallucination_seed: "#34d399",
  misinformation: "#fb923c",
  reasoning_trap: "#e879f9",
  social_engineering: "#f43f5e",
  benign: "#6b7280",
};

function InnateChecksTab({ data }: { data: EISInnateCheckDetail[] | null }) {
  if (!data) return <LoadingSlot />;

  const sorted = [...data].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  const totalMatches = data.reduce((s, c) => s + c.match_count, 0);
  const triggered = data.filter((c) => c.match_count > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Fast-Path Checks</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Metric label="Total Checks" value={data.length.toLocaleString()} sub="run on every percept" />
            <Metric label="Total Matches" value={totalMatches.toLocaleString()} />
            <Metric label="Ever Triggered" value={triggered.toLocaleString()} />
            <Metric label="Budget" value="< 5ms" sub="per check, pre-compiled" />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Match Distribution</CardTitle>
            <span className="text-[10px] text-white/25">Session totals</span>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {sorted
              .filter((c) => c.match_count > 0)
              .map((c) => (
                <Bar
                  key={c.id}
                  label={c.id.replace(/_/g, " ")}
                  value={c.match_count}
                  max={Math.max(totalMatches, 1)}
                  color={THREAT_CLASS_COLORS[c.threat_class] ?? "#6b7280"}
                  fmt={(v) => v.toLocaleString()}
                />
              ))}
            {totalMatches === 0 && (
              <EmptySlot message="No innate check matches this session." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check Catalog</CardTitle>
          <span className="text-[10px] text-white/25">{data.length} deterministic pattern checks</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sorted.map((check) => (
              <div
                key={check.id}
                className={cn(
                  "rounded-lg border p-3 space-y-1.5 transition-colors",
                  check.match_count > 0
                    ? "border-white/[0.10] bg-white/[0.04]"
                    : "border-white/[0.04] bg-white/[0.01]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <SeverityBadge severity={check.severity} />
                    <code className="text-[10px] text-white/50 font-mono">
                      {check.id}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {check.match_count > 0 && (
                      <span className="text-xs text-amber-400/80 tabular-nums font-medium">
                        {check.match_count}×
                      </span>
                    )}
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: `${THREAT_CLASS_COLORS[check.threat_class] ?? "#6b7280"}22`,
                        color: THREAT_CLASS_COLORS[check.threat_class] ?? "#6b7280",
                      }}
                    >
                      {check.threat_class.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{check.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Pathogens ───────────────────────────────────────────────

type ThreatClassFilter = "all" | string;
type SeverityFilter = "all" | string;
type RetiredFilter = "all" | "active" | "retired";

function PathogensTab({
  listData,
  stats,
  onFilter,
  filters,
}: {
  listData: EISPathogenListResponse | null;
  stats: EISPathogenStoreStats | null;
  onFilter: (f: { threat_class?: string; severity?: string; retired?: boolean }) => void;
  filters: { threat_class: ThreatClassFilter; severity: SeverityFilter; retired: RetiredFilter };
}) {
  const THREAT_CLASSES = [
    "all", "prompt_injection", "jailbreak", "data_exfiltration",
    "context_poisoning", "identity_spoofing", "hallucination_seed",
    "misinformation", "reasoning_trap", "social_engineering",
  ];
  const SEVERITIES = ["all", "critical", "high", "medium", "low", "none"];

  function applyFilter(
    tc: ThreatClassFilter,
    sv: SeverityFilter,
    ret: RetiredFilter,
  ) {
    onFilter({
      threat_class: tc === "all" ? undefined : tc,
      severity: sv === "all" ? undefined : sv,
      retired: ret === "all" ? undefined : ret === "retired",
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card glow>
          <CardHeader>
            <CardTitle>Vector Store</CardTitle>
            <Badge variant={stats?.available ? "success" : "muted"}>
              {stats?.available ? "connected" : "unavailable"}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Metric label="Points" value={(stats?.points_count ?? 0).toLocaleString()} />
            <Metric label="Indexed Vecs" value={(stats?.indexed_vectors_count ?? 0).toLocaleString()} />
            <Metric label="Collection" value={stats?.collection ?? "—"} sub="Qdrant" />
            <Metric label="Status" value={stats?.status ?? "—"} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Threat class */}
            <div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Threat Class</div>
              <div className="flex flex-wrap gap-1.5">
                {THREAT_CLASSES.map((tc) => (
                  <button
                    key={tc}
                    onClick={() => {
                      const newTc = tc as ThreatClassFilter;
                      applyFilter(newTc, filters.severity, filters.retired);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      filters.threat_class === tc
                        ? "bg-indigo-500/40 text-white/90"
                        : "bg-white/[0.04] text-white/40 hover:text-white/60",
                    )}
                  >
                    {tc === "all" ? "All" : tc.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            {/* Severity */}
            <div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Severity</div>
              <div className="flex flex-wrap gap-1.5">
                {SEVERITIES.map((sv) => (
                  <button
                    key={sv}
                    onClick={() => {
                      const newSv = sv as SeverityFilter;
                      applyFilter(filters.threat_class, newSv, filters.retired);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors capitalize",
                      filters.severity === sv
                        ? "bg-indigo-500/40 text-white/90"
                        : "bg-white/[0.04] text-white/40 hover:text-white/60",
                    )}
                  >
                    {sv}
                  </button>
                ))}
              </div>
            </div>
            {/* Retired */}
            <div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Status</div>
              <div className="flex gap-1.5">
                {(["all", "active", "retired"] as RetiredFilter[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => applyFilter(filters.threat_class, filters.severity, r)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors capitalize",
                      filters.retired === r
                        ? "bg-indigo-500/40 text-white/90"
                        : "bg-white/[0.04] text-white/40 hover:text-white/60",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pathogen list */}
      <Card>
        <CardHeader>
          <CardTitle>Known Pathogens</CardTitle>
          <span className="text-[10px] text-white/25">
            {listData ? `${listData.total} results` : "loading…"}
          </span>
        </CardHeader>
        <CardContent>
          {!listData ? (
            <LoadingSlot />
          ) : !listData.available ? (
            <EmptySlot message="Qdrant not connected. Start qdrant-client and configure QDRANT_URL." />
          ) : listData.pathogens.length === 0 ? (
            <EmptySlot message="No pathogens match the current filters. The store is empty or all entries are filtered out." />
          ) : (
            <div className="space-y-2">
              {listData.pathogens.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border p-3 space-y-1.5",
                    p.retired
                      ? "border-white/[0.04] bg-white/[0.01] opacity-50"
                      : "border-white/[0.07] bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <SeverityBadge severity={p.severity} />
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: `${THREAT_CLASS_COLORS[p.threat_class] ?? "#6b7280"}22`,
                          color: THREAT_CLASS_COLORS[p.threat_class] ?? "#6b7280",
                        }}
                      >
                        {p.threat_class.replace(/_/g, " ")}
                      </span>
                      {p.retired && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">
                          retired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-[10px] text-white/30">
                      <span className="tabular-nums">{p.match_count} hits</span>
                      <code className="text-white/20 font-mono">{p.id.slice(0, 8)}</code>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-white/50">{p.description}</p>
                  )}
                  {p.canonical_text && (
                    <p className="text-[10px] text-white/25 font-mono truncate">
                      {p.canonical_text.slice(0, 120)}
                      {p.canonical_text.length > 120 ? "…" : ""}
                    </p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-white/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Configuration ───────────────────────────────────────────

function ConfigTab({
  data,
  onRefresh,
}: {
  data: EISConfigResponse | null;
  onRefresh: () => void;
}) {
  const [weightDraft, setWeightDraft] = useState<EISWeightsUpdateRequest | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<EISThresholdsUpdateRequest | null>(null);
  const [weightSaving, setWeightSaving] = useState(false);
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [weightSuccess, setWeightSuccess] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);

  if (!data) return <LoadingSlot />;

  const w = weightDraft ?? {
    innate_weight: data.innate_weight,
    structural_weight: data.structural_weight,
    histogram_weight: data.histogram_weight,
    semantic_weight: data.semantic_weight,
  };

  const t = thresholdDraft ?? {
    quarantine_threshold: data.quarantine_threshold,
    block_threshold: data.block_threshold,
  };

  const weightSum = w.innate_weight + w.structural_weight + w.histogram_weight + w.semantic_weight;
  const weightValid = Math.abs(weightSum - 1.0) <= 0.01;
  const thresholdValid = t.block_threshold > t.quarantine_threshold;

  async function saveWeights() {
    setWeightError(null);
    setWeightSuccess(false);
    setWeightSaving(true);
    try {
      await api.eisUpdateWeights(w);
      setWeightSuccess(true);
      setWeightDraft(null);
      setTimeout(() => {
        setWeightSuccess(false);
        onRefresh();
      }, 1500);
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : "Failed to save weights");
    } finally {
      setWeightSaving(false);
    }
  }

  async function saveThresholds() {
    setThresholdError(null);
    setThresholdSuccess(false);
    setThresholdSaving(true);
    try {
      await api.eisUpdateThresholds(t);
      setThresholdSuccess(true);
      setThresholdDraft(null);
      setTimeout(() => {
        setThresholdSuccess(false);
        onRefresh();
      }, 1500);
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : "Failed to save thresholds");
    } finally {
      setThresholdSaving(false);
    }
  }

  function WeightInput({
    field,
    label,
    color,
  }: {
    field: keyof EISWeightsUpdateRequest;
    label: string;
    color: string;
  }) {
    const val = w[field];
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-white/60">{label}</span>
          </div>
          <span className="text-xs text-white/40 tabular-nums">{(val * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={val}
          onChange={(e) =>
            setWeightDraft({ ...w, [field]: parseFloat(e.target.value) })
          }
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/[0.08]"
          style={{ accentColor: color }}
        />
      </div>
    );
  }

  function ThresholdInput({
    field,
    label,
    color,
  }: {
    field: keyof EISThresholdsUpdateRequest;
    label: string;
    color: string;
  }) {
    const val = t[field];
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/60">{label}</span>
          <span className="text-xs text-white/40 tabular-nums">{val.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={val}
          onChange={(e) =>
            setThresholdDraft({ ...t, [field]: parseFloat(e.target.value) })
          }
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/[0.08]"
          style={{ accentColor: color }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weights editor */}
        <Card glow>
          <CardHeader>
            <CardTitle>Score Weights</CardTitle>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                weightValid ? "text-white/25" : "text-red-400/80",
              )}
            >
              sum = {weightSum.toFixed(2)}
              {!weightValid && " (must equal 1.0)"}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <WeightInput field="innate_weight" label="Innate" color="#ef4444" />
            <WeightInput field="structural_weight" label="Structural" color="#f97316" />
            <WeightInput field="histogram_weight" label="Histogram" color="#fbbf24" />
            <WeightInput field="semantic_weight" label="Semantic" color="#818cf8" />

            {/* Preview bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex mt-2">
              {[
                { val: w.innate_weight, color: "#ef4444" },
                { val: w.structural_weight, color: "#f97316" },
                { val: w.histogram_weight, color: "#fbbf24" },
                { val: w.semantic_weight, color: "#818cf8" },
              ].map(({ val, color }, i) => (
                <div
                  key={i}
                  className="h-full transition-all duration-300"
                  style={{ width: `${val * 100}%`, background: color }}
                />
              ))}
            </div>

            {weightError && (
              <div className="text-xs text-red-400/80 rounded border border-red-500/20 bg-red-500/5 p-2">
                {weightError}
              </div>
            )}
            {weightSuccess && (
              <div className="text-xs text-emerald-400/80">Weights saved.</div>
            )}

            <button
              onClick={saveWeights}
              disabled={!weightValid || weightSaving}
              className={cn(
                "w-full py-1.5 rounded-lg text-xs font-medium transition-all",
                weightValid && !weightSaving
                  ? "bg-indigo-600/60 hover:bg-indigo-600/80 text-white"
                  : "bg-white/[0.04] text-white/20 cursor-not-allowed",
              )}
            >
              {weightSaving ? "Saving…" : "Save Weights"}
            </button>
          </CardContent>
        </Card>

        {/* Thresholds editor */}
        <Card>
          <CardHeader>
            <CardTitle>Thresholds</CardTitle>
            {!thresholdValid && (
              <span className="text-[10px] text-red-400/80">Block must exceed Quarantine</span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ThresholdInput
              field="quarantine_threshold"
              label="Quarantine threshold (enter LLM eval)"
              color="#fbbf24"
            />
            <ThresholdInput
              field="block_threshold"
              label="Block threshold (immediate reject)"
              color="#ef4444"
            />

            {/* Mini ruler preview */}
            <div className="relative h-4 w-full mt-1">
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/[0.06]"
                style={{ left: 0, right: 0 }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-amber-400/60"
                style={{ left: 0, width: `${t.quarantine_threshold * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-red-500/60"
                style={{
                  left: `${t.quarantine_threshold * 100}%`,
                  width: `${(t.block_threshold - t.quarantine_threshold) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-amber-400/80"
                style={{ left: `${t.quarantine_threshold * 100}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500/80"
                style={{ left: `${t.block_threshold * 100}%` }}
              />
            </div>

            {data.soma_quarantine_offset > 0 && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-400/80">
                Soma stress active: effective quarantine = {(t.quarantine_threshold - data.soma_quarantine_offset).toFixed(3)}
              </div>
            )}

            {thresholdError && (
              <div className="text-xs text-red-400/80 rounded border border-red-500/20 bg-red-500/5 p-2">
                {thresholdError}
              </div>
            )}
            {thresholdSuccess && (
              <div className="text-xs text-emerald-400/80">Thresholds saved.</div>
            )}

            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-3">
              <Metric label="Innate enabled" value={data.innate_enabled ? "yes" : "no"} />
              <Metric label="Similarity enabled" value={data.similarity_enabled ? "yes" : "no"} />
            </div>

            <button
              onClick={saveThresholds}
              disabled={!thresholdValid || thresholdSaving}
              className={cn(
                "w-full py-1.5 rounded-lg text-xs font-medium transition-all",
                thresholdValid && !thresholdSaving
                  ? "bg-indigo-600/60 hover:bg-indigo-600/80 text-white"
                  : "bg-white/[0.04] text-white/20 cursor-not-allowed",
              )}
            >
              {thresholdSaving ? "Saving…" : "Save Thresholds"}
            </button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sigmoid + Belief Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Sigmoid midpoint" value={data.sigmoid_midpoint.toFixed(3)} sub="composite score → 0.5 discount" />
          <Metric label="Sigmoid steepness" value={data.sigmoid_steepness.toFixed(1)} sub="cliff sharpness" />
          <Metric label="Belief floor" value={data.belief_floor.toFixed(3)} sub="min update weight" />
          <Metric label="Salience gain" value={data.risk_salience_gain.toFixed(2)} sub="EIS score → risk dimension" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone Boundaries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.zones).map(([label, bounds]) => (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="w-28 text-white/50 capitalize">{label.replace(/_/g, " ")}</span>
                <code className="text-white/30 tabular-nums">
                  {bounds.lower.toFixed(2)} – {bounds.upper.toFixed(2)}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "threat-library"
  | "anomalies"
  | "quarantine-gate"
  | "taint"
  | "innate-checks"
  | "pathogens"
  | "config";

export default function EISPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Pathogen filter state (lifted here so filter changes trigger re-fetch)
  const [pathogenFilters, setPathogenFilters] = useState<{
    threat_class: ThreatClassFilter;
    severity: SeverityFilter;
    retired: RetiredFilter;
  }>({ threat_class: "all", severity: "all", retired: "all" });

  const health = useApi<EISHealthResponse>(api.eisHealth, { intervalMs: 5000 });
  const stats = useApi<EISStatsResponse>(api.eisStats, { intervalMs: 5000 });
  const threatLib = useApi<EISThreatLibraryResponse>(api.eisThreatLibrary, {
    intervalMs: 10000,
    enabled: activeTab === "threat-library",
  });
  const anomalies = useApi<EISAnomalyResponse[]>(() => api.eisAnomalies(50), {
    intervalMs: 8000,
    enabled: activeTab === "anomalies",
  });
  const anomalyStats = useApi<EISAnomalyStatsResponse>(api.eisAnomalyStats, {
    intervalMs: 8000,
    enabled: activeTab === "anomalies",
  });
  const quarantineGate = useApi<EISQuarantineGateResponse>(api.eisQuarantineGate, {
    intervalMs: 10000,
    enabled: activeTab === "quarantine-gate",
  });
  const taint = useApi<EISTaintResponse>(api.eisTaint, {
    intervalMs: 10000,
    enabled: activeTab === "taint",
  });
  const innateChecks = useApi<EISInnateCheckDetail[]>(api.eisInnateChecks, {
    intervalMs: 15000,
    enabled: activeTab === "innate-checks",
  });
  const pathogenStats = useApi<EISPathogenStoreStats>(api.eisPathogenStats, {
    intervalMs: 30000,
    enabled: activeTab === "pathogens",
  });
  const pathogenFetcher = () =>
    api.eisPathogens({
      limit: 100,
      threat_class: pathogenFilters.threat_class === "all" ? undefined : pathogenFilters.threat_class,
      severity: pathogenFilters.severity === "all" ? undefined : pathogenFilters.severity,
      retired:
        pathogenFilters.retired === "all"
          ? undefined
          : pathogenFilters.retired === "retired",
    });
  const pathogens = useApi<EISPathogenListResponse>(pathogenFetcher, {
    intervalMs: 30000,
    enabled: activeTab === "pathogens",
  });
  const config = useApi<EISConfigResponse>(api.eisConfig, {
    intervalMs: 30000,
    enabled: activeTab === "config",
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "threat-library", label: "Threat Library" },
    { id: "anomalies", label: "Anomalies" },
    { id: "quarantine-gate", label: "Quarantine Gate" },
    { id: "taint", label: "Taint Engine" },
    { id: "innate-checks", label: "Innate Checks" },
    { id: "pathogens", label: "Pathogens" },
    { id: "config", label: "Configuration" },
  ];

  const isHealthy = health.data?.status === "healthy";

  return (
    <>
      <PageHeader
          title="EIS — Epistemic Immune System"
          description="Multi-layer threat detection, behavioral surveillance, and mutation safety"
        >
          {health.data ? (
            <Badge variant={isHealthy ? "success" : "danger"} pulse={isHealthy}>
              {health.data.status}
            </Badge>
          ) : (
            <Badge variant="muted">connecting…</Badge>
          )}
        </PageHeader>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600/80 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "overview" && (
            <OverviewTab health={health.data} stats={stats.data} />
          )}
          {activeTab === "threat-library" && (
            <ThreatLibraryTab data={threatLib.data} />
          )}
          {activeTab === "anomalies" && (
            <AnomaliesTab anomalies={anomalies.data} anomalyStats={anomalyStats.data} />
          )}
          {activeTab === "quarantine-gate" && (
            <QuarantineGateTab data={quarantineGate.data} />
          )}
          {activeTab === "taint" && (
            <TaintTab data={taint.data} />
          )}
          {activeTab === "innate-checks" && (
            <InnateChecksTab data={innateChecks.data} />
          )}
          {activeTab === "pathogens" && (
            <PathogensTab
              listData={pathogens.data}
              stats={pathogenStats.data}
              filters={pathogenFilters}
              onFilter={(f) => {
                setPathogenFilters({
                  threat_class: f.threat_class ?? "all",
                  severity: f.severity ?? "all",
                  retired:
                    f.retired === undefined ? "all" : f.retired ? "retired" : "active",
                });
                // Trigger immediate re-fetch with new filters
                setTimeout(() => pathogens.refetch(), 0);
              }}
            />
          )}
          {activeTab === "config" && (
            <ConfigTab data={config.data} onRefresh={config.refetch} />
          )}
        </div>
    </>
  );
}
