"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Terminal,
  Crosshair,
  Radio,
  StopCircle,
  Wrench,
  Copy,
  Activity,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PhaseStatus = "idle" | "started" | "completed" | "failed";

/** A single telemetry event from the global fleet metrics SSE stream. */
interface TelemetryEvent {
  src_ip: string;
  rule: string;
  vuln_id: number;
}

interface PhaseState {
  phantom: PhaseStatus;
  ast: PhaseStatus;
  z3: PhaseStatus;
  xdp: PhaseStatus;
  remediation: PhaseStatus;
}

/** A Z3-verified code patch emitted by the RepairAgent (Phase 4). */
interface VerifiedPatchResult {
  vuln_id: string;
  file_path: string;
  diff: string;
  patched_code: string;
  vulnerability_class: string;
  severity: string;
}

interface LogLine {
  id: number;
  phase: string;
  text: string;
  ts: number;
}

type RunStatus = "idle" | "running" | "success" | "failed";

/** Structured evidence from the Z3 solver boundary test. */
interface BoundaryTestResult {
  analysis_result: "EVIDENCE_FOUND";
  details: {
    vuln_id: string;
    vulnerability_class: string;
    severity: string;
    endpoint: string;
    entry_point: string;
    file_path: string;
    line_number: number | null;
    attack_goal: string;
    edge_case_input: Record<string, Record<string, unknown>>;
    variable_types: Record<string, string>;
    z3_constraints: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8000";
const ENGAGE_PATH = "/api/v1/command-center/engage";
const TERMINATE_PATH = "/api/v1/command-center/terminate";

const PHASE_META = [
  {
    key: "phantom" as const,
    label: "Phantom Harvester",
    sub: "Black-Box Recon",
    icon: Radio,
    glyph: "PH",
  },
  {
    key: "ast" as const,
    label: "AST Engine",
    sub: "Context Slicer",
    icon: Terminal,
    glyph: "AS",
  },
  {
    key: "z3" as const,
    label: "Z3 Prover",
    sub: "Mathematical Verification",
    icon: Shield,
    glyph: "Z3",
  },
  {
    key: "xdp" as const,
    label: "XDP Shield",
    sub: "Layer 2 eBPF Firewall",
    icon: Zap,
    glyph: "XP",
  },
  {
    key: "remediation" as const,
    label: "RepairAgent",
    sub: "Z3-Verified Auto-Patch",
    icon: Wrench,
    glyph: "RA",
  },
] as const;

const LOG_COLORS: Record<string, string> = {
  phantom: "#f59e0b",
  inspector: "#22d3ee",
  ast: "#a78bfa",
  z3: "#34d399",
  xdp: "#f97316",
  remediation: "#818cf8",
  error: "#ef4444",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PhaseIndicator({
  label,
  sub,
  glyph,
  icon: Icon,
  status,
}: {
  label: string;
  sub: string;
  glyph: string;
  icon: React.ElementType;
  status: PhaseStatus;
}) {
  const isActive = status === "started";
  const isDone = status === "completed";
  const isFail = status === "failed";
  const isIdle = status === "idle";

  return (
    <div
      className="phase-card"
      data-status={status}
      style={
        {
          "--glow": isDone
            ? "rgba(52,211,153,0.35)"
            : isActive
              ? "rgba(245,158,11,0.4)"
              : isFail
                ? "rgba(239,68,68,0.35)"
                : "rgba(255,255,255,0.03)",
          "--border-col": isDone
            ? "rgba(52,211,153,0.5)"
            : isActive
              ? "rgba(245,158,11,0.6)"
              : isFail
                ? "rgba(239,68,68,0.5)"
                : "rgba(255,255,255,0.07)",
        } as React.CSSProperties
      }
    >
      {/* Glyph badge */}
      <div className="phase-glyph" data-status={status}>
        {isActive ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isDone ? (
          <CheckCircle2 size={14} />
        ) : isFail ? (
          <AlertTriangle size={14} />
        ) : (
          <span className="text-[11px] font-black tracking-wider opacity-40">
            {glyph}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{
              color: isDone
                ? "#34d399"
                : isActive
                  ? "#f59e0b"
                  : isFail
                    ? "#ef4444"
                    : "rgba(255,255,255,0.35)",
            }}
          >
            {label}
          </span>
          {isActive && <span className="pulse-dot" />}
        </div>
        <div className="text-[10px] opacity-30 tracking-wide mt-0.5">{sub}</div>
      </div>

      {/* Status tag */}
      <div
        className="text-[9px] font-black tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
        style={{
          background: isDone
            ? "rgba(52,211,153,0.15)"
            : isActive
              ? "rgba(245,158,11,0.15)"
              : isFail
                ? "rgba(239,68,68,0.15)"
                : "rgba(255,255,255,0.04)",
          color: isDone
            ? "#34d399"
            : isActive
              ? "#f59e0b"
              : isFail
                ? "#ef4444"
                : "rgba(255,255,255,0.2)",
        }}
      >
        {isIdle ? "STANDBY" : status.toUpperCase()}
      </div>
    </div>
  );
}

function ScanLine() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg"
      aria-hidden
    >
      <div className="scanline" />
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#34d399",
};

function BoundaryTestCard({ result }: { result: BoundaryTestResult }) {
  const d = result.details;
  const sevColor = SEVERITY_COLORS[d.severity] ?? "#f59e0b";

  return (
    <div className="cc-boundary-card">
      <div className="cc-boundary-header">
        <Shield size={12} style={{ color: sevColor }} />
        <span
          className="cc-boundary-title"
          style={{ color: sevColor }}
        >
          BOUNDARY TEST RESULT
        </span>
        <span
          className="cc-boundary-sev"
          style={{
            background: `${sevColor}22`,
            color: sevColor,
            border: `1px solid ${sevColor}55`,
          }}
        >
          {d.severity.toUpperCase()}
        </span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">CLASS</span>
        <span className="cc-boundary-value">
          {d.vulnerability_class.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">ENDPOINT</span>
        <span className="cc-boundary-value" style={{ color: "#22d3ee" }}>
          {d.endpoint}
        </span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">GOAL</span>
        <span className="cc-boundary-value">{d.attack_goal}</span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">FILE</span>
        <span className="cc-boundary-value" style={{ color: "rgba(255,255,255,0.5)" }}>
          {d.file_path}
          {d.line_number != null ? `:${d.line_number}` : ""}
        </span>
      </div>

      {/* Edge-case inputs — the Z3 model mapped to HTTP fields */}
      <div className="cc-boundary-evidence">
        <span className="cc-boundary-label">Z3 EDGE-CASE INPUT</span>
        <pre className="cc-boundary-pre">
          {JSON.stringify(d.edge_case_input, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function VerifiedPatchCard({
  patch,
  onDeploy,
}: {
  patch: VerifiedPatchResult;
  onDeploy: (patch: VerifiedPatchResult) => void;
}) {
  const sevColor = SEVERITY_COLORS[patch.severity] ?? "#f59e0b";
  const [copied, setCopied] = useState(false);

  const copyDiff = useCallback(() => {
    navigator.clipboard.writeText(patch.diff).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [patch.diff]);

  return (
    <div className="cc-patch-card">
      <div className="cc-patch-header">
        <Wrench size={12} style={{ color: "#818cf8" }} />
        <span className="cc-patch-title">VERIFIED PATCH</span>
        <span
          className="cc-boundary-sev"
          style={{
            background: `${sevColor}22`,
            color: sevColor,
            border: `1px solid ${sevColor}55`,
          }}
        >
          {patch.severity.toUpperCase()}
        </span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">CLASS</span>
        <span className="cc-boundary-value">
          {patch.vulnerability_class.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      <div className="cc-boundary-row">
        <span className="cc-boundary-label">FILE</span>
        <span className="cc-boundary-value" style={{ color: "rgba(255,255,255,0.5)" }}>
          {patch.file_path}
        </span>
      </div>

      {patch.diff && (
        <div className="cc-patch-diff-wrap">
          <div className="cc-patch-diff-bar">
            <span className="cc-boundary-label">UNIFIED DIFF</span>
            <button
              className="cc-patch-copy-btn"
              onClick={copyDiff}
              title="Copy diff"
            >
              <Copy size={10} />
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="cc-patch-diff-pre">
            {patch.diff.split("\n").map((line, i) => {
              let color = "rgba(255,255,255,0.5)";
              if (line.startsWith("+")) color = "#34d399";
              else if (line.startsWith("-")) color = "#ef4444";
              else if (line.startsWith("@@")) color = "#818cf8";
              return (
                <span key={i} style={{ color }}>
                  {line}
                  {"\n"}
                </span>
              );
            })}
          </pre>
        </div>
      )}

      <button
        className="cc-deploy-btn"
        onClick={() => onDeploy(patch)}
      >
        <CheckCircle2 size={12} />
        DEPLOY VERIFIED FIX
      </button>
    </div>
  );
}

function FleetRadar({
  totalDrops,
  recentDrops,
}: {
  totalDrops: number;
  recentDrops: TelemetryEvent[];
}) {
  return (
    <div className="cc-fleet-radar">
      {/* Header */}
      <div className="cc-fleet-radar-header">
        <Activity size={12} style={{ color: "#ef4444" }} />
        <span className="cc-fleet-radar-title">SHIELD TELEMETRY</span>
        <span className="cc-fleet-radar-live">● LIVE</span>
      </div>

      {/* Drop counter */}
      <div className="cc-fleet-radar-counter">
        <span className="cc-fleet-radar-count">
          {totalDrops.toLocaleString()}
        </span>
        <span className="cc-fleet-radar-unit">TOTAL FLEET DROPS</span>
      </div>

      {/* Recent drops list */}
      {recentDrops.length > 0 && (
        <div className="cc-fleet-radar-list">
          {recentDrops.map((drop, i) => (
            <div key={`${drop.src_ip}-${drop.vuln_id}-${i}`} className="cc-fleet-radar-row">
              <span className="cc-fleet-radar-ip">{drop.src_ip}</span>
              <span className="cc-fleet-radar-rule">{drop.rule}</span>
              <span className="cc-fleet-radar-vid">#{drop.vuln_id}</span>
            </div>
          ))}
        </div>
      )}

      {recentDrops.length === 0 && (
        <div className="cc-fleet-radar-empty">Awaiting telemetry stream…</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function CommandCenter() {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [phases, setPhases] = useState<PhaseState>({
    phantom: "idle",
    ast: "idle",
    z3: "idle",
    xdp: "idle",
    remediation: "idle",
  });
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [extractedPath, setExtractedPath] = useState<string | null>(null);
  const [boundaryTests, setBoundaryTests] = useState<BoundaryTestResult[]>([]);
  const [verifiedPatches, setVerifiedPatches] = useState<VerifiedPatchResult[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const logIdRef = useRef(0);

  // Fleet telemetry state
  const [totalFleetDrops, setTotalFleetDrops] = useState(0);
  const [recentDrops, setRecentDrops] = useState<TelemetryEvent[]>([]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fleet telemetry SSE connection ──
  useEffect(() => {
    const metricsUrl = `${ORCHESTRATOR_URL}/api/v1/command-center/metrics`;
    const es = new EventSource(metricsUrl);

    es.addEventListener("telemetry", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as TelemetryEvent;
        setTotalFleetDrops((prev) => prev + 1);
        setRecentDrops((prev) => [data, ...prev].slice(0, 5));
      } catch {
        // Malformed frame — skip silently
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; no action needed
    };

    return () => {
      es.close();
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const addLog = useCallback((phase: string, text: string) => {
    const id = ++logIdRef.current;
    setLogs((prev) => [...prev, { id, phase, text, ts: Date.now() }]);
  }, []);

  const reset = useCallback(() => {
    setLogs([]);
    setPhases({ phantom: "idle", ast: "idle", z3: "idle", xdp: "idle", remediation: "idle" });
    setRunStatus("idle");
    setExtractedPath(null);
    setBoundaryTests([]);
    setVerifiedPatches([]);
    setTaskId(null);
    setIsTerminating(false);
    logIdRef.current = 0;
  }, []);

  const engage = useCallback(async () => {
    if (!url.trim() || runStatus === "running") return;

    reset();
    setRunStatus("running");
    addLog("system", `[SYS] ENGAGE sequence initiated — target: ${url}`);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${ORCHESTRATOR_URL}${ENGAGE_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: url }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }

          switch (eventType) {
            case "task_id":
              setTaskId(payload.task_id as string);
              break;

            case "log":
              addLog(
                (payload.phase as string) ?? "system",
                (payload.text as string) ?? "",
              );
              break;

            case "phase": {
              const name = payload.name as keyof PhaseState;
              const status = payload.status as PhaseStatus;
              if (name in { phantom: 1, ast: 1, z3: 1, xdp: 1, remediation: 1 }) {
                setPhases((prev) => ({ ...prev, [name]: status }));
              }
              break;
            }

            case "result":
              setExtractedPath(payload.file_path as string);
              break;

            case "boundary_test":
              setBoundaryTests((prev) => [
                ...prev,
                payload as unknown as BoundaryTestResult,
              ]);
              addLog(
                "z3",
                `[Z3·EVIDENCE] ${(payload as unknown as BoundaryTestResult).details.vulnerability_class.toUpperCase()} — ${(payload as unknown as BoundaryTestResult).details.endpoint}`,
              );
              break;

            case "verified_patch":
              setVerifiedPatches((prev) => [
                ...prev,
                payload as unknown as VerifiedPatchResult,
              ]);
              addLog(
                "remediation",
                `[REPAIR·PATCH] Verified fix for ${(payload as unknown as VerifiedPatchResult).file_path}`,
              );
              break;

            case "error":
              addLog("error", `[ERR] ${payload.message}`);
              break;

            case "done":
              if (payload.success) {
                setRunStatus("success");
                addLog("system", `[SYS] ${payload.message}`);
              } else {
                setRunStatus("failed");
                addLog("error", `[ERR] ${payload.message}`);
              }
              break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setRunStatus("failed");
      addLog("error", `[ERR] Connection failed: ${(err as Error).message}`);
    }
  }, [url, runStatus, reset, addLog]);

  const terminate = useCallback(async () => {
    if (!taskId || isTerminating) return;
    setIsTerminating(true);
    addLog("system", "[SYS] TERMINATE signal sent — awaiting subprocess exit");

    try {
      const res = await fetch(
        `${ORCHESTRATOR_URL}${TERMINATE_PATH}/${taskId}`,
        { method: "POST" },
      );
      const result = await res.json();

      // Abort the SSE reader so the UI stops waiting for frames.
      abortRef.current?.abort();

      if (result.status === "terminated" || result.status === "already_exited") {
        addLog("system", `[SYS] Subprocess terminated (exit ${result.returncode ?? "?"})`);
        setRunStatus("failed");
      } else {
        addLog("error", `[ERR] Terminate returned: ${result.message ?? "unknown"}`);
      }
    } catch (err) {
      addLog("error", `[ERR] Terminate request failed: ${(err as Error).message}`);
    } finally {
      setIsTerminating(false);
      setTaskId(null);
    }
  }, [taskId, isTerminating, addLog]);

  const handleDeployPatch = useCallback(
    async (patch: VerifiedPatchResult) => {
      addLog(
        "remediation",
        `[REPAIR·DEPLOY] Deploying verified fix to ${patch.file_path}...`,
      );

      try {
        const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/command-center/deploy-patch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vuln_id: patch.vuln_id,
            file_path: patch.file_path,
            patched_code: patch.patched_code,
          }),
        });

        if (res.ok) {
          addLog("remediation", `[REPAIR·DEPLOY] Fix deployed successfully — ${patch.file_path}`);
        } else {
          const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
          addLog("error", `[REPAIR·DEPLOY] Failed: ${err.message ?? res.statusText}`);
        }
      } catch (err) {
        addLog("error", `[REPAIR·DEPLOY] Request failed: ${(err as Error).message}`);
      }
    },
    [addLog],
  );

  const isRunning = runStatus === "running";

  return (
    <>
      <style>{`
        /* ── Command Center Styles ─────────────────────────────────────────── */

        .cc-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 0;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          color: rgba(255,255,255,0.85);
          position: relative;
          overflow: hidden;
        }

        /* Grid noise background */
        .cc-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .cc-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
          padding: 4px 0;
        }

        /* ── Header ──────────────────────────────────────────────────────── */
        .cc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(245,158,11,0.15);
        }

        .cc-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cc-crosshair {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(245,158,11,0.4);
          color: #f59e0b;
          position: relative;
        }

        .cc-crosshair::before,
        .cc-crosshair::after {
          content: '';
          position: absolute;
          background: rgba(245,158,11,0.6);
        }

        .cc-crosshair::before {
          width: 1px;
          height: 100%;
          left: 50%;
        }

        .cc-crosshair::after {
          height: 1px;
          width: 100%;
          top: 50%;
        }

        .cc-title {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: #f59e0b;
        }

        .cc-subtitle {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          margin-top: 1px;
        }

        .cc-status-chip {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
        }

        /* ── Target Input Row ─────────────────────────────────────────────── */
        .cc-input-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
        }

        .cc-input-wrap {
          flex: 1;
          position: relative;
        }

        .cc-input-label {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(245,158,11,0.5);
          pointer-events: none;
          white-space: nowrap;
        }

        .cc-input {
          width: 100%;
          height: 44px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(245,158,11,0.2);
          color: rgba(255,255,255,0.9);
          font-family: inherit;
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 0 14px 0 88px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .cc-input:focus {
          border-color: rgba(245,158,11,0.55);
          box-shadow: 0 0 0 1px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.04);
        }

        .cc-input::placeholder {
          color: rgba(255,255,255,0.18);
        }

        .cc-engage-btn {
          height: 44px;
          padding: 0 24px;
          background: rgba(245,158,11,0.12);
          border: 1px solid rgba(245,158,11,0.45);
          color: #f59e0b;
          font-family: inherit;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.15s;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
        }

        .cc-engage-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.08), transparent);
          transform: translateX(-100%);
          transition: transform 0.4s;
        }

        .cc-engage-btn:hover:not(:disabled)::before {
          transform: translateX(100%);
        }

        .cc-engage-btn:hover:not(:disabled) {
          background: rgba(245,158,11,0.2);
          border-color: rgba(245,158,11,0.7);
          box-shadow: 0 0 20px rgba(245,158,11,0.2);
        }

        .cc-engage-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .cc-engage-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cc-terminate-btn {
          background: rgba(239,68,68,0.12);
          border-color: rgba(239,68,68,0.45);
          color: #ef4444;
        }

        .cc-terminate-btn::before {
          background: linear-gradient(90deg, transparent, rgba(239,68,68,0.08), transparent);
        }

        .cc-terminate-btn:hover:not(:disabled) {
          background: rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.7);
          box-shadow: 0 0 20px rgba(239,68,68,0.2);
        }

        /* ── Main layout ─────────────────────────────────────────────────── */
        .cc-body {
          display: grid;
          grid-template-columns: 1fr 260px;
          grid-template-rows: 1fr;
          gap: 12px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* ── Terminal ────────────────────────────────────────────────────── */
        .cc-terminal-wrap {
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.75);
          border: 1px solid rgba(245,158,11,0.18);
          position: relative;
          min-height: 0;
          overflow: hidden;
        }

        .cc-terminal-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(245,158,11,0.1);
          background: rgba(245,158,11,0.04);
          flex-shrink: 0;
        }

        .cc-terminal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .cc-terminal-title {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(245,158,11,0.6);
          flex: 1;
        }

        .cc-log-count {
          font-size: 9px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em;
        }

        .cc-terminal-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          min-height: 0;
          scroll-behavior: smooth;
        }

        .cc-terminal-body::-webkit-scrollbar {
          width: 4px;
        }

        .cc-terminal-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .cc-terminal-body::-webkit-scrollbar-thumb {
          background: rgba(245,158,11,0.2);
          border-radius: 2px;
        }

        .cc-log-line {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 1px 0;
          font-size: 11px;
          line-height: 1.55;
        }

        .cc-log-index {
          font-size: 9px;
          color: rgba(255,255,255,0.12);
          min-width: 28px;
          text-align: right;
          flex-shrink: 0;
          user-select: none;
        }

        .cc-log-text {
          word-break: break-all;
        }

        .cc-cursor {
          display: inline-block;
          width: 7px;
          height: 13px;
          background: rgba(245,158,11,0.7);
          margin-left: 2px;
          animation: blink 1.1s step-end infinite;
          vertical-align: text-bottom;
        }

        @keyframes blink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }

        .cc-empty-term {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 8px;
          opacity: 0.2;
          user-select: none;
        }

        .cc-empty-term-grid {
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(245,158,11,0.6);
        }

        /* ── Scan line animation ─────────────────────────────────────────── */
        @keyframes scanline-move {
          from { top: -10% }
          to   { top: 110% }
        }

        .scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.08), transparent);
          animation: scanline-move 5s linear infinite;
          pointer-events: none;
        }

        /* ── Status HUD ──────────────────────────────────────────────────── */
        .cc-hud {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
          min-height: 0;
          overflow-y: auto;
        }

        .cc-hud::-webkit-scrollbar {
          width: 4px;
        }

        .cc-hud::-webkit-scrollbar-track {
          background: transparent;
        }

        .cc-hud::-webkit-scrollbar-thumb {
          background: rgba(245,158,11,0.2);
          border-radius: 2px;
        }

        .cc-hud-header {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .phase-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(0,0,0,0.5);
          border: 1px solid var(--border-col);
          box-shadow: 0 0 20px var(--glow);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .phase-card[data-status="started"]::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #f59e0b;
          box-shadow: 0 0 8px rgba(245,158,11,0.8);
          animation: phase-progress 1.5s ease-in-out infinite alternate;
        }

        @keyframes phase-progress {
          from { opacity: 0.4 }
          to   { opacity: 1 }
        }

        .phase-card[data-status="completed"]::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #34d399;
          box-shadow: 0 0 8px rgba(52,211,153,0.8);
        }

        .phase-card[data-status="failed"]::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.8);
        }

        .phase-glyph {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }

        .phase-glyph[data-status="completed"] {
          border-color: rgba(52,211,153,0.4);
          color: #34d399;
          background: rgba(52,211,153,0.06);
        }

        .phase-glyph[data-status="started"] {
          border-color: rgba(245,158,11,0.4);
          color: #f59e0b;
          background: rgba(245,158,11,0.06);
        }

        .phase-glyph[data-status="failed"] {
          border-color: rgba(239,68,68,0.4);
          color: #ef4444;
          background: rgba(239,68,68,0.06);
        }

        /* ── Pulse dot ────────────────────────────────────────────────────── */
        .pulse-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 6px #f59e0b;
          animation: pulse-ring 1s ease-out infinite;
        }

        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.7) }
          70%  { box-shadow: 0 0 0 5px rgba(245,158,11,0) }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0) }
        }

        /* ── Result panel ────────────────────────────────────────────────── */
        .cc-result {
          margin-top: 8px;
          padding: 10px 12px;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(52,211,153,0.25);
          box-shadow: 0 0 16px rgba(52,211,153,0.08);
        }

        .cc-result-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(52,211,153,0.6);
          margin-bottom: 4px;
        }

        .cc-result-path {
          font-size: 10px;
          color: #34d399;
          word-break: break-all;
          line-height: 1.4;
        }

        /* ── Boundary Test Card ──────────────────────────────────────────── */
        .cc-boundary-card {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(239,68,68,0.25);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .cc-boundary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
        }

        .cc-boundary-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cc-boundary-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          flex: 1;
        }

        .cc-boundary-sev {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.15em;
          padding: 1px 5px;
          border-radius: 2px;
        }

        .cc-boundary-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .cc-boundary-label {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          min-width: 52px;
          flex-shrink: 0;
        }

        .cc-boundary-value {
          font-size: 10px;
          color: rgba(255,255,255,0.75);
          word-break: break-all;
          line-height: 1.35;
        }

        .cc-boundary-evidence {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 2px;
        }

        .cc-boundary-pre {
          font-family: inherit;
          font-size: 9px;
          line-height: 1.45;
          color: #34d399;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(52,211,153,0.15);
          padding: 6px 8px;
          margin: 0;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* ── Verified Patch Card ────────────────────────────────────────── */
        .cc-patch-card {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(129,140,248,0.25);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .cc-patch-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #818cf8;
          box-shadow: 0 0 8px rgba(129,140,248,0.6);
        }

        .cc-patch-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cc-patch-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #818cf8;
          flex: 1;
        }

        .cc-patch-diff-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 2px;
        }

        .cc-patch-diff-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cc-patch-copy-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: inherit;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 2px 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .cc-patch-copy-btn:hover {
          color: rgba(255,255,255,0.6);
          border-color: rgba(255,255,255,0.25);
        }

        .cc-patch-diff-pre {
          font-family: inherit;
          font-size: 9px;
          line-height: 1.45;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(129,140,248,0.12);
          padding: 6px 8px;
          margin: 0;
          overflow-x: auto;
          white-space: pre;
          max-height: 200px;
          overflow-y: auto;
        }

        .cc-patch-diff-pre::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }

        .cc-patch-diff-pre::-webkit-scrollbar-thumb {
          background: rgba(129,140,248,0.2);
          border-radius: 2px;
        }

        .cc-deploy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          height: 32px;
          margin-top: 4px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #34d399;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.3);
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          overflow: hidden;
        }

        .cc-deploy-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(52,211,153,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.4s;
        }

        .cc-deploy-btn:hover::before {
          transform: translateX(100%);
        }

        .cc-deploy-btn:hover {
          background: rgba(52,211,153,0.15);
          border-color: rgba(52,211,153,0.55);
          box-shadow: 0 0 16px rgba(52,211,153,0.15);
        }

        .cc-deploy-btn:active {
          transform: scale(0.98);
        }

        /* ── Bottom bar ──────────────────────────────────────────────────── */
        .cc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .cc-footer-stat {
          font-size: 9px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
        }

        /* ── Fleet Radar / Shield Telemetry ─────────────────────────────── */
        .cc-fleet-radar {
          background: rgba(0,0,0,0.65);
          border: 1px solid rgba(239,68,68,0.3);
          box-shadow: 0 0 24px rgba(239,68,68,0.08), inset 0 0 40px rgba(239,68,68,0.03);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .cc-fleet-radar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: #ef4444;
          box-shadow: 0 0 10px rgba(239,68,68,0.8);
          animation: fleet-pulse 2s ease-in-out infinite;
        }

        @keyframes fleet-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 6px rgba(239,68,68,0.4) }
          50%      { opacity: 1;   box-shadow: 0 0 14px rgba(239,68,68,1) }
        }

        .cc-fleet-radar-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cc-fleet-radar-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #ef4444;
          flex: 1;
        }

        .cc-fleet-radar-live {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #ef4444;
          animation: fleet-live-blink 1.5s step-end infinite;
        }

        @keyframes fleet-live-blink {
          0%, 100% { opacity: 1 }
          50%      { opacity: 0.3 }
        }

        .cc-fleet-radar-counter {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 6px 0;
        }

        .cc-fleet-radar-count {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #ef4444;
          text-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2);
          line-height: 1;
        }

        .cc-fleet-radar-unit {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(239,68,68,0.5);
        }

        .cc-fleet-radar-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-top: 1px solid rgba(239,68,68,0.12);
          padding-top: 6px;
        }

        .cc-fleet-radar-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 0;
          font-size: 10px;
          animation: fleet-row-in 0.3s ease-out;
        }

        @keyframes fleet-row-in {
          from { opacity: 0; transform: translateX(-6px) }
          to   { opacity: 1; transform: translateX(0) }
        }

        .cc-fleet-radar-ip {
          color: #f59e0b;
          font-weight: 700;
          letter-spacing: 0.03em;
          min-width: 100px;
        }

        .cc-fleet-radar-rule {
          color: rgba(255,255,255,0.45);
          font-size: 9px;
          letter-spacing: 0.1em;
          flex: 1;
        }

        .cc-fleet-radar-vid {
          font-size: 9px;
          font-weight: 700;
          color: rgba(239,68,68,0.6);
          letter-spacing: 0.05em;
        }

        .cc-fleet-radar-empty {
          font-size: 9px;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.1em;
          text-align: center;
          padding: 8px 0;
        }
      `}</style>

      <div className="cc-root">
        <div className="cc-inner">
          {/* ── Header ── */}
          <div className="cc-header">
            <div className="cc-title-group">
              <div className="cc-crosshair">
                <Crosshair
                  size={14}
                  style={{ position: "relative", zIndex: 1 }}
                />
              </div>
              <div>
                <div className="cc-title">Command Center</div>
                <div className="cc-subtitle">
                  EcodiaOS · Autonomous Threat Pipeline
                </div>
              </div>
            </div>

            <div
              className="cc-status-chip"
              style={{
                background:
                  runStatus === "running"
                    ? "rgba(245,158,11,0.12)"
                    : runStatus === "success"
                      ? "rgba(52,211,153,0.12)"
                      : runStatus === "failed"
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  runStatus === "running"
                    ? "rgba(245,158,11,0.35)"
                    : runStatus === "success"
                      ? "rgba(52,211,153,0.35)"
                      : runStatus === "failed"
                        ? "rgba(239,68,68,0.35)"
                        : "rgba(255,255,255,0.1)"
                }`,
                color:
                  runStatus === "running"
                    ? "#f59e0b"
                    : runStatus === "success"
                      ? "#34d399"
                      : runStatus === "failed"
                        ? "#ef4444"
                        : "rgba(255,255,255,0.3)",
              }}
            >
              {runStatus === "idle"
                ? "● STANDBY"
                : runStatus === "running"
                  ? "◉ EXECUTING"
                  : runStatus === "success"
                    ? "✓ COMPLETE"
                    : "✕ FAILED"}
            </div>
          </div>

          {/* ── Input Row ── */}
          <div className="cc-input-row">
            <div className="cc-input-wrap">
              <span className="cc-input-label">TARGET://</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && engage()}
                placeholder="https://example.com"
                className="cc-input"
                disabled={isRunning}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {runStatus !== "idle" && !isRunning && (
              <button
                onClick={reset}
                disabled={isRunning}
                className="cc-engage-btn"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.03)",
                  letterSpacing: "0.2em",
                  padding: "0 16px",
                }}
              >
                RESET
              </button>
            )}

            {isRunning && taskId && (
              <button
                onClick={terminate}
                disabled={isTerminating}
                className="cc-engage-btn cc-terminate-btn"
              >
                {isTerminating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    KILLING
                  </>
                ) : (
                  <>
                    <StopCircle size={13} />
                    TERMINATE
                  </>
                )}
              </button>
            )}

            <button
              onClick={engage}
              disabled={isRunning || !url.trim()}
              className="cc-engage-btn"
            >
              {isRunning ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  RUNNING
                </>
              ) : (
                <>
                  <Zap size={13} />
                  ENGAGE
                </>
              )}
            </button>
          </div>

          {/* ── Main Body ── */}
          <div className="cc-body">
            {/* Terminal */}
            <div className="cc-terminal-wrap">
              <ScanLine />
              <div className="cc-terminal-bar">
                <div
                  className="cc-terminal-dot"
                  style={{ background: "#ef4444" }}
                />
                <div
                  className="cc-terminal-dot"
                  style={{ background: "#f59e0b" }}
                />
                <div
                  className="cc-terminal-dot"
                  style={{ background: "#34d399" }}
                />
                <div className="cc-terminal-title">STDOUT · PIPELINE LOG</div>
                <div className="cc-log-count">{logs.length} lines</div>
              </div>

              <div ref={terminalRef} className="cc-terminal-body">
                {logs.length === 0 ? (
                  <div className="cc-empty-term">
                    <Terminal
                      size={28}
                      style={{ color: "rgba(245,158,11,0.3)" }}
                    />
                    <div className="cc-empty-term-grid">Awaiting signal</div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.15)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Enter target URL and press ENGAGE
                    </div>
                  </div>
                ) : (
                  logs.map((line, i) => (
                    <div key={line.id} className="cc-log-line">
                      <span className="cc-log-index">
                        {String(i + 1).padStart(3, "0")}
                      </span>
                      <span
                        className="cc-log-text"
                        style={{
                          color:
                            line.phase === "error"
                              ? "#ef4444"
                              : line.phase === "system"
                                ? "rgba(255,255,255,0.35)"
                                : (LOG_COLORS[line.phase] ??
                                  "rgba(255,255,255,0.75)"),
                        }}
                      >
                        {line.text}
                      </span>
                    </div>
                  ))
                )}
                {isRunning && (
                  <div className="cc-log-line">
                    <span className="cc-log-index">···</span>
                    <span className="cc-cursor" />
                  </div>
                )}
              </div>
            </div>

            {/* Status HUD */}
            <div className="cc-hud">
              <div className="cc-hud-header">Pipeline HUD</div>

              <FleetRadar totalDrops={totalFleetDrops} recentDrops={recentDrops} />

              {PHASE_META.map((p) => (
                <PhaseIndicator
                  key={p.key}
                  label={p.label}
                  sub={p.sub}
                  glyph={p.glyph}
                  icon={p.icon}
                  status={phases[p.key]}
                />
              ))}

              {boundaryTests.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div className="cc-hud-header" style={{ marginTop: 4 }}>
                    Boundary Tests · {boundaryTests.length}
                  </div>
                  {boundaryTests.map((bt) => (
                    <BoundaryTestCard key={bt.details.vuln_id} result={bt} />
                  ))}
                </div>
              )}

              {verifiedPatches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div className="cc-hud-header" style={{ marginTop: 4 }}>
                    Verified Patches · {verifiedPatches.length}
                  </div>
                  {verifiedPatches.map((vp) => (
                    <VerifiedPatchCard
                      key={vp.vuln_id}
                      patch={vp}
                      onDeploy={handleDeployPatch}
                    />
                  ))}
                </div>
              )}

              {extractedPath && (
                <div className="cc-result">
                  <div className="cc-result-label">Phantom Output Path</div>
                  <div className="cc-result-path">{extractedPath}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="cc-footer">
            <div className="cc-footer-stat">
              EcodiaOS · SIGINT-7 · Build 2025
            </div>
            <div className="cc-footer-stat">
              {`${ORCHESTRATOR_URL}${ENGAGE_PATH}`}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
