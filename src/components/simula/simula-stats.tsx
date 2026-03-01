"use client";

import type { SimulaStatsResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatRowProps {
  label: string;
  value: string | number;
  dim?: boolean;
}

function StatRow({ label, value, dim }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs font-medium ${dim ? "text-white/25" : "text-white/70"}`}>
        {value}
      </span>
    </div>
  );
}

interface SubsystemBadgesProps {
  systems: Record<string, boolean>;
  label: string;
}

function SubsystemBadges({ systems, label }: SubsystemBadgesProps) {
  const active = Object.entries(systems).filter(([, v]) => v);
  const inactive = Object.entries(systems).filter(([, v]) => !v);
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-white/20 uppercase tracking-widest">{label}</div>
      <div className="flex flex-wrap gap-1">
        {active.map(([k]) => (
          <Badge key={k} variant="success" className="text-[9px]">{k.replace(/_/g, " ")}</Badge>
        ))}
        {inactive.map(([k]) => (
          <Badge key={k} variant="muted" className="text-[9px] opacity-50">{k.replace(/_/g, " ")}</Badge>
        ))}
      </div>
    </div>
  );
}

interface Props {
  data: SimulaStatsResponse | null;
  loading: boolean;
}

export function SimulaStats({ data, loading }: Props) {
  return (
    <Card glow>
      <CardHeader>
        <CardTitle>Simula Stats</CardTitle>
        {data && (
          <Badge variant={data.initialized ? "success" : "danger"}>
            {data.initialized ? "online" : "offline"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading && !data && <div className="text-sm text-white/20">Loading…</div>}
        {data && (
          <div className="space-y-4">
            {/* Proposal counters */}
            <div>
              <StatRow label="Config version" value={`v${data.current_version}`} />
              <StatRow label="Active proposals" value={data.active_proposals} />
              <StatRow label="Awaiting governance" value={data.proposals_awaiting_governance} />
              <StatRow label="Received" value={data.proposals_received} />
              <StatRow label="Approved" value={data.proposals_approved} />
              <StatRow label="Rejected" value={data.proposals_rejected} />
              <StatRow label="Rolled back" value={data.proposals_rolled_back} />
              <StatRow label="Deduplicated" value={data.proposals_deduplicated} dim />
            </div>

            {/* Analytics */}
            {data.analytics && (
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 space-y-1.5">
                <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Analytics</div>
                <StatRow label="Evolution velocity" value={`${data.analytics.evolution_velocity.toFixed(2)}/day`} />
                <StatRow label="Rollback rate" value={`${(data.analytics.rollback_rate * 100).toFixed(1)}%`} />
                <StatRow
                  label="Mean sim risk"
                  value={
                    data.analytics.mean_simulation_risk < 0.33
                      ? "low"
                      : data.analytics.mean_simulation_risk < 0.66
                        ? "moderate"
                        : "high"
                  }
                />
              </div>
            )}

            {/* Subsystems */}
            {data.stage3 && <SubsystemBadges systems={data.stage3} label="Stage 3 (verification)" />}
            {data.stage4 && <SubsystemBadges systems={data.stage4} label="Stage 4 (proof/tuning)" />}
            {data.stage5 && <SubsystemBadges systems={data.stage5} label="Stage 5 (synthesis/repair)" />}
            {data.stage6 && <SubsystemBadges systems={data.stage6} label="Stage 6 (audit/coevo)" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
