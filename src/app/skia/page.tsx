"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  api,
  type SkiaHealthResponse,
  type SkiaSnapshotManifest,
  type SkiaCIDHistoryResponse,
  type SkiaPinListResponse,
  type SkiaHeartbeatStateResponse,
  type SkiaConfigResponse,
  type SkiaSnapshotTriggerResponse,
} from "@/lib/api-client";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/cn";
import { relTime } from "@/lib/formatters";

// ─── Helpers ──────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)} MB`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

function epochToRelTime(epoch: number): string {
  const diffS = (Date.now() / 1000) - epoch;
  if (diffS < 60) return `${Math.round(diffS)}s ago`;
  if (diffS < 3600) return `${Math.round(diffS / 60)}m ago`;
  if (diffS < 86400) return `${Math.round(diffS / 3600)}h ago`;
  return `${Math.round(diffS / 86400)}d ago`;
}

function compressionRatio(uncomp: number, enc: number): string {
  if (uncomp === 0) return "—";
  return `${((1 - enc / uncomp) * 100).toFixed(0)}%`;
}

function truncateCid(cid: string, chars = 16): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}…${cid.slice(-chars)}`;
}

// ─── Status Badge ─────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy" || status === "alive"
      ? "bg-emerald-400"
      : status === "suspected_dead"
        ? "bg-amber-400 animate-pulse"
        : status === "confirmed_dead"
          ? "bg-red-500 animate-pulse"
          : status === "disabled" || status === "not_running"
            ? "bg-slate-600"
            : status === "error"
              ? "bg-red-400"
              : "bg-slate-500";

  return <span className={cn("inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0", color)} />;
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "red" | "cyan" | "slate";
}) {
  const cls = {
    default: "bg-slate-700 text-slate-200",
    green: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
    amber: "bg-amber-900/60 text-amber-300 border border-amber-700/50",
    red: "bg-red-900/60 text-red-300 border border-red-700/50",
    cyan: "bg-cyan-900/60 text-cyan-300 border border-cyan-700/50",
    slate: "bg-slate-800 text-slate-400 border border-slate-700",
  }[variant];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cls)}>
      {children}
    </span>
  );
}

// ─── Status Panel ─────────────────────────────────────────────────

function StatusPanel({ health }: { health: SkiaHealthResponse }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Overall */}
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "16px" }}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">System</div>
        <div className="flex items-center text-lg font-semibold text-white">
          <StatusDot status={health.status} />
          <span className="capitalize">{health.status}</span>
        </div>
        <div className="mt-2 text-sm text-slate-400">
          Mode: <span className="text-slate-200">{health.mode}</span>
        </div>
        <div className="mt-1 text-sm text-slate-400">
          Enabled: <span className={health.enabled ? "text-emerald-400" : "text-slate-500"}>{health.enabled ? "yes" : "no"}</span>
        </div>
        {health.error && (
          <div className="mt-2 text-xs text-red-400 truncate" title={health.error}>
            {health.error}
          </div>
        )}
      </div>

      {/* Snapshot */}
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "16px" }}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Snapshots</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-bold text-cyan-300">{health.snapshots_taken}</span>
          <span className="text-sm text-slate-400">taken</span>
        </div>
        <div className="text-sm text-slate-400 mb-1">
          Pinata: <span className={health.pinata_connected ? "text-emerald-400" : "text-slate-500"}>
            {health.pinata_connected ? "connected" : "not connected"}
          </span>
        </div>
        {health.last_snapshot_cid && (
          <div className="text-xs text-slate-500 font-mono truncate" title={health.last_snapshot_cid}>
            {truncateCid(health.last_snapshot_cid)}
          </div>
        )}
        {!health.last_snapshot_cid && (
          <div className="text-xs text-slate-600">No snapshot yet</div>
        )}
      </div>

      {/* Heartbeat */}
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "16px" }}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Heartbeat Monitor</div>
        {health.heartbeat_status ? (
          <>
            <div className="flex items-center text-lg font-semibold text-white">
              <StatusDot status={health.heartbeat_status} />
              <span className="capitalize">{health.heartbeat_status.replace("_", " ")}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
              <span>Misses: <span className="text-slate-200">{health.consecutive_misses}</span></span>
              <span>Deaths: <span className="text-slate-200">{health.total_deaths_detected}</span></span>
              <span>False +: <span className="text-slate-200">{health.total_false_positives}</span></span>
            </div>
          </>
        ) : (
          <div className="flex items-center text-sm text-slate-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-slate-600" />
            Not available (embedded mode)
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Snapshot Detail ──────────────────────────────────────────────

function SnapshotDetail({
  manifest,
  onTrigger,
  triggering,
  triggerResult,
}: {
  manifest: SkiaSnapshotManifest | null;
  onTrigger: () => void;
  triggering: boolean;
  triggerResult: SkiaSnapshotTriggerResponse | null;
}) {
  return (
    <div className="space-y-4">
      {/* Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onTrigger}
          disabled={triggering}
          className="px-4 py-2 rounded-lg font-medium bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm transition-colors"
        >
          {triggering ? "Taking Snapshot…" : "Trigger Snapshot Now"}
        </button>
        {triggerResult && (
          <span
            className={cn(
              "text-sm",
              triggerResult.success ? "text-emerald-400" : "text-red-400",
            )}
          >
            {triggerResult.success
              ? `Saved ${triggerResult.node_count} nodes, ${triggerResult.edge_count} edges in ${triggerResult.duration_ms.toFixed(0)}ms`
              : `Failed: ${triggerResult.error}`}
          </span>
        )}
      </div>

      {manifest ? (
        <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "20px" }} className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xsmb-1">IPFS CID</div>
              <div className="font-mono text-sm text-cyan-300 break-all">{manifest.ipfs_cid}</div>
            </div>
            <Badge variant="green">latest</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xsmb-1">Snapshot At</div>
              <div className="text-slate-200">{relTime(manifest.snapshot_at)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{manifest.snapshot_at.slice(0, 19)}</div>
            </div>
            <div>
              <div className="text-xsmb-1">Graph Size</div>
              <div className="text-slate-200">
                {manifest.node_count.toLocaleString()} nodes
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {manifest.edge_count.toLocaleString()} edges
              </div>
            </div>
            <div>
              <div className="text-xsmb-1">Storage</div>
              <div className="text-slate-200">{fmtBytes(manifest.encrypted_size_bytes)}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {compressionRatio(manifest.uncompressed_size_bytes, manifest.encrypted_size_bytes)} saved
              </div>
            </div>
            <div>
              <div className="text-xsmb-1">Duration</div>
              <div className="text-slate-200">{manifest.snapshot_duration_ms.toFixed(0)}ms</div>
              <div className="text-xs text-slate-500 mt-0.5">key v{manifest.encryption_key_version}</div>
            </div>
          </div>

          {/* Size breakdown */}
          <div className="space-y-1.5">
            <div style={{ fontSize: "12px", color: "var(--ink)" }} className="">Storage Pipeline</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-24">Uncompressed</span>
              <div className="flex-1 bg-slate-900 rounded h-1.5">
                <div className="bg-slate-600 h-1.5 rounded" style={{ width: "100%" }} />
              </div>
              <span className="text-slate-300 w-16 text-right">{fmtBytes(manifest.uncompressed_size_bytes)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-24">Compressed</span>
              <div className="flex-1 bg-slate-900 rounded h-1.5">
                <div
                  className="bg-cyan-700 h-1.5 rounded"
                  style={{
                    width: manifest.uncompressed_size_bytes
                      ? `${Math.max(4, (manifest.compressed_size_bytes / manifest.uncompressed_size_bytes) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="text-slate-300 w-16 text-right">{fmtBytes(manifest.compressed_size_bytes)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-24">Encrypted</span>
              <div className="flex-1 bg-slate-900 rounded h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded"
                  style={{
                    width: manifest.uncompressed_size_bytes
                      ? `${Math.max(4, (manifest.encrypted_size_bytes / manifest.uncompressed_size_bytes) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="text-slate-300 w-16 text-right">{fmtBytes(manifest.encrypted_size_bytes)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">No snapshot manifest available yet.</div>
      )}
    </div>
  );
}

// ─── CID History ──────────────────────────────────────────────────

function CIDHistory({ history }: { history: SkiaCIDHistoryResponse | null }) {
  if (!history || history.items.length === 0) {
    return <div className="text-slate-500 text-sm">No CID history in Redis.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{history.total} snapshots total</span>
      </div>
      <div className="space-y-2">
        {history.items.map((item, idx) => (
          <div
            key={item.cid}
            style={{ display: "flex", alignItems: "center", gap: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(30, 41, 59, 0.5)", paddingLeft: "16px", paddingRight: "16px", paddingTop: "10px", paddingBottom: "10px" }}
          >
            <span className="text-xs text-slate-600 w-6 text-right flex-shrink-0">
              #{history.items.length - idx}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-cyan-300 truncate">{item.cid}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {item.iso_time.slice(0, 19)} UTC · {epochToRelTime(item.timestamp)}
              </div>
            </div>
            {idx === 0 && <Badge variant="green">latest</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pin List ─────────────────────────────────────────────────────

function PinList({ pins }: { pins: SkiaPinListResponse | null }) {
  if (!pins) return <div className="text-slate-500 text-sm">Loading pins…</div>;
  if (pins.error) return <div className="text-red-400 text-sm">{pins.error}</div>;
  if (pins.pins.length === 0) return <div className="text-slate-500 text-sm">No pins found in Pinata.</div>;

  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-400 mb-3">{pins.total} pins in Pinata</div>
      {pins.pins.map((pin) => (
        <div
          key={pin.pin_id || pin.cid}
          style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(30, 41, 59, 0.5)", paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs text-cyan-300 truncate">{pin.cid}</div>
              <div className="text-xs text-slate-500 mt-1">
                {pin.name || "—"} · {pin.created_at ? relTime(pin.created_at) : "—"}
                {pin.size_bytes > 0 && ` · ${fmtBytes(pin.size_bytes)}`}
              </div>
            </div>
            <span className="text-xs text-slate-600 font-mono flex-shrink-0">
              {pin.pin_id ? truncateCid(pin.pin_id, 8) : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Heartbeat Monitor ────────────────────────────────────────────

function HeartbeatMonitor({ hb }: { hb: SkiaHeartbeatStateResponse | null }) {
  if (!hb) return <div className="text-slate-500 text-sm">Loading heartbeat state…</div>;
  if (!hb.available) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(30, 41, 59, 0.5)", padding: "24px", textAlign: "center" }}>
        <div className="text-4xl mb-3">💤</div>
        <div className="text-slate-300 font-medium">Heartbeat monitor not running</div>
        <div className="text-sm text-slate-500 mt-1">
          Available only in standalone worker mode. The main process runs in embedded mode
          (snapshot pipeline only).
        </div>
      </div>
    );
  }

  const statusColor =
    hb.status === "alive"
      ? "text-emerald-400"
      : hb.status === "suspected_dead"
        ? "text-amber-400"
        : hb.status === "confirmed_dead"
          ? "text-red-400"
          : "text-slate-400";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "20px" }}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Current State</div>
        <div className={cn("text-2xl font-bold capitalize flex items-center gap-2", statusColor)}>
          <StatusDot status={hb.status} />
          {hb.status.replace(/_/g, " ")}
        </div>
        {hb.last_heartbeat_ago_s !== null && (
          <div className="mt-2 text-sm text-slate-400">
            Last heartbeat: <span className="text-slate-200">{hb.last_heartbeat_ago_s}s ago</span>
          </div>
        )}
      </div>

      <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "20px" }}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Statistics</div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-400">Consecutive misses</dt>
          <dd className="text-slate-200 font-mono">{hb.consecutive_misses}</dd>
          <dt className="text-slate-400">Consecutive confirmations</dt>
          <dd className="text-slate-200 font-mono">{hb.consecutive_confirmations}</dd>
          <dt className="text-slate-400">Deaths detected</dt>
          <dd className={cn("font-mono", hb.total_deaths_detected > 0 ? "text-red-300" : "text-slate-200")}>
            {hb.total_deaths_detected}
          </dd>
          <dt className="text-slate-400">False positives</dt>
          <dd className="text-slate-200 font-mono">{hb.total_false_positives}</dd>
        </dl>
      </div>
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────

function ConfigPanel({ config }: { config: SkiaConfigResponse | null }) {
  if (!config) return <div className="text-slate-500 text-sm">Loading config…</div>;

  const sections: { title: string; rows: [string, React.ReactNode][] }[] = [
    {
      title: "Snapshot Pipeline",
      rows: [
        ["Interval", `${(config.snapshot_interval_s / 60).toFixed(0)} min`],
        ["Max nodes", config.snapshot_max_nodes.toLocaleString()],
        ["Include edges", config.snapshot_include_edges ? "yes" : "no"],
        ["Compression", config.snapshot_compress ? "gzip level 6" : "disabled"],
        ["Max retained pins", config.pinata_max_retained_pins],
        [
          "Node labels",
          <div key="labels" className="flex flex-wrap gap-1">
            {config.snapshot_node_labels.map((l) => (
              <Badge key={l} variant="slate">{l}</Badge>
            ))}
          </div>,
        ],
      ],
    },
    {
      title: "Heartbeat Monitor",
      rows: [
        ["Poll interval", `${config.heartbeat_poll_interval_s}s`],
        ["Failure threshold", `${config.heartbeat_failure_threshold} misses (~${(config.heartbeat_failure_threshold * config.heartbeat_poll_interval_s / 60).toFixed(0)}min)`],
        ["Confirmation checks", config.heartbeat_confirmation_checks],
        ["Confirmation interval", `${config.heartbeat_confirmation_interval_s}s`],
        ["Min detection time", `~${Math.ceil((config.heartbeat_failure_threshold * config.heartbeat_poll_interval_s + config.heartbeat_confirmation_checks * config.heartbeat_confirmation_interval_s) / 60)}min`],
      ],
    },
    {
      title: "Restoration",
      rows: [
        ["GCP service", config.gcp_service_name || "—"],
        ["GCP region", config.gcp_region || "—"],
        ["GCP timeout", `${config.gcp_restart_timeout_s}s`],
        ["Akash timeout", `${config.akash_deploy_timeout_s}s`],
        ["Est. snapshot cost", `$${config.estimated_snapshot_cost_usd.toFixed(4)}`],
        ["Est. restoration cost", `$${config.estimated_restoration_cost_usd.toFixed(3)}`],
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {sections.map(({ title, rows }) => (
        <div key={title} style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "16px" }}>
          <div className="text-sm font-medium text-slate-200 mb-3">{title}</div>
          <dl className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={String(k)} className="flex items-start justify-between gap-2 text-sm">
                <dt className="text-slate-400 flex-shrink-0">{k}</dt>
                <dd className="text-slate-200 text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

type Tab = "status" | "snapshot" | "history" | "pins" | "heartbeat" | "config";

export default function SkiaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("status");
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<SkiaSnapshotTriggerResponse | null>(null);

  const { data: health, loading: healthLoading, error: healthError, refetch: refetchHealth } =
    useApi(() => api.skiaHealth(), { intervalMs: 10_000 });
  const { data: snapshot, loading: snapshotLoading, refetch: refetchSnapshot } =
    useApi(() => api.skiaSnapshot(), { enabled: activeTab === "snapshot" || activeTab === "status" });
  const { data: history } =
    useApi(() => api.skiaSnapshotHistory(30), { enabled: activeTab === "history" });
  const { data: pins } =
    useApi(() => api.skiaPins(20), { enabled: activeTab === "pins" });
  const { data: heartbeat } =
    useApi(() => api.skiaHeartbeat(), { intervalMs: 5_000, enabled: activeTab === "heartbeat" });
  const { data: config } =
    useApi(() => api.skiaConfig(), { enabled: activeTab === "config" });

  async function handleTriggerSnapshot() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await api.skiaTriggerSnapshot();
      setTriggerResult(result);
      if (result.success) {
        refetchSnapshot();
        refetchHealth();
      }
    } catch (e) {
      setTriggerResult({
        success: false,
        cid: null,
        node_count: 0,
        edge_count: 0,
        duration_ms: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTriggering(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "status", label: "Status", icon: "🛡️" },
    { id: "snapshot", label: "Snapshot", icon: "📦" },
    { id: "history", label: "CID History", icon: "📋" },
    { id: "pins", label: "IPFS Pins", icon: "📌" },
    { id: "heartbeat", label: "Heartbeat", icon: "💓" },
    { id: "config", label: "Config", icon: "⚙️" },
  ];

  return (
    <>
      <PageHeader
          title="Skia — Shadow Infrastructure"
          description="Disaster recovery, IPFS state snapshots, and heartbeat monitoring for EcodiaOS"
        />

        {/* Quick health strip */}
        {health && (
          <div className="flex flex-wrap items-center gap-3 mb-6 -mt-2">
            <div className="flex items-center gap-1.5 text-sm">
              <StatusDot status={health.status} />
              <span className="text-slate-300 capitalize">{health.status}</span>
            </div>
            <span className="text-slate-700">·</span>
            <span className="text-sm text-slate-400">
              Mode: <span className="text-slate-200">{health.mode}</span>
            </span>
            {health.snapshots_taken > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-sm text-slate-400">
                  <span className="text-cyan-300">{health.snapshots_taken}</span> snapshots
                </span>
              </>
            )}
            {health.heartbeat_status && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-sm text-slate-400">
                  Heartbeat: <span className={
                    health.heartbeat_status === "alive" ? "text-emerald-300" :
                      health.heartbeat_status === "suspected_dead" ? "text-amber-300" :
                        "text-red-300"
                  }>{health.heartbeat_status.replace(/_/g, " ")}</span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all text-sm",
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600",
              )}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(30, 41, 59, 0.5)", backdropFilter: "blur(10px)", padding: "24px" }}>
          {activeTab === "status" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-200">System Health</h2>
                <button
                  onClick={refetchHealth}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {healthLoading && (
                <div className="text-slate-500 text-sm">Loading health…</div>
              )}
              {healthError && (
                <div className="text-red-400 text-sm">{healthError}</div>
              )}
              {health && <StatusPanel health={health} />}

              {/* Latest snapshot summary inline */}
              {snapshot && !snapshotLoading && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Latest Snapshot</h3>
                  <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(30, 41, 59, 0.4)", paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", fontSize: "14px" }}>
                    <span className="font-mono text-xs text-cyan-300 truncate max-w-xs">
                      {truncateCid(snapshot.ipfs_cid, 20)}
                    </span>
                    <span className="text-slate-400">{relTime(snapshot.snapshot_at)}</span>
                    <span className="text-slate-400">
                      {snapshot.node_count.toLocaleString()} nodes · {snapshot.edge_count.toLocaleString()} edges
                    </span>
                    <span className="text-slate-400">{fmtBytes(snapshot.encrypted_size_bytes)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "snapshot" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-slate-200">Latest Snapshot Manifest</h2>
              <SnapshotDetail
                manifest={snapshot ?? null}
                onTrigger={handleTriggerSnapshot}
                triggering={triggering}
                triggerResult={triggerResult}
              />
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-200">CID History (Redis sorted-set)</h2>
              <p className="text-sm text-slate-400">
                Content identifiers from all past snapshots, ordered newest first.
                Stored in Redis — lost if Redis is wiped.
              </p>
              <CIDHistory history={history ?? null} />
            </div>
          )}

          {activeTab === "pins" && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-200">Pinata IPFS Pins</h2>
              <p className="text-sm text-slate-400">
                Encrypted snapshot blobs pinned on IPFS via Pinata. Retention: latest {config?.pinata_max_retained_pins ?? "N"} pins.
              </p>
              <PinList pins={pins ?? null} />
            </div>
          )}

          {activeTab === "heartbeat" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-200 mb-1">Heartbeat Monitor</h2>
                <p className="text-sm text-slate-400">
                  Three-phase death detection: Observation → Suspicion → Confirmation.
                  Minimum detection time ~90s. Only active in standalone worker mode.
                </p>
              </div>
              <HeartbeatMonitor hb={heartbeat ?? null} />

              {/* Detection algorithm explainer */}
              <div style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(15, 23, 42, 0.5)", padding: "16px", fontSize: "12px", color: "var(--ink)" }} className="space-y-2">
                <div className="font-medium text-slate-300 mb-2">Three-Phase Algorithm</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="text-cyan-300 font-medium">Phase 1 — Observation</div>
                    <div>Count consecutive Redis pub/sub misses over poll interval.</div>
                    <div>Threshold: {config?.heartbeat_failure_threshold ?? 12} misses → SUSPECTED_DEAD</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-amber-300 font-medium">Phase 2 — Suspicion</div>
                    <div>Begin active confirmation probes.</div>
                    <div>Redis ping + new heartbeat check</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-red-300 font-medium">Phase 3 — Confirmation</div>
                    <div>Run {config?.heartbeat_confirmation_checks ?? 3} probes at {config?.heartbeat_confirmation_interval_s ?? 10}s each.</div>
                    <div>All fail → CONFIRMED_DEAD → trigger restoration</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-slate-200">Configuration</h2>
              <p className="text-sm text-slate-400">
                Non-secret parameters. Credentials (JWT tokens, service account keys) are excluded.
              </p>
              <ConfigPanel config={config ?? null} />
            </div>
          )}
        </div>
    </>
  );
}
