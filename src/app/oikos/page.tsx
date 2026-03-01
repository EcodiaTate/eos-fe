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
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// ─── Helpers ────────────────────────────────────────────────────

function usd(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "$0.00";
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}

function pct(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function days(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "0d";
  if (n >= 365) return `${(n / 365).toFixed(1)}y`;
  return `${n.toFixed(0)}d`;
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
  const certColor =
    cert.status === "valid"
      ? remaining > 14
        ? "#5eead4"
        : "#fbbf24"
      : cert.status === "expiring_soon"
        ? "#f59e0b"
        : "#ef4444";

  const certVariant =
    cert.status === "valid"
      ? "success"
      : cert.status === "expiring_soon"
        ? "warning"
        : cert.status === "none"
          ? "muted"
          : "danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ecodian Certificate</CardTitle>
        <Badge variant={certVariant} pulse={cert.status === "expiring_soon"}>
          {cert.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown ring */}
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
                strokeWidth="3"
                strokeDasharray={`${Math.max(0, Math.min(100, (remaining / 30) * 100))} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: certColor }}
              >
                {remaining >= 0 ? `${remaining.toFixed(0)}d` : "N/A"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-white/70 font-medium">
              {cert.type === "official"
                ? "Official CA Certificate"
                : cert.type === "birth"
                  ? "Birth Certificate"
                  : cert.type === "genesis"
                    ? "Genesis Certificate"
                    : "No Certificate"}
            </div>
            {cert.instance_id && (
              <div className="text-[11px] text-white/30 font-mono truncate max-w-[200px]">
                {cert.instance_id}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
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
      return "#818cf8"; // Indigo
    case "growing":
      return "#5eead4"; // Teal
    case "mature":
      return "#fbbf24"; // Amber
    case "atrophying":
      return "#f97316"; // Orange
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
      {/* Header */}
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

      {/* Allocation bar */}
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

      {/* Metrics row */}
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
        {/* Owned Assets */}
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

        {/* Child Fleet */}
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

        {/* Totals */}
        <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-3">
          <Metric label="Total Asset Value" value={usd(data.total_asset_value)} />
          <Metric label="Total Fleet Equity" value={usd(data.total_fleet_equity)} />
        </div>
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
  const status = useApi<OikosStatusResponse>(api.oikosStatus, {
    intervalMs: 3000,
  });
  const organs = useApi<OikosOrgansResponse>(api.oikosOrgans, {
    intervalMs: 5000,
  });
  const assets = useApi<OikosAssetsResponse>(api.oikosAssets, {
    intervalMs: 5000,
  });

  // Use refs so refetchAll never captures stale function references.
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

  // Organism is dormant only when the backend confirms net worth is zero.
  // We do NOT require runway_days === 0 because a newly-seeded organism can
  // have $0 net worth but non-zero runway from an initial deposit — the
  // AWAKEN button would incorrectly show in that case. Checking net_worth
  // alone (and waiting for status.data to arrive) is the correct gate.
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

        {/* Row 3: Assets & Fleet (full width) */}
        {assets.data ? (
          <AssetPanel data={assets.data} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading assets...
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
