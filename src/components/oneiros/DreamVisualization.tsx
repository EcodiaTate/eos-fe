/**
 * EcodiaOS — DreamVisualization
 *
 * Three.js particle visualization driven by dream stage.
 * Uses React Three Fiber, matching the OrganismCore pattern.
 *
 * - WAKE: hidden (returns null)
 * - DESCENT: slow, violet fading-in particles (entering sleep)
 * - SLOW_WAVE: slow, deep blue pulsing particles (memory consolidation)
 * - REM: colorful, fast, chaotic particles connecting (dreaming)
 * - LUCID: bright, structured, golden connections (REM sub-mode)
 * - EMERGENCE: slow, fading-out orange particles (waking)
 *
 * Shader uniforms: dreamStage, coherence, affect
 */

"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Suspense } from "react";
import { useApi } from "@/hooks/use-api";
import { api, type OneirosHealthResponse } from "@/lib/api-client";

// ─── Shader Sources ──────────────────────────────────────────────

const dreamVertexShader = /* glsl */ `
uniform float uTime;
uniform float uStage;     // 0=SLOW_WAVE, 1=REM, 2=LUCID
uniform float uCoherence;
uniform float uAffect;

attribute float aRandom;
attribute float aPhase;

varying float vAlpha;
varying float vStage;
varying float vRandom;

// Simple 3D noise for displacement
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * vec3(2.0, 1.0, 0.0) - vec3(1.0, 0.0, 0.5);
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x2_ = x_ * ns.x + ns.yyyy;
  vec4 y2_ = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);
  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vStage = uStage;
  vRandom = aRandom;

  vec3 pos = position;

  // SLOW_WAVE: slow, deep breathing motion
  float nremSpeed = 0.3;
  float nremDisplace = snoise(pos * 0.5 + uTime * nremSpeed) * 0.3;

  // REM: fast, chaotic motion
  float remSpeed = 1.5 + uAffect * 0.5;
  float remDisplace = snoise(pos * 1.2 + uTime * remSpeed) * 0.8;

  // LUCID: structured, golden flow
  float lucidSpeed = 0.7;
  float lucidDisplace = snoise(pos * 0.8 + uTime * lucidSpeed) * 0.4 * uCoherence;

  // Blend based on stage
  float displacement = mix(
    mix(nremDisplace, remDisplace, clamp(uStage, 0.0, 1.0)),
    lucidDisplace,
    clamp(uStage - 1.0, 0.0, 1.0)
  );

  pos += normalize(pos) * displacement;

  // Per-particle orbit
  float angle = uTime * (0.2 + aRandom * 0.3) * (1.0 + uStage * 0.5) + aPhase;
  float radius = length(pos);
  pos.x += sin(angle) * 0.1 * radius;
  pos.z += cos(angle) * 0.1 * radius;

  // Alpha: fade based on distance and coherence
  float dist = length(pos);
  vAlpha = smoothstep(3.0, 0.5, dist) * (0.4 + uCoherence * 0.6);

  // Size varies by stage: SLOW_WAVE=larger/softer, REM=medium/varied, LUCID=smaller/bright
  float stageSize = mix(mix(3.0, 2.0, clamp(uStage, 0.0, 1.0)), 1.5, clamp(uStage - 1.0, 0.0, 1.0));
  gl_PointSize = stageSize * (1.0 + aRandom * 0.5);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const dreamFragmentShader = /* glsl */ `
uniform float uStage;
uniform float uCoherence;

varying float vAlpha;
varying float vStage;
varying float vRandom;

void main() {
  // Soft circular point
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;

  // SLOW_WAVE: deep blue/indigo
  vec3 nremColor = mix(
    vec3(0.1, 0.15, 0.45),
    vec3(0.2, 0.25, 0.65),
    vRandom
  );

  // REM: vivid, varied colors (fuchsia, teal, orange)
  vec3 remColor = mix(
    mix(vec3(0.7, 0.2, 0.6), vec3(0.2, 0.7, 0.6), vRandom),
    vec3(0.9, 0.5, 0.2),
    step(0.7, vRandom)
  );

  // LUCID: golden/white
  vec3 lucidColor = mix(
    vec3(0.95, 0.8, 0.3),
    vec3(1.0, 0.95, 0.85),
    uCoherence
  );

  // Blend by stage
  vec3 color = mix(
    mix(nremColor, remColor, clamp(vStage, 0.0, 1.0)),
    lucidColor,
    clamp(vStage - 1.0, 0.0, 1.0)
  );

  gl_FragColor = vec4(color, alpha);
}
`;

// ─── Particle Cloud ──────────────────────────────────────────────

const PARTICLE_COUNT = 800;

interface DreamParticlesProps {
  stage: number;
  coherence: number;
  affect: number;
}

function DreamParticles({ stage, coherence, affect }: DreamParticlesProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.5 + Math.random() * 2.0;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      randoms[i] = Math.random();
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const u = {
      uTime: { value: 0 },
      uStage: { value: 0 },
      uCoherence: { value: 0.5 },
      uAffect: { value: 0 },
    };

    return { geometry: geo, uniforms: u };
  }, []);

  useFrame((state) => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    // Smooth transitions
    u.uStage.value += (stage - u.uStage.value) * 0.05;
    u.uCoherence.value += (coherence - u.uCoherence.value) * 0.05;
    u.uAffect.value += (affect - u.uAffect.value) * 0.05;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={dreamVertexShader}
        fragmentShader={dreamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene Wrapper ───────────────────────────────────────────────

function stageToFloat(stage: string): number {
  switch (stage.toUpperCase()) {
    case "DESCENT":
    case "SLOW_WAVE":
    case "EMERGENCE":
      return 0;
    case "REM":
      return 1;
    case "LUCID":
      return 2;
    default:
      return 0;
  }
}

function DreamScene({
  stage,
  coherence,
  affect,
}: {
  stage: string;
  coherence: number;
  affect: number;
}) {
  const stageFloat = stageToFloat(stage);

  return (
    <>
      <color attach="background" args={["#050510"]} />
      <DreamParticles
        stage={stageFloat}
        coherence={coherence}
        affect={affect}
      />
    </>
  );
}

// ─── Exported Component ──────────────────────────────────────────

export function DreamVisualization() {
  const health = useApi<OneirosHealthResponse>(api.oneirosHealth, {
    intervalMs: 3000,
  });

  const data = health.data;
  const stage = data?.current_stage?.toUpperCase() ?? "WAKE";
  const isAsleep = stage !== "WAKE";

  if (!isAsleep) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <span className="text-sm text-white/20">
          Dream visualization activates during sleep cycles.
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-white/[0.06]"
      style={{ height: 400, background: "#050510" }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <DreamScene
            stage={stage}
            coherence={data?.mean_dream_coherence ?? 0.5}
            affect={data?.sleep_pressure ?? 0}
          />
        </Suspense>
      </Canvas>

      {/* Stage overlay label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-current animate-pulse text-indigo-400" />
        <span className="text-[11px] font-medium text-white/40">
          {stage === "DESCENT" && "Entering sleep..."}
          {stage === "SLOW_WAVE" && "Consolidating memories..."}
          {stage === "REM" && "Dreaming..."}
          {stage === "LUCID" && "Lucid exploration..."}
          {stage === "EMERGENCE" && "Emerging from sleep..."}
        </span>
      </div>
    </div>
  );
}
