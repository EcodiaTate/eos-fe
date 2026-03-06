"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SomaActiveEmotion } from "@/lib/api-client";

// Canonical emotion configuration — colors, icons for the 9 emotion regions
const EMOTION_CONFIG: Record<string, { color: string; hex: string; bg: string; border: string; glyph: string }> = {
  anxiety:         { color: "text-red-300",     hex: "#fca5a5", bg: "bg-red-500/15",     border: "border-red-500/30",    glyph: "⚡" },
  flow:            { color: "text-emerald-300",  hex: "#6ee7b7", bg: "bg-emerald-500/15", border: "border-emerald-500/30",glyph: "◎" },
  curiosity:       { color: "text-cyan-300",     hex: "#67e8f9", bg: "bg-cyan-500/15",    border: "border-cyan-500/30",   glyph: "◈" },
  moral_discomfort:{ color: "text-orange-300",   hex: "#fdba74", bg: "bg-orange-500/15",  border: "border-orange-500/30", glyph: "⊗" },
  loneliness:      { color: "text-violet-300",   hex: "#c4b5fd", bg: "bg-violet-500/15",  border: "border-violet-500/30", glyph: "◌" },
  relief:          { color: "text-teal-300",     hex: "#5eead4", bg: "bg-teal-500/15",    border: "border-teal-500/30",   glyph: "↓" },
  wonder:          { color: "text-fuchsia-300",  hex: "#f0abfc", bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30",glyph: "✦" },
  frustration:     { color: "text-yellow-300",   hex: "#fde047", bg: "bg-yellow-500/15",  border: "border-yellow-500/30", glyph: "⊞" },
  gratitude:       { color: "text-pink-300",     hex: "#f9a8d4", bg: "bg-pink-500/15",    border: "border-pink-500/30",   glyph: "♡" },
};

const DEFAULT_EMOTION_CONFIG = { color: "text-white/50", hex: "#94a3b8", bg: "bg-slate-700/40", border: "border-slate-600/30", glyph: "○" };

function getConfig(name: string) {
  return EMOTION_CONFIG[name] ?? DEFAULT_EMOTION_CONFIG;
}

// Radial "emotion presence" ring — intensity as arc fill
function IntensityRing({ intensity, color }: { intensity: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = circ * intensity;

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
      {/* Track */}
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      {/* Fill */}
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ * 0.25}
        className={color}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function EmotionCard({ emotion, rank }: { emotion: SomaActiveEmotion; rank: number }) {
  const cfg = getConfig(emotion.name);
  const pct = Math.round(emotion.intensity * 100);

  return (
    <div
      className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} transition-all`}
      style={{
        boxShadow: emotion.should_highlight
          ? `0 0 20px rgba(var(--emotion-glow, 255,255,255), ${emotion.intensity * 0.15})`
          : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <IntensityRing intensity={emotion.intensity} color={cfg.color} />

        <div className="flex-1 min-w-0">
          {/* Name + glyph */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-base font-semibold ${cfg.color} capitalize`}>
              {emotion.name.replace(/_/g, " ")}
            </span>
            <span className={`text-lg ${cfg.color} opacity-60`}>{cfg.glyph}</span>
            {rank === 0 && (
              <span className="ml-auto text-[9px] text-white/25 uppercase tracking-widest">dominant</span>
            )}
          </div>

          {/* Description */}
          <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
            {emotion.description}
          </p>

          {/* Intensity bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/25">intensity</span>
              <span className={`font-mono font-semibold ${cfg.color}`}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: cfg.hex, opacity: 0.8 }}
              />
            </div>
          </div>

          {/* Matching dimensions */}
          {emotion.matching_dimensions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {emotion.matching_dimensions.map((dim) => (
                <span
                  key={dim}
                  className={`px-1.5 py-0.5 rounded text-[9px] border ${cfg.bg} ${cfg.border} ${cfg.color} capitalize`}
                >
                  {dim.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Error-space overlap visualization — a 2D projection of which emotions are overlapping
function OverlapMap({ emotions }: { emotions: SomaActiveEmotion[] }) {
  if (emotions.length < 2) return null;

  // Simple layout: place emotions as circles in a 2D space based on intensity
  // Use a fixed mapping of emotion names to quadrant positions
  const POSITIONS: Record<string, [number, number]> = {
    flow:             [50, 30],
    curiosity:        [70, 25],
    wonder:           [80, 45],
    gratitude:        [65, 60],
    relief:           [45, 65],
    loneliness:       [25, 60],
    moral_discomfort: [20, 40],
    frustration:      [30, 20],
    anxiety:          [50, 15],
  };

  const width = 300;
  const height = 180;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
      <div className="text-[11px] text-white/20 uppercase tracking-widest mb-3">
        Error-space overlap
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: 180 }}
      >
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={`h${f}`}
            x1="0" y1={height * f} x2={width} y2={height * f}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={`v${f}`}
            x1={width * f} y1="0" x2={width * f} y2={height}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* Emotion blobs */}
        {emotions.map((emotion) => {
          const [px, py] = POSITIONS[emotion.name] ?? [50, 50];
          const x = (px / 100) * width;
          const y = (py / 100) * height;
          const r = 15 + emotion.intensity * 25;
          const cfg = getConfig(emotion.name);

          return (
            <g key={emotion.name}>
              {/* Outer glow */}
              <circle
                cx={x} cy={y} r={r + 4}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className={cfg.color}
                opacity={emotion.intensity * 0.3}
              />
              {/* Fill blob */}
              <circle
                cx={x} cy={y} r={r}
                className={cfg.color}
                opacity={emotion.intensity * 0.25}
                fill="currentColor"
              />
              {/* Label */}
              <text
                x={x} y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.5)"
                className="pointer-events-none"
              >
                {emotion.name.replace(/_/g, " ").slice(0, 8)}
              </text>
              {/* Intensity pct */}
              <text
                x={x} y={y + 11}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="rgba(255,255,255,0.25)"
                className="pointer-events-none"
              >
                {Math.round(emotion.intensity * 100)}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] text-white/15 mt-1 text-center">
        Blob size = intensity · Position = error-space quadrant
      </div>
    </div>
  );
}

export function SomaEmotions() {
  const { data, loading, error } = useApi(() => api.somaEmotions(), { intervalMs: 2000 });

  if (loading) return <div className="text-white/40 text-sm">Detecting emotion regions…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const emotions = data.emotions ?? [];

  if (data.status === "no_state") {
    return (
      <div className="text-center py-12 text-white/30">
        <div className="text-4xl mb-3">○</div>
        <p className="text-sm">No interoceptive state yet. Soma has not run a cycle.</p>
      </div>
    );
  }

  if (emotions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-4xl">◎</div>
          <div className="text-emerald-400 font-medium">Neutral — no emotion patterns detected</div>
          <p className="text-sm text-white/30">
            All allostatic errors near setpoint. The organism is in quiescent equilibrium.
          </p>
        </div>
        <div className="flex justify-end">
          <div className="text-[11px] text-white/20">
            Urgency: {(data.urgency * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-white/20 uppercase tracking-widest mb-1">
            Active Emotion Regions ({emotions.length})
          </div>
          <p className="text-xs text-white/30">
            Overlapping regions in 9D allostatic error space — multiple active simultaneously
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white/20 uppercase tracking-widest">Urgency</div>
          <div className={`text-xl font-bold tabular-nums ${
            data.urgency >= 0.6 ? "text-red-400" : data.urgency >= 0.35 ? "text-yellow-400" : "text-emerald-400"
          }`}>
            {(data.urgency * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Overlap map */}
      <OverlapMap emotions={emotions} />

      {/* Emotion cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {emotions.map((emotion, i) => (
          <EmotionCard key={emotion.name} emotion={emotion} rank={i} />
        ))}
      </div>

      {/* Quiescent dimensions */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 p-3">
        <div className="text-[10px] text-white/20 uppercase tracking-widest">
          Theory — how emotion regions work
        </div>
        <p className="text-[11px] text-white/30 mt-1 leading-relaxed">
          Emotions are not labels — they are regions in 9D allostatic error space.
          When current prediction errors match a region's pattern (positive error, negative error, near-zero),
          that emotion is "felt" with intensity proportional to how well the pattern matches.
          Multiple emotions can be active simultaneously. Evo refines these boundaries over time.
        </p>
      </div>
    </div>
  );
}
