/**
 * @deprecated Prefer `@/lib/auth/telegram` for server validation.
 * Kept for documentation of the HMAC algorithm.
 */
export {
  hasInitDataShape,
  validateInitData,
  type ValidatedInitData,
} from "@/lib/auth/telegram";

export function describeInitDataValidation(): string {
  return [
    "1. Parse initData as URLSearchParams",
    "2. Build data-check-string from sorted key=value pairs excluding hash",
    "3. secret_key = HMAC_SHA256('WebAppData', bot_token)",
    "4. Compare hex HMAC_SHA256(data-check-string, secret_key) to hash",
    "5. Reject if auth_date older than max age (24h)",
  ].join("\n");
}
