import { NextResponse } from "next/server";

/**
 * Health / config endpoint for Vercel + future bot integration checks.
 * Not a webhook server — only exposes public app metadata.
 */
export async function GET() {
  return NextResponse.json({
    name: "dongbot",
    version: "0.1.0",
    mode: "webapp",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  });
}
