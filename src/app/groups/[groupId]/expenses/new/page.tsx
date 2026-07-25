"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { activeMembers } from "@/domain";
import { ExpenseWizard } from "@/features/expenses/expense-wizard";

export default function NewExpensePage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state } = useAppStore();
  const group = state.groups.find((g) => g.id === params.groupId);
  const members = activeMembers(state.members, params.groupId);

  if (!group) {
    return (
      <>
        <PageHeader title={t("addExpense")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  if (members.length === 0) {
    return (
      <>
        <PageHeader title={t("addExpense")} backHref={`/groups/${group.id}`} />
        <EmptyState title={t("noMembers")} hint={t("emptyGroupWarn")} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("addExpense")} backHref={`/groups/${group.id}`} />
      <ExpenseWizard groupId={group.id} members={members} currency={group.currency} />
    </>
  );
}
