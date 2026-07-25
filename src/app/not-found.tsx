"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/use-t";

export default function NotFound() {
  const t = useT();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-bold">{t("pageNotFound")}</h1>
      <p className="text-sm text-[var(--tg-hint)]">{t("pageNotFoundHint")}</p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[var(--tg-button)] px-4 font-medium text-[var(--tg-button-text)]"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
