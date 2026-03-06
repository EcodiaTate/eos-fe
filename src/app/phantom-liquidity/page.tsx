"use client";

import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type {
  PhantomPool,
  PhantomPriceFeed,
  PhantomPoolCandidate,
  PhantomHealthData,
  PhantomConfigData,
  PhantomPriceHistoryPoint,
  PhantomTickRangeData,
  PhantomDeFiLlamaPool,
  PoolHealth,
} from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────

type Tab = "overview" | "pools" | "prices" | "candidates" | "config" | "history" | "discover";

// ─── Helpers ─────────────────────────────────────────────────────

function healthVariant(h: PoolHealth): "success" | "warning" | "danger" | "muted" | "info" {
  switch (h) {
    case "active":
      return "success";
    case "stale":
      return "warning";
    case "impermanent_loss":
      return "danger";
    case "withdrawn":
      return "muted";
    case "pending_deploy":
      return "info";
    case "failed":
      return "danger";
    default:
      return "muted";
  }
}

function healthLabel(h: PoolHealth): string {
  switch (h) {
    case "active":
      return "Active";
    case "stale":
      return "Stale";
    case "impermanent_loss":
      return "IL Alert";
    case "withdrawn":
      return "Withdrawn";
    case "pending_deploy":
      return "Pending";
    case "failed":
      return "Failed";
    default:
      return h;
  }
}

