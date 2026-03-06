// ─── Canonical urgency / status color mapping ────────────────────────────────
// Single threshold config drives both text and background variants.
// Used by SomaState, soma/page, and any other urgency-aware component.

/** Threshold boundaries for urgency levels */
export const URGENCY_THRESHOLDS = {
  critical: 0.8,
  warning: 0.5,
} as const;

/**
 * Urgency text color class.
 * @param urgency Value in [0, 1]
 */
export function urgencyColor(urgency: number): string {
  if (urgency >= URGENCY_THRESHOLDS.critical) return "text-red-400";
  if (urgency >= URGENCY_THRESHOLDS.warning) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Urgency solid background color class (for bars / indicators).
 * @param urgency Value in [0, 1]
 */
export function urgencyBg(urgency: number): string {
  if (urgency >= URGENCY_THRESHOLDS.critical) return "bg-red-500";
  if (urgency >= URGENCY_THRESHOLDS.warning) return "bg-yellow-500";
  return "bg-emerald-500";
}
