"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { computeBalances } from "@/engine/balances";
import { formatAmount, formatSignedAmount } from "@/engine/money";
import { MemberAvatar } from "@/components/ui/chip";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BalancesPage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state } = useAppStore();
  const group = state.groups.find((g) => g.id === params.groupId);

  if (!group) {
    return (
      <>
        <PageHeader title={t("balances")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const balances = computeBalances(state.members, state.expenses, group.id).sort(
    (a, b) => b.net - a.net,
  );
  const allSettled = balances.every((b) => b.net === 0);
  const locale = state.settings.locale;

  return (
    <>
      <PageHeader
        title={t("balances")}
        backHref={`/groups/${group.id}`}
        action={
          <Link href={`/groups/${group.id}/settle`}>
            <Button variant="secondary">{t("settle")}</Button>
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-4 py-4">
        {allSettled ? (
          <EmptyState title={t("noBalances")} hint={t("settled")} />
        ) : null}
        {balances.map((b) => {
          const member = state.members.find((m) => m.id === b.memberId);
          if (!member) return null;
          const label =
            b.net > 0 ? t("youAreOwed") : b.net < 0 ? t("youOwe") : t("settled");
          return (
            <Card key={b.memberId} className="flex items-center gap-3">
              <MemberAvatar name={member.displayName} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{member.displayName}</p>
                <p className="text-xs text-[var(--tg-hint)]">
                  {label} · {t("paid")}{" "}
                  {formatAmount(b.paid, group.currency, locale)} · {t("owedShare")}{" "}
                  {formatAmount(b.owed, group.currency, locale)}
                </p>
              </div>
              <p
                className={`shrink-0 font-bold ${
                  b.net > 0
                    ? "text-emerald-600"
                    : b.net < 0
                      ? "text-[var(--tg-destructive)]"
                      : "text-[var(--tg-hint)]"
                }`}
              >
                {formatSignedAmount(b.net, group.currency, locale)}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
