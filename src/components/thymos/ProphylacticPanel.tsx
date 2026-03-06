"use client";

import { useApi } from "@/hooks/use-api";
import { api, type ProphylacticResponse, type ProphylacticWarning } from "@/lib/api-client";
import { THYMOS_PROPHYLACTIC_POLL_MS } from "@/lib/polling-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-yellow-400" : "bg-cyan-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function WarningCard({ warning }: { warning: ProphylacticWarning }) {
  return (
    <Card className="bg-slate-800/60 border-slate-700">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-slate-400 truncate mb-1">
              {warning.filepath || "—"}
            </div>
            <div className="text-sm text-slate-200">{warning.warning}</div>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs shrink-0">
            {warning.antibody_id.slice(0, 8)}
          </Badge>
        </div>

        {warning.suggestion && (
          <div className="text-xs text-slate-400 bg-slate-900/40 rounded p-2">
            <span className="text-slate-500">Suggestion: </span>
            {warning.suggestion}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Confidence</span>
          <div className="flex-1">
            <ConfidenceBar value={warning.confidence} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProphylacticPanel() {
  const data = useApi<ProphylacticResponse>(api.thymosProphylactic, {
    intervalMs: THYMOS_PROPHYLACTIC_POLL_MS,
  });

  if (!data.data) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400">Loading prophylactic data...</div>
      </div>
    );
  }

  const { total_scans, total_warnings, warning_rate, recent_warnings } = data.data;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-700/30 border-slate-600">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{total_scans.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">Total Scans</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/30 border-slate-600">
          <CardContent className="pt-4 text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                total_warnings > 0 ? "text-amber-400" : "text-green-400"
              )}
            >
              {total_warnings.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Total Warnings</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/30 border-slate-600">
          <CardContent className="pt-4 text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                warning_rate > 0.5 ? "text-red-400" : warning_rate > 0.2 ? "text-yellow-400" : "text-green-400"
              )}
            >
              {(warning_rate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Warning Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Warning list */}
      <div>
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            🔍 Recent Warnings
            {recent_warnings.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                {recent_warnings.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        {recent_warnings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-700/20 rounded-lg border border-slate-700">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm">No prophylactic warnings detected</div>
            <div className="text-xs text-slate-500 mt-1">
              {total_scans > 0
                ? `${total_scans} files scanned, all clear`
                : "No scans have run yet"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recent_warnings.map((w, idx) => (
              <WarningCard key={`${w.antibody_id}-${idx}`} warning={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
