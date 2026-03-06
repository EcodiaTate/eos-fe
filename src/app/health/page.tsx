"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ImmuneVitals } from "@/components/thymos/ImmuneVitals";
import { IncidentTimeline } from "@/components/thymos/IncidentTimeline";
import { RepairHistory } from "@/components/thymos/RepairHistory";
import { AntibodyLibrary } from "@/components/thymos/AntibodyLibrary";
import { HomeostasisMonitor } from "@/components/thymos/HomeostasisMonitor";
import { CausalGraph } from "@/components/thymos/CausalGraph";
import { ThymosConfig } from "@/components/thymos/ThymosConfig";
import { ProphylacticPanel } from "@/components/thymos/ProphylacticPanel";
import { IncidentStream } from "@/components/thymos/IncidentStream";

type Tab =
  | "vitals"
  | "incidents"
  | "stream"
  | "repairs"
  | "antibodies"
  | "homeostasis"
  | "prophylactic"
  | "causal"
  | "config";

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vitals");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "vitals", label: "Immune Vitals", icon: "❤️" },
    { id: "incidents", label: "Incident Timeline", icon: "🚨" },
    { id: "stream", label: "Live Stream", icon: "📡" },
    { id: "repairs", label: "Repairs", icon: "🔧" },
    { id: "antibodies", label: "Antibodies", icon: "🛡️" },
    { id: "homeostasis", label: "Homeostasis", icon: "⚖️" },
    { id: "prophylactic", label: "Prophylactic", icon: "🔍" },
    { id: "causal", label: "Causal Graph", icon: "🕸️" },
    { id: "config", label: "Config", icon: "⚙️" },
  ];

  return (
    <>
      <PageHeader
        title="Thymos — Immune System"
        description="Real-time visualization of EcodiaOS immune system: incidents, repairs, antibodies, and homeostatic health"
      />

      {/* Tab Navigation */}
      <div
        className="flex flex-wrap gap-2 mb-8 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
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
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "24px" }}>
        {activeTab === "vitals" && <ImmuneVitals />}
        {activeTab === "incidents" && <IncidentTimeline />}
        {activeTab === "stream" && <IncidentStream />}
        {activeTab === "repairs" && <RepairHistory />}
        {activeTab === "antibodies" && <AntibodyLibrary />}
        {activeTab === "homeostasis" && <HomeostasisMonitor />}
        {activeTab === "prophylactic" && <ProphylacticPanel />}
        {activeTab === "causal" && <CausalGraph />}
        {activeTab === "config" && <ThymosConfig />}
      </div>
    </>
  );
}
