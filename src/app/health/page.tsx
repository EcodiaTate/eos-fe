"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ImmuneVitals } from "@/components/thymos/ImmuneVitals";
import { IncidentTimeline } from "@/components/thymos/IncidentTimeline";
import { RepairHistory } from "@/components/thymos/RepairHistory";
import { AntibodyLibrary } from "@/components/thymos/AntibodyLibrary";
import { HomeostasisMonitor } from "@/components/thymos/HomeostasisMonitor";
import { CausalGraph } from "@/components/thymos/CausalGraph";

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<"vitals" | "incidents" | "repairs" | "antibodies" | "homeostasis" | "causal">("vitals");

  const tabs = [
    { id: "vitals", label: "Immune Vitals", icon: "❤️" },
    { id: "incidents", label: "Incident Timeline", icon: "🚨" },
    { id: "repairs", label: "Repairs", icon: "🔧" },
    { id: "antibodies", label: "Antibodies", icon: "🛡️" },
    { id: "homeostasis", label: "Homeostasis", icon: "⚖️" },
    { id: "causal", label: "Causal Graph", icon: "🕸️" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Thymos — Immune System"
          description="Real-time visualization of EcodiaOS immune system: incidents, repairs, antibodies, and homeostatic health"
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/50"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6">
          {activeTab === "vitals" && <ImmuneVitals />}
          {activeTab === "incidents" && <IncidentTimeline />}
          {activeTab === "repairs" && <RepairHistory />}
          {activeTab === "antibodies" && <AntibodyLibrary />}
          {activeTab === "homeostasis" && <HomeostasisMonitor />}
          {activeTab === "causal" && <CausalGraph />}
        </div>
      </div>
    </div>
  );
}
