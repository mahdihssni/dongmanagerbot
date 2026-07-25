import { DOMAIN_VERSION, createId, nowIso } from "@/domain";
import type {
  AppSettings,
  AppState,
  CurrencyCode,
  Expense,
  Group,
  Locale,
  Member,
  User,
} from "@/domain/types";

export const STORAGE_KEY = "dongbot.v1";

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

export function createSampleState(user: User = demoUser()): AppState {
  const g1 = createId("grp");
  const mAli = createId("mem");
  const mSara = createId("mem");
  const mReza = createId("mem");
  const now = nowIso();

  const members: Member[] = [
    {
      id: mAli,
      groupId: g1,
      displayName: "علی",
      userId: user.id,
      isActive: true,
      createdAt: now,
    },
    {
      id: mSara,
      groupId: g1,
      displayName: "سارا",
      isActive: true,
      createdAt: now,
    },
    {
      id: mReza,
      groupId: g1,
      displayName: "رضا",
      isActive: true,
      createdAt: now,
    },
  ];

  const groups: Group[] = [
    {
      id: g1,
      name: "سفر شمال",
      currency: "IRT",
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const expenses: Expense[] = [
    {
      id: createId("exp"),
      groupId: g1,
      description: "ناهار رستوران",
      amount: 1_500_000,
      currency: "IRT",
      payerId: mAli,
      splitType: "equal",
      participantIds: [mAli, mSara, mReza],
      shares: [],
      payerIncluded: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("exp"),
      groupId: g1,
      description: "بنزین",
      amount: 800_000,
      currency: "IRT",
      payerId: mSara,
      splitType: "equal",
      participantIds: [mAli, mSara, mReza],
      shares: [],
      payerIncluded: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    version: DOMAIN_VERSION,
    currentUser: user,
    groups,
    members,
    expenses,
    settings: defaultSettings(),
  };
}

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

/** Repository interface — swap localStorage for API later. */
export interface AppRepository {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
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
      return parsed;
    } catch {
      return null;
    }
  }

  save(state: AppState): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(state));
  }

  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(this.key);
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
    name: name.trim(),
    currency,
    createdBy,
    createdAt: ts,
    updatedAt: ts,
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
    displayName: displayName.trim(),
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
    id: input.id ?? createId("exp"),
    createdAt: ts,
    updatedAt: ts,
  };
}

export type { Locale };
