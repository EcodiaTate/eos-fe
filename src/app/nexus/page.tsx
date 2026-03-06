"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import {
  api,
  type NexusStatsResponse,
  type NexusFragment,
  type NexusConvergence,
  type NexusDivergenceScore,
  type NexusDivergenceProfileResponse,
  type NexusSpeciationResponse,
  type NexusGroundTruthResponse,
  type NexusPromotionDecision,
  type DivergenceClassification,
  type EpistemicLevel,
  EPISTEMIC_LEVEL_LABELS,
} from "@/lib/api-client";
import { useAliveSocket } from "@/hooks/use-alive-socket";
import { useAliveStore } from "@/stores/alive-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { pct, relTime } from "@/lib/formatters";

// ─── Constants ────────────────────────────────────────────────────

const TABS = [
  "federation",
  "triangulation",
  "divergence",
  "convergence",
  "speciation",
  "ground-truth",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  federation: "Federation Map",
  triangulation: "Triangulation",
  divergence: "Divergence Profile",
  convergence: "Convergence Feed",
  speciation: "Speciation",
  "ground-truth": "Ground Truth Pipeline",
};

const DIVERGENCE_COLORS: Record<DivergenceClassification, string> = {
  same_kind: "var(--ink-muted)",
  related_kind: "var(--lime)",
  distinct_kind: "var(--gold-bright)",
  alien_kind: "var(--ink-soft)",
};

const DIVERGENCE_BG: Record<DivergenceClassification, { bg: string; border: string }> = {
  same_kind: { bg: "rgba(15, 26, 10, 0.03)", border: "rgba(15, 26, 10, 0.08)" },
  related_kind: { bg: "rgba(90, 200, 38, 0.06)", border: "rgba(90, 200, 38, 0.15)" },
  distinct_kind: { bg: "rgba(232, 168, 32, 0.06)", border: "rgba(232, 168, 32, 0.15)" },
  alien_kind: { bg: "rgba(15, 26, 10, 0.05)", border: "rgba(15, 26, 10, 0.1)" },
};

const EPISTEMIC_COLORS: Record<EpistemicLevel, { bg: string; text: string }> = {
  0: { bg: "rgba(15, 26, 10, 0.05)", text: "var(--ink-muted)" },
  1: { bg: "rgba(90, 200, 38, 0.08)", text: "var(--lime)" },
  2: { bg: "rgba(232, 168, 32, 0.08)", text: "var(--gold-bright)" },
  3: { bg: "rgba(90, 200, 38, 0.1)", text: "var(--lime-bright)" },
  4: { bg: "rgba(90, 200, 38, 0.12)", text: "var(--lime-bright)" },
};

const EPISTEMIC_BAR: Record<EpistemicLevel, string> = {
  0: "var(--ink-soft)",
  1: "var(--lime)",
  2: "var(--gold-bright)",
  3: "var(--lime-bright)",
  4: "var(--lime-bright)",
};

// ─── Helpers ──────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(3);
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function classifyLabel(c: DivergenceClassification): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-strong)", fontFamily: "var(--font-body)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{sub}</div>}
    </div>
  );
}

function EpistemicBadge({ level }: { level: EpistemicLevel }) {
  const colors = EPISTEMIC_COLORS[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "6px",
        paddingLeft: "6px",
        paddingRight: "6px",
        paddingTop: "4px",
        paddingBottom: "4px",
        fontSize: "10px",
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: "var(--font-body)",
      }}
    >
      L{level} {EPISTEMIC_LEVEL_LABELS[level]}
    </span>
  );
}

function WeightBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: "80px", fontSize: "11px", color: "var(--ink-soft)" }}>{label}</div>
      <div style={{ flex: 1, borderRadius: "9999px", backgroundColor: "var(--ink-muted)", height: "6px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            background: "var(--lime)",
            width: `${Math.min(value * 100, 100)}%`,
            transition: "width 300ms ease-out",
          }}
        />
      </div>
      <div style={{ width: "40px", textAlign: "right", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--ink-mid)" }}>
        {pct(value, 0)}
      </div>
    </div>
  );
}

// ─── Tab: Federation Map ──────────────────────────────────────────
// Spatial layout using divergence scores to position instances

interface FederationNode {
  id: string;
  x: number;
  y: number;
  divergence: number;
  classification: DivergenceClassification;
  isSpeciated: boolean;
}

