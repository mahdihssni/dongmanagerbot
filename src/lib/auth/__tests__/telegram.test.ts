import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateInitData } from "@/lib/auth/telegram";

function buildInitData(user: object, botToken: string, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("user", JSON.stringify(user));
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateInitData", () => {
  const token = "123456:ABC-DEF";

  it("accepts valid init data", () => {
    const initData = buildInitData(
      { id: 42, first_name: "Ali", username: "ali" },
      token,
    );
    const result = validateInitData(initData, token);
    expect(result?.user.telegramId).toBe(42);
    expect(result?.user.id).toBe("tg_42");
    expect(result?.user.firstName).toBe("Ali");
  });

  it("rejects tampered hash", () => {
    const initData = buildInitData({ id: 1, first_name: "X" }, token) + "00";
    expect(validateInitData(initData, token)).toBeNull();
  });

  it("rejects expired auth_date", () => {
    const old = Math.floor(Date.now() / 1000) - 60 * 60 * 48;
    const initData = buildInitData({ id: 1, first_name: "X" }, token, old);
    expect(validateInitData(initData, token)).toBeNull();
  });
});
