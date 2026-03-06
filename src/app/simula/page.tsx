"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SimulaStatus } from "@/components/simula/SimulaStatus";
import { SimulaAnalytics } from "@/components/simula/SimulaAnalytics";
import { SimulaProposals } from "@/components/simula/SimulaProposals";
import { SimulaHistory } from "@/components/simula/SimulaHistory";
import { SimulaInspector } from "@/components/simula/SimulaInspector";
import { SimulaVersion } from "@/components/simula/SimulaVersion";

type Tab = "status" | "analytics" | "proposals" | "history" | "inspector" | "version";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "status", label: "Status", icon: "⚙️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "proposals", label: "Proposals", icon: "📋" },
  { id: "history", label: "History", icon: "📜" },
  { id: "inspector", label: "Inspector", icon: "🔍" },
  { id: "version", label: "Version", icon: "🔖" },
];

export default function SimulaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("status");

  return (
    <>
      <PageHeader
        title="Simula — Self-Evolution Engine"
        description="Code generation, hypothesis testing, formal verification, and zero-day inspection pipeline"
      />

      <div className="space-y-6">
        {/* Tab Navigation */}
        <div
          className="flex flex-wrap gap-2 pb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s ease",
                background: activeTab === tab.id ? "var(--lime)" : "var(--bg-warm)",
                color: activeTab === tab.id ? "#000" : "var(--ink-soft)",
                border: "1px solid transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "var(--bg-card)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "var(--bg-warm)";
                }
              }}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <section>
          {activeTab === "status" && <SimulaStatus />}
          {activeTab === "analytics" && <SimulaAnalytics />}
          {activeTab === "proposals" && <SimulaProposals />}
          {activeTab === "history" && <SimulaHistory />}
          {activeTab === "inspector" && <SimulaInspector />}
          {activeTab === "version" && <SimulaVersion />}
        </section>
      </div>
    </>
  );
}
