"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-white/10 text-white hover:bg-white/15 active:bg-white/20 border border-white/10",
  secondary:
    "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5",
  ghost: "text-white/50 hover:text-white/80 hover:bg-white/5",
  danger:
    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
  lg: "px-5 py-2 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        "disabled:opacity-40 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  ),
);
Button.displayName = "Button";
