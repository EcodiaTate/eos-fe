/**
 * EcodiaOS — AliveScene
 *
 * Root React Three Fiber canvas that hosts the organism visualization.
 * Mounts the WebSocket hook, per-frame controller, all visual components,
 * and post-processing effects.
 */

"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useAliveSocket } from "@/hooks/use-alive-socket";
import { AliveController } from "./AliveController";
import { OrganismCore } from "./OrganismCore";
import { TendrilSystem } from "./TendrilSystem";
import { Aura } from "./Aura";
import { ParticleSystem } from "./ParticleSystem";
import { SafeShell } from "./SafeShell";
import { PostEffects } from "./PostEffects";
import { ConnectionIndicator } from "./ConnectionIndicator";

export function AliveScene() {
  // Establish WebSocket connection to the Alive server
  useAliveSocket();

  return (
    <div className="relative w-full h-full" style={{ background: "#050510" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#050510"]} />
        <Suspense fallback={null}>
          <AliveController />
          <Aura />
          <OrganismCore />
          <TendrilSystem />
          <ParticleSystem />
          <SafeShell />
          <PostEffects />
        </Suspense>
      </Canvas>
      <ConnectionIndicator />
    </div>
  );
}
