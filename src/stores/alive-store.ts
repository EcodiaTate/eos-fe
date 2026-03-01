/**
 * EcodiaOS — Alive Zustand Store
 *
 * Central state for the organism visualization. Holds raw affect data,
 * derived visual parameters (smoothed per-frame), rhythm/mode state,
 * Oneiros sleep stage, and connection status.
 *
 * The `tick(delta)` method is called from useFrame on every render frame
 * to smoothly interpolate visual params toward their targets.
 */

import { create } from "zustand";
import type {
  AffectState,
  AliveMode,
  AxonOutcome,
  CycleCompletedData,
  ModePreset,
  OutcomesState,
  RhythmState,
  SleepStage,
  SynapseEvent,
  VisualParams,
  WorkspaceState,
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

/**
 * Compute the target hue for a given sleep stage.
 * Returns null when not in a dreaming stage (no override needed).
 */
function dreamingHueTarget(stage: SleepStage): number | null {
  switch (stage) {
    case "nrem":
      return 240; // Deep indigo — memory consolidation
    case "rem":
      // Oscillate between fuchsia and teal for vivid dreaming
      return 280 + Math.sin(Date.now() * 0.0005) * 40;
    case "lucid":
      return 50; // Golden — self-directed exploration
    case "hypnagogia":
    case "hypnopompia":
      return 260; // Violet — transitional
    default:
      return null;
  }
}

// ─── Store Interface ──────────────────────────────────────────────

interface AliveState {
  // Raw data from backend
  affect: AffectState;
  rhythmState: RhythmState;
  cycleCount: number;
  isSafeMode: boolean;

  // Oneiros sleep state (from synapse events)
  sleepStage: SleepStage;

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

  // Stage 3: real-time workspace + outcomes
  workspace: WorkspaceState | null;
  outcomes: OutcomesState | null;

  // Actions
  updateAffect: (affect: AffectState) => void;
  updateSynapseEvent: (event: SynapseEvent) => void;
  updateWorkspace: (workspace: WorkspaceState) => void;
  updateOutcomes: (outcomes: OutcomesState) => void;
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

  sleepStage: "wake" as SleepStage,

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

  workspace: null,
  outcomes: null,

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

        // Detect mode from rhythm state + current sleep stage
        const rhythmState = (data.rhythm ?? state.rhythmState) as RhythmState;
        const newMode = detectMode(rhythmState, false, state.isSafeMode, state.sleepStage);
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
            ? { mode: newMode, targetModePreset: getPreset(newMode, state.sleepStage) }
            : {}),
        });
        break;
      }

      case "rhythm_state_changed": {
        const rhythmState = (event.data.to ?? state.rhythmState) as RhythmState;
        const newMode = detectMode(rhythmState, false, state.isSafeMode, state.sleepStage);
        const modeChanged = newMode !== state.mode;
        set({
          rhythmState,
          ...(modeChanged
            ? { mode: newMode, targetModePreset: getPreset(newMode, state.sleepStage) }
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

      case "coherence_shift": {
        // Thread emits COHERENCE_SHIFT with source "thread" and a
        // thread_event_type discriminator for identity-level events.
        const threadEvent = event.data.thread_event_type as string | undefined;
        if (event.source === "thread" && threadEvent) {
          switch (threadEvent) {
            case "identity_crisis": {
              // Spike surface turbulence and pulse rate to signal inner disruption
              const crisis = {
                ...state.targetVisual,
                surfaceTurbulence: Math.min(state.targetVisual.surfaceTurbulence + 0.5, 1.0),
                pulseRate: Math.min(state.targetVisual.pulseRate * 1.6, 2.0),
                coreHue: 0, // Red hue — crisis
              };
              set({ targetVisual: crisis, broadcastFlash: 0.9 });
              break;
            }
            case "chapter_closed": {
              // Gentle golden flash — a chapter of life completes
              set({
                targetVisual: {
                  ...state.targetVisual,
                  coreHue: 50, // Golden
                  warmthEmission: Math.min(state.targetVisual.warmthEmission + 0.3, 1.0),
                },
                broadcastFlash: 0.6,
              });
              break;
            }
            case "identity_dissonance": {
              // Subtle turbulence bump — surprise at self
              set({
                targetVisual: {
                  ...state.targetVisual,
                  surfaceTurbulence: Math.min(state.targetVisual.surfaceTurbulence + 0.2, 0.8),
                },
              });
              break;
            }
          }
        }
        break;
      }

      case "system_started": {
        // Oneiros wraps all its events in SYSTEM_STARTED with source "oneiros".
        // The actual event type lives in data.oneiros_event.
        const oneirosEvent = event.data.oneiros_event as string | undefined;
        if (event.source === "oneiros" && oneirosEvent) {
          const stage = (event.data.stage as string as SleepStage) ?? state.sleepStage;

          switch (oneirosEvent) {
            case "sleep_stage_changed":
            case "sleep_onset": {
              const newMode = detectMode(state.rhythmState, false, state.isSafeMode, stage);
              const modeChanged = newMode !== state.mode;
              set({
                sleepStage: stage,
                ...(modeChanged
                  ? { mode: newMode, targetModePreset: getPreset(newMode, stage) }
                  : { targetModePreset: getPreset(state.mode, stage) }),
              });
              break;
            }
            case "wake_onset": {
              const wakeStage: SleepStage = "wake";
              const newMode = detectMode(state.rhythmState, false, state.isSafeMode, wakeStage);
              set({
                sleepStage: wakeStage,
                mode: newMode,
                targetModePreset: getPreset(newMode, wakeStage),
              });
              break;
            }
          }
        }
        break;
      }
    }
  },

  updateWorkspace: (workspace) => set({ workspace }),

  updateOutcomes: (outcomes) => set({ outcomes }),

  setConnected: (connected) => set({ connected }),

  // ─── Per-Frame Tick ───────────────────────────────────────

  tick: (delta) => {
    const state = get();

    // Frame-rate-independent smoothing
    const rate = 1 - Math.pow(1 - LERP_RATE, delta * 60);
    const modeRate = 1 - Math.pow(1 - MODE_TRANSITION_SPEED, delta);

    // Smooth visual params toward target
    const visual = lerpVisual(state.visual, state.targetVisual, rate);

    // Apply dreaming hue override when organism is sleeping
    if (state.mode === "dreaming" && state.sleepStage !== "wake") {
      const hueTarget = dreamingHueTarget(state.sleepStage);
      if (hueTarget !== null) {
        visual.coreHue = lerpValue(visual.coreHue, hueTarget, rate * 0.3);
      }
    }

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
