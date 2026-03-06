"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Pause, Play, Trash2,
  ChevronDown, ChevronRight, ArrowDown,
  Wifi, WifiOff, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtMs as fmtMsNum } from "@/lib/formatters";

interface LogEntry {
  id: number;
  ts: string;
  level: string;
  logger: string;
  event: string;
  [key: string]: unknown;
}

// Each system has a human name, role description, colour, and emoji
const SYSTEMS: Record<string, { name: string; role: string; color: string; emoji: string }> = {
  soma:       { name: "Body",          role: "internal state",          color: "#f97316", emoji: "🫀" },
  synapse:    { name: "Nervous System",role: "rhythm & health",          color: "#06b6d4", emoji: "⚡" },
  nova:       { name: "Executive",     role: "decisions & goals",        color: "#a855f7", emoji: "🧠" },
  atune:      { name: "Perception",    role: "attention & awareness",    color: "#ec4899", emoji: "👁" },
  equor:      { name: "Conscience",    role: "ethics & values",          color: "#8b5cf6", emoji: "⚖️" },
  voxis:      { name: "Voice",         role: "expression & speech",      color: "#f59e0b", emoji: "💬" },
  axon:       { name: "Actions",       role: "executing tasks",          color: "#10b981", emoji: "✋" },
  evo:        { name: "Learning",      role: "pattern detection",        color: "#14b8a6", emoji: "📈" },
  simula:     { name: "Evolution",     role: "self-improvement",         color: "#38bdf8", emoji: "🔬" },
  memory:     { name: "Memory",        role: "knowledge & identity",     color: "#3b82f6", emoji: "🗂️" },
  alive:      { name: "Alive",         role: "lifecycle",                color: "#ec4899", emoji: "🌱" },
  oneiros:    { name: "Dream Engine",  role: "sleep & consolidation",    color: "#a78bfa", emoji: "🌙" },
  thymos:     { name: "Immune System", role: "error detection & repair", color: "#f97316", emoji: "🛡️" },
  thread:     { name: "Identity",      role: "narrative self",           color: "#06b6d4", emoji: "🪢" },
  federation: { name: "Diplomat",      role: "inter-instance links",     color: "#8b5cf6", emoji: "🌐" },
};

const ORCHESTRATOR_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8000"
    : "http://localhost:8000";

const LOG_STREAM_PATH = "/api/v1/admin/logs/stream";
const MAX_LOGS = 2000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSystem(logger: string) {
  const key = Object.keys(SYSTEMS).find((k) => logger.includes(`.systems.${k}`));
  if (key) return { ...SYSTEMS[key], key };
  const last = logger.split(".").pop() ?? logger;
  return { name: last, role: "", color: "#9ca3af", emoji: "●", key: "" };
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  } catch {
    return ts.slice(11, 19) || "??:??:??";
  }
}

function fmtMs(v: unknown): string {
  if (typeof v !== "number") return String(v ?? "");
  return fmtMsNum(v);
}

