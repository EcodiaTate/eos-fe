"use client";

import { useState, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import {
  api,
  type FederationIdentityResponse,
  type FederationLinksResponse,
  type FederationFullStatsResponse,
  type FederationTrustResponse,
  type FederationKnowledgeResponse,
  type FederationAssistanceResponse,
  type FederationInteractionsResponse,
  type IiepPushResponse,
  type ThreatBroadcastResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Constants ────────────────────────────────────────────────────

const TABS = ["overview", "links", "exchange", "threats", "ingestion", "history"] as const;
type Tab = (typeof TABS)[number];

const TRUST_LEVEL_ORDER: Record<string, number> = {
  NONE: 0,
  ACQUAINTANCE: 1,
  COLLEAGUE: 2,
  PARTNER: 3,
  ALLY: 4,
};

const PAYLOAD_KINDS = ["HYPOTHESIS", "PROCEDURE", "MUTATION_PATTERN", "ECONOMIC_INTEL"] as const;

// ─── Helpers ──────────────────────────────────────────────────────

type BadgeVariant = "success" | "info" | "warning" | "danger" | "muted";

function trustBadge(level: string): BadgeVariant {
  switch (level.toUpperCase()) {
    case "ALLY":      return "info";
    case "PARTNER":   return "success";
    case "COLLEAGUE": return "warning";
    case "ACQUAINTANCE": return "muted";
    default:          return "muted";
  }
}

function outcomeBadge(outcome: string): BadgeVariant {
  switch (outcome.toUpperCase()) {
    case "SUCCESSFUL": return "success";
    case "FAILED":     return "danger";
    case "VIOLATION":  return "danger";
    default:           return "muted";
  }
}

function severityColor(v: number): string {
  if (v >= 0.8) return "text-red-400";
  if (v >= 0.5) return "text-amber-400";
  return "text-emerald-400";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

function TrustBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color =
    pct >= 80 ? "#818cf8" : pct >= 40 ? "#5eead4" : pct >= 20 ? "#fbbf24" : "#6b7280";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-semibold text-white/80 mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Dialog / Sheet primitives ────────────────────────────────────

function Dialog({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Sheet({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-sm overflow-y-auto border-l border-white/[0.08] bg-[#0a0a0a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-white/30 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ─── Connect Peer Dialog ──────────────────────────────────────────

function ConnectPeerDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!endpointUrl.trim() || !instanceName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.federationAddLink(endpointUrl.trim(), instanceName.trim());
      setEndpointUrl(""); setInstanceName("");
      onSuccess(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Connect Peer">
      <div className="space-y-4">
        <Field label="Endpoint URL">
          <Input placeholder="https://peer.example.com" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} />
        </Field>
        <Field label="Instance Name">
          <Input placeholder="Aurora-2" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
        </Field>
        {error && <p className="text-xs text-red-400/80">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !endpointUrl.trim() || !instanceName.trim()}>
            {submitting ? "Connecting…" : "Initiate Handshake"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Disconnect Confirmation ──────────────────────────────────────

function DisconnectDialog({ open, linkName, onClose, onConfirm }: { open: boolean; linkName: string; onClose: () => void; onConfirm: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm() {
    setSubmitting(true);
    try { await onConfirm(); } finally { setSubmitting(false); }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Disconnect Peer">
      <p className="text-sm text-white/60 mb-5">
        Withdraw link with <span className="text-white/80 font-medium">{linkName}</span>? Cannot be undone without re-handshake.
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    </Dialog>
  );
}

// ─── Trust Detail Sheet ───────────────────────────────────────────

function TrustDetailSheet({ open, linkId, linkName, onClose }: { open: boolean; linkId: string | null; linkName: string; onClose: () => void }) {
  const trust = useApi<FederationTrustResponse>(
    useCallback(() => (linkId ? api.federationTrust(linkId) : Promise.reject("no link")), [linkId]),
    { enabled: open && !!linkId },
  );

  return (
    <Sheet open={open} onClose={onClose} title={`Trust — ${linkName}`}>
      {trust.loading ? (
        <p className="text-sm text-white/30">Loading…</p>
      ) : trust.error ? (
        <p className="text-xs text-red-400/70">{trust.error}</p>
      ) : trust.data ? (
        <div className="space-y-5">
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Trust Level</div>
            <Badge variant={trustBadge(trust.data.trust_level)}>{trust.data.trust_level}</Badge>
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Permitted Knowledge Types</div>
            {trust.data.permitted_knowledge_types.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {trust.data.permitted_knowledge_types.map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
              </div>
            ) : (
              <p className="text-xs text-white/30">None permitted</p>
            )}
          </div>
          {Object.keys(trust.data.stats).length > 0 && (
            <div>
              <div className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Stats</div>
              <div className="space-y-1.5">
                {Object.entries(trust.data.stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-white/40 capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-white/60 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────

function OverviewTab({
  identity,
  stats,
}: {
  identity: FederationIdentityResponse | null;
  stats: FederationFullStatsResponse | null;
}) {
  const ingestion = stats?.ingestion as Record<string, number> | undefined;
  const exchange = stats?.exchange as Record<string, number> | undefined;
  const staking = stats?.staking as Record<string, unknown> | undefined;
  const threatIntel = stats?.threat_intel as Record<string, number> | undefined;
  const trust = stats?.trust as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity Card */}
        <Card glow>
          <CardHeader><CardTitle>Identity Card</CardTitle></CardHeader>
          <CardContent>
            {identity ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-white/25">Name</div>
                  <div className="text-sm text-white/80 font-medium">{identity.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/25">Description</div>
                  <div className="text-xs text-white/50">{identity.description || "No description set"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-white/25">Instance ID</div>
                    <div className="text-xs text-white/40 font-mono truncate">{identity.instance_id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Protocol</div>
                    <div className="text-xs text-white/40">v{identity.protocol_version}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Autonomy Level</div>
                    <div className="text-xs text-white/60">{identity.autonomy_level}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Born</div>
                    <div className="text-xs text-white/40">{identity.born_at ? fmtDate(identity.born_at) : "Unknown"}</div>
                  </div>
                </div>
                {(identity.capabilities?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">Capabilities</div>
                    <div className="flex flex-wrap gap-1">
                      {identity.capabilities.map((cap) => <Badge key={cap} variant="muted">{cap}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>

        {/* Network Health */}
        <Card>
          <CardHeader><CardTitle>Network Health</CardTitle></CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatBox label="Active Links" value={stats.active_links} />
                  <StatBox label="Mean Trust" value={stats.mean_trust?.toFixed(1) ?? "—"} sub="out of 100" />
                  <StatBox label="History" value={stats.interaction_history_size} sub="interactions" />
                  <StatBox label="Enabled" value={stats.enabled ? "Yes" : "No"} />
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Network Trust</div>
                  <TrustBar score={stats.mean_trust ?? 0} max={100} />
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subsystem Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Ingestion */}
        <Card>
          <CardHeader><CardTitle>Ingestion Pipeline</CardTitle></CardHeader>
          <CardContent>
            {ingestion ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Total processed</span>
                  <span className="text-white/70 font-mono">{ingestion.total_processed ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400/70">Accepted</span>
                  <span className="text-emerald-400 font-mono">{ingestion.accepted ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400/70">Quarantined</span>
                  <span className="text-amber-400 font-mono">{ingestion.quarantined ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-400/70">Rejected</span>
                  <span className="text-red-400 font-mono">{ingestion.rejected ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">Deferred</span>
                  <span className="text-white/50 font-mono">{ingestion.deferred ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-white/[0.04]">
                  <span className="text-white/25">Seen hashes</span>
                  <span className="text-white/40 font-mono">{ingestion.seen_hashes_size ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/20">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Exchange */}
        <Card>
          <CardHeader><CardTitle>IIEP Exchange</CardTitle></CardHeader>
          <CardContent>
            {exchange ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Envelopes sent</span>
                  <span className="text-white/70 font-mono">{exchange.envelopes_sent ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Envelopes received</span>
                  <span className="text-white/70 font-mono">{exchange.envelopes_received ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Payloads sent</span>
                  <span className="text-white/70 font-mono">{exchange.payloads_sent ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400/70">Filtered</span>
                  <span className="text-amber-400 font-mono">{exchange.payloads_filtered ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/20">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Threat Intel */}
        <Card>
          <CardHeader><CardTitle>Threat Intel</CardTitle></CardHeader>
          <CardContent>
            {threatIntel ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Broadcast</span>
                  <span className="text-white/70 font-mono">{threatIntel.total_broadcast ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Received</span>
                  <span className="text-white/70 font-mono">{threatIntel.total_received ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-400/70">Rejected</span>
                  <span className="text-red-400 font-mono">{threatIntel.total_rejected ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/20">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Reputation Staking */}
        <Card>
          <CardHeader><CardTitle>Reputation Staking</CardTitle></CardHeader>
          <CardContent>
            {staking ? (
              <div className="space-y-2">
                {Object.entries(staking as Record<string, unknown>)
                  .filter(([k]) => ["total_bonds", "active_bonds", "total_bonded_usdc", "forfeit_rate", "forfeited_bonds", "staking_enabled"].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-white/40 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className={`font-mono ${k === "forfeit_rate" ? "text-amber-400" : "text-white/60"}`}>
                        {typeof v === "number" ? (k.includes("rate") ? `${(v * 100).toFixed(1)}%` : v) : String(v)}
                      </span>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-xs text-white/20">Staking not configured</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trust model summary */}
      {trust && (
        <Card>
          <CardHeader><CardTitle>Trust Engine</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(trust as Record<string, unknown>).map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] text-white/25 capitalize">{k.replace(/_/g, " ")}</div>
                  <div className="text-sm text-white/60 font-mono mt-0.5">{String(v)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Links Tab ────────────────────────────────────────────────────

function LinksTab({
  links,
  onDisconnect,
  onViewTrust,
  onConnectNew,
}: {
  links: FederationLinksResponse | null;
  onDisconnect: (id: string, name: string) => void;
  onViewTrust: (id: string, name: string) => void;
  onConnectNew: () => void;
}) {
  const allLinks = links?.links ?? [];
  const sorted = useMemo(
    () => [...allLinks].sort((a, b) => (TRUST_LEVEL_ORDER[b.trust_level] ?? 0) - (TRUST_LEVEL_ORDER[a.trust_level] ?? 0)),
    [allLinks],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Federation Links</CardTitle>
        <div className="flex items-center gap-2">
          {links && <Badge variant="muted">{links.total_active} active</Badge>}
          <Button size="sm" onClick={onConnectNew}>Connect Peer</Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((link) => (
              <div key={link.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-white/70 font-medium truncate">{link.remote_name}</div>
                    <div className="text-[10px] text-white/30 font-mono truncate">{link.remote_instance_id}</div>
                    {link.remote_endpoint && (
                      <div className="text-[10px] text-white/20 font-mono truncate">{link.remote_endpoint}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={link.status === "active" ? "success" : link.status === "pending" ? "info" : "muted"}>
                      {link.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={trustBadge(link.trust_level)}>{link.trust_level}</Badge>
                    <span className="text-[10px] text-white/30">score: {link.trust_score.toFixed(1)}</span>
                  </div>
                  <TrustBar score={link.trust_score} max={100} />
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-white/30">
                    <span>↑ {link.shared_knowledge_count}</span>
                    <span>↓ {link.received_knowledge_count}</span>
                    <span className="text-emerald-400/60">✓ {link.successful_interactions}</span>
                    <span className="text-red-400/60">✗ {link.failed_interactions}</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => onViewTrust(link.id, link.remote_name)}>Trust Detail</Button>
                  <Button variant="danger" size="sm" onClick={() => onDisconnect(link.id, link.remote_name)}>Disconnect</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="text-2xl opacity-10 mb-2">~</div>
            <div className="text-xs text-white/25">No federation links. Aurora is alone.</div>
            <Button size="sm" className="mt-4" onClick={onConnectNew}>Connect first peer</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Exchange Tab (Knowledge + Assistance + IIEP Push) ────────────

function ExchangeTab({
  activeLinks,
}: {
  activeLinks: FederationLinksResponse["links"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KnowledgeExchangePanel activeLinks={activeLinks} />
        <AssistancePanel activeLinks={activeLinks} />
      </div>
      <IiepPushPanel activeLinks={activeLinks} />
    </div>
  );
}

function KnowledgeExchangePanel({ activeLinks }: { activeLinks: FederationLinksResponse["links"] }) {
  const [linkId, setLinkId] = useState("");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<FederationKnowledgeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!linkId || !topic.trim() || !query.trim()) return;
    setSubmitting(true); setError(null); setResult(null);
    try {
      const data = await api.federationShareKnowledge(linkId, topic.trim(), query.trim());
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Knowledge Exchange</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {activeLinks.length === 0 ? (
          <p className="text-xs text-white/30">No active links.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Peer">
                <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 focus:border-white/20 focus:outline-none">
                  <option value="">Select a peer…</option>
                  {activeLinks.map((l) => <option key={l.id} value={l.id}>{l.remote_name}</option>)}
                </select>
              </Field>
              <Field label="Topic"><Input placeholder="e.g. ethical_reasoning" value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
              <Field label="Query"><Input placeholder="What do you know about…" value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !linkId || !topic.trim() || !query.trim()}>
              {submitting ? "Exchanging…" : "Request Knowledge"}
            </Button>
            {error && <p className="text-xs text-red-400/70">{error}</p>}
            {result && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                <Badge variant="muted">source: {result.source}</Badge>
                <p className="text-sm text-white/70 leading-relaxed">{result.knowledge}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AssistancePanel({ activeLinks }: { activeLinks: FederationLinksResponse["links"] }) {
  const [linkId, setLinkId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [result, setResult] = useState<FederationAssistanceResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!linkId || !taskDescription.trim()) return;
    setSubmitting(true); setError(null); setResult(null);
    try {
      const data = await api.federationRequestAssistance(linkId, taskDescription.trim());
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Request Assistance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {activeLinks.length === 0 ? (
          <p className="text-xs text-white/30">No active links.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Peer">
                <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 focus:border-white/20 focus:outline-none">
                  <option value="">Select a peer…</option>
                  {activeLinks.map((l) => <option key={l.id} value={l.id}>{l.remote_name}</option>)}
                </select>
              </Field>
              <Field label="Task Description">
                <textarea placeholder="Describe the task…" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none" />
              </Field>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !linkId || !taskDescription.trim()}>
              {submitting ? "Requesting…" : "Request Assistance"}
            </Button>
            {error && <p className="text-xs text-red-400/70">{error}</p>}
            {result && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-sm text-white/70 leading-relaxed">{result.response}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function IiepPushPanel({ activeLinks }: { activeLinks: FederationLinksResponse["links"] }) {
  const [linkId, setLinkId] = useState("");
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(new Set(["HYPOTHESIS"]));
  const [maxItems, setMaxItems] = useState("5");
  const [result, setResult] = useState<IiepPushResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleKind(k: string) {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) { if (next.size > 1) next.delete(k); } else next.add(k);
      return next;
    });
  }

  async function handlePush() {
    if (!linkId || selectedKinds.size === 0) return;
    setSubmitting(true); setError(null); setResult(null);
    try {
      const data = await api.federationIiepPush(linkId, Array.from(selectedKinds), Number(maxItems) || 5);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>IIEP Push Exchange</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {activeLinks.length === 0 ? (
          <p className="text-xs text-white/30">No active links for IIEP exchange.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Peer">
                <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 focus:border-white/20 focus:outline-none">
                  <option value="">Select a peer…</option>
                  {activeLinks.map((l) => <option key={l.id} value={l.id}>{l.remote_name}</option>)}
                </select>
              </Field>
              <Field label="Max items / kind">
                <Input type="number" min="1" max="20" value={maxItems} onChange={(e) => setMaxItems(e.target.value)} />
              </Field>
            </div>
            <Field label="Payload Kinds">
              <div className="flex flex-wrap gap-2 mt-1">
                {PAYLOAD_KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => toggleKind(k)}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                      selectedKinds.has(k)
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-400"
                        : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/60"
                    }`}
                  >
                    {k.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </Field>
            <div className="text-[10px] text-white/25 space-y-0.5">
              <div>HYPOTHESIS requires PARTNER+ trust · PROCEDURE requires COLLEAGUE+</div>
              <div>MUTATION_PATTERN requires ALLY · ECONOMIC_INTEL requires PARTNER+</div>
            </div>
            <Button size="sm" onClick={handlePush} disabled={submitting || !linkId || selectedKinds.size === 0}>
              {submitting ? "Pushing…" : "Push Exchange"}
            </Button>
            {error && <p className="text-xs text-red-400/70">{error}</p>}
            {result && !result.error && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
                <div className="flex gap-4 text-xs">
                  <span className="text-white/40">Sent: <span className="text-white/70">{result.payloads_sent}</span></span>
                  <span className="text-emerald-400">✓ {result.accepted}</span>
                  <span className="text-red-400">✗ {result.rejected}</span>
                  <span className="text-amber-400">⚑ {result.quarantined}</span>
                </div>
                <div className="space-y-1">
                  {result.verdicts.map((v) => (
                    <div key={v.payload_index} className="flex items-center gap-2 text-xs">
                      <span className="text-white/30 w-4">#{v.payload_index}</span>
                      <Badge variant={v.verdict === "ACCEPTED" ? "success" : v.verdict === "QUARANTINED" ? "warning" : "danger"}>
                        {v.verdict}
                      </Badge>
                      {v.reason && <span className="text-white/30 truncate">{v.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result?.error && <p className="text-xs text-red-400/70">{result.error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Threats Tab ──────────────────────────────────────────────────

function ThreatsTab({ activeLinks, stats }: { activeLinks: FederationLinksResponse["links"]; stats: FederationFullStatsResponse | null }) {
  const [threatType, setThreatType] = useState("");
  const [severity, setSeverity] = useState("0.7");
  const [description, setDescription] = useState("");
  const [affectedProtocols, setAffectedProtocols] = useState("");
  const [evidence, setEvidence] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [result, setResult] = useState<ThreatBroadcastResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threatIntel = stats?.threat_intel as Record<string, unknown> | undefined;

  async function handleBroadcast() {
    if (!threatType.trim() || !description.trim()) return;
    setSubmitting(true); setError(null); setResult(null);
    try {
      const data = await api.federationBroadcastThreat({
        threat_type: threatType.trim(),
        severity: parseFloat(severity) || 0.5,
        description: description.trim(),
        affected_protocols: affectedProtocols.split(",").map((s) => s.trim()).filter(Boolean),
        evidence: evidence.trim() || undefined,
        recommended_action: recommendedAction.trim() || undefined,
      });
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats */}
        <Card>
          <CardHeader><CardTitle>Threat Intelligence Stats</CardTitle></CardHeader>
          <CardContent>
            {threatIntel ? (
              <div className="space-y-2">
                {Object.entries(threatIntel).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-white/40 capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-white/60 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/20">No threat intel data</div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card>
          <CardHeader><CardTitle>Broadcast Advisory</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeLinks.length === 0 ? (
              <p className="text-xs text-white/30">No peers to broadcast to.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Threat Type">
                    <Input placeholder="PROTOCOL_EXPLOIT" value={threatType} onChange={(e) => setThreatType(e.target.value)} />
                  </Field>
                  <Field label="Severity (0–1)">
                    <Input type="number" min="0" max="1" step="0.1" value={severity} onChange={(e) => setSeverity(e.target.value)} />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe the threat…" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none" />
                </Field>
                <Field label="Affected Protocols (comma-separated)">
                  <Input placeholder="IIEP, handshake" value={affectedProtocols} onChange={(e) => setAffectedProtocols(e.target.value)} />
                </Field>
                <Field label="Evidence">
                  <Input placeholder="On-chain tx hash, log snippet…" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                </Field>
                <Field label="Recommended Action">
                  <Input placeholder="Suspend all links, rotate keys…" value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} />
                </Field>

                {/* Severity visualization */}
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-mono ${severityColor(parseFloat(severity) || 0)}`}>
                    Severity: {severity}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (parseFloat(severity) || 0) * 100)}%`,
                        background: parseFloat(severity) >= 0.8 ? "#f87171" : parseFloat(severity) >= 0.5 ? "#fbbf24" : "#34d399",
                      }}
                    />
                  </div>
                </div>

                <Button size="sm" onClick={handleBroadcast} disabled={submitting || !threatType.trim() || !description.trim()}>
                  {submitting ? "Broadcasting…" : `Broadcast to ${activeLinks.length} peer${activeLinks.length !== 1 ? "s" : ""}`}
                </Button>

                {error && <p className="text-xs text-red-400/70">{error}</p>}
                {result && !result.error && (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex gap-4 text-xs">
                      <span className="text-white/40">Broadcast to: {result.broadcast_to}</span>
                      <span className="text-emerald-400">✓ {result.delivered}</span>
                      {result.failed > 0 && <span className="text-red-400">✗ {result.failed}</span>}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(result.results).map(([linkId, delivered]) => (
                        <div key={linkId} className="flex items-center gap-2 text-xs">
                          <span className="text-white/30 font-mono truncate">{linkId.slice(0, 12)}…</span>
                          <Badge variant={delivered ? "success" : "danger"}>{delivered ? "delivered" : "failed"}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result?.error && <p className="text-xs text-red-400/70">{result.error}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Ingestion Tab ────────────────────────────────────────────────

function IngestionTab({ stats }: { stats: FederationFullStatsResponse | null }) {
  const ingestion = stats?.ingestion as Record<string, number> | undefined;
  const privacy = stats?.privacy as Record<string, unknown> | undefined;
  const staking = stats?.staking as Record<string, unknown> | undefined;

  if (!stats) {
    return <div className="text-sm text-white/20 py-8 text-center">Loading stats…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ingestion Pipeline detail */}
        <Card>
          <CardHeader><CardTitle>Ingestion Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ingestion ? (
              <>
                <div className="space-y-2">
                  {[
                    { label: "Total Processed", key: "total_processed", color: "text-white/60" },
                    { label: "Accepted", key: "accepted", color: "text-emerald-400" },
                    { label: "Quarantined", key: "quarantined", color: "text-amber-400" },
                    { label: "Rejected", key: "rejected", color: "text-red-400" },
                    { label: "Deferred", key: "deferred", color: "text-white/40" },
                  ].map(({ label, key, color }) => {
                    const val = ingestion[key] ?? 0;
                    const total = ingestion.total_processed || 1;
                    const pct = Math.round((val / total) * 100);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/40">{label}</span>
                          <span className={`${color} font-mono`}>{val} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <div className={`h-full rounded-full ${color.replace("text-", "bg-").replace("/60", "/70").replace("/40", "/50")}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-white/25">Quarantine buffer</div>
                    <div className="text-white/50 font-mono">{ingestion.quarantine_buffer_size ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-white/25">Seen hashes</div>
                    <div className="text-white/50 font-mono">{ingestion.seen_hashes_size ?? 0}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-white/20">No ingestion data</div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Filter */}
        <Card>
          <CardHeader><CardTitle>Privacy Filter</CardTitle></CardHeader>
          <CardContent>
            {privacy ? (
              <div className="space-y-2">
                {Object.entries(privacy).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-white/40 capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-white/60 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/20">Privacy filter stats not available</div>
            )}
            <div className="mt-4 pt-3 border-t border-white/[0.04]">
              <div className="text-[10px] text-white/20 space-y-1">
                <div>PRIVATE items: never cross boundary</div>
                <div>COMMUNITY_ONLY: requires COLLEAGUE+</div>
                <div>All items: PII anonymised</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staking detail */}
      {staking && (
        <Card>
          <CardHeader><CardTitle>Reputation Staking Detail</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(staking).filter(([k]) => !k.startsWith("per_")).map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] text-white/25 capitalize">{k.replace(/_/g, " ")}</div>
                  <div className={`text-sm font-mono mt-0.5 ${k === "forfeit_rate" ? "text-amber-400" : k.includes("forfeited") ? "text-red-400" : "text-white/60"}`}>
                    {typeof v === "number" ? (k.includes("rate") ? `${(v * 100).toFixed(1)}%` : v) : String(v)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────

function HistoryTab({ linksMap }: { linksMap: Map<string, string> }) {
  const [limit, setLimit] = useState(50);
  const history = useApi<FederationInteractionsResponse>(
    useCallback(() => api.federationInteractions(limit), [limit]),
    { intervalMs: 10000 },
  );

  const interactions = history.data?.interactions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interaction History</CardTitle>
        <div className="flex items-center gap-2">
          {history.data && (
            <span className="text-[10px] text-white/30">{history.data.total} total</span>
          )}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-white/70 focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {history.loading && !interactions.length ? (
          <div className="text-sm text-white/20 py-4">Loading…</div>
        ) : interactions.length === 0 ? (
          <div className="text-xs text-white/20 py-8 text-center">No interactions recorded yet.</div>
        ) : (
          <div className="space-y-1.5">
            {interactions.map((i) => (
              <div key={i.id} className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                <div className="flex-shrink-0 w-14 text-right">
                  <div className="text-[10px] text-white/30 font-mono">{fmtTime(i.timestamp)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={outcomeBadge(i.outcome)}>{i.outcome}</Badge>
                    <span className="text-xs text-white/50">{i.interaction_type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-white/30">{i.direction}</span>
                    {linksMap.has(i.link_id) && (
                      <span className="text-[10px] text-white/25">→ {linksMap.get(i.link_id)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] font-mono ${i.trust_value_change > 0 ? "text-emerald-400" : i.trust_value_change < 0 ? "text-red-400" : "text-white/30"}`}>
                      {i.trust_value_change > 0 ? "+" : ""}{i.trust_value_change.toFixed(3)} trust
                    </span>
                    {i.latency_ms !== null && (
                      <span className="text-[10px] text-white/25">{i.latency_ms}ms</span>
                    )}
                    {i.violation_type && (
                      <Badge variant="danger">{i.violation_type}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function FederationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; name: string } | null>(null);
  const [trustTarget, setTrustTarget] = useState<{ id: string; name: string } | null>(null);

  const identity = useApi<FederationIdentityResponse>(api.federationIdentity, { intervalMs: 60000 });
  const links = useApi<FederationLinksResponse>(api.federationLinks, { intervalMs: 15000 });
  const stats = useApi<FederationFullStatsResponse>(api.federationFullStats, { intervalMs: 30000 });

  const activeLinks = useMemo(
    () => (links.data?.links ?? []).filter((l) => l.status === "active"),
    [links.data],
  );

  const linksMap = useMemo(
    () => new Map((links.data?.links ?? []).map((l) => [l.id, l.remote_name])),
    [links.data],
  );

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    await api.federationRemoveLink(disconnectTarget.id);
    setDisconnectTarget(null);
    links.refetch();
    stats.refetch();
  }

  const TAB_LABELS: Record<Tab, string> = {
    overview: "Overview",
    links: "Links",
    exchange: "Exchange",
    threats: "Threats",
    ingestion: "Ingestion",
    history: "History",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Federation"
        description="Multi-instance network — consent-based knowledge exchange"
      >
        <div className="flex items-center gap-2">
          {stats.data?.enabled === false && <Badge variant="warning">Disabled</Badge>}
          {stats.data?.enabled === true && (
            <Badge variant="success" pulse>{activeLinks.length} active</Badge>
          )}
          <Button size="sm" onClick={() => { setActiveTab("links"); setConnectOpen(true); }}>Connect Peer</Button>
        </div>
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-white/[0.06] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors rounded-t-md -mb-px ${
              activeTab === tab
                ? "text-white/90 border border-white/[0.08] border-b-[#050510] bg-white/[0.03]"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab identity={identity.data ?? null} stats={stats.data ?? null} />
      )}
      {activeTab === "links" && (
        <LinksTab
          links={links.data ?? null}
          onDisconnect={(id, name) => setDisconnectTarget({ id, name })}
          onViewTrust={(id, name) => setTrustTarget({ id, name })}
          onConnectNew={() => setConnectOpen(true)}
        />
      )}
      {activeTab === "exchange" && <ExchangeTab activeLinks={activeLinks} />}
      {activeTab === "threats" && <ThreatsTab activeLinks={activeLinks} stats={stats.data ?? null} />}
      {activeTab === "ingestion" && <IngestionTab stats={stats.data ?? null} />}
      {activeTab === "history" && <HistoryTab linksMap={linksMap} />}

      {/* Dialogs */}
      <ConnectPeerDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSuccess={() => { links.refetch(); stats.refetch(); }}
      />
      <DisconnectDialog
        open={disconnectTarget !== null}
        linkName={disconnectTarget?.name ?? ""}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
      />
      <TrustDetailSheet
        open={trustTarget !== null}
        linkId={trustTarget?.id ?? null}
        linkName={trustTarget?.name ?? ""}
        onClose={() => setTrustTarget(null)}
      />
    </div>
  );
}
