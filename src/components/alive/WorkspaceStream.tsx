"use client";

/**
 * EcodiaOS — WorkspaceStream
 *
 * Real-time Atune perceptual workspace — shows what the organism is currently
 * considering. Reads from the Zustand alive-store (updated via /ws/alive).
 *
 * Falls back to polling /api/v1/atune/workspace-detail if the WS payload
 * hasn't arrived yet (first load / slow connection).
 */

import { useAliveStore } from "@/stores/alive-store";
import { useApi } from "@/hooks/use-api";
import { api, type WorkspaceDetailResponse } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function SalienceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const color =
    value > 0.7
      ? "bg-rose-400/60"
      : value > 0.4
        ? "bg-amber-400/50"
        : "bg-teal-400/40";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05]">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 tabular-nums w-10 text-right">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

export function WorkspaceStream() {
  // Primary: live WS data from the store
  const wsWorkspace = useAliveStore((s) => s.workspace);

  // Poll for workspace detail (content + channel) — WS only carries salience/id
  const fallback = useApi<WorkspaceDetailResponse>(api.workspaceDetail, {
    intervalMs: 5000,
  });

  // Prefer WS data — it's pushed on change; fallback for initial load
  const cycleCount = wsWorkspace?.cycle_count ?? fallback.data?.cycle_count ?? 0;
  const threshold =
    wsWorkspace?.dynamic_threshold ?? fallback.data?.dynamic_threshold ?? 0;
  const attentionMode =
    wsWorkspace?.meta_attention_mode ?? fallback.data?.meta_attention_mode ?? "—";

  // Workspace items come from the REST detail endpoint (richer: content + channel)
  // WS only carries broadcast_id + salience for bandwidth efficiency
  const wsItems = wsWorkspace?.recent_broadcasts ?? [];
  const detailItems = fallback.data?.workspace_items ?? [];

  const hasDetail = detailItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-white/25">Cycles</div>
          <div className="text-sm text-white/70 tabular-nums font-medium">
            {cycleCount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/25">Threshold</div>
          <div className="text-sm text-white/70 tabular-nums font-medium">
            {threshold.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/25">Attention</div>
          <div className="text-xs text-white/60 font-medium truncate">
            {attentionMode}
          </div>
        </div>
      </div>

      {/* Workspace items — show detail version when available */}
      <div>
        <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
          Current Workspace
        </div>

        {hasDetail ? (
          <div className="space-y-1.5">
            {detailItems.map((item, i) => (
              <div
                key={item.broadcast_id || i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="muted">{item.source}</Badge>
                    {item.channel !== "unknown" && (
                      <Badge variant="info">{item.channel}</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-white/25 tabular-nums shrink-0">
                    {item.salience.toFixed(3)}
                  </span>
                </div>
                {item.content && (
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                    {item.content}
                  </p>
                )}
                <div className="mt-1.5">
                  <SalienceBar value={item.salience} />
                </div>
              </div>
            ))}
          </div>
        ) : wsItems.length > 0 ? (
          // Fallback to WS-only data (no content, just IDs + salience)
          <div className="space-y-1.5">
            {wsItems.map((b, i) => (
              <div
                key={b.broadcast_id || i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-mono truncate max-w-[180px]">
                    {b.broadcast_id}
                  </span>
                  <Badge variant="info">{b.salience.toFixed(3)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-white/20 text-center py-6">
            No broadcasts yet. Aurora is sensory-deprived.
          </div>
        )}
      </div>
    </div>
  );
}
