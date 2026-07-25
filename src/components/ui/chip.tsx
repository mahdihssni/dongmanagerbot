"use client";

import { cn } from "@/lib/utils/cn";

export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors",
        selected
          ? "border-[var(--tg-button)] bg-[var(--tg-button)] text-[var(--tg-button-text)]"
          : "border-[var(--border)] bg-[var(--tg-secondary-bg)] text-[var(--tg-text)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MemberAvatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0) || "?";
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tg-button)]/15 text-sm font-semibold text-[var(--tg-button)]"
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(5rem+var(--safe-bottom))] z-40 mx-auto w-fit max-w-[90%] rounded-full bg-[var(--tg-text)] px-4 py-2 text-sm text-[var(--tg-bg)] shadow-lg"
    >
      {message}
    </div>
  );
}
