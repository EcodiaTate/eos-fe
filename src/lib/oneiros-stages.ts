// ─── Canonical Oneiros sleep stage color mapping ─────────────────────────────
// Used by SleepStatusPanel and app/page.tsx (dashboard OneirosCard).
// Returns a structured object with bg, text, glow, and label values.
// v2 stages: WAKE → DESCENT → SLOW_WAVE → REM (with LUCID sub-mode) → EMERGENCE → WAKE

export interface StageColors {
  bg: string;
  text: string;
  glow: string;
  label: string;
}

/**
 * Map a sleep stage identifier to a raw hex color string.
 * Use this when setting inline `style={{ background: ... }}` or `style={{ color: ... }}`.
 * Stage matching is case-insensitive.
 */
export function stageHex(stage: string): string {
  switch (stage.toLowerCase()) {
    case "descent":    return "#a78bfa"; // Violet
    case "slow_wave":  return "#818cf8"; // Indigo
    case "rem":        return "#e879f9"; // Fuchsia
    case "lucid":      return "#fbbf24"; // Amber (REM sub-mode)
    case "emergence":  return "#fb923c"; // Orange
    default:           return "#38bdf8"; // Sky (wake)
  }
}

/**
 * Map a sleep stage identifier (case-insensitive) to its display colors.
 */
export function stageColor(stage: string): StageColors {
  switch (stage.toUpperCase()) {
    case "WAKE":
      return {
        bg: "bg-sky-500",
        text: "text-sky-400",
        glow: "shadow-[0_0_12px_rgba(56,189,248,0.3)]",
        label: "Awake",
      };
    case "DESCENT":
      return {
        bg: "bg-violet-500",
        text: "text-violet-400",
        glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
        label: "Falling Asleep",
      };
    case "SLOW_WAVE":
      return {
        bg: "bg-indigo-600",
        text: "text-indigo-400",
        glow: "shadow-[0_0_12px_rgba(99,102,241,0.3)]",
        label: "Deep Sleep",
      };
    case "REM":
      return {
        bg: "bg-fuchsia-500",
        text: "text-fuchsia-400",
        glow: "shadow-[0_0_12px_rgba(217,70,239,0.3)]",
        label: "Dreaming (REM)",
      };
    case "LUCID":
      return {
        bg: "bg-amber-400",
        text: "text-amber-300",
        glow: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
        label: "Lucid Dreaming",
      };
    case "EMERGENCE":
      return {
        bg: "bg-orange-400",
        text: "text-orange-400",
        glow: "shadow-[0_0_12px_rgba(251,146,60,0.3)]",
        label: "Waking Up",
      };
    default:
      return {
        bg: "bg-white/20",
        text: "text-white/40",
        glow: "",
        label: stage,
      };
  }
}
