"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/use-t";
import { useAppStore } from "@/store/app-store";
import { isRtl } from "@/lib/i18n/messages";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const { state, hydrated, isDevMode } = useAppStore();
  const rtl = isRtl(state.settings.locale);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--tg-hint)]">
        {t("loading")}
      </div>
    );
  }

  const hideNav =
    pathname.includes("/expenses/new") ||
    (pathname.includes("/expenses/") && pathname.includes("/edit"));

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={state.settings.locale}
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-[var(--tg-bg)] text-[var(--tg-text)]"
    >
      {isDevMode ? (
        <div className="bg-amber-500/15 px-3 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200">
          {t("localDevMode")} — {t("telegramMissing")}
        </div>
      ) : null}
      <main className="flex-1 pb-[calc(4.5rem+var(--safe-bottom))]">{children}</main>
      {!hideNav ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg justify-around border-t border-[var(--border)] bg-[var(--tg-bg)]/95 px-2 pt-2 backdrop-blur"
          style={{ paddingBottom: "max(0.5rem, var(--safe-bottom))" }}
        >
          <NavItem href="/" active={pathname === "/"} label={t("home")} />
          <NavItem
            href="/settings"
            active={pathname.startsWith("/settings")}
            label={t("settings")}
          />
        </nav>
      ) : null}
    </div>
  );
}

function NavItem({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 min-w-[5.5rem] flex-col items-center justify-center rounded-xl px-3 text-xs font-medium",
        active ? "text-[var(--tg-button)]" : "text-[var(--tg-hint)]",
      )}
    >
      {label}
    </Link>
  );
}
