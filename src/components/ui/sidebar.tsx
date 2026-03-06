"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Brain,
  Coins,
  Eye,
  GitBranch,
  Globe,
  Heart,
  Home,
  KeyRound,
  Layers,
  MessageCircle,
  Moon,
  Scale,
  Search,
  Sparkles,
  Crosshair,
  Terminal,
  Banknote,
  Waves,
  ShieldCheck,
  ShieldAlert,
  Shield,
  TrendingUp,
  Zap,
  Radio,
  Target,
  Split,
  Droplets,
  Network,
  Triangle,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home, group: "Core" },
  { label: "Chat", href: "/chat", icon: MessageCircle, group: "Core" },
  { label: "Alive", href: "/alive", icon: Sparkles, group: "Core" },
  { label: "Memory", href: "/memory", icon: Search, group: "Cognition" },
  { label: "Dreams", href: "/dreams", icon: Moon, group: "Cognition" },
  { label: "Oneiros v2", href: "/oneiros", icon: Sparkles, group: "Cognition" },
  { label: "Narrative", href: "/narrative", icon: BookOpen, group: "Cognition" },
  { label: "Perception", href: "/perception", icon: Eye, group: "Cognition" },
  { label: "Atune", href: "/atune", icon: Radio, group: "Cognition" },
  { label: "Fovea", href: "/fovea", icon: Eye, group: "Cognition" },
  { label: "Decisions", href: "/decisions", icon: Brain, group: "Cognition" },
  { label: "Nova", href: "/nova", icon: Target, group: "Cognition" },
  { label: "Voxis", href: "/voxis", icon: MessageCircle, group: "Cognition" },
  { label: "Nexus", href: "/nexus", icon: Triangle, group: "Cognition" },
  { label: "Kairos", href: "/kairos", icon: Activity, group: "Cognition" },
  { label: "Axon", href: "/axon", icon: Zap, group: "Systems" },
  { label: "SACM", href: "/sacm", icon: Network, group: "Systems" },
  { label: "Governance", href: "/governance", icon: Scale, group: "Systems" },
  { label: "Learning", href: "/learning", icon: Activity, group: "Systems" },
  { label: "Evolution", href: "/evolution", icon: GitBranch, group: "Systems" },
  { label: "Monetization", href: "/monetization", icon: Banknote, group: "Systems" },
  { label: "Costs", href: "/costs", icon: Coins, group: "Systems" },
  { label: "Oikos", href: "/oikos", icon: Heart, group: "Systems" },
  { label: "Phantom Liquidity", href: "/phantom-liquidity", icon: Droplets, group: "Systems" },
  { label: "Mitosis", href: "/mitosis", icon: Split, group: "Systems" },
  { label: "Identity", href: "/identity", icon: KeyRound, group: "Systems" },
  { label: "Federation", href: "/federation", icon: Globe, group: "Systems" },
  { label: "Logos", href: "/logos", icon: Layers, group: "Systems" },
  { label: "Telos", href: "/telos", icon: Crosshair, group: "Systems" },
  { label: "Synapse", href: "/synapse", icon: Activity, group: "Systems" },
  { label: "Soma", href: "/soma", icon: Waves, group: "Systems" },
  { label: "Skia", href: "/skia", icon: Shield, group: "Systems" },
  { label: "Benchmarks", href: "/benchmarks", icon: TrendingUp, group: "Systems" },
  { label: "Command Center", href: "/command-center", icon: Crosshair, group: "Security" },
  { label: "EIS", href: "/eis", icon: ShieldAlert, group: "Security" },
  { label: "Logs", href: "/logs", icon: Terminal, group: "Admin" },
  { label: "Admin", href: "/admin", icon: ShieldCheck, group: "Admin" },
];

const GROUP_ACCENTS: Record<string, string> = {
  Core: "#5ac826",
  Cognition: "#78e03a",
  Systems: "#e8a820",
  Security: "#dc4040",
  Admin: "#94a3b8",
};

export function Sidebar() {
  const pathname = usePathname();
  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "220px",
        minWidth: "220px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Solar-punk organism logo */}
        <div className="flex items-center gap-3">
          <div style={{ position: "relative", width: 28, height: 28 }}>
            {/* Outer ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1.5px solid rgba(90, 200, 38, 0.4)",
                animation: "cell-breathe 3s ease-in-out infinite",
              }}
            />
            {/* Inner core */}
            <div
              style={{
                position: "absolute",
                inset: 5,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #5ac826 0%, #e8a820 100%)",
                opacity: 0.9,
              }}
            />
            {/* Nucleus dot */}
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                background: "#1a1f14",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 14,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              Aurora
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 9,
                color: "rgba(90, 200, 38, 0.6)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: 3,
              }}
            >
              EcodiaOS
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{ padding: "10px 8px" }}
      >
        {Object.entries(groups).map(([group, items]) => {
          const accentColor = GROUP_ACCENTS[group] ?? "#5ac826";
          return (
            <div key={group} style={{ marginBottom: 18 }}>
              {/* Group label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 8px 6px",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 1,
                    background: accentColor,
                    opacity: 0.5,
                    borderRadius: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: accentColor,
                    opacity: 0.8,
                  }}
                >
                  {group}
                </span>
              </div>

              {/* Nav items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "5px 10px",
                        borderRadius: 7,
                        textDecoration: "none",
                        fontSize: 12,
                        fontFamily: "var(--font-body)",
                        fontWeight: active ? 500 : 400,
                        color: active
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.62)",
                        background: active
                          ? "rgba(90, 200, 38, 0.1)"
                          : "transparent",
                        borderLeft: active
                          ? `2px solid ${accentColor}`
                          : "2px solid transparent",
                        transition: "all 0.12s ease",
                        position: "relative",
                      }}
                      className={cn(!active && "sidebar-link")}
                    >
                      <Icon
                        size={13}
                        style={{
                          color: active ? accentColor : "rgba(255,255,255,0.38)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                      {active && (
                        <div
                          style={{
                            position: "absolute",
                            right: 8,
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: accentColor,
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          className="status-dot"
          style={{ color: "var(--lime)", flexShrink: 0 }}
        >
          <div className="ping" />
          <div className="core" />
        </div>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 9,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.06em",
          }}
        >
          Phase 14 — Narrative Identity
        </span>
      </div>

      <style>{`
        .sidebar-link:hover {
          color: rgba(255,255,255,0.6) !important;
          background: rgba(255,255,255,0.04) !important;
        }
      `}</style>
    </aside>
  );
}
