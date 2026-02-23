"use client";

import { cn } from "@/lib/cn";
import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm",
        glow && "shadow-[0_0_20px_rgba(255,255,255,0.03)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-white/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-medium text-white/80", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
