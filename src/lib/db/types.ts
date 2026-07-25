import type { AppSettings, CurrencyCode, Expense, Group, Member, User } from "@/domain/types";

export interface UserDoc extends User {
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
}

export type GroupDoc = Group;
export type MemberDoc = Member;
export type ExpenseDoc = Expense;

export interface CreateGroupInput {
  name: string;
  currency: CurrencyCode;
  firstMemberName?: string;
}

export interface CreateMemberInput {
  displayName: string;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  currency: CurrencyCode;
  payerId: string;
  splitType: Expense["splitType"];
  participantIds: string[];
  shares: Expense["shares"];
  payerIncluded: boolean;
  note?: string;
  clientRequestId?: string;
}

export interface GroupBundle {
  group: Group;
  members: Member[];
  expenses: Expense[];
}

export interface MeResponse {
  user: User;
  settings: AppSettings;
  groups: Group[];
  members: Member[];
  expenses: Expense[];
}
