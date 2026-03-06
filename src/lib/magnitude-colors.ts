// ─── Canonical magnitude / signal color helpers ──────────────────────────────
// Used by Soma sub-components (SomaErrors, SomaPredictions, SomaVulnerability,
// SomaSignal). Import from here; never define locally.

/**
 * Solid pill / dot color for a magnitude in [0, 1].
 * Returns a Tailwind bg-* class.
 */
export function magnitudeColor(m: number): string {
  if (m >= 0.7) return "bg-red-500";
  if (m >= 0.4) return "bg-orange-500";
  if (m >= 0.2) return "bg-yellow-500";
  return "bg-slate-500";
}

/**
 * Translucent card background + border for a magnitude in [0, 1].
 * Returns combined Tailwind bg and border classes.
 */
export function magnitudeBg(m: number): string {
  if (m >= 0.7) return "bg-red-500/20 border-red-500/30";
  if (m >= 0.4) return "bg-orange-500/20 border-orange-500/30";
  if (m >= 0.2) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-slate-700/40 border-slate-600/30";
}

/**
 * Solid pill color for a signed prediction error.
 * Positive errors are warm (over-shooting), negative are cool (under-shooting).
 * Returns a Tailwind bg-* class.
 */
export function errorColor(err: number | null): string {
  if (err === null) return "bg-slate-700";
  const abs = Math.abs(err);
  if (abs >= 0.35) return err > 0 ? "bg-red-500" : "bg-blue-500";
  if (abs >= 0.2) return err > 0 ? "bg-orange-500" : "bg-cyan-500";
  if (abs >= 0.08) return err > 0 ? "bg-yellow-500" : "bg-teal-500";
  return "bg-slate-600";
}

/**
 * Text color for a curvature / vulnerability value in [0, 1].
 * Returns a Tailwind text-* class.
 */
export function curvatureColor(v: number | null): string {
  if (v === null) return "text-white/30";
  if (v >= 0.7) return "text-red-400";
  if (v >= 0.4) return "text-orange-400";
  if (v >= 0.2) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Outer glow + border ring classes for signal strength in [0, 1].
 * Returns combined Tailwind shadow and border classes.
 */
export function strengthRing(s: number): string {
  if (s >= 0.75)
    return "shadow-[0_0_40px_rgba(248,113,113,0.4)] border-red-500/50";
  if (s >= 0.5)
    return "shadow-[0_0_40px_rgba(234,179,8,0.4)] border-yellow-500/50";
  if (s >= 0.25)
    return "shadow-[0_0_40px_rgba(34,211,238,0.4)] border-cyan-500/50";
  return "shadow-[0_0_40px_rgba(52,211,153,0.4)] border-emerald-500/50";
}
