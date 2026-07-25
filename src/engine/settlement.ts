import type { Balance, SettlementSuggestion } from "@/domain/types";

/**
 * Minimize number of transfers to settle all debts.
 * Greedy: largest debtor pays largest creditor until both clear.
 * Deterministic: sorts by |net| desc, then memberId for ties.
 */
export function suggestSettlements(balances: Balance[]): SettlementSuggestion[] {
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.net < -0) {
      debtors.push({ memberId: b.memberId, amount: -b.net });
    } else if (b.net > 0) {
      creditors.push({ memberId: b.memberId, amount: b.net });
    }
  }

  const byAmountThenId = (
    a: { memberId: string; amount: number },
    b: { memberId: string; amount: number },
  ) => b.amount - a.amount || a.memberId.localeCompare(b.memberId);

  debtors.sort(byAmountThenId);
  creditors.sort(byAmountThenId);

  const suggestions: SettlementSuggestion[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      suggestions.push({
        fromMemberId: debtors[i].memberId,
        toMemberId: creditors[j].memberId,
        amount: pay,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }

  return suggestions;
}

/** Verify settlements zero out all nets (within integer precision). */
export function applySettlementsToNets(
  balances: Balance[],
  settlements: SettlementSuggestion[],
): Record<string, number> {
  const nets: Record<string, number> = {};
  for (const b of balances) nets[b.memberId] = b.net;
  for (const s of settlements) {
    nets[s.fromMemberId] = (nets[s.fromMemberId] ?? 0) + s.amount;
    nets[s.toMemberId] = (nets[s.toMemberId] ?? 0) - s.amount;
  }
  return nets;
}

export function settlementsClearAll(
  balances: Balance[],
  settlements: SettlementSuggestion[],
): boolean {
  const nets = applySettlementsToNets(balances, settlements);
  return Object.values(nets).every((n) => n === 0);
}
