/**
 * Optional Telegram initData HMAC validation for a future backend.
 * Never validate with the bot token in the browser — keep the token server-side only.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

export interface InitDataValidationResult {
  ok: boolean;
  reason?: string;
  userId?: number;
}

/**
 * Client-side shape check only. Real HMAC validation must run on the server
 * with BOT_TOKEN (never NEXT_PUBLIC).
 */
export function hasInitDataShape(initData: string): boolean {
  if (!initData || typeof initData !== "string") return false;
  const params = new URLSearchParams(initData);
  return params.has("hash") && (params.has("user") || params.has("chat_instance"));
}

/**
 * Placeholder for server route: POST /api/telegram/validate
 * Implementation sketch (Node crypto) — wire when backend exists.
 */
export function describeInitDataValidation(): string {
  return [
    "1. Parse initData as URLSearchParams",
    "2. Build data-check-string from sorted key=value pairs excluding hash",
    "3. secret_key = HMAC_SHA256(bot_token, 'WebAppData')",
    "4. Compare hex HMAC_SHA256(data-check-string, secret_key) to hash",
    "5. Reject if auth_date older than your max age (e.g. 24h)",
  ].join("\n");
}
