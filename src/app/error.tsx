"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[dongbot]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-bold">{t("somethingWrong")}</h1>
      <p className="text-sm text-[var(--tg-hint)]">{t("somethingWrongHint")}</p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
