import { distributeProportionally, roundMoney, splitEqually } from "@/engine/money";
import { isTransferLike, sumShares } from "@/domain";
import type { Expense, SplitShare, SplitType } from "@/domain/types";

export interface SplitValidationError {
  code:
    | "EMPTY_PARTICIPANTS"
    | "INVALID_AMOUNT"
    | "AMOUNT_MISMATCH"
    | "PERCENTAGE_MISMATCH"
    | "SHARES_INVALID"
    | "MISSING_PAYER"
    | "UNKNOWN_MEMBER"
    | "TRANSFER_NEEDS_ONE"
    | "NEGATIVE_SHARE";
  message: string;
}

export interface ComputedOwes {
  /** memberId → amount they owe toward this expense */
  owes: Record<string, number>;
  /** Sum of all owes (should equal amount for normal expenses) */
  totalOwed: number;
}

export function validateSplitInput(expense: Pick<
  Expense,
  | "amount"
  | "payerId"
  | "splitType"
  | "participantIds"
  | "shares"
  | "payerIncluded"
>): SplitValidationError | null {
  const { amount, payerId, splitType, participantIds, shares } = expense;

  if (!payerId) {
    return { code: "MISSING_PAYER", message: "Payer is required." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { code: "INVALID_AMOUNT", message: "Amount must be a positive number." };
  }
  if (shares.some((s) => s.value < 0)) {
    return { code: "NEGATIVE_SHARE", message: "Share values cannot be negative." };
  }

  if (isTransferLike(splitType)) {
    if (participantIds.length !== 1) {
      return {
        code: "TRANSFER_NEEDS_ONE",
        message: "Transfer/refund/adjustment needs exactly one counterparty.",
      };
    }
    return null;
  }

  if (participantIds.length === 0) {
    return { code: "EMPTY_PARTICIPANTS", message: "Select at least one participant." };
  }

  if (splitType === "exact") {
    const total = sumShares(shares.filter((s) => participantIds.includes(s.memberId)));
    if (roundMoney(total) !== roundMoney(amount)) {
      return {
        code: "AMOUNT_MISMATCH",
        message: `Exact shares (${total}) must equal expense amount (${amount}).`,
      };
    }
  }

  if (splitType === "percentage") {
    const total = sumShares(shares.filter((s) => participantIds.includes(s.memberId)));
    if (Math.abs(total - 100) > 0.01) {
      return {
        code: "PERCENTAGE_MISMATCH",
        message: `Percentages must sum to 100 (got ${total}).`,
      };
    }
  }

  if (splitType === "shares") {
    const total = sumShares(shares.filter((s) => participantIds.includes(s.memberId)));
    if (total <= 0) {
      return { code: "SHARES_INVALID", message: "Share ratios must sum to more than zero." };
    }
  }

  return null;
}

/**
 * Compute how much each participant owes for a single expense.
 * Pure and deterministic — used by balances and the preview UI.
 */
export function computeExpenseOwes(
  expense: Pick<
    Expense,
    "amount" | "payerId" | "splitType" | "participantIds" | "shares" | "payerIncluded"
  >,
): ComputedOwes {
  const error = validateSplitInput(expense);
  if (error) {
    throw new Error(`${error.code}: ${error.message}`);
  }

  const { amount, splitType, participantIds, shares } = expense;
  const owes: Record<string, number> = {};

  if (splitType === "transfer") {
    // Counterparty receives; payer is the one who paid them (debt reduction).
    // In balance terms: from pays to `to`, so `to` is owed by from... 
    // We model transfer as: payerId pays amount on behalf of / to participant.
    // Convention: payer → participant means payer gives money to participant.
    // Balance: payer net +, participant net − (participant received cash settlement).
    // For expense engine we treat it as participant "owes" 0 and we handle in applyExpense.
    // Simpler: transfer expense: participantIds[0] is recipient.
    // Paid by payer, received by recipient → adjust nets specially in balances.
    owes[participantIds[0]] = 0;
    return { owes, totalOwed: 0 };
  }

  if (splitType === "refund") {
    // Refund: payer receives money back from participant (or vice versa).
    // Modeled as negative expense paid by original payer? 
    // We treat refund as: payerId is being refunded by participantIds[0].
    // Balance impact handled in balances.ts
    owes[participantIds[0]] = amount;
    return { owes, totalOwed: amount };
  }

  if (splitType === "adjustment") {
    // Adjustment: arbitrary debt from participant to payer of `amount`.
    owes[participantIds[0]] = amount;
    return { owes, totalOwed: amount };
  }

  if (splitType === "full") {
    // One person (or each selected) collectively owe the full amount equally among participants.
    // Typically one participant owes everything.
    const parts = splitEqually(amount, participantIds.length);
    participantIds.forEach((id, i) => {
      owes[id] = parts[i];
    });
    return { owes, totalOwed: amount };
  }

  const shareMap = new Map(shares.map((s) => [s.memberId, s.value]));

  if (splitType === "equal") {
    const parts = splitEqually(amount, participantIds.length);
    participantIds.forEach((id, i) => {
      owes[id] = parts[i];
    });
  } else if (splitType === "exact") {
    participantIds.forEach((id) => {
      owes[id] = roundMoney(shareMap.get(id) ?? 0);
    });
  } else if (splitType === "percentage") {
    const weights = participantIds.map((id) => shareMap.get(id) ?? 0);
    const parts = distributeProportionally(amount, weights);
    participantIds.forEach((id, i) => {
      owes[id] = parts[i];
    });
  } else if (splitType === "shares") {
    const weights = participantIds.map((id) => shareMap.get(id) ?? 0);
    const parts = distributeProportionally(amount, weights);
    participantIds.forEach((id, i) => {
      owes[id] = parts[i];
    });
  }

  // Payer exclusion is represented by omitting them from participantIds.
  const totalOwed = Object.values(owes).reduce((a, b) => a + b, 0);
  return { owes, totalOwed };
}

export function buildEqualShares(participantIds: string[]): SplitShare[] {
  return participantIds.map((memberId) => ({ memberId, value: 1 }));
}

export function buildPercentageShares(
  participantIds: string[],
  percents: number[],
): SplitShare[] {
  return participantIds.map((memberId, i) => ({
    memberId,
    value: percents[i] ?? 0,
  }));
}

export function suggestedSplitTypeLabel(type: SplitType): string {
  return type;
}
