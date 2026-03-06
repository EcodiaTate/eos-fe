"use client";

import { cn } from "@/lib/cn";
import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("card-solar", glow && "glow", className)}
      style={style}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      style={{
        padding: "12px 16px 11px",
        borderBottom: "1px solid var(--border)",
        ...style,
      }}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(className)}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "0.01em",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 7,
        ...style,
      }}
      {...props}
    />
  );
}

export function CardContent({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(className)}
      style={{ padding: "14px 16px", ...style }}
      {...props}
    />
  );
}
