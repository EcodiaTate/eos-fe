/**
 * EcodiaOS — Alive Zustand Store
 *
 * Central state for the organism visualization. Holds raw affect data,
 * derived visual parameters (smoothed per-frame), rhythm/mode state,
 * and connection status.
 *
 * The `tick(delta)` method is called from useFrame on every render frame
 * to smoothly interpolate visual params toward their targets.
 */

import { create } from "zustand";
import type {
  AffectState,
  AliveMode,
  CycleCompletedData,
  ModePreset,
  RhythmState,
  SynapseEvent,
  VisualParams,
} from "@/lib/types";
import { AFFECT_NEUTRAL } from "@/lib/types";
import { affectToVisual } from "@/lib/affect-mapping";
import { detectMode } from "@/lib/mode-detector";
import { getPreset } from "@/lib/mode-presets";

// Smoothing rate: ~95% converged in 0.5s at 60fps
const LERP_RATE = 0.08;

// Mode transition duration: ~2 seconds
const MODE_TRANSITION_SPEED = 0.5;

function lerpValue(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

function lerpVisual(
  current: VisualParams,
  target: VisualParams,
  rate: number,
): VisualParams {
  return {
    coreHue: lerpValue(current.coreHue, target.coreHue, rate),
    pulseRate: lerpValue(current.pulseRate, target.pulseRate, rate),
    warmthEmission: lerpValue(
      current.warmthEmission,
      target.warmthEmission,
      rate,
    ),
    tendrilReach: lerpValue(current.tendrilReach, target.tendrilReach, rate),
    surfaceTurbulence: lerpValue(
      current.surfaceTurbulence,
      target.surfaceTurbulence,
      rate,
    ),
    coreScale: lerpValue(current.coreScale, target.coreScale, rate),
    tendrilSpeed: lerpValue(current.tendrilSpeed, target.tendrilSpeed, rate),
    particleVelocity: lerpValue(
      current.particleVelocity,
      target.particleVelocity,
      rate,
    ),
  };
}

function lerpPreset(
  current: ModePreset,
  target: ModePreset,
  rate: number,
): ModePreset {
  return {
    coreScaleMultiplier: lerpValue(
      current.coreScaleMultiplier,
      target.coreScaleMultiplier,
      rate,
    ),
    bloomIntensity: lerpValue(
      current.bloomIntensity,
      target.bloomIntensity,
      rate,
    ),
    auraOpacity: lerpValue(current.auraOpacity, target.auraOpacity, rate),
    particleDensity: lerpValue(
      current.particleDensity,
      target.particleDensity,
      rate,
    ),
    tendrilCount: Math.round(
      lerpValue(current.tendrilCount, target.tendrilCount, rate),
    ),
    pulseRateMultiplier: lerpValue(
      current.pulseRateMultiplier,
      target.pulseRateMultiplier,
      rate,
    ),
    tendrilReachBoost: lerpValue(
      current.tendrilReachBoost,
      target.tendrilReachBoost,
      rate,
    ),
    saturation: lerpValue(current.saturation, target.saturation, rate),
  };
}

// ─── Store Interface ──────────────────────────────────────────────

interface AliveState {
  // Raw data from backend
  affect: AffectState;
  rhythmState: RhythmState;
  cycleCount: number;
  isSafeMode: boolean;

  // Derived visual parameters
  visual: VisualParams;
  targetVisual: VisualParams;

  // Mode
  mode: AliveMode;
  modePreset: ModePreset;
  targetModePreset: ModePreset;

  // Pulse sync: track cognitive cycle timing
  lastCycleTimes: number[];
  measuredPeriodMs: number;

  // Activity indicators
  lastBroadcastTime: number;
  broadcastFlash: number; // 0-1, decays over time

  // Connection
  connected: boolean;

  // Actions
  updateAffect: (affect: AffectState) => void;
  updateSynapseEvent: (event: SynapseEvent) => void;
  setConnected: (connected: boolean) => void;
  tick: (delta: number) => void;
}

const initialVisual = affectToVisual(AFFECT_NEUTRAL);
const initialPreset = getPreset("ambient");

export const useAliveStore = create<AliveState>()((set, get) => ({
  // Initial state
  affect: AFFECT_NEUTRAL,
  rhythmState: "idle" as RhythmState,
  cycleCount: 0,
  isSafeMode: false,

  visual: initialVisual,
  targetVisual: initialVisual,

  mode: "ambient" as AliveMode,
  modePreset: initialPreset,
  targetModePreset: initialPreset,

  lastCycleTimes: [],
  measuredPeriodMs: 150,

  lastBroadcastTime: 0,
  broadcastFlash: 0,

  connected: false,

  // ─── Actions ──────────────────────────────────────────────

  updateAffect: (affect) => {
    const targetVisual = affectToVisual(affect);
    set({ affect, targetVisual });
  },

  updateSynapseEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "cycle_completed": {
        const data = event.data as unknown as CycleCompletedData;
        const now = performance.now();

        // Update cycle timing for pulse sync
        const times = [...state.lastCycleTimes, now];
        if (times.length > 10) times.shift();

        let measuredPeriodMs = state.measuredPeriodMs;
        if (times.length >= 2) {
          const deltas: number[] = [];
          for (let i = 1; i < times.length; i++) {
            deltas.push(times[i] - times[i - 1]);
          }
          measuredPeriodMs =
            deltas.reduce((a, b) => a + b, 0) / deltas.length;
        }

        // Detect mode from rhythm state
        const rhythmState = (data.rhythm ?? state.rhythmState) as RhythmState;
        const newMode = detectMode(rhythmState, false, state.isSafeMode);
        const modeChanged = newMode !== state.mode;

        set({
          cycleCount: data.cycle,
          rhythmState,
          lastCycleTimes: times,
          measuredPeriodMs,
          // Flash on broadcast
          lastBroadcastTime: data.had_broadcast ? now : state.lastBroadcastTime,
          broadcastFlash: data.had_broadcast ? 1.0 : state.broadcastFlash,
          // Mode
          ...(modeChanged
            ? { mode: newMode, targetModePreset: getPreset(newMode) }
            : {}),
        });
        break;
      }

      case "rhythm_state_changed": {
        const rhythmState = (event.data.to ?? state.rhythmState) as RhythmState;
        const newMode = detectMode(rhythmState, false, state.isSafeMode);
        const modeChanged = newMode !== state.mode;
        set({
          rhythmState,
          ...(modeChanged
            ? { mode: newMode, targetModePreset: getPreset(newMode) }
            : {}),
        });
        break;
      }

      case "safe_mode_entered":
        set({
          isSafeMode: true,
          mode: "safe_mode",
          targetModePreset: getPreset("safe_mode"),
        });
        break;

      case "safe_mode_exited":
        set({ isSafeMode: false });
        break;

      case "coherence_shift":
        // Coherence shifts are reflected through affect state updates
        break;
    }
  },

  setConnected: (connected) => set({ connected }),

  // ─── Per-Frame Tick ───────────────────────────────────────

  tick: (delta) => {
    const state = get();

    // Frame-rate-independent smoothing
    const rate = 1 - Math.pow(1 - LERP_RATE, delta * 60);
    const modeRate = 1 - Math.pow(1 - MODE_TRANSITION_SPEED, delta);

    // Smooth visual params toward target
    const visual = lerpVisual(state.visual, state.targetVisual, rate);

    // Smooth mode preset toward target
    const modePreset = lerpPreset(
      state.modePreset,
      state.targetModePreset,
      modeRate,
    );

    // Decay broadcast flash
    const broadcastFlash = Math.max(
      0,
      state.broadcastFlash - delta * 3.0, // Decays in ~0.33s
    );

    set({ visual, modePreset, broadcastFlash });
  },
}));
