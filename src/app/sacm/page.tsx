"use client";

import { useMemo, useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { api, ApiError } from "@/lib/api-client";
import type {
  SACMMetricsResponse,
  SACMSavingsResponse,
  SACMProvidersResponse,
  SACMOracleResponse,
  SACMComputeResponse,
  SACMPreWarmResponse,
  SACMHealthResponse,
  SACMOfferSummary,
  SACMWorkloadHistoryItem,
  SACMWorkloadHistoryResponse,
  SACMVerificationTrustResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { fmtUsd, fmtMs } from "@/lib/formatters";

// ─── Formatters ─────────────────────────────────────────────────

function fmtUsdLarge(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtEpoch(epoch: number | null | undefined): string {
  if (!epoch) return "—";
  const d = new Date(epoch * 1000);
  return d.toLocaleTimeString();
}

function fmtGib(n: number): string {
  return `${n.toFixed(1)} GiB`;
}

// ─── Helper Components ──────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-display)", color: accent ?? "var(--ink)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>{sub}</div>}
    </div>
  );
}

function ResourceBar({
  label,
  used,
  total,
  color,
  fmt,
}: {
  label: string;
  used: number;
  total: number;
  color: string;
  fmt: (n: number) => string;
}) {
  const pct = total > 0 ? Math.min(100, ((total - used) / total) * 100) : 0;
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
        <span style={{ color: "var(--ink-soft)" }}>{label}</span>
        <span style={{ color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>
          {fmt(total - used)} free / {fmt(total)}
        </span>
      </div>
      <div style={{ height: "5px", width: "100%", borderRadius: "4px", background: "var(--border)", overflow: "hidden" }}>
        <div
          style={{ height: "100%", borderRadius: "4px", width: `${usedPct}%`, background: color, transition: "width 0.7s ease" }}
        />
      </div>
    </div>
  );
}

function ProgressRing({
  value,
  max,
  size = 72,
  strokeWidth = 5,
  color,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, value / Math.max(1, max));
  const offset = circumference * (1 - pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "all 0.7s ease" }}
        />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "var(--ink)", fontWeight: 600 }}>
          {(pct * 100).toFixed(0)}%
        </div>
        <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "ok" | "degraded" | "error" | string }) {
  const color =
    status === "ok" || status === "healthy"
      ? "var(--lime-bright)"
      : status === "degraded"
        ? "var(--gold-bright)"
        : "#e74c3c";
  const pulse = status !== "ok" && status !== "healthy";
  return (
    <span
      style={{
        display: "inline-block",
        height: "6px",
        width: "6px",
        borderRadius: "50%",
        background: color,
        animation: pulse ? "pulse 2s ease-in-out infinite" : "none",
      }}
    />
  );
}

type OfferSortKey = "provider" | "class" | "cpu_price" | "gpu_price" | "latency" | "trust";

