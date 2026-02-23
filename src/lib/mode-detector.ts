/**
 * EcodiaOS — Alive Mode Detection
 *
 * Maps RhythmState (from Synapse) + local interaction state
 * to an AliveMode for the visualization.
 */

import type { AliveMode, RhythmState } from "./types";

export function detectMode(
  rhythmState: RhythmState,
  isUserInteracting: boolean,
  isSafeMode: boolean,
): AliveMode {
  if (isSafeMode) return "safe_mode";
  if (rhythmState === "deep_processing" && !isUserInteracting) return "dreaming";
  if (isUserInteracting) return "attentive";
  if (rhythmState === "stress") return "thinking";
  if (rhythmState === "flow") return "thinking";
  if (rhythmState === "idle" || rhythmState === "boredom") return "ambient";
  return "ambient";
}