function formatUsd(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPrice(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return "—";
  if (n > 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n > 1) return n.toFixed(4);
  return n.toFixed(8);
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function feeTierLabel(tier: number): string {
  return `${(tier / 10000).toFixed(2)}%`;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function IlBar({ pct }: { pct: string }) {
  const val = Math.abs(parseFloat(pct));
  const width = Math.min(val * 100, 100);
  const color = val > 0.02 ? "#f87171" : val > 0.01 ? "#fbbf24" : "#34d399";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 flex-1 rounded-full bg-white/[0.08]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {(val * 100).toFixed(2)}%
      </span>
    </div>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────

function OverviewPanel({
  health,
  config,
}: {
  health: PhantomHealthData | null;
  config: PhantomConfigData | null;
}) {
  if (!health) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm">
        Phantom Liquidity service unavailable — check config.phantom_liquidity.enabled
      </div>
    );
  }

  const listenerOk = health.listener.running && health.listener.errors === 0;
  const listenerVariant = health.listener.running
    ? health.listener.errors > 5
      ? "danger"
      : "success"
    : "muted";

  return (
    <div className="space-y-4">
      {/* Top-level metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Pools"
          value={String(health.pools_total)}
          sub={`${health.pools_active} active · ${health.pools_stale} stale`}
          color="#34d399"
        />
        <MetricCard
          label="Price Updates"
          value={health.total_price_updates.toLocaleString()}
          sub="total swap events decoded"
          color="#60a5fa"
        />
        <MetricCard
          label="Oracle Fallbacks"
          value={String(health.oracle_fallback_count)}
          sub="CoinGecko fetches"
          color={health.oracle_fallback_count > 10 ? "#fbbf24" : "#94a3b8"}
        />
        <MetricCard
          label="Listener Status"
          value={health.listener.running ? "Running" : "Stopped"}
          sub={`${health.listener.polls} polls · block ${health.listener.last_block.toLocaleString()}`}
          color={health.listener.running ? "#34d399" : "#f87171"}
        />
      </div>

      {/* Listener detail */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Swap Listener
              <Badge variant={listenerVariant} pulse={health.listener.running}>
                {health.listener.running ? "Polling" : "Idle"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Pools monitored" value={String(health.listener.pools_monitored)} />
            <Row label="Total polls" value={health.listener.polls.toLocaleString()} />
            <Row label="Events decoded" value={health.listener.events_processed.toLocaleString()} />
            <Row
              label="Errors"
              value={String(health.listener.errors)}
              valueColor={health.listener.errors > 0 ? "#f87171" : "#34d399"}
            />
            <Row
              label="Last block"
              value={
                health.listener.last_block > 0
                  ? health.listener.last_block.toLocaleString()
                  : "—"
              }
            />
            <Row
              label="Initialized"
              value={health.initialized ? "Yes" : "No"}
              valueColor={health.initialized ? "#34d399" : "#f87171"}
            />
          </CardContent>
        </Card>

        {config && (
          <Card>
            <CardHeader>
              <CardTitle>Capital Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Max total capital"
                value={formatUsd(config.max_total_capital_usd)}
              />
              <Row
                label="Default per pool"
                value={formatUsd(config.default_capital_per_pool_usd)}
              />
              <Row
                label="Range"
                value={`${formatUsd(config.min_capital_per_pool_usd)} – ${formatUsd(config.max_capital_per_pool_usd)}`}
              />
              <Row label="Max pools" value={String(config.max_pools)} />
              <Row
                label="Poll interval"
                value={`${config.swap_poll_interval_s}s`}
              />
              <Row
                label="Staleness threshold"
                value={`${config.staleness_threshold_s / 60}min`}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Pool List ────────────────────────────────────────────────────

function PoolsPanel({ pools }: { pools: PhantomPool[] }) {
  const [selected, setSelected] = useState<PhantomPool | null>(null);

  if (pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/30">
        <span className="text-2xl">💧</span>
        <span className="text-sm">No phantom positions deployed yet</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {pools.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
            className={`w-full text-left rounded-xl border p-3 transition-all ${
              selected?.id === p.id
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-white/90">
                  {p.pair[0]}/{p.pair[1]}
                </span>
                <span className="text-xs text-white/40">{feeTierLabel(p.fee_tier)}</span>
              </div>
              <Badge variant={healthVariant(p.health)}>{healthLabel(p.health)}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/50">
              <div>
                <div className="text-white/30">Deployed</div>
                <div>{formatUsd(p.capital_deployed_usd)}</div>
              </div>
              <div>
                <div className="text-white/30">Price</div>
                <div className="text-white/70">{formatPrice(p.last_price_observed)}</div>
              </div>
              <div>
                <div className="text-white/30">Updates</div>
                <div>{p.price_update_count.toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-2">
              <IlBar pct={p.impermanent_loss_pct} />
            </div>
          </button>
        ))}
      </div>

      <div>
        {selected ? (
          <PoolDetail pool={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-white/20 text-sm rounded-xl border border-white/[0.04]">
            Select a pool to inspect
          </div>
        )}
      </div>
    </div>
  );
}

function PoolDetail({ pool }: { pool: PhantomPool }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {pool.pair[0]}/{pool.pair[1]} Detail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Pool address" value={shortAddr(pool.pool_address)} mono />
        <Row label="Token ID" value={pool.token_id > 0 ? String(pool.token_id) : "—"} />
        <Row label="Fee tier" value={feeTierLabel(pool.fee_tier)} />
        <Row label="Tick lower" value={String(pool.tick_lower)} mono />
        <Row label="Tick upper" value={String(pool.tick_upper)} mono />
        <Row label="Capital deployed" value={formatUsd(pool.capital_deployed_usd)} />
        <Row label="Cumulative yield" value={formatUsd(pool.cumulative_yield_usd)} />
        <Row
          label="IL"
          value={`${(Math.abs(parseFloat(pool.impermanent_loss_pct)) * 100).toFixed(3)}%`}
          valueColor={
            Math.abs(parseFloat(pool.impermanent_loss_pct)) > 0.02 ? "#f87171" : "#34d399"
          }
        />
        <Row label="Last price" value={formatPrice(pool.last_price_observed)} />
        <Row label="Last seen" value={relativeTime(pool.last_price_timestamp)} />
        <Row label="Price count" value={pool.price_update_count.toLocaleString()} />
        {pool.deployed_at && (
          <Row label="Deployed" value={relativeTime(pool.deployed_at)} />
        )}
        {pool.deploy_tx_hash && (
          <Row label="Deploy tx" value={shortAddr(pool.deploy_tx_hash)} mono />
        )}
        {pool.yield_position_id && (
          <Row label="Oikos ID" value={shortAddr(pool.yield_position_id)} mono />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Prices Panel ─────────────────────────────────────────────────

function PricesPanel({
  feeds,
  onFetchOracle,
}: {
  feeds: PhantomPriceFeed[];
  onFetchOracle: (pair: string) => Promise<void>;
}) {
  const [fetchingPair, setFetchingPair] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [manualPair, setManualPair] = useState("");

  const handleFetch = useCallback(
    async (pair: string) => {
      setFetchingPair(pair);
      setFetchError(null);
      try {
        await onFetchOracle(pair);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : String(e));
      } finally {
        setFetchingPair(null);
      }
    },
    [onFetchOracle],
  );

  const KNOWN_PAIRS = ["USDC/ETH", "USDC/cbBTC", "ETH/cbBTC", "USDC/DAI", "ETH/USDT"];

  return (
    <div className="space-y-4">
      {/* Live price feeds */}
      {feeds.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((f) => (
            <PriceFeedCard key={f.id} feed={f} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/30">
          <span className="text-xl">📡</span>
          <span className="text-sm">No price feeds yet — waiting for swap events</span>
        </div>
      )}

      {/* Oracle fallback */}
      <Card>
        <CardHeader>
          <CardTitle>Force Oracle Fetch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-white/40">
            Bypass phantom pool cache and pull directly from CoinGecko fallback.
            Useful for bootstrapping or testing.
          </p>
          <div className="flex flex-wrap gap-2">
            {KNOWN_PAIRS.map((pair) => (
              <button
                key={pair}
                disabled={fetchingPair === pair}
                onClick={() => handleFetch(pair)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-40 transition-all"
              >
                {fetchingPair === pair ? "Fetching…" : pair}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={manualPair}
              onChange={(e) => setManualPair(e.target.value)}
              placeholder="TOKEN0/TOKEN1"
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-mono text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              disabled={!manualPair || fetchingPair !== null}
              onClick={() => handleFetch(manualPair.trim().toUpperCase())}
              className="px-3 py-1.5 rounded-lg text-xs bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-40 transition-all"
            >
              Fetch
            </button>
          </div>
          {fetchError && (
            <p className="text-xs text-red-400">{fetchError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PriceFeedCard({ feed }: { feed: PhantomPriceFeed }) {
  const ageMs = Date.now() - new Date(feed.timestamp).getTime();
  const stale = ageMs > 600_000;

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-semibold text-white/90">
            {feed.pair[0]}/{feed.pair[1]}
          </span>
          <Badge variant={feed.source === "oracle_fallback" ? "warning" : "success"}>
            {feed.source === "oracle_fallback" ? "Oracle" : "Phantom"}
          </Badge>
        </div>
        <div className="text-2xl font-mono font-bold text-white/95">
          {formatPrice(feed.price)}
        </div>
        <div className="text-xs text-white/30 space-y-0.5">
          <div className="flex justify-between">
            <span>Age</span>
            <span className={stale ? "text-amber-400" : "text-white/50"}>
              {relativeTime(feed.timestamp)}
            </span>
          </div>
          {feed.block_number > 0 && (
            <div className="flex justify-between">
              <span>Block</span>
              <span className="font-mono text-white/50">
                {feed.block_number.toLocaleString()}
              </span>
            </div>
          )}
          {feed.latency_ms > 0 && (
            <div className="flex justify-between">
              <span>Latency</span>
              <span className="text-white/50">{feed.latency_ms}ms</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Candidates Panel ─────────────────────────────────────────────

function CandidatesPanel({ candidates }: { candidates: PhantomPoolCandidate[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Phase 1 static pool registry. Pools already deployed are filtered out.
        Phase 2 will use dynamic DeFiLlama discovery.
      </p>
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/30">
          <span className="text-sm">All candidate pools are already deployed</span>
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <div
              key={c.pool_address}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-white/90">
                    {c.pair[0]}/{c.pair[1]}
                  </span>
                  <span className="text-xs text-white/40">{feeTierLabel(c.fee_tier)}</span>
                </div>
                <RelevanceBar score={c.relevance_score} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/50">
                <div>
                  <div className="text-white/30">24h Volume</div>
                  <div>{formatUsd(c.volume_24h_usd)}</div>
                </div>
                <div>
                  <div className="text-white/30">TVL</div>
                  <div>{formatUsd(c.tvl_usd)}</div>
                </div>
                <div>
                  <div className="text-white/30">Pool</div>
                  <div className="font-mono">{shortAddr(c.pool_address)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelevanceBar({ score }: { score: string }) {
  const val = parseFloat(score);
  const color = val >= 0.9 ? "#34d399" : val >= 0.75 ? "#60a5fa" : "#94a3b8";
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-1 w-16 rounded-full bg-white/[0.08]">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${val * 100}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {val.toFixed(2)}
      </span>
    </div>
  );
}

// ─── Price History Panel ──────────────────────────────────────────

function PriceHistoryPanel({
  pairs,
}: {
  pairs: string[];
}) {
  const KNOWN = pairs.length > 0 ? pairs : ["USDC/ETH", "USDC/cbBTC", "ETH/cbBTC"];
  const [selectedPair, setSelectedPair] = useState(KNOWN[0] ?? "USDC/ETH");

  const historyReq = useApi(
    useCallback(() => api.phantomPriceHistory(selectedPair, 200), [selectedPair]),
    { intervalMs: 30000 },
  );

  const points = historyReq.data?.data ?? [];

  // Compute chart: normalise prices to 0–1 range for SVG rendering
  const chartData = useMemo(() => {
    if (points.length < 2) return null;
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const W = 600;
    const H = 120;
    const pts = points.map((p, i) => ({
      x: (i / (points.length - 1)) * W,
      y: H - ((p.price - min) / range) * H,
      p,
    }));
    const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
    const area = path + ` L${W},${H} L0,${H} Z`;
    return { pts, path, area, min, max, W, H };
  }, [points]);

  return (
    <div className="space-y-4">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-2">
        {KNOWN.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPair(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              selectedPair === p
                ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-300"
                : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {historyReq.loading && !historyReq.data ? (
        <Loading />
      ) : points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/30">
          <span className="text-xl">📊</span>
          <span className="text-sm">No history yet — prices persist as swaps are detected</span>
          {!historyReq.data && (
            <span className="text-xs text-amber-400/70">
              TimescaleDB may not be connected
            </span>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedPair} — {points.length} observations</span>
              <span className="text-xs text-white/30 font-normal">
                {relativeTime(points[0].time)} → {relativeTime(points[points.length - 1].time)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData ? (
              <div className="relative">
                <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full" style={{ height: 140 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chartData.area} fill="url(#priceGrad)" />
                  <path d={chartData.path} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
                  {/* Latest price dot */}
                  {chartData.pts.length > 0 && (
                    <circle
                      cx={chartData.pts[chartData.pts.length - 1].x}
                      cy={chartData.pts[chartData.pts.length - 1].y}
                      r="3"
                      fill="#22d3ee"
                    />
                  )}
                </svg>
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>{formatPrice(String(chartData.min))}</span>
                  <span className="text-cyan-400/70 font-mono">
                    {formatPrice(String(points[points.length - 1]?.price ?? 0))}
                  </span>
                  <span>{formatPrice(String(chartData.max))}</span>
                </div>
              </div>
            ) : null}

            {/* Recent rows */}
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {[...points].reverse().slice(0, 20).map((pt, i) => (
                <div key={i} className="flex justify-between text-xs text-white/50 py-0.5 border-b border-white/[0.04]">
                  <span className="text-white/30">{relativeTime(pt.time)}</span>
                  <span className="font-mono text-white/70">{formatPrice(String(pt.price))}</span>
                  <Badge variant={pt.source === "oracle_fallback" ? "warning" : "success"} className="scale-75">
                    {pt.source === "oracle_fallback" ? "Oracle" : "Phantom"}
                  </Badge>
                  <span className="text-white/20">{pt.latency_ms}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tick Range Visualizer ────────────────────────────────────────

function TickRangePanel({
  pools,
}: {
  pools: PhantomPool[];
}) {
  const STATIC_PAIRS = ["USDC/ETH", "USDC/cbBTC", "ETH/cbBTC", "USDC/DAI", "ETH/USDT"];
  const FEE_TIERS = [100, 500, 3000, 10000];

  const [mode, setMode] = useState<"pool" | "custom">(pools.length > 0 ? "pool" : "custom");
  const [selectedPool, setSelectedPool] = useState<PhantomPool | null>(pools[0] ?? null);
  const [customPair, setCustomPair] = useState("USDC/ETH");
  const [customFee, setCustomFee] = useState(3000);
  const [customTick, setCustomTick] = useState(0);

  const tickReq = useApi(
    useCallback(() => {
      if (mode === "pool" && selectedPool) {
        return api.phantomTickRange({ pool_address: selectedPool.pool_address });
      }
      return api.phantomTickRange({ pair: customPair, fee_tier: customFee, current_tick: customTick });
    }, [mode, selectedPool, customPair, customFee, customTick]),
    { intervalMs: 30000 },
  );

  const data: PhantomTickRangeData | null = tickReq.data?.data ?? null;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("pool")}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${mode === "pool" ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-300" : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"}`}
        >
          Active Pool
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${mode === "custom" ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-300" : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"}`}
        >
          Custom
        </button>
      </div>

      {mode === "pool" ? (
        pools.length === 0 ? (
          <p className="text-xs text-white/30">No active pools — deploy a position first</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pools.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPool(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${selectedPool?.id === p.id ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-300" : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"}`}
              >
                {p.pair[0]}/{p.pair[1]} {(p.fee_tier / 10000).toFixed(2)}%
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={customPair}
            onChange={(e) => setCustomPair(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/50"
          >
            {STATIC_PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={customFee}
            onChange={(e) => setCustomFee(Number(e.target.value))}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/50"
          >
            {FEE_TIERS.map((f) => <option key={f} value={f}>{(f / 10000).toFixed(2)}%</option>)}
          </select>
          <input
            type="number"
            value={customTick}
            onChange={(e) => setCustomTick(Number(e.target.value))}
            placeholder="Tick (0=full)"
            className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      )}

      {tickReq.loading && !tickReq.data ? (
        <Loading />
      ) : data ? (
        <TickRangeViz data={data} />
      ) : null}
    </div>
  );
}

function TickRangeViz({ data }: { data: PhantomTickRangeData }) {
  const W = 600;
  const H = 80;
  const PADDING = 40;
  const innerW = W - PADDING * 2;

  const ladder = data.tick_ladder;
  const minPrice = ladder[0]?.price ?? 0;
  const maxPrice = ladder[ladder.length - 1]?.price ?? 1;
  const priceRange = maxPrice - minPrice || 1;

  const toX = (price: number) => PADDING + ((price - minPrice) / priceRange) * innerW;

  const lowerX = toX(data.price_lower);
  const upperX = toX(data.price_upper);
  const currentX = data.price_current !== null ? toX(data.price_current) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.pair} — Tick Range ({(data.fee_tier / 10000).toFixed(2)}% fee)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" style={{ height: 120 }}>
          {/* Full range background */}
          <rect x={PADDING} y={20} width={innerW} height={40} fill="rgba(255,255,255,0.03)" rx="4" />
          {/* Active range */}
          <rect
            x={lowerX}
            y={20}
            width={upperX - lowerX}
            height={40}
            fill="rgba(34,211,238,0.12)"
            stroke="rgba(34,211,238,0.3)"
            strokeWidth="1"
            rx="2"
          />
          {/* Tick ladder lines */}
          {ladder.map((step, i) => {
            const x = toX(step.price);
            return (
              <line
                key={i}
                x1={x} y1={20} x2={x} y2={60}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Current price line */}
          {currentX !== null && (
            <line x1={currentX} y1={15} x2={currentX} y2={65} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3,2" />
          )}
          {/* Labels */}
          <text x={lowerX} y={80} fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="middle">
            {formatPrice(String(data.price_lower))}
          </text>
          <text x={upperX} y={80} fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="middle">
            {formatPrice(String(data.price_upper))}
          </text>
          {currentX !== null && (
            <text x={currentX} y={12} fontSize="9" fill="#22d3ee" textAnchor="middle">
              {formatPrice(String(data.price_current))}
            </text>
          )}
        </svg>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2">
            <div className="text-xs text-white/30">Lower bound</div>
            <div className="font-mono text-white/70">{formatPrice(String(data.price_lower))}</div>
            <div className="text-xs text-white/20 mt-0.5">tick {data.tick_lower}</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2">
            <div className="text-xs text-white/30">Upper bound</div>
            <div className="font-mono text-white/70">{formatPrice(String(data.price_upper))}</div>
            <div className="text-xs text-white/20 mt-0.5">tick {data.tick_upper}</div>
          </div>
          {data.price_current !== null && (
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-2">
              <div className="text-xs text-cyan-400/70">Current price</div>
              <div className="font-mono text-cyan-300">{formatPrice(String(data.price_current))}</div>
              <div className="text-xs text-white/20 mt-0.5">tick {data.current_tick}</div>
            </div>
          )}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2">
            <div className="text-xs text-white/30">Range width</div>
            <div className="font-mono text-white/70">{(data.tick_upper - data.tick_lower).toLocaleString()} ticks</div>
            <div className="text-xs text-white/20 mt-0.5">sensor position</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Deploy Panel ─────────────────────────────────────────────────

function DeployPanel({
  candidates,
  onDeploy,
}: {
  candidates: PhantomPoolCandidate[];
  onDeploy: () => void;
}) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [capital, setCapital] = useState("100");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleDeploy = useCallback(async (poolAddress: string) => {
    setDeploying(poolAddress);
    setResult(null);
    try {
      const res = await api.phantomDeploy(poolAddress, parseFloat(capital) || 100);
      if (res.status === "ok") {
        setResult({ ok: true, msg: `Deployed! Token ID: ${res.data.token_id} · TX: ${res.data.deploy_tx_hash.slice(0, 16)}…` });
        onDeploy();
      } else {
        setResult({ ok: false, msg: res.error ?? "Deploy failed" });
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setDeploying(null);
    }
  }, [capital, onDeploy]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Deploy Capital</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-white/40">
            Deploy a phantom sensor position. Uses full-range ticks to minimise IL.
            Capital is split evenly between the two tokens.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40 shrink-0">Capital (USD)</label>
            <input
              type="number"
              min="10"
              max="10000"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              className="w-24 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </CardContent>
      </Card>

      {candidates.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">All candidate pools are already deployed</div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <div key={c.pool_address} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-white/90">
                    {c.pair[0]}/{c.pair[1]}
                  </span>
                  <span className="ml-2 text-xs text-white/40">{feeTierLabel(c.fee_tier)}</span>
                  <div className="text-xs text-white/30 mt-0.5">TVL {formatUsd(c.tvl_usd)} · Vol {formatUsd(c.volume_24h_usd)}</div>
                </div>
                <button
                  disabled={deploying !== null}
                  onClick={() => handleDeploy(c.pool_address)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-40 transition-all"
                >
                  {deploying === c.pool_address ? "Deploying…" : "Deploy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className={`rounded-lg px-3 py-2 text-xs border ${result.ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

// ─── Withdraw Panel ───────────────────────────────────────────────

function WithdrawPanel({
  pools,
  onWithdraw,
}: {
  pools: PhantomPool[];
  onWithdraw: () => void;
}) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string; addr: string } | null>(null);

  const active = pools.filter((p) => p.health !== "withdrawn" && p.health !== "failed");

  const handleWithdraw = useCallback(async (poolAddress: string) => {
    setWithdrawing(poolAddress);
    setResult(null);
    try {
      const res = await api.phantomWithdraw(poolAddress);
      if (res.status === "ok") {
        setResult({ ok: true, msg: `Withdrawn! TX: ${res.data.withdraw_tx_hash.slice(0, 16)}…`, addr: poolAddress });
        onWithdraw();
      } else {
        setResult({ ok: false, msg: res.error ?? "Withdrawal failed", addr: poolAddress });
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e), addr: poolAddress });
    } finally {
      setWithdrawing(null);
    }
  }, [onWithdraw]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Withdraw a deployed phantom position. Burns the NFT, collects all fees and remaining tokens.
      </p>

      {active.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">No active positions to withdraw</div>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-white/90">
                    {p.pair[0]}/{p.pair[1]}
                  </span>
                  <span className="ml-2 text-xs text-white/40">{feeTierLabel(p.fee_tier)}</span>
                  <div className="text-xs text-white/30 mt-0.5">
                    Deployed {formatUsd(p.capital_deployed_usd)} · Token ID: {p.token_id > 0 ? p.token_id : "—"}
                  </div>
                </div>
                <button
                  disabled={withdrawing !== null || p.token_id === 0}
                  onClick={() => handleWithdraw(p.pool_address)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:opacity-40 transition-all"
                >
                  {withdrawing === p.pool_address ? "Withdrawing…" : p.token_id === 0 ? "No Token" : "Withdraw"}
                </button>
              </div>
              {result?.addr === p.pool_address && (
                <div className={`mt-2 rounded px-2 py-1 text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
                  {result.msg}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DeFiLlama Discovery Panel ────────────────────────────────────

function DiscoverPanel({ existingAddresses }: { existingAddresses: Set<string> }) {
  const [chain, setChain] = useState("Base");
  const [minTvl, setMinTvl] = useState(100000);

  const llamaReq = useApi(
    useCallback(
      () => api.phantomDeFiLlamaPools({ chain, min_tvl_usd: minTvl, limit: 30 }),
      [chain, minTvl],
    ),
    { intervalMs: 120000 },
  );

  const pools: PhantomDeFiLlamaPool[] = llamaReq.data?.data ?? [];
  const source = llamaReq.data?.source ?? "static_fallback";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/50"
        >
          {["Base", "Ethereum", "Arbitrum", "Optimism", "Polygon"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={minTvl}
          onChange={(e) => setMinTvl(Number(e.target.value))}
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/50"
        >
          {[50000, 100000, 500000, 1000000, 5000000].map((v) => (
            <option key={v} value={v}>TVL ≥ {formatUsd(v)}</option>
          ))}
        </select>
        <Badge variant={source === "defillama" ? "success" : "warning"}>
          {source === "defillama" ? "DeFiLlama Live" : "Static Fallback"}
        </Badge>
        {llamaReq.error && (
          <span className="text-xs text-red-400">{llamaReq.error}</span>
        )}
      </div>

      {llamaReq.loading && !llamaReq.data ? (
        <Loading />
      ) : pools.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">No pools found for current filters</div>
      ) : (
        <div className="space-y-2">
          {pools.map((p) => {
            const alreadyDeployed = existingAddresses.has(p.pool_id.toLowerCase());
            return (
              <div
                key={p.pool_id}
                className={`rounded-xl border p-3 ${alreadyDeployed ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/[0.06] bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white/90">{p.symbol}</span>
                    {alreadyDeployed && <Badge variant="success">Deployed</Badge>}
                    {p.stable_coin && <Badge variant="info">Stable</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">APY</span>
                    <span className="text-xs font-mono text-green-400/80">{p.apy.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-white/50">
                  <div>
                    <div className="text-white/30">TVL</div>
                    <div>{formatUsd(p.tvl_usd)}</div>
                  </div>
                  <div>
                    <div className="text-white/30">7d Volume</div>
                    <div>{formatUsd(p.volume_7d_usd)}</div>
                  </div>
                  <div>
                    <div className="text-white/30">IL Risk</div>
                    <div className={p.il_risk === "no" ? "text-green-400/70" : "text-white/50"}>
                      {p.il_risk}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30">Pool ID</div>
                    <div className="font-mono">{shortAddr(p.pool_id)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────

function ConfigPanel({ config }: { config: PhantomConfigData | null }) {
  if (!config) {
    return (
      <div className="flex items-center justify-center py-8 text-white/30 text-sm">
        Config unavailable
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Capital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Enabled" value={config.enabled ? "Yes" : "No"} valueColor={config.enabled ? "#34d399" : "#f87171"} />
          <Row label="RPC configured" value={config.rpc_url_set ? "Yes" : "No"} valueColor={config.rpc_url_set ? "#34d399" : "#f87171"} />
          <Row label="Max total" value={formatUsd(config.max_total_capital_usd)} />
          <Row label="Default per pool" value={formatUsd(config.default_capital_per_pool_usd)} />
          <Row label="Min per pool" value={formatUsd(config.min_capital_per_pool_usd)} />
          <Row label="Max per pool" value={formatUsd(config.max_capital_per_pool_usd)} />
          <Row label="Max pools" value={String(config.max_pools)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Poll interval" value={`${config.swap_poll_interval_s}s (~${Math.round(config.swap_poll_interval_s / 2)} blocks)`} />
          <Row label="Staleness threshold" value={`${config.staleness_threshold_s / 60}min`} />
          <Row label="IL rebalance" value={`${(config.il_rebalance_threshold * 100).toFixed(1)}%`} />
          <Row label="Capital drift" value={`${(config.capital_drift_threshold * 100).toFixed(0)}%`} />
          <Row label="Maintenance interval" value={`${config.maintenance_interval_s / 3600}h`} />
          <Row label="Oracle fallback" value={config.oracle_fallback_enabled ? "Enabled" : "Disabled"} valueColor={config.oracle_fallback_enabled ? "#34d399" : "#94a3b8"} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-xs text-white/30 mb-1">{label}</div>
      <div className="text-xl font-semibold font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-white/25 mt-0.5">{sub}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-white/40 shrink-0">{label}</span>
      <span
        className={mono ? "font-mono text-white/60 text-right" : "text-white/70 text-right"}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function PhantomLiquidityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const healthReq = useApi(api.phantomHealth, { intervalMs: 8000 });
  const poolsReq = useApi(api.phantomPools, { intervalMs: 10000 });
  const pricesReq = useApi(api.phantomPrices, {
    intervalMs: 5000,
    enabled: activeTab === "prices" || activeTab === "overview",
  });
  const configReq = useApi(api.phantomConfig, {
    intervalMs: 60000,
    enabled: activeTab === "config" || activeTab === "overview",
  });
  const candidatesReq = useApi(api.phantomCandidates, {
    intervalMs: 30000,
    enabled: activeTab === "candidates" || activeTab === "pools",
  });

  const handleFetchOracle = useCallback(async (pair: string) => {
    await api.phantomFetchPrice(pair);
    await pricesReq.refetch();
  }, [pricesReq]);

  const handleDeploy = useCallback(async () => {
    await poolsReq.refetch();
    await candidatesReq.refetch();
    await healthReq.refetch();
  }, [poolsReq, candidatesReq, healthReq]);

  const handleWithdraw = useCallback(async () => {
    await poolsReq.refetch();
    await candidatesReq.refetch();
    await healthReq.refetch();
  }, [poolsReq, candidatesReq, healthReq]);

  const pools = poolsReq.data?.data ?? [];
  const candidates = candidatesReq.data?.data ?? [];
  const existingAddresses = useMemo(
    () => new Set(pools.map((p) => p.pool_address.toLowerCase())),
    [pools],
  );
  const activePairNames = useMemo(
    () => [...new Set(pools.map((p) => `${p.pair[0]}/${p.pair[1]}`))],
    [pools],
  );

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "pools", label: "Pools", badge: poolsReq.data?.total ?? 0 },
    { id: "prices", label: "Prices", badge: pricesReq.data?.total ?? 0 },
    { id: "history", label: "History" },
    { id: "candidates", label: "Deploy" },
    { id: "discover", label: "Discover" },
    { id: "config", label: "Config" },
  ];

  const unavailable =
    !healthReq.loading &&
    healthReq.error &&
    healthReq.error.includes("503");

  return (
    <>
      <PageHeader
          title="Phantom Liquidity"
          description="Self-funding price sensor network — Phase 16q. Deploys minimal Uniswap V3 LP positions on Base L2 to extract real-time prices via Swap events, replacing paid oracle subscriptions."
        />

        {/* System status bar */}
        <div className="flex items-center gap-3 mb-6">
          {healthReq.data?.data && (
            <>
              <Badge
                variant={healthReq.data.data.listener.running ? "success" : "muted"}
                pulse={healthReq.data.data.listener.running}
              >
                {healthReq.data.data.listener.running ? "Live" : "Idle"}
              </Badge>
              <span className="text-xs text-white/30">
                {healthReq.data.data.pools_active} active ·{" "}
                {healthReq.data.data.total_price_updates.toLocaleString()} price updates ·{" "}
                block {healthReq.data.data.listener.last_block.toLocaleString()}
              </span>
            </>
          )}
          {unavailable && (
            <Badge variant="muted">Service Disabled</Badge>
          )}
          {healthReq.error && !unavailable && (
            <span className="text-xs text-red-400">{healthReq.error}</span>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === tab.id ? "bg-white/20" : "bg-white/10 text-white/50"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-4">
          {activeTab === "overview" && (
            <OverviewPanel
              health={healthReq.data?.data ?? null}
              config={configReq.data?.data ?? null}
            />
          )}
          {activeTab === "pools" && (
            <div className="space-y-6">
              {poolsReq.loading && !poolsReq.data ? (
                <Loading />
              ) : (
                <PoolsPanel pools={pools} />
              )}
              {/* Inline deploy + withdraw in pool view */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Deploy Position</CardTitle></CardHeader>
                  <CardContent>
                    <DeployPanel candidates={candidates} onDeploy={handleDeploy} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Withdraw Position</CardTitle></CardHeader>
                  <CardContent>
                    <WithdrawPanel pools={pools} onWithdraw={handleWithdraw} />
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Tick Range Visualizer</CardTitle></CardHeader>
                <CardContent>
                  <TickRangePanel pools={pools} />
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === "prices" && (
            pricesReq.loading && !pricesReq.data ? (
              <Loading />
            ) : (
              <PricesPanel
                feeds={pricesReq.data?.data ?? []}
                onFetchOracle={handleFetchOracle}
              />
            )
          )}
          {activeTab === "history" && (
            <PriceHistoryPanel pairs={activePairNames} />
          )}
          {activeTab === "candidates" && (
            <div className="space-y-4">
              <CandidatesPanel candidates={candidates} />
              <DeployPanel candidates={candidates} onDeploy={handleDeploy} />
            </div>
          )}
          {activeTab === "discover" && (
            <DiscoverPanel existingAddresses={existingAddresses} />
          )}
          {activeTab === "config" && (
            configReq.loading && !configReq.data ? (
              <Loading />
            ) : (
              <ConfigPanel config={configReq.data?.data ?? null} />
            )
          )}
        </div>
    </>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12 text-white/30 text-sm">
      Loading…
    </div>
  );
}
