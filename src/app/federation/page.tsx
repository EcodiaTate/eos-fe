"use client";

import { useApi } from "@/hooks/use-api";
import {
  api,
  type FederationIdentityResponse,
  type FederationLinksResponse,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FederationPage() {
  const identity = useApi<FederationIdentityResponse>(api.federationIdentity, {
    intervalMs: 60000,
  });
  const links = useApi<FederationLinksResponse>(api.federationLinks, {
    intervalMs: 15000,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Federation"
        description="Multi-instance network — consent-based knowledge exchange"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity Card */}
        <Card glow>
          <CardHeader>
            <CardTitle>Identity Card</CardTitle>
          </CardHeader>
          <CardContent>
            {identity.data ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-white/25">Name</div>
                  <div className="text-sm text-white/80 font-medium">
                    {identity.data.name}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/25">Description</div>
                  <div className="text-xs text-white/50">
                    {identity.data.description || "No description set"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-white/25">Instance ID</div>
                    <div className="text-xs text-white/40 font-mono truncate">
                      {identity.data.instance_id}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">
                      Autonomy Level
                    </div>
                    <div className="text-xs text-white/60">
                      {identity.data.autonomy_level}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Protocol</div>
                    <div className="text-xs text-white/40">
                      v{identity.data.protocol_version}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/25">Born</div>
                    <div className="text-xs text-white/40">
                      {identity.data.born_at
                        ? new Date(identity.data.born_at).toLocaleDateString()
                        : "Unknown"}
                    </div>
                  </div>
                </div>

                {(identity.data.capabilities?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">
                      Capabilities
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {identity.data.capabilities.map((cap) => (
                        <Badge key={cap} variant="muted">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Federation Links */}
        <Card>
          <CardHeader>
            <CardTitle>Federation Links</CardTitle>
            {links.data && (
              <Badge variant="muted">{links.data.total_active} active</Badge>
            )}
          </CardHeader>
          <CardContent>
            {links.data ? (
              (links.data.links?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {links.data.links.map((link) => (
                    <div
                      key={link.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm text-white/70 font-medium">
                            {link.remote_name}
                          </div>
                          <div className="text-[10px] text-white/30 font-mono">
                            {link.remote_instance_id}
                          </div>
                        </div>
                        <Badge
                          variant={
                            link.status === "active"
                              ? "success"
                              : link.status === "pending"
                                ? "info"
                                : "muted"
                          }
                        >
                          {link.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Badge variant="info">{link.trust_level}</Badge>
                        <span className="text-[10px] text-white/20">
                          score: {link.trust_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-white/20">
                          shared: {link.shared_knowledge_count}
                        </span>
                        <span className="text-[10px] text-white/20">
                          received: {link.received_knowledge_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="text-2xl opacity-10 mb-2">~</div>
                  <div className="text-xs text-white/25">
                    No federation links. Aurora is alone.
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-white/20">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
