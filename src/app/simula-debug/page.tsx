"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useApi } from "@/hooks/use-api";
import { api, getApiBase } from "@/lib/api-client";
import type {
  ThymosHealthResponse,
  SimulaStatusResponse,
  IncidentResponse,
} from "@/lib/api-client";

// ─── 404 Trigger ──────────────────────────────────────────────────

function TriggerPanel() {
  const [firing, setFiring] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [burstSize, setBurstSize] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const append = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-AU", { hour12: false });
    setLog((prev) => [...prev.slice(-200), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const fire = useCallback(async () => {
    setFiring(true);
    append(`Firing ${burstSize} request(s)...`);
    const results = await Promise.allSettled(
      Array.from({ length: burstSize }, () => api.debugTrigger404()),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        append(`  -> HTTP ${r.value.status} (${r.value.ok ? "ok" : "error"})`);
      } else {
        append(`  -> FAILED: ${r.reason}`);
      }
    }
    setFiring(false);
  }, [burstSize, append]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--ink)" }}
      >
        404 Trigger
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Fires requests to{" "}
        <code
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: "var(--bg-warm)" }}
        >
          /api/v1/__debug__/nonexistent-route
        </code>{" "}
        — each one creates a 404 incident in Thymos. Fire 6+ to cross the T4
        re-emission threshold and trigger Simula.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Burst size:
        </label>
        {[1, 3, 6, 10].map((n) => (
          <button
            key={n}
            onClick={() => setBurstSize(n)}
            className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
            style={{
              background: burstSize === n ? "var(--lime)" : "var(--bg-warm)",
              color: burstSize === n ? "#000" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={fire}
          disabled={firing}
          className="ml-auto px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          style={{
            background: "var(--red, #ef4444)",
            color: "#fff",
            cursor: firing ? "not-allowed" : "pointer",
          }}
        >
          {firing ? "Firing..." : `Fire ${burstSize}x 404`}
        </button>
      </div>

      {/* Log */}
      <div
        ref={logRef}
        className="rounded-lg p-3 font-mono text-xs overflow-y-auto"
        style={{
          background: "var(--bg)",
          color: "var(--ink-muted)",
          maxHeight: 160,
          minHeight: 60,
        }}
      >
        {log.length === 0 ? (
          <span style={{ opacity: 0.5 }}>No requests fired yet.</span>
        ) : (
          log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────

function Metric({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  const color = warn
    ? "var(--red, #ef4444)"
    : highlight
      ? "var(--lime)"
      : "var(--ink)";
  const border = warn
    ? "var(--red, #ef4444)"
    : highlight
      ? "var(--lime)"
      : "var(--border)";
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: border, background: "var(--bg-card)" }}
    >
      <div
        className="text-xs uppercase tracking-wide mb-1"
        style={{ color: "var(--ink-muted)" }}
      >
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Thymos Pipeline Panel ────────────────────────────────────────

function ThymosPanel() {
  const health = useApi<ThymosHealthResponse>(api.thymosHealth, {
    intervalMs: 2000,
  });
  const incidents = useApi<IncidentResponse[]>(
    () => api.thymosIncidents(20),
    { intervalMs: 2000 },
  );

  const h = health.data;
  const budget = h?.budget;

  // Filter to protocol_degradation / 404 incidents
  const debugIncidents = (incidents.data ?? []).filter(
    (i) =>
      i.incident_class === "protocol_degradation" ||
      i.error_message?.includes("404") ||
      i.fingerprint?.includes("__debug__"),
  );

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--ink)" }}
      >
        Thymos Pipeline
        {health.loading && (
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--ink-muted)" }}>
            loading...
          </span>
        )}
      </h2>

      {h && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric label="Active Incidents" value={h.active_incidents} />
            <Metric label="Total Incidents" value={h.total_incidents} />
            <Metric
              label="Repairs Attempted"
              value={h.repairs_attempted}
              sub={`${h.repairs_succeeded} ok / ${h.repairs_failed} fail`}
            />
            <Metric
              label="Immune Score"
              value={h.immune_health_score.toFixed(0)}
              sub="/100"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric
              label="Healing Mode"
              value={h.healing_mode}
              warn={h.healing_mode === "storm"}
            />
            <Metric
              label="Repairs/Hour"
              value={`${budget?.repairs_this_hour ?? 0} / ${budget?.max_repairs_per_hour ?? "?"}`}
              warn={
                (budget?.repairs_this_hour ?? 0) >=
                (budget?.max_repairs_per_hour ?? 999)
              }
            />
            <Metric
              label="Novel Repairs Today"
              value={`${budget?.novel_repairs_today ?? 0} / ${budget?.max_novel_repairs_per_day ?? "?"}`}
              highlight={(budget?.novel_repairs_today ?? 0) > 0}
            />
            <Metric
              label="Active Codegen"
              value={`${budget?.active_codegen ?? 0} / ${budget?.max_concurrent_codegen ?? "?"}`}
              highlight={(budget?.active_codegen ?? 0) > 0}
            />
          </div>

          {/* Governor warnings */}
          {h.healing_mode === "storm" && (
            <div
              className="rounded-lg border p-3 mb-4 text-sm"
              style={{
                borderColor: "var(--red, #ef4444)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--ink-soft)",
              }}
            >
              <strong style={{ color: "var(--red, #ef4444)" }}>
                STORM MODE ACTIVE
              </strong>{" "}
              — Governor has entered cytokine storm. Only first incident per
              source system is diagnosed. Budget is exhausted (
              {budget?.repairs_this_hour ?? 0}/{budget?.max_repairs_per_hour ?? "?"}{" "}
              repairs/hr).{" "}
              {budget?.storm_focus_system && (
                <>Focused on: {budget.storm_focus_system}. </>
              )}
              New incidents will be throttled until storm clears.
            </div>
          )}
          {(budget?.repairs_this_hour ?? 0) >=
            (budget?.max_repairs_per_hour ?? 999) && (
            <div
              className="rounded-lg border p-3 mb-4 text-sm"
              style={{
                borderColor: "var(--red, #ef4444)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--ink-soft)",
              }}
            >
              <strong style={{ color: "var(--red, #ef4444)" }}>
                REPAIR BUDGET EXHAUSTED
              </strong>{" "}
              — {budget?.repairs_this_hour ?? 0} of{" "}
              {budget?.max_repairs_per_hour ?? "?"} repairs/hour used. New
              diagnoses will be throttled. Wait for the hour window to roll over
              or restart the app.
            </div>
          )}

          {/* Repairs by tier */}
          <div className="mb-4">
            <div
              className="text-xs uppercase tracking-wide mb-2"
              style={{ color: "var(--ink-muted)" }}
            >
              Repairs by Tier
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(h.repairs_by_tier).map(([tier, count]) => (
                <span
                  key={tier}
                  className="px-2 py-1 rounded text-xs font-mono"
                  style={{
                    background:
                      tier === "NOVEL_FIX"
                        ? "var(--lime)"
                        : "var(--bg-warm)",
                    color: tier === "NOVEL_FIX" ? "#000" : "var(--ink-soft)",
                    fontWeight: tier === "NOVEL_FIX" ? 700 : 400,
                  }}
                >
                  {tier}: {count}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recent 404/debug incidents */}
      <div>
        <div
          className="text-xs uppercase tracking-wide mb-2"
          style={{ color: "var(--ink-muted)" }}
        >
          Recent 404 / Debug Incidents ({debugIncidents.length})
        </div>
        <div
          className="rounded-lg overflow-y-auto"
          style={{ maxHeight: 240, background: "var(--bg)" }}
        >
          {debugIncidents.length === 0 ? (
            <div className="p-3 text-xs" style={{ color: "var(--ink-muted)" }}>
              No 404 incidents yet. Fire some above.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    color: "var(--ink-muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Fingerprint</th>
                  <th className="text-right p-2">Count</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {debugIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="p-2 font-mono" style={{ color: "var(--ink-soft)" }}>
                      {new Date(inc.timestamp).toLocaleTimeString("en-AU", {
                        hour12: false,
                      })}
                    </td>
                    <td
                      className="p-2 font-mono truncate"
                      style={{ color: "var(--ink-soft)", maxWidth: 120 }}
                    >
                      {inc.fingerprint.slice(0, 12)}
                    </td>
                    <td
                      className="p-2 text-right font-bold"
                      style={{
                        color:
                          inc.occurrence_count >= 6
                            ? "var(--lime)"
                            : "var(--ink)",
                      }}
                    >
                      {inc.occurrence_count}
                    </td>
                    <td className="p-2" style={{ color: "var(--ink-soft)" }}>
                      {inc.severity}
                    </td>
                    <td
                      className="p-2 font-mono"
                      style={{
                        color:
                          inc.repair_tier === "NOVEL_FIX"
                            ? "var(--lime)"
                            : "var(--ink-soft)",
                        fontWeight:
                          inc.repair_tier === "NOVEL_FIX" ? 700 : 400,
                      }}
                    >
                      {inc.repair_tier ?? "—"}
                    </td>
                    <td className="p-2" style={{ color: "var(--ink-soft)" }}>
                      {inc.repair_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simula Status Panel ──────────────────────────────────────────

function SimulaPanel() {
  const status = useApi<SimulaStatusResponse>(api.simulaStatus, {
    intervalMs: 3000,
  });

  const s = status.data;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--ink)" }}
      >
        Simula Status
        {status.loading && (
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--ink-muted)" }}>
            loading...
          </span>
        )}
      </h2>

      {s && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric
              label="Initialized"
              value={s.initialized ? "YES" : "NO"}
              highlight={s.initialized}
              warn={!s.initialized}
            />
            <Metric label="Version" value={s.current_version} />
            <Metric label="Grid State" value={s.grid_state} />
            <Metric label="Active Proposals" value={s.active_proposals} highlight={s.active_proposals > 0} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric
              label="Received"
              value={s.proposals_received}
              highlight={s.proposals_received > 0}
            />
            <Metric label="Approved" value={s.proposals_approved} />
            <Metric label="Rejected" value={s.proposals_rejected} />
            <Metric label="Rolled Back" value={s.proposals_rolled_back} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Deduplicated" value={s.proposals_deduplicated} />
            <Metric
              label="Awaiting Governance"
              value={s.proposals_awaiting_governance}
              highlight={s.proposals_awaiting_governance > 0}
            />
            <Metric
              label="Evolution Velocity"
              value={s.analytics_summary?.evolution_velocity?.toFixed(2) ?? "—"}
            />
            <Metric
              label="Rollback Rate"
              value={
                s.analytics_summary?.rollback_rate != null
                  ? `${(s.analytics_summary.rollback_rate * 100).toFixed(0)}%`
                  : "—"
              }
            />
          </div>
        </>
      )}

      {status.error && (
        <div className="mt-3 text-xs text-red-400">Error: {status.error}</div>
      )}
    </div>
  );
}

// ─── Live SSE Stream ──────────────────────────────────────────────

function IncidentStream() {
  const [events, setEvents] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`${getApiBase()}/api/v1/thymos/stream`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const ts = new Date().toLocaleTimeString("en-AU", { hour12: false });
        const line = `[${ts}] ${d.severity} ${d.incident_class} | tier=${d.repair_tier ?? "—"} status=${d.repair_status} count=${d.occurrence_count ?? "?"}`;
        setEvents((prev) => [...prev.slice(-100), line]);
      } catch {
        // keepalive or unparseable — ignore
      }
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--ink)" }}
      >
        Live Incident Stream
        <span
          className="ml-2 inline-block w-2 h-2 rounded-full"
          style={{ background: connected ? "var(--lime)" : "var(--red, #ef4444)" }}
        />
      </h2>
      <div
        ref={logRef}
        className="rounded-lg p-3 font-mono text-xs overflow-y-auto"
        style={{
          background: "var(--bg)",
          color: "var(--ink-muted)",
          maxHeight: 200,
          minHeight: 60,
        }}
      >
        {events.length === 0 ? (
          <span style={{ opacity: 0.5 }}>
            Waiting for incidents...
          </span>
        ) : (
          events.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function SimulaDebugPage() {
  return (
    <>
      <PageHeader
        title="Simula Debug"
        description="Trigger 404s and watch them flow through Thymos dedup -> triage -> Simula"
      />
      <div className="space-y-6">
        <TriggerPanel />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThymosPanel />
          <SimulaPanel />
        </div>
        <IncidentStream />
      </div>
    </>
  );
}
