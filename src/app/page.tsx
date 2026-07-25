"use client";

import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { activeMembers, expensesForGroup } from "@/domain";
import { computeBalances } from "@/engine/balances";
import { formatAmount } from "@/engine/money";

export default function HomePage() {
  const t = useT();
  const { state } = useAppStore();
  const { groups, members, expenses, settings, currentUser } = state;
  const activeGroups = groups.filter((g) => !g.archived);

  return (
    <>
      <PageHeader
        title={t("appName")}
        subtitle={t("tagline")}
        action={
          <Link href="/groups/new">
            <Button>{t("createGroup")}</Button>
          </Link>
        }
      />
      <div className="flex flex-col gap-4 px-4 py-4">
        {currentUser ? (
          <p className="text-sm text-[var(--tg-hint)]">
            {currentUser.firstName}
            {currentUser.username ? ` · @${currentUser.username}` : ""}
          </p>
        ) : null}

        {activeGroups.length === 0 ? (
          <EmptyState
            title={t("noGroups")}
            hint={t("noGroupsHint")}
            action={
              <Link href="/groups/new">
                <Button>{t("createGroup")}</Button>
              </Link>
            }
          />
        ) : (
          activeGroups.map((group) => {
            const gMembers = activeMembers(members, group.id);
            const gExpenses = expensesForGroup(expenses, group.id);
            const balances = computeBalances(members, expenses, group.id);
            const unsettled = balances.filter((b) => b.net !== 0).length;
            const total = gExpenses
              .filter((e) => !["transfer", "refund", "adjustment"].includes(e.splitType))
              .reduce((a, e) => a + e.amount, 0);

            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="transition-opacity active:opacity-80">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{group.name}</h2>
                      <p className="mt-1 text-sm text-[var(--tg-hint)]">
                        {gMembers.length} {t("members")} · {gExpenses.length}{" "}
                        {t("expenses")}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[var(--tg-button)]">
                      {formatAmount(total, group.currency, settings.locale)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--tg-hint)]">
                    {unsettled === 0
                      ? t("settled")
                      : `${unsettled} · ${t("balances")}`}
                  </p>
                </Card>
              </Link>
            );
          })
        )}

        {activeGroups[0] ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--tg-hint)]">
              {t("quickActions")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/groups/${activeGroups[0].id}/expenses/new`}>
                <Button variant="secondary" fullWidth>
                  {t("addExpense")}
                </Button>
              </Link>
              <Link href={`/groups/${activeGroups[0].id}/balances`}>
                <Button variant="secondary" fullWidth>
                  {t("balances")}
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
