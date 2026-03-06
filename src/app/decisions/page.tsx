"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type GoalsResponse,
  type BeliefsResponse,
  type PersonalityResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionStream } from "@/components/alive/DecisionStream";

export default function DecisionsPage() {
  const goals = useApi<GoalsResponse>(api.goals, { intervalMs: 10000 });
  const beliefs = useApi<BeliefsResponse>(api.beliefs, { intervalMs: 10000 });
  const personality = useApi<PersonalityResponse>(api.personality, {
    intervalMs: 30000,
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <PageHeader
        title="Decisions"
        description="Nova→Equor→Axon — goals, beliefs, and action outcomes"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action Pipeline */}
        <Card className="md:col-span-2 float-up float-up-1">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: "600", color: "var(--ink)" }}>
              ⚡ Action Pipeline
            </CardTitle>
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "4px" }}>
              Nova→Equor→Axon · live execution outcomes
            </div>
          </CardHeader>
          <CardContent>
            <DecisionStream />
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: "600", color: "var(--ink)" }}>
              ◈ Goals
            </CardTitle>
            {goals.data && (
              <div style={{ marginTop: "8px" }}>
                <Badge variant="muted">{goals.data.total_active} active</Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {goals.data ? (
              (goals.data.active_goals?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {goals.data.active_goals.map((goal) => (
                    <div
                      key={goal.id}
                      style={{
                        borderRadius: "7px",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        padding: "12px",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>
                          {goal.description}
                        </div>
                        <Badge
                          variant={goal.status === "active" ? "success" : "muted"}
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1" style={{ height: "6px", borderRadius: "3px", background: "var(--border)" }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${goal.progress * 100}%`,
                              background: "var(--lime)",
                              height: "100%",
                              borderRadius: "3px",
                              transition: "width 300ms ease-out",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                          {(goal.progress * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-2 flex gap-3 text-[9px]" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                        <span>src: {goal.source}</span>
                        <span>pri: {goal.priority.toFixed(2)}</span>
                        <span>urg: {goal.urgency.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div style={{ fontSize: "24px", opacity: 0.1, marginBottom: "8px" }}>~</div>
                  <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    No goals. Nova has nothing to optimize for.
                  </div>
                </div>
              )
            ) : (
              <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Beliefs */}
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: "600", color: "var(--ink)" }}>
              ◑ Belief State
            </CardTitle>
          </CardHeader>
          <CardContent>
            {beliefs.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Confidence", value: beliefs.data.overall_confidence.toFixed(3) },
                    { label: "Free Energy", value: beliefs.data.free_energy.toFixed(3) },
                    { label: "Entities Known", value: beliefs.data.entity_count.toString() },
                    { label: "Individuals Known", value: beliefs.data.individual_count.toString() },
                  ].map((m) => (
                    <div
                      key={m.label}
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "7px",
                        padding: "9px",
                      }}
                    >
                      <div style={{ fontSize: "9px", color: "var(--ink-strong)", fontFamily: "var(--font-body)", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--ink)", fontFamily: "var(--font-body)", fontWeight: "600" }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <div style={{ fontSize: "9px", color: "var(--ink-strong)", fontFamily: "var(--font-body)", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Self Model
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div style={{ fontSize: "9px", color: "var(--ink-soft)", marginBottom: "4px" }}>
                        Epistemic Confidence
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>
                        {beliefs.data.self_belief?.epistemic_confidence?.toFixed(3) ?? "–"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "var(--ink-soft)", marginBottom: "4px" }}>
                        Cognitive Load
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>
                        {beliefs.data.self_belief?.cognitive_load?.toFixed(3) ?? "–"}
                      </div>
                    </div>
                  </div>
                </div>

                {beliefs.data.context?.summary && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-strong)", fontFamily: "var(--font-body)", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                      Situation
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontFamily: "var(--font-prose)" }}>
                      {beliefs.data.context.summary}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Personality */}
        <Card className="md:col-span-2 float-up float-up-4">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: "600", color: "var(--ink)" }}>
              ↑ Personality Vector
            </CardTitle>
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "4px" }}>
              Voxis expression personality
            </div>
          </CardHeader>
          <CardContent>
            {personality.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Warmth", value: personality.data.warmth },
                    { label: "Directness", value: personality.data.directness },
                    { label: "Verbosity", value: personality.data.verbosity },
                    { label: "Formality", value: personality.data.formality },
                    { label: "Curiosity", value: personality.data.curiosity_expression },
                    { label: "Humour", value: personality.data.humour },
                    { label: "Empathy", value: personality.data.empathy_expression },
                    { label: "Confidence", value: personality.data.confidence_display },
                    { label: "Metaphor Use", value: personality.data.metaphor_use },
                  ].map((p) => (
                    <div key={p.label}>
                      <div className="flex items-baseline justify-between mb-2">
                        <span style={{ fontSize: "9px", color: "var(--ink-soft)", fontFamily: "var(--font-body)" }}>
                          {p.label}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", fontWeight: "600" }}>
                          {p.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="bar-track" style={{ height: "5px", borderRadius: "2px", background: "var(--border)" }}>
                        <div
                          className="bar-fill"
                          style={{
                            width: `${p.value * 100}%`,
                            background: "var(--lime)",
                            height: "100%",
                            borderRadius: "2px",
                            transition: "width 500ms ease-out",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {((personality.data.vocabulary_affinities?.length ?? 0) > 0 ||
                  (personality.data.thematic_references?.length ?? 0) > 0) && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }} className="flex flex-wrap gap-2">
                    {personality.data.vocabulary_affinities.map((w) => (
                      <Badge key={w} variant="info">
                        {w}
                      </Badge>
                    ))}
                    {personality.data.thematic_references.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                {personality.data.warmth === 0 &&
                  personality.data.directness === 0 && (
                    <div style={{
                      borderRadius: "7px",
                      border: "1px solid var(--gold-bright)",
                      background: "var(--gold-bright)",
                      backgroundOpacity: "0.08",
                      padding: "12px",
                      fontSize: "12px",
                      color: "var(--gold-bright)",
                      fontFamily: "var(--font-body)",
                    }}>
                      All personality values are zero. The seed may not have initialized
                      personality, or the birth process did not set personality traits. Aurora
                      has no voice character.
                    </div>
                  )}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
