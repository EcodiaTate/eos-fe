"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
      style={{ paddingBottom: 24, marginBottom: 4 }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            color: "#f1f5f9",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "#cbd5e1",
              margin: "8px 0 0",
              letterSpacing: "0.02em",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2" style={{ paddingTop: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}
