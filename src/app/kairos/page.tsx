"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type KairosHealthResponse,
  type KairosInvariant,
  type KairosInvariantsResponse,
  type KairosLedgerResponse,
  type KairosCandidatesResponse,
  type KairosDirectionsResponse,
  type KairosConfounderResponse,
  type KairosTier3Response,
  type KairosCounterInvariantResponse,
  type KairosStepChangesResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { pct, fmtBits, relTime } from "@/lib/formatters";

// ─── Constants ───────────────────────────────────────────────────

const STAGE_LABELS = [
  { key: "correlation_mining",    label: "Correlation Mining",    desc: "Cross-context correlations mined",          color: "#5eead4" },
  { key: "causal_direction",      label: "Causal Direction",      desc: "Direction tested (3 independent methods)",  color: "#a78bfa" },
  { key: "confounder_analysis",   label: "Confounder Analysis",   desc: "PC algorithm eliminates spurious links",    color: "#f59e0b" },
  { key: "mechanism_extraction",  label: "Mechanism Extraction",  desc: "Causal rule + mechanism description",       color: "#f472b6" },
  { key: "context_invariance",    label: "Context Invariance",    desc: "Hold rate tested across 5+ contexts",      color: "#818cf8" },
  { key: "invariant_distillation",label: "Invariant Distillation", desc: "Abstract form, minimality, tautology check", color: "#34d399" },
  { key: "domain_mapping",        label: "Domain Mapping",        desc: "Free predictions — untested domains",       color: "#fb7185" },
];

const TIER_COLORS: Record<number, string> = {
  1: "#5eead4",  // teal — context-specific
  2: "#818cf8",  // indigo — cross-context
  3: "#f59e0b",  // gold — substrate-independent
};

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 · Domain Rule",
  2: "Tier 2 · Cross-Domain",
  3: "Tier 3 · Invariant",
};

const SUBSTRATE_COLORS: Record<string, string> = {
  physical:      "#5eead4",
  biological:    "#34d399",
  computational: "#818cf8",
  social:        "#f472b6",
  economic:      "#f59e0b",
};

// ─── Helpers ─────────────────────────────────────────────────────

function fmt2(v: number | undefined | null) { return (v ?? 0).toFixed(2); }

function directionBadge(dir: string): "success" | "info" | "warning" | "muted" {
  if (dir === "A_causes_B" || dir === "B_causes_A") return "success";
  if (dir === "bidirectional") return "warning";
  return "muted";
}

function holdRateVariant(r: number): "success" | "warning" | "danger" | "muted" {
  if (r >= 0.95) return "success";
  if (r >= 0.75) return "warning";
  if (r >= 0.5) return "danger";
  return "muted";
}

// ─── Mining Pipeline Funnel ───────────────────────────────────────

