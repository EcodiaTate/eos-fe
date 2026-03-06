"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api, ApiError } from "@/lib/api-client";
import type {
  VoxisMetricsResponse,
  VoxisQueueResponse,
  VoxisDiversityResponse,
  VoxisReceptionResponse,
  VoxisDynamicsResponse,
  VoxisVoiceResponse,
  VoxisConversationsResponse,
  VoxisConfigResponse,
  VoxisHealthResponse,
  PersonalityResponse,
  VoxisConfigUpdateRequest,
} from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/formatters";

// ─── Types ────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "personality"
  | "queue"
  | "conversations"
  | "diversity"
  | "reception"
  | "dynamics"
  | "voice"
  | "config";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "personality", label: "Personality" },
  { id: "queue", label: "Queue" },
  { id: "conversations", label: "Conversations" },
  { id: "diversity", label: "Diversity" },
  { id: "reception", label: "Reception" },
  { id: "dynamics", label: "Dynamics" },
  { id: "voice", label: "Voice" },
  { id: "config", label: "Config" },
];

// ─── Helpers ──────────────────────────────────────────────────────

function fmt2(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2);
}

function fmt3(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(3);
}

function affectColor(v: number): string {
  if (v >= 0.65) return "var(--lime-bright)";
  if (v >= 0.35) return "var(--gold-bright)";
  return "var(--ink-soft)";
}

function barColor(v: number): string {
  if (v >= 0.65) return "var(--lime)";
  if (v >= 0.35) return "var(--gold-bright)";
  return "var(--ink-soft)";
}

