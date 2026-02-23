/**
 * EcodiaOS — Alive Mode Visual Presets
 *
 * Each interaction mode modifies the base visual parameters
 * as multipliers/overrides.
 */

import type { AliveMode, ModePreset } from "./types";

const DEFAULT_PRESET: ModePreset = {
  coreScaleMultiplier: 1.0,
  bloomIntensity: 1.5,
  auraOpacity: 0.4,
  particleDensity: 0.5,
  tendrilCount: 8,
  pulseRateMultiplier: 1.0,
  tendrilReachBoost: 0.0,
  saturation: 1.0,
};

export const MODE_PRESETS: Record<AliveMode, ModePreset> = {
  ambient: {
    coreScaleMultiplier: 0.8,
    bloomIntensity: 1.0,
    auraOpacity: 0.2,
    particleDensity: 0.1,
    tendrilCount: 4,
    pulseRateMultiplier: 1.0,
    tendrilReachBoost: 0.0,
    saturation: 1.0,
  },
  attentive: {
    coreScaleMultiplier: 1.0,
    bloomIntensity: 1.5,
    auraOpacity: 0.5,
    particleDensity: 0.5,
    tendrilCount: 8,
    pulseRateMultiplier: 1.0,
    tendrilReachBoost: 0.0,
    saturation: 1.0,
  },
  thinking: {
    coreScaleMultiplier: 1.1,
    bloomIntensity: 2.0,
    auraOpacity: 0.6,
    particleDensity: 0.3,
    tendrilCount: 8,
    pulseRateMultiplier: 0.5,
    tendrilReachBoost: 0.0,
    saturation: 1.0,
  },
  expressing: {
    coreScaleMultiplier: 1.0,
    bloomIntensity: 1.8,
    auraOpacity: 0.4,
    particleDensity: 0.4,
    tendrilCount: 10,
    pulseRateMultiplier: 1.0,
    tendrilReachBoost: 0.3,
    saturation: 1.0,
  },
  dreaming: {
    coreScaleMultiplier: 0.9,
    bloomIntensity: 2.5,
    auraOpacity: 0.8,
    particleDensity: 0.2,
    tendrilCount: 6,
    pulseRateMultiplier: 0.3,
    tendrilReachBoost: 0.0,
    saturation: 1.0,
  },
  safe_mode: {
    coreScaleMultiplier: 0.6,
    bloomIntensity: 0.5,
    auraOpacity: 0.1,
    particleDensity: 0.0,
    tendrilCount: 0,
    pulseRateMultiplier: 0.3,
    tendrilReachBoost: 0.0,
    saturation: 0.3,
  },
};

export function getPreset(mode: AliveMode): ModePreset {
  return MODE_PRESETS[mode] ?? DEFAULT_PRESET;
}
