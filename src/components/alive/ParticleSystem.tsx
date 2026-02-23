/**
 * EcodiaOS — ParticleSystem
 *
 * GPU-instanced particles representing memory activity.
 * Inward streams (memory retrieval) + outward streams (memory storage).
 * Triggered by workspace broadcast events from Synapse.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAliveStore } from "@/stores/alive-store";

const MAX_PARTICLES = 300;
const PARTICLE_RADIUS = 0.012;
const SPAWN_RADIUS = 3.0;
const CORE_RADIUS = 1.2;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  alive: boolean;
  direction: "inward" | "outward";
}

function createParticlePool(): Particle[] {
  return Array.from({ length: MAX_PARTICLES }, () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    age: 0,
    maxAge: 2,
    alive: false,
    direction: "inward" as const,
  }));
}

function spawnInward(particle: Particle): void {
  // Start at random position on outer sphere, move toward core
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = SPAWN_RADIUS;
  particle.position.set(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );
  // Velocity toward origin with some spread
  const speed = 0.8 + Math.random() * 0.6;
  particle.velocity
    .copy(particle.position)
    .normalize()
    .multiplyScalar(-speed);
  // Add slight tangential drift
  particle.velocity.x += (Math.random() - 0.5) * 0.2;
  particle.velocity.y += (Math.random() - 0.5) * 0.2;
  particle.velocity.z += (Math.random() - 0.5) * 0.2;

  particle.age = 0;
  particle.maxAge = 1.5 + Math.random() * 1.5;
  particle.alive = true;
  particle.direction = "inward";
}

function spawnOutward(particle: Particle): void {
  // Start near core, move outward
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = CORE_RADIUS * 0.5;
  particle.position.set(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );
  const speed = 0.6 + Math.random() * 0.5;
  particle.velocity
    .copy(particle.position)
    .normalize()
    .multiplyScalar(speed);
  particle.velocity.x += (Math.random() - 0.5) * 0.3;
  particle.velocity.y += (Math.random() - 0.5) * 0.3;
  particle.velocity.z += (Math.random() - 0.5) * 0.3;

  particle.age = 0;
  particle.maxAge = 2.0 + Math.random() * 1.0;
  particle.alive = true;
  particle.direction = "outward";
}

export function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(createParticlePool, []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const lastBroadcastRef = useRef(0);
  const spawnAccumulatorRef = useRef(0);

  const geometry = useMemo(
    () => new THREE.SphereGeometry(PARTICLE_RADIUS, 6, 6),
    [],
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const store = useAliveStore.getState();
    const { visual, modePreset, lastBroadcastTime } = store;
    const hue = visual.coreHue;

    // Spawn particles on new broadcast events
    if (lastBroadcastTime > lastBroadcastRef.current) {
      lastBroadcastRef.current = lastBroadcastTime;
      // Burst spawn: 10-20 inward particles
      const burstCount = 10 + Math.floor(Math.random() * 10);
      let spawned = 0;
      for (const p of particles) {
        if (!p.alive && spawned < burstCount) {
          spawnInward(p);
          spawned++;
        }
      }
    }

    // Ambient particle spawn rate based on mode
    spawnAccumulatorRef.current += delta * modePreset.particleDensity * 5;
    while (spawnAccumulatorRef.current >= 1) {
      spawnAccumulatorRef.current -= 1;
      for (const p of particles) {
        if (!p.alive) {
          if (Math.random() > 0.5) spawnInward(p);
          else spawnOutward(p);
          break;
        }
      }
    }

    // Update particles
    const speedMul = visual.particleVelocity;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (p.alive) {
        p.age += delta;
        if (p.age >= p.maxAge) {
          p.alive = false;
        } else {
          // Move
          p.position.addScaledVector(p.velocity, delta * speedMul);

          // Kill if too far or reached core
          const dist = p.position.length();
          if (p.direction === "inward" && dist < CORE_RADIUS * 0.3) {
            p.alive = false;
          }
          if (p.direction === "outward" && dist > SPAWN_RADIUS * 1.2) {
            p.alive = false;
          }
        }
      }

      // Update instance matrix
      if (p.alive) {
        const lifeFrac = p.age / p.maxAge;
        const scale = 1.0 - lifeFrac * 0.5; // Shrink as they age
        tempMatrix.makeScale(scale, scale, scale);
        tempMatrix.setPosition(p.position);
      } else {
        // Hide dead particles far away
        tempMatrix.makeScale(0, 0, 0);
        tempMatrix.setPosition(0, 100, 0);
      }
      meshRef.current.setMatrixAt(i, tempMatrix);

      // Color: match core hue with fade
      if (p.alive) {
        const lifeFrac = p.age / p.maxAge;
        tempColor.setHSL(hue / 360, 0.7, 0.6 * (1 - lifeFrac * 0.7));
      } else {
        tempColor.setRGB(0, 0, 0);
      }
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, MAX_PARTICLES]}
    >
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
