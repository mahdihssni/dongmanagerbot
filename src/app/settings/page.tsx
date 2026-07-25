"use client";

import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { closeTelegramApp, haptic } from "@/lib/telegram/webapp";
import { getConfigWarnings } from "@/lib/config";

export default function SettingsPage() {
  const t = useT();
  const { state, setLocale, clearAll, isDevMode, remoteMode } = useAppStore();
  const warnings = isDevMode ? getConfigWarnings() : [];

  return (
    <>
      <PageHeader title={t("settings")} backHref="/" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <Card>
          <p className="mb-1 text-sm font-medium">
            {remoteMode ? "Cloud sync (MongoDB)" : t("localDevMode")}
          </p>
          <p className="text-xs text-[var(--tg-hint)]">
            {remoteMode
              ? "Groups and expenses sync through the server."
              : t("telegramMissing")}
          </p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium">{t("language")}</p>
          <div className="flex gap-2">
            <Chip
              selected={state.settings.locale === "fa"}
              onClick={() => {
                void setLocale("fa");
                haptic("selection", state.settings.hapticFeedback);
              }}
            >
              {t("persian")}
            </Chip>
            <Chip
              selected={state.settings.locale === "en"}
              onClick={() => {
                void setLocale("en");
                haptic("selection", state.settings.hapticFeedback);
              }}
            >
              {t("english")}
            </Chip>
          </div>
        </Card>

        {isDevMode ? (
          <Card>
            <p className="mb-2 text-sm font-medium">{t("localDevMode")}</p>
            <p className="mb-3 text-xs text-[var(--tg-hint)]">{t("telegramMissing")}</p>
            {warnings.length > 0 ? (
              <ul className="mb-3 list-disc ps-4 text-xs text-amber-700 dark:text-amber-300">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                clearAll();
                haptic("success", state.settings.hapticFeedback);
              }}
            >
              {t("clearAllData")}
            </Button>
          </Card>
        ) : null}

        <Button variant="secondary" fullWidth onClick={() => closeTelegramApp()}>
          {t("closeApp")}
        </Button>
      </div>
    </>
  );
}
