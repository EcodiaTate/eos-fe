/**
 * EcodiaOS — AliveController
 *
 * Non-visual component inside the R3F Canvas that drives the Zustand
 * store's per-frame tick for smooth interpolation.
 */

import { useFrame } from "@react-three/fiber";
import { useAliveStore } from "@/stores/alive-store";

export function AliveController() {
  const tick = useAliveStore((s) => s.tick);

  useFrame((_, delta) => {
    tick(delta);
  });

  return null;
}
