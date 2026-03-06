// ─── Canonical Soma dimension metadata ───────────────────────────────────────
// Single definition used by SomaSomaticBody and any future visualisation that
// renders the 9 interoceptive dimensions. Import DIM_META from here.

export interface DimMeta {
  label: string;
  icon: string;
  color: string;
  glow: string;
  desc: string;
  range: [number, number];
}

export const DIM_META: Record<string, DimMeta> = {
  energy:            { label: "Energy",           icon: "⚡", color: "#22d3ee", glow: "rgba(34,211,238,0.25)",   desc: "Metabolic budget",             range: [0, 1] },
  arousal:           { label: "Arousal",           icon: "◉", color: "#f59e0b", glow: "rgba(245,158,11,0.25)",   desc: "Activation level",             range: [0, 1] },
  valence:           { label: "Valence",           icon: "↕", color: "#818cf8", glow: "rgba(129,140,248,0.25)",  desc: "Net allostatic trend",         range: [-1, 1] },
  confidence:        { label: "Confidence",        icon: "◎", color: "#5eead4", glow: "rgba(94,234,212,0.25)",   desc: "Generative model fit",         range: [0, 1] },
  coherence:         { label: "Coherence",         icon: "⊙", color: "#a78bfa", glow: "rgba(167,139,250,0.25)",  desc: "Inter-system integration",     range: [0, 1] },
  social_charge:     { label: "Social Charge",     icon: "♡", color: "#f472b6", glow: "rgba(244,114,182,0.25)",  desc: "Relational engagement",        range: [0, 1] },
  curiosity_drive:   { label: "Curiosity Drive",   icon: "◈", color: "#c084fc", glow: "rgba(192,132,252,0.25)",  desc: "Epistemic appetite",           range: [0, 1] },
  integrity:         { label: "Integrity",         icon: "⊕", color: "#34d399", glow: "rgba(52,211,153,0.25)",   desc: "Constitutional alignment",     range: [0, 1] },
  temporal_pressure: { label: "Temporal Pressure", icon: "⏱", color: "#fb923c", glow: "rgba(251,146,60,0.25)",   desc: "Urgency / time compression",   range: [0, 1] },
};
