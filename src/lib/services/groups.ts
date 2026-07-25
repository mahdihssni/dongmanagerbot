import { createId, nowIso } from "@/domain";
import type { AppSettings, Expense, Group, Member, User } from "@/domain/types";
import { createInviteCode } from "@/lib/ids";
import { parseCurrencyCode } from "@/lib/config";
import {
  ensureIndexes,
  expenses,
  groups,
  members,
  users,
} from "@/lib/db/collections";
import type {
  CreateExpenseInput,
  CreateGroupInput,
  CreateMemberInput,
  GroupBundle,
  MeResponse,
} from "@/lib/db/types";

export class ServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function requireMembership(user: User, groupId: string): Promise<Member> {
  const col = await members();
  const member = await col.findOne({
    groupId,
    isActive: true,
    $or: [
      ...(user.telegramId ? [{ telegramId: user.telegramId }] : []),
      { userId: user.id },
    ],
  });
  if (!member) throw new ServiceError("Not a member of this group", 403);
  return member;
}

export async function getMe(user: User, settings: AppSettings): Promise<MeResponse> {
  await ensureIndexes();
  const memberCol = await members();
  const myMemberships = await memberCol
    .find({
      isActive: true,
      $or: [
        ...(user.telegramId ? [{ telegramId: user.telegramId }] : []),
        { userId: user.id },
      ],
    })
    .toArray();

  const groupIds = [...new Set(myMemberships.map((m) => m.groupId))];
  if (groupIds.length === 0) {
    return { user, settings, groups: [], members: [], expenses: [] };
  }

  const [groupDocs, memberDocs, expenseDocs] = await Promise.all([
    (await groups()).find({ id: { $in: groupIds }, archived: { $ne: true } }).toArray(),
    memberCol.find({ groupId: { $in: groupIds } }).toArray(),
    (await expenses()).find({ groupId: { $in: groupIds } }).toArray(),
  ]);

  return {
    user,
    settings,
    groups: groupDocs,
    members: memberDocs,
    expenses: expenseDocs,
  };
}

export async function updateSettings(
  user: User,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  await ensureIndexes();
  const col = await users();
  const existing = await col.findOne({ id: user.id });
  if (!existing) throw new ServiceError("User not found", 404);
  const settings: AppSettings = {
    ...existing.settings,
    ...patch,
    locale: patch.locale === "en" || patch.locale === "fa" ? patch.locale : existing.settings.locale,
    currency: patch.currency ? parseCurrencyCode(patch.currency) : existing.settings.currency,
    hapticFeedback:
      typeof patch.hapticFeedback === "boolean"
        ? patch.hapticFeedback
        : existing.settings.hapticFeedback,
  };
  await col.updateOne({ id: user.id }, { $set: { settings, updatedAt: nowIso() } });
  return settings;
}

export async function listGroups(user: User): Promise<Group[]> {
  const me = await getMe(user, { locale: "fa", currency: "IRT", hapticFeedback: true });
  return me.groups;
}

export async function getGroupBundle(user: User, groupId: string): Promise<GroupBundle> {
  await requireMembership(user, groupId);
  const group = await (await groups()).findOne({ id: groupId });
  if (!group) throw new ServiceError("Group not found", 404);
  const [memberDocs, expenseDocs] = await Promise.all([
    (await members()).find({ groupId }).toArray(),
    (await expenses()).find({ groupId }).sort({ createdAt: -1 }).toArray(),
  ]);
  return { group, members: memberDocs, expenses: expenseDocs };
}

export async function createGroup(
  user: User,
  input: CreateGroupInput,
): Promise<GroupBundle> {
  await ensureIndexes();
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new ServiceError("Group name is required");

  const ts = nowIso();
  const group: Group = {
    id: createId("grp"),
    name,
    currency: parseCurrencyCode(input.currency),
    createdBy: user.id,
    createdAt: ts,
    updatedAt: ts,
    inviteCode: createInviteCode(),
  };

  const displayName =
    input.firstMemberName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ");

  const member: Member = {
    id: createId("mem"),
    groupId: group.id,
    displayName: displayName.slice(0, 80),
    userId: user.id,
    telegramId: user.telegramId,
    isActive: true,
    createdAt: ts,
  };

  await (await groups()).insertOne(group);
  await (await members()).insertOne(member);
  return { group, members: [member], expenses: [] };
}

export async function updateGroup(
  user: User,
  groupId: string,
  patch: Partial<Pick<Group, "name" | "currency" | "archived">>,
): Promise<Group> {
  await requireMembership(user, groupId);
  const col = await groups();
  const existing = await col.findOne({ id: groupId });
  if (!existing) throw new ServiceError("Group not found", 404);

  const next: Group = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim().slice(0, 80) : existing.name,
    currency: patch.currency ? parseCurrencyCode(patch.currency) : existing.currency,
    archived: typeof patch.archived === "boolean" ? patch.archived : existing.archived,
    updatedAt: nowIso(),
  };
  if (!next.name) throw new ServiceError("Group name is required");
  await col.updateOne({ id: groupId }, { $set: next });
  return next;
}

