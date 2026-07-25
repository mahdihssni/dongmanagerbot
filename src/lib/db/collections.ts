import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { ExpenseDoc, GroupDoc, MemberDoc, UserDoc } from "@/lib/db/types";

let indexesReady = false;

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function groups(): Promise<Collection<GroupDoc>> {
  return (await getDb()).collection<GroupDoc>("groups");
}

export async function members(): Promise<Collection<MemberDoc>> {
  return (await getDb()).collection<MemberDoc>("members");
}

export async function expenses(): Promise<Collection<ExpenseDoc>> {
  return (await getDb()).collection<ExpenseDoc>("expenses");
}

export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;
  const [u, g, m, e] = await Promise.all([users(), groups(), members(), expenses()]);

  await Promise.all([
    u.createIndex({ telegramId: 1 }, { unique: true, sparse: true }),
    u.createIndex({ id: 1 }, { unique: true }),
    g.createIndex({ id: 1 }, { unique: true }),
    g.createIndex({ inviteCode: 1 }, { unique: true }),
    m.createIndex({ id: 1 }, { unique: true }),
    m.createIndex({ groupId: 1 }),
    m.createIndex(
      { groupId: 1, telegramId: 1 },
      {
        unique: true,
        partialFilterExpression: { isActive: true, telegramId: { $type: "number" } },
      },
    ),
    e.createIndex({ id: 1 }, { unique: true }),
    e.createIndex({ groupId: 1 }),
    e.createIndex(
      { clientRequestId: 1 },
      { unique: true, sparse: true },
    ),
  ]);

  indexesReady = true;
}
