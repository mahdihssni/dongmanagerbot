import type { CurrencyCode, Expense, Member, SplitShare, SplitType } from "./types";

export const DOMAIN_VERSION = 1;

export const CURRENCY_META: Record<
  CurrencyCode,
  { decimals: number; symbol: string; nameFa: string; nameEn: string }
> = {
  IRR: { decimals: 0, symbol: "﷼", nameFa: "ریال", nameEn: "Iranian Rial" },
  IRT: { decimals: 0, symbol: "تومان", nameFa: "تومان", nameEn: "Toman" },
  USD: { decimals: 2, symbol: "$", nameFa: "دلار", nameEn: "US Dollar" },
  EUR: { decimals: 2, symbol: "€", nameFa: "یورو", nameEn: "Euro" },
  TRY: { decimals: 2, symbol: "₺", nameFa: "لیر", nameEn: "Turkish Lira" },
};

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function displayName(member: Pick<Member, "displayName">): string {
  return member.displayName.trim() || "—";
}

export function isTransferLike(type: SplitType): boolean {
  return type === "transfer" || type === "refund" || type === "adjustment";
}

export function sumShares(shares: SplitShare[]): number {
  return shares.reduce((acc, s) => acc + s.value, 0);
}

export function findMember(members: Member[], id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function activeMembers(members: Member[], groupId: string): Member[] {
  return members.filter((m) => m.groupId === groupId && m.isActive);
}

export function expensesForGroup(expenses: Expense[], groupId: string): Expense[] {
  return expenses
    .filter((e) => e.groupId === groupId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
