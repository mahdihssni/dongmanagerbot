import { describe, expect, it } from "vitest";
import {
  distributeProportionally,
  formatAmountInput,
  parseAmountInput,
  roundMoney,
  splitEqually,
} from "@/engine/money";
import { computeExpenseOwes, validateSplitInput } from "@/engine/splits";
import { computeBalances } from "@/engine/balances";
import {
  settlementsClearAll,
  suggestSettlements,
} from "@/engine/settlement";
import type { Expense, Member } from "@/domain/types";

const baseExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "payerId" | "participantIds" | "splitType">,
): Expense => ({
  id: "e1",
  groupId: "g1",
  description: "test",
  currency: "IRT",
  shares: [],
  payerIncluded: true,
  createdBy: "u1",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("money", () => {
  it("rounds half away from zero", () => {
    expect(roundMoney(1.5)).toBe(2);
    expect(roundMoney(-1.5)).toBe(-2);
  });

  it("splits equally with remainder on first slots by fractional order", () => {
    expect(splitEqually(100, 3)).toEqual([34, 33, 33]);
    expect(splitEqually(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it("distributes proportionally and preserves total", () => {
    const parts = distributeProportionally(1000, [1, 2, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([250, 500, 250]);
  });
});

describe("splits", () => {
  it("validates empty participants", () => {
    const err = validateSplitInput({
      amount: 100,
      payerId: "a",
      splitType: "equal",
      participantIds: [],
      shares: [],
      payerIncluded: false,
    });
    expect(err?.code).toBe("EMPTY_PARTICIPANTS");
  });

  it("rejects bad percentages", () => {
    const err = validateSplitInput({
      amount: 100,
      payerId: "a",
      splitType: "percentage",
      participantIds: ["a", "b"],
      shares: [
        { memberId: "a", value: 40 },
        { memberId: "b", value: 40 },
      ],
      payerIncluded: true,
    });
    expect(err?.code).toBe("PERCENTAGE_MISMATCH");
  });

  it("equal split includes payer when in participants", () => {
    const { owes, totalOwed } = computeExpenseOwes({
      amount: 90,
      payerId: "a",
      splitType: "equal",
      participantIds: ["a", "b", "c"],
      shares: [],
      payerIncluded: true,
    });
    expect(totalOwed).toBe(90);
    expect(owes).toEqual({ a: 30, b: 30, c: 30 });
  });

  it("payer excluded: only others owe", () => {
    const { owes } = computeExpenseOwes({
      amount: 100,
      payerId: "a",
      splitType: "equal",
      participantIds: ["b", "c"],
      shares: [],
      payerIncluded: false,
    });
    expect(owes).toEqual({ b: 50, c: 50 });
    expect(owes.a).toBeUndefined();
  });

  it("exact amounts must sum to total", () => {
    const err = validateSplitInput({
      amount: 100,
      payerId: "a",
      splitType: "exact",
      participantIds: ["a", "b"],
      shares: [
        { memberId: "a", value: 40 },
        { memberId: "b", value: 50 },
      ],
      payerIncluded: true,
    });
    expect(err?.code).toBe("AMOUNT_MISMATCH");
  });

  it("percentage split is deterministic", () => {
    const { owes } = computeExpenseOwes({
      amount: 1000,
      payerId: "a",
      splitType: "percentage",
      participantIds: ["a", "b", "c"],
      shares: [
        { memberId: "a", value: 50 },
        { memberId: "b", value: 30 },
        { memberId: "c", value: 20 },
      ],
      payerIncluded: true,
    });
    expect(owes).toEqual({ a: 500, b: 300, c: 200 });
  });

  it("shares/ratios split", () => {
    const { owes, totalOwed } = computeExpenseOwes({
      amount: 900,
      payerId: "a",
      splitType: "shares",
      participantIds: ["a", "b", "c"],
      shares: [
        { memberId: "a", value: 1 },
        { memberId: "b", value: 2 },
        { memberId: "c", value: 3 },
      ],
      payerIncluded: true,
    });
    expect(totalOwed).toBe(900);
    expect(owes).toEqual({ a: 150, b: 300, c: 450 });
  });
});

describe("balances + settlement", () => {
  const members: Member[] = [
    {
      id: "a",
      groupId: "g1",
      displayName: "Ali",
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      groupId: "g1",
      displayName: "Sara",
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "c",
      groupId: "g1",
      displayName: "Reza",
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  ];

  it("computes nets when one person pays for all equally", () => {
    const expenses = [
      baseExpense({
        amount: 300,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a", "b", "c"],
        payerIncluded: true,
      }),
    ];
    const balances = computeBalances(members, expenses, "g1");
    const map = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(map).toEqual({ a: 200, b: -100, c: -100 });
  });

  it("handles payer excluded from split", () => {
    const expenses = [
      baseExpense({
        amount: 200,
        payerId: "a",
        splitType: "equal",
        participantIds: ["b", "c"],
        payerIncluded: false,
      }),
    ];
    const balances = computeBalances(members, expenses, "g1");
    const map = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(map).toEqual({ a: 200, b: -100, c: -100 });
  });

  it("records transfers", () => {
    const expenses = [
      baseExpense({
        amount: 300,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a", "b", "c"],
      }),
      baseExpense({
        id: "e2",
        amount: 100,
        payerId: "b",
        splitType: "transfer",
        participantIds: ["a"],
        description: "b pays a",
      }),
    ];
    const balances = computeBalances(members, expenses, "g1");
    const map = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(map.a).toBe(100);
    expect(map.b).toBe(0);
    expect(map.c).toBe(-100);
  });

  it("suggests minimal settlements that clear all debts", () => {
    const expenses = [
      baseExpense({
        amount: 300,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a", "b", "c"],
      }),
    ];
    const balances = computeBalances(members, expenses, "g1");
    const suggestions = suggestSettlements(balances);
    expect(suggestions.length).toBeLessThanOrEqual(2);
    expect(settlementsClearAll(balances, suggestions)).toBe(true);
    expect(suggestions).toEqual(
      expect.arrayContaining([
        { fromMemberId: "b", toMemberId: "a", amount: 100 },
        { fromMemberId: "c", toMemberId: "a", amount: 100 },
      ]),
    );
  });

  it("rejects zero and negative amounts", () => {
    expect(
      validateSplitInput({
        amount: 0,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a"],
        shares: [],
        payerIncluded: true,
      })?.code,
    ).toBe("INVALID_AMOUNT");
    expect(
      validateSplitInput({
        amount: -5,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a"],
        shares: [],
        payerIncluded: true,
      })?.code,
    ).toBe("INVALID_AMOUNT");
  });

  it("handles refund and full split in balances", () => {
    const expenses = [
      baseExpense({
        amount: 300,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a", "b", "c"],
      }),
      baseExpense({
        id: "e2",
        amount: 50,
        payerId: "a",
        splitType: "refund",
        participantIds: ["b"],
        description: "refund",
      }),
    ];
    const balances = computeBalances(members, expenses, "g1");
    const map = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(map.a).toBe(250);
    expect(map.b).toBe(-150);
    expect(map.c).toBe(-100);
  });

  it("skips corrupt expenses instead of throwing", () => {
    const expenses = [
      baseExpense({
        amount: 90,
        payerId: "a",
        splitType: "equal",
        participantIds: ["a", "b", "c"],
      }),
      {
        ...baseExpense({
          id: "bad",
          amount: 100,
          payerId: "a",
          splitType: "percentage",
          participantIds: ["a", "b"],
          shares: [
            { memberId: "a", value: 10 },
            { memberId: "b", value: 10 },
          ],
        }),
      },
    ];
    expect(() => computeBalances(members, expenses, "g1")).not.toThrow();
    const balances = computeBalances(members, expenses, "g1");
    expect(balances.find((b) => b.memberId === "a")?.net).toBe(60);
  });
});

describe("amount input formatting", () => {
  it("parses Persian digits and separators", () => {
    expect(parseAmountInput("۱٬۵۰۰٬۰۰۰", "IRT")).toBe(1_500_000);
    expect(parseAmountInput("1,500,000", "IRT")).toBe(1_500_000);
  });

  it("formats live input with grouping", () => {
    expect(formatAmountInput("1500000", "en")).toBe("1,500,000");
    expect(formatAmountInput("1500000", "fa")).toContain("٬");
  });
});
