import { computeExpenseOwes } from "@/engine/splits";
import type { Balance, Expense, Member } from "@/domain/types";

/**
 * Apply a single expense to a running net map.
 *
 * Conventions:
 * - Normal expense: payer paid `amount`; each participant owes their share.
 *   net[payer] += amount; net[participant] -= owe
 * - Transfer: payer gives cash to recipient → net[payer] += amount; net[recipient] -= amount
 *   (settles debt: if recipient was owed, this reduces what payer owes them)
 * - Refund: participant refunds payer → same as transfer from participant to payer
 *   We model: payerId = person receiving refund, participant = who pays refund
 *   → net[participant] += amount? No:
 *   Refund means money flows FROM participant TO payer (payer gets money back).
 *   net[payer] += amount; net[participant] -= amount — same as transfer where
 *   "payer" in our field is the recipient of cash. For refund we use:
 *   payerId = person being refunded (receives), participant = refunds them.
 * - Adjustment: participant owes payer `amount` extra (no cash moved yet)
 *   net[payer] += amount; net[participant] -= amount
 */
export function applyExpenseToNets(
  nets: Record<string, number>,
  expense: Expense,
): void {
  const bump = (id: string, delta: number) => {
    nets[id] = (nets[id] ?? 0) + delta;
  };

  if (expense.splitType === "transfer") {
    const recipientId = expense.participantIds[0];
    bump(expense.payerId, expense.amount);
    bump(recipientId, -expense.amount);
    return;
  }

  if (expense.splitType === "refund") {
    // payer receives refund from participant
    const fromId = expense.participantIds[0];
    bump(expense.payerId, expense.amount);
    bump(fromId, -expense.amount);
    return;
  }

  if (expense.splitType === "adjustment") {
    const debtorId = expense.participantIds[0];
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
