import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@/domain/types";

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // 24h

export interface ValidatedInitData {
  user: User;
  authDate: number;
  raw: string;
}

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  return pairs.join("\n");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Validate Telegram WebApp initData (HMAC-SHA256).
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
): ValidatedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");
  if (!hash || !authDateRaw || !userRaw) return null;

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) return null;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > MAX_AUTH_AGE_SECONDS || age < -60) return null;

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!safeEqualHex(computed, hash)) return null;

  let tgUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  };
  try {
    tgUser = JSON.parse(userRaw);
  } catch {
    return null;
  }
  if (!tgUser?.id || !tgUser.first_name) return null;

  return {
    authDate,
    raw: initData,
    user: {
      id: `tg_${tgUser.id}`,
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      languageCode: tgUser.language_code,
      photoUrl: tgUser.photo_url,
    },
  };
}

export function hasInitDataShape(initData: string): boolean {
  if (!initData) return false;
  const params = new URLSearchParams(initData);
  return params.has("hash") && params.has("user");
}
