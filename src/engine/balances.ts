import { computeExpenseOwes, validateSplitInput } from "@/engine/splits";
import type { Balance, Expense, Member } from "@/domain/types";

/**
 * Apply a single expense to a running net map.
 *
 * Conventions:
 * - Normal expense: payer paid `amount`; each participant owes their share.
 * - Transfer / refund / adjustment: pairwise net adjustments.
 */
export function applyExpenseToNets(
  nets: Record<string, number>,
  expense: Expense,
): void {
  const bump = (id: string, delta: number) => {
    if (!id) return;
    nets[id] = (nets[id] ?? 0) + delta;
  };

  if (expense.splitType === "transfer") {
    const recipientId = expense.participantIds[0];
    if (!recipientId) return;
    bump(expense.payerId, expense.amount);
    bump(recipientId, -expense.amount);
    return;
  }

  if (expense.splitType === "refund") {
    const fromId = expense.participantIds[0];
    if (!fromId) return;
    bump(expense.payerId, expense.amount);
    bump(fromId, -expense.amount);
    return;
  }

  if (expense.splitType === "adjustment") {
    const debtorId = expense.participantIds[0];
    if (!debtorId) return;
    bump(expense.payerId, expense.amount);
    bump(debtorId, -expense.amount);
    return;
  }

  const { owes } = computeExpenseOwes(expense);
  bump(expense.payerId, expense.amount);
  for (const [memberId, amount] of Object.entries(owes)) {
    bump(memberId, -amount);
  }
}

/** Skip corrupt expenses instead of crashing the balances UI. */
export function computeBalances(
  members: Member[],
  expenses: Expense[],
  groupId: string,
): Balance[] {
  const groupMembers = members.filter((m) => m.groupId === groupId);
  const nets: Record<string, number> = {};
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  for (const m of groupMembers) {
    nets[m.id] = 0;
    paid[m.id] = 0;
    owed[m.id] = 0;
  }

  const groupExpenses = expenses.filter((e) => e.groupId === groupId);

  for (const expense of groupExpenses) {
    try {
      const invalid = validateSplitInput(expense);
      if (invalid) continue;

      if (
        expense.splitType === "transfer" ||
        expense.splitType === "refund" ||
        expense.splitType === "adjustment"
      ) {
        applyExpenseToNets(nets, expense);
        continue;
      }

      const { owes } = computeExpenseOwes(expense);
      paid[expense.payerId] = (paid[expense.payerId] ?? 0) + expense.amount;
      for (const [memberId, amount] of Object.entries(owes)) {
        owed[memberId] = (owed[memberId] ?? 0) + amount;
      }
      applyExpenseToNets(nets, expense);
    } catch (err) {
      console.warn("[dongbot] skipped invalid expense", expense.id, err);
    }
  }

  return groupMembers.map((m) => ({
    memberId: m.id,
    net: nets[m.id] ?? 0,
    paid: paid[m.id] ?? 0,
    owed: owed[m.id] ?? 0,
  }));
}

export function memberBalanceMap(balances: Balance[]): Map<string, Balance> {
  return new Map(balances.map((b) => [b.memberId, b]));
}
