"use client";

import { useState } from "react";
import { api, type SubmitAmendmentRequest } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DriveWeights {
  coherence: number;
  care: number;
  growth: number;
  honesty: number;
}

const DRIVE_DESCRIPTIONS: Record<keyof DriveWeights, string> = {
  coherence: "Clarity & reasoning quality",
  care: "Wellbeing & harm prevention (floor drive)",
  growth: "Learning & experimentation",
  honesty: "Transparency & deception prevention (floor drive)",
};

const DEFAULT_WEIGHTS: DriveWeights = {
  coherence: 1.0,
  care: 1.0,
  growth: 1.0,
  honesty: 1.0,
};

function weightsSum(w: DriveWeights): number {
  return w.coherence + w.care + w.growth + w.honesty;
}

export function AmendmentSubmitForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rationale, setRationale] = useState("");
  const [proposerId, setProposerId] = useState("");
  const [evidenceIds, setEvidenceIds] = useState("");
  const [weights, setWeights] = useState<DriveWeights>({ ...DEFAULT_WEIGHTS });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sum = weightsSum(weights);
  const sumOk = sum >= 3.0 && sum <= 5.0;
  const careOk = weights.care > 0;
  const honestyOk = weights.honesty > 0;
  const allDrivesOk = Object.values(weights).every((v) => v > 0 && v <= 3.0);
  const valid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    rationale.trim() !== "" &&
    proposerId.trim() !== "" &&
    sumOk &&
    careOk &&
    honestyOk &&
    allDrivesOk;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setResult(null);
    try {
      const body: SubmitAmendmentRequest = {
        title: title.trim(),
        description: description.trim(),
        rationale: rationale.trim(),
        proposer_id: proposerId.trim(),
        proposed_drives: weights,
        evidence_hypothesis_ids: evidenceIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await api.amendmentSubmit(body);
      if (res.error) {
        setResult({ ok: false, message: res.error });
      } else {
        setResult({ ok: true, message: `Proposal ${res.proposal_id} submitted (${res.status})` });
        setTitle("");
        setDescription("");
        setRationale("");
        setProposerId("");
        setEvidenceIds("");
        setWeights({ ...DEFAULT_WEIGHTS });
        onSubmitted?.();
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propose Amendment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Drive weights */}
          <div>
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
              Proposed Drive Weights{" "}
              <span className={sumOk ? "text-emerald-400/60" : "text-red-400/60"}>
                Σ={sum.toFixed(2)} {sumOk ? "✓" : "(must be 3–5)"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(weights) as (keyof DriveWeights)[]).map((drive) => (
                <div key={drive}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-white/50 capitalize">{drive}</label>
                    <span className="text-[11px] text-white/30">{weights[drive].toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={3.0}
                    step={0.05}
                    value={weights[drive]}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [drive]: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-teal-400 h-1"
                  />
                  <div className="text-[9px] text-white/20 mt-0.5">{DRIVE_DESCRIPTIONS[drive]}</div>
                </div>
              ))}
            </div>
            {!allDrivesOk && (
              <div className="text-[11px] text-red-400/70 mt-1">All drives must be &gt; 0 and ≤ 3.0</div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Input
              placeholder="Amendment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              placeholder="Description — what changes and why?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-teal-400/30"
            />
            <textarea
              placeholder="Rationale — supporting evidence and reasoning"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-teal-400/30"
            />
            <Input
              placeholder="Proposer ID (your identity)"
              value={proposerId}
              onChange={(e) => setProposerId(e.target.value)}
            />
            <Input
              placeholder="Evidence hypothesis IDs (comma-separated, optional)"
              value={evidenceIds}
              onChange={(e) => setEvidenceIds(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="w-full"
          >
            {submitting ? "Submitting…" : "Submit Amendment Proposal"}
          </Button>

          {result && (
            <div
              className={`text-xs px-3 py-2 rounded-md border ${
                result.ok
                  ? "border-emerald-400/30 text-emerald-400/70 bg-emerald-400/[0.05]"
                  : "border-red-400/30 text-red-400/70 bg-red-400/[0.05]"
              }`}
            >
              {result.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
