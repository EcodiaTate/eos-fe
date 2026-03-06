/**
 * EcodiaOS — Affect-to-Visual Mapping
 *
 * Pure functions that convert AffectState dimensions into VisualParams
 * for the Three.js organism. Uses piecewise linear interpolation per
 * Spec 10 §3.2.
 */

import type { AffectState, VisualParams } from "./types";

/**
 * Piecewise linear interpolation with arbitrary breakpoints.
 * Breakpoints must be sorted by input value (ascending).
 */
function piecewise(value: number, breakpoints: [number, number][]): number {
  if (breakpoints.length === 0) return 0;
  if (value <= breakpoints[0][0]) return breakpoints[0][1];
  const last = breakpoints[breakpoints.length - 1];
  if (value >= last[0]) return last[1];

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [x0, y0] = breakpoints[i];
    const [x1, y1] = breakpoints[i + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return breakpoints[0][1];
}

/**
 * Map an AffectState to visual parameters.
 *
 * Mapping table (from Spec 10 §3.2):
 *
 *   valence          → coreHue:           -1→240° (blue),  0→180° (teal),  1→60° (gold)
 *   arousal          → pulseRate:          0→0.3x,  0.5→1.0x,  1.0→2.5x
 *   arousal          → tendrilSpeed:       (same as pulseRate)
 *   arousal          → particleVelocity:   (same as pulseRate)
 *   care_activation  → warmthEmission:     0→0.0,   0.5→0.3,   1.0→0.8
 *   curiosity        → tendrilReach:       0→0.3,   0.5→0.6,   1.0→1.0
 *   coherence_stress → surfaceTurbulence:  0→0.05,  0.5→0.3,   1.0→0.8
 *   confidence       → coreScale:          0→0.7,   0.5→1.0,   1.0→1.2
 */
export function affectToVisual(affect: AffectState): VisualParams {
  const arousalSpeed = piecewise(affect.arousal, [
    [0.0, 0.3],
    [0.5, 1.0],
    [1.0, 2.5],
  ]);

  return {
    coreHue: piecewise(affect.valence, [
      [-1.0, 240],
      [0.0, 180],
      [1.0, 60],
    ]),
    pulseRate: arousalSpeed,
    warmthEmission: piecewise(affect.care_activation, [
      [0.0, 0.0],
      [0.5, 0.3],
      [1.0, 0.8],
    ]),
    tendrilReach: piecewise(affect.curiosity, [
      [0.0, 0.3],
      [0.5, 0.6],
      [1.0, 1.0],
    ]),
    surfaceTurbulence: piecewise(affect.coherence_stress, [
      [0.0, 0.05],
      [0.5, 0.3],
      [1.0, 0.8],
    ]),
    coreScale: piecewise(affect.confidence, [
      [0.0, 0.7],
      [0.5, 1.0],
      [1.0, 1.2],
    ]),
    tendrilSpeed: arousalSpeed,
    particleVelocity: arousalSpeed,
  };
}
