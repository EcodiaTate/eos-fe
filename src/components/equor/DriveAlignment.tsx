"use client";

import { type GovernanceReviewsResponse } from "@/lib/api-client";

type DriveScores = GovernanceReviewsResponse["recent_reviews"][number]["drive_alignment"];

const DRIVE_META: Record<
  keyof DriveScores,
  { color: string; label: string; description: string }
> = {
  coherence: {
    color: "#60a5fa",
    label: "Coherence",
    description: "Clarity & reasoning",
  },
  care: {
    color: "#34d399",
    label: "Care",
    description: "Wellbeing & harm prevention",
  },
  growth: {
    color: "#a78bfa",
    label: "Growth",
    description: "Learning & discovery",
  },
  honesty: {
    color: "#fbbf24",
    label: "Honesty",
    description: "Transparency & calibration",
  },
};

function DriveBar({ drive, score }: { drive: keyof DriveScores; score: number }) {
  const meta = DRIVE_META[drive];
  // Score is -1 to +1; map to 0–100% with midpoint at 50%
  const pct = ((score + 1) / 2) * 100;
  const isNeg = score < 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[10px] text-white/25 ml-1.5">{meta.description}</span>
        </div>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: isNeg ? "#f87171" : meta.color }}
        >
          {score >= 0 ? "+" : ""}
          {score.toFixed(3)}
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-white/[0.05]">
        {/* Midpoint marker */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
        {/* Score fill */}
        {isNeg ? (
          <div
            className="absolute h-full rounded-full"
            style={{
              right: "50%",
              width: `${Math.abs(score) * 50}%`,
              background: "#f87171",
              opacity: 0.8,
            }}
          />
        ) : (
          <div
            className="absolute h-full rounded-full"
            style={{
              left: "50%",
              width: `${score * 50}%`,
              background: meta.color,
              opacity: 0.8,
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Sparkline showing drive trend over recent reviews */
function DriveTrend({
  reviews,
  drive,
}: {
  reviews: GovernanceReviewsResponse["recent_reviews"];
  drive: keyof DriveScores;
}) {
  const meta = DRIVE_META[drive];
  const values = reviews
    .slice()
    .reverse()
    .map((r) => r.drive_alignment[drive]);
  if (values.length < 2) return null;

  const W = 120;
  const H = 32;
  const min = Math.min(...values, -1);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={meta.color}
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export function DriveAlignmentPanel({
  reviews,
}: {
  reviews: GovernanceReviewsResponse["recent_reviews"] | null;
}) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-white/20">
        No reviews yet — drive alignment data will appear here.
      </div>
    );
  }

  // Compute running averages
  const avg: DriveScores = {
    coherence: 0,
    care: 0,
    growth: 0,
    honesty: 0,
  };
  for (const r of reviews) {
    for (const d of Object.keys(avg) as (keyof DriveScores)[]) {
      avg[d] += r.drive_alignment[d];
    }
  }
  for (const d of Object.keys(avg) as (keyof DriveScores)[]) {
    avg[d] = avg[d] / reviews.length;
  }

  // Overall composite (equal weight)
  const composite = (avg.coherence + avg.care + avg.growth + avg.honesty) / 4;

  return (
    <div className="space-y-5">
      {/* Composite score */}
      <div className="flex items-center gap-4 pb-3 border-b border-white/[0.06]">
        <div
          className="text-3xl font-mono tabular-nums font-bold"
          style={{
            color: composite >= 0.3 ? "#34d399" : composite >= 0 ? "#fbbf24" : "#f87171",
          }}
        >
          {composite >= 0 ? "+" : ""}
          {composite.toFixed(3)}
        </div>
        <div>
          <div className="text-xs text-white/50">Mean alignment</div>
          <div className="text-[10px] text-white/25">over {reviews.length} recent review{reviews.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Per-drive bars */}
      <div className="space-y-3">
        {(Object.keys(avg) as (keyof DriveScores)[]).map((drive) => (
          <DriveBar key={drive} drive={drive} score={avg[drive]} />
        ))}
      </div>

      {/* Trend sparklines */}
      {reviews.length >= 3 && (
        <div>
          <div className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Trend</div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(avg) as (keyof DriveScores)[]).map((drive) => (
              <div key={drive} className="flex items-end gap-2">
                <div className="text-[9px] text-white/25 w-14">{DRIVE_META[drive].label}</div>
                <DriveTrend reviews={reviews} drive={drive} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
