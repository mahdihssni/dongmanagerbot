import { NextResponse } from "next/server";
import { APP_VERSION, getPublicConfig } from "@/lib/config";
import { isMongoConfigured, pingMongo } from "@/lib/db/client";

export async function GET() {
  const cfg = getPublicConfig();
  const mongoConfigured = isMongoConfigured();
  const mongoConnected = mongoConfigured ? await pingMongo() : false;

  return NextResponse.json(
    {
      ok: true,
      name: "dongbot",
      version: APP_VERSION,
      mode: "webapp",
      env: cfg.appEnv,
      appUrl: cfg.appUrl || null,
      botConfigured: Boolean(cfg.botUsername),
      telegramBotTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      mongoConfigured,
      mongoConnected,
      apiConfigured: Boolean(cfg.apiBaseUrl) || mongoConfigured,
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
