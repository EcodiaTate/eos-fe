"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default:  { bg: "rgba(100,116,139,0.2)",    color: "#cbd5e1",              border: "rgba(100,116,139,0.3)"    },
  success:  { bg: "rgba(90,200,38,0.15)",      color: "#4ade80",               border: "rgba(90,200,38,0.4)"       },
  warning:  { bg: "rgba(232,168,32,0.15)",     color: "#facc15",              border: "rgba(232,168,32,0.4)"      },
  danger:   { bg: "rgba(220,38,38,0.15)",      color: "#ef4444",              border: "rgba(220,38,38,0.4)"       },
  info:     { bg: "rgba(2,132,199,0.15)",      color: "#06b6d4",              border: "rgba(2,132,199,0.4)"       },
  muted:    { bg: "rgba(100,116,139,0.1)",     color: "#94a3b8",              border: "rgba(100,116,139,0.2)"     },
};

export function Badge({
  className,
  variant = "default",
  pulse,
  style,
  ...props
}: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.04em",
        padding: "2px 8px",
        borderRadius: 99,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        ...style,
      }}
      {...props}
    >
      {pulse && (
        <span
          className="status-dot"
          style={{ color: v.color, width: 6, height: 6 }}
        >
          <span className="ping" />
          <span className="core" style={{ width: 5, height: 5 }} />
        </span>
      )}
      {props.children}
    </span>
  );
}