function triggerLabel(key: string): string {
  return key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────

function StatRow({
  label,
  value,
  dim,
}: {
  label: string;
  value: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 border-b last:border-0 transition-opacity",
        dim && "opacity-50",
      )}
      style={{
        borderColor: "var(--border)",
      }}
    >
      <span style={{
        fontSize: "9px",
        color: "var(--ink-soft)",
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        letterSpacing: "0.05em",
      }}>
        {label.toUpperCase()}
      </span>
      <span style={{
        fontSize: "12px",
        fontFamily: "var(--font-body)",
        color: "var(--ink)",
        fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  );
}

function PersonalityBar({
  label,
  value,
  onAdjust,
}: {
  label: string;
  value: number;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{
        width: "140px",
        fontSize: "11px",
        color: "var(--ink-strong)",
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        flex: "0 0 auto",
      }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
        background: "var(--border)",
      }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: pct(value),
            background: barColor(value),
            color: barColor(value),
          }}
        />
      </div>
      <span style={{
        width: "40px",
        textAlign: "right",
        fontSize: "11px",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        color: affectColor(value),
      }}>
        {fmt2(value)}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onAdjust(-0.03)}
          style={{
            height: "28px",
            width: "28px",
            borderRadius: "4px",
            fontSize: "11px",
            background: "var(--border)",
            color: "var(--ink-soft)",
            cursor: "pointer",
            border: "1px solid var(--border)",
            transition: "all 150ms ease",
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--lime)";
            e.currentTarget.style.color = "var(--ink-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--border)";
            e.currentTarget.style.color = "var(--ink-soft)";
          }}
        >
          −
        </button>
        <button
          onClick={() => onAdjust(0.03)}
          style={{
            height: "28px",
            width: "28px",
            borderRadius: "4px",
            fontSize: "11px",
            background: "var(--border)",
            color: "var(--ink-soft)",
            cursor: "pointer",
            border: "1px solid var(--border)",
            transition: "all 150ms ease",
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--lime)";
            e.currentTarget.style.color = "var(--ink-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--border)";
            e.currentTarget.style.color = "var(--ink-soft)";
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Tab Views ────────────────────────────────────────────────────

function OverviewTab({
  health,
  metrics,
}: {
  health: VoxisHealthResponse | null;
  metrics: VoxisMetricsResponse | null;
}) {
  if (!metrics?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Voxis not initialised
      </div>
    );
  }

  const silenceRate = metrics.silence_rate;
  const total = metrics.total_speak + metrics.total_silence;

  return (
    <div className="space-y-4">
      {/* Key counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { label: "Expressions", value: metrics.total_expressions, icon: "◉" },
            { label: "Silence rate", value: pct(silenceRate, 1), icon: "◎" },
            {
              label: "Honesty rejections",
              value: metrics.honesty_rejections,
              icon: "◈",
            },
            {
              label: "Diversity rejections",
              value: metrics.diversity_rejections,
              icon: "⚡",
            },
          ] as { label: string; value: React.ReactNode; icon: string }[]
        ).map(({ label, value, icon }, idx) => (
          <Card key={label} className={`float-up float-up-${idx + 1}`}>
            <CardContent style={{
              padding: "16px",
            }}>
              <div style={{
                fontSize: "9px",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                letterSpacing: "0.1em",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}>
                <span style={{ color: "var(--lime)", marginRight: "4px" }}>{icon}</span>
                {label}
              </div>
              <div style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-display)",
              }}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Speak vs silence bar */}
      {total > 0 && (
        <Card className="float-up float-up-5">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◑</span>
              Speak / Silence Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 rounded-full overflow-hidden" style={{
              background: "var(--border)",
            }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: pct(metrics.total_speak / total),
                  background: "var(--lime)",
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: pct(metrics.total_silence / total),
                  background: "var(--ink-muted)",
                  opacity: 0.3,
                }}
              />
            </div>
            <div className="flex justify-between mt-2" style={{
              fontSize: "9px",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
            }}>
              <span>Speak: {metrics.total_speak}</span>
              <span>Silence: {metrics.total_silence}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown by trigger */}
      {Object.keys(metrics.expressions_by_trigger).length > 0 && (
        <Card className="float-up float-up-6">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>≡</span>
              By Trigger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(metrics.expressions_by_trigger)
              .sort(([, a], [, b]) => b - a)
              .map(([key, count]) => {
                const maxCount = Math.max(
                  ...Object.values(metrics.expressions_by_trigger),
                );
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span style={{
                      width: "140px",
                      fontSize: "11px",
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                      flex: "0 0 auto",
                      fontWeight: 500,
                    }}>
                      {triggerLabel(key)}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                      background: "var(--border)",
                    }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: pct(count / maxCount),
                          background: "var(--lime)",
                        }}
                      />
                    </div>
                    <span style={{
                      width: "32px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontFamily: "var(--font-body)",
                      color: "var(--ink-strong)",
                      fontWeight: 600,
                    }}>
                      {count}
                    </span>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Breakdown by channel */}
      {Object.keys(metrics.expressions_by_channel).length > 0 && (
        <Card className="float-up float-up-7">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>▣</span>
              By Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.expressions_by_channel)
                .sort(([, a], [, b]) => b - a)
                .map(([key, count]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 rounded transition-all hover:bg-white/[0.04]"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      padding: "4px 8px",
                    }}
                  >
                    <span style={{
                      fontSize: "10px",
                      color: "var(--ink-soft)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 500,
                    }}>
                      {triggerLabel(key)}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-body)",
                      color: "var(--ink-strong)",
                      fontWeight: 600,
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue summary */}
      <Card className="float-up float-up-8">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>↑</span>
            Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Queued (total)"
            value={metrics.total_queued}
          />
          <StatRow
            label="Queue delivered"
            value={metrics.total_queue_delivered}
          />
          <StatRow
            label="Background task failures"
            value={metrics.background_task_failures}
            dim={metrics.background_task_failures === 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PersonalityTab({
  personality,
  onRefetch,
}: {
  personality: PersonalityResponse | null;
  onRefetch: () => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const adjust = useCallback(
    async (dimension: string, delta: number) => {
      setAdjusting(true);
      setNotification(null);
      try {
        const res = await api.voxisUpdatePersonality({ [dimension]: delta });
        const applied = res.applied_delta[dimension];
        setNotification(
          `${dimension}: ${applied >= 0 ? "+" : ""}${applied?.toFixed(3)} applied`,
        );
        onRefetch();
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.detail
            : err instanceof Error
              ? err.message
              : "Unknown error";
        setNotification(`Error: ${msg}`);
      } finally {
        setAdjusting(false);
      }
    },
    [onRefetch],
  );

  if (!personality) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        No personality data
      </div>
    );
  }

  const dims: [keyof PersonalityResponse, string][] = [
    ["warmth", "Warmth"],
    ["directness", "Directness"],
    ["verbosity", "Verbosity"],
    ["formality", "Formality"],
    ["curiosity_expression", "Curiosity expression"],
    ["humour", "Humour"],
    ["empathy_expression", "Empathy expression"],
    ["confidence_display", "Confidence display"],
    ["metaphor_use", "Metaphor use"],
  ];

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◉</span>
            Personality Vector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notification && (
            <div
              style={{
                fontSize: "11px",
                borderRadius: "4px",
                padding: "8px 12px",
                border: notification.startsWith("Error")
                  ? "1px solid var(--gold-bright)"
                  : "1px solid var(--lime)",
                background: notification.startsWith("Error")
                  ? "rgba(232, 168, 32, 0.05)"
                  : "rgba(90, 200, 38, 0.05)",
                color: notification.startsWith("Error")
                  ? "var(--gold-bright)"
                  : "var(--lime)",
              }}
            >
              {notification}
            </div>
          )}
          <p style={{
            fontSize: "10px",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            lineHeight: "1.4",
          }}>
            Adjustments are capped at ±0.03 per dimension by Voxis (MAX_PERSONALITY_DELTA).
          </p>
          <div className={cn("space-y-3", adjusting && "opacity-50 pointer-events-none")}>
            {dims.map(([key, label]) => {
              const v = personality[key];
              if (typeof v !== "number") return null;
              return (
                <PersonalityBar
                  key={key}
                  label={label}
                  value={v}
                  onAdjust={(delta) => adjust(key as string, delta)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vocabulary & themes */}
      {personality.vocabulary_affinities.length > 0 && (
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
              Vocabulary Affinities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {personality.vocabulary_affinities.map((v) => (
                <Badge key={v} variant="muted">
                  {v}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {personality.thematic_references.length > 0 && (
        <Card className="float-up float-up-3">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◈</span>
              Thematic References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {personality.thematic_references.map((v) => (
                <Badge key={v} variant="info">
                  {v}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QueueTab({
  queue,
  onDrain,
  draining,
}: {
  queue: VoxisQueueResponse | null;
  onDrain: () => void;
  draining: boolean;
}) {
  if (!queue?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Queue engine not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>↑</span>
              Expression Queue
            </CardTitle>
            <Button
              onClick={onDrain}
              disabled={draining || queue.queue_size === 0}
              style={{
                fontSize: "10px",
                height: "28px",
                paddingLeft: "12px",
                paddingRight: "12px",
                background: draining || queue.queue_size === 0 ? "var(--border)" : "var(--lime)",
                color: draining || queue.queue_size === 0 ? "var(--ink-muted)" : "var(--ink-strong)",
                cursor: draining || queue.queue_size === 0 ? "not-allowed" : "pointer",
                transition: "all 150ms ease",
                border: "none",
                borderRadius: "4px",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
              }}
            >
              {draining ? "Draining…" : "Drain now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Queue size"
            value={`${queue.queue_size} / ${queue.max_size}`}
          />
          <StatRow
            label="Delivery threshold"
            value={fmt2(queue.delivery_threshold)}
          />
          <StatRow
            label="Highest relevance"
            value={fmt2(queue.highest_relevance)}
          />
          <StatRow label="Total enqueued" value={queue.total_enqueued} />
          <StatRow label="Total delivered" value={queue.total_delivered} />
          <StatRow label="Total expired" value={queue.total_expired} />
          <StatRow label="Total evicted" value={queue.total_evicted} />
        </CardContent>
      </Card>

      {queue.items.length > 0 && (
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
              Queued Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queue.items.map((item) => (
                <div
                  key={item.intent_id}
                  className="flex items-center gap-3 rounded transition-all hover:bg-white/[0.02]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    padding: "10px 12px",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-body)",
                      color: "var(--ink-strong)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {item.trigger}
                    </div>
                    <div style={{
                      fontSize: "9px",
                      color: "var(--ink-muted)",
                      marginTop: "2px",
                      fontFamily: "var(--font-body)",
                      fontWeight: 500,
                    }}>
                      {item.queued_at_seconds.toFixed(0)}s ago · t½={item.halflife_seconds}s
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-body)",
                      color: "var(--lime)",
                      fontWeight: 600,
                    }}>
                      {fmt2(item.current_relevance)}
                    </div>
                    <div style={{
                      fontSize: "9px",
                      color: "var(--ink-muted)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 500,
                    }}>
                      / {fmt2(item.initial_relevance)}
                    </div>
                  </div>
                  {/* Decay bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{
                    width: "64px",
                    flex: "0 0 auto",
                    background: "var(--border)",
                  }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: pct(
                          item.initial_relevance > 0
                            ? item.current_relevance / item.initial_relevance
                            : 0,
                        ),
                        background: "var(--lime)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {queue.items.length === 0 && (
        <div className="text-center text-sm text-white/20 py-6">
          Queue is empty
        </div>
      )}
    </div>
  );
}

function ConversationsTab({
  data,
  onClose,
}: {
  data: VoxisConversationsResponse | null;
  onClose: (id: string) => void;
}) {
  if (!data?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Conversation manager not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◉</span>
            Active Conversations{" "}
            <span style={{
              color: "var(--ink-soft)",
              fontWeight: 400,
              fontSize: "10px",
              fontFamily: "var(--font-body)",
            }}>
              {data.total_active} / {data.max_active}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.active_conversations.length === 0 ? (
            <div style={{
              fontSize: "12px",
              color: "var(--ink-soft)",
              padding: "16px 0",
              textAlign: "center",
            }}>
              No active conversations
            </div>
          ) : (
            <div className="space-y-2">
              {data.active_conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  className="rounded transition-all hover:bg-white/[0.02]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    padding: "12px",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{
                          fontSize: "9px",
                          fontFamily: "var(--font-body)",
                          color: "var(--ink-soft)",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "112px",
                          whiteSpace: "nowrap",
                        }}>
                          {conv.conversation_id.slice(0, 12)}…
                        </span>
                        <Badge variant="muted">
                          {conv.message_count} msgs
                        </Badge>
                        {conv.last_speaker && (
                          <Badge variant="info">{conv.last_speaker}</Badge>
                        )}
                        {conv.emotional_arc_latest !== null && (
                          <Badge
                            variant={
                              conv.emotional_arc_latest > 0.1
                                ? "success"
                                : conv.emotional_arc_latest < -0.1
                                  ? "danger"
                                  : "muted"
                            }
                          >
                            v:{conv.emotional_arc_latest.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {conv.last_message_preview && (
                        <p style={{
                          fontSize: "10px",
                          color: "var(--ink-soft)",
                          marginTop: "4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-prose)",
                        }}>
                          {conv.last_message_preview}
                        </p>
                      )}
                      {conv.dominant_topics.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {conv.dominant_topics.map((t) => (
                            <span
                              key={t}
                              style={{
                                fontSize: "8px",
                                color: "var(--ink-muted)",
                                background: "var(--border)",
                                borderRadius: "2px",
                                padding: "2px 4px",
                                fontFamily: "var(--font-body)",
                                fontWeight: 500,
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onClose(conv.conversation_id)}
                      style={{
                        fontSize: "9px",
                        color: "var(--ink-muted)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 0",
                        flex: "0 0 auto",
                        marginTop: "2px",
                        transition: "color 150ms ease",
                        fontFamily: "var(--font-body)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold-bright)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink-muted)"}
                    >
                      close
                    </button>
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

function DiversityTab({
  data,
}: {
  data: VoxisDiversityResponse | null;
}) {
  if (!data?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Diversity tracker not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
            Diversity Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Window size" value={data.window_size} />
          <StatRow
            label="Recent tracked"
            value={data.recent_expressions_tracked}
          />
          <StatRow
            label="Diversity threshold"
            value={fmt2(data.threshold)}
          />
          <StatRow
            label="Total diversity rejections"
            value={data.total_diversity_rejections}
          />
        </CardContent>
      </Card>

      {(data.last_composite_score !== null ||
        data.last_ngram_score !== null) && (
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◑</span>
              Last Expression Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                {
                  label: "Composite",
                  value: data.last_composite_score,
                  weight: "n-gram^0.35 × semantic^0.40 × opener^0.25",
                },
                {
                  label: "N-gram diversity",
                  value: data.last_ngram_score,
                  weight: "weight: 0.35",
                },
                {
                  label: "Semantic diversity",
                  value: data.last_semantic_score,
                  weight: "weight: 0.40",
                },
                {
                  label: "Opener diversity",
                  value: data.last_opener_score,
                  weight: "weight: 0.25",
                },
              ] as { label: string; value: number | null; weight: string }[]
            ).map(({ label, value, weight }) => (
              <div key={label} className="flex items-center gap-3">
                <div style={{ width: "140px", flex: "0 0 auto" }}>
                  <div style={{
                    fontSize: "11px",
                    color: "var(--ink-strong)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                  }}>{label}</div>
                  <div style={{
                    fontSize: "8px",
                    color: "var(--ink-muted)",
                    marginTop: "2px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                  }}>{weight}</div>
                </div>
                {value !== null ? (
                  <>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                      background: "var(--border)",
                    }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: pct(value),
                          background: value >= data.threshold ? "var(--lime)" : "var(--gold-bright)",
                        }}
                      />
                    </div>
                    <span style={{
                      width: "40px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontFamily: "var(--font-body)",
                      color: value >= data.threshold ? "var(--lime)" : "var(--gold-bright)",
                      fontWeight: 600,
                    }}>
                      {fmt2(value)}
                    </span>
                    {value < data.threshold && (
                      <Badge variant="warning">repetitive</Badge>
                    )}
                  </>
                ) : (
                  <span style={{
                    fontSize: "11px",
                    color: "var(--ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}>—</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReceptionTab({
  data,
}: {
  data: VoxisReceptionResponse | null;
}) {
  if (!data?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Reception engine not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◉</span>
            Reception Feedback Loop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Total correlated" value={data.total_correlated} />
          <StatRow label="Total expired (no response)" value={data.total_expired} />
          <StatRow label="Pending (awaiting response)" value={data.pending_count} />
        </CardContent>
      </Card>

      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
            Average Reception Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { label: "Understood", value: data.avg_understood, range: "0–1" },
              {
                label: "Emotional impact",
                value: data.avg_emotional_impact,
                range: "−1 to +1",
              },
              { label: "Engagement", value: data.avg_engagement, range: "0–1" },
              {
                label: "Satisfaction",
                value: data.avg_satisfaction,
                range: "0–1 (weighted)",
              },
            ] as { label: string; value: number | null; range: string }[]
          ).map(({ label, value, range }) => (
            <div key={label} className="flex items-center gap-3">
              <div style={{ width: "140px", flex: "0 0 auto" }}>
                <div style={{
                  fontSize: "11px",
                  color: "var(--ink-strong)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                }}>{label}</div>
                <div style={{
                  fontSize: "8px",
                  color: "var(--ink-muted)",
                  marginTop: "2px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}>{range}</div>
              </div>
              {value !== null ? (
                <>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                    background: "var(--border)",
                  }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: pct(Math.abs(value) / (label === "Emotional impact" ? 1 : 1)),
                        background: "var(--lime)",
                      }}
                    />
                  </div>
                  <span style={{
                    width: "40px",
                    textAlign: "right",
                    fontSize: "11px",
                    fontFamily: "var(--font-body)",
                    color: "var(--lime)",
                    fontWeight: 600,
                  }}>
                    {fmt2(value)}
                  </span>
                </>
              ) : (
                <span style={{
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-body)",
                }}>No data yet</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DynamicsTab({
  data,
}: {
  data: VoxisDynamicsResponse | null;
}) {
  if (!data?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Dynamics engine not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--ink)",
            }}>
              <span style={{ color: "var(--lime)", marginRight: "4px" }}>◉</span>
              Conversation Dynamics
            </CardTitle>
            {data.repair_mode && (
              <Badge variant="warning">repair mode</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <StatRow label="Total turns" value={data.total_turns} />
          <StatRow
            label="Avg response time"
            value={
              data.avg_response_time_s !== null
                ? `${data.avg_response_time_s.toFixed(1)}s`
                : "—"
            }
          />
          <StatRow
            label="Avg user word count"
            value={fmt2(data.avg_user_word_count)}
          />
          <StatRow
            label="Repair signals"
            value={data.repair_signal_count}
          />
          <StatRow label="Coherence breaks" value={data.coherence_breaks} />
        </CardContent>
      </Card>

      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
            Emotional Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span style={{
              width: "140px",
              fontSize: "11px",
              color: "var(--ink-strong)",
              fontFamily: "var(--font-body)",
              flex: "0 0 auto",
              fontWeight: 600,
            }}>
              Valence trend
            </span>
            {data.emotional_trajectory_valence !== null ? (
              <>
                <div className="flex-1 relative h-2 rounded-full overflow-hidden" style={{
                  background: "var(--border)",
                }}>
                  {/* centre line */}
                  <div className="absolute inset-y-0 left-1/2 w-px" style={{
                    background: "var(--ink-muted)",
                    opacity: 0.3,
                  }} />
                  <div
                    className="absolute inset-y-0 transition-all duration-500 rounded-full"
                    style={{
                      width: pct(Math.abs(data.emotional_trajectory_valence) / 2),
                      background: data.emotional_trajectory_valence >= 0 ? "var(--lime)" : "var(--gold-bright)",
                      left: data.emotional_trajectory_valence >= 0 ? "50%" : "auto",
                      right: data.emotional_trajectory_valence < 0 ? "50%" : "auto",
                    }}
                  />
                </div>
                <span style={{
                  width: "40px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontFamily: "var(--font-body)",
                  color: data.emotional_trajectory_valence >= 0 ? "var(--lime)" : "var(--gold-bright)",
                  fontWeight: 600,
                }}>
                  {fmt2(data.emotional_trajectory_valence)}
                </span>
              </>
            ) : (
              <span style={{
                fontSize: "11px",
                color: "var(--ink-muted)",
                fontFamily: "var(--font-body)",
              }}>—</span>
            )}
          </div>
          <StatRow
            label="Volatility"
            value={fmt2(data.emotional_trajectory_volatility)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function VoiceTab({
  data,
}: {
  data: VoxisVoiceResponse | null;
}) {
  if (!data?.initialized) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Voice engine not initialised
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>⚡</span>
            TTS Voice Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatRow label="Base voice" value={data.base_voice || "—"} />

          {(
            [
              { label: "Speed", value: data.speed, min: 0.75, max: 1.3 },
              { label: "Pitch shift", value: data.pitch_shift, min: -0.15, max: 0.15 },
              { label: "Emphasis", value: data.emphasis, min: 0.6, max: 1.5 },
              {
                label: "Pause frequency",
                value: data.pause_frequency,
                min: 0.2,
                max: 0.9,
              },
            ] as {
              label: string;
              value: number;
              min: number;
              max: number;
            }[]
          ).map(({ label, value, min, max }) => {
            const norm = (value - min) / (max - min);
            return (
              <div key={label} className="flex items-center gap-3">
                <span style={{
                  width: "140px",
                  fontSize: "11px",
                  color: "var(--ink-strong)",
                  fontFamily: "var(--font-body)",
                  flex: "0 0 auto",
                  fontWeight: 600,
                }}>
                  {label}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                  background: "var(--border)",
                }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: pct(Math.max(0, Math.min(1, norm))),
                      background: "var(--gold-bright)",
                    }}
                  />
                </div>
                <span style={{
                  width: "48px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontFamily: "var(--font-body)",
                  color: "var(--gold-bright)",
                  fontWeight: 600,
                }}>
                  {fmt3(value)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
            Influencing Personality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Warmth"
            value={
              data.last_personality_warmth !== null
                ? fmt2(data.last_personality_warmth)
                : "—"
            }
          />
          <StatRow
            label="Directness"
            value={
              data.last_personality_directness !== null
                ? fmt2(data.last_personality_directness)
                : "—"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigTab({
  config,
  onRefetch,
}: {
  config: VoxisConfigResponse | null;
  onRefetch: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Local editable state — initialised from fetched config
  const [threshold, setThreshold] = useState<string>("");
  const [interval, setInterval] = useState<string>("");
  const [maxLen, setMaxLen] = useState<string>("");
  const [tempBase, setTempBase] = useState<string>("");
  const [honestyEnabled, setHonestyEnabled] = useState<boolean | null>(null);

  // Populate defaults once config arrives
  const initialised =
    threshold !== "" || interval !== "" || maxLen !== "" || tempBase !== "";
  if (!initialised && config) {
    setThreshold(String(config.insight_expression_threshold));
    setInterval(String(config.min_expression_interval_minutes));
    setMaxLen(String(config.max_expression_length));
    setTempBase(String(config.temperature_base));
    setHonestyEnabled(config.honesty_check_enabled);
  }

  const save = useCallback(async () => {
    setSaving(true);
    setNotification(null);
    const body: VoxisConfigUpdateRequest = {};
    if (threshold !== "") {
      const v = parseFloat(threshold);
      if (!isNaN(v)) body.insight_expression_threshold = v;
    }
    if (interval !== "") {
      const v = parseFloat(interval);
      if (!isNaN(v)) body.min_expression_interval_minutes = v;
    }
    if (maxLen !== "") {
      const v = parseInt(maxLen, 10);
      if (!isNaN(v)) body.max_expression_length = v;
    }
    if (tempBase !== "") {
      const v = parseFloat(tempBase);
      if (!isNaN(v)) body.temperature_base = v;
    }
    if (honestyEnabled !== null) body.honesty_check_enabled = honestyEnabled;

    try {
      await api.voxisUpdateConfig(body);
      setNotification("Config saved");
      onRefetch();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setNotification(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [threshold, interval, maxLen, tempBase, honestyEnabled, onRefetch]);

  if (!config) {
    return (
      <div className="text-sm text-white/30 py-8 text-center">
        Config not available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>▣</span>
            Runtime Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notification && (
            <div
              style={{
                fontSize: "11px",
                borderRadius: "4px",
                padding: "8px 12px",
                border: notification.startsWith("Error")
                  ? "1px solid var(--gold-bright)"
                  : "1px solid var(--lime)",
                background: notification.startsWith("Error")
                  ? "rgba(232, 168, 32, 0.05)"
                  : "rgba(90, 200, 38, 0.05)",
                color: notification.startsWith("Error")
                  ? "var(--gold-bright)"
                  : "var(--lime)",
              }}
            >
              {notification}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  label: "Insight threshold",
                  value: threshold,
                  set: setThreshold,
                  hint: "Min insight value for ambient expressions (0–1)",
                },
                {
                  label: "Min interval (min)",
                  value: interval,
                  set: setInterval,
                  hint: "Rate limit between proactive expressions",
                },
                {
                  label: "Max expression length",
                  value: maxLen,
                  set: setMaxLen,
                  hint: "Hard character cap",
                },
                {
                  label: "Temperature base",
                  value: tempBase,
                  set: setTempBase,
                  hint: "LLM base temperature (0–2)",
                },
              ] as {
                label: string;
                value: string;
                set: (v: string) => void;
                hint: string;
              }[]
            ).map(({ label, value, set, hint }) => (
              <div key={label} className="space-y-1">
                <label style={{
                  fontSize: "10px",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "8px 12px",
                    fontSize: "11px",
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    boxSizing: "border-box",
                    transition: "all 150ms ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--lime)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(90, 200, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <p style={{
                  fontSize: "8px",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  marginTop: "2px",
                }}>{hint}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span style={{
              fontSize: "10px",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>Honesty check</span>
            <button
              onClick={() => setHonestyEnabled((v) => !v)}
              style={{
                position: "relative",
                height: "24px",
                width: "44px",
                borderRadius: "12px",
                transition: "background 150ms ease",
                background: honestyEnabled ? "var(--lime)" : "var(--border)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  height: "20px",
                  width: "20px",
                  borderRadius: "10px",
                  background: honestyEnabled ? "var(--ink-strong)" : "var(--ink-soft)",
                  transition: "transform 150ms ease",
                  transform: honestyEnabled ? "translateX(20px)" : "translateX(2px)",
                }}
              />
            </button>
            <span style={{
              fontSize: "10px",
              color: "var(--ink-muted)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
            }}>
              {honestyEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <Button
            onClick={save}
            disabled={saving}
            style={{
              marginTop: "8px",
              background: saving ? "var(--border)" : "var(--lime)",
              color: saving ? "var(--ink-muted)" : "var(--ink-strong)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}
          >
            {saving ? "Saving…" : "Save config"}
          </Button>
        </CardContent>
      </Card>

      {/* Read-only info */}
      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle style={{
            fontSize: "12px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--ink)",
          }}>
            <span style={{ color: "var(--lime)", marginRight: "4px" }}>◎</span>
            Read-only Config
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Voice synthesis"
            value={config.voice_synthesis_enabled ? "enabled" : "disabled"}
          />
          <StatRow
            label="Conversation history window"
            value={`${config.conversation_history_window} msgs`}
          />
          <StatRow
            label="Context window max tokens"
            value={config.context_window_max_tokens.toLocaleString()}
          />
          <StatRow
            label="Summary threshold"
            value={`${config.conversation_summary_threshold} msgs`}
          />
          <StatRow
            label="Max active conversations"
            value={config.max_active_conversations}
          />
          <StatRow
            label="Feedback enabled"
            value={config.feedback_enabled ? "yes" : "no"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function VoxisPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [draining, setDraining] = useState(false);
  const [drainNotification, setDrainNotification] = useState<string | null>(null);

  const { data: health } = useApi(() => api.voxisHealth(), { intervalMs: 5000 });
  const { data: metrics, refetch: refetchMetrics } = useApi(
    () => api.voxisMetrics(),
    { intervalMs: 3000 },
  );
  const { data: personality, refetch: refetchPersonality } = useApi(
    () => api.personality(),
    { intervalMs: 10000 },
  );
  const { data: queue, refetch: refetchQueue } = useApi(
    () => api.voxisQueue(),
    { intervalMs: 5000 },
  );
  const { data: conversations, refetch: refetchConversations } = useApi(
    () => api.voxisConversations(),
    { intervalMs: 5000 },
  );
  const { data: diversity } = useApi(() => api.voxisDiversity(), {
    intervalMs: 10000,
  });
  const { data: reception } = useApi(() => api.voxisReception(), {
    intervalMs: 10000,
  });
  const { data: dynamics } = useApi(() => api.voxisDynamics(), {
    intervalMs: 5000,
  });
  const { data: voice } = useApi(() => api.voxisVoice(), { intervalMs: 10000 });
  const { data: config, refetch: refetchConfig } = useApi(
    () => api.voxisConfig(),
    { intervalMs: 30000 },
  );

  const handleDrain = useCallback(async () => {
    setDraining(true);
    setDrainNotification(null);
    try {
      const res = await api.voxisDrainQueue();
      setDrainNotification(
        res.drained_count > 0
          ? `Drained ${res.drained_count} expression(s)`
          : "Nothing to drain (all below threshold)",
      );
      refetchQueue();
      refetchMetrics();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setDrainNotification(`Error: ${msg}`);
    } finally {
      setDraining(false);
    }
  }, [refetchQueue, refetchMetrics]);

  const handleCloseConversation = useCallback(
    async (id: string) => {
      try {
        await api.voxisCloseConversation(id);
        refetchConversations();
      } catch {
        // silently ignore
      }
    },
    [refetchConversations],
  );

  // Status badges
  const isHealthy = health?.status === "healthy";
  const silenceRate = metrics?.silence_rate ?? null;

  return (
    <div className="flex h-full flex-col" style={{
      background: "var(--bg)",
    }}>
      <PageHeader
        title="Voxis"
        description="Expression · Communication · Personality"
      >
        <div className="flex items-center gap-2">
          {health && (
            <Badge variant={isHealthy ? "success" : "warning"}>
              {health.status}
            </Badge>
          )}
          {metrics?.initialized && (
            <Badge variant="muted">
              {metrics.total_expressions} expressions
            </Badge>
          )}
          {silenceRate !== null && (
            <Badge
              variant={silenceRate > 0.7 ? "warning" : "muted"}
            >
              {pct(silenceRate, 0)} silent
            </Badge>
          )}
        </div>
      </PageHeader>

      {/* Drain notification */}
      {drainNotification && (
        <div
          style={{
            marginBottom: "12px",
            borderRadius: "4px",
            border: drainNotification.startsWith("Error")
              ? "1px solid var(--gold-bright)"
              : "1px solid var(--lime)",
            padding: "8px 12px",
            fontSize: "10px",
            color: drainNotification.startsWith("Error")
              ? "var(--gold-bright)"
              : "var(--lime)",
            background: drainNotification.startsWith("Error")
              ? "rgba(232, 168, 32, 0.05)"
              : "rgba(90, 200, 38, 0.05)",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
          }}
        >
          {drainNotification}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderRadius: "4px",
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingTop: "6px",
              paddingBottom: "6px",
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              transition: "all 100ms ease",
              border: activeTab === tab.id ? `1px solid var(--lime)` : "1px solid var(--border)",
              background: activeTab === tab.id ? "rgba(90, 200, 38, 0.08)" : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-soft)",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.borderColor = "var(--ink-soft)";
                e.currentTarget.style.color = "var(--ink-strong)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--ink-soft)";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "overview" && (
          <OverviewTab health={health} metrics={metrics} />
        )}
        {activeTab === "personality" && (
          <PersonalityTab
            personality={personality}
            onRefetch={refetchPersonality}
          />
        )}
        {activeTab === "queue" && (
          <QueueTab
            queue={queue}
            onDrain={handleDrain}
            draining={draining}
          />
        )}
        {activeTab === "conversations" && (
          <ConversationsTab
            data={conversations}
            onClose={handleCloseConversation}
          />
        )}
        {activeTab === "diversity" && <DiversityTab data={diversity} />}
        {activeTab === "reception" && <ReceptionTab data={reception} />}
        {activeTab === "dynamics" && <DynamicsTab data={dynamics} />}
        {activeTab === "voice" && <VoiceTab data={voice} />}
        {activeTab === "config" && (
          <ConfigTab config={config} onRefetch={refetchConfig} />
        )}
      </div>
    </div>
  );
}
