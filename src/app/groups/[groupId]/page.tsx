"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { activeMembers, expensesForGroup } from "@/domain";
import { computeBalances } from "@/engine/balances";
import { formatAmount, formatSignedAmount } from "@/engine/money";

export default function GroupDetailPage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state } = useAppStore();
  const group = state.groups.find((g) => g.id === params.groupId);

  if (!group) {
    return (
      <>
        <PageHeader title="—" backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const members = activeMembers(state.members, group.id);
  const expenses = expensesForGroup(state.expenses, group.id).slice(0, 5);
  const balances = computeBalances(state.members, state.expenses, group.id);
  const locale = state.settings.locale;

  return (
    <>
      <PageHeader title={group.name} backHref="/" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/groups/${group.id}/expenses/new`}>
            <Button fullWidth>{t("addExpense")}</Button>
          </Link>
          <Link href={`/groups/${group.id}/balances`}>
            <Button variant="secondary" fullWidth>
              {t("balances")}
            </Button>
          </Link>
          <Link href={`/groups/${group.id}/settle`}>
            <Button variant="secondary" fullWidth>
              {t("settle")}
            </Button>
          </Link>
          <Link href={`/groups/${group.id}/members`}>
            <Button variant="secondary" fullWidth>
              {t("members")}
            </Button>
          </Link>
        </div>

        <section className="flex gap-2">
          <Link href={`/groups/${group.id}/expenses`} className="flex-1">
            <Button variant="outline" fullWidth>
              {t("history")}
            </Button>
          </Link>
          <Link href={`/groups/${group.id}/export`} className="flex-1">
            <Button variant="outline" fullWidth>
              {t("export")}
            </Button>
          </Link>
        </section>

        {members.length === 0 ? (
          <EmptyState
            title={t("noMembers")}
            hint={t("emptyGroupWarn")}
            action={
              <Link href={`/groups/${group.id}/members`}>
                <Button>{t("addMember")}</Button>
              </Link>
            }
          />
        ) : null}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--tg-hint)]">
              {t("balances")}
            </h3>
          </div>
          <Card className="flex flex-col gap-2">
            {balances.map((b) => {
              const name =
                state.members.find((m) => m.id === b.memberId)?.displayName ?? "—";
              return (
                <div key={b.memberId} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span
                    className={
                      b.net > 0
                        ? "text-emerald-600"
                        : b.net < 0
                          ? "text-[var(--tg-destructive)]"
                          : "text-[var(--tg-hint)]"
                    }
                  >
                    {formatSignedAmount(b.net, group.currency, locale)}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--tg-hint)]">
              {t("expenses")}
            </h3>
            <Link
              href={`/groups/${group.id}/expenses`}
              className="text-sm text-[var(--tg-button)]"
            >
              {t("viewAll")}
            </Link>
          </div>
          {expenses.length === 0 ? (
            <EmptyState title={t("noExpenses")} hint={t("noExpensesHint")} />
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((e) => (
                <Link key={e.id} href={`/groups/${group.id}/expenses/${e.id}/edit`}>
                  <Card className="active:opacity-80">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{e.description}</p>
                        <p className="text-xs text-[var(--tg-hint)]">
                          {state.members.find((m) => m.id === e.payerId)?.displayName}{" "}
                          · {t(e.splitType)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatAmount(e.amount, group.currency, locale)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
