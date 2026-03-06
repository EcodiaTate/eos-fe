"use client";

import type { SimulaVersionResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  data: SimulaVersionResponse | null;
  loading: boolean;
}

export function VersionChain({ data, loading }: Props) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Version Chain</CardTitle>
        {data && (
          <Badge variant="info">v{data.current_version}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading && !data && (
          <div className="text-sm text-white/20">Loading…</div>
        )}
        {data?.version_chain && data.version_chain.length === 0 && (
          <div className="text-center py-6 text-xs text-white/25">
            No version history. Simula has not applied any changes yet.
          </div>
        )}
        {data?.version_chain && data.version_chain.length > 0 && (
          <div className="space-y-1.5">
            {[...data.version_chain].reverse().map((v, i) => (
              <div
                key={v.version}
                className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
              >
                {/* Version badge */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full border text-xs font-bold w-7 h-7"
                  style={{
                    borderColor: i === 0 ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
                    color: i === 0 ? "rgba(129,140,248,0.8)" : "rgba(255,255,255,0.25)",
                    background: i === 0 ? "rgba(99,102,241,0.06)" : "transparent",
                  }}
                >
                  {v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-white/30">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                    {v.proposal_ids.length > 0 && (
                      <span className="text-[10px] text-white/20">
                        {v.proposal_ids.length} proposal{v.proposal_ids.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-white/20 mt-0.5 truncate">
                    {v.config_hash.slice(0, 16)}…
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
