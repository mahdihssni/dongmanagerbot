/** Server-safe ID helpers (no browser / Telegram SDK imports). */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createInviteCode(): string {
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(8))
      : Array.from({ length: 8 }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[(bytes[i] as number) % ALPHABET.length];
  }
  return out;
}
