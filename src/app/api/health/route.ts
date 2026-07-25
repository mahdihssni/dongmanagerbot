import { NextResponse } from "next/server";
import { APP_VERSION, getPublicConfig } from "@/lib/config";

/**
 * Health / config endpoint for Vercel + bot integration checks.
 * Does not expose secrets.
 */
export async function GET() {
  const cfg = getPublicConfig();
  return NextResponse.json(
    {
      ok: true,
      name: "dongbot",
      version: APP_VERSION,
      mode: "webapp",
      env: cfg.appEnv,
      appUrl: cfg.appUrl || null,
      botConfigured: Boolean(cfg.botUsername),
      apiConfigured: Boolean(cfg.apiBaseUrl),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
