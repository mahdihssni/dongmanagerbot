import type { CurrencyCode, Group } from "@/domain/types";
import { getPublicConfig, parseCurrencyCode } from "@/lib/config";
import { createInviteCode } from "@/lib/ids";
import {
  getTelegramWebApp,
  isTelegramEnvironment,
  openTelegramLink,
} from "@/lib/telegram/webapp";

const INVITE_PREFIX = "j_";
const GROUP_ID_RE = /^[a-zA-Z0-9_-]{6,80}$/;

export { createInviteCode };

export function toStartParam(inviteCode: string): string {
  return `${INVITE_PREFIX}${inviteCode}`;
}

export function parseInviteStartParam(param: string | null | undefined): string | null {
  if (!param) return null;
  const raw = param.trim();
  if (!raw) return null;
  if (raw.startsWith(INVITE_PREFIX)) return raw.slice(INVITE_PREFIX.length).toLowerCase();
  if (raw.startsWith("join_")) return raw.slice(5).toLowerCase();
  if (/^[a-z0-9]{6,12}$/i.test(raw)) return raw.toLowerCase();
  return null;
}

export function readIncomingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  const wa = getTelegramWebApp();
  const fromTg = parseInviteStartParam(wa?.initDataUnsafe?.start_param);
  if (fromTg) return fromTg;

  const params = new URLSearchParams(window.location.search);
  const fromQuery =
    parseInviteStartParam(params.get("tgWebAppStartParam")) ||
    parseInviteStartParam(params.get("startapp")) ||
    parseInviteStartParam(params.get("invite"));
  if (fromQuery) return fromQuery;

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "join" && parts[1]) {
    return parseInviteStartParam(parts[1]) ?? parts[1].toLowerCase();
  }
  return null;
}

export interface InviteShellParams {
  groupId: string;
  name: string;
  currency: CurrencyCode;
}

/** Web join URL can carry a group shell so invitees bootstrap without a backend. */
export function readInviteShellFromUrl(): InviteShellParams | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("gid")?.trim() ?? "";
  const name = params.get("n")?.trim().slice(0, 80) ?? "";
  const currency = parseCurrencyCode(params.get("c"));
  if (!GROUP_ID_RE.test(groupId) || name.length < 1) return null;
  return { groupId, name, currency };
}

export function getBotUsername(): string | null {
  return getPublicConfig().botUsername || null;
}

export function getAppShortName(): string | null {
  return getPublicConfig().appShortName || null;
}

export function getPublicAppUrl(): string {
  return (
    getPublicConfig().appUrl ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  );
}

export function buildWebInviteUrl(group: Group): string {
  // Server-backed join resolves by inviteCode alone; no shell query needed.
  return `${getPublicAppUrl()}/join/${group.inviteCode}`;
}

/** Local-only fallback shell URL when MongoDB is not configured. */
export function buildWebInviteUrlWithShell(group: Group): string {
  const url = new URL(`${getPublicAppUrl()}/join/${group.inviteCode}`);
  url.searchParams.set("gid", group.id);
  url.searchParams.set("n", group.name);
  url.searchParams.set("c", group.currency);
  return url.toString();
}

/** Direct Mini App link: https://t.me/bot[/app]?startapp=j_code */
export function buildTelegramInviteUrl(group: Group): string {
  const bot = getBotUsername();
  const startapp = toStartParam(group.inviteCode);
  if (!bot) return buildWebInviteUrl(group);
  const app = getAppShortName();
  if (app) return `https://t.me/${bot}/${app}?startapp=${startapp}`;
  return `https://t.me/${bot}?startapp=${startapp}`;
}

export function buildInviteShareText(groupName: string, locale: "fa" | "en"): string {
  return locale === "fa"
    ? `بیا تو گروه «${groupName}» توی دانگ‌بات — هزینه‌ها رو با هم حساب کنیم`
    : `Join “${groupName}” on DongBot — let's split expenses together`;
}

export async function shareGroupInvite(
  group: Group,
  locale: "fa" | "en",
): Promise<"telegram" | "native" | "clipboard"> {
  // Prefer Telegram deep link; web URL includes shell for local-mode fallback.
  const webUrl = buildWebInviteUrlWithShell(group);
  const tgUrl = getBotUsername() ? buildTelegramInviteUrl(group) : null;
  const inviteUrl = tgUrl ?? webUrl;
  const text = tgUrl
    ? `${buildInviteShareText(group.name, locale)}\n${webUrl}`
    : buildInviteShareText(group.name, locale);
  const sharePage = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`;

  if (isTelegramEnvironment()) {
    openTelegramLink(sharePage);
    return "telegram";
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: group.name, text, url: inviteUrl });
      return "native";
    } catch {
      /* cancelled */
    }
  }

  await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
  return "clipboard";
}

export async function copyGroupInviteLink(group: Group): Promise<string> {
  const tgUrl = getBotUsername() ? buildTelegramInviteUrl(group) : null;
  const webUrl = buildWebInviteUrlWithShell(group);
  const payload = tgUrl ? `${tgUrl}\n${webUrl}` : webUrl;
  await navigator.clipboard.writeText(payload);
  return payload;
}
