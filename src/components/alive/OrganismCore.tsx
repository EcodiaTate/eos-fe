/**
 * EcodiaOS — OrganismCore
 *
 * The central luminous mass — the organism's body.
 * IcosahedronGeometry with custom GLSL shaders driven by affect state.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAliveStore } from "@/stores/alive-store";

// Import shaders as strings
import noiseGlsl from "./shaders/noise";
import coreVert from "./shaders/core-vert";
import coreFrag from "./shaders/core-frag";

// Prepend noise functions to vertex shader (replace placeholder)
const vertexShader = noiseGlsl + "\n" + coreVert.replace("// NOISE_PLACEHOLDER (replaced at build time by concatenation)", "");
const fragmentShader = coreFrag;

export function OrganismCore() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(1, 4),
    [],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHue: { value: 180 },
      uWarmth: { value: 0 },
      uTurbulence: { value: 0.05 },
      uScale: { value: 1.0 },
      uPulseRate: { value: 1.0 },
      uSaturation: { value: 1.0 },
      uBroadcastFlash: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (!materialRef.current) return;

    const store = useAliveStore.getState();
    const { visual, modePreset, broadcastFlash, measuredPeriodMs } = store;
    const u = materialRef.current.uniforms;

    u.uTime.value = state.clock.elapsedTime;
    u.uHue.value = visual.coreHue;
    u.uWarmth.value = visual.warmthEmission;
    u.uTurbulence.value = visual.surfaceTurbulence;
    u.uScale.value = visual.coreScale * modePreset.coreScaleMultiplier;
    u.uSaturation.value = modePreset.saturation;
    u.uBroadcastFlash.value = broadcastFlash;

    // Pulse rate: base from affect × mode multiplier, synced to measured cycle period
    const basePulseHz = 1000 / measuredPeriodMs;
    u.uPulseRate.value =
      basePulseHz * visual.pulseRate * modePreset.pulseRateMultiplier;
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
