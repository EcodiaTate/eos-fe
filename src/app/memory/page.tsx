"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as d3Force from "d3-force";
import {
  api,
  type MemoryHealthResponse,
  type MemGraphStatsResponse,
  type MemorySelfResponse,
  type MemoryConstitutionResponse,
  type MemoryEpisodeItem,
  type MemoryEntityItem,
  type MemoryBeliefItem,
  type MemoryCommunityItem,
  type MemoryConsolidationResponse,
  type MemoryRetrievalResponse,
  type MemoryRetrievalResultItem,
  type MemoryCounterfactualItem,
  type MemoryCompressionStatItem,
  type MemoryDecayForecastPoint,
} from "@/lib/api-client";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { pct, relTime } from "@/lib/formatters";

// ─── Helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function salienceColor(s: number): string {
  if (s >= 0.75) return "#5eead4";
  if (s >= 0.5) return "#fbbf24";
  if (s >= 0.25) return "#f97316";
  return "rgba(255,255,255,0.25)";
}

function valenceColor(v: number): string {
  if (v >= 0.3) return "#5eead4";
  if (v <= -0.3) return "#ef4444";
  return "#fbbf24";
}

function SalienceBar({ value }: { value: number }) {
  const color = salienceColor(value);
  return (
    <div className="h-1 w-full rounded-full bg-white/[0.05]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value * 100)}%`, background: color }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] text-white/25 uppercase tracking-widest">{label}</div>
      <div className="text-sm text-white/70 tabular-nums font-medium">{value}</div>
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────

type Tab = "overview" | "episodes" | "entities" | "beliefs" | "communities" | "retrieve" | "counterfactuals";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "episodes", label: "Episodes" },
  { id: "entities", label: "Entities" },
  { id: "beliefs", label: "Beliefs" },
  { id: "communities", label: "Communities" },
  { id: "retrieve", label: "Retrieve" },
  { id: "counterfactuals", label: "Counterfactuals" },
];

// ─── Overview Panel ─────────────────────────────────────────────

