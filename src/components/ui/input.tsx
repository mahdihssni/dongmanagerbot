"use client";

import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <span className="text-sm font-medium text-[var(--tg-text)]">{label}</span>
      ) : null}
      {children}
      {hint && !error ? (
        <span className="text-xs text-[var(--tg-hint)]">{hint}</span>
      ) : null}
      {error ? (
        <span className="text-xs text-[var(--tg-destructive)]">{error}</span>
      ) : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--tg-bg)] px-3 text-[16px] text-[var(--tg-text)] outline-none placeholder:text-[var(--tg-hint)] focus:border-[var(--tg-button)]",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--tg-bg)] px-3 py-2.5 text-[16px] text-[var(--tg-text)] outline-none placeholder:text-[var(--tg-hint)] focus:border-[var(--tg-button)]",
        className,
      )}
      {...props}
    />
  );
}
