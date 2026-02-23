"use client";

import { useApi } from "@/hooks/use-api";
import { api, type AffectResponse, type WorkspaceResponse } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";

export default function PerceptionPage() {
  const affect = useApi<AffectResponse>(api.affect, { intervalMs: 2000 });
  const workspace = useApi<WorkspaceResponse>(api.workspace, {
    intervalMs: 3000,
  });
  const [eventText, setEventText] = useState("");
  const [eventChannel, setEventChannel] = useState("text_chat");
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState<string | null>(null);

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
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Perception"
        description="Atune — attention, salience, and the global workspace"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Affect */}
        <Card glow>
          <CardHeader>
            <CardTitle>Current Affect</CardTitle>
          </CardHeader>
          <CardContent>
            {affect.data ? (
              <div className="space-y-3">
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
                    label: "Dominance",
                    value: affect.data.dominance,
                    min: 0,
                    max: 1,
                    desc: "Control",
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
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="text-xs text-white/50">{dim.label}</div>
                        <div className="text-xs text-white/30">{dim.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full bg-teal-400/50 transition-all duration-700"
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          />
                        </div>
                        <div className="text-xs text-white/50 tabular-nums w-12 text-right">
                          {dim.value.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle>Global Workspace</CardTitle>
            {workspace.data && (
              <Badge variant="info">{workspace.data.meta_attention_mode}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {workspace.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-white/25">Cycles</div>
                    <div className="text-sm text-white/70 tabular-nums font-medium">
                      {workspace.data.cycle_count.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Threshold</div>
                    <div className="text-sm text-white/70 tabular-nums font-medium">
                      {workspace.data.dynamic_threshold.toFixed(3)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                    Recent Broadcasts
                  </div>
                  {(workspace.data.recent_broadcasts?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {workspace.data.recent_broadcasts.map((b) => (
                        <div
                          key={b.broadcast_id}
                          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5"
                        >
                          <span className="text-[10px] text-white/30 font-mono truncate max-w-[150px]">
                            {b.broadcast_id}
                          </span>
                          <Badge variant="info">
                            {b.salience.toFixed(3)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-white/20 text-center py-4">
                      No broadcasts yet. Aurora is sensory-deprived.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Event Injection */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Inject Percept</CardTitle>
            <span className="text-[10px] text-white/20">
              Send a structured event through the perception pipeline
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={eventChannel}
                  onChange={(e) => setEventChannel(e.target.value)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60"
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
                  className={cn(
                    "flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90",
                    "placeholder:text-white/20 focus:border-white/15 focus:outline-none",
                  )}
                />
                <button
                  onClick={injectEvent}
                  disabled={!eventText.trim() || injecting}
                  className={cn(
                    "rounded-lg border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm text-white/60",
                    "hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none",
                  )}
                >
                  {injecting ? "..." : "Inject"}
                </button>
              </div>

              {injectResult && (
                <pre className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/50 overflow-auto max-h-48">
                  {injectResult}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
