"use client";

import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { closeTelegramApp, haptic } from "@/lib/telegram/webapp";

export default function SettingsPage() {
  const t = useT();
  const { state, setLocale, resetSample, clearAll, isDevMode } = useAppStore();

  return (
    <>
      <PageHeader title={t("settings")} backHref="/" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <Card>
          <p className="mb-3 text-sm font-medium">{t("language")}</p>
          <div className="flex gap-2">
            <Chip
              selected={state.settings.locale === "fa"}
              onClick={() => {
                setLocale("fa");
                haptic("selection");
              }}
            >
              {t("persian")}
            </Chip>
            <Chip
              selected={state.settings.locale === "en"}
              onClick={() => {
                setLocale("en");
                haptic("selection");
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
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  resetSample();
                  haptic("success");
                }}
              >
                Reset sample data
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  clearAll();
                  haptic("success");
                }}
              >
                Clear all data
              </Button>
            </div>
          </Card>
        ) : null}

        <Button variant="secondary" fullWidth onClick={() => closeTelegramApp()}>
          {t("closeApp")}
        </Button>
      </div>
    </>
  );
}
