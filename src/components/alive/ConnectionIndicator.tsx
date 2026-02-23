/**
 * EcodiaOS — ConnectionIndicator
 *
 * Subtle overlay showing connection status.
 * When disconnected, the organism fades to a dim breathing state.
 * This component renders an HTML overlay outside the Canvas.
 */

"use client";

import { useAliveStore } from "@/stores/alive-store";

export function ConnectionIndicator() {
  const connected = useAliveStore((s) => s.connected);

  if (connected) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 16px",
        borderRadius: 8,
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(8px)",
        color: "rgba(255, 255, 255, 0.4)",
        fontSize: 12,
        fontFamily: "system-ui, sans-serif",
        letterSpacing: "0.05em",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      connecting...
    </div>
  );
}
