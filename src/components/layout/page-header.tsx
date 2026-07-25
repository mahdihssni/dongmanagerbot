"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { getTelegramWebApp } from "@/lib/telegram/webapp";
import { useEffect } from "react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const wa = getTelegramWebApp();
    if (!wa || !backHref) {
      wa?.BackButton?.hide();
      return;
    }
    const onBack = () => {
      if (backHref) router.push(backHref);
      else router.back();
    };
    wa.BackButton.show();
    wa.BackButton.onClick(onBack);
    return () => {
      wa.BackButton.offClick(onBack);
      wa.BackButton.hide();
    };
  }, [backHref, router]);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--tg-bg)]/95 px-4 pb-3 backdrop-blur",
        className,
      )}
      style={{
        paddingTop: "max(0.75rem, calc(var(--safe-top) + 0.35rem))",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className="me-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--tg-button)] md:hidden"
              aria-label="Back"
            >
              <span aria-hidden>‹</span>
            </Link>
          ) : null}
          <h1 className="truncate text-lg font-bold text-[var(--tg-text)]">{title}</h1>
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-[var(--tg-hint)]">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