function FederationMap({
  divergenceMap,
  speciationData,
  instanceId,
}: {
  divergenceMap: NexusDivergenceScore[];
  speciationData: NexusSpeciationResponse | null;
  instanceId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [nodes, setNodes] = useState<FederationNode[]>([]);

  // Build node list from divergence scores
  useEffect(() => {
    if (!divergenceMap.length) return;
    const W = 520;
    const H = 320;
    const cx = W / 2;
    const cy = H / 2;

    // "This" instance at center
    const allNodes: FederationNode[] = [
      {
        id: instanceId,
        x: cx,
        y: cy,
        divergence: 0,
        classification: "same_kind",
        isSpeciated: false,
      },
    ];

    const speciatedIds = new Set(
      speciationData?.speciation_events.flatMap((e) => [e.instance_a_id, e.instance_b_id]) ?? [],
    );

    // Place peers by divergence — more divergent = farther from center
    const seen = new Set<string>([instanceId]);
    divergenceMap.forEach((d, i) => {
      const peerId =
        d.instance_a_id === instanceId ? d.instance_b_id : d.instance_a_id;
      if (seen.has(peerId)) return;
      seen.add(peerId);

      const radius = 40 + d.overall * 220; // 40–260 px
      const angle = (i / Math.max(divergenceMap.length, 1)) * 2 * Math.PI - Math.PI / 2;
      allNodes.push({
        id: peerId,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        divergence: d.overall,
        classification: d.classification,
        isSpeciated: speciatedIds.has(peerId),
      });
    });

    setNodes(allNodes);
  }, [divergenceMap, speciationData, instanceId]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colorMap: Record<DivergenceClassification, string> = {
      same_kind: "rgba(114, 124, 103, 0.4)",
      related_kind: "rgba(90, 200, 38, 0.8)",
      distinct_kind: "rgba(232, 168, 32, 0.8)",
      alien_kind: "rgba(114, 124, 103, 0.6)",
    };

    // Draw edges from center to peers
    const center = nodes[0];
    nodes.slice(1).forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(n.x, n.y);
      const alpha = n.isSpeciated ? 0.06 : 0.12;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.setLineDash(n.isSpeciated ? [4, 4] : []);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw divergence rings from center
    [0.2, 0.5, 0.8].forEach((ring) => {
      const r = 40 + ring * 220;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(15, 26, 10, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((n) => {
      const isSelf = n.id === instanceId;
      const isHov = n.id === hovered;
      const r = isSelf ? 10 : n.isSpeciated ? 6 : 5;
      const color = isSelf ? "rgba(90, 200, 38, 1)" : colorMap[n.classification];

      // Glow for speciated / hovered
      if (n.isSpeciated || isHov) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = n.isSpeciated
          ? "rgba(232, 168, 32, 0.12)"
          : "rgba(15, 26, 10, 0.06)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Speciated ring
      if (n.isSpeciated) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(232, 168, 32, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      ctx.font = "10px DM Mono";
      ctx.fillStyle = isHov ? "rgba(15, 26, 10, 1)" : "rgba(15, 26, 10, 0.5)";
      ctx.fillText(shortId(n.id), n.x + r + 3, n.y + 4);
    });
  }, [nodes, hovered, instanceId]);

  // Mouse tracking for hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = nodes.find((n) => Math.hypot(n.x - mx, n.y - my) < 10);
      setHovered(hit?.id ?? null);
    },
    [nodes],
  );

  const hoveredNode = nodes.find((n) => n.id === hovered);

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4" style={{ fontSize: "11px" }}>
        {(Object.entries(DIVERGENCE_COLORS) as [DivergenceClassification, string][]).map(
          ([cls, color]) => {
            const dotColor = cls === "same_kind"
              ? "rgba(114, 124, 103, 0.5)"
              : cls === "related_kind"
                ? "rgba(90, 200, 38, 0.8)"
                : cls === "distinct_kind"
                  ? "rgba(232, 168, 32, 0.8)"
                  : "rgba(114, 124, 103, 0.6)";
            return (
              <div key={cls} className="flex items-center gap-1.5">
                <div
                  style={{
                    height: "8px",
                    width: "8px",
                    borderRadius: "50%",
                    backgroundColor: dotColor,
                  }}
                />
                <span style={{ color }}>{classifyLabel(cls)}</span>
              </div>
            );
          },
        )}
        <div className="flex items-center gap-1.5">
          <div style={{ height: "8px", width: "8px", borderRadius: "50%", border: "1.5px solid var(--gold-bright)", backgroundColor: "transparent" }} />
          <span style={{ color: "var(--gold-bright)" }}>Speciated</span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={520}
          height={320}
          style={{
            width: "100%",
            borderRadius: "7px",
            border: `1px solid var(--border)`,
            backgroundColor: "var(--bg)",
            cursor: "crosshair",
            maxHeight: 320,
            display: "block"
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        />
        {hoveredNode && (
          <div style={{
            position: "absolute",
            left: "8px",
            bottom: "8px",
            borderRadius: "7px",
            border: `1px solid var(--border)`,
            backgroundColor: "rgba(245, 243, 235, 0.95)",
            padding: "12px",
            fontSize: "11px",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}>{hoveredNode.id}</div>
            <div style={{ marginTop: "4px", color: DIVERGENCE_COLORS[hoveredNode.classification] }}>
              {classifyLabel(hoveredNode.classification)} — divergence{" "}
              {hoveredNode.divergence.toFixed(3)}
            </div>
            {hoveredNode.isSpeciated && (
              <div style={{ marginTop: "4px", color: "var(--gold-bright)" }}>Speciated — Invariant Bridge active</div>
            )}
          </div>
        )}
      </div>

      {/* Peer list */}
      {divergenceMap.length > 0 && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {divergenceMap.map((d) => {
            const peerId =
              d.instance_a_id === instanceId ? d.instance_b_id : d.instance_a_id;
            const bgStyle = DIVERGENCE_BG[d.classification];
            return (
              <div
                key={`${d.instance_a_id}-${d.instance_b_id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "7px",
                  border: `1px solid ${bgStyle.border}`,
                  backgroundColor: bgStyle.bg,
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingTop: "6px",
                  paddingBottom: "6px",
                  fontSize: "11px",
                }}
              >
                <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{shortId(peerId)}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "var(--font-body)", color: DIVERGENCE_COLORS[d.classification] }}>
                    {d.overall.toFixed(3)}
                  </span>
                  <span style={{ color: DIVERGENCE_COLORS[d.classification] }}>
                    {classifyLabel(d.classification)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {divergenceMap.length === 0 && (
        <div style={{
          borderRadius: "7px",
          border: `1px solid var(--border)`,
          backgroundColor: "var(--bg)",
          paddingTop: "32px",
          paddingBottom: "32px",
          textAlign: "center",
          fontSize: "14px",
          color: "var(--ink-muted)",
        }}>
          No federation peers measured yet
        </div>
      )}
    </div>
  );
}

// ─── Tab: Triangulation Dashboard ────────────────────────────────

function TriangulationDashboard({
  stats,
  fragments,
}: {
  stats: NexusStatsResponse | null;
  fragments: NexusFragment[];
}) {
  const dist = stats?.epistemic_level_distribution ?? {};
  const maxCount = Math.max(1, ...Object.values(dist).map(Number));

  const levels: EpistemicLevel[] = [0, 1, 2, 3, 4];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="float-up float-up-1">
          <CardContent className="pt-4">
            <Metric
              label="Triangulation Weight"
              value={stats?.triangulation_weight != null ? stats.triangulation_weight.toFixed(3) : "—"}
              sub="0 = near-duplicate, 1 = maximally diverse"
            />
          </CardContent>
        </Card>
        <Card className="float-up float-up-2">
          <CardContent className="pt-4">
            <Metric
              label="Total Fragments"
              value={fmt((stats?.local_fragment_count ?? 0) + (stats?.remote_fragment_count ?? 0))}
              sub={`${stats?.local_fragment_count ?? 0} local · ${stats?.remote_fragment_count ?? 0} remote`}
            />
          </CardContent>
        </Card>
        <Card className="float-up float-up-3">
          <CardContent className="pt-4">
            <Metric
              label="Convergences"
              value={fmt(stats?.convergence_count)}
              sub="Independent arrivals"
            />
          </CardContent>
        </Card>
        <Card className="float-up float-up-4">
          <CardContent className="pt-4">
            <Metric
              label="Empirical Invariants"
              value={fmt(stats?.empirical_invariant_count)}
              sub="Level 4 — proven truth"
            />
          </CardContent>
        </Card>
      </div>

      {/* Epistemic level distribution */}
      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>◑ Epistemic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {levels.map((level) => {
              const count = Number(dist[String(level)] ?? 0);
              const barColor = EPISTEMIC_BAR[level];
              return (
                <div key={level} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <EpistemicBadge level={level} />
                  </div>
                  <div style={{ flex: 1, borderRadius: "9999px", backgroundColor: "var(--ink-muted)", height: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: barColor,
                        width: `${(count / maxCount) * 100}%`,
                        transition: "width 500ms ease-out",
                      }}
                    />
                  </div>
                  <div style={{ width: "32px", textAlign: "right", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--ink-mid)" }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* High-confidence fragments */}
      <Card className="float-up float-up-3">
        <CardHeader>
          <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>◎ High-Confidence Structures</CardTitle>
        </CardHeader>
        <CardContent>
          {fragments.length === 0 ? (
            <div style={{ paddingTop: "24px", paddingBottom: "24px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>No fragments above threshold</div>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {fragments.slice(0, 20).map((f) => (
                <div key={f.fragment_id} className="flex items-center gap-3 py-2">
                  <EpistemicBadge level={f.epistemic_level} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {f.domain_labels.slice(0, 3).map((d) => (
                        <span
                          key={d}
                          style={{
                            borderRadius: "6px",
                            backgroundColor: "rgba(90, 200, 38, 0.08)",
                            paddingLeft: "6px",
                            paddingRight: "6px",
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            fontSize: "10px",
                            color: "var(--ink-soft)",
                          }}
                        >
                          {d}
                        </span>
                      ))}
                      {f.domain_labels.length > 3 && (
                        <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>+{f.domain_labels.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "11px" }}>
                    <div style={{ fontFamily: "var(--font-body)", color: "var(--lime)" }}>
                      {pct(f.triangulation_confidence)}
                    </div>
                    <div style={{ color: "var(--ink-muted)" }}>{f.independent_source_count} sources</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Divergence Profile ──────────────────────────────────────

function DivergenceProfile({ profile }: { profile: NexusDivergenceProfileResponse | null }) {
  if (!profile) {
    return (
      <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>Loading divergence profile…</div>
    );
  }

  const dimensions: { key: keyof typeof profile.dimension_breakdown; label: string; weight: number }[] = [
    { key: "domain", label: "Domain diversity", weight: 0.25 },
    { key: "structural", label: "Structural diversity", weight: 0.30 },
    { key: "attentional", label: "Attentional diversity", weight: 0.20 },
    { key: "hypothesis", label: "Hypothesis diversity", weight: 0.15 },
    { key: "temporal", label: "Temporal divergence", weight: 0.10 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Weight + pressure */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="float-up float-up-1">
          <CardContent className="pt-4">
            <Metric
              label="Triangulation Weight"
              value={profile.triangulation_weight.toFixed(3)}
              sub="This instance's epistemic vote share"
            />
            <div className="mt-3">
              <div style={{ height: "8px", width: "100%", borderRadius: "9999px", backgroundColor: "var(--ink-muted)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: profile.triangulation_weight >= 0.6
                      ? "var(--lime)"
                      : profile.triangulation_weight >= 0.4
                        ? "var(--gold-bright)"
                        : "var(--ink-muted)",
                    transition: "background 500ms ease-out",
                    width: `${profile.triangulation_weight * 100}%`,
                  }}
                />
              </div>
              <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--ink-muted)" }}>
                {profile.triangulation_weight < 0.4
                  ? "Divergence pressure active"
                  : "Healthy contribution weight"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="float-up float-up-2" style={{ borderColor: profile.pressure_active ? "rgba(90, 200, 38, 0.2)" : undefined }}>
          <CardContent className="pt-4">
            <Metric
              label="Divergence Pressure"
              value={profile.pressure_active ? pct(profile.pressure_magnitude) : "Off"}
              sub={
                profile.pressure_active
                  ? "Signal sent to Thymos"
                  : "Weight above 0.4 threshold"
              }
            />
            {profile.pressure_active && (
              <div style={{ marginTop: "8px", borderRadius: "6px", backgroundColor: "rgba(90, 200, 38, 0.08)", paddingLeft: "8px", paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px", fontSize: "11px", color: "var(--lime)" }}>
                {profile.recommended_direction}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="float-up float-up-3">
          <CardContent className="pt-4">
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-muted)", marginBottom: "8px", fontFamily: "var(--font-body)", fontWeight: 600 }}>Instance</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--ink-mid)", wordBreak: "break-all" }}>{profile.instance_id}</div>
          </CardContent>
        </Card>
      </div>

      {/* 5D breakdown */}
      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>≡ Five Divergence Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dimensions.map(({ key, label, weight }) => {
            const score = profile.dimension_breakdown[key] ?? 0;
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between" style={{ fontSize: "11px" }}>
                  <span style={{ color: "var(--ink-soft)" }}>{label}</span>
                  <span style={{ color: "var(--ink-muted)" }}>weight {pct(weight, 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ flex: 1, borderRadius: "9999px", backgroundColor: "var(--ink-muted)", height: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "var(--lime)",
                        transition: "width 300ms ease-out",
                        width: `${score * 100}%`,
                      }}
                    />
                  </div>
                  <div style={{ width: "48px", textAlign: "right", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--ink-mid)" }}>
                    {score.toFixed(3)}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Domain frontier / saturation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--lime)" }}>⚡ Frontier Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginBottom: "8px" }}>
              Unexplored by the federation — high novelty value
            </div>
            {profile.frontier_domains.length === 0 ? (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>None identified</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.frontier_domains.map((d) => (
                  <span
                    key={d}
                    style={{
                      borderRadius: "9999px",
                      backgroundColor: "rgba(90, 200, 38, 0.1)",
                      border: "1px solid rgba(90, 200, 38, 0.2)",
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      fontSize: "11px",
                      color: "var(--lime)",
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--gold-bright)" }}>▣ Saturated Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginBottom: "8px" }}>
              Over-covered by federation — low marginal value
            </div>
            {profile.saturated_domains.length === 0 ? (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>None identified</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.saturated_domains.map((d) => (
                  <span
                    key={d}
                    style={{
                      borderRadius: "9999px",
                      backgroundColor: "rgba(232, 168, 32, 0.08)",
                      border: "1px solid rgba(232, 168, 32, 0.15)",
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      fontSize: "11px",
                      color: "var(--gold-bright)",
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Convergence Feed ────────────────────────────────────────

function ConvergenceFeed({
  convergences,
  liveEvents,
}: {
  convergences: NexusConvergence[];
  liveEvents: NexusConvergence[];
}) {
  const all = [...liveEvents, ...convergences].slice(0, 50);

  function confidenceTier(v: number): { label: string; color: string } {
    if (v >= 0.8) return { label: "High", color: "var(--lime-bright)" };
    if (v >= 0.6) return { label: "Medium", color: "var(--lime)" };
    return { label: "Low", color: "var(--ink-soft)" };
  }

  return (
    <div className="flex flex-col gap-3">
      {all.length === 0 && (
        <div style={{ borderRadius: "7px", border: `1px solid var(--border)`, backgroundColor: "var(--bg)", paddingTop: "48px", paddingBottom: "48px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>
          No convergences detected yet. Fragments are being compared as they arrive.
        </div>
      )}
      {all.map((c, i) => {
        const tier = confidenceTier(c.triangulation_value);
        const isHigh = c.triangulation_value >= 0.8;
        const isLive = i < liveEvents.length;
        return (
          <div
            key={`${c.fragment_a_id}-${c.fragment_b_id}-${c.detected_at}`}
            style={{
              borderRadius: "7px",
              border: `1px solid ${isHigh ? "rgba(90, 200, 38, 0.2)" : "var(--border)"}`,
              backgroundColor: isHigh ? "rgba(90, 200, 38, 0.05)" : "var(--bg)",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "12px",
              paddingBottom: "12px",
              transition: "all 200ms",
              opacity: isLive ? 0.95 : 1,
            }}
            className={isLive ? "float-up" : ""}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isHigh && (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(90, 200, 38, 0.15)",
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--lime)",
                    }}>
                      <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "var(--lime)" }} className={isLive ? "spore-ping" : ""} />
                      SIGNIFICANT
                    </span>
                  )}
                  {isLive && (
                    <span style={{ fontSize: "10px", color: "var(--lime)", fontWeight: 500 }}>LIVE</span>
                  )}
                  <span style={{ fontSize: "11px", fontWeight: 600, color: tier.color }}>
                    {tier.label} confidence
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{relTime(c.detected_at)}</span>
                </div>
                <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "16px 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                  <span>
                    Source A:{" "}
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{shortId(c.source_a_instance_id)}</span>
                  </span>
                  <span>
                    Source B:{" "}
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{shortId(c.source_b_instance_id)}</span>
                  </span>
                  <span>
                    Domain independent:{" "}
                    <span style={{ color: c.domains_are_independent ? "var(--lime)" : "var(--ink-muted)" }}>
                      {c.domains_are_independent ? "yes" : "no"}
                    </span>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "18px", color: "var(--ink)" }}>
                  {pct(c.triangulation_value)}
                </div>
                <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>triangulation value</div>
              </div>
            </div>
            <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "10px", color: "var(--ink-soft)" }}>
              <span>
                Convergence:{" "}
                <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{c.convergence_score.toFixed(3)}</span>
              </span>
              <span>
                Source diversity:{" "}
                <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{c.source_diversity.toFixed(3)}</span>
              </span>
              <span>
                Matched nodes:{" "}
                <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>
                  {c.matched_nodes}/{Math.max(c.total_nodes_a, c.total_nodes_b)}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Speciation Events ───────────────────────────────────────

function SpeciationTimeline({ data }: { data: NexusSpeciationResponse | null }) {
  if (!data) {
    return <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>Loading speciation data…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <Metric label="Speciation Events" value={fmt(data.total_events)} sub="Divergence ≥ 0.8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Metric
              label="Cognitive Kinds"
              value={fmt(data.cognitive_kinds.length)}
              sub="Distinct lineages"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Metric
              label="Active Bridges"
              value={fmt(data.active_bridge_pairs.length)}
              sub="Invariant Bridge pairs"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Metric
              label="Shared Invariants"
              value={fmt(
                data.speciation_events.reduce((s, e) => s + e.shared_invariant_count, 0),
              )}
              sub="Across Invariant Bridge"
            />
          </CardContent>
        </Card>
      </div>

      {/* Speciation event timeline */}
      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>◈ Speciation Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {data.speciation_events.length === 0 ? (
            <div style={{ paddingTop: "24px", paddingBottom: "24px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>
              No speciation events recorded
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {data.speciation_events.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    borderBottom: `1px solid var(--border)`,
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  }}
                  className="last:border-0"
                >
                  {/* Timeline dot */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "4px" }}>
                    <div style={{
                      height: "12px",
                      width: "12px",
                      borderRadius: "50%",
                      backgroundColor: "var(--gold-bright)",
                      boxShadow: "0 0 8px rgba(232, 168, 32, 0.4)",
                    }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--ink)" }}>
                        {shortId(e.instance_a_id)} ↔ {shortId(e.instance_b_id)}
                      </span>
                      {e.new_cognitive_kind_registered && (
                        <span style={{
                          borderRadius: "9999px",
                          backgroundColor: "rgba(232, 168, 32, 0.12)",
                          paddingLeft: "8px",
                          paddingRight: "8px",
                          paddingTop: "4px",
                          paddingBottom: "4px",
                          fontSize: "10px",
                          color: "var(--gold-bright)",
                        }}>
                          New cognitive kind
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "16px 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                      <span>
                        Divergence:{" "}
                        <span style={{ fontFamily: "var(--font-body)", color: "var(--gold-bright)" }}>
                          {e.divergence_score.toFixed(3)}
                        </span>
                      </span>
                      <span>
                        Shared invariants:{" "}
                        <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{e.shared_invariant_count}</span>
                      </span>
                      <span>
                        Incompatible schemas:{" "}
                        <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{e.incompatible_schema_count}</span>
                      </span>
                      <span style={{ color: "var(--ink-muted)" }}>{relTime(e.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invariant Bridge note */}
      {data.active_bridge_pairs.length > 0 && (
        <Card className="float-up float-up-3" style={{ borderColor: "rgba(232, 168, 32, 0.15)" }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--gold-bright)" }}>⚡ Invariant Bridge</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ marginBottom: "12px", fontSize: "11px", color: "var(--ink-soft)" }}>
              Post-speciation sharing is blocked for regular fragments. Only ultra-abstract
              causal invariants cross the bridge.
            </div>
            <div className="flex flex-col gap-1.5">
              {data.active_bridge_pairs.map(([a, b]) => (
                <div
                  key={`${a}-${b}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "7px",
                    border: `1px solid rgba(232, 168, 32, 0.12)`,
                    backgroundColor: "rgba(232, 168, 32, 0.04)",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "var(--gold-bright)" }} />
                  <span style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}>{shortId(a)}</span>
                  <span style={{ color: "var(--ink-muted)" }}>↔</span>
                  <span style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}>{shortId(b)}</span>
                  <span style={{ marginLeft: "auto", color: "var(--ink-muted)" }}>Causal invariants only</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cognitive kinds */}
      {data.cognitive_kinds.length > 0 && (
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>◉ Cognitive Kinds Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {data.cognitive_kinds.map((k) => (
                <div
                  key={k.kind_id}
                  style={{
                    borderRadius: "7px",
                    border: `1px solid var(--border)`,
                    backgroundColor: "var(--bg)",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    fontSize: "11px",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{shortId(k.kind_id)}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{relTime(k.established_at)}</span>
                  </div>
                  <div style={{ marginTop: "4px", color: "var(--ink-soft)" }}>
                    {k.member_instance_ids.length} member
                    {k.member_instance_ids.length !== 1 ? "s" : ""}:{" "}
                    {k.member_instance_ids.map((id) => shortId(id)).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Ground Truth Pipeline ───────────────────────────────────

function GroundTruthPipeline({
  data,
  onEvaluate,
  evaluating,
  lastDecisions,
}: {
  data: NexusGroundTruthResponse | null;
  onEvaluate: () => void;
  evaluating: boolean;
  lastDecisions: NexusPromotionDecision[];
}) {
  if (!data) {
    return (
      <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center", fontSize: "14px", color: "var(--ink-muted)" }}>
        Loading ground truth pipeline…
      </div>
    );
  }

  const stats = data.pipeline_stats;
  const pipelineRows: { level: EpistemicLevel; count: number; label: string }[] = [
    { level: 0, count: stats.level_0_count, label: "Hypothesis" },
    { level: 1, count: stats.level_1_count, label: "Corroborated" },
    { level: 2, count: stats.level_2_count, label: "Triangulated" },
    { level: 3, count: stats.level_3_count, label: "Ground Truth Candidate" },
    { level: 4, count: stats.level_4_count, label: "Empirical Invariant" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline funnel */}
      <Card className="float-up float-up-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>↑ Promotion Pipeline</CardTitle>
            <button
              onClick={onEvaluate}
              disabled={evaluating}
              style={{
                borderRadius: "7px",
                border: `1px solid var(--border)`,
                backgroundColor: "var(--bg)",
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "6px",
                paddingBottom: "6px",
                fontSize: "12px",
                color: "var(--ink-mid)",
                transition: "all 200ms",
                cursor: evaluating ? "not-allowed" : "pointer",
                opacity: evaluating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => !evaluating && (e.currentTarget.style.backgroundColor = "rgba(90, 200, 38, 0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")}
            >
              {evaluating ? "Evaluating…" : "Evaluate Now"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {pipelineRows.map(({ level, count, label }) => {
              const isInvariant = level === 4;
              return (
                <div
                  key={level}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "7px",
                    border: `1px solid ${isInvariant ? "rgba(90, 200, 38, 0.15)" : "var(--border)"}`,
                    backgroundColor: isInvariant ? "rgba(90, 200, 38, 0.05)" : "var(--bg)",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  }}
                >
                  <div style={{ width: "16px", textAlign: "center", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--ink-muted)" }}>L{level}</div>
                  <div className="flex-1">
                    <div style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: isInvariant ? "var(--lime-bright)" : "var(--ink)",
                    }}>
                      {label}
                    </div>
                    {isInvariant && (
                      <div style={{ fontSize: "10px", color: "var(--lime)" }}>
                        Constitutional protection via Equor · Oneiros adversarial · Evo competition
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "24px",
                    fontWeight: 600,
                    color: isInvariant ? "var(--lime-bright)" : "var(--ink)",
                  }}>
                    {count}
                  </div>
                  {isInvariant && count > 0 && (
                    <div style={{
                      height: "8px",
                      width: "8px",
                      borderRadius: "50%",
                      backgroundColor: "var(--lime-bright)",
                      boxShadow: "0 0 6px rgba(120, 224, 58, 0.6)",
                    }} className="spore-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level 4 invariants — the most important display */}
      {data.empirical_invariants.length > 0 && (
        <Card className="float-up float-up-2" style={{ borderColor: "rgba(90, 200, 38, 0.15)" }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--lime-bright)" }}>
              ⚡ Empirical Invariants{" "}
              <span style={{
                marginLeft: "8px",
                borderRadius: "9999px",
                backgroundColor: "rgba(90, 200, 38, 0.12)",
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "4px",
                paddingBottom: "4px",
                fontSize: "12px",
                color: "var(--lime)",
              }}>
                {data.empirical_invariants.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ marginBottom: "12px", fontSize: "11px", color: "var(--ink-soft)" }}>
              These structures survived adversarial testing, hypothesis competition, and
              speciation bridge traversal. They are the closest thing to proven truth this
              system has.
            </div>
            <div className="flex flex-col gap-3">
              {data.empirical_invariants.map((f) => (
                <div
                  key={f.fragment_id}
                  style={{
                    borderRadius: "7px",
                    border: `1px solid rgba(90, 200, 38, 0.15)`,
                    backgroundColor: "rgba(90, 200, 38, 0.03)",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {f.domain_labels.map((d) => (
                          <span
                            key={d}
                            style={{
                              borderRadius: "6px",
                              backgroundColor: "rgba(90, 200, 38, 0.1)",
                              paddingLeft: "6px",
                              paddingRight: "6px",
                              paddingTop: "4px",
                              paddingBottom: "4px",
                              fontSize: "10px",
                              color: "var(--lime)",
                            }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                        {f.independent_source_count} independent sources ·{" "}
                        {pct(f.source_diversity_score)} diversity ·
                        confirmed {relTime(f.last_confirmed_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "18px", color: "var(--lime-bright)" }}>
                        {pct(f.triangulation_confidence)}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>confidence</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ground truth candidates (level 3) */}
      {data.ground_truth_candidates.filter((f) => f.epistemic_level === 3).length > 0 && (
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--gold-bright)" }}>◑ Ground Truth Candidates (L3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginBottom: "12px" }}>
              Awaiting Oneiros adversarial test and Evo competition for Level 4 promotion.
            </div>
            <div className="flex flex-col gap-2">
              {data.ground_truth_candidates
                .filter((f) => f.epistemic_level === 3)
                .map((f) => (
                  <div
                    key={f.fragment_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      borderRadius: "7px",
                      border: `1px solid rgba(232, 168, 32, 0.12)`,
                      backgroundColor: "rgba(232, 168, 32, 0.03)",
                      paddingLeft: "12px",
                      paddingRight: "12px",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {f.domain_labels.slice(0, 4).map((d) => (
                          <span
                            key={d}
                            style={{
                              borderRadius: "6px",
                              backgroundColor: "rgba(232, 168, 32, 0.1)",
                              paddingLeft: "6px",
                              paddingRight: "6px",
                              paddingTop: "4px",
                              paddingBottom: "4px",
                              fontSize: "10px",
                              color: "var(--gold-bright)",
                            }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px" }}>
                      <div style={{ fontFamily: "var(--font-body)", color: "var(--gold-bright)" }}>
                        {pct(f.triangulation_confidence)}
                      </div>
                      <div style={{ color: "var(--ink-muted)" }}>{f.independent_source_count} src</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent promotion decisions */}
      {lastDecisions.length > 0 && (
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>↑ Recent Promotion Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {lastDecisions.map((d) => (
                <div key={d.fragment_id} className="flex items-start gap-3 py-2">
                  <div style={{
                    marginTop: "4px",
                    height: "6px",
                    width: "6px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: d.promoted ? "var(--lime)" : "var(--ink-muted)",
                  }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: "11px" }}>
                      <span style={{
                        color: d.promoted ? "var(--lime)" : "var(--ink-muted)",
                      }}>
                        {d.promoted
                          ? `Promoted L${d.current_level} → L${d.proposed_level}`
                          : `Stayed at L${d.current_level}`}
                      </span>
                      {" · "}
                      <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}>
                        {shortId(d.fragment_id)}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--ink-muted)", marginTop: "4px" }}>{d.reason}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "11px", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>
                      {pct(d.triangulation_confidence)}
                    </div>
                    <div style={{ color: "var(--ink-muted)" }}>{d.independent_source_count} src</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function NexusPage() {
  useAliveSocket();

  const [tab, setTab] = useState<Tab>("federation");
  const [liveConvergences, setLiveConvergences] = useState<NexusConvergence[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [lastDecisions, setLastDecisions] = useState<NexusPromotionDecision[]>([]);

  // Data fetching
  const { data: stats } = useApi(() => api.nexusStats(), { intervalMs: 5000 });
  const { data: fragmentsResp } = useApi(
    () => api.nexusFragments({ min_confidence: 0.3, limit: 50 }),
    { intervalMs: 10000 },
  );
  const { data: convergencesResp } = useApi(
    () => api.nexusConvergences(50),
    { intervalMs: 5000 },
  );
  const { data: divergenceMap } = useApi(() => api.nexusDivergences(), { intervalMs: 15000 });
  const { data: divergenceProfile } = useApi(
    () => api.nexusDivergenceProfile(),
    { intervalMs: 10000 },
  );
  const { data: speciationData } = useApi(
    () => api.nexusSpeciation(),
    { intervalMs: 15000 },
  );
  const { data: groundTruth } = useApi(
    () => api.nexusGroundTruth(),
    { intervalMs: 10000 },
  );

  // Live Synapse events — watch for Nexus events
  const synapseEvent = useAliveStore((s) => s.lastSynapseEvent);
  const prevEventRef = useRef<string | null>(null);

  useEffect(() => {
    if (!synapseEvent) return;
    const key = `${synapseEvent.type}-${synapseEvent.id ?? ""}`;
    if (key === prevEventRef.current) return;
    prevEventRef.current = key;

    if (synapseEvent.type === "CONVERGENCE_DETECTED" && synapseEvent.data) {
      const d = synapseEvent.data as Record<string, unknown>;
      const c: NexusConvergence = {
        fragment_a_id: String(d.fragment_a_id ?? ""),
        fragment_b_id: String(d.fragment_b_id ?? ""),
        convergence_score: Number(d.convergence_score ?? 0),
        source_a_instance_id: String(d.source_a_instance_id ?? ""),
        source_b_instance_id: String(d.source_b_instance_id ?? ""),
        source_diversity: Number(d.source_diversity ?? 0),
        triangulation_value: Number(d.triangulation_value ?? 0),
        domains_are_independent: Boolean(d.domains_are_independent ?? false),
        detected_at: String(d.detected_at ?? new Date().toISOString()),
        matched_nodes: Number(d.matched_nodes ?? 0),
        total_nodes_a: Number(d.total_nodes_a ?? 0),
        total_nodes_b: Number(d.total_nodes_b ?? 0),
      };
      setLiveConvergences((prev) => [c, ...prev].slice(0, 20));
    }
  }, [synapseEvent]);

  const handleEvaluate = useCallback(async () => {
    setEvaluating(true);
    try {
      const result = await api.nexusEvaluatePromotions();
      setLastDecisions(result.decisions.slice(0, 10));
    } finally {
      setEvaluating(false);
    }
  }, []);

  const instanceId = stats?.instance_id ?? divergenceProfile?.instance_id ?? "this-instance";
  const fragments = fragmentsResp?.fragments ?? [];
  const convergences = convergencesResp?.convergences ?? [];
  const divergenceScores = divergenceMap?.divergences ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nexus"
        description="Epistemic Triangulation — federated ground truth discovery through convergence across maximally diverse compression paths"
      />

      {/* Weight indicator */}
      {stats && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          borderRadius: "7px",
          border: `1px solid var(--border)`,
          backgroundColor: "var(--bg)",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "12px",
          paddingBottom: "12px",
        }}>
          <WeightBar value={stats.triangulation_weight} label="Vote weight" />
          <div style={{ display: "flex", gap: "16px", fontSize: "11px" }}>
            <span style={{ color: "var(--ink-soft)" }}>
              <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{stats.local_fragment_count}</span> local fragments
            </span>
            <span style={{ color: "var(--ink-soft)" }}>
              <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-mid)" }}>{stats.convergence_count}</span> convergences
            </span>
            <span style={{ color: "var(--ink-soft)" }}>
              <span style={{ fontFamily: "var(--font-body)", color: "var(--lime-bright)" }}>{stats.empirical_invariant_count}</span> invariants
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              borderRadius: "7px",
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingTop: "6px",
              paddingBottom: "6px",
              fontSize: "14px",
              whiteSpace: "nowrap",
              transition: "all 100ms",
              border: "none",
              backgroundColor: tab === t ? "var(--bg)" : "transparent",
              color: tab === t ? "var(--ink)" : "var(--ink-soft)",
              fontWeight: tab === t ? 500 : 400,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => tab !== t && (e.currentTarget.style.color = "var(--ink-mid)")}
            onMouseLeave={(e) => tab !== t && (e.currentTarget.style.color = "var(--ink-soft)")}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "federation" && (
          <FederationMap
            divergenceMap={divergenceScores}
            speciationData={speciationData ?? null}
            instanceId={instanceId}
          />
        )}
        {tab === "triangulation" && (
          <TriangulationDashboard stats={stats ?? null} fragments={fragments} />
        )}
        {tab === "divergence" && <DivergenceProfile profile={divergenceProfile ?? null} />}
        {tab === "convergence" && (
          <ConvergenceFeed convergences={convergences} liveEvents={liveConvergences} />
        )}
        {tab === "speciation" && <SpeciationTimeline data={speciationData ?? null} />}
        {tab === "ground-truth" && (
          <GroundTruthPipeline
            data={groundTruth ?? null}
            onEvaluate={handleEvaluate}
            evaluating={evaluating}
            lastDecisions={lastDecisions}
          />
        )}
      </div>
    </div>
  );
}
