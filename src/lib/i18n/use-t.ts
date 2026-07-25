"use client";

import { useLocale } from "@/store/app-store";
import { t, type MessageKey } from "@/lib/i18n/messages";

export function useT() {
  const locale = useLocale();
  return (key: MessageKey) => t(locale, key);
}
