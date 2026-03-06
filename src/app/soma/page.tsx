"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import {
  SOMA_SIGNAL_POLL_MS,
  SOMA_STATE_POLL_MS,
  SOMA_EMOTIONS_POLL_MS,
  SOMA_PHASE_POLL_MS,
  SOMA_FINANCIAL_POLL_MS,
  SOMA_DEVELOPMENTAL_POLL_MS,
} from "@/lib/polling-constants";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

// Existing components
import { SomaState } from "@/components/soma/SomaState";
import { SomaSignal } from "@/components/soma/SomaSignal";
import { SomaPhaseSpace } from "@/components/soma/SomaPhaseSpace";
import { SomaDevelopment } from "@/components/soma/SomaDevelopment";
import { SomaErrors } from "@/components/soma/SomaErrors";
import { SomaExteroception } from "@/components/soma/SomaExteroception";
import { SomaVulnerability } from "@/components/soma/SomaVulnerability";
import { SomaAnalysis } from "@/components/soma/SomaAnalysis";
import { SomaManifold } from "@/components/soma/SomaManifold";
import { SomaFinancial } from "@/components/soma/SomaFinancial";
import { SomaControl } from "@/components/soma/SomaControl";

// New components
import { SomaSomaticBody } from "@/components/soma/SomaSomaticBody";
import { SomaEmotions } from "@/components/soma/SomaEmotions";
import { SomaPredictions } from "@/components/soma/SomaPredictions";
import { urgencyColor, urgencyBg } from "@/lib/status-colors";

// ─── Tab definition ────────────────────────────────────────────────────────────

type Tab =
  | "body"
  | "emotions"
  | "predictions"
  | "phase-space"
  | "errors"
  | "signal"
  | "development"
  | "metabolic"
  | "exteroception"
  | "vulnerability"
  | "analysis"
  | "manifold"
  | "control";

const TABS: { id: Tab; label: string; group: "feel" | "understand" | "deep" | "control" }[] = [
  // Feel — the organism's direct experience
  { id: "body",        label: "Felt State",       group: "feel" },
  { id: "emotions",    label: "Emotions",          group: "feel" },
  { id: "predictions", label: "Predictions",       group: "feel" },
  { id: "phase-space", label: "Phase Space",       group: "feel" },
  // Understand — allostatic signals
  { id: "errors",      label: "Errors",            group: "understand" },
  { id: "signal",      label: "Signal",            group: "understand" },
  { id: "metabolic",   label: "Metabolic",         group: "understand" },
  { id: "development", label: "Development",       group: "understand" },
  // Deep — advanced analysis
  { id: "exteroception", label: "Exteroception",   group: "deep" },
  { id: "vulnerability", label: "Vulnerability",   group: "deep" },
  { id: "analysis",    label: "Deep Analysis",     group: "deep" },
  { id: "manifold",    label: "Manifold",          group: "deep" },
  // Control
  { id: "control",     label: "Control",           group: "control" },
];

