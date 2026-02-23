"use client";

import { useCallback, useState } from "react";
import { api, type MemoryRetrieveResponse, type MemoryStatsResponse } from "@/lib/api-client";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export default function MemoryPage() {
  const stats = useApi<MemoryStatsResponse>(api.memoryStats, {
    intervalMs: 15000,
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryRetrieveResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);
    try {
      const res = await api.memoryRetrieve(q);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Memory"
        description="Query Aurora's knowledge graph"
      />

      {/* Stats */}
      {stats.data && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Nodes", value: stats.data.node_count },
            { label: "Edges", value: stats.data.edge_count },
            { label: "Entities", value: stats.data.entity_count },
            { label: "Episodes", value: stats.data.episode_count },
            { label: "Hypotheses", value: stats.data.hypothesis_count },
            { label: "Procedures", value: stats.data.procedure_count },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center"
            >
              <div className="text-lg font-semibold text-white/70 tabular-nums">
                {s.value}
              </div>
              <div className="text-[10px] text-white/25">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 mb-6">
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
            placeholder="Search memories..."
            className={cn(
              "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-2.5 text-sm text-white/90",
              "placeholder:text-white/20",
              "focus:border-white/15 focus:outline-none focus:ring-1 focus:ring-teal-400/20",
              "transition-all duration-150",
            )}
          />
        </div>
        <button
          onClick={search}
          disabled={!query.trim() || searching}
          className={cn(
            "rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white/60",
            "hover:bg-white/[0.1] hover:text-white/80",
            "disabled:opacity-30 disabled:pointer-events-none",
            "transition-all duration-150",
          )}
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Traces */}
          {(results.traces?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Memory Traces</CardTitle>
                <Badge variant="muted">{results.traces?.length ?? 0}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.traces.map((trace) => (
                  <div
                    key={trace.node_id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-white/70 flex-1 whitespace-pre-wrap">
                        {trace.content}
                      </div>
                      <Badge variant="info">
                        {trace.salience_composite.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[10px] text-white/20 font-mono">
                      {trace.node_id}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Entities */}
          {(results.entities?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Entities</CardTitle>
                <Badge variant="muted">{results.entities?.length ?? 0}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {results.entities.map((entity, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/50"
                    >
                      <pre className="whitespace-pre-wrap overflow-hidden">
                        {JSON.stringify(entity, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(results.traces?.length ?? 0) === 0 && (results.entities?.length ?? 0) === 0 && (
            <div className="text-center py-12 text-sm text-white/25">
              No memories found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {!results && !error && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-2xl opacity-10 mb-2">~</div>
          <div className="text-sm text-white/20">
            Search Aurora&apos;s knowledge graph
          </div>
          <div className="text-xs text-white/10 mt-1">
            Episodes, entities, communities, and relations
          </div>
        </div>
      )}
    </div>
  );
}
