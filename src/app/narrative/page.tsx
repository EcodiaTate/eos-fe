"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  ThreadIdentityResponse,
  ThreadHealthResponse,
  ThreadSchemasResponse,
  ThreadCommitmentsResponse,
  ThreadCoherenceResponse,
  ThreadChapterContextResponse,
  IdentitySchema,
  ThreadCommitment,
} from "@/lib/api-client";

const TABS = [
  "Identity",
  "Schemas",
  "Commitments",
  "Chapter",
  "Coherence",
] as const;
type Tab = (typeof TABS)[number];

export default function NarrativePage() {
  const [tab, setTab] = useState<Tab>("Identity");

  const health = useApi<ThreadHealthResponse>(api.threadHealth, {
    intervalMs: 8000,
  });
  const identity = useApi<ThreadIdentityResponse>(api.threadIdentity, {
    intervalMs: 15000,
    enabled: tab === "Identity",
  });

  const coherenceLabel = health.data?.narrative_coherence ?? "unknown";
  const isFragmented =
    coherenceLabel === "fragmented" || coherenceLabel === "conflicted";
  const isIntegrated = coherenceLabel === "integrated";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Narrative Identity"
        description="The organism's living autobiography — chapters, core beliefs, promises, and the story so far."
      >
        {health.data && (
          <Badge
            variant={
              isIntegrated
                ? "success"
                : isFragmented
                  ? "warning"
                  : "info"
            }
          >
            {coherenceLabel}
          </Badge>
        )}
      </PageHeader>

      {/* Identity score row */}
      {health.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreCard
            label="Idem Score"
            tooltip="Structural sameness — how consistent is the character?"
            value={health.data.idem_score}
          />
          <ScoreCard
            label="Ipse Score"
            tooltip="Promise-keeping — how faithfully are commitments held?"
            value={health.data.ipse_score}
          />
          <StatCard label="Total Schemas" value={health.data.total_schemas} />
          <StatCard
            label="Total Chapters"
            value={health.data.total_chapters}
          />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-white/[0.02] p-1 border border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              tab === t
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Identity" && <IdentityTab identity={identity.data} loading={identity.loading} />}
      {tab === "Schemas" && <SchemasTab />}
      {tab === "Commitments" && <CommitmentsTab />}
      {tab === "Chapter" && <ChapterTab />}
      {tab === "Coherence" && <CoherenceTab />}
    </div>
  );
}

// ─── Identity Tab ────────────────────────────────────────────────