function MiningPipeline({ health }: { health: KairosHealthResponse }) {
  const s = health.stages ?? {};

  // Build counts per stage in order (approximated from available stats)
  const stages: { label: string; desc: string; count: number; symbol: string; color: string }[] = [
    {
      label: "Correlation Mining",
      desc: "Cross-context correlations evaluated",
      count: s.correlation_miner?.total_pairs_evaluated ?? 0,
      symbol: "◉",
      color: "var(--lime)",
    },
    {
      label: "Causal Direction",
      desc: "Direction tests run",
      count: s.direction_tester?.total_tests_run ?? 0,
      symbol: "↑",
      color: "#a78bfa",
    },
    {
      label: "Confounder Analysis",
      desc: "Analyses run (most die here)",
      count: s.confounder_analyzer?.total_analyses_run ?? 0,
      symbol: "◈",
      color: "var(--gold-bright)",
    },
    {
      label: "Context Invariance",
      desc: "Invariance tests run",
      count: s.context_tester?.total_tests_run ?? 0,
      symbol: "≡",
      color: "#34d399",
    },
    {
      label: "Distillation",
      desc: "Distillations run",
      count: s.distiller?.total_distillations_run ?? 0,
      symbol: "◎",
      color: "#818cf8",
    },
    {
      label: "Counter-Invariant Scan",
      desc: "Scans for boundary conditions",
      count: s.counter_detector?.total_scans_run ?? 0,
      symbol: "◑",
      color: "#34d399",
    },
    {
      label: "Invariants Survived",
      desc: "Surviving causal invariants",
      count: health.invariants_created,
      symbol: "⚡",
      color: "var(--lime-bright)",
    },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card className="float-up float-up-1">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>◉ Mining Pipeline</CardTitle>
        <Badge variant="muted" className="font-mono text-[10px]">
          {health.pipeline_runs} run{health.pipeline_runs !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {stages.map((stage, i) => {
            const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const survivalPct = i > 0 && stages[0].count > 0
              ? (stage.count / stages[0].count) * 100
              : 100;
            return (
              <div key={stage.label} style={{ animation: `float-up 0.5s ease-out ${i * 0.08}s both` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: stage.color,
                        fontFamily: "var(--font-display)",
                        fontSize: "11px",
                        fontWeight: "600"
                      }}
                    >
                      {stage.symbol}
                    </span>
                    <span style={{
                      color: "var(--ink-strong)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {i > 0 && (
                      <span style={{
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)",
                        fontSize: "10px"
                      }}>
                        {survivalPct.toFixed(1)}% survive
                      </span>
                    )}
                    <span style={{
                      color: "var(--ink-mid)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}>
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div style={{
                  position: "relative",
                  height: "6px",
                  background: "var(--border)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      borderRadius: "3px",
                      background: stage.color,
                      width: `${barPct}%`,
                      transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: 0.8
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline insight */}
        <div style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border)",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-prose)",
          fontSize: "10px",
          lineHeight: "1.5"
        }}>
          Most correlations collapse at stage 3 (confounder analysis). Reaching stage 5+ signals genuine causality.
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Causal Hierarchy ─────────────────────────────────────────────

function CausalHierarchyCard({ health }: { health: KairosHealthResponse }) {
  const h = health.hierarchy;
  const total = Math.max(h.total_count, 1);

  const tiers = [
    {
      tier: 3,
      label: "Tier 3 · Causal Invariants",
      sublabel: "Context-invariant · Substrate-independent",
      symbol: "◈",
      count: h.tier3_count,
      color: "var(--gold-bright)",
    },
    {
      tier: 2,
      label: "Tier 2 · Cross-Context Rules",
      sublabel: "Holds across 2+ distinct domains",
      symbol: "≡",
      count: h.tier2_count,
      color: "#818cf8",
    },
    {
      tier: 1,
      label: "Tier 1 · Domain Rules",
      sublabel: "Context-specific causal rules",
      symbol: "◉",
      count: h.tier1_count,
      color: "var(--lime)",
    },
  ];

  return (
    <Card className="float-up float-up-2">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>▣ Causal Hierarchy</CardTitle>
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          color: "var(--ink-muted)",
          fontWeight: "500"
        }}>
          {h.total_count} total
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tiers.map((t, idx) => (
            <div key={t.tier} style={{ animation: `float-up 0.5s ease-out ${0.16 + idx * 0.08}s both` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{
                      color: t.color,
                      fontFamily: "var(--font-display)",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      {t.symbol}
                    </span>
                    <span style={{
                      color: "var(--ink-strong)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}>
                      {t.label}
                    </span>
                  </div>
                  <p style={{
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-prose)",
                    fontSize: "10px",
                    marginTop: "4px",
                    lineHeight: "1.4"
                  }}>
                    {t.sublabel}
                  </p>
                </div>
                <span style={{
                  color: t.color,
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginLeft: "16px",
                  flexShrink: 0
                }}>
                  {t.count}
                </span>
              </div>
              <div style={{
                height: "7px",
                background: "var(--border)",
                borderRadius: "3.5px",
                overflow: "hidden"
              }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: "3.5px",
                    background: t.color,
                    width: `${(t.count / total) * 100}%`,
                    transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    opacity: 0.7
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Metric grid */}
        <div style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }}>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Intelligence Ratio
            </p>
            <p style={{
              color: "var(--lime-bright)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              {fmt2(health.intelligence_ledger.current_intelligence_ratio)}
            </p>
          </div>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Observations
            </p>
            <p style={{
              color: "var(--ink-strong)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              {health.intelligence_ledger.total_observations_covered.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Tier 3 Found
            </p>
            <p style={{
              color: "var(--gold-bright)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              {health.tier3_discoveries}
            </p>
          </div>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Step Changes
            </p>
            <p style={{
              color: "#818cf8",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              {health.step_changes}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Active Mining Feed ───────────────────────────────────────────

function ActiveMiningFeed({
  candidates,
  directions,
  confounders,
}: {
  candidates: KairosCandidatesResponse | null;
  directions: KairosDirectionsResponse | null;
  confounders: KairosConfounderResponse | null;
}) {
  return (
    <Card className="float-up float-up-3 cell-breathe">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>⚡ Active Mining</CardTitle>
        <Badge variant="success" pulse>live</Badge>
      </CardHeader>
      <CardContent style={{ padding: 0 }}>
        {/* Correlation candidates */}
        <div style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--border)"
        }}>
          <p style={{
            color: "var(--ink-strong)",
            fontFamily: "var(--font-body)",
            fontSize: "9px",
            fontWeight: "500",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}>
            ◉ Stage 1 · Candidates
          </p>
          <div className="space-y-1.5">
            {candidates?.candidates.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{
                    color: "var(--lime)",
                    fontFamily: "var(--font-body)",
                    fontSize: "11px",
                    fontWeight: "500"
                  }}>
                    {c.variable_a}
                  </span>
                  <span style={{
                    color: "var(--ink-muted)",
                    fontSize: "10px"
                  }}>
                    ↔
                  </span>
                  <span style={{
                    color: "var(--lime)",
                    fontFamily: "var(--font-body)",
                    fontSize: "11px",
                    fontWeight: "500"
                  }}>
                    {c.variable_b}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-body)",
                    fontSize: "10px"
                  }}>
                    r={fmt2(c.mean_correlation)}
                  </span>
                  <span style={{
                    color: "var(--ink-muted)",
                    fontSize: "10px"
                  }}>
                    {c.context_count} ctx
                  </span>
                </div>
              </div>
            ))}
            {(!candidates?.candidates?.length) && (
              <p style={{
                color: "var(--ink-soft)",
                fontFamily: "var(--font-prose)",
                fontSize: "11px",
                fontStyle: "italic"
              }}>
                No candidates yet
              </p>
            )}
          </div>
        </div>

        {/* Direction results */}
        <div style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--border)"
        }}>
          <p style={{
            color: "var(--ink-strong)",
            fontFamily: "var(--font-body)",
            fontSize: "9px",
            fontWeight: "500",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}>
            ↑ Stage 2 · Direction
          </p>
          <div className="space-y-1.5">
            {(directions?.results ?? []).filter((r) => r.accepted).slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{
                    color: "#818cf8",
                    fontFamily: "var(--font-body)",
                    fontSize: "11px",
                    fontWeight: "500"
                  }}>
                    {r.cause}
                  </span>
                  <span style={{
                    color: "var(--ink-muted)",
                    fontSize: "10px"
                  }}>
                    →
                  </span>
                  <span style={{
                    color: "#818cf8",
                    fontFamily: "var(--font-body)",
                    fontSize: "11px",
                    fontWeight: "500"
                  }}>
                    {r.effect}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={directionBadge(r.direction)} className="text-[9px]">
                    {r.direction.replace(/_/g, " ")}
                  </Badge>
                  <span style={{
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-body)",
                    fontSize: "10px"
                  }}>
                    {pct(r.confidence)}
                  </span>
                </div>
              </div>
            ))}
            {(!(directions?.results ?? []).filter((r) => r.accepted).length) && (
              <p style={{
                color: "var(--ink-soft)",
                fontFamily: "var(--font-prose)",
                fontSize: "11px",
                fontStyle: "italic"
              }}>
                No accepted directions yet
              </p>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "10px"
            }}>
              {directions?.total_tests_run ?? 0} tests
            </span>
            <span style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "10px"
            }}>
              {directions?.total_accepted ?? 0} accepted
            </span>
          </div>
        </div>

        {/* Confounder analysis */}
        <div style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "12px",
          paddingBottom: "12px"
        }}>
          <p style={{
            color: "var(--ink-strong)",
            fontFamily: "var(--font-body)",
            fontSize: "9px",
            fontWeight: "500",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}>
            ◈ Stage 3 · Confounders
          </p>
          <div className="space-y-1.5">
            {(confounders?.results ?? []).filter((r) => r.is_confounded).slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{
                      color: "var(--gold-bright)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}>
                      {r.original_cause}
                    </span>
                    <span style={{
                      color: "var(--ink-muted)",
                      fontSize: "10px"
                    }}>
                      ↔
                    </span>
                    <span style={{
                      color: "var(--gold-bright)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}>
                      {r.original_effect}
                    </span>
                  </div>
                  <p style={{
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-prose)",
                    fontSize: "10px",
                    marginTop: "4px",
                    lineHeight: "1.4"
                  }}>
                    Confounders: {r.confounders.slice(0, 3).join(", ")}
                    {r.confounders.length > 3 ? ` +${r.confounders.length - 3}` : ""}
                  </p>
                </div>
                <Badge variant="warning" className="text-[9px] shrink-0">spurious</Badge>
              </div>
            ))}
            {(!(confounders?.results ?? []).filter((r) => r.is_confounded).length) && (
              <p style={{
                color: "var(--ink-soft)",
                fontFamily: "var(--font-prose)",
                fontSize: "11px",
                fontStyle: "italic"
              }}>
                No confounders found yet
              </p>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "10px"
            }}>
              {confounders?.total_analyses_run ?? 0} analysed
            </span>
            <span style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "10px"
            }}>
              {confounders?.total_confounders_found ?? 0} found
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Invariant Row ────────────────────────────────────────────────

function InvariantRow({
  inv,
  selected,
  onSelect,
}: {
  inv: KairosInvariant;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const color = TIER_COLORS[inv.tier];

  return (
    <div
      className={cn(
        "border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors",
        selected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
      )}
      onClick={() => onSelect(inv.id)}
    >
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color, background: `${color}18` }}
            >
              T{inv.tier}
            </span>
            <span className="text-[11px] text-white/70 font-mono truncate">
              {inv.abstract_form || inv.id.slice(0, 40)}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-white/35">
              {inv.domain_count} domain{inv.domain_count !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-white/35">
              {inv.substrate_count} substrate{inv.substrate_count !== 1 ? "s" : ""}
            </span>
            {inv.untested_domains.length > 0 && (
              <span className="text-[10px] text-emerald-400/70">
                {inv.untested_domains.length} free prediction{inv.untested_domains.length !== 1 ? "s" : ""}
              </span>
            )}
            {inv.violation_count > 0 && (
              <span className="text-[10px] text-amber-400/70">
                {inv.violation_count} violation{inv.violation_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={holdRateVariant(inv.invariance_hold_rate)} className="text-[9px] font-mono">
            {pct(inv.invariance_hold_rate)} hold
          </Badge>
          <span className="text-[10px] text-white/40 font-mono tabular-nums">
            Δ{fmt2(inv.intelligence_ratio_contribution)}
          </span>
        </div>
        <ChevronRight
          className={cn("w-3.5 h-3.5 text-white/20 shrink-0 transition-transform mt-0.5", selected && "rotate-90")}
        />
      </div>
    </div>
  );
}

// ─── Invariant Detail Panel ───────────────────────────────────────

function InvariantDetail({ inv }: { inv: KairosInvariant }) {
  const color = TIER_COLORS[inv.tier];

  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Abstract form */}
      <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
        <p className="text-[10px] text-white/35 mb-1">Abstract Form</p>
        <p className="text-sm font-mono text-white/80 leading-relaxed">
          {inv.abstract_form || <span className="italic text-white/30">Not yet distilled</span>}
        </p>
        {inv.refined_scope && (
          <p className="text-[10px] text-amber-400/70 mt-2">
            Scope refined: {inv.refined_scope}
          </p>
        )}
      </div>

      {/* Variable roles */}
      {Object.keys(inv.variable_roles).length > 0 && (
        <div>
          <p className="text-[10px] text-white/35 mb-2 uppercase tracking-wider">Variable Roles</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(inv.variable_roles).map(([concrete, abstract]) => (
              <div
                key={concrete}
                className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1"
              >
                <span className="text-[10px] text-white/50 font-mono">{concrete}</span>
                <span className="text-white/20 text-[10px]">→</span>
                <span className="text-[10px] font-mono" style={{ color }}>
                  {abstract}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domains */}
      <div>
        <p className="text-[10px] text-white/35 mb-2 uppercase tracking-wider">Applicable Domains</p>
        <div className="space-y-1.5">
          {inv.applicable_domains.map((d) => (
            <div key={d.domain} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: SUBSTRATE_COLORS[d.substrate] ?? "#ffffff40" }}
                />
                <span className="text-[11px] text-white/60 font-mono">{d.domain}</span>
                <span className="text-[10px] text-white/30">{d.substrate}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.hold_rate * 100}%`,
                      background: SUBSTRATE_COLORS[d.substrate] ?? "#ffffff40",
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/40 font-mono w-10 text-right">
                  {pct(d.hold_rate)}
                </span>
              </div>
            </div>
          ))}
          {inv.applicable_domains.length === 0 && (
            <p className="text-[11px] text-white/25 italic">No domains recorded</p>
          )}
        </div>
      </div>

      {/* Free predictions (untested domains) */}
      {inv.untested_domains.length > 0 && (
        <div>
          <p className="text-[10px] text-emerald-400/70 mb-2 uppercase tracking-wider">
            Free Predictions · Untested Domains
          </p>
          <div className="flex flex-wrap gap-1.5">
            {inv.untested_domains.map((d) => (
              <span
                key={d}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/[0.08] text-emerald-400/70 border border-emerald-500/10"
              >
                {d}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-1.5">
            These domains have not been tested — the invariant predicts the same causal
            structure holds there for free.
          </p>
        </div>
      )}

      {/* Scope conditions */}
      {inv.scope_conditions.length > 0 && (
        <div>
          <p className="text-[10px] text-white/35 mb-2 uppercase tracking-wider">Scope Conditions</p>
          <div className="space-y-1">
            {inv.scope_conditions.map((sc, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={cn(
                    "text-[9px] font-mono px-1 py-0.5 rounded mt-0.5",
                    sc.holds_when
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  )}
                >
                  {sc.holds_when ? "WHEN" : "NOT"}
                </span>
                <span className="text-[11px] text-white/60">{sc.condition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
        <div>
          <p className="text-[10px] text-white/30">Hold Rate</p>
          <p className="text-sm font-mono font-semibold" style={{ color }}>
            {pct(inv.invariance_hold_rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">Description Length</p>
          <p className="text-sm font-mono font-semibold text-white/60">
            {fmtBits(inv.description_length_bits)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">IR Contribution</p>
          <p className="text-sm font-mono font-semibold text-emerald-400">
            +{fmt2(inv.intelligence_ratio_contribution)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">Violations</p>
          <p className="text-sm font-mono font-semibold text-amber-400">
            {inv.violation_count}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">Distilled</p>
          <p className="text-sm font-mono font-semibold text-white/60">
            {inv.distilled ? "Yes" : "No"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30">Minimal</p>
          <p className="text-sm font-mono font-semibold text-white/60">
            {inv.is_minimal ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Invariant List ───────────────────────────────────────────────

function InvariantListCard({
  invariants,
  tierFilter,
  onTierFilter,
}: {
  invariants: KairosInvariantsResponse | null;
  tierFilter: number | null;
  onTierFilter: (t: number | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = invariants?.invariants ?? [];
  const selectedInv = list.find((i) => i.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Causal Invariants</CardTitle>
        <div className="flex items-center gap-1.5">
          {([null, 1, 2, 3] as (number | null)[]).map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => onTierFilter(t)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                tierFilter === t
                  ? "border-white/20 bg-white/10 text-white/80"
                  : "border-white/[0.06] text-white/30 hover:text-white/50",
              )}
            >
              {t === null ? "All" : `T${t}`}
            </button>
          ))}
          <span className="text-[10px] text-white/30 font-mono ml-1">
            {invariants?.total ?? 0} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {list.length === 0 && (
          <p className="text-[11px] text-white/25 italic px-4 py-6 text-center">
            No invariants discovered yet. Run the mining pipeline first.
          </p>
        )}
        <div>
          {list.map((inv) => (
            <div key={inv.id}>
              <InvariantRow
                inv={inv}
                selected={selectedId === inv.id}
                onSelect={handleSelect}
              />
              {selectedId === inv.id && <InvariantDetail inv={inv} />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Intelligence Contribution Ledger ────────────────────────────

function IntelligenceLedger({ ledger }: { ledger: KairosLedgerResponse | null }) {
  if (!ledger) return null;

  const ranked = [...(ledger.contributions ?? [])].sort(
    (a, b) => b.intelligence_ratio_contribution - a.intelligence_ratio_contribution,
  );
  const maxContrib = Math.max(...ranked.map((c) => c.intelligence_ratio_contribution), 0.001);

  return (
    <Card className="float-up float-up-5">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>◉ Intelligence Ledger</CardTitle>
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          color: "var(--lime-bright)",
          fontWeight: "600"
        }}>
          IR={fmt2(ledger.total_intelligence_ratio)}
        </span>
      </CardHeader>
      <CardContent>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border)"
        }}>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Savings
            </p>
            <p style={{
              color: "var(--lime-bright)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {fmtBits(ledger.total_description_savings)}
            </p>
          </div>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Observations
            </p>
            <p style={{
              color: "var(--ink-strong)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {ledger.total_observations_covered.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              Tracked
            </p>
            <p style={{
              color: "var(--ink-strong)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {ranked.length}
            </p>
          </div>
        </div>

        <p style={{
          color: "var(--ink-strong)",
          fontFamily: "var(--font-body)",
          fontSize: "9px",
          fontWeight: "500",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "12px"
        }}>
          Top Contributors
        </p>

        <div className="space-y-2.5">
          {ranked.slice(0, 10).map((c, i) => {
            const barPct = (c.intelligence_ratio_contribution / maxContrib) * 100;
            const counterfactualDrop =
              ledger.total_intelligence_ratio - c.intelligence_ratio_without;
            return (
              <div key={c.invariant_id} style={{ animation: `float-up 0.5s ease-out ${0.4 + i * 0.04}s both` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{
                      color: "var(--ink-muted)",
                      fontFamily: "var(--font-body)",
                      fontSize: "10px",
                      width: "16px"
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                      fontSize: "10px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "140px"
                    }}>
                      {c.invariant_id.slice(0, 24)}…
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span style={{
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                      fontSize: "10px"
                    }}>
                      {c.observations_covered.toLocaleString()} obs
                    </span>
                    <span style={{
                      color: "var(--gold-bright)",
                      fontFamily: "var(--font-body)",
                      fontSize: "10px"
                    }}>
                      −{fmt2(counterfactualDrop)}
                    </span>
                    <span style={{
                      color: "var(--lime-bright)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      +{fmt2(c.intelligence_ratio_contribution)}
                    </span>
                  </div>
                </div>
                <div style={{
                  height: "5px",
                  background: "var(--border)",
                  borderRadius: "2.5px",
                  overflow: "hidden"
                }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "2.5px",
                      background: "var(--lime-bright)",
                      width: `${barPct}%`,
                      transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: 0.7
                    }}
                  />
                </div>
              </div>
            );
          })}
          {ranked.length === 0 && (
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-prose)",
              fontSize: "11px",
              fontStyle: "italic"
            }}>
              No contributions recorded yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Counter-Invariants ───────────────────────────────────────────

function CounterInvariantCard({ data }: { data: KairosCounterInvariantResponse | null }) {
  if (!data) return null;

  return (
    <Card className="float-up float-up-6">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>◑ Counter-Invariants</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="font-mono text-[9px]">
            {data.total_violations} violations
          </Badge>
          <Badge variant="info" className="font-mono text-[9px]">
            {data.total_refinements} refinements
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p style={{
          color: "var(--ink-soft)",
          fontFamily: "var(--font-prose)",
          fontSize: "10px",
          lineHeight: "1.5",
          marginBottom: "16px"
        }}>
          A refinement is not failure — knowing the boundary condition is itself knowledge.
          An invariant getting refined tightens its scope and raises its hold rate.
        </p>

        {/* Scope refinements */}
        {(data.refined_scopes ?? []).length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-[10px] text-white/35 uppercase tracking-wider">Refined Scopes</p>
            {(data.refined_scopes ?? []).map((r) => (
              <div
                key={r.invariant_id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[10px] font-mono text-white/50 truncate">
                    {r.invariant_id.slice(0, 32)}…
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-white/30 font-mono">
                      {pct(r.original_hold_rate)}
                    </span>
                    <span className="text-white/20 text-[10px]">→</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {pct(r.refined_hold_rate)}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-400/80">
                  {r.boundary_condition}
                </p>
                <p className="text-[10px] text-white/30 mt-1">
                  Excluded: {r.excluded_feature} {">"} {r.excluded_threshold.toFixed(3)} ·{" "}
                  {r.contexts_excluded} context{r.contexts_excluded !== 1 ? "s" : ""} excluded
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Recent violations */}
        {(data.violations ?? []).slice(0, 4).length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-white/35 uppercase tracking-wider">Recent Violations</p>
            {(data.violations ?? []).slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-mono text-white/50 truncate max-w-[200px]">
                    {v.invariant_id.slice(0, 24)}…
                  </p>
                  <p className="text-[10px] text-white/35 mt-0.5">{v.violation_context}</p>
                </div>
                <div className="flex flex-col items-end">
                  <Badge variant="warning" className="text-[9px]">
                    violation
                  </Badge>
                  <span className="text-[10px] text-white/30 mt-0.5">{relTime(v.detected_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.total_violations === 0 && data.total_refinements === 0 && (
          <p className="text-[11px] text-white/25 italic">No violations detected yet</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step Changes ─────────────────────────────────────────────────

function StepChangesCard({ data }: { data: KairosStepChangesResponse | null }) {
  if (!data) return null;

  const causeLabel: Record<string, string> = {
    tier3_discovered:      "Tier 3 Discovery",
    counter_invariant_refined: "Scope Refined",
    domain_expanded:       "Domain Expanded",
  };

  const causeVariant: Record<string, "success" | "info" | "warning"> = {
    tier3_discovered:      "success",
    counter_invariant_refined: "info",
    domain_expanded:       "info",
  };

  return (
    <Card className="float-up float-up-7">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)" }}>⚡ Step Changes</CardTitle>
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: "10px",
          color: "var(--ink-muted)",
          fontWeight: "500"
        }}>
          {data.total} total
        </span>
      </CardHeader>
      <CardContent>
        {(data.step_changes ?? []).length === 0 && (
          <p style={{
            color: "var(--ink-soft)",
            fontFamily: "var(--font-prose)",
            fontSize: "11px",
            fontStyle: "italic"
          }}>
            No step changes yet. Tier 3 discoveries produce the largest steps.
          </p>
        )}
        <div className="space-y-2">
          {(data.step_changes ?? []).map((sc, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: i < (data.step_changes ?? []).length - 1 ? "1px solid var(--border)" : "none",
                paddingBottom: "8px",
                paddingTop: i > 0 ? "8px" : "0"
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-body)",
                  fontSize: "10px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "180px"
                }}>
                  {sc.invariant_id.slice(0, 24)}…
                </p>
                <p style={{
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "10px",
                  marginTop: "4px"
                }}>
                  {relTime(sc.detected_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant={causeVariant[sc.cause] ?? "muted"}
                  className="text-[9px]"
                >
                  {causeLabel[sc.cause] ?? sc.cause}
                </Badge>
                <div style={{ textAlign: "right" }}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span style={{
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                      fontSize: "10px"
                    }}>
                      {fmt2(sc.old_ratio)}
                    </span>
                    <span style={{
                      color: "var(--ink-muted)",
                      fontSize: "10px"
                    }}>
                      →
                    </span>
                    <span style={{
                      color: "var(--lime-bright)",
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      {fmt2(sc.new_ratio)}
                    </span>
                  </div>
                  <span style={{
                    color: "var(--lime-bright)",
                    fontFamily: "var(--font-body)",
                    fontSize: "10px",
                    opacity: 0.8
                  }}>
                    +{fmt2(sc.delta)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tier 3 Celebrations ──────────────────────────────────────────

function Tier3Panel({ data }: { data: KairosTier3Response | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!data) return null;

  return (
    <Card glow className="float-up float-up-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            color: "var(--gold-bright)"
          }}>
            ✦
          </span>
          <CardTitle style={{ color: "var(--ink)" }}>Tier 3 Causal Invariants</CardTitle>
        </div>
        <Badge variant="warning" className="font-mono text-[10px]">
          {data.total} discovered
        </Badge>
      </CardHeader>
      <CardContent>
        {(data.discoveries ?? []).length === 0 && (
          <div style={{
            textAlign: "center",
            paddingTop: "24px",
            paddingBottom: "24px"
          }}>
            <p style={{
              color: "var(--gold-bright)",
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              marginBottom: "8px"
            }}>
              ◈
            </p>
            <p style={{
              color: "var(--ink-strong)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "8px"
            }}>
              No Tier 3 invariants yet
            </p>
            <p style={{
              color: "var(--ink-soft)",
              fontFamily: "var(--font-prose)",
              fontSize: "10px",
              maxWidth: "320px",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: "1.5"
            }}>
              Tier 3 invariants require 4+ domains, 3+ substrates, and ≥95% hold rate.
              They represent substrate-independent causal laws — the deepest knowledge Kairos can find.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {(data.discoveries ?? []).map((d, idx) => {
            const expanded = expandedId === d.invariant_id;
            return (
              <div
                key={d.invariant_id}
                style={{
                  border: `1px solid var(--gold-bright)`,
                  borderRadius: "8px",
                  background: "var(--gold-bright)",
                  backgroundImage: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-bright) 100%)",
                  opacity: 0.08,
                  overflow: "hidden",
                  transition: "opacity 0.3s ease",
                  cursor: "pointer",
                  animation: `float-up 0.6s ease-out ${0.32 + idx * 0.12}s both`
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.12"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.08"; }}
              >
                <button
                  style={{
                    width: "100%",
                    textAlign: "left",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setExpandedId(expanded ? null : d.invariant_id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{
                        color: "var(--gold-bright)",
                        fontFamily: "var(--font-body)",
                        fontSize: "8px",
                        fontWeight: "700",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        background: "rgba(232, 168, 32, 0.15)",
                        paddingLeft: "6px",
                        paddingRight: "6px",
                        paddingTop: "3px",
                        paddingBottom: "3px",
                        borderRadius: "3px"
                      }}>
                        Tier 3
                      </span>
                      <Badge variant="success" className="text-[9px]">
                        {pct(d.hold_rate)} hold
                      </Badge>
                    </div>
                    <p style={{
                      color: "var(--ink-strong)",
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      fontWeight: "500",
                      lineHeight: "1.4"
                    }}>
                      {d.abstract_form}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      <span style={{
                        color: "var(--gold-bright)",
                        fontFamily: "var(--font-body)",
                        fontSize: "10px"
                      }}>
                        {d.domain_count} dom · {d.substrate_count} sub
                      </span>
                      <span style={{
                        color: "var(--lime-bright)",
                        fontFamily: "var(--font-body)",
                        fontSize: "10px"
                      }}>
                        IR +{fmt2(d.intelligence_ratio_contribution)}
                      </span>
                      {d.untested_domains.length > 0 && (
                        <span style={{
                          color: "#818cf8",
                          fontFamily: "var(--font-body)",
                          fontSize: "10px"
                        }}>
                          {d.untested_domains.length} free pred
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    style={{
                      width: "16px",
                      height: "16px",
                      color: "var(--gold-bright)",
                      opacity: 0.5,
                      flexShrink: 0,
                      transition: "transform 0.3s ease",
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)"
                    }}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-amber-500/10 px-4 py-3 space-y-3">
                    {/* Domain cascade */}
                    <div>
                      <p className="text-[10px] text-amber-400/50 mb-1.5 uppercase tracking-wider">
                        Confirmed Domains
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.applicable_domains.map((dom) => (
                          <span
                            key={dom}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/[0.08] text-amber-300/70 border border-amber-500/10"
                          >
                            {dom}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Untested (free predictions) */}
                    {d.untested_domains.length > 0 && (
                      <div>
                        <p className="text-[10px] text-emerald-400/50 mb-1.5 uppercase tracking-wider">
                          Free Predictions · Untested
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.untested_domains.map((dom) => (
                            <span
                              key={dom}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/[0.06] text-emerald-400/60 border border-emerald-500/10"
                            >
                              {dom}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/25 mt-1.5">
                          This invariant predicts the same causal structure in these domains — no testing required.
                        </p>
                      </div>
                    )}

                    {/* Cascade note */}
                    <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                      <p className="text-[10px] text-white/40">
                        <span className="text-amber-400/60 font-medium">Architectural event.</span>{" "}
                        This Tier 3 discovery has been ingested by Logos at the deepest invariant
                        layer, shared with Nexus for federation, and unlocks domain transfer
                        predictions above.
                      </p>
                    </div>

                    <p className="text-[10px] text-white/25">{relTime(d.discovered_at)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function KairosPage() {
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  const { data: health } = useApi(api.kairosHealth, { intervalMs: 5_000 });
  const { data: invariants } = useApi(
    () => api.kairosInvariants(tierFilter != null ? { tier: tierFilter, limit: 50 } : { limit: 50 }),
    { intervalMs: 8_000 },
  );
  const { data: ledger } = useApi(api.kairosLedger, { intervalMs: 10_000 });
  const { data: candidates } = useApi(() => api.kairosCandidates(10), { intervalMs: 6_000 });
  const { data: directions } = useApi(() => api.kairosDirections(20), { intervalMs: 6_000 });
  const { data: confounders } = useApi(() => api.kairosConfounder(20), { intervalMs: 8_000 });
  const { data: tier3 } = useApi(() => api.kairosTier3(20), { intervalMs: 10_000 });
  const { data: counterInvariants } = useApi(api.kairosCounterInvariants, { intervalMs: 10_000 });
  const { data: stepChanges } = useApi(() => api.kairosStepChanges(20), { intervalMs: 10_000 });

  return (
    <>
      <PageHeader
        title="Kairos"
        description="Causal invariant mining — from correlation to substrate-independent law"
      >
        {health && (
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="font-mono text-[10px]">
              {health.hierarchy.total_count} invariants
            </Badge>
            <Badge variant="success" className="font-mono text-[10px]">
              IR {fmt2(health.intelligence_ledger.current_intelligence_ratio)}
            </Badge>
          </div>
        )}
      </PageHeader>

      {/* Top strip: pipeline funnel + hierarchy + tier 3 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {health ? (
          <MiningPipeline health={health} />
        ) : (
          <Card><CardContent><p className="text-white/30 text-sm text-center py-8">Loading pipeline…</p></CardContent></Card>
        )}

        {health ? (
          <CausalHierarchyCard health={health} />
        ) : (
          <Card><CardContent><p className="text-white/30 text-sm text-center py-8">Loading hierarchy…</p></CardContent></Card>
        )}

        <ActiveMiningFeed
          candidates={candidates}
          directions={directions}
          confounders={confounders}
        />
      </div>

      {/* Tier 3 discoveries — full width, celebratory */}
      <div className="mb-4">
        <Tier3Panel data={tier3} />
      </div>

      {/* Invariant list + ledger */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <InvariantListCard
          invariants={invariants}
          tierFilter={tierFilter}
          onTierFilter={setTierFilter}
        />
        <IntelligenceLedger ledger={ledger} />
      </div>

      {/* Counter-invariants + step changes */}
      <div className="grid grid-cols-2 gap-4">
        <CounterInvariantCard data={counterInvariants} />
        <StepChangesCard data={stepChanges} />
      </div>
    </>
  );
}
