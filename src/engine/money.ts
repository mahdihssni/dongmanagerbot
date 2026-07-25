/**
 * Money helpers — all amounts are integers in minor units.
 * IRR/IRT use whole units (no fractional subunit in this app).
 */

import { CURRENCY_META } from "@/domain";
import type { CurrencyCode, Locale } from "@/domain/types";

export function decimalsFor(currency: CurrencyCode): number {
  return CURRENCY_META[currency].decimals;
}

/** Round half-away-from-zero to integer minor units. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

/**
 * Distribute `total` across `weights` proportionally.
 * Remainder cents are assigned greedily to the largest fractional parts
 * so the sum of parts always equals `total` (deterministic).
 */
export function distributeProportionally(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const safeTotal = roundMoney(total);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0 || safeTotal === 0) return Array(n).fill(0);

  const exact = weights.map((w) => (safeTotal * w) / weightSum);
  const floors = exact.map((v) => Math.trunc(v));
  let remainder = safeTotal - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: Math.abs(v - floors[i]) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floors];
  const step = remainder >= 0 ? 1 : -1;
  let idx = 0;
  while (remainder !== 0 && idx < order.length) {
    result[order[idx].i] += step;
    remainder -= step;
    idx += 1;
  }
  return result;
}

/** Equal split of total among n participants with deterministic remainder. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  return distributeProportionally(total, Array(count).fill(1));
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Normalize Persian/Arabic digits and strip grouping separators. */
export function normalizeAmountDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".")
    .trim();
}

/**
 * Live input formatter with thousand separators.
 * fa → ۱٬۵۰۰٬۰۰۰  |  en → 1,500,000
 */
export function formatAmountInput(raw: string, locale: Locale = "fa"): string {
  const normalized = normalizeAmountDigits(raw);
  if (!normalized) return "";

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [intPartRaw, ...fracParts] = unsigned.split(".");
  const intDigits = intPartRaw.replace(/\D/g, "");
  if (!intDigits && fracParts.length === 0) return negative ? "-" : "";

  const frac = fracParts.length > 0 ? fracParts.join("").replace(/\D/g, "").slice(0, 2) : null;
  const grouped = (intDigits || "0").replace(/\B(?=(\d{3})+(?!\d))/g, locale === "fa" ? "٬" : ",");

  let display = frac !== null ? `${grouped}.${frac}` : grouped;
  if (locale === "fa") {
    display = display.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
  }
  return negative ? `-${display}` : display;
}

/** Format a stored minor-unit amount for an editable input field. */
export function formatStoredAmountInput(
  amount: number,
  currency: CurrencyCode,
  locale: Locale = "fa",
): string {
  const decimals = decimalsFor(currency);
  const major = decimals === 0 ? amount : amount / Math.pow(10, decimals);
  return formatAmountInput(String(major), locale);
}

export function parseAmountInput(raw: string, currency: CurrencyCode): number | null {
  const cleaned = normalizeAmountDigits(raw);
  if (!cleaned || cleaned === "." || cleaned === "-") return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  const decimals = decimalsFor(currency);
  if (decimals === 0) return roundMoney(num);
  return roundMoney(num * Math.pow(10, decimals));
}

export function formatAmount(
  amount: number,
  currency: CurrencyCode,
  locale: Locale = "fa",
): string {
  const meta = CURRENCY_META[currency];
  const major = meta.decimals === 0 ? amount : amount / Math.pow(10, meta.decimals);
  const formatted = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: meta.decimals,
    minimumFractionDigits: 0,
  }).format(major);
  if (locale === "fa") return `${formatted} ${meta.symbol}`;
  return currency === "USD" || currency === "EUR" || currency === "TRY"
    ? `${meta.symbol}${formatted}`
    : `${formatted} ${meta.symbol}`;
}

export function formatSignedAmount(
  amount: number,
  currency: CurrencyCode,
  locale: Locale = "fa",
): string {
  const abs = formatAmount(Math.abs(amount), currency, locale);
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `−${abs}`;
  return abs;
}
