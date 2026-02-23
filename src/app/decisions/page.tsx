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

export default function DecisionsPage() {
  const goals = useApi<GoalsResponse>(api.goals, { intervalMs: 10000 });
  const beliefs = useApi<BeliefsResponse>(api.beliefs, { intervalMs: 10000 });
  const personality = useApi<PersonalityResponse>(api.personality, {
    intervalMs: 30000,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Decisions"
        description="Nova — active inference, goals, beliefs, and personality"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            {goals.data && (
              <Badge variant="muted">{goals.data.total_active} active</Badge>
            )}
          </CardHeader>
          <CardContent>
            {goals.data ? (
              (goals.data.active_goals?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {goals.data.active_goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm text-white/70">
                          {goal.description}
                        </div>
                        <Badge
                          variant={
                            goal.status === "active" ? "success" : "muted"
                          }
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full bg-teal-400/60 transition-all"
                            style={{ width: `${goal.progress * 100}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-white/30 tabular-nums">
                          {(goal.progress * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-1.5 flex gap-2">
                        <span className="text-[10px] text-white/20">
                          src: {goal.source}
                        </span>
                        <span className="text-[10px] text-white/20">
                          pri: {goal.priority.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-white/20">
                          urg: {goal.urgency.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="text-2xl opacity-10 mb-2">~</div>
                  <div className="text-xs text-white/25">
                    No goals. Nova has nothing to optimize for.
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Beliefs */}
        <Card>
          <CardHeader>
            <CardTitle>Belief State</CardTitle>
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
                    <div key={m.label}>
                      <div className="text-[10px] text-white/25">{m.label}</div>
                      <div className="text-sm text-white/70 tabular-nums font-medium">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.06] pt-3">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                    Self Model
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-white/25">
                        Epistemic Confidence
                      </div>
                      <div className="text-sm text-white/70 tabular-nums">
                        {beliefs.data.self_belief?.epistemic_confidence?.toFixed(3) ?? '–'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/25">
                        Cognitive Load
                      </div>
                      <div className="text-sm text-white/70 tabular-nums">
                        {beliefs.data.self_belief?.cognitive_load?.toFixed(3) ?? '–'}
                      </div>
                    </div>
                  </div>
                </div>

                {beliefs.data.context?.summary && (
                  <div className="border-t border-white/[0.06] pt-3">
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
                      Situation
                    </div>
                    <div className="text-xs text-white/50">
                      {beliefs.data.context.summary}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Personality */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personality Vector</CardTitle>
            <span className="text-[10px] text-white/20">Voxis expression personality</span>
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
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-white/40">{p.label}</span>
                        <span className="text-xs text-white/30 tabular-nums">
                          {p.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-indigo-400/50 transition-all duration-500"
                          style={{ width: `${p.value * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {((personality.data.vocabulary_affinities?.length ?? 0) > 0 ||
                  (personality.data.thematic_references?.length ?? 0) > 0) && (
                  <div className="border-t border-white/[0.06] pt-3 flex flex-wrap gap-1.5">
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
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-400">
                      All personality values are zero. The seed may not have
                      initialized personality, or the birth process did not set
                      personality traits. Aurora has no voice character.
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
