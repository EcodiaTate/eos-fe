/**
 * EcodiaOS — SafeShell
 *
 * A semi-transparent geodesic wireframe shell that appears when the
 * organism enters safe mode — a protective cocoon.
 * Slowly rotates. Fades in/out with mode transitions.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAliveStore } from "@/stores/alive-store";

const SHELL_RADIUS = 1.8;
const ROTATION_SPEED = 0.15;

export function SafeShell() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(SHELL_RADIUS, 1),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.3, 0.35, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const { mode, modePreset } = useAliveStore.getState();
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;

    // Target opacity: visible only in safe_mode
    const targetOpacity = mode === "safe_mode" ? 0.35 : 0;
    mat.opacity += (targetOpacity - mat.opacity) * delta * 2.0;

    // Scale with mode's core scale multiplier
    const scale = modePreset.coreScaleMultiplier * 1.5;
    meshRef.current.scale.setScalar(scale);

    // Slow rotation
    meshRef.current.rotation.y += delta * ROTATION_SPEED;
    meshRef.current.rotation.x += delta * ROTATION_SPEED * 0.3;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
