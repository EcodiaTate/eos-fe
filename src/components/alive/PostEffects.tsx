/**
 * EcodiaOS — PostEffects
 *
 * Bloom and vignette for the luminous organism aesthetic.
 * Bloom intensity adapts to the current mode preset.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useAliveStore } from "@/stores/alive-store";

export function PostEffects() {
  const bloomRef = useRef<typeof Bloom>(null);

  useFrame(() => {
    // Adapt bloom intensity to mode
    // The Bloom component's intensity is set via props, not imperatively.
    // We could use a Zustand selector here for reactive updates,
    // but bloom intensity changes are slow enough that re-renders are fine.
  });

  return <PostEffectsInner />;
}

function PostEffectsInner() {
  const bloomIntensity = useAliveStore((s) => s.modePreset.bloomIntensity);

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={0.8}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
