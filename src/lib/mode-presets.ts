/**
 * EcodiaOS — Alive Mode Visual Presets
 *
 * Each interaction mode modifies the base visual parameters
 * as multipliers/overrides. Dream stages layer additional
 * overrides on the base dreaming preset.
 */

import type { AliveMode, ModePreset, SleepStage } from "./types";

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

/**
 * Stage-specific overrides layered on top of the dreaming base preset.
 * Each stage only overrides the properties that differ — the rest
 * inherit from MODE_PRESETS.dreaming.
 */
const DREAM_STAGE_OVERRIDES: Partial<Record<SleepStage, Partial<ModePreset>>> = {
  hypnagogia: {
    coreScaleMultiplier: 0.95,
    bloomIntensity: 1.8,
    auraOpacity: 0.5,
    pulseRateMultiplier: 0.5,
    saturation: 0.7,
  },
  nrem: {
    coreScaleMultiplier: 0.85,
    bloomIntensity: 2.0,
    auraOpacity: 0.9,
    particleDensity: 0.1,
    tendrilCount: 4,
    pulseRateMultiplier: 0.2,
    tendrilReachBoost: -0.1,
    saturation: 0.4,
  },
  rem: {
    coreScaleMultiplier: 0.9,
    bloomIntensity: 2.8,
    auraOpacity: 0.7,
    particleDensity: 0.4,
    tendrilCount: 8,
    pulseRateMultiplier: 0.5,
    tendrilReachBoost: 0.2,
    saturation: 0.8,
  },
  lucid: {
    coreScaleMultiplier: 0.95,
    bloomIntensity: 3.0,
    auraOpacity: 0.85,
    particleDensity: 0.3,
    tendrilCount: 6,
    pulseRateMultiplier: 0.4,
    tendrilReachBoost: 0.15,
    saturation: 0.6,
  },
  hypnopompia: {
    coreScaleMultiplier: 0.92,
    bloomIntensity: 2.2,
    auraOpacity: 0.6,
    pulseRateMultiplier: 0.6,
    saturation: 0.8,
  },
};

export function getPreset(mode: AliveMode, sleepStage?: SleepStage): ModePreset {
  const base = MODE_PRESETS[mode] ?? DEFAULT_PRESET;

  // Apply stage-specific overrides when in dreaming mode
  if (mode === "dreaming" && sleepStage && sleepStage !== "wake") {
    const overrides = DREAM_STAGE_OVERRIDES[sleepStage];
    if (overrides) {
      return { ...base, ...overrides };
    }
  }

  return base;
}
