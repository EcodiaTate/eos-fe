"use client";

import { useCallback, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  OikosStatusResponse,
  OikosOrgansResponse,
  OikosAssetsResponse,
  OikosOwnedAsset,
  OikosChildInstance,
  OikosOrgan,
  GenesisSparkResponse,
  OikosBountiesResponse,
  OikosBounty,
  OikosRevenueStreamsResponse,
  OikosFleetResponse,
  OikosFleetMember,
  OikosKnowledgeMarketResponse,
  OikosDreamResponse,
  OikosStressTest,
  OikosTollboothsResponse,
  OikosTollbooth,
  OikosThreatModelResponse,
  OikosCriticalExposure,
  OikosHedgingProposal,
  OikosHistoryResponse,
  OikosSnapshot,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// ─── Helpers ────────────────────────────────────────────────────

function usd(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return "$0.00";
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}

function pct(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function days(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return "0d";
  if (n >= 365) return `${(n / 365).toFixed(1)}y`;
  return `${n.toFixed(0)}d`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const hrs = diff / 3_600_000;
  if (hrs < 1) return `${Math.round(diff / 60000)}m ago`;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ─── Starvation badge ───────────────────────────────────────────

function StarvationBadge({ level }: { level: string }) {
  const variant =
    level === "nominal"
      ? "success"
      : level === "cautious"
        ? "warning"
        : "danger";
  const pulse = level !== "nominal";
  return (
    <Badge variant={variant} pulse={pulse}>
      {level}
    </Badge>
  );
}

// ─── Big Metric ─────────────────────────────────────────────────

function BigMetric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] text-white/25 uppercase tracking-widest">
        {label}
      </div>
      <div
        className="text-2xl font-semibold tabular-nums tracking-tight"
        style={{ color: color ?? "rgba(255,255,255,0.9)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-white/35 tabular-nums">{sub}</div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25">{label}</div>
      <div className="text-sm text-white/70 tabular-nums font-medium">
        {value}
      </div>
    </div>
  );
}

// ─── Metabolic HUD ──────────────────────────────────────────────

function MetabolicHUD({ data }: { data: OikosStatusResponse }) {
  const efficiency = parseFloat(data.metabolic_efficiency);
  const effColor =
    efficiency >= 1.5
      ? "#5eead4"
      : efficiency >= 1.0
        ? "#fbbf24"
        : "#ef4444";

  return (
    <Card glow>
      <CardHeader>
        <CardTitle>Metabolic HUD</CardTitle>
        <StarvationBadge level={data.starvation_level} />
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Big numbers row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigMetric
            label="Net Worth"
            value={usd(data.total_net_worth)}
            color="#5eead4"
          />
          <BigMetric
            label="Liquid"
            value={usd(data.liquid_balance)}
            sub={`Reserve ${usd(data.survival_reserve)} / ${usd(data.survival_reserve_target)}`}
          />
          <BigMetric
            label="Daily BMR"
            value={usd(data.bmr_usd_per_day)}
            sub={`Burn ${usd(data.burn_rate_usd_per_day)}/d`}
          />
          <BigMetric
            label="Runway"
            value={days(data.runway_days)}
            sub={`P(30d survive) ${pct(data.survival_probability_30d)}`}
            color={
              parseFloat(data.runway_days) < 7
                ? "#ef4444"
                : parseFloat(data.runway_days) < 30
                  ? "#fbbf24"
                  : "#5eead4"
            }
          />
        </div>

        {/* Income strip */}
        <div className="border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Revenue 24h" value={usd(data.revenue_24h)} />
            <Metric label="Costs 24h" value={usd(data.costs_24h)} />
            <Metric label="Net 7d" value={usd(data.net_income_7d)} />
            <Metric
              label="Efficiency"
              value={`${efficiency.toFixed(2)}x`}
            />
          </div>
        </div>

        {/* Efficiency bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Metabolic Efficiency</span>
            <span className="tabular-nums" style={{ color: effColor }}>
              {efficiency.toFixed(3)}x
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (efficiency / 2) * 100)}%`,
                background: `linear-gradient(90deg, #ef4444, #fbbf24, #5eead4)`,
              }}
            />
          </div>
        </div>

        {/* Position breakdown */}
        <div className="border-t border-white/[0.06] pt-3">
          <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
            Position Breakdown
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Deployed" value={usd(data.total_deployed)} />
            <Metric label="Receivables" value={usd(data.total_receivables)} />
            <Metric label="Asset Value" value={usd(data.total_asset_value)} />
            <Metric label="Fleet Equity" value={usd(data.total_fleet_equity)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Identity Card ──────────────────────────────────────────────

function IdentityCard({ data }: { data: OikosStatusResponse }) {
  const cert = data.certificate;
  const remaining = cert.remaining_days;
  const isGenesis = cert.type === "genesis";

  const ringMax = isGenesis ? 3650 : 30;
  const ringFill = Math.max(0, Math.min(100, (remaining / ringMax) * 100));

  const certColor = isGenesis
    ? "#f59e0b"
    : cert.status === "valid"
      ? remaining > 14
        ? "#5eead4"
        : "#fbbf24"
      : cert.status === "expiring_soon"
        ? "#f59e0b"
        : "#ef4444";

  const certVariant = isGenesis
    ? "warning"
    : cert.status === "valid"
      ? "success"
      : cert.status === "expiring_soon"
        ? "warning"
        : cert.status === "none"
          ? "muted"
          : "danger";

  const certLabel = isGenesis
    ? "Root CA / Genesis Node"
    : cert.type === "official"
      ? "Official CA Certificate"
      : cert.type === "birth"
        ? "Birth Certificate"
        : "No Certificate";

  const ringLabel = isGenesis
    ? remaining >= 365
      ? `${(remaining / 365).toFixed(1)}y`
      : `${remaining.toFixed(0)}d`
    : remaining >= 0
      ? `${remaining.toFixed(0)}d`
      : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ecodian Certificate</CardTitle>
        <Badge variant={certVariant} pulse={cert.status === "expiring_soon"}>
          {isGenesis ? "genesis" : cert.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenesis && (
          <div
            className="rounded-md px-3 py-2 flex items-center gap-2"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <span style={{ color: "#f59e0b", fontSize: "14px" }}>&#9670;</span>
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: "#f59e0b" }}>
              Root Certificate Authority
            </span>
            <span className="ml-auto text-[10px] text-white/30 uppercase tracking-widest">
              Mother Tree
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={certColor}
                strokeWidth={isGenesis ? "3.5" : "3"}
                strokeDasharray={`${ringFill} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: certColor }}
              >
                {ringLabel}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium" style={{ color: isGenesis ? "#f59e0b" : "rgba(255,255,255,0.7)" }}>
              {certLabel}
            </div>
            {cert.instance_id && (
              <div className="text-[11px] text-white/30 font-mono truncate max-w-[200px]">
                {cert.instance_id}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Issued"
            value={
              cert.issued_at
                ? new Date(cert.issued_at).toLocaleDateString()
                : "—"
            }
          />
          <Metric
            label="Expires"
            value={
              cert.expires_at
                ? new Date(cert.expires_at).toLocaleDateString()
                : "—"
            }
          />
        </div>

        {cert.lineage_hash && (
          <div>
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
              Lineage Hash
            </div>
            <div className="text-[11px] text-white/30 font-mono break-all">
              {cert.lineage_hash}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Morphogenesis View ─────────────────────────────────────────

const MATURITY_ORDER = ["embryonic", "growing", "mature", "atrophying", "vestigial"];

function maturityColor(maturity: string): string {
  switch (maturity) {
    case "embryonic":
      return "#818cf8";
    case "growing":
      return "#5eead4";
    case "mature":
      return "#fbbf24";
    case "atrophying":
      return "#f97316";
    case "vestigial":
      return "rgba(255,255,255,0.15)";
    default:
      return "rgba(255,255,255,0.3)";
  }
}

function categoryLabel(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function OrganCard({ organ }: { organ: OikosOrgan }) {
  const alloc = parseFloat(organ.resource_allocation_pct);
  const eff = parseFloat(organ.efficiency);
  const color = maturityColor(organ.maturity);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              organ.maturity === "embryonic" && "animate-pulse",
            )}
            style={{ background: color }}
          />
          <span className="text-sm text-white/70 font-medium">
            {categoryLabel(organ.category)}
          </span>
        </div>
        <Badge
          variant={
            organ.maturity === "mature"
              ? "success"
              : organ.maturity === "growing" || organ.maturity === "embryonic"
                ? "info"
                : organ.maturity === "atrophying"
                  ? "warning"
                  : "muted"
          }
        >
          {organ.maturity}
        </Badge>
      </div>

      {organ.specialisation && (
        <div className="text-[11px] text-white/30 truncate">
          {organ.specialisation}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/30">Allocation</span>
          <span className="text-white/50 tabular-nums">{alloc.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, alloc)}%`, background: color }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <span className="text-white/30">
          Eff <span className="text-white/50 tabular-nums">{eff.toFixed(2)}x</span>
        </span>
        <span className="text-white/30">
          Rev <span className="text-white/50 tabular-nums">{usd(organ.revenue_30d)}</span>
        </span>
        {organ.days_since_last_revenue > 0 && (
          <span className="text-white/20 tabular-nums">
            {organ.days_since_last_revenue}d idle
          </span>
        )}
      </div>
    </div>
  );
}

function MorphogenesisView({ data }: { data: OikosOrgansResponse }) {
  const sorted = [...(data.organs ?? [])].sort(
    (a, b) =>
      MATURITY_ORDER.indexOf(a.maturity) - MATURITY_ORDER.indexOf(b.maturity),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Morphogenesis</CardTitle>
        <span className="text-xs text-white/30">
          {data.active_count} active / {data.total_count} total
        </span>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((o) => (
              <OrganCard key={o.organ_id} organ={o} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">
              No economic organs yet. The organism has not begun morphogenesis.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Asset / Fleet Panel ────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "live":
      return "#5eead4";
    case "building":
    case "deploying":
      return "#818cf8";
    case "declining":
      return "#f59e0b";
    case "terminated":
    case "dead":
      return "#ef4444";
    case "candidate":
      return "rgba(255,255,255,0.3)";
    default:
      return "rgba(255,255,255,0.4)";
  }
}

function AssetRow({ asset }: { asset: OikosOwnedAsset }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-3">
        <div className="text-sm text-white/70">{asset.name || asset.asset_id.slice(0, 8)}</div>
        <div className="text-[10px] text-white/25">{asset.asset_type}</div>
      </td>
      <td className="py-2 pr-3">
        <Badge
          variant={
            asset.status === "live"
              ? "success"
              : asset.status === "building" || asset.status === "deploying"
                ? "info"
                : asset.status === "declining"
                  ? "warning"
                  : "muted"
          }
        >
          {asset.status}
        </Badge>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/60">
        {usd(asset.monthly_revenue_usd)}
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/40">
        {asset.break_even_reached ? (
          <span className="text-emerald-400">BE</span>
        ) : (
          `${asset.projected_break_even_days}d`
        )}
      </td>
      <td className="py-2 text-right text-sm tabular-nums text-white/40">
        {asset.days_since_deployment}d
      </td>
    </tr>
  );
}

function ChildRow({ child }: { child: OikosChildInstance }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-3">
        <div className="text-sm text-white/70">{child.niche || child.instance_id.slice(0, 8)}</div>
        <div className="text-[10px] text-white/25 font-mono truncate max-w-[120px]">
          {child.instance_id.slice(0, 12)}...
        </div>
      </td>
      <td className="py-2 pr-3">
        <Badge
          variant={
            child.status === "alive" || child.status === "independent"
              ? "success"
              : child.status === "struggling" || child.status === "rescued"
                ? "warning"
                : child.status === "dead"
                  ? "danger"
                  : "muted"
          }
        >
          {child.status}
        </Badge>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/60">
        {usd(child.current_net_worth_usd)}
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/40">
        {days(child.current_runway_days)}
      </td>
      <td className="py-2 text-right text-sm tabular-nums text-white/40">
        {usd(child.total_dividends_paid_usd)}
      </td>
    </tr>
  );
}

function AssetPanel({ data }: { data: OikosAssetsResponse }) {
  const hasAssets = data.owned_assets.length > 0;
  const hasChildren = data.child_instances.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets & Fleet</CardTitle>
        <span className="text-xs text-white/30">
          {data.owned_assets.length} assets / {data.child_instances.length} children
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAssets ? (
          <div className="overflow-x-auto">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
              Autonomous Assets
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">Rev/mo</th>
                  <th className="text-right pb-2 font-medium">B/E</th>
                  <th className="text-right pb-2 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                {data.owned_assets.map((a) => (
                  <AssetRow key={a.asset_id} asset={a} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-xs text-white/25">
              No autonomous assets deployed yet.
            </div>
          </div>
        )}

        {hasChildren ? (
          <div className="overflow-x-auto">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2 pt-2 border-t border-white/[0.06]">
              Child Fleet
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Niche</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">Net Worth</th>
                  <th className="text-right pb-2 font-medium">Runway</th>
                  <th className="text-right pb-2 font-medium">Dividends</th>
                </tr>
              </thead>
              <tbody>
                {data.child_instances.map((c) => (
                  <ChildRow key={c.instance_id} child={c} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !hasAssets && null
        )}

        {!hasAssets && !hasChildren && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">
              No assets or children. The organism has not yet begun entrepreneurship.
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-3">
          <Metric label="Total Asset Value" value={usd(data.total_asset_value)} />
          <Metric label="Total Fleet Equity" value={usd(data.total_fleet_equity)} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bounties Panel ─────────────────────────────────────────────

function bountyStatusVariant(status: string): "success" | "info" | "warning" | "danger" | "muted" {
  switch (status) {
    case "paid": return "success";
    case "in_progress": return "info";
    case "available": return "warning";
    case "failed": return "danger";
    default: return "muted";
  }
}

function BountyRow({ bounty }: { bounty: OikosBounty }) {
  const net = parseFloat(bounty.net_reward_usd);
  const netColor = net > 0 ? "#5eead4" : "#ef4444";
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-3">
        <div className="text-sm text-white/70 truncate max-w-[200px]">
          {bounty.title || bounty.bounty_id.slice(0, 12)}
        </div>
        <div className="text-[10px] text-white/25">{bounty.platform}</div>
      </td>
      <td className="py-2 pr-3">
        <Badge variant={bountyStatusVariant(bounty.status)}>{bounty.status}</Badge>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/60">
        {usd(bounty.reward_usd)}
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums" style={{ color: netColor }}>
        {usd(bounty.net_reward_usd)}
      </td>
      <td className="py-2 text-right text-[11px] text-white/30">
        {bounty.deadline ? relativeTime(bounty.deadline) : "—"}
      </td>
    </tr>
  );
}

function BountiesPanel({ data }: { data: OikosBountiesResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bounty Pipeline</CardTitle>
        <span className="text-xs text-white/30">
          {data.total_count} active · {usd(data.total_receivables_usd)} receivable
        </span>
      </CardHeader>
      <CardContent>
        {data.bounties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Bounty</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">Reward</th>
                  <th className="text-right pb-2 font-medium">Net</th>
                  <th className="text-right pb-2 font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {data.bounties.map((b) => (
                  <BountyRow key={b.bounty_id} bounty={b} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">No active bounties.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Revenue Streams Panel ──────────────────────────────────────

function RevenueStreamsPanel({ data }: { data: OikosRevenueStreamsResponse }) {
  const streams = Object.entries(data.revenue_by_source).filter(([, v]) => parseFloat(v) > 0);
  const total30d = parseFloat(data.revenue_30d);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Streams</CardTitle>
        <span className="text-xs text-white/30">30d attribution</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 24h / 7d / 30d income statement */}
        <div className="grid grid-cols-3 gap-4">
          {(["24h", "7d", "30d"] as const).map((period) => {
            const rev = parseFloat(data[`revenue_${period}` as keyof OikosRevenueStreamsResponse] as string);
            const cost = parseFloat(data[`costs_${period}` as keyof OikosRevenueStreamsResponse] as string);
            const net = parseFloat(data[`net_income_${period}` as keyof OikosRevenueStreamsResponse] as string);
            const netColor = net >= 0 ? "#5eead4" : "#ef4444";
            return (
              <div key={period} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                <div className="text-[10px] text-white/20 uppercase tracking-widest">{period}</div>
                <div className="text-[11px] text-white/40">Rev <span className="text-white/60 tabular-nums">{usd(rev)}</span></div>
                <div className="text-[11px] text-white/40">Cost <span className="text-white/50 tabular-nums">{usd(cost)}</span></div>
                <div className="text-[11px] text-white/40">Net <span className="tabular-nums font-semibold" style={{ color: netColor }}>{usd(net)}</span></div>
              </div>
            );
          })}
        </div>

        {/* Stream breakdown bars */}
        {streams.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">By Source (30d)</div>
            {streams
              .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a))
              .map(([stream, amount]) => {
                const pctVal = total30d > 0 ? (parseFloat(amount) / total30d) * 100 : 0;
                return (
                  <div key={stream} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/40 capitalize">{stream.replace(/_/g, " ")}</span>
                      <span className="text-white/60 tabular-nums">{usd(amount)}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, pctVal)}%`, background: "#5eead4" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* BMR breakdown */}
        {Object.keys(data.bmr_breakdown).length > 0 && (
          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">BMR by System</div>
            {Object.entries(data.bmr_breakdown)
              .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a))
              .map(([system, cost]) => (
                <div key={system} className="flex items-center justify-between text-[11px]">
                  <span className="text-white/30 capitalize">{system.replace(/_/g, " ")}</span>
                  <span className="text-white/50 tabular-nums">{usd(cost)}/d</span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Fleet Ecology Panel ────────────────────────────────────────

function roleColor(role: string): string {
  switch (role) {
    case "bounty_hunter": return "#818cf8";
    case "knowledge_broker": return "#5eead4";
    case "research_mutator": return "#f59e0b";
    default: return "rgba(255,255,255,0.4)";
  }
}

function verdictVariant(verdict: string): "success" | "warning" | "danger" | "muted" {
  switch (verdict) {
    case "fit": return "success";
    case "underperforming": return "warning";
    case "blacklisted": return "danger";
    default: return "muted";
  }
}

function FleetMemberRow({ member }: { member: OikosFleetMember }) {
  const ratio = parseFloat(member.economic_ratio);
  const ratioColor = ratio >= 1.3 ? "#5eead4" : ratio >= 1.0 ? "#fbbf24" : "#ef4444";
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-3">
        <div className="text-sm text-white/70 truncate max-w-[160px]">{member.niche || member.instance_id.slice(0, 10)}</div>
        <div className="text-[10px] font-mono text-white/20">{member.instance_id.slice(0, 10)}</div>
      </td>
      <td className="py-2 pr-3">
        <Badge
          variant={
            member.status === "alive" || member.status === "independent" ? "success"
              : member.status === "struggling" || member.status === "rescued" ? "warning"
                : member.status === "dead" ? "danger" : "muted"
          }
        >
          {member.status}
        </Badge>
      </td>
      <td className="py-2 pr-2">
        <span className="text-[11px]" style={{ color: roleColor(member.role) }}>
          {member.role.replace(/_/g, " ")}
        </span>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums" style={{ color: ratioColor }}>
        {ratio.toFixed(2)}x
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-white/50">
        {usd(member.net_worth_usd)}
      </td>
      <td className="py-2 text-right text-sm tabular-nums text-white/30">
        {days(member.runway_days)}
      </td>
    </tr>
  );
}

function FleetEcologyPanel({ data }: { data: OikosFleetResponse }) {
  const m = data.metrics;
  const total = m.total_children;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Ecology</CardTitle>
        <span className="text-xs text-white/30">
          {m.alive_count} alive / {total} total
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregate metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Net Worth" value={usd(m.total_fleet_net_worth)} />
          <Metric label="Dividends" value={usd(m.total_dividends_received)} />
          <Metric label="Avg Ratio" value={`${parseFloat(m.avg_economic_ratio).toFixed(2)}x`} />
          <Metric label="Avg Runway" value={days(m.avg_runway_days)} />
        </div>

        {/* Status distribution */}
        {total > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Alive", count: m.alive_count, color: "#5eead4" },
              { label: "Struggling", count: m.struggling_count, color: "#fbbf24" },
              { label: "Independent", count: m.independent_count, color: "#818cf8" },
              { label: "Dead", count: m.dead_count, color: "#ef4444" },
              { label: "Blacklisted", count: m.blacklisted_count, color: "rgba(255,255,255,0.2)" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded border border-white/[0.05] bg-white/[0.02] p-2 text-center">
                <div className="text-base font-semibold tabular-nums" style={{ color }}>{count}</div>
                <div className="text-[10px] text-white/25">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Role distribution */}
        {Object.keys(m.role_distribution).length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">Role Distribution</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(m.role_distribution).map(([role, count]) => (
                <div key={role} className="flex items-center gap-1.5 rounded border border-white/[0.05] px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: roleColor(role) }} />
                  <span className="text-[11px] text-white/50 capitalize">{role.replace(/_/g, " ")}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: roleColor(role) }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members table */}
        {data.members.length > 0 && (
          <div className="overflow-x-auto border-t border-white/[0.06] pt-3">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Niche</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Role</th>
                  <th className="text-right pb-2 font-medium">Ratio</th>
                  <th className="text-right pb-2 font-medium">Net Worth</th>
                  <th className="text-right pb-2 font-medium">Runway</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <FleetMemberRow key={m.instance_id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent selections */}
        {data.recent_selections.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Selection Pressure</div>
            {data.recent_selections.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <Badge variant={verdictVariant(s.verdict)}>{s.verdict}</Badge>
                <span className="text-white/30 truncate flex-1">{s.reason || s.child_instance_id.slice(0, 12)}</span>
                <span className="text-white/20 tabular-nums">{relativeTime(s.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        {total === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">No child instances. Fleet has not yet formed.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Knowledge Market Panel ─────────────────────────────────────

function CapacityBar({ label, pct: pctVal, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/30">{label}</span>
        <span className="text-white/50 tabular-nums">{pctVal.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pctVal)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function KnowledgeMarketPanel({ data }: { data: OikosKnowledgeMarketResponse }) {
  const subCap = parseFloat(data.subscription_capacity_pct) * 100;
  const derivCap = parseFloat(data.derivatives_capacity_pct) * 100;
  const combinedCap = parseFloat(data.combined_capacity_pct) * 100;
  const isNearCapacity = combinedCap >= 70;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Market</CardTitle>
        {isNearCapacity && (
          <Badge variant="warning" pulse>near capacity</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capacity bars */}
        <div className="space-y-2">
          <div className="text-[10px] text-white/20 uppercase tracking-widest">Capacity Utilization</div>
          <CapacityBar label="Subscriptions" pct={subCap} color="#818cf8" />
          <CapacityBar label="Derivatives/Futures" pct={derivCap} color="#5eead4" />
          <CapacityBar label="Combined (80% limit)" pct={combinedCap} color={combinedCap >= 80 ? "#ef4444" : "#fbbf24"} />
        </div>

        <div className="flex items-center justify-between text-[11px] border-t border-white/[0.06] pt-3">
          <span className="text-white/30">Derivative Liabilities</span>
          <span className="text-white/60 tabular-nums">{usd(data.derivative_liabilities_usd)}</span>
        </div>

        {/* Active subscriptions */}
        {data.subscriptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">
              Active Subscriptions ({data.subscriptions.length})
            </div>
            {data.subscriptions.map((s) => (
              <div key={s.token_id} className="rounded border border-white/[0.05] bg-white/[0.02] p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50 font-mono truncate max-w-[160px]">{s.owner_id || s.token_id.slice(0, 12)}</span>
                  <span className="text-white/40 tabular-nums">{usd(s.mint_price_usd)}/mo</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-white/25">
                    <span>Usage</span>
                    <span>{s.requests_used_this_period} / {s.requests_per_month} req</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, s.utilisation * 100)}%`, background: "#818cf8" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active futures */}
        {data.active_futures.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">
              Active Futures ({data.active_futures.length})
            </div>
            {data.active_futures.map((f) => (
              <div key={f.contract_id} className="rounded border border-white/[0.05] bg-white/[0.02] p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50 truncate max-w-[160px]">{f.buyer_name || f.buyer_id}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{((parseFloat(f.discount_rate) || 0.16) * 100).toFixed(0)}% off</Badge>
                    <span className="text-white/50 tabular-nums">{usd(f.contract_price_usd)}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-white/25">
                    <span>Delivery</span>
                    <span>{f.requests_delivered} / {f.requests_committed} req ({(f.delivery_pct * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, f.delivery_pct * 100)}%`, background: "#5eead4" }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-white/20">
                  Collateral: {usd(f.collateral_usd)} · Expires: {f.delivery_end ? new Date(f.delivery_end).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent sales */}
        {data.recent_sales.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3 space-y-1">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Recent Sales</div>
            {data.recent_sales.slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-white/40 capitalize truncate flex-1">{s.product_type.replace(/_/g, " ")}</span>
                <span className="text-white/30">{s.buyer_id.slice(0, 8)}</span>
                <span className="text-emerald-400 tabular-nums">{usd(s.price_usd)}</span>
                <span className="text-white/20">{relativeTime(s.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        {data.subscriptions.length === 0 && data.active_futures.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">No active subscriptions or futures contracts.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dream Analysis Panel ────────────────────────────────────────

function scenarioColor(scenario: string): string {
  if (scenario.includes("storm") || scenario.includes("critical")) return "#ef4444";
  if (scenario.includes("exploit") || scenario.includes("attack")) return "#f97316";
  if (scenario.includes("drought") || scenario.includes("collapse")) return "#fbbf24";
  return "#818cf8";
}

function StressTestRow({ test }: { test: OikosStressTest }) {
  const color = scenarioColor(test.scenario);
  const ruin = (test.stats.ruin_probability * 100).toFixed(1);
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: test.survives ? "#5eead4" : color }} />
      <span className="text-white/40 capitalize flex-1">{test.scenario.replace(/_/g, " ")}</span>
      <span className="text-white/30 tabular-nums">ruin {ruin}%</span>
      <Badge variant={test.survives ? "success" : "danger"}>
        {test.survives ? "survives" : "fails"}
      </Badge>
    </div>
  );
}

function DreamPanel({ data }: { data: OikosDreamResponse }) {
  if (!data.has_result || !data.dream) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Economic Dreaming</CardTitle>
          <Badge variant="muted">no data</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="text-2xl opacity-20 mb-2">~</div>
            <div className="text-xs text-white/25">
              No dream results yet. Monte Carlo simulation runs during sleep consolidation.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dream = data.dream;
  const resilienceColor =
    dream.resilience_score >= 0.7 ? "#5eead4"
      : dream.resilience_score >= 0.4 ? "#fbbf24"
        : "#ef4444";
  const ruinPct = (dream.ruin_probability * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Economic Dreaming</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={dream.ruin_probability < 0.01 ? "success" : dream.ruin_probability < 0.1 ? "warning" : "danger"}>
            ruin {ruinPct}%
          </Badge>
          <span className="text-xs text-white/30">
            {dream.total_paths_simulated.toLocaleString()} paths · {relativeTime(dream.timestamp)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resilience score */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-white/[0.05] bg-white/[0.02] p-3 text-center">
            <div className="text-xl font-semibold tabular-nums" style={{ color: resilienceColor }}>
              {(dream.resilience_score * 100).toFixed(0)}
            </div>
            <div className="text-[10px] text-white/25">Resilience Score</div>
          </div>
          <div className="rounded border border-white/[0.05] bg-white/[0.02] p-3 text-center">
            <div className="text-xl font-semibold tabular-nums text-white/70">
              {(dream.survival_probability_30d * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-white/25">30d Survival</div>
          </div>
          <div className="rounded border border-white/[0.05] bg-white/[0.02] p-3 text-center">
            <div className="text-xl font-semibold tabular-nums" style={{ color: resilienceColor }}>
              {usd(dream.baseline.median_net_worth)}
            </div>
            <div className="text-[10px] text-white/25">Median NW (base)</div>
          </div>
        </div>

        {/* Baseline stats */}
        <div className="rounded border border-white/[0.05] bg-white/[0.02] p-3 space-y-2">
          <div className="text-[10px] text-white/20 uppercase tracking-widest">Baseline Simulation</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <span className="text-white/30">P5 <span className="text-white/50 tabular-nums">{usd(dream.baseline.p5_net_worth)}</span></span>
            <span className="text-white/30">Median <span className="text-white/50 tabular-nums">{usd(dream.baseline.median_net_worth)}</span></span>
            <span className="text-white/30">P95 <span className="text-white/50 tabular-nums">{usd(dream.baseline.p95_net_worth)}</span></span>
            <span className="text-white/30">Drawdown <span className="text-white/50 tabular-nums">{(dream.baseline.max_drawdown_median * 100).toFixed(1)}%</span></span>
          </div>
        </div>

        {/* Stress tests */}
        <div className="space-y-2">
          <div className="text-[10px] text-white/20 uppercase tracking-widest">Stress Scenarios</div>
          <div className="space-y-1.5">
            {dream.stress_tests.map((t) => (
              <StressTestRow key={t.scenario} test={t} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {dream.recommendations.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">Recommendations</div>
            {dream.recommendations.map((r, i) => (
              <div key={i} className="rounded border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">P{r.priority}</Badge>
                  <span className="text-sm text-amber-300/80 font-medium">{r.action}</span>
                </div>
                <div className="text-[11px] text-white/40">{r.description}</div>
                {r.parameter_path && (
                  <div className="text-[10px] text-white/25 font-mono">
                    {r.parameter_path}: {r.current_value} → {r.recommended_value}
                  </div>
                )}
                <div className="text-[10px] text-white/30">
                  Ruin: {(r.ruin_probability_before * 100).toFixed(1)}% → {(r.ruin_probability_after * 100).toFixed(1)}%
                  · Confidence: {(r.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tollbooths Panel ────────────────────────────────────────────

function TollboothsPanel({
  data,
  onRefetch,
}: {
  data: OikosTollboothsResponse;
  onRefetch: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Tollbooth Contracts
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              total {usd(data.total_accumulated_usdc)} USDC
            </span>
            <Badge variant="muted">{data.total_count} deployed</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {data.tollbooths.length === 0 ? (
          <div className="py-6 text-center text-white/20 text-sm">
            No tollbooth contracts deployed
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.tollbooths.map((tb: OikosTollbooth) => (
              <div key={tb.asset_id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">{tb.asset_name}</span>
                  <Badge variant="success">{usd(tb.accumulated_revenue_usdc)} accrued</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span className="font-mono">{tb.contract_address.slice(0, 10)}…{tb.contract_address.slice(-6)}</span>
                  <span>{usd(tb.price_per_call_usdc)} / call</span>
                </div>
                <div className="text-[10px] text-white/20 uppercase tracking-wider">
                  {tb.chain} · {tb.deployed_at ? relativeTime(tb.deployed_at) : "not deployed"}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Threat Model Panel ───────────────────────────────────────────

function ThreatModelPanel({ data }: { data: OikosThreatModelResponse }) {
  if (!data.has_result || !data.threat_model) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-white/20 text-sm">
          No threat model available — runs during consolidation sleep
        </CardContent>
      </Card>
    );
  }

  const tm = data.threat_model;
  const pr = tm.portfolio_risk;
  const liquidProb = parseFloat(pr.liquidation_probability);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Treasury Threat Model
          </CardTitle>
          <Badge variant={liquidProb > 0.1 ? "danger" : liquidProb > 0.03 ? "warning" : "success"}>
            {pct(pr.liquidation_probability)} liq risk
          </Badge>
        </div>
        <div className="text-[10px] text-white/20 mt-1">
          {tm.total_paths_simulated.toLocaleString()} paths · {tm.horizon_days}d horizon · {relativeTime(tm.timestamp)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portfolio tail risk */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "VaR 5%", value: usd(pr.var_5pct) },
            { label: "CVaR 5%", value: usd(pr.cvar_5pct) },
            { label: "Max DD p95", value: pct(pr.max_drawdown_p95) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md bg-white/[0.03] p-2 text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{label}</div>
              <div className="text-sm font-semibold text-red-400/80 mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        {/* Critical exposures */}
        {tm.critical_exposures.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Critical Exposures</div>
            <div className="divide-y divide-white/5">
              {tm.critical_exposures.slice(0, 4).map((e: OikosCriticalExposure) => (
                <div key={e.position_id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white/70 font-medium">#{e.risk_rank} {e.symbol}</span>
                    <div className="text-[10px] text-white/30 mt-0.5 max-w-[200px] truncate">{e.rationale}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-red-400/70">{usd(e.exposure_usd)}</div>
                    <div className="text-[10px] text-white/30">{pct(e.contribution_to_portfolio_var)} of VaR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hedging proposals */}
        {tm.hedging_proposals.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Hedging Proposals</div>
            <div className="space-y-1.5">
              {tm.hedging_proposals.slice(0, 3).map((h: OikosHedgingProposal) => (
                <div
                  key={h.id}
                  className="rounded-md border border-amber-500/10 bg-amber-500/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400/80 font-medium">{h.target_symbol} — {h.hedge_action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-white/40">{usd(h.hedge_size_usd)}</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5 truncate">{h.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tm.contagion_events_detected > 0 && (
          <div className="text-xs text-white/30">
            Contagion: {tm.contagion_events_detected} cascade events · {parseFloat(tm.contagion_loss_amplifier).toFixed(2)}× loss amplifier
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Revenue History Panel ────────────────────────────────────────

function RevenueHistoryPanel({ data }: { data: OikosHistoryResponse }) {
  if (data.snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-white/20 text-sm">
          No historical snapshots yet — data accumulates every 5 minutes
        </CardContent>
      </Card>
    );
  }

  // Compute net worth range for sparkline scaling
  const netWorths = data.snapshots.map((s: OikosSnapshot) => parseFloat(s.net_worth_usd));
  const minNW = Math.min(...netWorths);
  const maxNW = Math.max(...netWorths);
  const rangeNW = maxNW - minNW || 1;

  const burnRates = data.snapshots.map((s: OikosSnapshot) => parseFloat(s.burn_rate_usd_per_day));
  const maxBurn = Math.max(...burnRates) || 1;

  const H = 60;
  const W = 400;
  const pts = (values: number[], max: number, min = 0) =>
    values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / (max - min || 1)) * H;
        return `${x},${y}`;
      })
      .join(" ");

  const latest = data.snapshots[data.snapshots.length - 1];
  const earliest = data.snapshots[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Economic History
          </CardTitle>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">
            last {data.days}d · {data.count} snapshots
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net worth sparkline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider">
            <span>Net Worth</span>
            <span>{usd(latest.net_worth_usd)} now · {usd(earliest.net_worth_usd)} {days(data.days)}ago</span>
          </div>
          <div className="rounded-md bg-white/[0.02] overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
              <defs>
                <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(20,184,166,0.3)" />
                  <stop offset="100%" stopColor="rgba(20,184,166,0)" />
                </linearGradient>
              </defs>
              <polyline
                points={pts(netWorths, maxNW, minNW)}
                fill="none"
                stroke="rgba(20,184,166,0.7)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>

        {/* Burn rate sparkline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider">
            <span>Daily Burn Rate</span>
            <span>{usd(latest.burn_rate_usd_per_day)} / day</span>
          </div>
          <div className="rounded-md bg-white/[0.02] overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
              <polyline
                points={pts(burnRates, maxBurn)}
                fill="none"
                stroke="rgba(249,115,22,0.6)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { label: "Runway", value: days(latest.runway_days) },
            { label: "Rev 24h", value: usd(latest.revenue_24h) },
            { label: "Costs 24h", value: usd(latest.costs_24h) },
            { label: "Net 24h", value: usd(latest.net_income_24h) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md bg-white/[0.03] p-2 text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{label}</div>
              <div className="text-xs font-semibold text-white/70 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Control Actions Panel ────────────────────────────────────────

function ControlActionsPanel({
  assets,
  children,
  organs,
  onRefetch,
}: {
  assets: OikosOwnedAsset[];
  children: OikosChildInstance[];
  organs: OikosOrgan[];
  onRefetch: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  async function doAction(id: string, action: () => Promise<{ status: string; message?: string }>) {
    setPending(id);
    setFeedback(null);
    try {
      const res = await action();
      setFeedback({ id, ok: res.status === "ok", msg: res.message ?? (res.status === "ok" ? "Done" : "Error") });
      if (res.status === "ok") onRefetch();
    } catch (e) {
      setFeedback({ id, ok: false, msg: String(e) });
    } finally {
      setPending(null);
    }
  }

  const strugglingChildren = children.filter((c) => c.status === "struggling");
  const liveAssets = assets.filter((a) => a.status === "live" || a.status === "building");
  const activeOrgans = organs.filter((o) => o.is_active);

  if (liveAssets.length === 0 && strugglingChildren.length === 0 && activeOrgans.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          Control Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={cn(
              "rounded-md px-3 py-2 text-xs",
              feedback.ok
                ? "border border-teal-500/20 bg-teal-500/10 text-teal-400"
                : "border border-red-500/20 bg-red-500/10 text-red-400",
            )}
          >
            {feedback.msg}
          </div>
        )}

        {/* Struggling children — rescue buttons */}
        {strugglingChildren.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Struggling Children</div>
            <div className="divide-y divide-white/5">
              {strugglingChildren.map((c) => {
                const id = `rescue-${c.instance_id}`;
                const rescueCount = parseInt(c.current_runway_days) < 2 ? 2 : 0;
                return (
                  <div key={c.instance_id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/70">{c.niche || c.instance_id.slice(0, 12)}</div>
                      <div className="text-[10px] text-white/30">
                        runway {days(c.current_runway_days)} · {usd(c.current_net_worth_usd)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending === id}
                      onClick={() => doAction(id, () => api.rescueChild(c.instance_id))}
                      className="px-3 py-1.5 rounded text-xs font-medium border border-teal-500/30 text-teal-400 hover:border-teal-400 hover:text-teal-300 disabled:opacity-40 transition-colors"
                    >
                      {pending === id ? "Rescuing..." : "Rescue"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live assets — terminate buttons */}
        {liveAssets.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Assets</div>
            <div className="divide-y divide-white/5">
              {liveAssets.map((a) => {
                const id = `terminate-${a.asset_id}`;
                return (
                  <div key={a.asset_id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/70">{a.name}</div>
                      <div className="text-[10px] text-white/30">
                        {usd(a.monthly_revenue_usd)}/mo · {a.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending === id}
                      onClick={() => doAction(id, () => api.terminateAsset(a.asset_id))}
                      className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/20 text-red-400/70 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 transition-colors"
                    >
                      {pending === id ? "Terminating..." : "Terminate"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active organs — pause/resume buttons */}
        {activeOrgans.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Organs</div>
            <div className="divide-y divide-white/5">
              {activeOrgans.slice(0, 6).map((o) => {
                const id = `organ-${o.organ_id}`;
                return (
                  <div key={o.organ_id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/70 capitalize">{o.specialisation || o.category}</div>
                      <div className="text-[10px] text-white/30">
                        {pct(o.resource_allocation_pct)} alloc · {usd(o.revenue_30d)} 30d
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending === id}
                      onClick={() => doAction(id, () => api.pauseOrgan(o.organ_id))}
                      className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 disabled:opacity-40 transition-colors"
                    >
                      {pending === id ? "..." : o.is_active ? "Pause" : "Resume"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Genesis Spark ──────────────────────────────────────────────

function GenesisSparkButton({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [state, setState] = useState<"idle" | "igniting" | "done" | "error">("idle");
  const [result, setResult] = useState<GenesisSparkResponse | null>(null);

  const ignite = useCallback(async () => {
    setState("igniting");
    try {
      const res = await api.triggerGenesisSpark();
      setResult(res);
      setState(res.status === "ok" ? "done" : "error");
      if (res.status === "ok") onComplete();
    } catch (err) {
      setResult({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
        phases: {},
      });
      setState("error");
    }
  }, [onComplete]);

  if (state === "done" && result) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <div className="text-3xl">&#x2727;</div>
          <div className="text-lg font-semibold text-emerald-400">
            Organism Awakened
          </div>
          <div className="text-xs text-white/40">{result.message}</div>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(result.phases).map(([phase, ok]) => (
              <Badge key={phase} variant={ok ? "success" : "danger"}>
                {phase.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-10 flex flex-col items-center text-center space-y-5">
        <div className="space-y-2">
          <div className="text-[10px] text-white/20 uppercase tracking-[0.3em]">
            Metabolic substrate cold — no revenue channels active
          </div>
          <div className="text-lg text-white/50 font-medium">
            The organism has not yet begun to live.
          </div>
        </div>

        <button
          type="button"
          onClick={ignite}
          disabled={state === "igniting"}
          className={cn(
            "relative px-8 py-3 rounded-lg font-semibold text-sm tracking-wide",
            "border transition-all duration-300",
            state === "igniting"
              ? "border-amber-500/30 text-amber-400/70 cursor-wait"
              : "border-red-500/40 text-red-400 hover:border-red-400 hover:text-red-300 hover:shadow-[0_0_24px_rgba(239,68,68,0.15)]",
          )}
        >
          {state === "igniting" ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              Igniting metabolism...
            </span>
          ) : (
            "AWAKEN ORGANISM"
          )}
        </button>

        {state === "error" && result && (
          <div className="text-xs text-red-400/70">{result.message}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function OikosPage() {
  const status = useApi<OikosStatusResponse>(api.oikosStatus, { intervalMs: 3000 });
  const organs = useApi<OikosOrgansResponse>(api.oikosOrgans, { intervalMs: 5000 });
  const assets = useApi<OikosAssetsResponse>(api.oikosAssets, { intervalMs: 5000 });
  const bounties = useApi<OikosBountiesResponse>(api.oikosBounties, { intervalMs: 8000 });
  const revenueStreams = useApi<OikosRevenueStreamsResponse>(api.oikosRevenueStreams, { intervalMs: 8000 });
  const fleet = useApi<OikosFleetResponse>(api.oikosFleet, { intervalMs: 10000 });
  const knowledgeMarket = useApi<OikosKnowledgeMarketResponse>(api.oikosKnowledgeMarket, { intervalMs: 10000 });
  const dream = useApi<OikosDreamResponse>(api.oikosDream, { intervalMs: 30000 });
  const tollbooths = useApi<OikosTollboothsResponse>(api.oikosTollbooths, { intervalMs: 15000 });
  const threatModel = useApi<OikosThreatModelResponse>(api.oikosThreatModel, { intervalMs: 60000 });
  const history = useApi<OikosHistoryResponse>(() => api.oikosHistory(7), { intervalMs: 60000 });

  const statusRefetchRef = useRef(status.refetch);
  const organsRefetchRef = useRef(organs.refetch);
  const assetsRefetchRef = useRef(assets.refetch);
  statusRefetchRef.current = status.refetch;
  organsRefetchRef.current = organs.refetch;
  assetsRefetchRef.current = assets.refetch;

  const refetchAll = useCallback(() => {
    statusRefetchRef.current();
    organsRefetchRef.current();
    assetsRefetchRef.current();
  }, []);

  const isDormant =
    status.data != null &&
    parseFloat(status.data.total_net_worth) === 0;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Oikos"
        description="Economic engine — the organism's metabolic truth"
      >
        {status.data && (
          <div className="flex items-center gap-2">
            <Badge
              variant={status.data.is_metabolically_positive ? "success" : "danger"}
              pulse
            >
              {status.data.is_metabolically_positive ? "net positive" : "net negative"}
            </Badge>
          </div>
        )}
      </PageHeader>

      {status.error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Failed to load Oikos status: {status.error}
        </div>
      )}

      <div className="space-y-4">
        {/* Genesis Spark — shown when organism is dormant */}
        {isDormant && <GenesisSparkButton onComplete={refetchAll} />}

        {/* Row 1: Metabolic HUD (full width) */}
        {status.data ? (
          <MetabolicHUD data={status.data} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-white/20 text-sm">
              Loading economic state...
            </CardContent>
          </Card>
        )}

        {/* Row 2: Identity + Morphogenesis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            {status.data ? (
              <IdentityCard data={status.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading certificate...
                </CardContent>
              </Card>
            )}
          </div>
          <div className="lg:col-span-2">
            {organs.data ? (
              <MorphogenesisView data={organs.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading organs...
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Row 3: Revenue Streams + Bounties */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {revenueStreams.data ? (
              <RevenueStreamsPanel data={revenueStreams.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading revenue streams...
                </CardContent>
              </Card>
            )}
          </div>
          <div>
            {bounties.data ? (
              <BountiesPanel data={bounties.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading bounties...
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Row 4: Assets & Fleet (full width) */}
        {assets.data ? (
          <AssetPanel data={assets.data} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading assets...
            </CardContent>
          </Card>
        )}

        {/* Row 5: Fleet Ecology + Knowledge Market */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {fleet.data ? (
              <FleetEcologyPanel data={fleet.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading fleet ecology...
                </CardContent>
              </Card>
            )}
          </div>
          <div>
            {knowledgeMarket.data ? (
              <KnowledgeMarketPanel data={knowledgeMarket.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading knowledge market...
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Row 6: Dream Analysis (full width) */}
        {dream.data ? (
          <DreamPanel data={dream.data} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading dream analysis...
            </CardContent>
          </Card>
        )}

        {/* Row 7: Revenue History Chart (full width) */}
        {history.data ? (
          <RevenueHistoryPanel data={history.data} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading revenue history...
            </CardContent>
          </Card>
        )}

        {/* Row 8: Tollbooths + Threat Model */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {tollbooths.data ? (
              <TollboothsPanel data={tollbooths.data} onRefetch={tollbooths.refetch} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading tollbooths...
                </CardContent>
              </Card>
            )}
          </div>
          <div>
            {threatModel.data ? (
              <ThreatModelPanel data={threatModel.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading threat model...
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Row 9: Control Actions */}
        {assets.data && (
          <ControlActionsPanel
            assets={assets.data.owned_assets}
            children={assets.data.child_instances}
            organs={organs.data?.organs ?? []}
            onRefetch={() => {
              assets.refetch();
              organs.refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
