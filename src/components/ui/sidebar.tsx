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
  Home,
  MessageCircle,
  Moon,
  Scale,
  Search,
  Sparkles,
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
  { label: "Narrative", href: "/narrative", icon: BookOpen, group: "Cognition" },
  { label: "Perception", href: "/perception", icon: Eye, group: "Cognition" },
  { label: "Decisions", href: "/decisions", icon: Brain, group: "Cognition" },
  { label: "Governance", href: "/governance", icon: Scale, group: "Systems" },
  { label: "Learning", href: "/learning", icon: Activity, group: "Systems" },
  { label: "Evolution", href: "/evolution", icon: GitBranch, group: "Systems" },
  { label: "Costs", href: "/costs", icon: Coins, group: "Systems" },
  { label: "Federation", href: "/federation", icon: Globe, group: "Systems" },
];

export function Sidebar() {
  const pathname = usePathname();
  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="flex h-full w-56 flex-col border-r border-white/[0.06] bg-[#08081a]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-400/60 to-indigo-500/60 shadow-[0_0_12px_rgba(94,234,212,0.2)]" />
        <div>
          <div className="text-sm font-semibold text-white/90">Aurora</div>
          <div className="text-[10px] text-white/30">EcodiaOS</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/20">
              {group}
            </div>
            <div className="space-y-0.5">
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
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-100",
                      active
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon
                      size={15}
                      className={cn(
                        active ? "text-teal-400/80" : "text-white/25",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="text-[10px] text-white/15">Phase 14 — Narrative Identity</div>
      </div>
    </aside>
  );
}
