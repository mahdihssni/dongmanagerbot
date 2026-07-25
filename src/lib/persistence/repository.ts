import { DOMAIN_VERSION, createId, nowIso } from "@/domain";
import type {
  AppSettings,
  AppState,
  CurrencyCode,
  Expense,
  Group,
  Locale,
  Member,
  SplitType,
  User,
} from "@/domain/types";
import { createInviteCode } from "@/lib/ids";
import { isCurrencyCode, parseCurrencyCode } from "@/lib/config";

export const STORAGE_KEY = "dongbot.v1";

const SPLIT_TYPES = new Set<SplitType>([
  "equal",
  "exact",
  "percentage",
  "shares",
  "full",
  "transfer",
  "refund",
  "adjustment",
]);

export const defaultSettings = (): AppSettings => ({
  locale: "fa",
  currency: "IRT",
  hapticFeedback: true,
});

export const demoUser = (): User => ({
  id: "user_demo",
  firstName: "کاربر",
  lastName: "آزمایشی",
  username: "demo_user",
  languageCode: "fa",
});

export function emptyState(user: User | null = null): AppState {
  return {
    version: DOMAIN_VERSION,
    currentUser: user,
    groups: [],
    members: [],
    expenses: [],
    settings: defaultSettings(),
  };
}

export interface AppRepository {
  load(): AppState | null;
  save(state: AppState): { ok: boolean; error?: string };
  clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeMember(raw: unknown): Member | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.groupId !== "string") {
    return null;
  }
  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  if (!displayName) return null;
  return {
    id: raw.id,
    groupId: raw.groupId,
    displayName: displayName.slice(0, 80),
    userId: typeof raw.userId === "string" ? raw.userId : undefined,
    telegramId: typeof raw.telegramId === "number" ? raw.telegramId : undefined,
    isActive: raw.isActive !== false,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
  };
}

function sanitizeExpense(raw: unknown): Expense | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.groupId !== "string") {
    return null;
  }
  if (typeof raw.amount !== "number" || !Number.isFinite(raw.amount) || raw.amount <= 0) {
    return null;
  }
  if (typeof raw.payerId !== "string" || typeof raw.description !== "string") return null;
  if (!SPLIT_TYPES.has(raw.splitType as SplitType)) return null;
  if (!Array.isArray(raw.participantIds)) return null;
  const currency = parseCurrencyCode(raw.currency);
  return {
    id: raw.id,
    groupId: raw.groupId,
    description: raw.description.trim().slice(0, 200) || "—",
    amount: Math.round(raw.amount),
    currency,
    payerId: raw.payerId,
    splitType: raw.splitType as SplitType,
    participantIds: raw.participantIds.filter((id): id is string => typeof id === "string"),
    shares: Array.isArray(raw.shares)
      ? raw.shares
          .filter(isRecord)
          .map((s) => ({
            memberId: String(s.memberId ?? ""),
            value: typeof s.value === "number" && Number.isFinite(s.value) ? s.value : 0,
          }))
          .filter((s) => s.memberId)
      : [],
    payerIncluded: raw.payerIncluded !== false,
    note: typeof raw.note === "string" ? raw.note.slice(0, 500) : undefined,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : "unknown",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    clientRequestId:
      typeof raw.clientRequestId === "string" ? raw.clientRequestId : undefined,
  };
}

function sanitizeGroup(raw: unknown): Group | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
    return null;
  }
  const name = raw.name.trim().slice(0, 80);
  if (!name) return null;
  return {
    id: raw.id,
    name,
    currency: parseCurrencyCode(raw.currency),
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : "unknown",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    inviteCode:
      typeof raw.inviteCode === "string" && raw.inviteCode.length >= 6
        ? raw.inviteCode
        : createInviteCode(),
    archived: raw.archived === true,
  };
}

export function migrateAppState(state: AppState): AppState {
  const groups = (Array.isArray(state.groups) ? state.groups : [])
    .map(sanitizeGroup)
    .filter((g): g is Group => Boolean(g));
  const members = (Array.isArray(state.members) ? state.members : [])
    .map(sanitizeMember)
    .filter((m): m is Member => Boolean(m));
  const expenses = (Array.isArray(state.expenses) ? state.expenses : [])
    .map(sanitizeExpense)
    .filter((e): e is Expense => Boolean(e));

  const settings: AppSettings = {
    ...defaultSettings(),
    ...(state.settings ?? {}),
    locale: state.settings?.locale === "en" ? "en" : "fa",
    currency: isCurrencyCode(state.settings?.currency)
      ? state.settings!.currency
      : defaultSettings().currency,
    hapticFeedback: state.settings?.hapticFeedback !== false,
  };

  return {
    version: DOMAIN_VERSION,
    currentUser: state.currentUser ?? null,
    groups,
    members,
    expenses,
    settings,
  };
}

export class LocalStorageRepository implements AppRepository {
  constructor(private key = STORAGE_KEY) {}

  load(): AppState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      if (!parsed || typeof parsed !== "object") return null;
      return migrateAppState(parsed);
    } catch {
      return null;
    }
  }

  save(state: AppState): { ok: boolean; error?: string } {
    if (typeof window === "undefined") return { ok: false, error: "ssr" };
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "storage_failed";
      console.warn("[dongbot] persistence save failed", message);
      return { ok: false, error: message };
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

export function createGroupEntity(
  name: string,
  currency: CurrencyCode,
  createdBy: string,
): Group {
  const ts = nowIso();
  return {
    id: createId("grp"),
    name: name.trim().slice(0, 80),
    currency: parseCurrencyCode(currency),
    createdBy,
    createdAt: ts,
    updatedAt: ts,
    inviteCode: createInviteCode(),
  };
}

export function createMemberEntity(
  groupId: string,
  displayName: string,
  extras?: Partial<Member>,
): Member {
  return {
    id: createId("mem"),
    groupId,
    displayName: displayName.trim().slice(0, 80),
    isActive: true,
    createdAt: nowIso(),
    ...extras,
  };
}

export function createExpenseEntity(
  input: Omit<Expense, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Expense {
  const ts = nowIso();
  return {
    ...input,
    description: input.description.trim().slice(0, 200),
    amount: Math.round(input.amount),
    currency: parseCurrencyCode(input.currency),
    id: input.id ?? createId("exp"),
    createdAt: ts,
    updatedAt: ts,
  };
}

export type { Locale };
