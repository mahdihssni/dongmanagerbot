"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { expensesForGroup } from "@/domain";
import { formatAmount } from "@/engine/money";

export default function ExpenseListPage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state } = useAppStore();
  const group = state.groups.find((g) => g.id === params.groupId);
  const expenses = group ? expensesForGroup(state.expenses, group.id) : [];

  if (!group) {
    return (
      <>
        <PageHeader title={t("expenses")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("history")}
        backHref={`/groups/${group.id}`}
        action={
          <Link href={`/groups/${group.id}/expenses/new`}>
            <Button>{t("addExpense")}</Button>
          </Link>
        }
      />
      <div className="flex flex-col gap-2 px-4 py-4">
        {expenses.length === 0 ? (
          <EmptyState title={t("noExpenses")} hint={t("noExpensesHint")} />
        ) : (
          expenses.map((e) => (
            <Link key={e.id} href={`/groups/${group.id}/expenses/${e.id}/edit`}>
              <Card className="active:opacity-80">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.description}</p>
                    <p className="text-xs text-[var(--tg-hint)]">
                      {new Date(e.createdAt).toLocaleDateString(
                        state.settings.locale === "fa" ? "fa-IR" : "en-US",
                      )}{" "}
                      · {state.members.find((m) => m.id === e.payerId)?.displayName} ·{" "}
                      {t(e.splitType)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatAmount(e.amount, group.currency, state.settings.locale)}
                  </p>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
