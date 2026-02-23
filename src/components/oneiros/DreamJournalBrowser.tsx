/**
 * EcodiaOS — DreamJournalBrowser
 *
 * Displays recent dreams in a filterable card list.
 * Dreams are classified as insight, fragment, or noise based on coherence.
 */

"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { api, type DreamResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type DreamFilter = "all" | "insight" | "fragment";

const FILTER_TABS: { id: DreamFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "insight", label: "Insights" },
  { id: "fragment", label: "Fragments" },
];

function coherenceBadgeVariant(
  coherenceClass: string,
): "success" | "warning" | "muted" {
  switch (coherenceClass) {
    case "insight":
      return "success";
    case "fragment":
      return "warning";
    default:
      return "muted";
  }
}

function coherenceColor(coherenceClass: string): string {
  switch (coherenceClass) {
    case "insight":
      return "border-teal-500/20 bg-teal-500/[0.04]";
    case "fragment":
      return "border-amber-500/20 bg-amber-500/[0.04]";
    default:
      return "border-white/[0.06] bg-white/[0.02]";
  }
}

function typeBadgeColor(dreamType: string): string {
  switch (dreamType) {
    case "narrative":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "threat_rehearsal":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "ethical_rehearsal":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "affect_processing":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-white/10 text-white/70 border-white/10";
  }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.round(diffMs / (1000 * 60));
    return `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.round(diffHours)}h ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DreamJournalBrowser() {
  const [filter, setFilter] = useState<DreamFilter>("all");
  const dreams = useApi<DreamResponse[]>(
    () => api.oneirosRecentDreams(100),
    { intervalMs: 15000 },
  );

  const filtered = useMemo(() => {
    if (!dreams.data) return [];
    if (filter === "all") return dreams.data;
    return dreams.data.filter((d) => d.coherence_class === filter);
  }, [dreams.data, filter]);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-100",
              filter === tab.id
                ? "bg-white/[0.08] text-white"
                : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]",
            )}
          >
            {tab.label}
            {dreams.data && (
              <span className="ml-1.5 text-[10px] text-white/20">
                {tab.id === "all"
                  ? dreams.data.length
                  : dreams.data.filter((d) => d.coherence_class === tab.id)
                      .length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dream list */}
      {dreams.loading && !dreams.data && (
        <div className="text-sm text-white/20 py-8 text-center">
          Loading dream journal...
        </div>
      )}

      {dreams.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          {dreams.error}
        </div>
      )}

      {filtered.length === 0 && !dreams.loading && (
        <div className="text-sm text-white/20 py-8 text-center">
          No dreams recorded yet. Dreams are generated during sleep cycles.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((dream) => (
          <Card
            key={dream.id}
            className={cn("transition-all duration-150", coherenceColor(dream.coherence_class))}
          >
            <CardHeader className="py-2.5 px-4">
              <div className="flex items-center gap-2">
                <Badge variant={coherenceBadgeVariant(dream.coherence_class)}>
                  {dream.coherence_class}
                </Badge>
                <Badge className={typeBadgeColor(dream.dream_type)}>
                  {dream.dream_type.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/25 tabular-nums">
                  {(dream.coherence_score * 100).toFixed(0)}% coherence
                </span>
                <span className="text-[10px] text-white/20">
                  {formatTimestamp(dream.timestamp)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              {/* Bridge narrative */}
              <p className="text-sm text-white/60 leading-relaxed">
                {dream.bridge_narrative}
              </p>

              {/* Themes */}
              {dream.themes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {dream.themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/30"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              {/* Affect */}
              <div className="mt-2 flex gap-4">
                <span className="text-[10px] text-white/20">
                  valence{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      dream.affect_valence > 0
                        ? "text-teal-400/60"
                        : dream.affect_valence < 0
                          ? "text-rose-400/60"
                          : "text-white/30",
                    )}
                  >
                    {dream.affect_valence > 0 ? "+" : ""}
                    {dream.affect_valence.toFixed(2)}
                  </span>
                </span>
                <span className="text-[10px] text-white/20">
                  arousal{" "}
                  <span className="font-medium text-white/40 tabular-nums">
                    {dream.affect_arousal.toFixed(2)}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
