"use client";

import dynamic from "next/dynamic";

const AliveScene = dynamic(
  () =>
    import("@/components/alive/AliveScene").then((mod) => mod.AliveScene),
  { ssr: false },
);

export default function AlivePage() {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--organism-bg)]">
      <AliveScene />
      <a
        href="/"
        className="fixed top-4 left-4 z-50 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-all backdrop-blur-sm"
      >
        Back to Dashboard
      </a>
    </div>
  );
}
