import type { NextRequest } from "next/server";
import type { AppSettings, User } from "@/domain/types";
import { validateInitData } from "@/lib/auth/telegram";
import { ensureIndexes, users } from "@/lib/db/collections";
import { isMongoConfigured } from "@/lib/db/client";
import type { UserDoc } from "@/lib/db/types";
import { nowIso } from "@/domain";
import { defaultSettings } from "@/lib/persistence/repository";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function parseDevUser(header: string | null): User | null {
  if (!header) return null;
  try {
    const parsed = JSON.parse(header) as User;
    if (!parsed?.id || !parsed.firstName) return null;
    return {
      id: parsed.id,
      telegramId: parsed.telegramId,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      username: parsed.username,
      languageCode: parsed.languageCode,
      photoUrl: parsed.photoUrl,
    };
  } catch {
    return null;
  }
}

function extractInitData(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("tma ")) {
    return auth.slice(4).trim();
  }
  return req.headers.get("x-telegram-init-data");
}

async function upsertUser(user: User, settings?: AppSettings): Promise<UserDoc> {
  await ensureIndexes();
  const col = await users();
  const existing = user.telegramId
    ? await col.findOne({ telegramId: user.telegramId })
    : await col.findOne({ id: user.id });

  const ts = nowIso();
  if (existing) {
    const updated: UserDoc = {
      ...existing,
      ...user,
      id: existing.id,
      settings: settings ?? existing.settings ?? defaultSettings(),
      updatedAt: ts,
    };
    await col.updateOne({ id: existing.id }, { $set: updated });
    return updated;
  }

  const doc: UserDoc = {
    ...user,
    settings: settings ?? defaultSettings(),
    createdAt: ts,
    updatedAt: ts,
  };
  await col.insertOne(doc);
  return doc;
}

export interface AuthedRequest {
  user: User;
  settings: AppSettings;
  doc: UserDoc;
}

export async function requireUser(req: NextRequest): Promise<AuthedRequest> {
  if (!isMongoConfigured()) {
    throw new AuthError("Database is not configured", 503);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const initData = extractInitData(req);

  if (initData && botToken) {
    const validated = validateInitData(initData, botToken);
    if (!validated) throw new AuthError("Invalid Telegram init data");
    const doc = await upsertUser(validated.user);
    return { user: validated.user, settings: doc.settings, doc };
  }

  const allowDev = process.env.ALLOW_DEV_AUTH === "true";
  if (allowDev) {
    const dev = parseDevUser(req.headers.get("x-dev-user"));
    if (dev) {
      const doc = await upsertUser(dev);
      return { user: dev, settings: doc.settings, doc };
    }
  }

  if (!botToken) {
    throw new AuthError("TELEGRAM_BOT_TOKEN is not configured", 503);
  }
  throw new AuthError("Missing Telegram authentication");
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("[dongbot:api]", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
