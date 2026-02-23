/**
 * EcodiaOS — Aura
 *
 * A large transparent sphere surrounding the core that renders
 * an atmospheric glow. Color from valence, turbulence from
 * coherence_stress, opacity from mode preset.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAliveStore } from "@/stores/alive-store";
import auraVert from "./shaders/aura-vert";
import auraFrag from "./shaders/aura-frag";

const AURA_RADIUS = 3.0;

export function Aura() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(
    () => new THREE.SphereGeometry(AURA_RADIUS, 32, 32),
    [],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHue: { value: 180 },
      uTurbulence: { value: 0.05 },
      uOpacity: { value: 0.3 },
      uSaturation: { value: 1.0 },
    }),
    [],
  );

  useFrame((state) => {
    if (!materialRef.current) return;

    const store = useAliveStore.getState();
    const u = materialRef.current.uniforms;

    u.uTime.value = state.clock.elapsedTime;
    u.uHue.value = store.visual.coreHue;
    u.uTurbulence.value = store.visual.surfaceTurbulence;
    u.uOpacity.value = store.modePreset.auraOpacity;
    u.uSaturation.value = store.modePreset.saturation;
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={auraVert}
        fragmentShader={auraFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
