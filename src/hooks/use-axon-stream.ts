"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AxonStreamOutcome } from "@/lib/api-client";
import { getApiBase } from "@/lib/api-client";

export type StreamStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseAxonStreamResult {
  outcomes: AxonStreamOutcome[];
  status: StreamStatus;
  /** Clear the local outcome buffer */
  clear: () => void;
}

const MAX_BUFFERED = 50;
const RECONNECT_DELAY_MS = 3000;

/**
 * Subscribe to the /api/v1/axon/stream SSE endpoint.
 *
 * Falls back to polling /api/v1/axon/outcomes every `pollFallbackMs` when
 * SSE fails or EventSource is unavailable.
 */
export function useAxonStream(pollFallbackMs = 5000): UseAxonStreamResult {
  const [outcomes, setOutcomes] = useState<AxonStreamOutcome[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const usingPollFallback = useRef(false);

  const pushOutcome = useCallback((outcome: AxonStreamOutcome) => {
    setOutcomes((prev) => {
      const next = [outcome, ...prev];
      return next.length > MAX_BUFFERED ? next.slice(0, MAX_BUFFERED) : next;
    });
  }, []);

  const clear = useCallback(() => setOutcomes([]), []);

  // ── Polling fallback ──────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimer.current) return;
    usingPollFallback.current = true;
    setStatus("disconnected");

    const poll = async () => {
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/v1/axon/outcomes?limit=10`);
        if (!res.ok) return;
        const data = await res.json();
        const fetched: AxonStreamOutcome[] = (data.outcomes ?? []).map(
          (o: Record<string, unknown>) => ({
            execution_id: o.execution_id as string,
            intent_id: o.intent_id as string,
            success: o.success as boolean,
            partial: o.partial as boolean,
            status: o.status as string,
            failure_reason: o.failure_reason as string | undefined,
            duration_ms: o.duration_ms as number,
            steps: o.steps as AxonStreamOutcome["steps"],
            world_state_changes: o.world_state_changes as string[] | undefined,
          })
        );
        setOutcomes(fetched);
      } catch {
        // silent — we're in fallback mode already
      }
    };

    poll();
    pollTimer.current = setInterval(poll, pollFallbackMs);
  }, [pollFallbackMs]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    usingPollFallback.current = false;
  }, []);

  // ── SSE connection ────────────────────────────────────────────
  const connect = useCallback(() => {
    if (typeof window === "undefined" || !window.EventSource) {
      startPolling();
      return;
    }

    setStatus("connecting");

    const base = getApiBase();
    const es = new EventSource(`${base}/api/v1/axon/stream`);
    esRef.current = es;

    es.addEventListener("open", () => {
      setStatus("connected");
      stopPolling();
    });

    es.addEventListener("outcome", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as AxonStreamOutcome;
        pushOutcome(payload);
      } catch {
        // malformed JSON — ignore
      }
    });

    es.addEventListener("error", () => {
      es.close();
      esRef.current = null;
      setStatus("error");
      // Schedule reconnect, fall back to polling in the meantime
      startPolling();
      reconnectTimer.current = setTimeout(() => {
        stopPolling();
        connect();
      }, RECONNECT_DELAY_MS);
    });
  }, [pushOutcome, startPolling, stopPolling]);

  useEffect(() => {
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopPolling();
    };
  }, [connect, stopPolling]);

  return { outcomes, status, clear };
}