function IdentityTab({
  identity,
  loading,
}: {
  identity: ThreadIdentityResponse | null;
  loading: boolean;
}) {
  if (loading) return <EmptyState text="Assembling identity..." />;
  if (!identity)
    return (
      <EmptyState text="No identity data yet — the organism needs more experience." />
    );

  return (
    <div className="space-y-4">
      {/* Life story */}
      {identity.life_story_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Life Story</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70 leading-relaxed italic">
              &ldquo;{identity.life_story_summary}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core schemas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Core Beliefs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {identity.core_schemas.length === 0 &&
            identity.established_schemas.length === 0 ? (
              <p className="text-xs text-white/30">
                No established beliefs yet.
              </p>
            ) : (
              <>
                {identity.core_schemas.map((s) => (
                  <SchemaRow key={s.id} schema={s} />
                ))}
                {identity.established_schemas.map((s) => (
                  <SchemaRow key={s.id} schema={s} />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Active commitments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Active Commitments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {identity.active_commitments.length === 0 ? (
              <p className="text-xs text-white/30">No commitments formed yet.</p>
            ) : (
              identity.active_commitments.map((c) => (
                <CommitmentRow key={c.id} commitment={c} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current chapter + turning points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Current Chapter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {identity.current_chapter_title ? (
              <>
                <p className="text-sm font-medium text-white/80">
                  {identity.current_chapter_title}
                </p>
                {identity.current_chapter_theme && (
                  <p className="text-xs text-white/40 mt-1">
                    Theme: {identity.current_chapter_theme}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-white/30">
                First chapter forming…
              </p>
            )}
          </CardContent>
        </Card>

        {/* Personality traits */}
        {Object.keys(identity.key_personality_traits ?? {}).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-white/60">
                Personality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(identity.key_personality_traits).map(
                ([trait, value]) => (
                  <TraitBar key={trait} trait={trait} value={value} />
                ),
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Turning points */}
      {identity.recent_turning_points?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Recent Turning Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {identity.recent_turning_points.map((tp) => (
              <div key={tp.id} className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${turningPointColor(tp.type)}`}
                />
                <div>
                  <p className="text-sm text-white/70">{tp.description}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {tp.type} · weight {tp.narrative_weight.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Schemas Tab ─────────────────────────────────────────────────

function SchemasTab() {
  const schemas = useApi<ThreadSchemasResponse>(api.threadSchemas, {
    intervalMs: 10000,
  });

  if (schemas.loading) return <EmptyState text="Loading schemas..." />;
  if (!schemas.data || schemas.data.total === 0)
    return (
      <EmptyState text="No identity schemas formed yet. The organism needs more experience to crystallise core beliefs." />
    );

  const groups = schemas.data.schemas;
  const order: (keyof typeof groups)[] = [
    "core",
    "established",
    "developing",
    "nascent",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          {schemas.data.total} schemas ·{" "}
          <span className="text-teal-400/70">
            idem {(schemas.data.idem_score * 100).toFixed(0)}%
          </span>
        </p>
      </div>

      {order.map((strength) => {
        const list = groups[strength] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={strength}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${strengthColor(strength)}`}
              >
                {strength}
              </span>
              <span className="text-xs text-white/20">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map((s) => (
                <SchemaCard key={s.id} schema={s} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Commitments Tab ─────────────────────────────────────────────

function CommitmentsTab() {
  const commitments = useApi<ThreadCommitmentsResponse>(
    api.threadCommitments,
    { intervalMs: 10000 },
  );

  if (commitments.loading)
    return <EmptyState text="Loading commitments..." />;
  if (!commitments.data || commitments.data.total === 0)
    return (
      <EmptyState text="No commitments formed yet. Commitments crystallise from core schemas, crisis resolutions, and explicit declarations." />
    );

  const { data } = commitments;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          {data.total} commitments ·{" "}
          <span className="text-indigo-400/70">
            ipse {(data.ipse_score * 100).toFixed(0)}%
          </span>
          {data.strained.length > 0 && (
            <span className="ml-2 text-amber-400/70">
              {data.strained.length} strained
            </span>
          )}
        </p>
      </div>

      {data.commitments.map((c) => (
        <CommitmentCard key={c.id} commitment={c} />
      ))}
    </div>
  );
}

// ─── Chapter Tab ─────────────────────────────────────────────────

function ChapterTab() {
  const chapter = useApi<ThreadChapterContextResponse>(
    api.threadCurrentChapter,
    { intervalMs: 15000 },
  );

  if (chapter.loading) return <EmptyState text="Loading chapter..." />;
  if (!chapter.data)
    return <EmptyState text="No chapter context available yet." />;

  const c = chapter.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white/90">
                {c.title || "Forming…"}
              </CardTitle>
              {c.theme && (
                <p className="text-xs text-white/40 mt-1">
                  Theme: {c.theme}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant={c.status === "forming" ? "info" : "success"}>
                {c.status}
              </Badge>
              {c.arc_type && c.arc_type !== "unknown" && (
                <Badge variant="muted">{c.arc_type}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-white/80">
                {c.episode_count}
              </div>
              <div className="text-xs text-white/30 mt-0.5">Episodes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white/80">
                {c.scenes.length}
              </div>
              <div className="text-xs text-white/30 mt-0.5">Scenes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white/80">
                {c.turning_points.length}
              </div>
              <div className="text-xs text-white/30 mt-0.5">
                Turning Points
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {c.scenes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Scenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.scenes.map((scene, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-400/40 flex-shrink-0" />
                <p className="text-sm text-white/60">{scene}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {c.turning_points.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60">
              Turning Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.turning_points.map((tp, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400/40 flex-shrink-0" />
                <p className="text-sm text-white/60">{tp}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Coherence Tab ───────────────────────────────────────────────

function CoherenceTab() {
  const coherence = useApi<ThreadCoherenceResponse>(api.threadCoherence, {
    intervalMs: 30000,
  });

  if (coherence.loading) return <EmptyState text="Loading coherence data..." />;
  if (!coherence.data || coherence.data.fingerprint_count === 0)
    return (
      <EmptyState text="No behavioral fingerprints yet. Fingerprints are computed every 1000 cognitive cycles to track diachronic identity drift." />
    );

  const { data } = coherence;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-white/60">
            Diachronic Coherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-white/40 mb-4">
            {data.fingerprint_count} behavioral fingerprints recorded. Each
            snapshot captures 29 dimensions of cognitive behavior — personality,
            drives, affect, goals, and interactions. Wasserstein distance between
            consecutive snapshots classifies change as growth, transition, or
            drift.
          </p>

          <div className="space-y-2">
            {data.recent_fingerprints.map((fp, i) => (
              <div
                key={fp.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="text-sm text-white/70">Epoch {fp.epoch}</p>
                  <p className="text-xs text-white/30">
                    {new Date(fp.window_start * 1000).toLocaleDateString()} →{" "}
                    {new Date(fp.window_end * 1000).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={i === 0 ? "info" : "muted"}>
                  {i === 0 ? "latest" : `−${i}`}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Reusable Components ─────────────────────────────────────────

function SchemaCard({ schema }: { schema: IdentitySchema }) {
  const evidenceTotal =
    schema.confirmation_count + schema.disconfirmation_count;
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 leading-snug">
              {schema.statement}
            </p>
            {schema.behavioral_tendency && (
              <p className="text-xs text-white/40 mt-1">
                → {schema.behavioral_tendency}
              </p>
            )}
            {schema.trigger_contexts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {schema.trigger_contexts.slice(0, 3).map((ctx, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30"
                  >
                    {ctx}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge variant={schemaValenceBadge(schema.valence)}>
              {schema.valence}
            </Badge>
            {evidenceTotal > 0 && (
              <span className="text-[10px] text-white/25">
                {schema.confirmation_count}✓{" "}
                {schema.disconfirmation_count > 0 &&
                  `${schema.disconfirmation_count}✗`}
              </span>
            )}
          </div>
        </div>

        {/* Evidence ratio bar */}
        {evidenceTotal > 0 && (
          <div className="mt-2 h-0.5 w-full rounded bg-white/[0.06]">
            <div
              className="h-full rounded bg-teal-400/40"
              style={{ width: `${schema.evidence_ratio * 100}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SchemaRow({ schema }: { schema: IdentitySchema }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${schemaStrengthDot(schema.strength)}`}
      />
      <p className="text-sm text-white/70 leading-snug">{schema.statement}</p>
    </div>
  );
}

function CommitmentCard({ commitment: c }: { commitment: ThreadCommitment }) {
  const pct = c.tests_faced > 0 ? (c.tests_held / c.tests_faced) * 100 : null;
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-white/80 flex-1 leading-snug">
            {c.statement}
          </p>
          <Badge variant={commitmentStatusBadge(c.status)}>{c.status}</Badge>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-white/30">
            {c.source.replace(/_/g, " ")}
          </span>
          {c.tests_faced > 0 && (
            <span className="text-xs text-white/30">
              {c.tests_held}/{c.tests_faced} tests held
            </span>
          )}
          <span
            className={`text-xs font-medium ml-auto ${fidelityColor(c.fidelity)}`}
          >
            {(c.fidelity * 100).toFixed(0)}% fidelity
          </span>
        </div>
        {pct !== null && (
          <div className="mt-1.5 h-0.5 w-full rounded bg-white/[0.06]">
            <div
              className={`h-full rounded ${fidelityBarColor(c.fidelity)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommitmentRow({ commitment: c }: { commitment: ThreadCommitment }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${fidelityDot(c.fidelity)}`}
      />
      <p className="text-sm text-white/70 leading-snug">{c.statement}</p>
    </div>
  );
}

function TraitBar({ trait, value }: { trait: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-white/40 capitalize">{trait}</span>
        <span className="text-white/30">{value.toFixed(2)}</span>
      </div>
      <div className="h-1 w-full rounded bg-white/[0.06]">
        <div
          className="h-full rounded bg-indigo-400/40"
          style={{ width: `${Math.min(Math.abs(value) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider">
          {label}
        </div>
        <div
          className={`text-2xl font-semibold mt-1 ${scoreColor(value)}`}
          title={tooltip}
        >
          {(value * 100).toFixed(0)}%
        </div>
        <div className="mt-1.5 h-0.5 w-full rounded bg-white/[0.06]">
          <div
            className={`h-full rounded ${scoreBarColor(value)}`}
            style={{ width: `${value * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-2xl font-semibold text-white/70 mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-white/30 text-sm text-center max-w-sm mx-auto">
      {text}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function strengthColor(strength: string) {
  switch (strength) {
    case "core":
      return "text-amber-400/80";
    case "established":
      return "text-teal-400/70";
    case "developing":
      return "text-sky-400/60";
    default:
      return "text-white/30";
  }
}

function schemaStrengthDot(strength: string) {
  switch (strength) {
    case "core":
      return "bg-amber-400/70";
    case "established":
      return "bg-teal-400/60";
    case "developing":
      return "bg-sky-400/50";
    default:
      return "bg-white/20";
  }
}

function schemaValenceBadge(
  valence: string,
): "success" | "warning" | "muted" {
  switch (valence) {
    case "adaptive":
      return "success";
    case "maladaptive":
      return "warning";
    default:
      return "muted";
  }
}

function commitmentStatusBadge(
  status: string,
): "success" | "warning" | "danger" | "info" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "tested":
      return "info";
    case "strained":
      return "warning";
    case "broken":
      return "danger";
    case "evolved":
      return "muted";
    default:
      return "muted";
  }
}

function fidelityColor(fidelity: number) {
  if (fidelity >= 0.8) return "text-emerald-400/70";
  if (fidelity >= 0.6) return "text-teal-400/60";
  if (fidelity >= 0.4) return "text-amber-400/60";
  return "text-red-400/60";
}

function fidelityBarColor(fidelity: number) {
  if (fidelity >= 0.8) return "bg-emerald-400/40";
  if (fidelity >= 0.6) return "bg-teal-400/40";
  if (fidelity >= 0.4) return "bg-amber-400/40";
  return "bg-red-400/40";
}

function fidelityDot(fidelity: number) {
  if (fidelity >= 0.7) return "bg-emerald-400/60";
  if (fidelity >= 0.4) return "bg-amber-400/50";
  return "bg-red-400/50";
}

function scoreColor(value: number) {
  if (value >= 0.7) return "text-emerald-400/80";
  if (value >= 0.4) return "text-amber-400/70";
  return "text-red-400/60";
}

function scoreBarColor(value: number) {
  if (value >= 0.7) return "bg-emerald-400/40";
  if (value >= 0.4) return "bg-amber-400/40";
  return "bg-red-400/40";
}

function turningPointColor(type: string) {
  switch (type) {
    case "revelation":
      return "bg-sky-400/70";
    case "crisis":
      return "bg-red-400/70";
    case "resolution":
      return "bg-emerald-400/70";
    case "rupture":
      return "bg-amber-400/70";
    case "growth":
      return "bg-teal-400/70";
    default:
      return "bg-white/30";
  }
}
