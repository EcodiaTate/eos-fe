"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getApiBase, type IncidentStreamEvent } from "@/lib/api-client";
import { THYMOS_MAX_STREAM_EVENTS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

const MAX_EVENTS = THYMOS_MAX_STREAM_EVENTS;

function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/20 text-red-300 border-red-500/50";
    case "HIGH":
      return "bg-orange-500/20 text-orange-300 border-orange-500/50";
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
    case "LOW":
      return "bg-blue-500/20 text-blue-300 border-blue-500/50";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/50";
  }
}

function severityDot(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "LOW":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={cn("w-2 h-2 rounded-full", {
          "bg-green-400 animate-pulse": status === "connected",
          "bg-yellow-400 animate-ping": status === "reconnecting",
          "bg-red-400": status === "disconnected",
        })}
      />
      <span
        className={cn({
          "text-green-400": status === "connected",
          "text-yellow-400": status === "reconnecting",
          "text-red-400": status === "disconnected",
        })}
      >
        {status === "connected"
          ? "Live"
          : status === "reconnecting"
          ? "Reconnecting…"
          : "Disconnected"}
      </span>
    </div>
  );
}

interface StreamedEvent extends IncidentStreamEvent {
  _key: string;
  _new: boolean;
}

export function IncidentStream() {
  const [events, setEvents] = useState<StreamedEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [paused, setPaused] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pausedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  pausedRef.current = paused;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus("reconnecting");

    const url = `${getApiBase()}/api/v1/thymos/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setStatus("connected");
    };

    es.onmessage = (e: MessageEvent<string>) => {
      if (pausedRef.current) return;
      try {
        const data = JSON.parse(e.data) as IncidentStreamEvent;
        const entry: StreamedEvent = {
          ...data,
          _key: `${data.id}-${Date.now()}`,
          _new: true,
        };
        setEvents((prev) => {
          const next = [entry, ...prev].slice(0, MAX_EVENTS);
          // Clear _new flag after animation would complete
          setTimeout(() => {
            setEvents((p) =>
              p.map((ev) => (ev._key === entry._key ? { ...ev, _new: false } : ev))
            );
          }, 600);
          return next;
        });

        // Auto-scroll to top
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setStatus("reconnecting");
      es.close();
      esRef.current = null;
      // Reconnect after 3s
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  const handlePauseToggle = () => {
    setPaused((p) => !p);
  };

  const handleClear = () => {
    setEvents([]);
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center gap-3">
        <StatusIndicator status={status} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{events.length} events</span>
          <button
            onClick={handlePauseToggle}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all",
              paused
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stream feed */}
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
            📡 Real-time incident feed
            {paused && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                PAUSED
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div
            ref={scrollRef}
            className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
          >
            {events.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-3xl mb-3">📡</div>
                <div className="text-sm">
                  {status === "connected"
                    ? "Listening for incidents…"
                    : status === "reconnecting"
                    ? "Connecting to stream…"
                    : "Stream disconnected"}
                </div>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event._key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-slate-700/50 transition-all duration-500",
                    event._new
                      ? "bg-slate-700/60 border-slate-500/50"
                      : "bg-slate-800/40"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", severityDot(event.severity))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={cn("border text-xs", severityColor(event.severity))}>
                        {event.severity}
                      </Badge>
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        {event.source_system}
                      </span>
                      <span className="text-xs text-slate-500">
                        {event.incident_class.replace(/_/g, " ")}
                      </span>
                      <span className="ml-auto text-xs font-mono text-slate-500 shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {event.error_type}
                      {event.repair_tier && (
                        <span className="text-slate-500 ml-2">→ {event.repair_tier}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
