"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  ThreadIdentityResponse,
  ThreadHealthResponse,
  ThreadSchemasResponse,
  ThreadCommitmentsResponse,
  ThreadCoherenceResponse,
  ThreadFingerprintSnapshot,
  ThreadChapterContextResponse,
  ThreadLifeStoryResponse,
  ThreadConflictsResponse,
  ThreadChaptersResponse,
  IdentitySchema,
  ThreadCommitment,
  ThreadConflict,
} from "@/lib/api-client";

const TABS = [
  "Identity",
  "Schemas",
  "Commitments",
  "Chapters",
  "Life Story",
  "Conflicts",
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
    <div style={{ paddingBottom: "3rem" }}>
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

      {/* Health metrics grid */}
      {health.data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            className="float-up float-up-1"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "1.25rem",
              animation: "cell-breathe 4s ease-in-out infinite",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "var(--ink-strong)",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              ◉ Idem Score
            </div>
            <div
              style={{
                fontSize: "24px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {(health.data.idem_score * 100).toFixed(0)}%
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "0.5rem",
              }}
            >
              Structural sameness
            </div>
          </div>

          <div
            className="float-up float-up-2"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "1.25rem",
              animation: "cell-breathe 4s ease-in-out infinite 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "var(--ink-strong)",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              ◎ Ipse Score
            </div>
            <div
              style={{
                fontSize: "24px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {(health.data.ipse_score * 100).toFixed(0)}%
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "0.5rem",
              }}
            >
              Promise-keeping
            </div>
          </div>

          <div
            className="float-up float-up-3"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "var(--ink-strong)",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              ≡ Total Schemas
            </div>
            <div
              style={{
                fontSize: "24px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {health.data.total_schemas}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "0.5rem",
              }}
            >
              Core beliefs
            </div>
          </div>

          <div
            className="float-up float-up-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "var(--ink-strong)",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              ▣ Total Chapters
            </div>
            <div
              style={{
                fontSize: "24px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {health.data.total_chapters}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "0.5rem",
              }}
            >
              Life narrative
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "2rem",
          padding: "0.75rem",
          background: "rgba(90, 200, 38, 0.04)",
          borderRadius: "8px",
          border: "1px solid rgba(90, 200, 38, 0.1)",
        }}
      >
        {TABS.map((t, idx) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                tab === t ? "rgba(90, 200, 38, 0.15)" : "transparent",
              color: tab === t ? "var(--lime)" : "var(--ink-muted)",
              borderBottom:
                tab === t ? "2px solid var(--lime)" : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Identity" && (
        <IdentityTab identity={identity.data} loading={identity.loading} />
      )}
      {tab === "Schemas" && <SchemasTab />}
      {tab === "Commitments" && <CommitmentsTab />}
      {tab === "Chapters" && <ChaptersTab />}
      {tab === "Life Story" && <LifeStoryTab />}
      {tab === "Conflicts" && <ConflictsTab />}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Life story */}
      {identity.life_story_summary && (
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              📖 Life Story
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              style={{
                fontSize: "14px",
                fontFamily: "var(--font-prose)",
                lineHeight: 1.6,
                color: "var(--ink-mid)",
                fontStyle: "italic",
              }}
            >
              &ldquo;{identity.life_story_summary}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
        }}
      >
        {/* Core schemas */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ◈ Core Beliefs
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {identity.core_schemas.length === 0 &&
            identity.established_schemas.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                }}
              >
                No established beliefs yet.
              </p>
            ) : (
              <>
                {identity.core_schemas.map((s, idx) => (
                  <SchemaRow key={s.id} schema={s} index={idx} />
                ))}
                {identity.established_schemas.map((s, idx) => (
                  <SchemaRow
                    key={s.id}
                    schema={s}
                    index={identity.core_schemas.length + idx}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Active commitments */}
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ⚡ Active Commitments
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {identity.active_commitments.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                }}
              >
                No commitments formed yet.
              </p>
            ) : (
              identity.active_commitments.map((c) => (
                <CommitmentRow key={c.id} commitment={c} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
        }}
      >
        {/* Current chapter */}
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ▣ Current Chapter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {identity.current_chapter_title ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {identity.current_chapter_title}
                </p>
                {identity.current_chapter_theme && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Theme: {identity.current_chapter_theme}
                  </p>
                )}
              </div>
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                }}
              >
                First chapter forming…
              </p>
            )}
          </CardContent>
        </Card>

        {/* Personality traits */}
        {Object.keys(identity.key_personality_traits ?? {}).length > 0 && (
          <Card className="float-up float-up-5">
            <CardHeader>
              <CardTitle
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                ◎ Personality Profile
              </CardTitle>
            </CardHeader>
            <CardContent
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
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
        <Card className="float-up float-up-6">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ↑ Recent Turning Points
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {identity.recent_turning_points.map((tp) => (
              <div key={tp.id} style={{ display: "flex", gap: "1rem" }}>
                <div
                  className="spore-ping"
                  style={{
                    height: "8px",
                    width: "8px",
                    borderRadius: "50%",
                    background: turningPointColor(tp.type),
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    {tp.description}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "var(--ink-muted)",
                      marginTop: "0.5rem",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {tp.type.replace(/_/g, " ")} · weight{" "}
                    {tp.narrative_weight.toFixed(2)}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-body)",
        }}
      >
        {schemas.data.total} schemas ·{" "}
        <span style={{ color: "var(--lime)" }}>
          idem {(schemas.data.idem_score * 100).toFixed(0)}%
        </span>
      </div>

      {order.map((strength, groupIdx) => {
        const list = groups[strength] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={strength} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                color: "var(--ink-strong)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {strengthIcon(strength)} {strength}
              <span
                style={{
                  marginLeft: "0.5rem",
                  color: "var(--ink-muted)",
                }}
              >
                {list.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {list.map((s, idx) => (
                <Card
                  key={s.id}
                  className={`float-up float-up-${Math.min(idx + 1, 8)}`}
                >
                  <SchemaCard schema={s} />
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Commitments Tab ─────────────────────────────────────────────

const FORMATION_TYPES = [
  "explicit_declaration",
  "crisis_resolution",
  "value_crystallization",
  "relational_bond",
] as const;
type FormationType = (typeof FORMATION_TYPES)[number];

function FormCommitmentDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [declaration, setDeclaration] = useState("");
  const [formationType, setFormationType] =
    useState<FormationType>("explicit_declaration");
  const [schemaId, setSchemaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    if (!declaration.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.threadFormCommitment(
        declaration.trim(),
        formationType,
        schemaId.trim() || undefined,
      );
      setDeclaration("");
      setFormationType("explicit_declaration");
      setSchemaId("");
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 26, 10, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Form Commitment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              color: "var(--ink-muted)",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--ink-mid)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--ink-muted)")
            }
          >
            ×
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label
              style={{
                fontSize: "9px",
                color: "var(--ink-strong)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Declaration
            </label>
            <textarea
              placeholder="I commit to…"
              value={declaration}
              onChange={(e) => setDeclaration(e.target.value)}
              rows={4}
              style={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                padding: "0.75rem",
                fontSize: "13px",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.5,
                resize: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label
              style={{
                fontSize: "9px",
                color: "var(--ink-strong)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Formation Type
            </label>
            <select
              value={formationType}
              onChange={(e) =>
                setFormationType(e.target.value as FormationType)
              }
              style={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                padding: "0.75rem",
                fontSize: "13px",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              {FORMATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label
              style={{
                fontSize: "9px",
                color: "var(--ink-strong)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Related Schema ID{" "}
              <span style={{ color: "var(--ink-muted)" }}>(optional)</span>
            </label>
            <Input
              placeholder="schema-uuid"
              value={schemaId}
              onChange={(e) => setSchemaId(e.target.value)}
            />
          </div>
          {error && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--gold-bright)",
              }}
            >
              {error}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              paddingTop: "0.5rem",
            }}
          >
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !declaration.trim()}
            >
              {submitting ? "Forming…" : "Form Commitment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitmentsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const commitments = useApi<ThreadCommitmentsResponse>(
    api.threadCommitments,
    { intervalMs: 10000 },
  );

  if (commitments.loading)
    return <EmptyState text="Loading commitments..." />;

  const { data } = commitments;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
            }}
          >
            {data ? (
              <>
                {data.total} commitments ·{" "}
                <span style={{ color: "var(--lime)" }}>
                  ipse {(data.ipse_score * 100).toFixed(0)}%
                </span>
                {data.strained.length > 0 && (
                  <span
                    style={{
                      marginLeft: "1rem",
                      color: "var(--gold-bright)",
                    }}
                  >
                    {data.strained.length} strained
                  </span>
                )}
              </>
            ) : (
              "No commitments yet"
            )}
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            + Form Commitment
          </Button>
        </div>

        {!data || data.total === 0 ? (
          <EmptyState text="No commitments formed yet. Commitments crystallise from core schemas, crisis resolutions, and explicit declarations." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Active */}
            {data.commitments.filter((c) => c.status === "active").length >
              0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  ⚡ Active
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {data.commitments
                    .filter((c) => c.status === "active")
                    .map((c, idx) => (
                      <Card
                        key={c.id}
                        className={`float-up float-up-${Math.min(idx + 1, 8)}`}
                      >
                        <CommitmentCard commitment={c} />
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Strained */}
            {data.strained.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    color: "var(--gold-bright)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  ◈ Strained
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {data.strained.map((c, idx) => (
                    <Card
                      key={c.id}
                      className={`float-up float-up-${Math.min(idx + 1, 8)}`}
                    >
                      <CommitmentCard commitment={c} strained />
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved */}
            {data.resolved.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  ✓ Resolved
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {data.resolved.map((c, idx) => (
                    <Card
                      key={c.id}
                      className={`float-up float-up-${Math.min(idx + 1, 8)}`}
                    >
                      <CommitmentCard commitment={c} resolved />
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <FormCommitmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => commitments.refetch?.()}
      />
    </>
  );
}

// ─── Chapters Tab ────────────────────────────────────────────────

function ChaptersTab() {
  const chapters = useApi<ThreadChaptersResponse>(api.threadChapters, {
    intervalMs: 10000,
  });

  if (chapters.loading) return <EmptyState text="Loading chapters..." />;
  if (!chapters.data || chapters.data.total === 0)
    return (
      <EmptyState text="No chapters yet. The organism's autobiography is just beginning." />
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {chapters.data.chapters.map((ch, idx) => (
        <Card
          key={ch.id}
          className={`float-up float-up-${Math.min(idx + 1, 8)}`}
        >
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {ch.title}
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {ch.theme && (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <strong>Theme:</strong> {ch.theme}
              </p>
            )}
            {ch.narrative_context && (
              <p
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-prose)",
                  lineHeight: 1.6,
                  color: "var(--ink-mid)",
                }}
              >
                {ch.narrative_context}
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                fontSize: "11px",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-body)",
              }}
            >
              <span>Events: {ch.total_events}</span>
              <span>Schemas: {ch.schema_influences?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Life Story Tab ──────────────────────────────────────────────

function LifeStoryTab() {
  const lifeStory = useApi<ThreadLifeStoryResponse>(api.threadLifeStory, {
    intervalMs: 15000,
  });

  if (lifeStory.loading)
    return <EmptyState text="Reconstructing life story..." />;
  if (!lifeStory.data)
    return (
      <EmptyState text="Life story not yet formed — the organism is gathering experience." />
    );

  return (
    <Card className="float-up float-up-1">
      <CardHeader>
        <CardTitle
          style={{
            fontSize: "13px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          The Organism's Narrative
        </CardTitle>
      </CardHeader>
      <CardContent
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {lifeStory.data.overall_narrative && (
          <p
            style={{
              fontSize: "14px",
              fontFamily: "var(--font-prose)",
              lineHeight: 1.8,
              color: "var(--ink-mid)",
            }}
          >
            {lifeStory.data.overall_narrative}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              padding: "1rem",
              background: "var(--bg)",
              borderRadius: "6px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                color: "var(--ink-strong)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Core Theme
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ink)",
                fontFamily: "var(--font-display)",
              }}
            >
              {lifeStory.data.core_theme || "Unfolding"}
            </p>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg)",
              borderRadius: "6px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                color: "var(--ink-strong)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Leitmotif
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ink)",
                fontFamily: "var(--font-prose)",
                fontStyle: "italic",
              }}
            >
              {lifeStory.data.leitmotif || "Emerging"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Conflicts Tab ──────────────────────────────────────────────

function ConflictsTab() {
  const conflicts = useApi<ThreadConflictsResponse>(api.threadConflicts, {
    intervalMs: 10000,
  });

  if (conflicts.loading) return <EmptyState text="Analysing conflicts..." />;
  if (!conflicts.data || conflicts.data.total === 0)
    return (
      <EmptyState text="No narrative conflicts detected. The organism's story is coherent." />
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {conflicts.data.conflicts.map((conf, idx) => (
        <Card
          key={conf.id}
          className={`float-up float-up-${Math.min(idx + 1, 8)}`}
        >
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {conf.description}
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-body)",
              }}
            >
              {conf.conflict_type?.replace(/_/g, " ")}
            </p>

            {/* Resolution progress */}
            {conf.resolution_progress !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Resolution
                </div>
                <div
                  className="bar-track"
                  style={{
                    height: "6px",
                    background: "rgba(90, 200, 38, 0.1)",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="bar-fill"
                    style={{
                      height: "100%",
                      width: `${conf.resolution_progress * 100}%`,
                      background: "var(--lime)",
                      borderRadius: "3px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Involved schemas */}
            {(conf.involved_schemas?.length ?? 0) > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <strong>Schemas involved:</strong> {conf.involved_schemas?.length ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Coherence Tab ──────────────────────────────────────────────

function CoherenceTab() {
  const coherence = useApi<ThreadCoherenceResponse>(api.threadCoherence, {
    intervalMs: 10000,
  });

  if (coherence.loading)
    return <EmptyState text="Computing narrative coherence..." />;
  if (!coherence.data)
    return (
      <EmptyState text="Coherence data not yet available." />
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Overall coherence score */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              Overall Coherence
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--lime)",
              }}
            >
              {((coherence.data.overall_coherence ?? 0) * 100).toFixed(0)}%
            </div>
            <Badge
              variant={
                coherence.data.narrative_state === "integrated"
                  ? "success"
                  : coherence.data.narrative_state === "fragmented"
                    ? "warning"
                    : "info"
              }
            >
              {coherence.data.narrative_state}
            </Badge>
          </CardContent>
        </Card>

        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              Schema Consistency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              style={{
                fontSize: "28px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {((coherence.data.schema_consistency ?? 0) * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              Commitment Fidelity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              style={{
                fontSize: "28px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {((coherence.data.commitment_fidelity ?? 0) * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coherence drivers */}
      {(coherence.data.coherence_drivers?.length ?? 0) > 0 && (
        <Card className="float-up float-up-4">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              What Holds This Story Together
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {coherence.data.coherence_drivers!.map((driver, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.75rem",
                  background: "var(--bg)",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    marginTop: "2px",
                  }}
                >
                  ✦
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--ink)",
                    }}
                  >
                    {driver.description}
                  </p>
                  {driver.impact && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--ink-soft)",
                        marginTop: "0.25rem",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      Impact: {driver.impact}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fragmentation risks */}
      {(coherence.data.fragmentation_risks?.length ?? 0) > 0 && (
        <Card className="float-up float-up-5">
          <CardHeader>
            <CardTitle
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--gold-bright)",
              }}
            >
              Fragmentation Risks
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {coherence.data.fragmentation_risks!.map((risk, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.75rem",
                  background: "rgba(232, 168, 32, 0.05)",
                  borderRadius: "6px",
                  border: "1px solid rgba(232, 168, 32, 0.15)",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    marginTop: "2px",
                    color: "var(--gold-bright)",
                  }}
                >
                  ⚠
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--ink)",
                    }}
                  >
                    {risk.description}
                  </p>
                  {risk.severity && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--gold-bright)",
                        marginTop: "0.25rem",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {risk.severity.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "3rem",
        textAlign: "center",
        color: "var(--ink-muted)",
        fontFamily: "var(--font-body)",
        fontSize: "13px",
      }}
    >
      {text}
    </div>
  );
}

function SchemaRow({
  schema,
  index,
}: {
  schema: IdentitySchema;
  index: number;
}) {
  return (
    <div
      style={{
        paddingBottom: "1rem",
        borderBottom:
          index % 2 === 0 ? "1px solid var(--border)" : "transparent",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          color: "var(--lime)",
          marginTop: "3px",
          flexShrink: 0,
        }}
      >
        ◈
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: "12px",
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
          }}
        >
          {schema.name}
        </p>
        {schema.description && (
          <p
            style={{
              fontSize: "11px",
              color: "var(--ink-soft)",
              marginTop: "0.25rem",
            }}
          >
            {schema.description}
          </p>
        )}
      </div>
    </div>
  );
}

function CommitmentRow({
  commitment,
}: {
  commitment: ThreadCommitment;
}) {
  return (
    <div
      style={{
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
      }}
    >
      <div className="spore-ping" style={{
        fontSize: "9px",
        color: "var(--lime)",
        marginTop: "2px",
        flexShrink: 0,
      }}>
        ⚡
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: "12px",
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
          }}
        >
          {commitment.declaration}
        </p>
        {commitment.formed_from && (
          <p
            style={{
              fontSize: "10px",
              color: "var(--ink-muted)",
              marginTop: "0.25rem",
              fontFamily: "var(--font-body)",
            }}
          >
            {commitment.formed_from}
          </p>
        )}
      </div>
    </div>
  );
}

function SchemaCard({ schema }: { schema: IdentitySchema }) {
  return (
    <CardContent
      style={{
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
            flex: 1,
          }}
        >
          {schema.name}
        </div>
        <Badge variant="muted">{schema.strength}</Badge>
      </div>
      {schema.description && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--ink-mid)",
            lineHeight: 1.5,
          }}
        >
          {schema.description}
        </p>
      )}
    </CardContent>
  );
}

function CommitmentCard({
  commitment,
  strained,
  resolved,
}: {
  commitment: ThreadCommitment;
  strained?: boolean;
  resolved?: boolean;
}) {
  return (
    <CardContent
      style={{
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontFamily: "var(--font-prose)",
            lineHeight: 1.6,
            color: "var(--ink)",
            flex: 1,
          }}
        >
          "{commitment.declaration}"
        </p>
        <Badge
          variant={
            resolved ? "muted" : strained ? "warning" : "success"
          }
        >
          {resolved ? "Resolved" : strained ? "Strained" : "Active"}
        </Badge>
      </div>

      {commitment.formed_from && (
        <p
          style={{
            fontSize: "11px",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-body)",
          }}
        >
          <strong>Formed from:</strong> {commitment.formed_from}
        </p>
      )}

      {commitment.fidelity_score !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "11px",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-body)",
          }}
        >
          <span>Fidelity: {(commitment.fidelity_score * 100).toFixed(0)}%</span>
        </div>
      )}
    </CardContent>
  );
}

function TraitBar({ trait, value }: { trait: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span>{trait}</span>
        <span>{(value * 100).toFixed(0)}%</span>
      </div>
      <div
        className="bar-track"
        style={{
          height: "5px",
          background: "rgba(90, 200, 38, 0.1)",
          borderRadius: "2.5px",
          overflow: "hidden",
        }}
      >
        <div
          className="bar-fill"
          style={{
            height: "100%",
            width: `${value * 100}%`,
            background: "var(--lime)",
            borderRadius: "2.5px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Color Helpers ───────────────────────────────────────────────

function strengthColor(strength: string): string {
  const colorMap: Record<string, string> = {
    core: "var(--lime)",
    established: "var(--ink)",
    developing: "var(--ink-mid)",
    nascent: "var(--ink-muted)",
  };
  return colorMap[strength] || "var(--ink-muted)";
}

function strengthIcon(strength: string): string {
  const iconMap: Record<string, string> = {
    core: "◈",
    established: "◉",
    developing: "◎",
    nascent: "◑",
  };
  return iconMap[strength] || "◈";
}

function turningPointColor(type: string): string {
  const colorMap: Record<string, string> = {
    triumph: "var(--lime)",
    crisis: "var(--gold-bright)",
    revelation: "var(--lime-bright)",
    loss: "var(--ink-mid)",
    transformation: "var(--lime)",
  };
  return colorMap[type] || "var(--ink-soft)";
}
