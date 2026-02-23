/**
 * EcodiaOS — Alive Mode Detection
 *
 * Maps RhythmState (from Synapse) + Oneiros SleepStage + local
 * interaction state to an AliveMode for the visualization.
 */

import type { AliveMode, RhythmState, SleepStage } from "./types";

export function detectMode(
  rhythmState: RhythmState,
  isUserInteracting: boolean,
  isSafeMode: boolean,
  sleepStage?: SleepStage,
): AliveMode {
  if (isSafeMode) return "safe_mode";

  // Oneiros sleep stage takes precedence — when the organism is sleeping,
  // it IS sleeping, regardless of what the rhythm detector reports.
  if (sleepStage && sleepStage !== "wake") return "dreaming";

  if (isUserInteracting) return "attentive";
  if (rhythmState === "deep_processing" && !isUserInteracting) return "dreaming";
  if (rhythmState === "stress") return "thinking";
  if (rhythmState === "flow") return "thinking";
  if (rhythmState === "idle" || rhythmState === "boredom") return "ambient";
  return "ambient";
}