function OfferTable({ offers }: { offers: SACMOfferSummary[] }) {
  const [sortKey, setSortKey] = useState<OfferSortKey>("cpu_price");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...offers];
    const dir = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "provider": return dir * a.provider_id.localeCompare(b.provider_id);
        case "class": return dir * a.offload_class.localeCompare(b.offload_class);
        case "cpu_price": return dir * (a.price_cpu_per_vcpu_s - b.price_cpu_per_vcpu_s);
        case "gpu_price": return dir * (a.price_gpu_per_unit_s - b.price_gpu_per_unit_s);
        case "latency": return dir * (a.latency_ms_p50 - b.latency_ms_p50);
        case "trust": return dir * (a.trust_score - b.trust_score);
        default: return 0;
      }
    });
    return arr;
  }, [offers, sortKey, sortAsc]);

  function SortTh({ label, col }: { label: string; col: OfferSortKey }) {
    const active = sortKey === col;
    return (
      <th
        className={cn(
          "px-3 py-2 text-left text-[10px] uppercase tracking-widest cursor-pointer select-none transition-colors",
          active ? "text-teal-400/80" : "text-white/25 hover:text-white/40",
        )}
        onClick={() => {
          if (col === sortKey) setSortAsc(!sortAsc);
          else { setSortKey(col); setSortAsc(true); }
        }}
      >
        {label}
        {active && <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>}
      </th>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-white/25">
        No offers in pricing surface. Oracle may not have refreshed yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <SortTh label="Provider" col="provider" />
            <SortTh label="Class" col="class" />
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-white/25">CPU</th>
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-white/25">Mem</th>
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-white/25">GPU</th>
            <SortTh label="CPU $/vCPU·s" col="cpu_price" />
            <SortTh label="GPU $/unit·s" col="gpu_price" />
            <SortTh label="Latency" col="latency" />
            <SortTh label="Trust" col="trust" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((offer) => (
            <tr
              key={offer.offer_id}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-3 py-2 text-white/60 font-mono">{offer.provider_id}</td>
              <td className="px-3 py-2">
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300/80 text-[10px] font-mono">
                  {offer.offload_class}
                </span>
              </td>
              <td className="px-3 py-2 text-white/50 tabular-nums">{offer.cpu_vcpu.toFixed(1)}</td>
              <td className="px-3 py-2 text-white/50 tabular-nums">{offer.memory_gib.toFixed(0)}G</td>
              <td className="px-3 py-2 text-white/50 tabular-nums">
                {offer.gpu_units > 0 ? `${offer.gpu_units.toFixed(1)}×${offer.gpu_vram_gib.toFixed(0)}G` : "—"}
              </td>
              <td className="px-3 py-2 text-white/70 tabular-nums font-mono">
                {offer.price_cpu_per_vcpu_s > 0 ? fmtUsd(offer.price_cpu_per_vcpu_s) : "—"}
              </td>
              <td className="px-3 py-2 text-white/70 tabular-nums font-mono">
                {offer.price_gpu_per_unit_s > 0 ? fmtUsd(offer.price_gpu_per_unit_s) : "—"}
              </td>
              <td className="px-3 py-2 text-white/50 tabular-nums">{fmtMs(offer.latency_ms_p50)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${offer.trust_score * 100}%`,
                        background: offer.trust_score >= 0.8 ? "#10b981" : offer.trust_score >= 0.5 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-white/40 tabular-nums">{(offer.trust_score * 100).toFixed(0)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Panel: Overview (Metrics + Burn Rate) ─────────────────────

function OverviewPanel({
  metrics,
  health,
}: {
  metrics: SACMMetricsResponse | null;
  health: SACMHealthResponse | null;
}) {
  const m = metrics;
  const successRate =
    m && m.workloads_submitted > 0
      ? m.workloads_completed / m.workloads_submitted
      : null;

  const overallStatus = health?.overall ?? "ok";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
      {/* Status + Burn Rate */}
      <Card className="float-up float-up-0">
        <CardHeader>
          <CardTitle>◉ System Status</CardTitle>
          <Badge
            variant={overallStatus === "ok" ? "success" : overallStatus === "degraded" ? "warning" : "danger"}
            pulse={overallStatus !== "ok"}
          >
            {overallStatus.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {health?.subsystems.map((sub) => (
            <div key={sub.name} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <StatusDot status={sub.status} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "12px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>{sub.name}</div>
                {sub.detail && (
                  <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>{sub.detail}</div>
                )}
              </div>
            </div>
          ))}
          {!health && (
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>Loading subsystem health…</div>
          )}
          {m && (
            <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Burn Rate</div>
              <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", color: "var(--ink)", fontWeight: 600 }}>
                {fmtUsdLarge(m.rolling_burn_rate_usd_per_hour)}<span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>/hr</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workload Counters */}
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle>⚡ Workloads</CardTitle>
          {successRate !== null && (
            <Badge variant={successRate >= 0.9 ? "success" : successRate >= 0.7 ? "warning" : "danger"}>
              {fmtPct(successRate)} success
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {m ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <Stat label="Submitted" value={m.workloads_submitted.toLocaleString()} />
                <Stat
                  label="Completed"
                  value={m.workloads_completed.toLocaleString()}
                  accent="var(--lime-bright)"
                />
                <Stat
                  label="Failed"
                  value={m.workloads_failed.toLocaleString()}
                  accent={m.workloads_failed > 0 ? "#e74c3c" : "var(--ink-muted)"}
                />
              </div>
              <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <Stat label="Remote" value={m.workloads_placed_remote.toLocaleString()} />
                <Stat
                  label="Rejected"
                  value={m.workloads_rejected.toLocaleString()}
                  accent={m.workloads_rejected > 0 ? "var(--gold-bright)" : "var(--ink-muted)"}
                />
                <div>
                  <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Verify</div>
                  <Badge
                    variant={
                      m.verification_pass_rate >= 0.9
                        ? "success"
                        : m.verification_pass_rate >= 0.7
                          ? "warning"
                          : "danger"
                    }
                  >
                    {fmtPct(m.verification_pass_rate)}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card className="float-up float-up-2">
        <CardHeader>
          <CardTitle>◎ Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {m ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ textAlign: "center", paddingTop: "4px" }}>
                <div style={{ fontSize: "32px", fontFamily: "var(--font-display)", color: "var(--ink)", fontWeight: 300 }}>
                  {fmtUsdLarge(m.total_cost_usd)}
                </div>
                <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "6px", letterSpacing: "0.05em" }}>total spend (session)</div>
              </div>
              <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Stat
                  label="Estimated"
                  value={fmtUsdLarge(m.estimated_cost_usd)}
                  sub="at submission"
                />
                <Stat
                  label="Saved vs On-Demand"
                  value={fmtUsdLarge(m.savings_cost_usd)}
                  accent="var(--lime-bright)"
                />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Panel: Savings ─────────────────────────────────────────────

function SavingsPanel({ savings }: { savings: SACMSavingsResponse | null }) {
  if (!savings) {
    return (
      <Card className="float-up float-up-0">
        <CardHeader><CardTitle>▣ Savings Report</CardTitle></CardHeader>
        <CardContent><div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div></CardContent>
      </Card>
    );
  }

  return (
    <Card className="float-up float-up-0">
      <CardHeader>
        <CardTitle>▣ Savings Report</CardTitle>
        <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>{savings.period_label}</span>
      </CardHeader>
      <CardContent>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left: Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "16px", paddingTop: "8px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontFamily: "var(--font-display)", color: "var(--ink)", fontWeight: 300 }}>
                  {fmtUsdLarge(savings.total_actual_usd)}
                </div>
                <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "6px", letterSpacing: "0.05em" }}>Actual Spend</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontFamily: "var(--font-display)", color: "var(--ink-soft)", fontWeight: 300, textDecoration: "line-through" }}>
                  {fmtUsdLarge(savings.total_baseline_usd)}
                </div>
                <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "6px", letterSpacing: "0.05em" }}>On-Demand</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontFamily: "var(--font-display)", color: "var(--lime-bright)", fontWeight: 300 }}>
                  {fmtUsdLarge(savings.total_savings_usd)}
                </div>
                <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginTop: "6px", letterSpacing: "0.05em" }}>Saved</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <Stat
                label="Avg Cost / Workload"
                value={fmtUsd(savings.avg_cost_per_workload_usd)}
              />
              <Stat
                label="Avg Savings / Workload"
                value={fmtUsd(savings.avg_savings_per_workload_usd)}
                accent="var(--lime-bright)"
              />
              <Stat label="Records" value={savings.record_count.toLocaleString()} />
            </div>
          </div>

          {/* Right: Savings Ring + Provider Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ProgressRing
                value={savings.savings_ratio}
                max={1}
                size={80}
                strokeWidth={6}
                color="var(--lime-bright)"
                label="saved"
              />
            </div>
            {savings.top_providers.length > 0 && (
              <div>
                <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>By Provider</div>
                <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "4px 0", color: "var(--ink-muted)", fontWeight: "normal" }}>Provider</th>
                      <th style={{ textAlign: "right", padding: "4px 0", color: "var(--ink-muted)", fontWeight: "normal" }}>Spend</th>
                      <th style={{ textAlign: "right", padding: "4px 0", color: "var(--ink-muted)", fontWeight: "normal" }}>Saved</th>
                      <th style={{ textAlign: "right", padding: "4px 0", color: "var(--ink-muted)", fontWeight: "normal" }}>Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savings.top_providers.map((p) => (
                      <tr key={p.provider_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 0", color: "var(--ink)", fontFamily: "var(--font-body)" }}>{p.provider_id}</td>
                        <td style={{ padding: "6px 0", textAlign: "right", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>{fmtUsdLarge(p.total_actual_usd)}</td>
                        <td style={{ padding: "6px 0", textAlign: "right", color: "var(--lime-bright)", fontFamily: "var(--font-body)" }}>{fmtUsdLarge(p.total_savings_usd)}</td>
                        <td style={{ padding: "6px 0", textAlign: "right", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>{p.workload_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Panel: Market Oracle ───────────────────────────────────────

function OraclePanel({
  oracle,
  providers,
  onRefreshOracle,
  onResetTrust,
  initialProviderFilter = "",
}: {
  oracle: SACMOracleResponse | null;
  providers: SACMProvidersResponse | null;
  onRefreshOracle: () => Promise<void>;
  onResetTrust: (providerId: string) => Promise<void>;
  initialProviderFilter?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [resetingId, setResetingId] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      await onRefreshOracle();
      setRefreshedAt(Date.now());
      setRefreshMsg(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : String(err);
      setRefreshMsg(msg);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleResetTrust(providerId: string) {
    if (!confirm(`Reset trust score for "${providerId}" to 1.0?`)) return;
    setResetingId(providerId);
    setResetMsg(null);
    try {
      await onResetTrust(providerId);
      setResetMsg(`Trust reset for ${providerId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : String(err);
      setResetMsg(msg);
    } finally {
      setResetingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Provider Health Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <Card className="float-up float-up-0">
          <CardHeader>
            <CardTitle>◎ Providers</CardTitle>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {providers && (
                <Badge variant={providers.healthy_providers === providers.total_providers ? "success" : "warning"}>
                  {providers.healthy_providers}/{providers.total_providers} healthy
                </Badge>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  fontSize: "9px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: `1px solid ${refreshing ? "var(--border)" : "var(--lime)"}`,
                  background: "transparent",
                  color: refreshing ? "var(--ink-muted)" : "var(--lime)",
                  cursor: refreshing ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {refreshing ? "Refreshing…" : "Refresh Oracle"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {refreshMsg && (
              <div style={{ marginBottom: "8px", fontSize: "9px", color: "#e74c3c", background: "rgba(231, 76, 60, 0.1)", borderRadius: "4px", padding: "4px 8px" }}>{refreshMsg}</div>
            )}
            {refreshedAt && !refreshMsg && (
              <div style={{ marginBottom: "8px", fontSize: "9px", color: "var(--lime)" }}>
                Refreshed {Math.round((Date.now() - refreshedAt) / 1000)}s ago
              </div>
            )}
            {resetMsg && (
              <div style={{ marginBottom: "8px", fontSize: "9px", color: "var(--lime)", background: "rgba(90, 200, 38, 0.1)", borderRadius: "4px", padding: "4px 8px" }}>{resetMsg}</div>
            )}
            {providers ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {providers.providers.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "8px 0", textAlign: "center" }}>No providers registered</div>
                ) : (
                  providers.providers.map((p) => (
                    <div key={p.provider_id} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <StatusDot status={p.status === "healthy" ? "ok" : p.status === "unreachable" ? "error" : "degraded"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <span style={{ fontSize: "12px", color: "var(--ink)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.provider_id}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                              {p.valid_offer_count}/{p.offer_count} offers
                            </span>
                            {p.consecutive_failures > 0 && (
                              <button
                                onClick={() => handleResetTrust(p.provider_id)}
                                disabled={resetingId === p.provider_id}
                                style={{
                                  fontSize: "8px",
                                  color: "var(--gold-bright)",
                                  border: `1px solid var(--gold-bright)`,
                                  background: "transparent",
                                  borderRadius: "3px",
                                  padding: "3px 6px",
                                  cursor: resetingId === p.provider_id ? "wait" : "pointer",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {resetingId === p.provider_id ? "…" : "Reset Trust"}
                              </button>
                            )}
                          </div>
                        </div>
                        {p.consecutive_failures > 0 && (
                          <div style={{ fontSize: "9px", color: "var(--gold-bright)" }}>
                            {p.consecutive_failures} consec. failures
                          </div>
                        )}
                        {p.last_failure_reason && (
                          <div style={{ fontSize: "9px", color: "#e74c3c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.last_failure_reason}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div style={{ paddingTop: "8px", borderTop: "1px solid var(--border)", fontSize: "9px", color: "var(--ink-muted)" }}>
                  Last refresh: {fmtEpoch(providers.last_refresh_epoch)}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div>
            )}
          </CardContent>
        </Card>

        {/* Cheapest CPU */}
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle>↑ Cheapest CPU Offer</CardTitle>
          </CardHeader>
          <CardContent>
            {oracle?.cheapest_cpu_offer ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>{oracle.cheapest_cpu_offer.provider_id}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Stat label="$/vCPU·s" value={fmtUsd(oracle.cheapest_cpu_offer.price_cpu_per_vcpu_s)} />
                  <Stat label="$/GiB·s" value={fmtUsd(oracle.cheapest_cpu_offer.price_mem_per_gib_s)} />
                  <Stat label="CPU" value={`${oracle.cheapest_cpu_offer.cpu_vcpu.toFixed(1)} vCPU`} />
                  <Stat label="Mem" value={fmtGib(oracle.cheapest_cpu_offer.memory_gib)} />
                  <Stat label="Latency p50" value={fmtMs(oracle.cheapest_cpu_offer.latency_ms_p50)} />
                  <Stat label="Trust" value={fmtPct(oracle.cheapest_cpu_offer.trust_score)} />
                </div>
                {oracle.cheapest_cpu_offer.region && (
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>Region: {oracle.cheapest_cpu_offer.region}</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>
                {oracle ? "No CPU offers available" : "Loading…"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cheapest GPU */}
        <Card className="float-up float-up-2">
          <CardHeader>
            <CardTitle>⚡ Cheapest GPU Offer</CardTitle>
          </CardHeader>
          <CardContent>
            {oracle?.cheapest_gpu_offer ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--ink-mid)", fontFamily: "var(--font-body)" }}>{oracle.cheapest_gpu_offer.provider_id}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Stat label="$/GPU·s" value={fmtUsd(oracle.cheapest_gpu_offer.price_gpu_per_unit_s)} />
                  <Stat label="$/GiB·s" value={fmtUsd(oracle.cheapest_gpu_offer.price_mem_per_gib_s)} />
                  <Stat
                    label="GPU"
                    value={`${oracle.cheapest_gpu_offer.gpu_units.toFixed(1)}× ${oracle.cheapest_gpu_offer.gpu_vram_gib.toFixed(0)}G`}
                  />
                  <Stat label="Mem" value={fmtGib(oracle.cheapest_gpu_offer.memory_gib)} />
                  <Stat label="Latency p50" value={fmtMs(oracle.cheapest_gpu_offer.latency_ms_p50)} />
                  <Stat label="Trust" value={fmtPct(oracle.cheapest_gpu_offer.trust_score)} />
                </div>
                {oracle.cheapest_gpu_offer.region && (
                  <div style={{ fontSize: "9px", color: "var(--ink-muted)" }}>Region: {oracle.cheapest_gpu_offer.region}</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>
                {oracle ? "No GPU offers available" : "Loading…"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Pricing Surface Table */}
      <Card className="float-up float-up-3">
        <CardHeader>
          <CardTitle>≡ Pricing Surface</CardTitle>
          {oracle && (
            <span style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              {oracle.valid_offers}/{oracle.total_offers} valid · refreshed {fmtEpoch(oracle.last_refresh_epoch)}
            </span>
          )}
        </CardHeader>
        <CardContent style={{ paddingLeft: 0, paddingRight: 0 }}>
          {oracle ? (
            <>
              {initialProviderFilter && (
                <div style={{ paddingLeft: "16px", paddingRight: "16px", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", color: "var(--ink)", background: "var(--bg)", borderRadius: "4px", padding: "4px 8px" }}>
                    Filtered: {initialProviderFilter}
                  </span>
                </div>
              )}
              <OfferTable
                offers={initialProviderFilter
                  ? oracle.offers.filter((o) => o.provider_id === initialProviderFilter)
                  : oracle.offers}
              />
            </>
          ) : (
            <div style={{ paddingLeft: "16px", paddingRight: "16px", fontSize: "12px", color: "var(--ink-muted)", padding: "16px", textAlign: "center" }}>Loading oracle data…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Panel: Compute Resources ───────────────────────────────────

function ComputePanel({ compute }: { compute: SACMComputeResponse | null }) {
  if (!compute) {
    return (
      <Card className="float-up float-up-0">
        <CardHeader><CardTitle>⚙ Local Compute</CardTitle></CardHeader>
        <CardContent><div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div></CardContent>
      </Card>
    );
  }

  const cpuUsedPct = compute.cpu_vcpu_total > 0
    ? (compute.cpu_vcpu_total - compute.cpu_vcpu_available) / compute.cpu_vcpu_total
    : 0;
  const memUsedPct = compute.memory_gib_total > 0
    ? (compute.memory_gib_total - compute.memory_gib_available) / compute.memory_gib_total
    : 0;
  const gpuUsedPct = compute.gpu_units_total > 0
    ? (compute.gpu_units_total - compute.gpu_units_available) / compute.gpu_units_total
    : 0;

  const SUBSYSTEM_COLORS: Record<string, string> = {
    nova: "var(--lime)",
    simula: "var(--lime-bright)",
    grpo: "var(--gold-bright)",
    oneiros: "var(--lime-bright)",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
      {/* Capacity */}
      <Card className="float-up float-up-0">
        <CardHeader>
          <CardTitle>◎ Local Capacity — {compute.node_id}</CardTitle>
          {compute.queue_depth > 0 && (
            <Badge variant="warning">{compute.queue_depth} queued</Badge>
          )}
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "8px" }}>
            <ProgressRing
              value={cpuUsedPct}
              max={1}
              color={cpuUsedPct > 0.85 ? "#e74c3c" : cpuUsedPct > 0.65 ? "var(--gold-bright)" : "var(--lime-bright)"}
              label="CPU"
            />
            <ProgressRing
              value={memUsedPct}
              max={1}
              color={memUsedPct > 0.85 ? "#e74c3c" : memUsedPct > 0.65 ? "var(--gold-bright)" : "var(--lime)"}
              label="Mem"
            />
            {compute.gpu_units_total > 0 && (
              <ProgressRing
                value={gpuUsedPct}
                max={1}
                color={gpuUsedPct > 0.85 ? "#e74c3c" : "var(--gold-bright)"}
                label="GPU"
              />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <ResourceBar
              label="CPU"
              used={compute.cpu_vcpu_total - compute.cpu_vcpu_available}
              total={compute.cpu_vcpu_total}
              color="var(--lime-bright)"
              fmt={(n) => `${n.toFixed(1)} vCPU`}
            />
            <ResourceBar
              label="Memory"
              used={compute.memory_gib_total - compute.memory_gib_available}
              total={compute.memory_gib_total}
              color="var(--lime)"
              fmt={fmtGib}
            />
            {compute.gpu_units_total > 0 && (
              <>
                <ResourceBar
                  label="GPU"
                  used={compute.gpu_units_total - compute.gpu_units_available}
                  total={compute.gpu_units_total}
                  color="var(--gold-bright)"
                  fmt={(n) => `${n.toFixed(1)} units`}
                />
                <ResourceBar
                  label="VRAM"
                  used={compute.gpu_vram_gib_total - compute.gpu_vram_gib_available}
                  total={compute.gpu_vram_gib_total}
                  color="var(--gold-bright)"
                  fmt={fmtGib}
                />
              </>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
            <Stat label="Active" value={compute.active_count.toString()} />
            <Stat label="Queued" value={compute.queue_depth.toString()} />
            <Stat label="Offloaded" value={compute.total_offloaded.toLocaleString()} />
          </div>
        </CardContent>
      </Card>

      {/* Allocation Stats + Fair Share */}
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle>▣ Allocation Accounting</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Stat label="Total Allocated" value={compute.total_allocated.toLocaleString()} />
            <Stat label="Total Queued" value={compute.total_queued.toLocaleString()} />
            <Stat
              label="Denied"
              value={compute.total_denied.toLocaleString()}
              accent={compute.total_denied > 0 ? "var(--gold-bright)" : "var(--ink-muted)"}
            />
            <Stat label="Federation Offloads" value={compute.total_offloaded.toLocaleString()} />
          </div>

          {Object.keys(compute.held_cpu_by_subsystem).length > 0 && (
            <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                CPU Held by Subsystem
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(compute.held_cpu_by_subsystem)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, cpu]) => {
                    const pct = compute.cpu_vcpu_total > 0 ? (cpu / compute.cpu_vcpu_total) * 100 : 0;
                    const color = SUBSYSTEM_COLORS[name] ?? "var(--ink-muted)";
                    return (
                      <div key={name} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "9px" }}>
                          <span style={{ color: "var(--ink-soft)", fontFamily: "var(--font-body)" }}>{name}</span>
                          <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                            {cpu.toFixed(1)} vCPU ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div style={{ height: "4px", width: "100%", borderRadius: "4px", background: "var(--border)", overflow: "hidden" }}>
                          <div
                            style={{ height: "100%", borderRadius: "4px", width: `${Math.min(100, pct)}%`, background: color, transition: "width 0.3s ease" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Panel: Pre-Warming ─────────────────────────────────────────

const OFFLOAD_CLASSES = ["general", "cpu_bound", "gpu_heavy", "memory_intensive", "io_bound"];

function PreWarmPanel({
  preWarm,
  onTrigger,
}: {
  preWarm: SACMPreWarmResponse | null;
  onTrigger: (offloadClass: string, count: number) => Promise<void>;
}) {
  const [triggerClass, setTriggerClass] = useState("general");
  const [triggerCount, setTriggerCount] = useState(1);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  async function handleTrigger() {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      await onTrigger(triggerClass, triggerCount);
      setTriggerMsg(`Pre-warm cycle triggered for ${triggerClass} (${triggerCount})`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : String(err);
      setTriggerMsg(msg);
    } finally {
      setTriggering(false);
    }
  }

  if (!preWarm) {
    return (
      <Card className="float-up float-up-0">
        <CardHeader><CardTitle>◎ Pre-Warming Engine</CardTitle></CardHeader>
        <CardContent><div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "16px 0", textAlign: "center" }}>Loading…</div></CardContent>
      </Card>
    );
  }

  const poolPct = preWarm.max_instances > 0 ? preWarm.pool_size / preWarm.max_instances : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
      {/* Pool Overview */}
      <Card className="float-up float-up-0">
        <CardHeader>
          <CardTitle>⚡ Warm Instance Pool</CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Badge variant={preWarm.available_instances > 0 ? "success" : "muted"}>
              {preWarm.available_instances} available
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "8px" }}>
            <ProgressRing
              value={poolPct}
              max={1}
              color={poolPct > 0.8 ? "#e74c3c" : poolPct > 0.5 ? "var(--gold-bright)" : "var(--lime-bright)"}
              label="pool fill"
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>
              <Stat label="Pool Size" value={`${preWarm.pool_size} / ${preWarm.max_instances}`} />
              <Stat label="Available" value={preWarm.available_instances.toString()} accent="var(--lime-bright)" />
              <Stat label="Claimed" value={preWarm.claimed_instances.toString()} />
            </div>
          </div>
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "9px", color: "var(--ink-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Budget</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--ink-soft)" }}>Max pre-warm spend</span>
              <span style={{ color: "var(--ink)", fontFamily: "var(--font-body)" }}>{fmtUsdLarge(preWarm.budget_usd_per_hour)}/hr</span>
            </div>
          </div>

          {/* Force Pre-Warm */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Force Pre-Warm</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={triggerClass}
                onChange={(e) => setTriggerClass(e.target.value)}
                style={{ flex: 1, fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 8px", color: "var(--ink)", fontFamily: "var(--font-body)" }}
              >
                {OFFLOAD_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={triggerCount}
                onChange={(e) => setTriggerCount(Number(e.target.value))}
                style={{ fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 8px", color: "var(--ink)", fontFamily: "var(--font-body)", width: "50px" }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
              <button
                onClick={handleTrigger}
                disabled={triggering}
                style={{
                  fontSize: "9px",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: `1px solid ${triggering ? "var(--border)" : "var(--lime)"}`,
                  background: "transparent",
                  color: triggering ? "var(--ink-muted)" : "var(--lime)",
                  cursor: triggering ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                {triggering ? "…" : "Force"}
              </button>
            </div>
            {triggerMsg && (
              <div style={{
                fontSize: "9px",
                borderRadius: "4px",
                padding: "6px 8px",
                color: triggerMsg.includes("triggered") ? "var(--lime)" : "#e74c3c",
                background: triggerMsg.includes("triggered") ? "rgba(90, 200, 38, 0.1)" : "rgba(231, 76, 60, 0.1)",
              }}>
                {triggerMsg}
              </div>
            )}
          </div>

          {preWarm.warm_instances.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "9px", color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Active Instances</div>
              {preWarm.warm_instances.map((inst) => (
                <div
                  key={inst.instance_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "4px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    padding: "8px",
                  }}
                >
                  <StatusDot
                    status={inst.status === "available" ? "ok" : inst.status === "expired" ? "error" : "degraded"}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9px", color: "var(--ink-mid)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.instance_id.slice(0, 12)}…</span>
                      <span style={{ borderRadius: "3px", background: "var(--bg-card)", padding: "2px 4px", fontSize: "8px", color: "var(--ink)", fontFamily: "var(--font-body)" }}>
                        {inst.offload_class}
                      </span>
                    </div>
                    <div style={{ fontSize: "8px", color: "var(--ink-muted)" }}>
                      {inst.provider_id} · {fmtUsdLarge(inst.cost_usd_per_hour)}/hr
                      {inst.claimed_by ? ` · claimed by ${inst.claimed_by}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demand Forecasts */}
      <Card className="float-up float-up-1">
        <CardHeader>
          <CardTitle>↑ Demand Forecasts (EMA)</CardTitle>
        </CardHeader>
        <CardContent>
          {preWarm.demand_forecasts.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "32px 0", textAlign: "center" }}>
              No demand history yet. Forecasts appear after workloads are submitted.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {preWarm.demand_forecasts.map((fc) => (
                <div key={fc.offload_class} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "var(--ink)", fontFamily: "var(--font-body)" }}>{fc.offload_class}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)", fontSize: "9px" }}>
                        {fc.history_samples} samples
                      </span>
                      <span style={{ color: "var(--ink)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                        {fc.ema_value.toFixed(2)}/min
                      </span>
                    </div>
                  </div>
                  <div style={{ height: "4px", width: "100%", borderRadius: "4px", background: "var(--border)", overflow: "hidden" }}>
                    <div
                      style={{ height: "100%", borderRadius: "4px", width: `${Math.min(100, fc.ema_value * 20)}%`, background: "var(--lime)", transition: "width 0.7s ease" }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: "8px", fontSize: "8px", color: "var(--ink-muted)" }}>
                EMA α=0.3 · higher bar = more predicted demand
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Panel: History ─────────────────────────────────────────────

type HistorySortKey = "submitted_at" | "offload_class" | "priority" | "provider" | "cost" | "savings" | "duration" | "status" | "verification";

function statusVariant(status: string): string {
  if (status === "completed") return "text-teal-400/80";
  if (status === "failed") return "text-rose-400/80";
  if (status === "rejected") return "text-amber-400/80";
  return "text-white/40";
}

function HistoryPanel({
  history,
  onRefetch,
}: {
  history: SACMWorkloadHistoryResponse | null;
  onRefetch: () => void;
}) {
  const [sortKey, setSortKey] = useState<HistorySortKey>("submitted_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [selectedRow, setSelectedRow] = useState<SACMWorkloadHistoryItem | null>(null);

  const providers = useMemo(() => {
    if (!history) return [];
    const set = new Set(history.records.map((r) => r.provider_id).filter(Boolean));
    return Array.from(set);
  }, [history]);

  const filtered = useMemo(() => {
    if (!history) return [];
    return history.records.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (providerFilter && r.provider_id !== providerFilter) return false;
      return true;
    });
  }, [history, statusFilter, providerFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "submitted_at": return dir * (a.submitted_at - b.submitted_at);
        case "offload_class": return dir * a.offload_class.localeCompare(b.offload_class);
        case "priority": return dir * a.priority.localeCompare(b.priority);
        case "provider": return dir * a.provider_id.localeCompare(b.provider_id);
        case "cost": return dir * (a.actual_cost_usd - b.actual_cost_usd);
        case "savings": return dir * (a.savings_usd - b.savings_usd);
        case "duration": return dir * (a.duration_s - b.duration_s);
        case "status": return dir * a.status.localeCompare(b.status);
        case "verification": return dir * ((a.verification_passed === true ? 1 : 0) - (b.verification_passed === true ? 1 : 0));
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  function SortTh({ label, col }: { label: string; col: HistorySortKey }) {
    const active = sortKey === col;
    return (
      <th
        style={{
          padding: "8px 12px",
          textAlign: "left",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          userSelect: "none",
          transition: "color 0.2s ease",
          color: active ? "var(--lime-bright)" : "var(--ink-muted)",
        }}
        onClick={() => {
          if (col === sortKey) setSortAsc(!sortAsc);
          else { setSortKey(col); setSortAsc(false); }
        }}
      >
        {label}
        {active && <span style={{ marginLeft: "4px" }}>{sortAsc ? "↑" : "↓"}</span>}
      </th>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card className="float-up float-up-0">
        <CardHeader>
          <CardTitle>≡ Workload History</CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>{filtered.length} records</span>
            <button
              onClick={onRefetch}
              style={{
                fontSize: "9px",
                color: "var(--lime)",
                border: "1px solid var(--lime)",
                background: "transparent",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 8px", color: "var(--ink)", fontFamily: "var(--font-body)" }}
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              style={{ fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 8px", color: "var(--ink)", fontFamily: "var(--font-body)" }}
            >
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {!history ? (
            <div style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center", fontSize: "12px", color: "var(--ink-muted)" }}>Loading history…</div>
          ) : sorted.length === 0 ? (
            <div style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center", fontSize: "12px", color: "var(--ink-muted)" }}>
              No workload history yet. Records appear after workloads complete.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <SortTh label="Submitted" col="submitted_at" />
                    <SortTh label="Class" col="offload_class" />
                    <SortTh label="Priority" col="priority" />
                    <SortTh label="Provider" col="provider" />
                    <SortTh label="Cost" col="cost" />
                    <SortTh label="Savings" col="savings" />
                    <SortTh label="Duration" col="duration" />
                    <SortTh label="Status" col="status" />
                    <SortTh label="Verify" col="verification" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: "transparent", transition: "background 0.2s ease" }}
                      onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "8px 12px", color: "var(--ink-soft)", fontFamily: "var(--font-body)", fontSize: "10px" }}>
                        {fmtEpoch(row.submitted_at)}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ borderRadius: "3px", background: "var(--bg-card)", padding: "3px 6px", color: "var(--ink)", fontSize: "10px", fontFamily: "var(--font-body)" }}>
                          {row.offload_class || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--ink-mid)", textTransform: "capitalize", fontSize: "11px" }}>{row.priority?.toLowerCase() || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "var(--ink)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px", fontSize: "11px" }}>
                        {row.provider_id || "—"}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--ink)", fontFamily: "var(--font-body)", fontSize: "11px" }}>
                        {fmtUsd(row.actual_cost_usd)}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--lime-bright)", fontFamily: "var(--font-body)", fontSize: "11px" }}>
                        {row.savings_usd > 0 ? fmtUsd(row.savings_usd) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--ink-mid)", fontSize: "11px" }}>
                        {row.duration_s > 0 ? `${row.duration_s.toFixed(1)}s` : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 500, textTransform: "capitalize", color: statusVariant(row.status).includes("teal") ? "var(--lime-bright)" : statusVariant(row.status).includes("rose") ? "#e74c3c" : "var(--gold-bright)", fontSize: "11px" }}>
                        {row.status}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {row.verification_passed === null ? (
                          <span style={{ color: "var(--ink-muted)" }}>—</span>
                        ) : row.verification_passed ? (
                          <span style={{ color: "var(--lime-bright)" }}>✓</span>
                        ) : (
                          <span style={{ color: "#e74c3c" }}>✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      {selectedRow && (
        <Card className="float-up float-up-1">
          <CardHeader>
            <CardTitle>◈ Workload Detail</CardTitle>
            <button
              onClick={() => setSelectedRow(null)}
              style={{
                fontSize: "9px",
                color: "var(--ink-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--ink)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink-muted)"}
            >
              ✕ Close
            </button>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
              <Stat label="ID" value={selectedRow.id.slice(0, 12) + "…"} />
              <Stat label="Status" value={selectedRow.status} />
              <Stat label="Class" value={selectedRow.offload_class || "—"} />
              <Stat label="Priority" value={selectedRow.priority || "—"} />
              <Stat label="Provider" value={selectedRow.provider_id || "—"} />
              <Stat label="Estimated" value={fmtUsd(selectedRow.estimated_cost_usd)} />
              <Stat label="Actual Cost" value={fmtUsd(selectedRow.actual_cost_usd)} />
              <Stat
                label="Savings"
                value={selectedRow.savings_usd > 0 ? fmtUsd(selectedRow.savings_usd) : "—"}
                accent="var(--lime-bright)"
              />
              <Stat label="Duration" value={selectedRow.duration_s > 0 ? `${selectedRow.duration_s.toFixed(2)}s` : "—"} />
              <Stat
                label="Verification"
                value={selectedRow.verification_passed === null ? "N/A" : selectedRow.verification_passed ? "Passed" : "Failed"}
                accent={selectedRow.verification_passed ? "var(--lime-bright)" : selectedRow.verification_passed === false ? "#e74c3c" : ""}
              />
              {selectedRow.consensus_score !== null && (
                <Stat label="Consensus Score" value={fmtPct(selectedRow.consensus_score)} />
              )}
              <Stat label="Submitted" value={fmtEpoch(selectedRow.submitted_at)} />
              {selectedRow.completed_at && (
                <Stat label="Completed" value={fmtEpoch(selectedRow.completed_at)} />
              )}
            </div>
            {selectedRow.error_message && (
              <div style={{ marginTop: "12px", padding: "8px", borderRadius: "4px", background: "rgba(231, 76, 60, 0.1)", border: "1px solid rgba(231, 76, 60, 0.2)" }}>
                <div style={{ fontSize: "9px", color: "#e74c3c", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Error</div>
                <div style={{ fontSize: "11px", color: "#c23b22", fontFamily: "var(--font-body)" }}>{selectedRow.error_message}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Panel: Verification Trust ──────────────────────────────────

function VerificationPanel({
  trust,
  onRefetch,
  onSelectProvider,
}: {
  trust: SACMVerificationTrustResponse | null;
  onRefetch: () => void;
  onSelectProvider: (providerId: string) => void;
}) {
  const QUARANTINE_THRESHOLD = 0.3;

  return (
    <Card className="float-up float-up-0">
      <CardHeader>
        <CardTitle>◑ Provider Trust Scores</CardTitle>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "9px", color: "var(--ink-muted)" }}>Quarantine threshold: {(QUARANTINE_THRESHOLD * 100).toFixed(0)}%</span>
          <button
            onClick={onRefetch}
            style={{
              fontSize: "9px",
              color: "var(--lime)",
              border: "1px solid var(--lime)",
              background: "transparent",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {!trust ? (
          <div style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center", fontSize: "12px", color: "var(--ink-muted)" }}>Loading trust records…</div>
        ) : trust.providers.length === 0 ? (
          <div style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center", fontSize: "12px", color: "var(--ink-muted)" }}>
            No trust records yet. Records appear after workloads are verified.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {trust.providers.map((p) => (
              <div
                key={p.provider_id}
                style={{
                  borderRadius: "4px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <span style={{ fontSize: "12px", color: "var(--ink)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.provider_id}</span>
                    {p.quarantined && (
                      <span style={{ flexShrink: 0, borderRadius: "3px", background: "rgba(231, 76, 60, 0.2)", padding: "3px 6px", fontSize: "8px", color: "#c23b22", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        quarantined
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <button
                      onClick={() => onSelectProvider(p.provider_id)}
                      style={{
                        fontSize: "9px",
                        color: "var(--lime)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--lime-bright)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--lime)"}
                    >
                      View offers →
                    </button>
                  </div>
                </div>

                {/* Trust bar with quarantine marker */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "9px" }}>
                    <span style={{ color: "var(--ink-muted)" }}>Trust score</span>
                    <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: p.trust_score >= 0.8 ? "var(--lime-bright)" : p.trust_score >= 0.5 ? "var(--gold-bright)" : "#e74c3c" }}>
                      {fmtPct(p.trust_score)}
                    </span>
                  </div>
                  <div style={{ position: "relative", height: "5px", width: "100%", borderRadius: "4px", background: "var(--border)", overflow: "visible" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "4px",
                        width: `${Math.min(100, p.trust_score * 100)}%`,
                        background: p.trust_score >= 0.8 ? "var(--lime-bright)" : p.trust_score >= 0.5 ? "var(--gold-bright)" : "#e74c3c",
                        transition: "width 0.7s ease",
                      }}
                    />
                    {/* Quarantine threshold marker at 30% */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        background: "rgba(231, 76, 60, 0.4)",
                        left: `${QUARANTINE_THRESHOLD * 100}%`,
                      }}
                      title="Quarantine threshold"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "9px" }}>
                  <div>
                    <div style={{ color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Total</div>
                    <div style={{ color: "var(--ink)", fontFamily: "var(--font-body)" }}>{p.total_batches}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Accepted</div>
                    <div style={{ color: "var(--lime-bright)", fontFamily: "var(--font-body)" }}>{p.accepted_batches}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Rejected</div>
                    <div style={{ color: p.rejected_batches > 0 ? "#e74c3c" : "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                      {p.rejected_batches}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--ink-strong)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Consec. Fails</div>
                    <div style={{ color: p.consecutive_failures > 0 ? "var(--gold-bright)" : "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                      {p.consecutive_failures}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ paddingTop: "4px", fontSize: "8px", color: "var(--ink-muted)" }}>
              Trust decay: ×0.7 on failure · +0.05 recovery on success
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab System ─────────────────────────────────────────────────

type Tab = "overview" | "oracle" | "compute" | "prewarm" | "savings" | "history" | "verification";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "oracle", label: "Market Oracle" },
  { id: "compute", label: "Compute" },
  { id: "prewarm", label: "Pre-Warming" },
  { id: "savings", label: "Savings" },
  { id: "history", label: "History" },
  { id: "verification", label: "Verification" },
];

// ─── Main Page ──────────────────────────────────────────────────

export default function SACMPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [oracleProviderFilter, setOracleProviderFilter] = useState<string>("");

  const metrics = useApi<SACMMetricsResponse>(api.sacmMetrics, { intervalMs: 5000 });
  const savings = useApi<SACMSavingsResponse>(api.sacmSavings, { intervalMs: 10000 });
  const providers = useApi<SACMProvidersResponse>(api.sacmProviders, { intervalMs: 10000 });
  const oracle = useApi<SACMOracleResponse>(api.sacmOracle, { intervalMs: 15000 });
  const compute = useApi<SACMComputeResponse>(api.sacmCompute, { intervalMs: 5000 });
  const preWarm = useApi<SACMPreWarmResponse>(api.sacmPreWarm, { intervalMs: 10000 });
  const health = useApi<SACMHealthResponse>(api.sacmHealth, { intervalMs: 8000 });
  const history = useApi<SACMWorkloadHistoryResponse>(
    useCallback(() => api.sacmHistory({ limit: 100 }), []),
    { intervalMs: 15000, enabled: tab === "history" },
  );
  const trust = useApi<SACMVerificationTrustResponse>(
    api.sacmVerificationTrust,
    { intervalMs: 20000, enabled: tab === "verification" },
  );

  const overallStatus = health.data?.overall ?? "ok";
  const burnRate = metrics.data?.rolling_burn_rate_usd_per_hour ?? 0;

  const handleOracleRefresh = useCallback(async () => {
    await api.sacmOracleRefresh();
    oracle.refetch();
    providers.refetch();
  }, [oracle, providers]);

  const handleResetTrust = useCallback(async (providerId: string) => {
    await api.sacmResetProviderTrust(providerId, "manual reset via dashboard");
    trust.refetch();
  }, [trust]);

  const handlePreWarmTrigger = useCallback(async (offloadClass: string, count: number) => {
    await api.sacmPreWarmTrigger(offloadClass, count);
    preWarm.refetch();
  }, [preWarm]);

  const handleSelectVerificationProvider = useCallback((providerId: string) => {
    setOracleProviderFilter(providerId);
    setTab("oracle");
  }, []);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <PageHeader
        title="SACM — Compute Mesh"
        description="Substrate-Arbitrage Compute Mesh · GCP, Akash · placement, verification, cost arbitrage"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {burnRate > 0 && (
            <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              {fmtUsdLarge(burnRate)}/hr
            </span>
          )}
          <Badge
            variant={overallStatus === "ok" ? "success" : overallStatus === "degraded" ? "warning" : "danger"}
            pulse={overallStatus !== "ok"}
          >
            {overallStatus.toUpperCase()}
          </Badge>
        </div>
      </PageHeader>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 12px",
              fontSize: "11px",
              fontFamily: "var(--font-body)",
              fontWeight: tab === t.id ? 600 : 400,
              transition: "all 0.2s ease",
              borderBottom: tab === t.id ? "2px solid var(--lime-bright)" : "2px solid transparent",
              marginBottom: "-1px",
              background: "transparent",
              color: tab === t.id ? "var(--lime-bright)" : "var(--ink-muted)",
              cursor: "pointer",
              border: "none",
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {tab === "overview" && (
          <>
            <OverviewPanel metrics={metrics.data} health={health.data} />
            <PreWarmPanel preWarm={preWarm.data} onTrigger={handlePreWarmTrigger} />
          </>
        )}

        {tab === "oracle" && (
          <OraclePanel
            oracle={oracle.data}
            providers={providers.data}
            onRefreshOracle={handleOracleRefresh}
            onResetTrust={handleResetTrust}
            initialProviderFilter={oracleProviderFilter}
          />
        )}

        {tab === "compute" && (
          <ComputePanel compute={compute.data} />
        )}

        {tab === "prewarm" && (
          <PreWarmPanel preWarm={preWarm.data} onTrigger={handlePreWarmTrigger} />
        )}

        {tab === "savings" && (
          <SavingsPanel savings={savings.data} />
        )}

        {tab === "history" && (
          <HistoryPanel history={history.data} onRefetch={history.refetch} />
        )}

        {tab === "verification" && (
          <VerificationPanel
            trust={trust.data}
            onRefetch={trust.refetch}
            onSelectProvider={handleSelectVerificationProvider}
          />
        )}
      </div>
    </div>
  );
}
