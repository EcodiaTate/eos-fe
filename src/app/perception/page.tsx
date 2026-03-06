"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type AffectResponse,
  type EISHealthResponse,
  type EISStatsResponse,
  type FileWatcherStatsResponse,
  type SchedulerStatsResponse,
  type WorkspaceDetailResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspaceStream } from "@/components/alive/WorkspaceStream";
import { useState, useCallback } from "react";

export default function PerceptionPage() {
  const affect = useApi<AffectResponse>(api.affect, { intervalMs: 2000 });
  const fileWatcher = useApi<FileWatcherStatsResponse>(api.fileWatcherStatus, {
    intervalMs: 5000,
  });
  const scheduler = useApi<SchedulerStatsResponse>(api.schedulerStatus, {
    intervalMs: 5000,
  });
  const workspaceDetail = useApi<WorkspaceDetailResponse>(api.workspaceDetail, {
    intervalMs: 2000,
  });
  const eisHealth = useApi<EISHealthResponse>(api.eisHealth, { intervalMs: 10000 });
  const eisStats = useApi<EISStatsResponse>(api.eisStats, { intervalMs: 2000 });

  // Axon outcome percepts re-entering Atune — source="internal:axon"
  const axonFeedbackItems = (workspaceDetail.data?.workspace_items ?? []).filter(
    (item) => item.source === "internal:axon",
  );
  const hasAxonFeedback = axonFeedbackItems.length > 0;

  const [registeringTask, setRegisteringTask] = useState(false);
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const [eventText, setEventText] = useState("");
  const [eventChannel, setEventChannel] = useState("text_chat");
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState<string | null>(null);

  const registerSelfClock = useCallback(async () => {
    setRegisteringTask(true);
    setRegisterResult(null);
    try {
      const res = await api.schedulerRegister("self_clock", "self_clock");
      setRegisterResult(JSON.stringify(res, null, 2));
      scheduler.refetch();
    } catch (err) {
      setRegisterResult(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setRegisteringTask(false);
    }
  }, [scheduler.refetch]);

  const injectEvent = useCallback(async () => {
    const text = eventText.trim();
    if (!text) return;
    setInjecting(true);
    setInjectResult(null);
    try {
      const res = await api.perceiveEvent(text, eventChannel);
      setInjectResult(JSON.stringify(res, null, 2));
      setEventText("");
    } catch (err) {
      setInjectResult(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setInjecting(false);
    }
  }, [eventText, eventChannel]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <PageHeader
        title="Perception"
        description="Atune — attention, salience, and the global workspace"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "24px" }}>
        {/* Affect */}
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ◉ Current Affect
            </CardTitle>
          </CardHeader>
          <CardContent>
            {affect.data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  {
                    label: "Valence",
                    value: affect.data.valence,
                    min: -1,
                    max: 1,
                    desc: "Emotional temperature",
                  },
                  {
                    label: "Arousal",
                    value: affect.data.arousal,
                    min: 0,
                    max: 1,
                    desc: "Alertness",
                  },
                  {
                    label: "Confidence",
                    value: affect.data.confidence,
                    min: 0,
                    max: 1,
                    desc: "Generative model fit",
                  },
                  {
                    label: "Curiosity",
                    value: affect.data.curiosity,
                    min: 0,
                    max: 1,
                    desc: "Interest",
                  },
                  {
                    label: "Care",
                    value: affect.data.care_activation,
                    min: 0,
                    max: 1,
                    desc: "Empathic concern",
                  },
                  {
                    label: "Coherence Stress",
                    value: affect.data.coherence_stress,
                    min: 0,
                    max: 1,
                    desc: "Epistemic tension",
                  },
                ].map((dim) => {
                  const pct =
                    ((dim.value - dim.min) / (dim.max - dim.min)) * 100;
                  return (
                    <div key={dim.label}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ fontSize: "9px", fontFamily: "var(--font-body)", color: "var(--ink-strong)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{dim.label}</div>
                        <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>{dim.desc}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "3px",
                              background: "var(--lime-bright)",
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                              transition: "width 700ms ease-out",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--ink-strong)", fontFamily: "var(--font-body)", width: "32px", textAlign: "right" }}>
                          {(dim.value ?? 0).toFixed(3)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Global Workspace — real-time via WorkspaceStream */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ◎ Global Workspace
            </CardTitle>
            <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>
              live · updated every cycle
            </span>
          </CardHeader>
          <CardContent>
            <WorkspaceStream />
          </CardContent>
        </Card>

        {/* Feedback Loop */}
        <Card className="float-up float-up-3" style={{ gridColumn: "1 / -1" }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ↑ Feedback Loop
            </CardTitle>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                className={hasAxonFeedback ? "spore-ping" : undefined}
                style={{
                  height: "6px",
                  width: "6px",
                  borderRadius: "50%",
                  background: hasAxonFeedback ? "var(--lime-bright)" : "var(--border)",
                }}
              />
              <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>
                {hasAxonFeedback
                  ? "Axon outcomes re-entering Atune"
                  : "Awaiting first action outcome"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {hasAxonFeedback ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {axonFeedbackItems.map((item, i) => (
                  <div
                    key={item.broadcast_id || i}
                    style={{
                      borderRadius: "7px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Badge variant="success">axon</Badge>
                        <Badge variant="info">system_event</Badge>
                      </div>
                      <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                        {item.salience.toFixed(3)}
                      </span>
                    </div>
                    {item.content && (
                      <p style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "var(--font-prose)", lineHeight: "1.5" }}>
                        {item.content}
                      </p>
                    )}
                    {item.timestamp && (
                      <div style={{ marginTop: "4px", fontSize: "9px", color: "var(--ink-muted)" }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", textAlign: "center" }}>
                <div style={{ fontSize: "24px", opacity: 0.3, marginBottom: "8px" }}>⟳</div>
                <p style={{ fontSize: "13px", color: "var(--ink-muted)", maxWidth: "320px", fontFamily: "var(--font-prose)" }}>
                  When Axon executes an action, the outcome re-enters Atune as a
                  self-percept. That cycle closes the active inference loop.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Injection */}
        <Card className="float-up float-up-4" style={{ gridColumn: "1 / -1" }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ⚡ Inject Percept
            </CardTitle>
            <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>
              Send a structured event through the perception pipeline
            </span>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={eventChannel}
                  onChange={(e) => setEventChannel(e.target.value)}
                  style={{
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)",
                    minWidth: "140px",
                  }}
                >
                  {[
                    "text_chat",
                    "system_event",
                    "sensor_iot",
                    "calendar",
                    "external_api",
                    "memory_bubble",
                    "affect_shift",
                    "evo_insight",
                  ].map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
                <input
                  value={eventText}
                  onChange={(e) => setEventText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") injectEvent();
                  }}
                  placeholder="Event content..."
                  style={{
                    flex: 1,
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)",
                  }}
                />
                <button
                  onClick={injectEvent}
                  disabled={!eventText.trim() || injecting}
                  style={{
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: !eventText.trim() || injecting ? "var(--bg)" : "var(--lime-bright)",
                    color: !eventText.trim() || injecting ? "var(--ink-muted)" : "var(--ink-strong)",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    cursor: !eventText.trim() || injecting ? "not-allowed" : "pointer",
                    opacity: !eventText.trim() || injecting ? 0.5 : 1,
                    transition: "all 200ms ease",
                  }}
                >
                  {injecting ? "..." : "Inject"}
                </button>
              </div>

              {injectResult && (
                <pre style={{
                  borderRadius: "7px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  padding: "12px",
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-body)",
                  overflowX: "auto",
                  maxHeight: "192px",
                  overflowY: "auto",
                }}>
                  {injectResult}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Epistemic Immune System */}
        <Card className="float-up float-up-5" style={{ gridColumn: "1 / -1" }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ◈ Epistemic Immune System
            </CardTitle>
            {eisHealth.data && (
              <Badge
                variant={
                  eisHealth.data.status === "healthy"
                    ? "success"
                    : eisHealth.data.status === "degraded"
                      ? "warning"
                      : "muted"
                }
              >
                {eisHealth.data.status}
              </Badge>
            )}
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Zone bar */}
            {eisHealth.data?.zone_config ? (() => {
              const zones: { key: string; label: string; color: string }[] = [
                { key: "clean", label: "Clean", color: "var(--lime-bright)" },
                { key: "elevated", label: "Elevated", color: "var(--gold-bright)" },
                { key: "antigenic_zone", label: "Antigenic", color: "#e66533" },
                { key: "known_attack", label: "Attack", color: "#d84e4e" },
              ];
              const zc = eisHealth.data.zone_config;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ position: "relative", height: "24px", borderRadius: "7px", overflow: "hidden", display: "flex" }}>
                    {zones.map(({ key, label, color }) => {
                      const zone = zc[key];
                      if (!zone) return null;
                      const width = (zone.upper - zone.lower) * 100;
                      const left = zone.lower * 100;
                      return (
                        <div
                          key={key}
                          style={{
                            width: `${width}%`,
                            marginLeft: key === zones[0].key ? `${left}%` : undefined,
                            background: color,
                            opacity: 0.15,
                            borderRight: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title={`${label}: ${zone.lower.toFixed(2)}–${zone.upper.toFixed(2)}`}
                        >
                          <span style={{ fontSize: "9px", fontWeight: 600, color: color, truncate: "true", padding: "0 4px", fontFamily: "var(--font-body)" }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--ink-muted)", paddingX: "2px", fontFamily: "var(--font-body)" }}>
                    <span>0.0</span>
                    {zones.map(({ key }) => {
                      const zone = zc[key];
                      return zone ? (
                        <span key={key}>{zone.upper.toFixed(2)}</span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })() : (
              <div style={{ height: "24px", borderRadius: "7px", background: "var(--border)", animation: "data-tick 2s ease-in-out infinite" }} />
            )}

            {/* Stat pills + rates */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {(
                  [
                    { key: "passed", label: "Passed", variant: "success" },
                    { key: "elevated", label: "Elevated", variant: "warning" },
                    { key: "quarantined", label: "Quarantined", variant: "warning" },
                    { key: "blocked", label: "Blocked", variant: "danger" },
                  ] as { key: keyof EISStatsResponse; label: string; variant: "success" | "warning" | "danger" }[]
                ).map(({ key, label, variant }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "9px", fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--ink-strong)" }}>
                      {eisStats.data ? (eisStats.data[key] as number).toLocaleString() : "—"}
                    </span>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                ))}
              </div>
              {eisStats.data && (
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pass rate</div>
                    <div style={{ fontSize: "14px", color: "var(--lime-bright)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      {(eisStats.data.pass_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Block rate</div>
                    <div style={{ fontSize: "14px", color: "#d84e4e", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      {(eisStats.data.block_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {eisHealth.data && (
              <div style={{ display: "flex", gap: "16px", fontSize: "9px", color: "var(--ink-muted)", paddingTop: "4px", borderTop: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <span>midpoint <span style={{ color: "var(--ink-strong)" }}>{eisHealth.data.sigmoid_midpoint}</span></span>
                <span>floor <span style={{ color: "var(--ink-strong)" }}>{eisHealth.data.belief_floor}</span></span>
                <span>salience gain <span style={{ color: "var(--ink-strong)" }}>{eisHealth.data.risk_salience_gain}</span></span>
                <span>screened <span style={{ color: "var(--ink-strong)" }}>{eisHealth.data.screened_total?.toLocaleString() ?? "—"}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Watcher */}
        <Card className="float-up float-up-6">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ≡ File Watcher
            </CardTitle>
            {fileWatcher.data && (
              <Badge variant={fileWatcher.data.running ? "success" : "muted"}>
                {fileWatcher.data.running ? "running" : "stopped"}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {fileWatcher.data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileWatcher.data.watch_dir}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "7px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ingested</div>
                    <div style={{ fontSize: "14px", color: "var(--lime-bright)", fontFamily: "var(--font-body)", fontWeight: 600, marginTop: "4px" }}>
                      {fileWatcher.data.ingested.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "7px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Failed</div>
                    <div style={{ fontSize: "14px", color: fileWatcher.data.failed > 0 ? "#d84e4e" : "var(--ink-muted)", fontFamily: "var(--font-body)", fontWeight: 600, marginTop: "4px" }}>
                      {fileWatcher.data.failed.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "var(--ink-mid)", fontFamily: "var(--font-prose)", lineHeight: "1.5" }}>
                  Drop <code style={{ background: "var(--bg)", padding: "2px 4px", borderRadius: "3px", fontFamily: "var(--font-body)", color: "var(--ink-strong)" }}>.txt</code> or{" "}
                  <code style={{ background: "var(--bg)", padding: "2px 4px", borderRadius: "3px", fontFamily: "var(--font-body)", color: "var(--ink-strong)" }}>.md</code> files into the
                  watched directory to inject percepts. Files are consumed on
                  ingest.
                </p>
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Scheduler */}
        <Card className="float-up float-up-7">
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              ▣ Perception Scheduler
            </CardTitle>
            {scheduler.data && (
              <Badge variant={scheduler.data.running ? "success" : "muted"}>
                {scheduler.data.running ? "running" : "stopped"}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {scheduler.data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.keys(scheduler.data.tasks).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {Object.entries(scheduler.data.tasks).map(
                      ([name, task]) => (
                        <div
                          key={name}
                          style={{
                            borderRadius: "7px",
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            padding: "8px 12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>
                              {name}
                            </span>
                            <Badge
                              variant={task.active ? "success" : "muted"}
                            >
                              {task.active ? "active" : "idle"}
                            </Badge>
                          </div>
                          <div style={{ marginTop: "6px", display: "flex", gap: "12px" }}>
                            <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                              every {task.interval_seconds}s
                            </span>
                            <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                              {task.run_count} runs
                            </span>
                            {task.error_count > 0 && (
                              <span style={{ fontSize: "9px", color: "#d84e4e", fontFamily: "var(--font-body)" }}>
                                {task.error_count} errors
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", textAlign: "center", padding: "8px 0", fontFamily: "var(--font-prose)" }}>
                      No tasks registered.
                    </div>
                    <button
                      onClick={registerSelfClock}
                      disabled={registeringTask}
                      style={{
                        width: "100%",
                        borderRadius: "7px",
                        border: "1px solid var(--border)",
                        background: registeringTask ? "var(--bg)" : "var(--lime-bright)",
                        color: registeringTask ? "var(--ink-muted)" : "var(--ink-strong)",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        cursor: registeringTask ? "not-allowed" : "pointer",
                        opacity: registeringTask ? 0.5 : 1,
                        transition: "all 200ms ease",
                      }}
                    >
                      {registeringTask ? "Registering..." : "+ Register self-clock task"}
                    </button>
                  </div>
                )}

                {registerResult && (
                  <pre style={{
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "8px",
                    fontSize: "10px",
                    color: "var(--ink-muted)",
                    fontFamily: "var(--font-body)",
                    overflowX: "auto",
                    maxHeight: "96px",
                    overflowY: "auto",
                  }}>
                    {registerResult}
                  </pre>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "var(--ink-muted)" }}>Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