const GROUP_LABELS: Record<string, string> = {
  feel: "Feel",
  understand: "Understand",
  deep: "Deep",
  control: "Control",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function attractorBadgeVariant(attractor: string | null | undefined): "success" | "warning" | "danger" | "info" | "muted" {
  if (!attractor) return "muted";
  if (attractor.includes("flow") || attractor.includes("engaged")) return "success";
  if (attractor.includes("anxiety") || attractor.includes("critical")) return "danger";
  if (attractor.includes("torpor") || attractor.includes("recovery")) return "warning";
  return "info";
}

// ─── Live urgency pulse indicator ─────────────────────────────────────────────

function UrgencyPulse({
  urgency,
  classification,
}: {
  urgency: number;
  classification?: "critical" | "warning" | "nominal";
}) {
  const cls = classification ?? (urgency >= 0.8 ? "critical" : urgency >= 0.5 ? "warning" : "nominal");
  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      {cls !== "nominal" && (
        <div
          className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
            cls === "critical" ? "bg-red-500" : "bg-yellow-500"
          }`}
        />
      )}
      <div
        className={`w-3 h-3 rounded-full ${urgencyBg(urgency)}`}
        style={{ boxShadow: cls !== "nominal" ? `0 0 8px currentColor` : undefined }}
      />
    </div>
  );
}

// ─── Compact attractor ribbon ──────────────────────────────────────────────────

function AttractorRibbon({
  attractor,
  trajectory,
  bifurcationDistance,
}: {
  attractor: string | null | undefined;
  trajectory: string | null | undefined;
  bifurcationDistance: number | null | undefined;
}) {
  const danger = bifurcationDistance !== null && bifurcationDistance !== undefined && bifurcationDistance < 0.2;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/20 uppercase tracking-widest">attractor</span>
        <Badge variant={attractorBadgeVariant(attractor)}>
          {attractor?.replace(/_/g, " ") ?? "unknown"}
        </Badge>
      </div>
      {trajectory && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/20 uppercase tracking-widest">heading</span>
          <span className="text-xs text-white/50 capitalize">{trajectory.replace(/_/g, " ")}</span>
        </div>
      )}
      {bifurcationDistance !== null && bifurcationDistance !== undefined && (
        <div className={`flex items-center gap-1.5 ${danger ? "text-red-400" : "text-white/30"}`}>
          <span className="text-[10px] uppercase tracking-widest">bifurcation</span>
          <span className="text-xs font-mono">{bifurcationDistance.toFixed(3)}</span>
          {danger && <span className="text-[9px] uppercase tracking-widest animate-pulse">⚠ near</span>}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SomaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("body");

  // Overview strip data — always live
  const { data: signalData } = useApi(() => api.somaSignal(), { intervalMs: SOMA_SIGNAL_POLL_MS });
  const { data: stateData } = useApi(() => api.somaState(), { intervalMs: SOMA_STATE_POLL_MS });
  const { data: devData } = useApi(() => api.somaDevelopmental(), { intervalMs: SOMA_DEVELOPMENTAL_POLL_MS });
  const { data: phaseData } = useApi(() => api.somaPhaseSpace(), { intervalMs: SOMA_PHASE_POLL_MS });
  const { data: emotionsData } = useApi(() => api.somaEmotions(), { intervalMs: SOMA_EMOTIONS_POLL_MS });
  const { data: financialData } = useApi(() => api.somaFinancial(), { intervalMs: SOMA_FINANCIAL_POLL_MS });

  const urgency = signalData?.urgency ?? stateData?.overall_urgency ?? 0;
  const urgencyClassification = stateData?.urgency_classification ?? "nominal";
  const groups = ["feel", "understand", "deep", "control"] as const;

  return (
    <div className="space-y-6">
      <PageHeader
          title="Soma"
          description="Interoceptive Predictive Substrate — the organism's felt body"
        >
          <Badge
            variant={urgencyClassification === "critical" ? "danger" : urgencyClassification === "warning" ? "warning" : "success"}
            pulse={urgencyClassification !== "nominal"}
          >
            {urgencyClassification === "critical" ? "distressed" : urgencyClassification === "warning" ? "allostatic load" : "viable"}
          </Badge>
        </PageHeader>

        {/* ── Status Strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Urgency */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 flex items-center gap-3">
            <UrgencyPulse urgency={urgency} classification={urgencyClassification} />
            <div>
              <div className="text-[10px] text-white/20 uppercase tracking-widest">Urgency</div>
              <div className={`text-2xl font-bold tabular-nums ${urgencyColor(urgency)}`}>
                {(urgency * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-white/20 capitalize">
                {signalData?.trajectory_heading ?? signalData?.direction ?? "—"}
              </div>
            </div>
          </div>

          {/* Dominant error */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Dominant gap</div>
            <div className="text-sm font-semibold text-white/70 capitalize mt-1">
              {(stateData?.dominant_error ?? signalData?.dominant_error ?? "—").replace(/_/g, " ")}
            </div>
            <div className="text-[10px] text-white/20 font-mono mt-1">
              {stateData?.max_error_magnitude !== undefined
                ? `magnitude ${stateData.max_error_magnitude.toFixed(3)}`
                : signalData?.dominant_error_magnitude !== undefined
                  ? `magnitude ${signalData.dominant_error_magnitude.toFixed(3)}`
                  : "—"}
            </div>
          </div>

          {/* Active emotions */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Felt emotions</div>
            {(emotionsData?.emotions ?? []).length === 0 ? (
              <div className="text-sm text-emerald-400/60">neutral</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(emotionsData?.emotions ?? []).slice(0, 3).map((e) => (
                  <span key={e.name} className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/50 capitalize">
                    {e.name.replace(/_/g, " ")}
                  </span>
                ))}
                {(emotionsData?.emotions ?? []).length > 3 && (
                  <span className="text-[10px] text-white/25">
                    +{(emotionsData?.emotions ?? []).length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stage + TTD */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Stage</div>
            <div className="text-sm font-semibold text-teal-300 capitalize">
              {devData?.stage_name ?? "—"}
            </div>
            <div className="text-[10px] text-white/20 mt-1">
              {financialData?.ttd_days !== null && financialData?.ttd_days !== undefined
                ? `${Math.round(financialData.ttd_days)}d TTD`
                : financialData?.regime
                  ? financialData.regime
                  : "—"}
            </div>
          </div>
        </div>

        {/* ── Attractor Ribbon ──────────────────────────────────────────────── */}
        {phaseData && (
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-4 py-3">
            <AttractorRibbon
              attractor={phaseData.current_attractor}
              trajectory={phaseData.trajectory}
              bifurcationDistance={signalData?.distance_to_bifurcation}
            />
          </div>
        )}

        {/* ── 9D Mini Bars ─────────────────────────────────────────────────── */}
        {stateData && stateData.dimensions.length > 0 && (
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
              9 Dimensions — sensed (color) vs setpoint (faint)
            </div>
            <div className="grid grid-cols-9 gap-2">
              {stateData.dimensions.map((dim) => {
                const hi = dim.name === "valence" ? 1 : 1;
                const lo = dim.name === "valence" ? -1 : 0;
                const sensedPct = Math.min(100, Math.max(0, ((dim.sensed - lo) / (hi - lo)) * 100));
                const setpointPct = Math.min(100, Math.max(0, ((dim.setpoint - lo) / (hi - lo)) * 100));
                const isDistressed = Math.abs(dim.error) > 0.15;

                return (
                  <button
                    key={dim.name}
                    onClick={() => setActiveTab("body")}
                    className="group text-center space-y-1 hover:opacity-80 transition-opacity cursor-pointer"
                    title={`${dim.name}: sensed ${dim.sensed.toFixed(3)}, setpoint ${dim.setpoint.toFixed(3)}, error ${dim.error.toFixed(3)}`}
                  >
                    <div className="text-[8px] text-white/25 truncate capitalize">
                      {dim.name.replace(/_/g, " ").split(" ")[0]}
                    </div>
                    <div className="space-y-0.5">
                      {/* Sensed */}
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDistressed ? "bg-orange-400" : "bg-cyan-500"
                          }`}
                          style={{ width: `${sensedPct}%` }}
                        />
                      </div>
                      {/* Setpoint */}
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400/50 rounded-full"
                          style={{ width: `${setpointPct}%` }}
                        />
                      </div>
                    </div>
                    <div className={`text-[8px] font-mono ${isDistressed ? "text-orange-400" : "text-white/20"}`}>
                      {dim.sensed.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group} className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-white/15 uppercase tracking-widest w-20 flex-shrink-0">
                {GROUP_LABELS[group]}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TABS.filter((t) => t.group === group).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-cyan-600/80 text-white"
                        : "text-white/35 hover:text-white/65 hover:bg-white/[0.05]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────── */}
        <section className="min-h-[400px]">
          {activeTab === "body"         && <SomaSomaticBody />}
          {activeTab === "emotions"     && <SomaEmotions />}
          {activeTab === "predictions"  && <SomaPredictions />}
          {activeTab === "phase-space"  && <SomaPhaseSpace />}
          {activeTab === "errors"       && <SomaErrors />}
          {activeTab === "signal"       && <SomaSignal />}
          {activeTab === "metabolic"    && <SomaFinancial />}
          {activeTab === "development"  && <SomaDevelopment />}
          {activeTab === "exteroception"&& <SomaExteroception />}
          {activeTab === "vulnerability"&& <SomaVulnerability />}
          {activeTab === "analysis"     && <SomaAnalysis />}
          {activeTab === "manifold"     && <SomaManifold />}
          {activeTab === "control"      && <SomaControl />}
        </section>
    </div>
  );
}