function ConstitutionCard({ data }: { data: MemoryConstitutionResponse }) {
  const drives = [
    { label: "Coherence", value: data.drive_coherence },
    { label: "Care", value: data.drive_care },
    { label: "Growth", value: data.drive_growth },
    { label: "Honesty", value: data.drive_honesty },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Constitution v{data.version}</CardTitle>
        {data.amendment_count > 0 && (
          <span className="text-xs text-white/30">{data.amendment_count} amendments</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {drives.map((d) => (
          <div key={d.label} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/40">{d.label}</span>
              <span className="text-white/60 tabular-nums">{d.value.toFixed(3)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, d.value * 100)}%`,
                  background: "linear-gradient(90deg, #818cf8, #5eead4)",
                }}
              />
            </div>
          </div>
        ))}
        {data.last_amended && (
          <div className="text-[10px] text-white/20 pt-1">
            Last amended {relTime(data.last_amended)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SelfCard({ data }: { data: MemorySelfResponse }) {
  const affect = data.current_affect;
  const affectItems = Object.entries(affect).slice(0, 4);

  return (
    <Card glow>
      <CardHeader>
        <CardTitle>Self</CardTitle>
        <Badge variant="info">lvl {data.autonomy_level}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-lg font-semibold text-white/90">{data.name}</div>
          <div className="text-[11px] text-white/25 font-mono truncate">{data.instance_id}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Born" value={relTime(data.born_at)} />
          <Metric label="Cycles" value={fmt(data.cycle_count)} />
          <Metric label="Episodes" value={fmt(data.total_episodes)} />
          <Metric label="Entities" value={fmt(data.total_entities)} />
        </div>
        {affectItems.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
              Current Affect
            </div>
            <div className="grid grid-cols-2 gap-2">
              {affectItems.map(([k, v]) => (
                <div key={k} className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/30 capitalize">{k.replace(/_/g, " ")}</span>
                    <span
                      className="tabular-nums"
                      style={{ color: valenceColor(v) }}
                    >
                      {v.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(v) * 100)}%`,
                        background: valenceColor(v),
                        marginLeft: v < 0 ? `${100 - Math.abs(v) * 100}%` : "0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthCard({ data }: { data: MemoryHealthResponse }) {
  const isOk = data.status === "ok" || data.status === "healthy";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Neo4j Health</CardTitle>
        <Badge variant={isOk ? "success" : "danger"} pulse={!isOk}>
          {data.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Episodes (live)" value={fmt(data.episode_count)} />
          <Metric label="Entities (live)" value={fmt(data.entity_count)} />
          {data.latency_ms !== null && (
            <Metric label="Latency" value={`${data.latency_ms?.toFixed(0)}ms`} />
          )}
          <Metric
            label="Connected"
            value={data.neo4j_connected ? "yes" : "no"}
          />
        </div>
        {data.error && (
          <div className="text-xs text-red-400/70 mt-1">{data.error}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ConsolidationCard({
  data,
  onTrigger,
}: {
  data: MemoryConsolidationResponse | null;
  onTrigger: () => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setRunError(null);
    try {
      await onTrigger();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [onTrigger]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidation</CardTitle>
        {data?.status && (
          <Badge variant={data.status === "ok" ? "success" : data.status === "never_run" ? "muted" : "danger"}>
            {data.status}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {data && data.status !== "never_run" ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Episodes decayed" value={fmt(data.episodes_decayed)} />
            <Metric label="Entities decayed" value={fmt(data.entities_decayed)} />
            <Metric label="Communities" value={fmt(data.communities_detected)} />
            <Metric label="Compressed" value={fmt(data.episodes_compressed)} />
            <Metric label="Near-dupes" value={fmt(data.near_duplicates_flagged)} />
            {data.duration_s !== null && (
              <Metric label="Duration" value={`${data.duration_s}s`} />
            )}
          </div>
        ) : (
          <div className="text-xs text-white/25 py-2">Never run — trigger to start consolidation.</div>
        )}
        {data?.ran_at && (
          <div className="text-[10px] text-white/20">Last run {relTime(data.ran_at)}</div>
        )}
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            "w-full mt-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/50",
            "hover:border-teal-500/30 hover:text-teal-400/80 transition-all duration-150",
            "disabled:opacity-30 disabled:pointer-events-none",
          )}
        >
          {running ? "Running consolidation…" : "Run consolidation now"}
        </button>
        {runError && <div className="text-xs text-red-400/70">{runError}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Episodes Panel ─────────────────────────────────────────────

function consolidationLabel(level: number): string {
  switch (level) {
    case 0: return "raw";
    case 1: return "processed";
    case 2: return "consolidated";
    default: return String(level);
  }
}

const MODALITY_OPTIONS = ["perceptual", "linguistic", "financial", "proprioceptive", "internal", "counterfactual"] as const;

function EpisodeRow({
  ep,
  onClick,
  active,
}: {
  ep: MemoryEpisodeItem;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-all duration-150 space-y-1.5",
        active
          ? "border-teal-500/30 bg-teal-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-xs text-white/70 line-clamp-2">{ep.summary || ep.id}</div>
        <div className="flex-shrink-0 space-y-1 text-right">
          <Badge variant="muted">{ep.modality || ep.source}</Badge>
        </div>
      </div>
      <SalienceBar value={ep.salience_composite} />
      <div className="flex items-center justify-between text-[10px] text-white/25">
        <span>{relTime(ep.event_time)}</span>
        <span className="flex gap-2">
          <span>lvl:{consolidationLabel(ep.consolidation_level)}</span>
          <span>FE:{ep.free_energy.toFixed(2)}</span>
          <span
            style={{ color: valenceColor(ep.affect_valence) }}
          >
            V:{ep.affect_valence.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}

function EpisodeDetail({ ep }: { ep: MemoryEpisodeItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Episode</CardTitle>
        <Badge variant={ep.consolidation_level >= 2 ? "success" : ep.consolidation_level === 1 ? "info" : "muted"}>
          {consolidationLabel(ep.consolidation_level)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-white/70">{ep.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Source" value={ep.source} />
          <Metric label="Modality" value={ep.modality} />
          <Metric label="Salience" value={ep.salience_composite.toFixed(3)} />
          <Metric label="Free energy" value={ep.free_energy.toFixed(3)} />
          <Metric label="Valence" value={ep.affect_valence.toFixed(3)} />
          <Metric label="Arousal" value={ep.affect_arousal.toFixed(3)} />
          <Metric label="Access count" value={ep.access_count} />
          <Metric label="Event time" value={relTime(ep.event_time)} />
        </div>
        {Object.keys(ep.salience_scores).length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Salience Scores</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ep.salience_scores).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-white/30">{k}</span>
                  <span className="text-white/50 tabular-nums">{(v as number).toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-[10px] text-white/15 font-mono break-all pt-1">{ep.id}</div>
      </CardContent>
    </Card>
  );
}

function EpisodesPanel() {
  const [minSalience, setMinSalience] = useState(0);
  const [limit, setLimit] = useState(30);
  const [modality, setModality] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<MemoryEpisodeItem | null>(null);

  const episodes = useApi<MemoryEpisodeItem[]>(
    () => api.memoryEpisodes(limit, minSalience, modality),
    { intervalMs: 10000 },
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>Salience floor:</span>
          {[0, 0.2, 0.5, 0.8].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMinSalience(v)}
              className={cn(
                "px-2 py-0.5 rounded border text-xs transition-all",
                minSalience === v
                  ? "border-teal-500/50 text-teal-400"
                  : "border-white/[0.08] text-white/30 hover:text-white/60",
              )}
            >
              {v === 0 ? "all" : `≥${pct(v)}`}
            </button>
          ))}
        </div>
        {/* Modality filter */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>Modality:</span>
          <button
            type="button"
            onClick={() => setModality(undefined)}
            className={cn(
              "px-2 py-0.5 rounded border text-xs transition-all",
              modality === undefined
                ? "border-white/20 text-white/60"
                : "border-white/[0.06] text-white/25 hover:text-white/50",
            )}
          >
            All
          </button>
          {MODALITY_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModality(m)}
              className={cn(
                "px-2 py-0.5 rounded border text-xs transition-all capitalize",
                modality === m
                  ? "border-indigo-500/40 text-indigo-400"
                  : "border-white/[0.06] text-white/25 hover:text-white/50",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 ml-auto">
          <span>Limit:</span>
          {[20, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setLimit(v)}
              className={cn(
                "px-2 py-0.5 rounded border text-xs transition-all",
                limit === v
                  ? "border-white/20 text-white/60"
                  : "border-white/[0.06] text-white/25 hover:text-white/50",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Episodes</CardTitle>
            <span className="text-xs text-white/30">{episodes.data?.length ?? 0}</span>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {episodes.loading && (
              <div className="py-8 text-center text-xs text-white/20">Loading…</div>
            )}
            {!episodes.loading && (episodes.data?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-xs text-white/20">No episodes yet.</div>
            )}
            {episodes.data?.map((ep) => (
              <EpisodeRow
                key={ep.id}
                ep={ep}
                onClick={() => setSelected(ep.id === selected?.id ? null : ep)}
                active={ep.id === selected?.id}
              />
            ))}
          </CardContent>
        </Card>

        {/* Detail */}
        <div>
          {selected ? (
            <EpisodeDetail ep={selected} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-white/20 text-sm">
                Select an episode to inspect
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Entities Panel — with Graph View ───────────────────────────

interface GraphNode extends d3Force.SimulationNodeDatum {
  id: string;
  name: string;
  salience: number;
}

interface GraphLink extends d3Force.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

function EntityGraph({
  entities,
  onSelect,
}: {
  entities: MemoryEntityItem[];
  onSelect: (e: MemoryEntityItem) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string } | null>(null);

  // Limit to top-50 by salience
  const top50 = entities.slice(0, 50);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || top50.length === 0) return;

    const W = svg.clientWidth || 600;
    const H = svg.clientHeight || 400;

    const nodes: GraphNode[] = top50.map((e) => ({
      id: e.id,
      name: e.name,
      salience: e.salience_score,
    }));

    // Build edges from community_ids overlap (entities in the same community are linked)
    const links: GraphLink[] = [];
    for (let i = 0; i < top50.length; i++) {
      for (let j = i + 1; j < top50.length; j++) {
        const a = top50[i];
        const b = top50[j];
        const shared = a.community_ids.filter((cid) => b.community_ids.includes(cid)).length;
        if (shared > 0) {
          links.push({ source: a.id, target: b.id, strength: shared });
        }
      }
    }

    const sim = d3Force
      .forceSimulation<GraphNode>(nodes)
      .force("link", d3Force.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).strength((l) => Math.min(0.8, (l.strength as number) * 0.2)))
      .force("charge", d3Force.forceManyBody().strength(-60))
      .force("center", d3Force.forceCenter(W / 2, H / 2))
      .force("collision", d3Force.forceCollide<GraphNode>().radius((d) => 6 + d.salience * 14));

    // Clear previous render
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(g);

    // Draw links
    const linkEls: SVGLineElement[] = links.map((l) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", "rgba(255,255,255,0.08)");
      line.setAttribute("stroke-width", "1");
      g.appendChild(line);
      return line;
    });

    // Draw nodes
    const nodeEls: SVGCircleElement[] = nodes.map((n, i) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const r = 4 + n.salience * 12;
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", salienceColor(n.salience));
      circle.setAttribute("fill-opacity", "0.7");
      circle.setAttribute("stroke", salienceColor(n.salience));
      circle.setAttribute("stroke-width", "1");
      circle.setAttribute("cursor", "pointer");
      circle.addEventListener("mouseenter", (ev) => {
        const rect = svg.getBoundingClientRect();
        setTooltip({ x: (ev as MouseEvent).clientX - rect.left, y: (ev as MouseEvent).clientY - rect.top, name: n.name });
      });
      circle.addEventListener("mouseleave", () => setTooltip(null));
      circle.addEventListener("click", () => {
        const entity = top50[i];
        if (entity) onSelect(entity);
      });
      g.appendChild(circle);
      return circle;
    });

    sim.on("tick", () => {
      links.forEach((l, i) => {
        const src = l.source as GraphNode;
        const tgt = l.target as GraphNode;
        const el = linkEls[i];
        if (!el) return;
        el.setAttribute("x1", String(src.x ?? 0));
        el.setAttribute("y1", String(src.y ?? 0));
        el.setAttribute("x2", String(tgt.x ?? 0));
        el.setAttribute("y2", String(tgt.y ?? 0));
      });
      nodes.forEach((n, i) => {
        const el = nodeEls[i];
        if (!el) return;
        el.setAttribute("cx", String(n.x ?? 0));
        el.setAttribute("cy", String(n.y ?? 0));
      });
    });

    return () => {
      sim.stop();
    };
  }, [top50, onSelect]);

  return (
    <div className="relative w-full h-[500px] rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" />
      {tooltip && (
        <div
          className="absolute pointer-events-none text-xs text-white/80 bg-black/70 rounded px-2 py-1 border border-white/10"
          style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
        >
          {tooltip.name}
        </div>
      )}
      <div className="absolute bottom-2 right-2 text-[10px] text-white/20">
        top-{Math.min(50, top50.length)} by salience · edges = shared community
      </div>
    </div>
  );
}

function EntityRow({
  e,
  onClick,
  active,
}: {
  e: MemoryEntityItem;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-all duration-150",
        active
          ? "border-indigo-500/30 bg-indigo-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {e.is_core_identity && (
            <span className="text-[10px] text-amber-400 flex-shrink-0">&#9670;</span>
          )}
          <span className="text-sm text-white/70 font-medium truncate">{e.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-white/25">{e.type}</span>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: salienceColor(e.salience_score) }}
          >
            {e.salience_score.toFixed(2)}
          </span>
        </div>
      </div>
      {e.description && (
        <div className="mt-1 text-[11px] text-white/30 line-clamp-1">{e.description}</div>
      )}
      <div className="mt-1.5 flex gap-3 text-[10px] text-white/20">
        <span>mentions: {e.mention_count}</span>
        <span>conf: {pct(e.confidence)}</span>
        {e.community_ids.length > 0 && (
          <span>{e.community_ids.length} communities</span>
        )}
      </div>
    </div>
  );
}

function EntitiesPanel() {
  const [coreOnly, setCoreOnly] = useState(false);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<MemoryEntityItem | null>(null);
  const [graphView, setGraphView] = useState(false);

  const entities = useApi<MemoryEntityItem[]>(
    () => api.memoryEntities(limit, coreOnly),
    { intervalMs: 15000 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setCoreOnly((v) => !v)}
          className={cn(
            "px-3 py-1 rounded border text-xs transition-all",
            coreOnly
              ? "border-amber-500/40 text-amber-400"
              : "border-white/[0.08] text-white/30 hover:text-white/60",
          )}
        >
          Core identity only
        </button>
        {/* Graph / List toggle */}
        <div className="flex items-center rounded-lg border border-white/[0.08] overflow-hidden">
          <button
            type="button"
            onClick={() => setGraphView(false)}
            className={cn(
              "px-3 py-1 text-xs transition-all",
              !graphView ? "bg-white/[0.08] text-white/70" : "text-white/30 hover:text-white/60",
            )}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setGraphView(true)}
            className={cn(
              "px-3 py-1 text-xs transition-all",
              graphView ? "bg-white/[0.08] text-white/70" : "text-white/30 hover:text-white/60",
            )}
          >
            Graph
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 ml-auto">
          <span>Limit:</span>
          {[30, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setLimit(v)}
              className={cn(
                "px-2 py-0.5 rounded border text-xs transition-all",
                limit === v
                  ? "border-white/20 text-white/60"
                  : "border-white/[0.06] text-white/25 hover:text-white/50",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {graphView ? (
        <div className="space-y-4">
          <EntityGraph
            entities={entities.data ?? []}
            onSelect={(e) => setSelected(e.id === selected?.id ? null : e)}
          />
          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
                <Badge variant={selected.is_core_identity ? "warning" : "muted"}>
                  {selected.is_core_identity ? "core" : selected.type}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.description && (
                  <p className="text-sm text-white/60">{selected.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Salience" value={selected.salience_score.toFixed(3)} />
                  <Metric label="Mentions" value={selected.mention_count} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Entities</CardTitle>
              <span className="text-xs text-white/30">{entities.data?.length ?? 0} by salience</span>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {entities.loading && (
                <div className="py-8 text-center text-xs text-white/20">Loading…</div>
              )}
              {!entities.loading && (entities.data?.length ?? 0) === 0 && (
                <div className="py-8 text-center text-xs text-white/20">No entities yet.</div>
              )}
              {entities.data?.map((e) => (
                <EntityRow
                  key={e.id}
                  e={e}
                  onClick={() => setSelected(e.id === selected?.id ? null : e)}
                  active={e.id === selected?.id}
                />
              ))}
            </CardContent>
          </Card>

          <div>
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selected.name}</CardTitle>
                  <Badge variant={selected.is_core_identity ? "warning" : "muted"}>
                    {selected.is_core_identity ? "core" : selected.type}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.description && (
                    <p className="text-sm text-white/60">{selected.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Type" value={selected.type} />
                    <Metric label="Salience" value={selected.salience_score.toFixed(3)} />
                    <Metric label="Mentions" value={selected.mention_count} />
                    <Metric label="Confidence" value={pct(selected.confidence)} />
                    <Metric label="First seen" value={relTime(selected.first_seen)} />
                    <Metric label="Updated" value={relTime(selected.last_updated)} />
                  </div>
                  {selected.community_ids.length > 0 && (
                    <div className="border-t border-white/[0.06] pt-3">
                      <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
                        Communities ({selected.community_ids.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selected.community_ids.map((cid) => (
                          <span
                            key={cid}
                            className="text-[10px] font-mono text-white/30 bg-white/[0.03] rounded px-1.5 py-0.5"
                          >
                            {cid.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-white/15 font-mono break-all pt-1">
                    {selected.id}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-white/20 text-sm">
                  Select an entity to inspect
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Belief Decay Slide-over ─────────────────────────────────────

function DecayCurve({ points }: { points: MemoryDecayForecastPoint[] }) {
  if (points.length === 0) return null;

  const W = 400;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 36 };

  const maxDay = 30;
  const maxPrec = Math.max(...points.map((p) => p.projected_precision), 1);

  const xScale = (day: number) =>
    PAD.left + (day / maxDay) * (W - PAD.left - PAD.right);
  const yScale = (prec: number) =>
    PAD.top + (1 - prec / maxPrec) * (H - PAD.top - PAD.bottom);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day).toFixed(1)} ${yScale(p.projected_precision).toFixed(1)}`)
    .join(" ");

  const unreliableLine = yScale(0.3 / maxPrec * maxPrec);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Unreliable zone */}
      <rect
        x={PAD.left}
        y={yScale(0.3)}
        width={W - PAD.left - PAD.right}
        height={H - PAD.bottom - yScale(0.3) + PAD.top}
        fill="rgba(239,68,68,0.06)"
      />
      {/* Unreliable threshold line */}
      <line
        x1={PAD.left}
        y1={yScale(0.3)}
        x2={W - PAD.right}
        y2={yScale(0.3)}
        stroke="#ef4444"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text x={PAD.left + 4} y={yScale(0.3) - 3} fill="#ef4444" fillOpacity="0.5" fontSize="9">
        unreliable (&lt;0.3)
      </text>
      {/* Decay curve */}
      <path d={pathD} fill="none" stroke="#5eead4" strokeWidth="1.5" strokeOpacity="0.8" />
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* X axis labels */}
      {[0, 10, 20, 30].map((d) => (
        <text key={d} x={xScale(d)} y={H - PAD.bottom + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9">
          {d}d
        </text>
      ))}
      {/* Y axis label */}
      <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">
        {maxPrec.toFixed(1)}
      </text>
    </svg>
  );
}

function BeliefDecayPanel({
  belief,
  onClose,
}: {
  belief: MemoryBeliefItem;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<MemoryDecayForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.memBeliefDecayForecast(belief.id)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [belief.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full max-w-sm bg-[#0a0a0a] border-l border-white/[0.08] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="text-sm font-medium text-white/80">Belief Decay Forecast</div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-white/70">{belief.statement}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/30">Current precision</span>
              <span className="tabular-nums" style={{ color: salienceColor(belief.precision) }}>
                {belief.precision.toFixed(3)}
              </span>
            </div>
            <SalienceBar value={belief.precision} />
          </div>
          {belief.half_life_days !== null && (
            <div className="text-[11px] text-white/30">
              Half-life: {belief.half_life_days}d
            </div>
          )}
          <div className="border-t border-white/[0.06] pt-4">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
              30-day projection
            </div>
            {loading ? (
              <div className="text-xs text-white/20 py-4 text-center">Loading…</div>
            ) : (
              <DecayCurve points={points} />
            )}
          </div>
          {points.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[7, 14, 30].map((d) => {
                const pt = points.find((p) => p.day === d);
                return (
                  <div key={d} className="rounded border border-white/[0.06] p-2">
                    <div className="text-[10px] text-white/25">Day {d}</div>
                    <div
                      className="text-sm tabular-nums font-medium"
                      style={{ color: pt ? salienceColor(pt.projected_precision) : "rgba(255,255,255,0.3)" }}
                    >
                      {pt ? pt.projected_precision.toFixed(3) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-[10px] text-white/15 font-mono break-all">{belief.id}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Beliefs Panel ──────────────────────────────────────────────

const BELIEF_DOMAINS = ["world_model", "self_model", "social", "procedural", "parameter"] as const;

function BeliefRow({ b, onClick }: { b: MemoryBeliefItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 cursor-pointer hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white/70 flex-1">{b.statement}</p>
        <div className="flex-shrink-0 text-right space-y-1">
          <Badge variant="muted">{b.domain}</Badge>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-white/25">Precision</span>
          <span className="tabular-nums" style={{ color: salienceColor(b.precision) }}>
            {b.precision.toFixed(3)}
          </span>
        </div>
        <SalienceBar value={b.precision} />
      </div>
      <div className="flex gap-3 text-[10px] text-white/20">
        {b.half_life_days !== null && <span>half-life: {b.half_life_days}d</span>}
        <span>verified: {relTime(b.last_verified)}</span>
        <span className="text-white/15 ml-auto">click for decay forecast →</span>
      </div>
    </div>
  );
}

function BeliefsPanel() {
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [decayBelief, setDecayBelief] = useState<MemoryBeliefItem | null>(null);

  const beliefs = useApi<MemoryBeliefItem[]>(
    () => api.memoryBeliefs(domain, 50),
    { intervalMs: 20000 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setDomain(undefined)}
          className={cn(
            "px-2.5 py-1 rounded border text-xs transition-all",
            domain === undefined
              ? "border-white/20 text-white/70"
              : "border-white/[0.06] text-white/30 hover:text-white/60",
          )}
        >
          All
        </button>
        {BELIEF_DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDomain(d)}
            className={cn(
              "px-2.5 py-1 rounded border text-xs transition-all",
              domain === d
                ? "border-indigo-500/40 text-indigo-400"
                : "border-white/[0.06] text-white/30 hover:text-white/60",
            )}
          >
            {d.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beliefs</CardTitle>
          <span className="text-xs text-white/30">{beliefs.data?.length ?? 0}</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {beliefs.loading && (
            <div className="py-8 text-center text-xs text-white/20">Loading…</div>
          )}
          {!beliefs.loading && (beliefs.data?.length ?? 0) === 0 && (
            <div className="py-8 text-center text-xs text-white/20">
              No beliefs found{domain ? ` in domain "${domain}"` : ""}.
            </div>
          )}
          {beliefs.data?.map((b) => (
            <BeliefRow key={b.id} b={b} onClick={() => setDecayBelief(b)} />
          ))}
        </CardContent>
      </Card>

      {decayBelief && (
        <BeliefDecayPanel
          belief={decayBelief}
          onClose={() => setDecayBelief(null)}
        />
      )}
    </div>
  );
}

// ─── Communities Panel — with Compression ───────────────────────

function CommunityCard({
  c,
  compression,
}: {
  c: MemoryCommunityItem;
  compression: MemoryCompressionStatItem | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70 font-medium line-clamp-1">
          {c.summary || `Community ${c.id.slice(0, 8)}`}
        </div>
        <Badge variant="muted">L{c.level}</Badge>
      </div>
      <SalienceBar value={c.salience_score} />
      <div className="flex gap-3 text-[10px] text-white/25">
        <span>{c.member_count} members</span>
        <span>coherence: {c.coherence_score.toFixed(2)}</span>
        <span>recomputed: {relTime(c.last_recomputed)}</span>
      </div>
      {/* Compression stats */}
      <div className="border-t border-white/[0.04] pt-2">
        {compression ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
            <span className="text-white/20">K components</span>
            <span className="text-white/40 tabular-nums">{compression.K}</span>
            <span className="text-white/20">Variance retained</span>
            <span className="text-white/40 tabular-nums">{pct(compression.variance_retained)}</span>
            <span className="text-white/20">Quality score</span>
            <span className="text-white/40 tabular-nums">{compression.quality_score.toFixed(3)}</span>
            <span className="text-white/20">Compression ratio</span>
            <span className="text-white/40 tabular-nums">{compression.compression_ratio.toFixed(3)}</span>
          </div>
        ) : (
          <span className="text-[10px] text-white/15">Not yet compressed</span>
        )}
      </div>
    </div>
  );
}

function CommunitiesPanel() {
  const communities = useApi<MemoryCommunityItem[]>(
    () => api.memoryCommunities(30),
    { intervalMs: 30000 },
  );

  const compressionStats = useApi<MemoryCompressionStatItem[]>(
    () => api.memCompressionStats(100),
    { intervalMs: 60000 },
  );

  const compressionByCommunity = new Map<string, MemoryCompressionStatItem>(
    (compressionStats.data ?? []).map((s) => [s.community_id, s]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leiden Communities</CardTitle>
        <span className="text-xs text-white/30">{communities.data?.length ?? 0} clusters</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {communities.loading && (
          <div className="py-8 text-center text-xs text-white/20">Loading…</div>
        )}
        {!communities.loading && (communities.data?.length ?? 0) === 0 && (
          <div className="py-8 text-center text-xs text-white/20">
            No communities yet — run consolidation to detect clusters.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {communities.data?.map((c) => (
            <CommunityCard
              key={c.id}
              c={c}
              compression={compressionByCommunity.get(c.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Retrieve Panel ─────────────────────────────────────────────

function scoreVariant(score: number): string {
  if (score >= 0.7) return "#5eead4";
  if (score >= 0.4) return "#fbbf24";
  return "rgba(255,255,255,0.35)";
}

function RetrievalResultCard({ r }: { r: MemoryRetrievalResultItem }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm text-white/70">{r.content || r.node_id}</div>
        <div className="flex-shrink-0 text-right space-y-1">
          <div
            className="text-xs font-semibold tabular-nums"
            style={{ color: scoreVariant(r.unified_score) }}
          >
            {r.unified_score.toFixed(3)}
          </div>
          <Badge variant="muted">{r.node_type}</Badge>
        </div>
      </div>
      {/* Score breakdown */}
      <div className="flex gap-3 text-[10px] text-white/25">
        {r.vector_score !== null && <span>vec:{r.vector_score.toFixed(2)}</span>}
        {r.bm25_score !== null && <span>bm25:{r.bm25_score.toFixed(2)}</span>}
        {r.graph_score !== null && <span>graph:{r.graph_score.toFixed(2)}</span>}
        <span>sal:{r.salience.toFixed(2)}</span>
      </div>
      <div className="text-[10px] text-white/15 font-mono truncate">{r.node_id}</div>
    </div>
  );
}

function RetrievePanel() {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [salienceFloor, setSalienceFloor] = useState(0);
  const [includeCommunities, setIncludeCommunities] = useState(false);
  const [result, setResult] = useState<MemoryRetrievalResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api.memRetrieve({
        query: q,
        max_results: maxResults,
        salience_floor: salienceFloor,
        include_communities: includeCommunities,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }, [query, maxResults, salienceFloor, includeCommunities]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
                placeholder="Query Aurora's memory graph (vector + BM25 + graph)…"
                className={cn(
                  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03]",
                  "pl-9 pr-4 py-2.5 text-sm text-white/90 placeholder:text-white/20",
                  "focus:border-teal-500/30 focus:outline-none",
                  "transition-all duration-150",
                )}
              />
            </div>
            <button
              type="button"
              onClick={search}
              disabled={!query.trim() || searching}
              className={cn(
                "rounded-lg border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white/60",
                "hover:bg-white/[0.1] hover:text-teal-400 transition-all duration-150",
                "disabled:opacity-30 disabled:pointer-events-none",
              )}
            >
              {searching ? "…" : "Retrieve"}
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-white/35">
            <div className="flex items-center gap-1.5">
              <span>Top-K:</span>
              {[5, 10, 20].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMaxResults(v)}
                  className={cn(
                    "px-1.5 py-0.5 rounded border transition-all",
                    maxResults === v
                      ? "border-teal-500/40 text-teal-400"
                      : "border-white/[0.06] hover:text-white/60",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span>Salience floor:</span>
              {[0, 0.3, 0.6].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSalienceFloor(v)}
                  className={cn(
                    "px-1.5 py-0.5 rounded border transition-all",
                    salienceFloor === v
                      ? "border-white/20 text-white/60"
                      : "border-white/[0.06] hover:text-white/60",
                  )}
                >
                  {v === 0 ? "none" : pct(v)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIncludeCommunities((v) => !v)}
              className={cn(
                "px-2 py-0.5 rounded border transition-all",
                includeCommunities
                  ? "border-indigo-500/40 text-indigo-400"
                  : "border-white/[0.06] hover:text-white/60",
              )}
            >
              +communities
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span>{result.results.length} results</span>
            <span>{result.retrieval_time_ms}ms</span>
            {result.entity_count > 0 && <span>{result.entity_count} entities</span>}
            {result.community_count > 0 && <span>{result.community_count} communities</span>}
          </div>

          {result.results.length > 0 ? (
            <div className="space-y-2">
              {result.results.map((r) => (
                <RetrievalResultCard key={r.node_id} r={r} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-white/25">
              No memories found for &quot;{result.query}&quot;
            </div>
          )}
        </div>
      )}

      {!result && !error && !searching && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-2xl opacity-10 mb-2">~</div>
          <div className="text-sm text-white/20">
            4-leg hybrid retrieval: vector · BM25 · graph · salience
          </div>
          <div className="text-xs text-white/10 mt-1">
            Scoring: 35% vector + 20% BM25 + 20% graph + 25% salience
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Counterfactuals Panel ───────────────────────────────────────

function CounterfactualRow({
  cf,
  onClick,
  active,
}: {
  cf: MemoryCounterfactualItem;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-all duration-150 space-y-1.5",
        active
          ? "border-violet-500/30 bg-violet-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-xs text-white/70 line-clamp-2">
          {cf.summary || cf.policy_name}
        </div>
        <div className="flex-shrink-0 space-y-1 text-right">
          <Badge variant={cf.resolved ? "success" : "muted"}>
            {cf.resolved ? "resolved" : "unresolved"}
          </Badge>
        </div>
      </div>
      <div className="flex gap-3 text-[10px] text-white/25">
        <span>EFE: {cf.efe_total.toFixed(3)}</span>
        <span>chosen: {cf.chosen_policy_name || "—"}</span>
        {cf.regret !== null && (
          <span style={{ color: cf.regret > 0 ? "#f97316" : "#5eead4" }}>
            regret: {cf.regret.toFixed(3)}
          </span>
        )}
      </div>
      <div className="text-[10px] text-white/20">{relTime(cf.event_time)}</div>
    </div>
  );
}

function CounterfactualDetail({
  cf,
  onResolve,
}: {
  cf: MemoryCounterfactualItem;
  onResolve: (updated: MemoryCounterfactualItem) => void;
}) {
  const [outcomeId, setOutcomeId] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolve = useCallback(async () => {
    if (!outcomeId.trim()) return;
    setResolving(true);
    setResolveError(null);
    try {
      const updated = await api.memResolveCounterfactual(cf.id, {
        outcome_episode_id: outcomeId.trim(),
      });
      onResolve(updated);
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : String(err));
    } finally {
      setResolving(false);
    }
  }, [cf.id, outcomeId, onResolve]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Counterfactual</CardTitle>
        <Badge variant={cf.resolved ? "success" : "muted"}>
          {cf.resolved ? "resolved" : "unresolved"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-white/70">{cf.summary}</p>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Policy" value={cf.policy_name} />
          <Metric label="Type" value={cf.policy_type} />
          <Metric label="EFE total" value={cf.efe_total.toFixed(4)} />
          <Metric label="Pragmatic" value={cf.estimated_pragmatic_value.toFixed(3)} />
          <Metric label="Epistemic" value={cf.estimated_epistemic_value.toFixed(3)} />
          <Metric label="Chosen policy" value={cf.chosen_policy_name || "—"} />
          <Metric label="Chosen EFE" value={cf.chosen_efe_total.toFixed(4)} />
          <Metric label="Event time" value={relTime(cf.event_time)} />
        </div>

        {cf.resolved && (
          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">Resolution</div>
            <div className="grid grid-cols-2 gap-3">
              {cf.regret !== null && (
                <Metric label="Regret" value={cf.regret.toFixed(4)} />
              )}
              {cf.actual_outcome_success !== null && (
                <Metric
                  label="Outcome"
                  value={cf.actual_outcome_success ? "success" : "failure"}
                />
              )}
              {cf.resolved_at && (
                <Metric label="Resolved at" value={relTime(cf.resolved_at)} />
              )}
            </div>

            {cf.outcome_episode_id && (
              <div className="space-y-1">
                <div className="text-[10px] text-white/20 uppercase tracking-widest">Outcome Episode</div>
                <p className="text-xs text-white/50">{cf.outcome_episode_summary || "—"}</p>
                <div className="text-[10px] text-white/15 font-mono truncate">{cf.outcome_episode_id}</div>
              </div>
            )}
          </div>
        )}

        {!cf.resolved && (
          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <div className="text-[10px] text-white/20 uppercase tracking-widest">Link to outcome</div>
            <div className="flex gap-2">
              <input
                value={outcomeId}
                onChange={(e) => setOutcomeId(e.target.value)}
                placeholder="Outcome episode ID…"
                className={cn(
                  "flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03]",
                  "px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20",
                  "focus:border-violet-500/30 focus:outline-none transition-all",
                )}
              />
              <button
                type="button"
                onClick={handleResolve}
                disabled={!outcomeId.trim() || resolving}
                className={cn(
                  "rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/50",
                  "hover:border-violet-500/30 hover:text-violet-400 transition-all",
                  "disabled:opacity-30 disabled:pointer-events-none",
                )}
              >
                {resolving ? "Resolving…" : "Resolve"}
              </button>
            </div>
            {resolveError && (
              <div className="text-xs text-red-400/70">{resolveError}</div>
            )}
          </div>
        )}

        <div className="text-[10px] text-white/15 font-mono break-all pt-1">{cf.id}</div>
      </CardContent>
    </Card>
  );
}

function CounterfactualsPanel() {
  const [filterResolved, setFilterResolved] = useState<boolean | undefined>(undefined);
  const [selected, setSelected] = useState<MemoryCounterfactualItem | null>(null);

  const counterfactuals = useApi<MemoryCounterfactualItem[]>(
    () => api.memCounterfactuals(filterResolved, 50),
    { intervalMs: 15000 },
  );

  const handleResolve = useCallback((updated: MemoryCounterfactualItem) => {
    setSelected(updated);
    counterfactuals.refetch();
  }, [counterfactuals]);

  const unresolved = counterfactuals.data?.filter((cf) => !cf.resolved).length ?? 0;
  const resolved = counterfactuals.data?.filter((cf) => cf.resolved).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>Filter:</span>
          {([
            [undefined, "All"],
            [false, `Unresolved (${unresolved})`],
            [true, `Resolved (${resolved})`],
          ] as const).map(([val, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setFilterResolved(val as boolean | undefined)}
              className={cn(
                "px-2 py-0.5 rounded border text-xs transition-all",
                filterResolved === val
                  ? "border-violet-500/40 text-violet-400"
                  : "border-white/[0.08] text-white/30 hover:text-white/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Counterfactuals</CardTitle>
            <span className="text-xs text-white/30">{counterfactuals.data?.length ?? 0}</span>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {counterfactuals.loading && (
              <div className="py-8 text-center text-xs text-white/20">Loading…</div>
            )}
            {!counterfactuals.loading && (counterfactuals.data?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-xs text-white/20">
                No counterfactuals yet.
              </div>
            )}
            {counterfactuals.data?.map((cf) => (
              <CounterfactualRow
                key={cf.id}
                cf={cf}
                onClick={() => setSelected(cf.id === selected?.id ? null : cf)}
                active={cf.id === selected?.id}
              />
            ))}
          </CardContent>
        </Card>

        <div>
          {selected ? (
            <CounterfactualDetail cf={selected} onResolve={handleResolve} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-white/20 text-sm">
                Select a counterfactual to inspect
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function MemoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const health = useApi<MemoryHealthResponse>(api.memoryHealth, { intervalMs: 10000 });
  const stats = useApi<MemGraphStatsResponse>(api.memGraphStats, { intervalMs: 15000 });
  const self = useApi<MemorySelfResponse>(api.memorySelf, { intervalMs: 15000 });
  const constitution = useApi<MemoryConstitutionResponse>(
    api.memoryConstitution,
    { intervalMs: 30000 },
  );
  const consolidation = useApi<MemoryConsolidationResponse>(
    api.memoryConsolidation,
    { intervalMs: 15000 },
  );

  const triggerConsolidate = useCallback(async () => {
    await api.memoryTriggerConsolidate();
    consolidation.refetch();
  }, [consolidation]);

  const isConnected = health.data?.neo4j_connected === true;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Memory"
        description="Episodic · Semantic · Belief stores"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant={isConnected ? "success" : "danger"}
            pulse={!isConnected}
          >
            {isConnected ? "neo4j connected" : "neo4j offline"}
          </Badge>
          {stats.data && (
            <span className="text-xs text-white/30">
              {fmt(stats.data.cycle_count)} cycles
            </span>
          )}
        </div>
      </PageHeader>

      {/* Stats strip */}
      {stats.data && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Episodes", value: stats.data.total_episodes },
            { label: "Entities", value: stats.data.total_entities },
            { label: "Communities", value: stats.data.total_communities },
            { label: "Beliefs", value: stats.data.total_beliefs },
            { label: "Cycles", value: stats.data.cycle_count },
            {
              label: "Latency",
              value: health.data?.latency_ms !== null
                ? `${health.data?.latency_ms?.toFixed(0)}ms`
                : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center"
            >
              <div className="text-lg font-semibold text-white/70 tabular-nums">
                {typeof s.value === "number" ? fmt(s.value) : s.value}
              </div>
              <div className="text-[10px] text-white/25">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-all duration-100",
              activeTab === tab.id
                ? "bg-white/[0.08] text-white font-medium"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {self.data ? (
            <SelfCard data={self.data} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-white/20 text-sm">
                Loading self node…
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              {health.data ? (
                <HealthCard data={health.data} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-white/20 text-sm">
                    Loading health…
                  </CardContent>
                </Card>
              )}
            </div>
            <div>
              {constitution.data ? (
                <ConstitutionCard data={constitution.data} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-white/20 text-sm">
                    Loading constitution…
                  </CardContent>
                </Card>
              )}
            </div>
            <div>
              <ConsolidationCard
                data={consolidation.data ?? null}
                onTrigger={triggerConsolidate}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "episodes" && <EpisodesPanel />}
      {activeTab === "entities" && <EntitiesPanel />}
      {activeTab === "beliefs" && <BeliefsPanel />}
      {activeTab === "communities" && <CommunitiesPanel />}
      {activeTab === "retrieve" && <RetrievePanel />}
      {activeTab === "counterfactuals" && <CounterfactualsPanel />}
    </div>
  );
}
