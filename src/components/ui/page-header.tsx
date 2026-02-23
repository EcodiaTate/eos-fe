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
      className={cn(
        "flex items-start justify-between gap-4 pb-6",
        className,
      )}
    >
      <div>
        <h1 className="text-lg font-semibold text-white/90">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-white/35">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