function scoreLabel(v: unknown): string {
  if (typeof v !== "number") return String(v ?? "");
  if (v < 0.3) return "low";
  if (v < 0.6) return "moderate";
  if (v < 0.8) return "good";
  return "high";
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Translate a raw log entry into a human-readable sentence + optional detail line
function humanize(log: LogEntry): { headline: string; detail?: string } {
  const e = log.event ?? "";
  const g = (k: string) => log[k];

  // Synapse — nervous system
  if (e === "clock_started") return { headline: `Clock started at ${fmt(g("hz"))} Hz` };
  if (e === "clock_stopped") return { headline: `Clock stopped after ${fmt(g("total_cycles"))} cycles (${fmtMs(g("elapsed_ms"))})` };
  if (e === "cycle_complete" || e === "cycle_completed") return { headline: `Cycle ${fmt(g("cycle") ?? g("cycle_number"))} finished`, detail: g("duration_ms") ? `took ${fmtMs(g("duration_ms"))}` : undefined };
  if (e === "coherence_shift_detected") return { headline: `Coherence is ${g("direction") === "increasing" ? "improving" : "declining"} (${scoreLabel(g("new_composite"))})`, detail: `was ${fmt(g("previous_composite"))}, now ${fmt(g("new_composite"))}` };
  if (e === "scheduling_restart") return { headline: `Restarting ${fmt(g("system_id"))} (attempt ${fmt(g("attempt"))} of ${fmt(g("max_attempts"))})`, detail: `waiting ${fmt(g("delay_s"))}s` };
  if (e === "system_registered") return { headline: `${fmt(g("system_id"))} registered as ${g("is_critical") ? "critical" : "non-critical"} system` };
  if (e === "system_healthy") return { headline: "All systems healthy" };
  if (e === "system_unhealthy") return { headline: `${fmt(g("system_id") ?? g("system"))} is unhealthy`, detail: fmt(g("reason")) };

  // Soma — body / felt sense
  if (e === "soma_initialized") return { headline: `Body online — starting in ${fmt(g("developmental_stage"))} stage` };
  if (e === "new_attractor_discovered") return { headline: "New stable pattern found in internal state", detail: `stability: ${scoreLabel(g("stability_score"))}` };
  if (e === "developmental_stage_promoted") return { headline: `Maturity advanced: ${fmt(g("old_stage"))} → ${fmt(g("new_stage"))}`, detail: `after ${fmt(g("cycle_count"))} cycles` };
  if (e === "allostatic_signal") return { headline: `Body signal: ${fmt(g("allostatic_context") ?? "update")}`, detail: g("urgency") ? `urgency: ${scoreLabel(g("urgency"))}` : undefined };

  // Atune — perception
  if (e === "broadcast_ignited" || e === "workspace_broadcast") {
    const source = fmt(g("source") ?? g("percept_source"));
    return { headline: `New broadcast${source ? ` from ${source}` : ""}`, detail: g("salience_composite") ? `salience: ${scoreLabel(g("salience_composite"))}` : undefined };
  }
  if (e === "subscriber_added") return { headline: `${fmt(g("system") ?? g("system_id"))} subscribed to broadcasts` };
  if (e === "salience_scored") return { headline: `Input scored: salience ${scoreLabel(g("composite") ?? g("salience_composite"))}`, detail: `from ${fmt(g("source"))}` };

  // Nova — executive / decisions
  if (e === "nova_initialized" || e === "nova_online") return { headline: "Executive function online" };
  if (e === "goal_achieved") return { headline: `Goal completed: ${fmt(g("description") ?? g("goal_id"))}` };
  if (e === "goal_created" || e === "goal_added") return { headline: `New goal: ${fmt(g("description") ?? g("goal_id"))}` };
  if (e === "goal_abandoned") return { headline: `Goal dropped: ${fmt(g("description") ?? g("goal_id"))}`, detail: fmt(g("reason")) };
  if (e === "fast_path_equor_denied_escalating") return { headline: "Sending intent to conscience for full review" };
  if (e === "intent_submitted") return { headline: "Intent submitted for ethics review", detail: fmt(g("description") ?? g("intent_id")) };
  if (e === "policy_selected") return { headline: "Action policy chosen", detail: fmt(g("policy") ?? g("description")) };

  // Equor — conscience
  if (e === "review_complete") {
    const verdict = fmt(g("verdict")).toUpperCase();
    const allowed = verdict === "PERMIT" || verdict === "APPROVED";
    return { headline: `Conscience ${allowed ? "approved" : "blocked"} the intent`, detail: fmt(g("reason") ?? g("intent_id")) };
  }
  if (e === "amendment_applied") return { headline: "Values updated", detail: fmt(g("proposal_id")) };
  if (e === "hardcoded_invariants_seeded") return { headline: `${fmt(g("count"))} core ethical rules loaded` };
  if (e === "community_invariant_added") return { headline: `New ethical rule: ${fmt(g("name") ?? g("invariant_id"))}` };
  if (e === "ethics_violation") return { headline: "Ethical boundary triggered", detail: fmt(g("rule") ?? g("reason")) };

  // Axon — actions
  if (e === "axon_initializing") return { headline: "Action executor starting" };
  if (e === "circuit_closed") return { headline: `Circuit breaker closed for ${fmt(g("action_type"))} (too many failures)` };
  if (e === "circuit_opened") return { headline: `Circuit breaker reset for ${fmt(g("action_type"))}` };
  if (e === "action_executed") return { headline: `Action executed: ${fmt(g("action_type") ?? g("action"))}`, detail: g("duration_ms") ? fmtMs(g("duration_ms")) : undefined };
  if (e === "action_failed") return { headline: `Action failed: ${fmt(g("action_type") ?? g("action"))}`, detail: fmt(g("reason") ?? g("error")) };

  // Voxis — voice
  if (e === "conversation_created") return { headline: "New conversation started" };
  if (e === "voxis_template_fallback") return { headline: "Using fallback expression template", detail: fmt(g("reason")) };
  if (e === "silence_decision") return { headline: "Decided to stay silent", detail: fmt(g("reason")) };
  if (e === "response_generated") return { headline: "Response generated", detail: g("duration_ms") ? `in ${fmtMs(g("duration_ms"))}` : undefined };

  // Evo — learning
  if (e === "evo_initialized" || e === "evo_online") return { headline: "Learning system online" };
  if (e === "hypothesis_generated") return { headline: `New pattern hypothesis: ${fmt(g("pattern") ?? g("description") ?? g("hypothesis_id"))}`, detail: g("confidence") ? `confidence: ${scoreLabel(g("confidence"))}` : undefined };
  if (e === "hypothesis_confirmed") return { headline: `Pattern confirmed: ${fmt(g("pattern") ?? g("hypothesis_id"))}` };
  if (e === "hypothesis_rejected") return { headline: `Pattern rejected: ${fmt(g("pattern") ?? g("hypothesis_id"))}`, detail: fmt(g("reason")) };

  // Memory
  if (e === "memory_service_initialised" || e === "memory_online") return { headline: "Memory system online" };
  if (e === "instance_birth_starting") return { headline: `Creating new instance: ${fmt(g("name"))}` };
  if (e === "consolidation_complete") return { headline: "Memory consolidation complete", detail: g("duration_ms") ? `took ${fmtMs(g("duration_ms"))}` : undefined };
  if (e === "episode_stored") return { headline: "New memory episode stored" };

  // Simula — self-evolution
  if (e === "proposal_approved") return { headline: "Self-improvement proposal approved", detail: `risk: ${fmt(g("risk_level"))}` };
  if (e === "proposal_rejected") return { headline: "Self-improvement proposal rejected", detail: fmt(g("reason")) };
  if (e === "mutation_applied") return { headline: "Code change applied", detail: fmt(g("description") ?? g("proposal_id")) };
  if (e === "rollback_triggered") return { headline: "Change rolled back", detail: fmt(g("reason")) };

  // Oneiros — dream engine
  if (e === "nrem_begin" || e === "slow_wave_begin") return { headline: "Deep sleep started — consolidating memories" };
  if (e === "nrem_end" || e === "slow_wave_end") return { headline: "Deep sleep complete" };
  if (e === "rem_begin" || e === "dreaming_begin") return { headline: "Dreaming started" };
  if (e === "rem_end" || e === "dreaming_end") return { headline: "Dreaming complete" };
  if (e === "sleep_cycle_recorded") return { headline: "Sleep cycle logged", detail: `quality: ${fmt(g("quality"))}` };
  if (e === "insight_validated") return { headline: "Dream insight validated", detail: fmt(g("context")) };
  if (e === "waking") return { headline: "Waking up" };

  // Thread — identity
  if (e === "chapter_opened") return { headline: "New life chapter begun" };
  if (e === "chapter_closed") return { headline: "Life chapter ended" };
  if (e === "commitments_loaded") return { headline: `${fmt(g("count"))} commitments loaded` };
  if (e === "fingerprint_computed") return { headline: `Identity snapshot taken (cycle ${fmt(g("cycle"))})` };

  // Thymos — immune system
  if (e === "incident_detected") return { headline: `Incident: ${fmt(g("class") ?? g("incident_id"))}`, detail: `severity: ${fmt(g("severity"))}` };
  if (e === "incident_resolved") return { headline: "Incident resolved", detail: fmt(g("incident_id")) };
  if (e === "repair_applied") return { headline: "Repair applied", detail: fmt(g("antibody") ?? g("repair_type")) };

  // Federation
  if (e === "links_loaded") return { headline: `${fmt(g("count"))} peer instances loaded` };
  if (e === "identity_key_loaded") return { headline: "Identity certificate loaded" };
  if (e === "peer_connected") return { headline: "Connected to peer instance" };
  if (e === "peer_disconnected") return { headline: "Peer instance disconnected" };

  // Fallback — turn snake_case into a readable title
  const readable = e.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const extras = Object.entries(log)
    .filter(([k]) => !["id","ts","level","logger","event","system"].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${fmt(v)}`)
    .join(" · ");
  return { headline: readable, detail: extras || undefined };
}

// ── LogCard ───────────────────────────────────────────────────────────────────

function LogCard({ log, isNew }: { log: LogEntry; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sys = getSystem(log.logger);
  const { headline, detail } = humanize(log);
  const isError = log.level === "error" || log.level === "critical";
  const isWarn  = log.level === "warning";
  const isDebug = log.level === "debug";
  const time = formatTime(log.ts);

  const extras = Object.entries(log).filter(
    ([k]) => !["id","ts","level","logger","event"].includes(k)
  );

  return (
    <div
      className={`log-card ${isNew ? "log-card-enter" : ""}`}
      style={{
        background: isError
          ? "rgba(248,113,113,0.055)"
          : isWarn
          ? "rgba(251,191,36,0.035)"
          : "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        borderLeft: isError
          ? "3px solid rgba(248,113,113,0.5)"
          : isWarn
          ? "3px solid rgba(251,191,36,0.4)"
          : `3px solid ${sys.color}55`,
      }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3"
        style={{ cursor: extras.length > 0 ? "pointer" : "default" }}
        onClick={() => extras.length > 0 && setExpanded((x) => !x)}
      >
        {/* System identity column */}
        <div className="flex-none flex flex-col items-center gap-0.5 pt-0.5" style={{ minWidth: "48px" }}>
          <span className="text-[17px] leading-none select-none">{sys.emoji}</span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase text-center leading-tight"
            style={{ color: sys.color, opacity: 0.75, maxWidth: "48px" }}
          >
            {sys.name.split(" ")[0]}
          </span>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {isError && (
              <AlertTriangle className="flex-none w-4 h-4 mt-0.5" style={{ color: "#f87171" }} />
            )}
            <p
              className="text-[13.5px] leading-snug"
              style={{
                fontWeight: isError ? 500 : 400,
                color: isError
                  ? "rgba(255,210,210,0.95)"
                  : isDebug
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.82)",
              }}
            >
              {headline}
            </p>
          </div>
          {detail && (
            <p
              className="mt-[3px] text-[12px]"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              {detail}
            </p>
          )}
        </div>

        {/* Right column: time + expand hint */}
        <div className="flex-none flex flex-col items-end gap-1 pt-0.5">
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {time}
          </span>
          {extras.length > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px]"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {extras.length}
            </span>
          )}
        </div>
      </div>

      {/* Expanded raw fields */}
      {expanded && extras.length > 0 && (
        <div
          className="mx-4 mb-3 px-3 py-2.5 rounded-md"
          style={{
            background: "rgba(0,0,0,0.28)",
            borderLeft: `2px solid ${sys.color}30`,
          }}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {extras.map(([k, v]) => (
              <div key={k} className="flex gap-2 items-baseline text-[11px] font-mono">
                <span
                  className="flex-none"
                  style={{ color: "rgba(255,255,255,0.28)", minWidth: "6rem" }}
                >
                  {k.replace(/_/g, " ")}
                </span>
                <span style={{ color: "#93c5fd", wordBreak: "break-all" }}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── LogStream ─────────────────────────────────────────────────────────────────

export function LogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const newIdTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () =>
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    if (!isPaused && isAtBottom) scrollToBottom(false);
  }, [logs, isPaused, isAtBottom, scrollToBottom]);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${ORCHESTRATOR_URL}${LOG_STREAM_PATH}`);
      es.onopen = () => { setIsConnected(true); setConnectionError(null); };
      es.onmessage = (evt) => {
        if (isPaused) return;
        try {
          const entry: LogEntry = JSON.parse(evt.data);
          entry.id = ++logIdRef.current;
          const id = entry.id;
          setLogs((prev) => {
            const next = [...prev, entry];
            return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
          });
          setNewLogIds((prev) => new Set(prev).add(id));
          const t = setTimeout(() => {
            setNewLogIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
            newIdTimeouts.current.delete(id);
          }, 800);
          newIdTimeouts.current.set(id, t);
        } catch { /* heartbeat */ }
      };
      es.onerror = () => {
        setIsConnected(false);
        setConnectionError("Reconnecting\u2026");
        es.close();
        setTimeout(connect, 3000);
      };
      eventSourceRef.current = es;
    };
    connect();
    return () => {
      eventSourceRef.current?.close();
      newIdTimeouts.current.forEach(clearTimeout);
    };
  }, [isPaused]);

  const clearLogs = useCallback(() => {
    setLogs([]); logIdRef.current = 0; setNewLogIds(new Set());
  }, []);

  const visible = logs.filter((log) => {
    if (!showDebug && log.level === "debug") return false;
    if (levelFilter === "errors" && log.level !== "error" && log.level !== "critical") return false;
    if (levelFilter === "warnings" && log.level !== "warning") return false;
    if (systemFilter && getSystem(log.logger).key !== systemFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      const { headline, detail } = humanize(log);
      if (
        !headline.toLowerCase().includes(q) &&
        !(detail ?? "").toLowerCase().includes(q) &&
        !log.event.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const seenSystems = Array.from(
    new Set(logs.map((l) => getSystem(l.logger).key).filter(Boolean))
  ).sort() as string[];

  const errorCount = logs.filter((l) => l.level === "error" || l.level === "critical").length;
  const warnCount  = logs.filter((l) => l.level === "warning").length;

  return (
    <>
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .log-card-enter { animation: cardEnter 0.22s ease-out forwards; }
        .log-card:hover { background: rgba(255,255,255,0.018) !important; }
        .feed-scroll::-webkit-scrollbar { width: 4px; }
        .feed-scroll::-webkit-scrollbar-track { background: transparent; }
        .feed-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .feed-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }
      `}</style>

      <div className="flex flex-col h-full gap-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1
              className="text-base font-semibold"
              style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}
            >
              Activity Feed
            </h1>
            <div
              className="flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11px] font-medium"
              style={{
                background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: isConnected ? "#4ade80" : "#f87171",
                border: `1px solid ${isConnected ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)"}`,
              }}
            >
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "live" : (connectionError ?? "disconnected")}
            </div>
          </div>

          {/* Error / warning summary chips */}
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <button
                onClick={() => setLevelFilter(levelFilter === "errors" ? "" : "errors")}
                className="flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: "#f87171",
                  background: levelFilter === "errors" ? "rgba(248,113,113,0.15)" : "rgba(248,113,113,0.07)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </button>
            )}
            {warnCount > 0 && (
              <button
                onClick={() => setLevelFilter(levelFilter === "warnings" ? "" : "warnings")}
                className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full"
                style={{
                  color: "#fbbf24",
                  background: levelFilter === "warnings" ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.05)",
                  border: "1px solid rgba(251,191,36,0.15)",
                }}
              >
                {warnCount} warning{warnCount !== 1 ? "s" : ""}
              </button>
            )}
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {visible.length !== logs.length
                ? `${visible.length} / ${logs.length}`
                : `${logs.length} events`}
            </span>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div
          className="flex items-center gap-2 flex-wrap px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.055)",
          }}
        >
          <Button onClick={() => setIsPaused(!isPaused)} variant="secondary" size="sm" className="gap-1.5">
            {isPaused
              ? <><Play className="w-3.5 h-3.5" /> Resume</>
              : <><Pause className="w-3.5 h-3.5" /> Pause</>}
          </Button>
          <Button onClick={clearLogs} variant="danger" size="sm" className="gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>

          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

          <input
            type="text"
            placeholder="Search activity…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-40 px-2.5 py-[5px] text-[12px] rounded"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.82)",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />

          {seenSystems.length > 1 && (
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="px-2.5 py-[5px] text-[12px] rounded"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: systemFilter
                  ? (SYSTEMS[systemFilter]?.color ?? "rgba(255,255,255,0.82)")
                  : "rgba(255,255,255,0.38)",
                outline: "none",
              }}
            >
              <option value="" style={{ background: "#111", color: "rgba(255,255,255,0.6)" }}>
                All systems
              </option>
              {seenSystems.map((k) => (
                <option key={k} value={k} style={{ background: "#111", color: SYSTEMS[k]?.color }}>
                  {SYSTEMS[k] ? `${SYSTEMS[k].emoji} ${SYSTEMS[k].name}` : k}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-2.5 py-[5px] text-[11px] rounded"
            style={{
              background: showDebug ? "rgba(255,255,255,0.08)" : "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: showDebug ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
            }}
          >
            debug
          </button>
        </div>

        {/* ── Feed ── */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={feedRef}
            className="feed-scroll h-full overflow-y-auto rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {visible.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-full gap-2"
                style={{ color: "rgba(255,255,255,0.18)" }}
              >
                <span className="text-2xl select-none">{isConnected ? "⏳" : "📡"}</span>
                <span className="text-[12px]">
                  {logs.length === 0
                    ? isConnected ? "Waiting for activity…" : "Not connected"
                    : "Nothing matches the filter"}
                </span>
              </div>
            ) : (
              visible.map((log) => (
                <LogCard key={log.id} log={log} isNew={newLogIds.has(log.id)} />
              ))
            )}
          </div>

          {(!isAtBottom || isPaused) && (
            <button
              onClick={() => { if (isPaused) setIsPaused(false); scrollToBottom(true); }}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium hover:scale-105 transition-transform duration-150"
              style={{
                background: "rgba(96,165,250,0.12)",
                border: "1px solid rgba(96,165,250,0.28)",
                color: "#60a5fa",
                backdropFilter: "blur(8px)",
              }}
            >
              <ArrowDown className="w-3 h-3" />
              {isPaused ? "Resume & follow" : "Jump to bottom"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
