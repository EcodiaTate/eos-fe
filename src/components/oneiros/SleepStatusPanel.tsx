/**
 * EcodiaOS — SleepStatusPanel
 *
 * Displays the current sleep/wake state of the Dream Engine:
 * - Current stage with colored indicator
 * - Sleep pressure gauge
 * - Wake degradation effects
 * - Last sleep cycle summary
 * - Next sleep estimate
 */

"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type OneirosHealthResponse,
  type SleepCycleResponse,
} from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { stageColor } from "@/lib/oneiros-stages";

function pressureColor(pressure: number): string {
  if (pressure >= 0.95) return "bg-red-500";
  if (pressure >= 0.7) return "bg-amber-500";
  if (pressure >= 0.4) return "bg-teal-500";
  return "bg-sky-500";
}

function pressureLabel(pressure: number): string {
  if (pressure >= 0.95) return "Critical";
  if (pressure >= 0.7) return "High";
  if (pressure >= 0.4) return "Moderate";
  return "Low";
}

function formatDuration(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

interface DegradationEffectProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function DegradationBar({ label, value, maxValue, color }: DegradationEffectProps) {
  const pct = Math.min(100, (value / maxValue) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30">{label}</span>
        <span className="text-[10px] text-white/40 tabular-nums">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SleepStatusPanel() {
  const health = useApi<OneirosHealthResponse>(api.oneirosHealth, {
    intervalMs: 3000,
  });
  const cycles = useApi<SleepCycleResponse[]>(
    () => api.oneirosSleepCycles(1),
    { intervalMs: 15000 },
  );

  if (!health.data) {
    return (
      <div className="text-sm text-white/20 py-8 text-center">
        Loading sleep status...
      </div>
    );
  }

  if (health.error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
        {health.error}
      </div>
    );
  }

  const data = health.data;
  const stage = stageColor(data.current_stage);
  const lastCycle = cycles.data?.[0] ?? null;
  const isSleeping = data.current_stage.toUpperCase() !== "WAKE";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Current Stage</CardTitle>
            <Badge variant={isSleeping ? "info" : "default"} pulse={isSleeping}>
              {isSleeping ? "Sleeping" : "Awake"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-4 w-4 rounded-full transition-all duration-500",
                  stage.bg,
                  stage.glow,
                )}
              />
              <span className={cn("text-lg font-semibold", stage.text)}>
                {stage.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-white/25">Sleep Cycles</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {data.total_sleep_cycles}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Total Dreams</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {data.total_dreams}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Total Insights</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {data.total_insights}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Mean Coherence</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {(data.mean_dream_coherence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Pressure */}
        <Card>
          <CardHeader>
            <CardTitle>Sleep Pressure</CardTitle>
            <span className="text-[10px] text-white/20">
              {pressureLabel(data.sleep_pressure)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold text-white/80 tabular-nums">
                {(data.sleep_pressure * 100).toFixed(0)}%
              </div>
              <div className="flex-1 pb-1.5">
                <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      pressureColor(data.sleep_pressure),
                    )}
                    style={{ width: `${data.sleep_pressure * 100}%` }}
                  />
                </div>
                {/* Threshold markers */}
                <div className="relative mt-1 h-1">
                  <div
                    className="absolute h-1 w-px bg-amber-500/40"
                    style={{ left: "70%" }}
                    title="Sleep threshold (0.70)"
                  />
                  <div
                    className="absolute h-1 w-px bg-red-500/40"
                    style={{ left: "95%" }}
                    title="Critical threshold (0.95)"
                  />
                </div>
              </div>
            </div>
            {data.sleep_pressure >= 0.7 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[11px] text-amber-400">
                Sleep pressure above threshold. Sleep cycle imminent.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wake Degradation */}
        <Card>
          <CardHeader>
            <CardTitle>Wake Degradation</CardTitle>
            <span className="text-[10px] text-white/20">
              Sleep debt effects
            </span>
          </CardHeader>
          <CardContent>
            {data.wake_degradation > 0 ? (
              <div className="space-y-2.5">
                <DegradationBar
                  label="Salience Noise"
                  value={data.wake_degradation * 0.15}
                  maxValue={0.15}
                  color="bg-amber-500/70"
                />
                <DegradationBar
                  label="EFE Precision Loss"
                  value={data.wake_degradation * 0.20}
                  maxValue={0.20}
                  color="bg-orange-500/70"
                />
                <DegradationBar
                  label="Expression Flatness"
                  value={data.wake_degradation * 0.25}
                  maxValue={0.25}
                  color="bg-rose-500/70"
                />
                <DegradationBar
                  label="Learning Rate Loss"
                  value={data.wake_degradation * 0.30}
                  maxValue={0.30}
                  color="bg-red-500/70"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 py-3">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <span className="text-sm text-teal-400/70">
                  No degradation — well rested
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Sleep Cycle */}
      {lastCycle && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sleep Cycle</CardTitle>
            <span className="text-[10px] text-white/20">
              {lastCycle.completed_at
                ? formatDuration(lastCycle.completed_at)
                : "In progress"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-[10px] text-white/25">Quality</div>
                <Badge
                  variant={
                    lastCycle.quality === "excellent"
                      ? "success"
                      : lastCycle.quality === "poor"
                        ? "danger"
                        : "default"
                  }
                >
                  {lastCycle.quality}
                </Badge>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Episodes Replayed</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {lastCycle.episodes_replayed}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Dreams Generated</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {lastCycle.dreams_generated}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Insights Discovered</div>
                <div className="text-sm text-white/70 tabular-nums font-medium">
                  {lastCycle.insights_discovered}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/25">Pressure Reduction</div>
                <div className="text-sm text-teal-400/70 tabular-nums font-medium">
                  {((lastCycle.pressure_before - lastCycle.pressure_after) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
