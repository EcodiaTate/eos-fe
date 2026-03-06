"use client";

import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SimulaVersionChainItem } from "@/lib/api-client";

function VersionNode({ item, isCurrent }: { item: SimulaVersionChainItem; isCurrent: boolean }) {
  return (
    <div className={`flex items-start gap-4 ${isCurrent ? "" : "opacity-60"}`}>
      {/* connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
            isCurrent
              ? "bg-violet-400 border-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]"
              : "bg-slate-700 border-slate-600"
          }`}
        />
        <div className="w-px flex-1 bg-slate-700 min-h-[2rem]" />
      </div>
      {/* content */}
      <div className={`rounded-lg border p-3 mb-3 flex-1 ${isCurrent ? "border-violet-700/50 bg-violet-900/10" : "border-slate-700 bg-slate-800/40"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`font-bold ${isCurrent ? "text-violet-300" : "text-white/60"}`}>
            v{item.version}
            {isCurrent && <span className="ml-2 text-[11px] font-normal px-1.5 py-0.5 bg-violet-700/50 rounded text-violet-200">current</span>}
          </span>
          <span className="text-[11px] text-white/30">{new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-white/40">
          <span>{item.proposal_count} proposal{item.proposal_count !== 1 ? "s" : ""}</span>
          {item.config_hash && (
            <span className="font-mono truncate max-w-[120px]">{item.config_hash.slice(0, 8)}…</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SimulaVersion() {
  const { data, loading, error } = useApi(() => api.simulaVersionDetail(), { intervalMs: 15000 });

  if (loading) return <div className="text-white/40 text-sm">Loading version chain…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const chain = [...data.chain].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-6">
      {/* Current version hero */}
      <div className="rounded-xl border border-violet-700/40 bg-violet-900/10 p-6 text-center">
        <div className="text-xs text-white/40 mb-1">Current Version</div>
        <div className="text-5xl font-bold text-violet-300">v{data.current_version}</div>
        <div className="text-xs text-white/30 mt-2">{chain.length} version{chain.length !== 1 ? "s" : ""} in chain</div>
      </div>

      {/* Version timeline */}
      {chain.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="text-sm font-medium text-white/60 mb-4">Version Chain</div>
          <div>
            {chain.map((item) => (
              <VersionNode key={item.version} item={item} isCurrent={item.version === data.current_version} />
            ))}
            {/* genesis cap */}
            <div className="flex items-center gap-4 opacity-40">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-500" />
              </div>
              <span className="text-[11px] text-white/30 mb-3">genesis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
