"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line } from "@react-three/drei";
import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { type IncidentResponse, type CausalEdge } from "@/lib/api-client";

interface Graph3DProps {
  systems: string[];
  incidents: IncidentResponse[];
  edges?: CausalEdge[];
}

function SystemNode({
  position,
  label,
  count,
  severity,
}: {
  position: [number, number, number];
  label: string;
  count: number;
  severity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001;
      meshRef.current.rotation.y += 0.002;
      const scale = hover ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  const size = 0.3 + (count / 20) * 0.5;
  const color =
    severity >= 5
      ? "#ef4444"
      : severity >= 4
      ? "#f97316"
      : severity >= 3
      ? "#eab308"
      : severity >= 2
      ? "#3b82f6"
      : "#06b6d4";

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[size, 32, 32]}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hover ? 0.8 : 0.3}
        />
      </Sphere>
    </group>
  );
}

function IncidentParticle({
  position,
  severity,
  direction,
}: {
  position: [number, number, number];
  severity: string;
  direction: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = (clock.getElapsedTime() * 0.5) % 1;
      meshRef.current.position.x = position[0] + direction[0] * t * 2;
      meshRef.current.position.y = position[1] + direction[1] * t * 2;
      meshRef.current.position.z = position[2] + direction[2] * t * 2;
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.opacity = 1 - t;
      }
    }
  });

  const color =
    severity === "CRITICAL"
      ? "#ef4444"
      : severity === "HIGH"
      ? "#f97316"
      : severity === "MEDIUM"
      ? "#eab308"
      : "#3b82f6";

  return (
    <Sphere ref={meshRef} args={[0.08, 16, 16]} position={position}>
      <meshStandardMaterial color={color} transparent opacity={0.8} />
    </Sphere>
  );
}

function Scene({ systems, incidents, edges = [] }: Graph3DProps) {
  const systemPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    const radius = 4;
    systems.forEach((sys, idx) => {
      const angle = (idx / systems.length) * Math.PI * 2;
      positions[sys] = [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.3,
        Math.sin(angle) * radius,
      ];
    });
    return positions;
  }, [systems]);

  const systemStats = useMemo(() => {
    const stats: Record<string, { count: number; maxSeverity: number }> = {};
    systems.forEach((sys) => {
      stats[sys] = { count: 0, maxSeverity: 0 };
    });

    const severityMap: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };

    incidents.forEach((inc) => {
      if (stats[inc.source_system]) {
        stats[inc.source_system].count += 1;
        const sev = severityMap[inc.severity] ?? 0;
        stats[inc.source_system].maxSeverity = Math.max(
          stats[inc.source_system].maxSeverity,
          sev
        );
      }
    });
    return stats;
  }, [systems, incidents]);

  const particles = useMemo(() => {
    return incidents.slice(0, 20).map((inc, idx) => {
      const fromPos = systemPositions[inc.source_system] ?? [0, 0, 0];
      const toPos = systemPositions[systems[idx % systems.length]] ?? [0, 0, 0];
      const direction: [number, number, number] = [
        (toPos[0] - fromPos[0]) * 0.5,
        (toPos[1] - fromPos[1]) * 0.5,
        (toPos[2] - fromPos[2]) * 0.5,
      ];
      return {
        key: `${inc.id}-${idx}`,
        position: fromPos as [number, number, number],
        severity: inc.severity,
        direction,
      };
    });
  }, [incidents, systemPositions, systems]);

  // Build dependency edge lines from real edges prop
  const dependencyLines = useMemo(() => {
    return edges
      .filter((e) => systemPositions[e.source] && systemPositions[e.target])
      .map((e, idx) => ({
        key: `edge-${e.source}-${e.target}-${idx}`,
        from: systemPositions[e.source],
        to: systemPositions[e.target],
      }));
  }, [edges, systemPositions]);

  // Fallback: incident co-occurrence edges when no real edges provided
  const fallbackLines = useMemo(() => {
    if (edges.length > 0) return [];
    return systems.flatMap((sys1, idx1) =>
      systems.slice(idx1 + 1).flatMap((sys2) => {
        const incCount = incidents.filter(
          (i) => i.source_system === sys1 || i.source_system === sys2
        ).length;
        if (incCount === 0 || !systemPositions[sys1] || !systemPositions[sys2]) return [];
        return [{ key: `fallback-${sys1}-${sys2}`, from: systemPositions[sys1], to: systemPositions[sys2] }];
      })
    );
  }, [systems, incidents, systemPositions, edges]);

  const allLines = dependencyLines.length > 0 ? dependencyLines : fallbackLines;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {systems.map((sys) => (
        <SystemNode
          key={sys}
          position={systemPositions[sys] ?? [0, 0, 0]}
          label={sys}
          count={systemStats[sys]?.count ?? 0}
          severity={systemStats[sys]?.maxSeverity ?? 0}
        />
      ))}

      {allLines.map((line) => (
        <Line
          key={line.key}
          points={[line.from, line.to]}
          color={dependencyLines.length > 0 ? "#0e7490" : "#475569"}
          lineWidth={dependencyLines.length > 0 ? 1.5 : 0.5}
          dashed={false}
        />
      ))}

      {particles.map((p) => (
        <IncidentParticle
          key={p.key}
          position={p.position}
          severity={p.severity}
          direction={p.direction}
        />
      ))}

      <OrbitControls autoRotate autoRotateSpeed={2} />
    </>
  );
}

export default function Graph3D({ systems, incidents, edges = [] }: Graph3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#1e293b"]} />
      <Scene systems={systems} incidents={incidents} edges={edges} />
    </Canvas>
  );
}