export async function addMember(
  user: User,
  groupId: string,
  input: CreateMemberInput,
): Promise<Member> {
  await requireMembership(user, groupId);
  const displayName = input.displayName.trim().slice(0, 80);
  if (!displayName) throw new ServiceError("Member name is required");

  const member: Member = {
    id: createId("mem"),
    groupId,
    displayName,
    isActive: true,
    createdAt: nowIso(),
  };
  await (await members()).insertOne(member);
  return member;
}

export async function deactivateMember(user: User, memberId: string): Promise<Member> {
  const col = await members();
  const member = await col.findOne({ id: memberId });
  if (!member) throw new ServiceError("Member not found", 404);
  await requireMembership(user, member.groupId);
  const next = { ...member, isActive: false };
  await col.updateOne({ id: memberId }, { $set: { isActive: false } });
  return next;
}

export async function addExpense(
  user: User,
  groupId: string,
  input: CreateExpenseInput,
): Promise<Expense> {
  await requireMembership(user, groupId);
  const group = await (await groups()).findOne({ id: groupId });
  if (!group) throw new ServiceError("Group not found", 404);

  if (!input.description.trim()) throw new ServiceError("Description is required");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ServiceError("Invalid amount");
  }

  const col = await expenses();
  if (input.clientRequestId) {
    const existing = await col.findOne({ clientRequestId: input.clientRequestId });
    if (existing) return existing;
  }

  const ts = nowIso();
  const expense: Expense = {
    id: createId("exp"),
    groupId,
    description: input.description.trim().slice(0, 200),
    amount: Math.round(input.amount),
    currency: parseCurrencyCode(input.currency || group.currency),
    payerId: input.payerId,
    splitType: input.splitType,
    participantIds: input.participantIds,
    shares: input.shares ?? [],
    payerIncluded: input.payerIncluded,
    note: input.note?.trim().slice(0, 500),
    createdBy: user.id,
    createdAt: ts,
    updatedAt: ts,
    clientRequestId: input.clientRequestId,
  };

  await col.insertOne(expense);
  return expense;
}

export async function updateExpense(
  user: User,
  expenseId: string,
  patch: Partial<CreateExpenseInput>,
): Promise<Expense> {
  const col = await expenses();
  const existing = await col.findOne({ id: expenseId });
  if (!existing) throw new ServiceError("Expense not found", 404);
  await requireMembership(user, existing.groupId);

  const next: Expense = {
    ...existing,
    description:
      patch.description !== undefined
        ? patch.description.trim().slice(0, 200)
        : existing.description,
    amount:
      patch.amount !== undefined ? Math.round(patch.amount) : existing.amount,
    currency: patch.currency
      ? parseCurrencyCode(patch.currency)
      : existing.currency,
    payerId: patch.payerId ?? existing.payerId,
    splitType: patch.splitType ?? existing.splitType,
    participantIds: patch.participantIds ?? existing.participantIds,
    shares: patch.shares ?? existing.shares,
    payerIncluded:
      typeof patch.payerIncluded === "boolean"
        ? patch.payerIncluded
        : existing.payerIncluded,
    note: patch.note !== undefined ? patch.note.trim().slice(0, 500) : existing.note,
    updatedAt: nowIso(),
  };

  if (!next.description) throw new ServiceError("Description is required");
  if (!Number.isFinite(next.amount) || next.amount <= 0) {
    throw new ServiceError("Invalid amount");
  }

  await col.updateOne({ id: expenseId }, { $set: next });
  return next;
}

export async function deleteExpense(user: User, expenseId: string): Promise<void> {
  const col = await expenses();
  const existing = await col.findOne({ id: expenseId });
  if (!existing) throw new ServiceError("Expense not found", 404);
  await requireMembership(user, existing.groupId);
  await col.deleteOne({ id: expenseId });
}

export async function resolveInvite(code: string): Promise<Group | null> {
  await ensureIndexes();
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  return (await groups()).findOne({ inviteCode: normalized, archived: { $ne: true } });
}

export async function joinInvite(
  user: User,
  code: string,
): Promise<
  | { status: "joined"; group: Group; member: Member }
  | { status: "already_member"; group: Group; member: Member }
  | { status: "invalid" }
> {
  const group = await resolveInvite(code);
  if (!group) return { status: "invalid" };

  const col = await members();
  const existing = await col.findOne({
    groupId: group.id,
    isActive: true,
    $or: [
      ...(user.telegramId ? [{ telegramId: user.telegramId }] : []),
      { userId: user.id },
    ],
  });
  if (existing) {
    return { status: "already_member", group, member: existing };
  }

  const member: Member = {
    id: createId("mem"),
    groupId: group.id,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ").slice(0, 80),
    userId: user.id,
    telegramId: user.telegramId,
    isActive: true,
    createdAt: nowIso(),
  };
  await col.insertOne(member);
  return { status: "joined", group, member };
}

export function serviceErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}
