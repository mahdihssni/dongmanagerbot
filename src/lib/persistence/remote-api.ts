import type {
  AppSettings,
  CurrencyCode,
  Expense,
  Group,
  JoinInviteResult,
  Member,
  User,
} from "@/domain/types";
import type { CreateExpenseInput, GroupBundle, MeResponse } from "@/lib/db/types";
import { readTelegramInitData } from "@/lib/telegram/webapp";

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const initData = readTelegramInitData();
  if (initData) {
    headers.Authorization = `tma ${initData}`;
  } else if (process.env.NEXT_PUBLIC_ALLOW_DEV_AUTH === "true") {
    // Mirror server ALLOW_DEV_AUTH for browser-only local testing
    headers["x-dev-user"] = JSON.stringify({
      id: "user_demo",
      firstName: "کاربر",
      lastName: "آزمایشی",
      username: "demo_user",
      languageCode: "fa",
    });
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: string }).error)
        : `Request failed (${res.status})`;
    throw new ApiClientError(message, res.status);
  }

  return body as T;
}

export async function fetchHealth(): Promise<{
  mongoConfigured: boolean;
  mongoConnected: boolean;
}> {
  try {
    const data = await request<{
      mongoConfigured?: boolean;
      mongoConnected?: boolean;
    }>("/api/health");
    return {
      mongoConfigured: Boolean(data.mongoConfigured),
      mongoConnected: Boolean(data.mongoConnected),
    };
  } catch {
    return { mongoConfigured: false, mongoConnected: false };
  }
}

export async function apiGetMe(): Promise<MeResponse> {
  return request<MeResponse>("/api/me");
}

export async function apiUpdateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const data = await request<{ settings: AppSettings }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.settings;
}

export async function apiCreateGroup(input: {
  name: string;
  currency: CurrencyCode;
  firstMemberName?: string;
}): Promise<GroupBundle> {
  return request<GroupBundle>("/api/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiAddMember(
  groupId: string,
  displayName: string,
): Promise<Member> {
  const data = await request<{ member: Member }>(
    `/api/groups/${encodeURIComponent(groupId)}/members`,
    {
      method: "POST",
      body: JSON.stringify({ displayName }),
    },
  );
  return data.member;
}

export async function apiDeactivateMember(memberId: string): Promise<Member> {
  const data = await request<{ member: Member }>(
    `/api/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    },
  );
  return data.member;
}

export async function apiAddExpense(
  groupId: string,
  input: CreateExpenseInput,
): Promise<Expense> {
  const data = await request<{ expense: Expense }>(
    `/api/groups/${encodeURIComponent(groupId)}/expenses`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.expense;
}

export async function apiUpdateExpense(
  expenseId: string,
  patch: Partial<CreateExpenseInput>,
): Promise<Expense> {
  const data = await request<{ expense: Expense }>(
    `/api/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return data.expense;
}

export async function apiDeleteExpense(expenseId: string): Promise<void> {
  await request(`/api/expenses/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  });
}

export async function apiJoinInvite(code: string): Promise<
  | { status: "joined" | "already_member"; group: Group; memberId: string; member: Member }
  | { status: "invalid" }
> {
  try {
    return await request(`/api/invites/${encodeURIComponent(code)}`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      return { status: "invalid" };
    }
    throw err;
  }
}

export type { User, JoinInviteResult };
