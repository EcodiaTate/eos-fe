/**
 * EcodiaOS — TendrilSystem
 *
 * Extending filaments that reach outward from the core.
 * Reach scales with curiosity, wave speed with arousal.
 * Each tendril is a CatmullRomCurve3 rendered as TubeGeometry.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAliveStore } from "@/stores/alive-store";

const MAX_TENDRILS = 12;
const POINTS_PER_TENDRIL = 5;
const TUBE_SEGMENTS = 16;
const MAX_REACH = 2.5;
const BASE_RADIUS = 0.015;

// Generate evenly-distributed directions on a sphere (fibonacci)
function fibonacciDirections(count: number): THREE.Vector3[] {
  const dirs: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    dirs.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius));
  }
  return dirs;
}

interface TendrilState {
  direction: THREE.Vector3;
  noiseOffset: number;
  controlPoints: THREE.Vector3[];
}

function createTendrilStates(count: number): TendrilState[] {
  const directions = fibonacciDirections(count);
  return directions.map((dir, i) => ({
    direction: dir.normalize(),
    noiseOffset: i * 17.3,
    controlPoints: Array.from({ length: POINTS_PER_TENDRIL }, (_, j) =>
      dir.clone().multiplyScalar((j / (POINTS_PER_TENDRIL - 1)) * 1.5),
    ),
  }));
}

// Simple 3D noise approximation (no GLSL needed, runs on CPU)
function noise3d(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function Tendril({ state, time, reach, speed, hue, opacity }: {
  state: TendrilState;
  time: number;
  reach: number;
  speed: number;
  hue: number;
  opacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, material } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(state.controlPoints);
    const geo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, BASE_RADIUS, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue / 360, 0.6, 0.5),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    const { direction, noiseOffset, controlPoints } = state;
    const t = time * speed;

    // Animate control points
    for (let j = 0; j < POINTS_PER_TENDRIL; j++) {
      const frac = j / (POINTS_PER_TENDRIL - 1);
      const baseDistance = frac * reach * MAX_REACH;

      // Noise-driven offset perpendicular to tendril direction
      const nx = noise3d(t * 0.5 + noiseOffset, j * 3.7, 0) * 0.3 * frac;
      const ny = noise3d(0, t * 0.5 + noiseOffset, j * 3.7) * 0.3 * frac;
      const nz = noise3d(j * 3.7, 0, t * 0.5 + noiseOffset) * 0.3 * frac;

      controlPoints[j].set(
        direction.x * baseDistance + nx,
        direction.y * baseDistance + ny,
        direction.z * baseDistance + nz,
      );
    }

    // Rebuild tube geometry from updated curve
    const curve = new THREE.CatmullRomCurve3(controlPoints);
    const newGeo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, BASE_RADIUS * (1 - 0.5 * reach), 6, false);

    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeo;

    // Update material
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.color.setHSL(hue / 360, 0.6, 0.5);
    mat.opacity = opacity * (1 - 0.3 * reach); // Dimmer when fully extended
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export function TendrilSystem() {
  const tendrilStates = useMemo(() => createTendrilStates(MAX_TENDRILS), []);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
  });

  const visual = useAliveStore((s) => s.visual);
  const modePreset = useAliveStore((s) => s.modePreset);
  const activeTendrils = Math.min(
    Math.round(modePreset.tendrilCount),
    MAX_TENDRILS,
  );

  return (
    <group>
      {tendrilStates.slice(0, activeTendrils).map((state, i) => (
        <Tendril
          key={i}
          state={state}
          time={timeRef.current}
          reach={visual.tendrilReach + modePreset.tendrilReachBoost}
          speed={visual.tendrilSpeed}
          hue={visual.coreHue}
          opacity={0.4}
        />
      ))}
    </group>
  );
}
