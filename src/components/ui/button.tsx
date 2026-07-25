"use client";

import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--tg-button)] text-[var(--tg-button-text)] shadow-sm active:opacity-90",
  secondary:
    "bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] active:opacity-90",
  ghost: "bg-transparent text-[var(--tg-text)] active:bg-[var(--tg-secondary-bg)]",
  danger: "bg-transparent text-[var(--tg-destructive)] active:opacity-80",
  outline:
    "border border-[var(--border)] bg-transparent text-[var(--tg-text)] active:bg-[var(--tg-secondary-bg)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-opacity disabled:opacity-40",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
