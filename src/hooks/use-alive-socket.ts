/**
 * EcodiaOS — Alive WebSocket Hook
 *
 * Manages the WebSocket connection to the Alive server (port 8001),
 * with automatic reconnection using exponential backoff.
 * Dispatches messages to the Zustand store.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAliveStore } from "@/stores/alive-store";
import type { WSMessage } from "@/lib/types";

/**
 * Derive WS URL from the API URL — Cloud Run only exposes one port,
 * so the WebSocket endpoint lives at /ws/alive on the same origin.
 * Falls back to localhost:8001 for local dev without env vars.
 */
function deriveWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return "ws://localhost:8001";
  // https://... → wss://... , http://... → ws://...
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase.replace(/\/+$/, "")}/ws/alive`;
}

const WS_URL = deriveWsUrl();
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

export function useAliveSocket(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  const updateAffect = useAliveStore((s) => s.updateAffect);
  const updateSynapseEvent = useAliveStore((s) => s.updateSynapseEvent);
  const setConnected = useAliveStore((s) => s.setConnected);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.stream === "affect") {
          updateAffect(msg.payload);
        } else if (msg.stream === "synapse") {
          updateSynapseEvent(msg.payload);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnect logic is there
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      if (!mountedRef.current) return;

      // Exponential backoff with jitter
      const base = RECONNECT_BASE_MS * Math.pow(2, retriesRef.current);
      const jitter = Math.random() * RECONNECT_BASE_MS;
      const delay = Math.min(base + jitter, RECONNECT_MAX_MS);
      retriesRef.current++;

      setTimeout(connect, delay);
    };
  }, [updateAffect, updateSynapseEvent, setConnected]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
