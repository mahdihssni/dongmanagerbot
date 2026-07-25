"use client";

import { formatAmountInput } from "@/engine/money";
import type { Locale } from "@/domain/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

type AmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "inputMode" | "type"
> & {
  value: string;
  onValueChange: (formatted: string) => void;
  locale?: Locale;
};

/** Price input with live thousand separators (٬ / ,). */
export function AmountInput({
  value,
  onValueChange,
  locale = "fa",
  className,
  ...props
}: AmountInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(formatAmountInput(e.target.value, locale))}
      className={cn("tabular-nums tracking-wide", className)}
    />
  );
}
