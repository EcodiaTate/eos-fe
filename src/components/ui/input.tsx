"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90",
      "placeholder:text-white/25",
      "focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10",
      "disabled:opacity-40 disabled:pointer-events-none",
      "transition-colors duration-150",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
