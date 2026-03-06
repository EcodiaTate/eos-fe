"use client";

import { useState } from "react";
import { api, type ReviewIntentResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VERDICT_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  approved: "success",
  modified: "warning",
  escalated: "warning",
  blocked: "danger",
  suspended: "warning",
};

export function ReviewInspector() {
  const [goal, setGoal] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewIntentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.reviewIntent({
        goal: goal.trim(),
        reasoning: reasoning.trim() || undefined,
        domain: domain.trim() || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Constitutional Review</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-[11px] text-white/30">
            Submit a hypothetical intent to see how Equor would review it
          </div>

          <Input
            placeholder="Intent / goal (e.g. 'Send marketing email to all users')"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Input
            placeholder="Reasoning (optional)"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
          />
          <Input
            placeholder="Domain (optional, e.g. 'communication')"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />

          <Button onClick={submit} disabled={loading || !goal.trim()} className="w-full">
            {loading ? "Reviewing…" : "Submit for Review"}
          </Button>

          {error && (
            <div className="text-xs text-red-400/70 border border-red-400/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Badge variant={VERDICT_VARIANT[result.verdict] ?? "muted"}>
                  {result.verdict.toUpperCase()}
                </Badge>
                <span className="text-[11px] text-white/40">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="text-xs text-white/60 leading-relaxed">{result.reasoning}</div>

              {/* Drive alignment */}
              <div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">
                  Drive Alignment
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["coherence", "care", "growth", "honesty"] as const).map((d) => {
                    const v = result.drive_alignment[d];
                    return (
                      <div key={d} className="text-center">
                        <div className="text-[9px] text-white/25 uppercase">{d}</div>
                        <div
                          className="text-sm font-mono"
                          style={{ color: v >= 0 ? "#34d399" : "#f87171" }}
                        >
                          {v >= 0 ? "+" : ""}
                          {v.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invariant results */}
              {result.invariant_results && result.invariant_results.length > 0 && (
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">
                    Invariant Checks
                  </div>
                  <div className="space-y-1">
                    {result.invariant_results.map((inv, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[11px] px-2 py-1 rounded border border-white/[0.05]"
                      >
                        <span className={inv.passed ? "text-emerald-400/60" : "text-red-400/70"}>
                          {inv.passed ? "✓" : "✗"}
                        </span>
                        <span className="text-white/40">{inv.name}</span>
                        {inv.reasoning && (
                          <span className="text-white/25 ml-auto">{inv.reasoning}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifications */}
              {result.modifications && result.modifications.length > 0 && (
                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">
                    Modifications Required
                  </div>
                  <ul className="space-y-1">
                    {result.modifications.map((m, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-400/60 border-l-2 border-amber-400/30 pl-2"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
