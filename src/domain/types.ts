/** Core domain types for DongBot expense splitting. */

export type CurrencyCode = "IRR" | "IRT" | "USD" | "EUR" | "TRY";

export type Locale = "fa" | "en";

export type SplitType =
  | "equal"
  | "exact"
  | "percentage"
  | "shares"
  | "full" // one person owes everything (payer paid for others)
  | "transfer" // direct payment between members
  | "refund"
  | "adjustment";

export interface User {
  id: string;
  telegramId?: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
}

export interface Member {
  id: string;
  groupId: string;
  userId?: string;
  displayName: string;
  telegramId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  currency: CurrencyCode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Short code used in Telegram startapp invite links */
  inviteCode: string;
  /** Soft archive — hidden from home but retained for history */
  archived?: boolean;
}

export type JoinInviteResult =
  | { status: "joined"; group: Group; memberId: string }
  | { status: "already_member"; group: Group; memberId: string }
  | { status: "invalid" };

export interface SplitShare {
  memberId: string;
  /** Absolute amount in minor units (e.g. rials), or percentage/shares depending on splitType */
  value: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  /** Amount in minor currency units (integer). For IRR this is rials. */
  amount: number;
  currency: CurrencyCode;
  payerId: string;
  splitType: SplitType;
  /** Participants who share the cost (may exclude payer). */
  participantIds: string[];
  /** Per-participant values for exact / percentage / shares. */
  shares: SplitShare[];
  /** Whether the payer is also among those who owe a share. */
  payerIncluded: boolean;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Idempotency key to prevent duplicate submissions. */
  clientRequestId?: string;
}

export interface Balance {
  memberId: string;
  /** Positive = others owe them; negative = they owe others. */
  net: number;
  paid: number;
  owed: number;
}

export interface SettlementSuggestion {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface TransferRecord {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: CurrencyCode;
  note?: string;
  createdAt: string;
  /** Linked expense id when recorded as a transfer expense. */
  expenseId?: string;
}

export interface AppSettings {
  locale: Locale;
  currency: CurrencyCode;
  hapticFeedback: boolean;
}

export interface AppState {
  version: number;
  currentUser: User | null;
  groups: Group[];
  members: Member[];
  expenses: Expense[];
  settings: AppSettings;
}
