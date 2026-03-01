"use client";

import { useState } from "react";
import { api, type ChangeCategory, type ChangeSpec, type SubmitProposalResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Categories that go through governance vs self-applicable vs forbidden
const CATEGORY_META: Record<ChangeCategory, { label: string; tier: "self" | "governed" | "forbidden"; description: string }> = {
  add_executor: { label: "Add Executor", tier: "self", description: "Add a new action executor to the system" },
  add_input_channel: { label: "Add Input Channel", tier: "self", description: "Add a new perception/input channel" },
  add_pattern_detector: { label: "Add Pattern Detector", tier: "self", description: "Add a new pattern recognition detector" },
  adjust_budget: { label: "Adjust Budget", tier: "self", description: "Adjust an LLM/compute budget parameter" },
  modify_contract: { label: "Modify Contract", tier: "governed", description: "Modify behavioural contracts (requires governance)" },
  add_system_capability: { label: "Add System Capability", tier: "governed", description: "Add a new high-level system capability (requires governance)" },
  modify_cycle_timing: { label: "Modify Cycle Timing", tier: "governed", description: "Change Synapse cycle timing parameters (requires governance)" },
  change_consolidation: { label: "Change Consolidation", tier: "governed", description: "Change memory consolidation schedule (requires governance)" },
  modify_equor: { label: "Modify Equor", tier: "forbidden", description: "FORBIDDEN — will be immediately rejected" },
  modify_constitution: { label: "Modify Constitution", tier: "forbidden", description: "FORBIDDEN — will be immediately rejected" },
  modify_invariants: { label: "Modify Invariants", tier: "forbidden", description: "FORBIDDEN — will be immediately rejected" },
  modify_self_evolution: { label: "Modify Self-Evolution", tier: "forbidden", description: "FORBIDDEN — will be immediately rejected" },
};

const TIER_COLORS: Record<string, string> = {
  self: "success",
  governed: "warning",
  forbidden: "danger",
};

const SPEC_FIELDS: Record<ChangeCategory, { key: keyof ChangeSpec; label: string; type?: string; placeholder?: string }[]> = {
  add_executor: [
    { key: "executor_name", label: "Executor Name", placeholder: "e.g. send_calendar_invite" },
    { key: "executor_description", label: "Description", placeholder: "What does this executor do?" },
    { key: "executor_action_type", label: "Action Type", placeholder: "e.g. external_api, internal_state" },
  ],
  add_input_channel: [
    { key: "channel_name", label: "Channel Name", placeholder: "e.g. slack_dm" },
    { key: "channel_type", label: "Channel Type", placeholder: "e.g. text, audio, structured_data" },
    { key: "channel_description", label: "Description", placeholder: "What data does this channel receive?" },
  ],
  add_pattern_detector: [
    { key: "detector_name", label: "Detector Name", placeholder: "e.g. user_frustration_detector" },
    { key: "detector_description", label: "Description", placeholder: "What pattern does it detect?" },
    { key: "detector_pattern_type", label: "Pattern Type", placeholder: "e.g. emotional, behavioural, semantic" },
  ],
  adjust_budget: [
    { key: "budget_parameter", label: "Budget Parameter", placeholder: "e.g. nova.max_tokens_per_cycle" },
    { key: "budget_old_value", label: "Old Value", type: "number", placeholder: "Current value" },
    { key: "budget_new_value", label: "New Value", type: "number", placeholder: "Proposed value" },
  ],
  modify_contract: [
    { key: "capability_description", label: "Contract Change Summary", placeholder: "Describe what contract is changing" },
  ],
  add_system_capability: [
    { key: "capability_description", label: "Capability Description", placeholder: "Describe the new capability to be added" },
  ],
  modify_cycle_timing: [
    { key: "timing_parameter", label: "Timing Parameter", placeholder: "e.g. synapse.cycle_period_ms" },
    { key: "timing_old_value", label: "Old Value (ms)", type: "number", placeholder: "Current value" },
    { key: "timing_new_value", label: "New Value (ms)", type: "number", placeholder: "Proposed value" },
  ],
  change_consolidation: [
    { key: "consolidation_schedule", label: "Consolidation Schedule", placeholder: "e.g. every_6h, midnight_utc" },
  ],
  modify_equor: [],
  modify_constitution: [],
  modify_invariants: [],
  modify_self_evolution: [],
};

interface Props {
  onSubmitted?: (result: SubmitProposalResponse) => void;
}

export function ProposalSubmitForm({ onSubmitted }: Props) {
  const [category, setCategory] = useState<ChangeCategory>("adjust_budget");
  const [source, setSource] = useState<"evo" | "governance">("governance");
  const [description, setDescription] = useState("");
  const [expectedBenefit, setExpectedBenefit] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [evidenceStr, setEvidenceStr] = useState("");
  const [spec, setSpec] = useState<Record<string, string | number>>({});
  const [affectedSystems, setAffectedSystems] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitProposalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = CATEGORY_META[category];

  function updateSpec(key: keyof ChangeSpec, value: string | number) {
    setSpec((prev) => ({ ...prev, [key]: value }));
  }

  function buildChangeSpec(): ChangeSpec {
    const s: ChangeSpec = {};
    const fields = SPEC_FIELDS[category];
    for (const f of fields) {
      const v = spec[f.key];
      if (v !== undefined && v !== "") {
        if (f.type === "number") {
          (s as Record<string, unknown>)[f.key] = Number(v);
        } else {
          (s as Record<string, unknown>)[f.key] = v;
        }
      }
    }
    if (affectedSystems) {
      s.affected_systems = affectedSystems.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (additionalContext) s.additional_context = additionalContext;
    if (codeHint) s.code_hint = codeHint;
    return s;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.simulaSubmitProposal({
        source,
        category,
        description,
        change_spec: buildChangeSpec(),
        evidence: evidenceStr ? evidenceStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
        expected_benefit: expectedBenefit,
        risk_assessment: riskAssessment,
      });
      setResult(res);
      onSubmitted?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setDescription("");
    setExpectedBenefit("");
    setRiskAssessment("");
    setEvidenceStr("");
    setSpec({});
    setAffectedSystems("");
    setAdditionalContext("");
    setCodeHint("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Evolution Proposal</CardTitle>
        <Badge variant={TIER_COLORS[meta.tier] as "success" | "warning" | "danger" | "muted" | "info"}>
          {meta.tier}
        </Badge>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs text-white/40 uppercase tracking-widest">Proposal submitted</div>
              <div className="font-mono text-xs text-white/60">{result.proposal_id}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={
                    result.result.status === "applied"
                      ? "success"
                      : result.result.status === "rejected"
                        ? "danger"
                        : result.result.status === "awaiting_governance"
                          ? "warning"
                          : "info"
                  }
                >
                  {result.result.status}
                </Badge>
                {result.result.version !== undefined && (
                  <span className="text-xs text-white/40">→ v{result.result.version}</span>
                )}
              </div>
              {result.result.reason && (
                <div className="text-xs text-white/50 mt-1">{result.result.reason}</div>
              )}
              {(result.result.files_changed?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-white/25 uppercase tracking-widest">Files changed</div>
                  {result.result.files_changed!.map((f) => (
                    <div key={f} className="font-mono text-[10px] text-white/40 bg-white/[0.02] rounded px-2 py-0.5">
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              Submit another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category + Source */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-widest">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value as ChangeCategory); setSpec({}); }}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 focus:border-white/20 focus:outline-none"
                >
                  {(Object.keys(CATEGORY_META) as ChangeCategory[]).map((k) => (
                    <option key={k} value={k}
                      style={{ background: "#0f0f0f" }}
                    >
                      {CATEGORY_META[k].label} ({CATEGORY_META[k].tier})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-widest">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as "evo" | "governance")}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 focus:border-white/20 focus:outline-none"
                  style={{ background: "#0f0f0f" }}
                >
                  <option value="governance">governance</option>
                  <option value="evo">evo</option>
                </select>
              </div>
            </div>

            {/* Category hint */}
            <div className="text-xs text-white/30 -mt-1">{meta.description}</div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest">Description *</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Human-readable description of what this proposal does"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none"
              />
            </div>

            {/* Category-specific spec fields */}
            {SPEC_FIELDS[category].length > 0 && (
              <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.01] p-3">
                <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Change Spec</div>
                {SPEC_FIELDS[category].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[10px] text-white/25">{f.label}</label>
                    <Input
                      type={f.type ?? "text"}
                      value={spec[f.key] ?? ""}
                      onChange={(e) => updateSpec(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Affected systems + context */}
            <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.01] p-3">
              <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Context (optional)</div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Affected Systems (comma-separated)</label>
                <Input
                  value={affectedSystems}
                  onChange={(e) => setAffectedSystems(e.target.value)}
                  placeholder="e.g. nova, synapse, evo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Additional Context</label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={2}
                  placeholder="Any additional context for the code agent"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Code Hint (optional)</label>
                <textarea
                  value={codeHint}
                  onChange={(e) => setCodeHint(e.target.value)}
                  rows={2}
                  placeholder="Sketch of what the code should look like"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none font-mono text-xs"
                />
              </div>
            </div>

            {/* Benefit + Risk + Evidence */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Expected Benefit</label>
                <Input
                  value={expectedBenefit}
                  onChange={(e) => setExpectedBenefit(e.target.value)}
                  placeholder="Why is this change beneficial?"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Risk Assessment</label>
                <Input
                  value={riskAssessment}
                  onChange={(e) => setRiskAssessment(e.target.value)}
                  placeholder="What could go wrong?"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/25">Evidence IDs (comma-separated hypothesis/episode IDs)</label>
                <Input
                  value={evidenceStr}
                  onChange={(e) => setEvidenceStr(e.target.value)}
                  placeholder="e.g. hyp-abc123, ep-def456"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !description}
              className="w-full"
            >
              {submitting ? "Submitting…" : "Submit Proposal"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
