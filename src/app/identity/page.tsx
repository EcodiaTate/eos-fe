"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { fmtDurationSec } from "@/lib/formatters";
import type {
  IdentityHealthResponse,
  IdentityCertificateResponse,
  IdentityConnectorsResponse,
  IdentityConnector,
  IdentityEnvelopesResponse,
  IdentityVaultStatusResponse,
  CertificateStatus,
  ConnectorStatus,
} from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────

type Tab = "overview" | "connectors" | "vault" | "certificate";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "certificate", label: "Certificate" },
  { id: "connectors", label: "Connectors" },
  { id: "vault", label: "Vault" },
];

// ─── Helpers ───────────────────────────────────────────────────────

function certStatusVariant(status: CertificateStatus): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "valid": return "success";
    case "expiring_soon": return "warning";
    case "expired": return "danger";
    case "revoked": return "muted";
  }
}

function connectorStatusVariant(status: ConnectorStatus): "success" | "warning" | "danger" | "muted" | "info" {
  switch (status) {
    case "active": return "success";
    case "awaiting_auth": return "info";
    case "token_expired":
    case "refresh_failed": return "warning";
    case "revoked":
    case "error": return "danger";
    case "unconfigured": return "muted";
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status Overview Panel ─────────────────────────────────────────

function OverviewPanel({
  health,
  certificate,
  connectors,
  vault,
}: {
  health: IdentityHealthResponse | null;
  certificate: IdentityCertificateResponse | null;
  connectors: IdentityConnectorsResponse | null;
  vault: IdentityVaultStatusResponse | null;
}) {
  const systemStatus = health?.status ?? "error";

  const statusColor =
    systemStatus === "healthy"
      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
      : systemStatus === "degraded"
        ? "border-amber-500/40 bg-amber-500/[0.06]"
        : "border-red-500/40 bg-red-500/[0.06]";

  return (
    <div className="space-y-4">
      {/* System Status Banner */}
      <div className={cn("rounded-xl border p-4", statusColor)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white/80">Identity System</div>
            <div className="text-xs text-white/40 mt-0.5">
              Vault · OAuth Connectors · Certificates
            </div>
          </div>
          <Badge
            variant={
              systemStatus === "healthy"
                ? "success"
                : systemStatus === "degraded"
                  ? "warning"
                  : "danger"
            }
            pulse={systemStatus !== "healthy"}
          >
            {systemStatus.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Vault */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
            Vault
          </div>
          <div className="text-2xl font-bold text-white/90">
            {vault?.envelope_count ?? "—"}
          </div>
          <div className="text-xs text-white/40 mt-1">Sealed envelopes</div>
          <div className="mt-2">
            {vault?.passphrase_configured ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="danger">No passphrase</Badge>
            )}
          </div>
        </div>

        {/* Certificate */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
            Certificate
          </div>
          {certificate ? (
            <>
              <div className="text-2xl font-bold text-white/90">
                {Math.max(0, Math.round(certificate.days_remaining))}d
              </div>
              <div className="text-xs text-white/40 mt-1">Until expiry</div>
              <div className="mt-2">
                <Badge variant={certStatusVariant(certificate.status)}>
                  {certificate.status.replace("_", " ")}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-white/40">—</div>
              <div className="text-xs text-white/30 mt-1">No certificate</div>
            </>
          )}
        </div>

        {/* Active Connectors */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
            Connectors
          </div>
          <div className="text-2xl font-bold text-white/90">
            {connectors?.active ?? "—"}
            {connectors && (
              <span className="text-sm font-normal text-white/30">
                /{connectors.total}
              </span>
            )}
          </div>
          <div className="text-xs text-white/40 mt-1">Active / Total</div>
          <div className="mt-2">
            {connectors && connectors.degraded > 0 ? (
              <Badge variant="warning">{connectors.degraded} degraded</Badge>
            ) : connectors && connectors.active > 0 ? (
              <Badge variant="success">All healthy</Badge>
            ) : (
              <Badge variant="muted">None configured</Badge>
            )}
          </div>
        </div>

        {/* Key Version */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
            Key Version
          </div>
          <div className="text-2xl font-bold text-white/90">
            v{vault?.key_version ?? "—"}
          </div>
          <div className="text-xs text-white/40 mt-1">Vault key rotation</div>
          <div className="mt-2">
            <div className="text-[10px] text-white/25">
              {vault?.pbkdf2_iterations?.toLocaleString() ?? "—"} PBKDF2 iterations
            </div>
          </div>
        </div>
      </div>

      {/* Connector Status Overview */}
      {connectors && connectors.connectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Connectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connectors.connectors.map((c) => (
                <ConnectorRow key={c.connector_id} connector={c} onAction={null} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Certificate Panel ─────────────────────────────────────────────

function CertificatePanel({
  certificate,
}: {
  certificate: IdentityCertificateResponse | null;
}) {
  if (!certificate) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center text-white/30 text-sm">
            No certificate loaded — instance may be unconfigured or disabled.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.min(
    100,
    Math.max(0, (certificate.days_remaining / certificate.validity_days) * 100),
  );

  const barColor =
    certificate.status === "valid"
      ? "bg-emerald-500"
      : certificate.status === "expiring_soon"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card glow>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Ecodian Certificate</CardTitle>
            <Badge variant={certStatusVariant(certificate.status)}>
              {certificate.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expiry progress bar */}
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Validity remaining</span>
              <span>
                {Math.round(certificate.days_remaining)}d of {certificate.validity_days}d
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Fields */}
          <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
            <CertField label="Certificate ID" value={certificate.certificate_id} mono />
            <CertField label="Type" value={certificate.certificate_type.toUpperCase()} />
            <CertField label="Protocol" value={certificate.protocol_version} />
            <CertField label="Renewals" value={String(certificate.renewal_count)} />
            <CertField label="Issued" value={fmtDate(certificate.issued_at)} />
            <CertField label="Expires" value={fmtDate(certificate.expires_at)} />
            <CertField label="Issuer" value={certificate.issuer_instance_id} mono />
            <CertField label="Instance" value={certificate.instance_id} mono />
          </dl>
        </CardContent>
      </Card>

      {/* Hashes */}
      <Card>
        <CardHeader>
          <CardTitle>Cryptographic Hashes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <CertField
              label="Lineage Hash"
              value={certificate.lineage_hash}
              mono
              truncate
            />
            <CertField
              label="Constitutional Hash"
              value={certificate.constitutional_hash}
              mono
              truncate
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function CertField({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-0.5">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-white/70",
          mono && "font-mono text-xs",
          truncate && "truncate",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Connector Row ──────────────────────────────────────────────────

function ConnectorRow({
  connector,
  onAction,
}: {
  connector: IdentityConnector;
  onAction: ((connectorId: string, action: "refresh" | "revoke") => Promise<void>) | null;
}) {
  const [pending, setPending] = useState<"refresh" | "revoke" | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const doAction = useCallback(
    async (action: "refresh" | "revoke") => {
      if (!onAction) return;
      setPending(action);
      setActionError(null);
      try {
        await onAction(connector.connector_id, action);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      } finally {
        setPending(null);
        setShowRevokeConfirm(false);
      }
    },
    [connector.connector_id, onAction],
  );

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <PlatformIcon platform={connector.platform_id} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white/80 truncate">
              {connector.connector_id}
            </div>
            <div className="text-xs text-white/30 mt-0.5 flex items-center gap-2">
              <span>{connector.platform_id}</span>
              {connector.token_remaining_seconds !== null && (
                <>
                  <span>·</span>
                  <span>Token: {fmtDurationSec(connector.token_remaining_seconds)} left</span>
                </>
              )}
              {connector.last_refresh_at && (
                <>
                  <span>·</span>
                  <span>Last refresh: {fmtDate(connector.last_refresh_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {connector.refresh_failure_count > 0 && (
            <span className="text-xs text-amber-400/70">
              {connector.refresh_failure_count} fail{connector.refresh_failure_count !== 1 ? "s" : ""}
            </span>
          )}
          <Badge variant={connectorStatusVariant(connector.status)}>
            {connector.status.replace("_", " ")}
          </Badge>
          {onAction && (
            <div className="flex gap-1">
              <button
                onClick={() => doAction("refresh")}
                disabled={pending !== null}
                className="px-2.5 py-1 rounded-lg text-xs text-white/50 border border-white/[0.08] hover:text-white/80 hover:border-white/20 disabled:opacity-40 transition-colors"
              >
                {pending === "refresh" ? "…" : "Refresh"}
              </button>
              <button
                onClick={() => setShowRevokeConfirm(true)}
                disabled={pending !== null}
                className="px-2.5 py-1 rounded-lg text-xs text-red-400/70 border border-red-500/20 hover:text-red-300 hover:border-red-500/40 disabled:opacity-40 transition-colors"
              >
                {pending === "revoke" ? "…" : "Revoke"}
              </button>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="text-xs text-red-400 px-4 -mt-1">{actionError}</div>
      )}

      {/* Revoke Confirm Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-xl border border-red-500/40 p-6 shadow-xl" style={{ background: "var(--bg)" }}>
            <h2 className="text-base font-semibold text-white mb-2">Revoke connector?</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
              <span className="font-mono text-white/70">{connector.connector_id}</span>
            </p>
            <p className="text-sm mb-5" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
              This will revoke the OAuth token with {connector.platform_id}. The connector
              will need to re-authorize to function again.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ background: "var(--bg-button)", color: "rgba(255, 255, 255, 0.7)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => doAction("revoke")}
                disabled={pending !== null}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {pending === "revoke" ? "Revoking…" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Platform icon (text-based, no external deps)
function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, string> = {
    github: "GH",
    google: "G",
    linkedin: "Li",
    x: "𝕏",
    twitter: "𝕏",
    instagram: "IG",
    canva: "Cv",
  };
  const label = icons[platform.toLowerCase()] ?? platform.slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-white/50">
      {label}
    </div>
  );
}

// ─── Connectors Panel ──────────────────────────────────────────────

function ConnectorsPanel({
  connectors,
  onRefetch,
}: {
  connectors: IdentityConnectorsResponse | null;
  onRefetch: () => void;
}) {
  const handleAction = useCallback(
    async (connectorId: string, action: "refresh" | "revoke") => {
      if (action === "refresh") {
        await api.identityConnectorRefresh(connectorId);
      } else {
        await api.identityConnectorRevoke(connectorId);
      }
      onRefetch();
    },
    [onRefetch],
  );

  if (!connectors || connectors.connectors.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center text-white/30 text-sm">
            No connectors configured.
          </div>
        </CardContent>
      </Card>
    );
  }

  const byPlatform = connectors.connectors.reduce<Record<string, IdentityConnector[]>>(
    (acc, c) => {
      (acc[c.platform_id] ??= []).push(c);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Total" value={connectors.total} />
        <MetricTile label="Active" value={connectors.active} accent="emerald" />
        <MetricTile label="Degraded" value={connectors.degraded} accent={connectors.degraded > 0 ? "amber" : undefined} />
      </div>

      {/* Per-platform groups */}
      {Object.entries(byPlatform).map(([platform, platformConnectors]) => (
        <Card key={platform}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PlatformIcon platform={platform} />
              <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
              <span className="text-xs text-white/30">
                {platformConnectors.length} connector{platformConnectors.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {platformConnectors.map((c) => (
                <ConnectorRow key={c.connector_id} connector={c} onAction={handleAction} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Vault Panel ───────────────────────────────────────────────────

function VaultPanel({
  vault,
  envelopes,
  onRefetch,
}: {
  vault: IdentityVaultStatusResponse | null;
  envelopes: IdentityEnvelopesResponse | null;
  onRefetch: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setDeleteError(null);
      try {
        await api.identityDeleteEnvelope(id);
        onRefetch();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
      }
    },
    [onRefetch],
  );

  return (
    <div className="space-y-4">
      {/* Vault health card */}
      <Card glow>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vault Status</CardTitle>
            {vault?.passphrase_configured ? (
              <Badge variant="success">Encrypted</Badge>
            ) : (
              <Badge variant="danger">No passphrase</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <VaultMetric label="Envelopes" value={vault?.envelope_count ?? "—"} />
            <VaultMetric label="Key Version" value={vault ? `v${vault.key_version}` : "—"} />
            <VaultMetric
              label="PBKDF2 Iterations"
              value={vault?.pbkdf2_iterations?.toLocaleString() ?? "—"}
            />
            <VaultMetric
              label="Algorithm"
              value="Fernet (AES-128-CBC)"
            />
          </div>
          {!vault?.passphrase_configured && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-xs text-red-300">
                <strong>Warning:</strong> ECODIAOS_VAULT_PASSPHRASE is not set. Vault
                encryption is disabled — credentials are unprotected.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Envelope list */}
      <Card>
        <CardHeader>
          <CardTitle>Sealed Envelopes</CardTitle>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <div className="mb-3 text-xs text-red-400">{deleteError}</div>
          )}
          {!envelopes || envelopes.envelopes.length === 0 ? (
            <div className="py-4 text-center text-white/30 text-sm">
              No sealed envelopes found.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_100px_80px_80px_auto] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/20 border-b border-white/[0.04]">
                <span>Platform / ID</span>
                <span>Purpose</span>
                <span>Key Ver</span>
                <span>Created</span>
                <span />
              </div>
              {envelopes.envelopes.map((env) => (
                <div
                  key={env.id}
                  className="grid grid-cols-[1fr_100px_80px_80px_auto] gap-2 items-center px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white/70 font-medium">{env.platform_id}</div>
                    <div className="text-[10px] font-mono text-white/25 truncate">{env.id}</div>
                  </div>
                  <div>
                    <span className="text-xs text-white/50 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                      {env.purpose}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">v{env.key_version}</div>
                  <div className="text-xs text-white/30">
                    {new Date(env.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleDelete(env.id)}
                    disabled={deletingId === env.id}
                    className="text-xs text-red-400/50 hover:text-red-300 disabled:opacity-40 transition-colors px-2 py-1"
                    title="Delete envelope"
                  >
                    {deletingId === env.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VaultMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-white/70">{value}</dd>
    </div>
  );
}

// ─── Shared Metric Tile ────────────────────────────────────────────

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "emerald" | "amber" | "red";
}) {
  const textColor =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : accent === "red"
          ? "text-red-400"
          : "text-white/90";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
        {label}
      </div>
      <div className={cn("text-2xl font-bold", textColor)}>{value}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function IdentityPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const health = useApi<IdentityHealthResponse>(api.identityHealth, {
    intervalMs: 15_000,
  });
  const certificate = useApi<IdentityCertificateResponse>(api.identityCertificate, {
    intervalMs: 60_000,
    enabled: tab === "overview" || tab === "certificate",
  });
  const connectors = useApi<IdentityConnectorsResponse>(api.identityConnectors, {
    intervalMs: 30_000,
    enabled: tab === "overview" || tab === "connectors",
  });
  const vault = useApi<IdentityVaultStatusResponse>(api.identityVaultStatus, {
    intervalMs: 60_000,
    enabled: tab === "overview" || tab === "vault",
  });
  const envelopes = useApi<IdentityEnvelopesResponse>(api.identityEnvelopes, {
    intervalMs: 60_000,
    enabled: tab === "vault",
  });

  const overallStatus = health.data?.status ?? (health.loading ? null : "error");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity"
        description="Credentials, OAuth vault, certificates, and platform connectors"
      >
        {overallStatus && (
          <Badge
            variant={
              overallStatus === "healthy"
                ? "success"
                : overallStatus === "degraded"
                  ? "warning"
                  : "danger"
            }
            pulse={overallStatus !== "healthy"}
          >
            {overallStatus}
          </Badge>
        )}
        {health.loading && (
          <span className="text-xs text-white/30">Loading…</span>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === id
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {health.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Identity service unavailable: {health.error}
        </div>
      )}

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewPanel
          health={health.data}
          certificate={certificate.data}
          connectors={connectors.data}
          vault={vault.data}
        />
      )}

      {tab === "certificate" && (
        certificate.loading && !certificate.data ? (
          <LoadingCard />
        ) : (
          <CertificatePanel certificate={certificate.data} />
        )
      )}

      {tab === "connectors" && (
        connectors.loading && !connectors.data ? (
          <LoadingCard />
        ) : (
          <ConnectorsPanel
            connectors={connectors.data}
            onRefetch={connectors.refetch}
          />
        )
      )}

      {tab === "vault" && (
        vault.loading && !vault.data ? (
          <LoadingCard />
        ) : (
          <VaultPanel
            vault={vault.data}
            envelopes={envelopes.data}
            onRefetch={() => {
              vault.refetch();
              envelopes.refetch();
            }}
          />
        )
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent>
        <div className="py-8 text-center text-white/30 text-sm">Loading…</div>
      </CardContent>
    </Card>
  );
}
