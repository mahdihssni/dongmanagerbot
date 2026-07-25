"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ExpenseWizard } from "@/features/expenses/expense-wizard";
import { activeMembers } from "@/domain";
import { confirmDestructive, haptic } from "@/lib/telegram/webapp";
import { Toast } from "@/components/ui/chip";

export default function EditExpensePage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ groupId: string; expenseId: string }>();
  const { state, deleteExpense } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);

  const group = state.groups.find((g) => g.id === params.groupId);
  const expense = state.expenses.find((e) => e.id === params.expenseId);
  const members = activeMembers(state.members, params.groupId);

  if (!group || !expense) {
    return (
      <>
        <PageHeader title={t("edit")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const onDelete = async () => {
    const ok = await confirmDestructive(t("confirmDeleteExpense"));
    if (!ok) return;
    try {
      await deleteExpense(expense.id);
      haptic("success");
      setToast(t("deleted"));
      setTimeout(() => router.push(`/groups/${group.id}/expenses`), 400);
    } catch {
      setToast(t("errorGeneric"));
    }
  };

  return (
    <>
      <PageHeader
        title={t("edit")}
        backHref={`/groups/${group.id}/expenses`}
        action={
          <Button variant="danger" onClick={onDelete}>
            {t("delete")}
          </Button>
        }
      />
      <ExpenseWizard
        groupId={group.id}
        members={members}
        currency={group.currency}
        existing={expense}
      />
      <Toast message={toast} />
    </>
  );
}
