// ─── Canonical formatters ────────────────────────────────────────────────────
// Single source of truth for all display-formatting helpers used across pages
// and components. Import from here; never define locally.

/**
 * Format a 0–1 fraction as a percentage string.
 * Handles null/undefined gracefully (returns "—").
 * @param n       Value in [0, 1] range
 * @param decimals Number of decimal places (default 1)
 */
export function pct(n: number | undefined | null, decimals = 1): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

/**
 * Format milliseconds as a human-readable duration string.
 * Handles minutes, seconds, and sub-second values.
 */
export function fmtMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Format a USD dollar amount with adaptive precision.
 * Very small amounts show more decimals.
 */
export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n === 0) return "$0.00";
  if (Math.abs(n) < 0.001) return `$${n.toFixed(5)}`;
  if (Math.abs(n) < 0.01) return `$${n.toFixed(4)}`;
  if (Math.abs(n) < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

/**
 * Format a nat (natural unit of information) value.
 */
export function fmtNats(n: number): string {
  return `${n.toFixed(3)} nats`;
}

/**
 * Format an ISO timestamp as a relative-time string ("just now", "3m ago", etc.).
 * Returns "—" for invalid / empty input.
 */
export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffS = (Date.now() - d.getTime()) / 1_000;
  if (diffS < 60) return `${Math.round(diffS)}s ago`;
  if (diffS < 3_600) return `${Math.round(diffS / 60)}m ago`;
  if (diffS < 86_400) return `${Math.round(diffS / 3_600)}h ago`;
  return `${Math.round(diffS / 86_400)}d ago`;
}

/**
 * Format a duration in milliseconds as a human-readable string.
 * Intended for sleep/cycle durations (ms-granularity).
 */
export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

/**
 * Format a duration given in whole seconds (e.g. a TTL / remaining token time).
 * Returns "—" for null.
 */
export function fmtDurationSec(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3_600)}h`;
}

/**
 * Format a bit count with K/M suffixes.
 */
export function fmtBits(bits: number | undefined | null): string {
  const b = bits ?? 0;
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)}M bits`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K bits`;
  return `${b.toFixed(0)} bits`;
}
