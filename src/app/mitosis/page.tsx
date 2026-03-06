"use client";

import { useCallback, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  MitosisStatusResponse,
  MitosisChildrenResponse,
  MitosisDividendsResponse,
  MitosisFleetResponse,
  MitosisConfigResponse,
  MitosisEvaluateResponse,
  MitosisChild,
  MitosisDividendRecord,
  MitosisSpawnResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// ─── Helpers ────────────────────────────────────────────────────

function usd(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "$0.00";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}k`;
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

function ratio(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "0.00x";
  return `${n.toFixed(2)}x`;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25">{label}</div>
      <div className="text-sm text-white/70 tabular-nums font-medium">{value}</div>
    </div>
  );
}

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
      <div className="text-[10px] text-white/25 uppercase tracking-widest">{label}</div>
      <div
        className="text-2xl font-semibold tabular-nums tracking-tight"
        style={{ color: color ?? "rgba(255,255,255,0.9)" }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-white/35 tabular-nums">{sub}</div>}
    </div>
  );
}

// ─── Status colors ──────────────────────────────────────────────

function childStatusColor(status: MitosisChild["status"]): string {
  switch (status) {
    case "alive":
    case "independent":
      return "#5eead4";
    case "spawning":
      return "#818cf8";
    case "struggling":
    case "rescued":
      return "#fbbf24";
    case "dead":
      return "#ef4444";
    default:
      return "rgba(255,255,255,0.3)";
  }
}

function childStatusVariant(
  status: MitosisChild["status"],
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (status) {
    case "alive":
    case "independent":
      return "success";
    case "spawning":
      return "info";
    case "struggling":
    case "rescued":
      return "warning";
    case "dead":
      return "danger";
    default:
      return "muted";
  }
}

// ─── Fitness Panel ───────────────────────────────────────────────

function FitnessPanel({ data }: { data: MitosisStatusResponse }) {
  const effVal = parseFloat(data.efficiency);
  const effColor =
    effVal >= 1.5 ? "#5eead4" : effVal >= 1.0 ? "#fbbf24" : "#ef4444";
  const runwayVal = parseFloat(data.runway_days);
  const runwayColor =
    runwayVal >= 180 ? "#5eead4" : runwayVal >= 60 ? "#fbbf24" : "#ef4444";

  return (
    <Card glow={data.fit}>
      <CardHeader>
        <CardTitle>Reproductive Fitness</CardTitle>
        <Badge variant={data.fit ? "success" : "danger"} pulse={data.fit}>
          {data.fit ? "fit to reproduce" : "not ready"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Big metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigMetric
            label="Net Worth"
            value={usd(data.net_worth)}
            color="#5eead4"
          />
          <BigMetric
            label="Runway"
            value={days(data.runway_days)}
            sub="Need 180d+"
            color={runwayColor}
          />
          <BigMetric
            label="Efficiency"
            value={ratio(data.efficiency)}
            sub="Need 1.5x+"
            color={effColor}
          />
          <BigMetric
            label="Children"
            value={`${data.active_children} / ${data.max_children}`}
            sub="Active slots"
          />
        </div>

        {/* Efficiency bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Metabolic Efficiency</span>
            <span className="tabular-nums" style={{ color: effColor }}>
              {ratio(data.efficiency)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (effVal / 2) * 100)}%`,
                background: "linear-gradient(90deg, #ef4444, #fbbf24, #5eead4)",
              }}
            />
          </div>
        </div>

        {/* Threshold strip */}
        <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Strategy" value={data.strategy_name} />
          <Metric label="Dividends Received" value={usd(data.total_dividends_received_usd)} />
          <Metric label="Dividend Records" value={String(data.dividend_history_count)} />
          <Metric label="Capacity Remaining" value={String(data.max_children - data.active_children)} />
        </div>

        {/* Rejection reasons */}
        {!data.fit && data.reasons.length > 0 && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 space-y-1">
            <div className="text-[10px] text-red-400/60 uppercase tracking-widest">
              Blocking conditions
            </div>
            {data.reasons.map((r, i) => (
              <div key={i} className="text-xs text-red-400/80">
                &bull; {r}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Fleet Summary ───────────────────────────────────────────────

function FleetSummary({ data }: { data: MitosisFleetResponse }) {
  if (!data.available || !data.metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet Metrics</CardTitle>
          <Badge variant="muted">unavailable</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-xs text-white/25">
            FleetManager not initialized or no children yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = data.metrics;
  const total = m.total_children || 1;

  const bars: { label: string; count: number; color: string }[] = [
    { label: "alive", count: m.alive_count, color: "#5eead4" },
    { label: "struggling", count: m.struggling_count, color: "#fbbf24" },
    { label: "independent", count: m.independent_count, color: "#818cf8" },
    { label: "dead", count: m.dead_count, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Metrics</CardTitle>
        <span className="text-xs text-white/30">{m.total_children} total</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Population bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex gap-0.5">
          {bars.map((b) =>
            b.count > 0 ? (
              <div
                key={b.label}
                className="h-full rounded-sm transition-all duration-700"
                style={{
                  width: `${(b.count / total) * 100}%`,
                  background: b.color,
                }}
                title={`${b.label}: ${b.count}`}
              />
            ) : null,
          )}
        </div>

        {/* Status counts */}
        <div className="grid grid-cols-4 gap-2">
          {bars.map((b) => (
            <div key={b.label} className="text-center">
              <div
                className="text-xl font-semibold tabular-nums"
                style={{ color: b.color }}
              >
                {b.count}
              </div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest">
                {b.label}
              </div>
            </div>
          ))}
        </div>

        {/* Economic summary */}
        <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Fleet Net Worth" value={usd(m.total_fleet_net_worth)} />
          <Metric label="Dividends Received" value={usd(m.total_dividends_received)} />
          <Metric label="Avg Efficiency" value={ratio(m.avg_economic_ratio)} />
          <Metric label="Avg Runway" value={days(m.avg_runway_days)} />
        </div>

        {/* Role distribution */}
        {Object.keys(m.role_distribution).length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
              Role Distribution
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(m.role_distribution).map(([role, count]) => (
                <div
                  key={role}
                  className="rounded-md px-2 py-1 text-[11px] border border-white/[0.08] bg-white/[0.03]"
                >
                  <span className="text-white/50">{role.replace(/_/g, " ")}</span>
                  <span className="ml-1 text-white/30">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Child Row ───────────────────────────────────────────────────

function ChildRow({
  child,
  onTerminate,
}: {
  child: MitosisChild;
  onTerminate: (id: string) => void;
}) {
  const color = childStatusColor(child.status);
  const indProgress = Math.min(100, (child.consecutive_positive_days / 90) * 100);

  return (
    <tr className="border-b border-white/[0.04] last:border-0 group">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <div
            className={cn("h-2 w-2 rounded-full flex-shrink-0", child.status === "alive" && "animate-pulse")}
            style={{ background: color }}
          />
          <div>
            <div className="text-sm text-white/70 font-medium">
              {child.niche || "unnamed niche"}
            </div>
            <div className="text-[10px] text-white/25 font-mono">
              {shortId(child.instance_id)}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <Badge variant={childStatusVariant(child.status)}>{child.status}</Badge>
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums">
        <div className="text-sm text-white/60">{usd(child.current_net_worth_usd)}</div>
        <div className="text-[10px] text-white/25">seed {usd(child.seed_capital_usd)}</div>
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums">
        <div className="text-sm text-white/60">{days(child.current_runway_days)}</div>
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums">
        <div className="text-sm text-white/50">{ratio(child.current_efficiency)}</div>
      </td>
      <td className="py-2.5 pr-3">
        {/* Independence progress: 90 consecutive positive days */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${indProgress}%`,
                background: child.is_independent ? "#818cf8" : "#5eead4",
              }}
            />
          </div>
          <span className="text-[10px] text-white/25 tabular-nums">
            {child.consecutive_positive_days}d
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums">
        <div className="text-sm text-white/40">{usd(child.total_dividends_paid_usd)}</div>
        <div className="text-[10px] text-white/20">{pct(child.dividend_rate)} rate</div>
      </td>
      <td className="py-2.5">
        {child.status !== "dead" && child.status !== "independent" && child.container_id && (
          <button
            type="button"
            onClick={() => onTerminate(child.instance_id)}
            className="text-[10px] text-red-400/40 hover:text-red-400/80 transition-colors px-1.5 py-0.5 rounded border border-red-500/0 hover:border-red-500/20"
          >
            terminate
          </button>
        )}
      </td>
    </tr>
  );
}

function ChildFleet({
  data,
  onTerminate,
}: {
  data: MitosisChildrenResponse;
  onTerminate: (id: string) => void;
}) {
  const sorted = [...data.children].sort((a, b) => {
    const order = ["alive", "spawning", "struggling", "rescued", "independent", "dead"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Child Fleet</CardTitle>
        <div className="flex items-center gap-2">
          {Object.entries(data.by_status).map(([status, count]) => (
            <Badge
              key={status}
              variant={
                status === "alive" || status === "independent"
                  ? "success"
                  : status === "struggling" || status === "rescued"
                    ? "warning"
                    : status === "dead"
                      ? "danger"
                      : "muted"
              }
            >
              {count} {status}
            </Badge>
          ))}
          {data.total === 0 && <Badge variant="muted">empty</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Niche / ID</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">Net Worth</th>
                  <th className="text-right pb-2 font-medium">Runway</th>
                  <th className="text-right pb-2 font-medium">Efficiency</th>
                  <th className="pb-2 font-medium">Independence</th>
                  <th className="text-right pb-2 font-medium">Dividends</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <ChildRow key={c.instance_id} child={c} onTerminate={onTerminate} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="text-3xl opacity-10 mb-2">~</div>
            <div className="text-xs text-white/25">
              No child instances. The organism has not yet reproduced.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dividend History ────────────────────────────────────────────

function DividendRow({ record }: { record: MitosisDividendRecord }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-3">
        <div className="text-[11px] text-white/50 font-mono">
          {shortId(record.child_instance_id)}
        </div>
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-sm text-emerald-400">
        {usd(record.amount_usd)}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-xs text-white/30">
        {pct(record.dividend_rate_applied)}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-xs text-white/25">
        {new Date(record.recorded_at).toLocaleDateString()}
      </td>
      <td className="py-2 text-right">
        <span className="text-[10px] text-white/15 font-mono">
          {record.tx_hash.slice(0, 8)}...
        </span>
      </td>
    </tr>
  );
}

function DividendHistory({ data }: { data: MitosisDividendsResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dividend History</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">{data.total} records</span>
          <span className="text-sm tabular-nums text-emerald-400 font-medium">
            {usd(data.total_amount_usd)} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {data.dividends.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest">
                  <th className="text-left pb-2 font-medium">Child</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                  <th className="text-right pb-2 font-medium">Date</th>
                  <th className="text-right pb-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {[...data.dividends].reverse().map((r) => (
                  <DividendRow key={r.record_id} record={r} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-white/25">
            No dividends received yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Config Panel ────────────────────────────────────────────────

function ConfigPanel({ data }: { data: MitosisConfigResponse }) {
  if (!data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
          <Badge variant="muted">unavailable</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-xs text-white/25">Config not loaded.</div>
        </CardContent>
      </Card>
    );
  }

  const c = data.config;

  const thresholds = [
    { label: "Min Parent Runway", value: `${c.mitosis_min_parent_runway_days}d` },
    { label: "Min Seed Capital", value: usd(c.mitosis_min_seed_capital) },
    { label: "Max Seed % Net Worth", value: pct(c.mitosis_max_seed_pct_of_net_worth) },
    { label: "Min Parent Efficiency", value: `${c.mitosis_min_parent_efficiency}x` },
    { label: "Default Dividend Rate", value: pct(c.mitosis_default_dividend_rate) },
    { label: "Min Niche Score", value: c.mitosis_min_niche_score },
    { label: "Max Children", value: String(c.mitosis_max_children) },
    { label: "Struggling Runway Threshold", value: `${c.mitosis_child_struggling_runway_days}d` },
    { label: "Max Rescues per Child", value: String(c.mitosis_max_rescues_per_child) },
    { label: "Birth Cert Validity", value: `${c.certificate_birth_validity_days}d` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thresholds</CardTitle>
        <Badge variant="muted">read-only</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {thresholds.map((t) => (
            <Metric key={t.label} label={t.label} value={t.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Spawn Form ──────────────────────────────────────────────────

function SpawnForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<MitosisSpawnResponse | null>(null);
  const [form, setForm] = useState({
    niche_name: "",
    niche_description: "",
    estimated_monthly_revenue_usd: "500.00",
    estimated_monthly_cost_usd: "100.00",
    competitive_density: "0.30",
    capability_alignment: "0.70",
    confidence: "0.65",
    child_wallet_address: "",
  });

  const handleSubmit = useCallback(async () => {
    if (!form.niche_name.trim()) return;
    setState("busy");
    try {
      const res = await api.mitosisSpawn(form);
      setResult(res);
      setState(res.status === "queued" ? "done" : "error");
      if (res.status === "queued") {
        setTimeout(() => {
          setOpen(false);
          setState("idle");
          setResult(null);
          onDone();
        }, 2000);
      }
    } catch (err) {
      setResult({ status: "error", message: err instanceof Error ? err.message : String(err) });
      setState("error");
    }
  }, [form, onDone]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 rounded-lg border border-teal-500/30 text-teal-400 text-sm hover:border-teal-400/60 hover:bg-teal-500/5 transition-all duration-200"
      >
        + Spawn Child
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spawn Child Instance</CardTitle>
        <button
          type="button"
          onClick={() => { setOpen(false); setState("idle"); setResult(null); }}
          className="text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          cancel
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "done" && result && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <div className="text-xs text-emerald-400">
              Spawn queued — child {result.child_instance_id?.slice(0, 8)}... seeded with {result.seed_capital_usd ? usd(result.seed_capital_usd) : "?"}
            </div>
          </div>
        )}

        {state === "error" && result && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
            <div className="text-xs text-red-400">{result.message}</div>
            {result.reasons?.map((r, i) => (
              <div key={i} className="text-[11px] text-red-400/70">&bull; {r}</div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">
              Niche Name *
            </label>
            <input
              type="text"
              value={form.niche_name}
              onChange={(e) => setForm((f) => ({ ...f, niche_name: e.target.value }))}
              placeholder="e.g. solidity-audit-bot"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">
              Description
            </label>
            <input
              type="text"
              value={form.niche_description}
              onChange={(e) => setForm((f) => ({ ...f, niche_description: e.target.value }))}
              placeholder="What does this specialization do?"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          {[
            { key: "estimated_monthly_revenue_usd", label: "Est. Monthly Revenue ($)" },
            { key: "estimated_monthly_cost_usd", label: "Est. Monthly Cost ($)" },
            { key: "competitive_density", label: "Competitive Density (0–1)" },
            { key: "capability_alignment", label: "Capability Alignment (0–1)" },
            { key: "confidence", label: "Confidence (0–1)" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">
                {label}
              </label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white/80 tabular-nums focus:outline-none focus:border-white/20"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">
              Child Wallet Address (optional)
            </label>
            <input
              type="text"
              value={form.child_wallet_address}
              onChange={(e) => setForm((f) => ({ ...f, child_wallet_address: e.target.value }))}
              placeholder="0x..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white/80 font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={state === "busy" || !form.niche_name.trim()}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              state === "busy"
                ? "bg-amber-500/10 text-amber-400/60 cursor-wait border border-amber-500/20"
                : "bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/15 hover:border-teal-400/50",
              !form.niche_name.trim() && "opacity-40 cursor-not-allowed",
            )}
          >
            {state === "busy" ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                Queueing spawn...
              </span>
            ) : (
              "Queue Spawn"
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Evaluate Panel ──────────────────────────────────────────────

function EvaluateButton({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [result, setResult] = useState<MitosisEvaluateResponse | null>(null);

  const evaluate = useCallback(async () => {
    setState("busy");
    try {
      const res = await api.mitosisEvaluate();
      setResult(res);
    } catch (err) {
      setResult({
        fit: false,
        reasons: [err instanceof Error ? err.message : String(err)],
        seed_config: null,
      });
    } finally {
      setState("idle");
      onDone();
    }
  }, [onDone]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={evaluate}
        disabled={state === "busy"}
        className={cn(
          "px-4 py-1.5 rounded-lg border text-sm transition-all duration-200",
          state === "busy"
            ? "border-white/10 text-white/30 cursor-wait"
            : "border-white/[0.12] text-white/50 hover:border-white/25 hover:text-white/70",
        )}
      >
        {state === "busy" ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
            Evaluating...
          </span>
        ) : (
          "Run Fitness Eval"
        )}
      </button>

      {result && (
        <div
          className={cn(
            "rounded-md border px-3 py-2",
            result.fit
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5",
          )}
        >
          <div className={cn("text-xs font-medium", result.fit ? "text-emerald-400" : "text-red-400")}>
            {result.fit ? "Fit for reproduction" : "Not fit"}
          </div>
          {result.reasons.map((r, i) => (
            <div key={i} className="text-[11px] text-red-400/70">&bull; {r}</div>
          ))}
          {result.seed_config && (
            <div className="mt-2 text-[11px] text-emerald-400/60">
              Candidate seed: {usd(result.seed_config.seed_capital_usd)} into{" "}
              <span className="font-medium">{result.seed_config.niche.name}</span>
              {" "}(gen {result.seed_config.generation})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function MitosisPage() {
  const status = useApi<MitosisStatusResponse>(api.mitosisStatus, { intervalMs: 5000 });
  const children = useApi<MitosisChildrenResponse>(api.mitosisChildren, { intervalMs: 5000 });
  const dividends = useApi<MitosisDividendsResponse>(api.mitosisDividends, { intervalMs: 10000 });
  const fleet = useApi<MitosisFleetResponse>(api.mitosisFleet, { intervalMs: 10000 });
  const config = useApi<MitosisConfigResponse>(api.mitosisConfig, { intervalMs: 60000 });

  const statusRefetchRef = useRef(status.refetch);
  const childrenRefetchRef = useRef(children.refetch);
  const dividendsRefetchRef = useRef(dividends.refetch);
  const fleetRefetchRef = useRef(fleet.refetch);
  statusRefetchRef.current = status.refetch;
  childrenRefetchRef.current = children.refetch;
  dividendsRefetchRef.current = dividends.refetch;
  fleetRefetchRef.current = fleet.refetch;

  const refetchAll = useCallback(() => {
    statusRefetchRef.current();
    childrenRefetchRef.current();
    dividendsRefetchRef.current();
    fleetRefetchRef.current();
  }, []);

  const [terminateState, setTerminateState] = useState<
    Record<string, "idle" | "busy" | "done" | "error">
  >({});

  const handleTerminate = useCallback(
    async (childId: string) => {
      if (!confirm(`Terminate child ${childId.slice(0, 8)}...? This cannot be undone.`)) return;
      setTerminateState((s) => ({ ...s, [childId]: "busy" }));
      try {
        await api.mitosisTerminate(childId);
        setTerminateState((s) => ({ ...s, [childId]: "done" }));
        setTimeout(refetchAll, 1000);
      } catch {
        setTerminateState((s) => ({ ...s, [childId]: "error" }));
      }
    },
    [refetchAll],
  );

  const activeChildren = status.data?.active_children ?? 0;
  const isFit = status.data?.fit ?? false;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Mitosis"
        description="Self-replication engine — spawn, monitor, and govern child instances"
      >
        <div className="flex items-center gap-2">
          {status.data && (
            <Badge
              variant={isFit ? "success" : "muted"}
              pulse={isFit}
            >
              {isFit ? "ready to reproduce" : "not ready"}
            </Badge>
          )}
          {activeChildren > 0 && (
            <Badge variant="info">{activeChildren} active</Badge>
          )}
        </div>
      </PageHeader>

      {status.error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Failed to load Mitosis status: {status.error}
        </div>
      )}

      <div className="space-y-4">
        {/* Row 1: Fitness HUD (full width) */}
        {status.data ? (
          <FitnessPanel data={status.data} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-white/20 text-sm">
              Loading reproductive fitness...
            </CardContent>
          </Card>
        )}

        {/* Row 2: Fleet summary + Config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {fleet.data ? (
              <FleetSummary data={fleet.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading fleet metrics...
                </CardContent>
              </Card>
            )}
          </div>
          <div className="lg:col-span-1">
            {config.data ? (
              <ConfigPanel data={config.data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-white/20 text-sm">
                  Loading config...
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Row 3: Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 flex-wrap">
              <EvaluateButton onDone={refetchAll} />
            </div>
            <SpawnForm onDone={refetchAll} />
          </CardContent>
        </Card>

        {/* Row 4: Child Fleet (full width) */}
        {children.data ? (
          <ChildFleet
            data={children.data}
            onTerminate={handleTerminate}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading child fleet...
            </CardContent>
          </Card>
        )}

        {/* Row 5: Dividend History */}
        {dividends.data ? (
          <DividendHistory data={dividends.data} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-white/20 text-sm">
              Loading dividend history...
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
