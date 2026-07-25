import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-base font-semibold text-[var(--tg-text)]">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-[var(--tg-hint)]">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
