import type { CurrencyCode } from "@/domain/types";

export const APP_VERSION = "0.1.0";

export const CURRENCY_CODES: readonly CurrencyCode[] = [
  "IRR",
  "IRT",
  "USD",
  "EUR",
  "TRY",
] as const;

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as readonly string[]).includes(value);
}

export function parseCurrencyCode(
  value: unknown,
  fallback: CurrencyCode = "IRT",
): CurrencyCode {
  return isCurrencyCode(value) ? value : fallback;
}

export function getPublicConfig() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "",
    appEnv: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() || "",
    appShortName: process.env.NEXT_PUBLIC_TELEGRAM_APP_SHORT_NAME?.trim() || "",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "",
    version: APP_VERSION,
  };
}

/** Soft warnings for missing production env — never throws in the browser. */
export function getConfigWarnings(): string[] {
  const cfg = getPublicConfig();
  const warnings: string[] = [];
  if (cfg.appEnv === "production") {
    if (!cfg.appUrl) warnings.push("NEXT_PUBLIC_APP_URL is not set");
    if (!cfg.botUsername) warnings.push("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set");
  }
  return warnings;
}
