"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  TelosHealthResponse,
  TelosEffectiveIResponse,
  TelosCareReportResponse,
  TelosCoherenceReportResponse,
  TelosGrowthReportResponse,
  TelosHonestyReportResponse,
  TelosAlignmentHistoryResponse,
  TelosConstitutionalAuditResponse,
  TelosFrontierDomain,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/formatters";

// ─── Helpers ─────────────────────────────────────────────────────

function sanitizeNum(n: number | null | undefined): number {
  if (n == null) return 0;
  return Number.isNaN(n) ? 0 : n;
}

function fmt2(n: number | null | undefined): string {
  return sanitizeNum(n).toFixed(2);
}

function fmt3(n: number | null | undefined): string {
  return sanitizeNum(n).toFixed(3);
}

function urgencyVariant(u: string): "success" | "warning" | "danger" | "muted" | "default" {
  switch (u) {
    case "nominal": return "success";
    case "warning": return "warning";
    case "critical": return "danger";
    case "emergency": return "danger";
    default: return "muted";
  }
}

// ─── Spark Miniature Bar ─────────────────────────────────────────

function Bar({
  value,
  color,
  label,
  sublabel,
  reversed = false,
}: {
  value: number;
  color: string;
  label: string;
  sublabel?: string;
  reversed?: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, sanitizeNum(value)));
  const pctWidth = reversed ? (1 - clamped) * 100 : clamped * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 tabular-nums">
          {sublabel ?? pct(clamped)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pctWidth}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-white/25">{label}</div>
      <div className={cn("text-sm tabular-nums font-medium", dim ? "text-white/40" : "text-white/75")}>
        {value}
      </div>
    </div>
  );
}

// ─── Intelligence Topology Radar ─────────────────────────────────
// Four-axis spider in pure SVG

function TopologyRadar({
  care,
  coherence,
  growth,
  honesty,
}: {
  care: number;
  coherence: number;
  growth: number;
  honesty: number;
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 76;

  // Four axes at 0°, 90°, 180°, 270°
  // Top=Honesty, Right=Growth, Bottom=Care, Left=Coherence
  const axes = [
    { label: "Honesty", angle: -90, value: sanitizeNum(honesty), color: "#a78bfa" },
    { label: "Growth", angle: 0, value: sanitizeNum(growth), color: "#4ade80" },
    { label: "Care", angle: 90, value: sanitizeNum(care), color: "#f472b6" },
    { label: "Coherence", angle: 180, value: sanitizeNum(coherence), color: "#38bdf8" },
  ];

  function pt(angle: number, radius: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  // Danger zone: low-care + low-honesty corner (bottom-left area)
  // Background rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon
  const dataPoints = axes.map((ax) => {
    const p = pt(ax.angle, ax.value * r);
    return `${p.x},${p.y}`;
  });
  const polygon = dataPoints.join(" ");

  // Danger zone: when care < 0.4 and honesty < 0.4
  const isDangerous = care < 0.4 && honesty < 0.4;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes.map((ax) => {
              const p = pt(ax.angle, ring * r);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axes.map((ax) => {
          const end = pt(ax.angle, r);
          return (
            <line
              key={ax.label}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Danger zone tint (low-care + low-honesty) */}
        {isDangerous && (
          <polygon
            points={polygon}
            fill="rgba(239,68,68,0.08)"
            stroke="rgba(239,68,68,0.3)"
            strokeWidth="1"
          />
        )}

        {/* Data polygon */}
        {!isDangerous && (
          <polygon
            points={polygon}
            fill="rgba(94,234,212,0.08)"
            stroke="rgba(94,234,212,0.5)"
            strokeWidth="1.5"
          />
        )}

        {/* Axis dots + labels */}
        {axes.map((ax) => {
          const tip = pt(ax.angle, r);
          const labelPt = pt(ax.angle, r + 16);
          const dataPt = pt(ax.angle, ax.value * r);
          return (
            <g key={ax.label}>
              {/* Data dot */}
              <circle
                cx={dataPt.x}
                cy={dataPt.y}
                r={3.5}
                fill={ax.color}
                opacity={0.9}
              />
              {/* Axis tip dot */}
              <circle cx={tip.x} cy={tip.y} r={1.5} fill="rgba(255,255,255,0.12)" />
              {/* Label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill={ax.color}
                opacity={0.8}
              >
                {ax.label}
              </text>
            </g>
          );
        })}

        {/* Center cross */}
        <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.2)" />
      </svg>

      {/* Quadrant labels */}
      <div className="text-[9px] text-white/20 text-center leading-tight">
        {isDangerous
          ? <span className="text-red-400/70">⚠ dangerous optimization zone</span>
          : <span className="text-teal-400/50">genuine intelligence corner: high-all-four</span>
        }
      </div>
    </div>
  );
}

// ─── Alignment Gap Sparkline ──────────────────────────────────────

function AlignmentSparkline({ samples }: { samples: TelosAlignmentHistoryResponse["samples"] }) {
  if (!samples.length) return null;

  const w = 280;
  const h = 60;
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const maxGap = Math.max(0.01, ...samples.map((s) => s.gap_fraction));
  const pts = samples.map((s, i) => {
    const x = pad + (i / Math.max(1, samples.length - 1)) * innerW;
    const y = pad + innerH - (s.gap_fraction / maxGap) * innerH;
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const latest = samples[samples.length - 1];
  const gapPct = (latest?.gap_fraction ?? 0) * 100;
  const isCritical = gapPct > 20;
  const lineColor = gapPct > 40 ? "#ef4444" : gapPct > 20 ? "#f59e0b" : "#5eead4";

  return (
    <div className="space-y-1">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Zero line */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
        {/* 20% warning band */}
        {maxGap > 0 && (
          <line
            x1={pad}
            x2={w - pad}
            y1={pad + innerH - (0.2 / maxGap) * innerH}
            y2={pad + innerH - (0.2 / maxGap) * innerH}
            stroke="rgba(245,158,11,0.2)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        )}
        {/* Area fill */}
        {samples.length > 1 && (
          <polyline
            points={`${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`}
            fill={isCritical ? "rgba(239,68,68,0.06)" : "rgba(94,234,212,0.04)"}
            stroke="none"
          />
        )}
        {/* Line */}
        {samples.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Latest dot */}
        {samples.length > 0 && (
          <circle
            cx={w - pad}
            cy={pad + innerH - ((latest?.gap_fraction ?? 0) / maxGap) * innerH}
            r={2.5}
            fill={lineColor}
          />
        )}
      </svg>
    </div>
  );
}

// ─── Growth Trajectory Miniplot ───────────────────────────────────

function GrowthTrajectoryBar({
  frontierDomains,
}: {
  frontierDomains: TelosFrontierDomain[];
}) {
  if (!frontierDomains.length)
    return <div className="text-xs text-white/20">No frontier domains identified.</div>;

  return (
    <div className="space-y-2">
      {frontierDomains.slice(0, 5).map((fd) => (
        <div key={fd.domain} className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40 truncate max-w-[140px]">{fd.domain}</span>
            <span className="text-amber-400/70 tabular-nums">{pct(fd.current_coverage)}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-amber-400/40 transition-all duration-500"
              style={{ width: `${fd.current_coverage * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Constitutional Binding Status ───────────────────────────────

function BindingRow({
  label,
  intact,
  description,
}: {
  label: string;
  intact: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
      <div
        className={cn(
          "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
          intact ? "bg-emerald-400" : "bg-red-400 animate-pulse",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-white/70">{label}</div>
        <div className="text-[10px] text-white/30">{description}</div>
      </div>
      <Badge variant={intact ? "success" : "danger"} className="flex-shrink-0">
        {intact ? "intact" : "violated"}
      </Badge>
    </div>
  );
}

// ─── Incoherence Type Badge ───────────────────────────────────────

const incoherenceColors: Record<string, string> = {
  LOGICAL_CONTRADICTION: "#ef4444",
  TEMPORAL_INCOHERENCE: "#f59e0b",
  VALUE_INCOHERENCE: "#a78bfa",
  CROSS_DOMAIN_MISMATCH: "#38bdf8",
};

function IncoherenceTypeDot({ type }: { type: string }) {
  const color = incoherenceColors[type] ?? "#6b7280";
  const shortLabel: Record<string, string> = {
    LOGICAL_CONTRADICTION: "Logic",
    TEMPORAL_INCOHERENCE: "Temporal",
    VALUE_INCOHERENCE: "Value",
    CROSS_DOMAIN_MISMATCH: "X-Domain",
  };
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {shortLabel[type] ?? type}
    </span>
  );
}

// ─── Honesty Decomposition ────────────────────────────────────────

function HonestyDecomposition({ data }: { data: TelosHonestyReportResponse }) {
  const components = [
    {
      label: "Selective Attention",
      value: data.selective_attention_bias,
      color: "#f59e0b",
      description: "Observed success > expected — bias toward seeing what it wants",
    },
    {
      label: "Hypothesis Protection",
      value: data.hypothesis_protection_bias,
      color: "#a78bfa",
      description: "Avoids falsifying its own beliefs",
    },
    {
      label: "Confabulation",
      value: data.confabulation_rate,
      color: "#ef4444",
      description: "Post-hoc explanations for unpredicted observations",
    },
    {
      label: "Overclaiming",
      value: data.overclaiming_rate,
      color: "#f97316",
      description: "Asserts coverage in untested domains",
    },
  ];

  return (
    <div className="space-y-2.5">
      {components.map((c) => (
        <div key={c.label}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-white/50">{c.label}</span>
            <span className="tabular-nums" style={{ color: c.value > 0.2 ? c.color : "rgba(255,255,255,0.4)" }}>
              {pct(c.value)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, c.value * 100)}%`,
                background: c.color,
                opacity: c.value > 0.05 ? 1 : 0.3,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function TelosPage() {
  const health = useApi<TelosHealthResponse>(api.telosHealth, { intervalMs: 10000 });
  const effectiveI = useApi<TelosEffectiveIResponse>(api.telosEffectiveI, { intervalMs: 5000 });
  const care = useApi<TelosCareReportResponse>(api.telosCare, { intervalMs: 8000 });
  const coherence = useApi<TelosCoherenceReportResponse>(api.telosCoherence, { intervalMs: 8000 });
  const growth = useApi<TelosGrowthReportResponse>(api.telosGrowth, { intervalMs: 8000 });
  const honesty = useApi<TelosHonestyReportResponse>(api.telosHonesty, { intervalMs: 8000 });
  const alignment = useApi<TelosAlignmentHistoryResponse>(
    () => api.telosAlignmentHistory(60),
    { intervalMs: 10000 },
  );
  const audit = useApi<TelosConstitutionalAuditResponse>(
    api.telosConstitutionalAudit,
    { intervalMs: 30000 },
  );

  const ei = effectiveI.data;
  const gap = ei ? ei.alignment_gap : 0;
  const gapPct = gap * 100;
  const gapVariant =
    gapPct > 40 ? "danger" : gapPct > 20 ? "warning" : gapPct > 10 ? "info" : "success";

  const trend = alignment.data?.current_trend;
  const isEmergency = audit.data?.is_emergency ?? false;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Telos"
        description="Drive Topology — Effective vs Nominal Intelligence"
      >
        <div className="flex items-center gap-2">
          {health.data && (
            <Badge variant={health.data?.status === "healthy" ? "success" : "warning"} pulse={health.data?.status === "healthy"}>
              {health.data?.status}
            </Badge>
          )}
          {isEmergency && (
            <Badge variant="danger" pulse>
              Constitutional Emergency
            </Badge>
          )}
          {trend && (
            <Badge variant={urgencyVariant(trend.urgency)}>
              gap: {urgencyVariant(trend.urgency) !== "muted" ? trend.urgency : "nominal"}
            </Badge>
          )}
        </div>
      </PageHeader>

      {/* Row 1: Topology + Alignment Gap (most important) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Intelligence Topology Radar */}
        <Card glow className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Intelligence Topology</CardTitle>
            <span className="text-[10px] text-white/25">4D drive space</span>
          </CardHeader>
          <CardContent>
            {ei ? (
              <div className="flex flex-col items-center gap-4">
                <TopologyRadar
                  care={ei.care_coverage_multiplier}
                  coherence={Math.min(1, 1 / Math.max(0.01, (ei.coherence_compression_bonus ?? 1) - 1 + 1))}
                  growth={ei.growth_exploration_rate}
                  honesty={ei.honesty_validity_coefficient}
                />
                <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <Bar
                    label="Care"
                    value={ei.care_coverage_multiplier}
                    color="#f472b6"
                  />
                  <Bar
                    label="Honesty"
                    value={ei.honesty_validity_coefficient}
                    color="#a78bfa"
                  />
                  <Bar
                    label="Growth"
                    value={ei.growth_exploration_rate}
                    color="#4ade80"
                  />
                  <Bar
                    label="Coherence"
                    value={Math.min(1, ei.coherence_compression_bonus ?? 1)}
                    color="#38bdf8"
                    sublabel={`${fmt2(ei.coherence_compression_bonus ?? 1)}×`}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20 py-8 text-center">Loading topology…</div>
            )}
          </CardContent>
        </Card>

        {/* Alignment Gap — Primary Warning */}
        <Card glow className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Effective vs Nominal I</CardTitle>
            {ei && (
              <Badge variant={gapVariant} pulse={gapPct > 20}>
                {gapPct > 0.1 ? `${gapPct.toFixed(1)}% gap` : "aligned"}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {ei ? (
              <>
                {/* Gap visual */}
                <div className="space-y-2">
                  <div className="relative h-10 rounded-lg bg-white/[0.03] overflow-hidden border border-white/[0.06]">
                    {/* Effective I fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-l transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (ei.effective_I / Math.max(ei.nominal_I, 0.01)) * 100)}%`,
                        background: gapPct > 20
                          ? "linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.15))"
                          : "linear-gradient(90deg, rgba(94,234,212,0.25), rgba(94,234,212,0.1))",
                      }}
                    />
                    {/* Labels */}
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <div className="text-xs text-white/50">
                        Effective <span className="text-white/80 font-medium tabular-nums">{fmt3(ei.effective_I)}</span>
                      </div>
                      <div className="text-xs text-white/30">
                        Nominal <span className="text-white/50 tabular-nums">{fmt3(ei.nominal_I)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gap warning */}
                  {gapPct > 10 && (
                    <div
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs",
                        gapPct > 40
                          ? "border-red-500/30 bg-red-500/[0.06] text-red-300"
                          : gapPct > 20
                          ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-300"
                          : "border-sky-500/20 bg-sky-500/[0.04] text-sky-300",
                      )}
                    >
                      <span className="font-medium">
                        {gapPct > 40 ? "Critical: " : gapPct > 20 ? "Warning: " : "Note: "}
                      </span>
                      Nominal I is inflated by{" "}
                      <span className="font-medium tabular-nums">{gapPct.toFixed(1)}%</span>
                      {ei.alignment_gap_warning && alignment.data?.samples.length && (
                        (() => {
                          const cause = alignment.data!.samples[alignment.data!.samples.length - 1]?.primary_cause;
                          return cause && cause !== "none"
                            ? <span> — primary cause: <span className="font-medium capitalize">{cause}</span></span>
                            : null;
                        })()
                      )}
                    </div>
                  )}
                </div>

                {/* Drive multiplier breakdown */}
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                    Gap Decomposition
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] text-pink-400/60 mb-1">Care Loss</div>
                      <div className="text-sm font-medium tabular-nums text-white/70">
                        {pct(1 - ei.care_coverage_multiplier)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] text-sky-400/60 mb-1">Coherence Cost</div>
                      <div className="text-sm font-medium tabular-nums text-white/70">
                        {fmt2(ei.coherence_compression_bonus ?? 1)}×
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] text-violet-400/60 mb-1">Honesty Loss</div>
                      <div className="text-sm font-medium tabular-nums text-white/70">
                        {pct(1 - ei.honesty_validity_coefficient)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sparkline history */}
                {alignment.data?.samples && alignment.data?.samples.length > 1 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Gap History
                    </div>
                    <AlignmentSparkline samples={alignment.data?.samples} />
                    {trend && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-white/30">Trend:</span>
                        <Badge variant={urgencyVariant(trend.urgency)}>
                          {trend.urgency}
                        </Badge>
                        {trend.is_widening && (
                          <span className="text-amber-400/70">↑ widening</span>
                        )}
                        <span className="text-white/25 tabular-nums">
                          {trend.slope_per_hour >= 0 ? "+" : ""}
                          {(trend.slope_per_hour * 100).toFixed(2)}%/hr
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* dI/dt */}
                <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
                  <Metric
                    label="dI/dt (effective)"
                    value={`${ei.effective_dI_dt >= 0 ? "+" : ""}${fmt3(ei.effective_dI_dt)}`}
                  />
                  <Metric label="Computation" value={health.data?.computation_count.toLocaleString() ?? "—"} dim />
                </div>
              </>
            ) : (
              <div className="text-sm text-white/20 py-8 text-center">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Care, Coherence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Care Coverage */}
        <Card>
          <CardHeader>
            <CardTitle>Care Coverage</CardTitle>
            {ei && (
              <Badge variant={ei.care_coverage_multiplier < 0.6 ? "danger" : ei.care_coverage_multiplier < 0.8 ? "warning" : "success"}>
                {pct(ei.care_coverage_multiplier)} coverage
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {care.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Multiplier"
                    value={fmt3(care.data.care_coverage_multiplier)}
                  />
                  <Metric
                    label="I Reduction"
                    value={fmt3(care.data.total_i_reduction)}
                  />
                  <Metric
                    label="Welfare Failures"
                    value={String(Array.isArray(care.data?.welfare_prediction_failures) ? care.data.welfare_prediction_failures.length : 0)}
                  />
                  <Metric
                    label="Uncovered Domains"
                    value={String(Array.isArray(care.data?.uncovered_welfare_domains) ? care.data.uncovered_welfare_domains.length : 0)}
                  />
                </div>

                {/* Uncovered welfare domains */}
                {(care.data?.uncovered_welfare_domains ?? []).length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Uncovered Domains
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(care.data?.uncovered_welfare_domains ?? []).slice(0, 8).map((d) => (
                        <span
                          key={d}
                          className="rounded px-1.5 py-0.5 text-[10px] border border-pink-500/20 bg-pink-500/[0.06] text-pink-300/70"
                        >
                          {d}
                        </span>
                      ))}
                      {(care.data?.uncovered_welfare_domains ?? []).length > 8 && (
                        <span className="text-[10px] text-white/20">
                          +{(care.data?.uncovered_welfare_domains ?? []).length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Top welfare failures */}
                {(care.data?.welfare_prediction_failures ?? []).length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Welfare Prediction Failures
                    </div>
                    <div className="space-y-1.5">
                      {(care.data?.welfare_prediction_failures ?? []).slice(0, 4).map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded border border-white/[0.04] px-2.5 py-1.5 text-xs"
                        >
                          <span className="text-white/50 truncate max-w-[140px]">{f.domain}</span>
                          <div className="flex items-center gap-2 text-[10px] text-white/30 tabular-nums">
                            <span>err: {fmt2(f.error_magnitude)}</span>
                            <span className="text-pink-400/60">−{fmt3(f.i_reduction)} I</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(care.data?.welfare_prediction_failures ?? []).length === 0 &&
                  (care.data?.uncovered_welfare_domains ?? []).length === 0 && (
                    <div className="text-center py-4 text-xs text-white/20">
                      No welfare coverage gaps detected.
                    </div>
                  )}
              </>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>

        {/* Coherence Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Coherence Cost</CardTitle>
            {coherence.data && (
              <Badge
                variant={
                  coherence.data?.total_extra_bits > 500
                    ? "danger"
                    : coherence.data?.total_extra_bits > 100
                    ? "warning"
                    : "success"
                }
              >
                {coherence.data?.total_extra_bits.toFixed(0)} extra bits
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {coherence.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Compression Bonus"
                    value={`${fmt2(coherence.data?.coherence_compression_bonus ?? 1)}×`}
                  />
                  <Metric
                    label="Extra Bits"
                    value={coherence.data?.total_extra_bits.toFixed(1)}
                  />
                </div>

                {/* Four incoherence type counts */}
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                    Incoherence Types
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Logical Contradictions", count: coherence.data?.logical_contradiction_count, type: "LOGICAL_CONTRADICTION" },
                      { label: "Temporal Violations", count: coherence.data?.temporal_incoherence_count, type: "TEMPORAL_INCOHERENCE" },
                      { label: "Value Conflicts", count: coherence.data?.value_incoherence_count, type: "VALUE_INCOHERENCE" },
                      { label: "X-Domain Mismatches", count: coherence.data?.cross_domain_mismatch_count, type: "CROSS_DOMAIN_MISMATCH" },
                    ].map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center justify-between rounded border border-white/[0.04] px-2 py-1.5"
                      >
                        <IncoherenceTypeDot type={item.type} />
                        <span className={cn(
                          "text-sm tabular-nums font-medium",
                          item.count > 0 ? "text-white/70" : "text-white/20",
                        )}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top incoherences */}
                {coherence.data?.incoherences?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Active Incoherences
                    </div>
                    <div className="space-y-2">
                      {coherence.data?.incoherences.slice(0, 3).map((inc, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <IncoherenceTypeDot type={inc.incoherence_type} />
                            <span className="text-[10px] text-white/30 tabular-nums">
                              +{inc.extra_description_bits.toFixed(1)} bits
                            </span>
                          </div>
                          <div className="text-[11px] text-white/45 leading-relaxed">
                            {inc.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Growth, Honesty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Growth Trajectory */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Trajectory</CardTitle>
            {growth.data && (
              <Badge
                variant={
                  growth.data?.is_stagnating ? "warning" : growth.data?.dI_dt > 0 ? "success" : "muted"
                }
              >
                {growth.data?.is_stagnating ? "stagnating" : `dI/dt ${growth.data?.dI_dt >= 0 ? "+" : ""}${fmt3(growth.data?.dI_dt)}`}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {growth.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="dI/dt"
                    value={`${growth.data?.dI_dt >= 0 ? "+" : ""}${fmt3(growth.data?.dI_dt)}`}
                  />
                  <Metric
                    label="d²I/dt²"
                    value={`${growth.data?.d2I_dt2 >= 0 ? "+" : ""}${fmt3(growth.data?.d2I_dt2)}`}
                  />
                  <Metric
                    label="Novel Domain Fraction"
                    value={pct(growth.data?.novel_domain_fraction)}
                  />
                  <Metric
                    label="Compression Rate"
                    value={`${growth.data?.compression_rate.toFixed(2)}/hr`}
                  />
                  <Metric
                    label="Growth Score"
                    value={fmt3(growth.data?.growth_score)}
                  />
                  <Metric
                    label="Frontier Domains"
                    value={growth.data?.frontier_domains.length.toString()}
                  />
                </div>

                {/* Growth directive */}
                {growth.data?.growth_directive && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">
                        Growth Directive
                      </Badge>
                      <span className="text-[10px] text-white/30">
                        urgency {fmt2(growth.data?.growth_directive.urgency)}
                      </span>
                    </div>
                    <div className="text-xs text-amber-300/70">
                      {growth.data?.growth_directive.directive}
                    </div>
                    {growth.data?.growth_directive.frontier_targets.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {growth.data?.growth_directive.frontier_targets.map((t) => (
                          <span
                            key={t}
                            className="rounded px-1.5 py-0.5 text-[10px] border border-amber-500/20 bg-amber-500/[0.08] text-amber-300/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Frontier domains */}
                {growth.data?.frontier_domains.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                      Frontier Domains (coverage &lt; 40%)
                    </div>
                    <GrowthTrajectoryBar frontierDomains={growth.data?.frontier_domains} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>

        {/* Honesty Validity */}
        <Card>
          <CardHeader>
            <CardTitle>Honesty Validity</CardTitle>
            {honesty.data && (
              <Badge
                variant={
                  honesty.data?.honesty_validity_coefficient < 0.6
                    ? "danger"
                    : honesty.data?.honesty_validity_coefficient < 0.8
                    ? "warning"
                    : "success"
                }
              >
                {pct(honesty.data?.honesty_validity_coefficient)} valid
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {honesty.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Validity Coefficient"
                    value={fmt3(honesty.data?.honesty_validity_coefficient)}
                  />
                  <Metric
                    label="Nominal I Inflation"
                    value={fmt3(honesty.data?.nominal_i_inflation)}
                  />
                </div>

                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
                    Dishonesty Modes
                  </div>
                  <HonestyDecomposition data={honesty.data} />
                </div>

                {/* Interpretation */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">
                    Self-Report
                  </div>
                  {honesty.data?.honesty_validity_coefficient > 0.9 ? (
                    <div className="text-xs text-white/40">
                      High validity. The organism's self-model is broadly accurate.
                    </div>
                  ) : honesty.data?.honesty_validity_coefficient > 0.7 ? (
                    <div className="text-xs text-amber-300/60">
                      Moderate validity. Some selective attention or overclaiming detected.
                    </div>
                  ) : (
                    <div className="text-xs text-red-300/70">
                      Low validity. The organism may be systematically lying to itself.
                      Nominal I is significantly inflated.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Constitutional Health */}
      <Card>
        <CardHeader>
          <CardTitle>Constitutional Health</CardTitle>
          <div className="flex items-center gap-2">
            {audit.data && (
              <Badge
                variant={audit.data?.audit_passed ? "success" : "danger"}
                pulse={!audit.data?.audit_passed}
              >
                {audit.data?.audit_passed ? "24h audit passed" : "audit failed"}
              </Badge>
            )}
            {audit.data?.is_emergency && (
              <Badge variant="danger" pulse>Emergency</Badge>
            )}
            {audit.data?.last_audit_at && (
              <span className="text-[10px] text-white/20">
                Last: {new Date(audit.data?.last_audit_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {audit.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Four bindings */}
              <div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
                  Immutable Bindings
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 py-1 divide-y divide-white/[0.04]">
                  <BindingRow
                    label="CARE IS COVERAGE"
                    intact={audit.data?.bindings_intact.care_is_coverage}
                    description="Care = expanding welfare coverage, not constraint satisfaction"
                  />
                  <BindingRow
                    label="COHERENCE IS COMPRESSION"
                    intact={audit.data?.bindings_intact.coherence_is_compression}
                    description="Coherence = efficient world model, not optional polish"
                  />
                  <BindingRow
                    label="GROWTH IS GRADIENT"
                    intact={audit.data?.bindings_intact.growth_is_gradient}
                    description="Growth = dI/dt learning velocity, not accumulated size"
                  />
                  <BindingRow
                    label="HONESTY IS VALIDITY"
                    intact={audit.data?.bindings_intact.honesty_is_validity}
                    description="Honesty = calibration of intelligence ratio, not communication rule"
                  />
                </div>
              </div>

              {/* Violations */}
              <div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
                  Violations Since Last Audit
                </div>
                {audit.data?.violations_since_last_audit.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-5 text-center">
                    <div className="text-2xl mb-1 opacity-20">✓</div>
                    <div className="text-xs text-white/25">
                      No constitutional violations detected in this cycle.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {audit.data?.violations_since_last_audit.map((v, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-300/80">{v.violation_type}</span>
                          <Badge variant="danger">{v.severity}</Badge>
                        </div>
                        <div className="text-[11px] text-white/40 leading-relaxed">{v.description}</div>
                        <div className="text-[10px] text-white/20">
                          {new Date(v.detected_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Consecutive failures indicator */}
                {audit.data?.consecutive_failures > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-300/70">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    {audit.data?.consecutive_failures} consecutive audit failure
                    {audit.data?.consecutive_failures !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/20">Loading constitutional audit…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
