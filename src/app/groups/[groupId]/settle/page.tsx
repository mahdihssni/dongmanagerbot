"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/chip";
import { computeBalances } from "@/engine/balances";
import { suggestSettlements } from "@/engine/settlement";
import { formatAmount } from "@/engine/money";
import { createId } from "@/domain";
import { haptic } from "@/lib/telegram/webapp";

export default function SettlePage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { state, addExpense } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const group = state.groups.find((g) => g.id === params.groupId);

  if (!group) {
    return (
      <>
        <PageHeader title={t("settle")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const balances = computeBalances(state.members, state.expenses, group.id);
  const suggestions = suggestSettlements(balances);
  const locale = state.settings.locale;
  const name = (id: string) =>
    state.members.find((m) => m.id === id)?.displayName ?? "—";

  const recordTransfer = (fromMemberId: string, toMemberId: string, amount: number) => {
    addExpense({
      groupId: group.id,
      description: `${t("transfer")}: ${name(fromMemberId)} → ${name(toMemberId)}`,
      amount,
      currency: group.currency,
      payerId: fromMemberId,
      splitType: "transfer",
      participantIds: [toMemberId],
      shares: [],
      payerIncluded: false,
      createdBy: state.currentUser?.id ?? "anonymous",
      clientRequestId: createId("req"),
    });
    haptic("success");
    setToast(t("saved"));
    setTimeout(() => setToast(null), 1500);
  };

  const recordAll = () => {
    for (const s of suggestions) {
      recordTransfer(s.fromMemberId, s.toMemberId, s.amount);
    }
    setTimeout(() => router.push(`/groups/${group.id}/balances`), 600);
  };

  return (
    <>
      <PageHeader title={t("settle")} backHref={`/groups/${group.id}`} />
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="text-sm text-[var(--tg-hint)]">{t("settlementHint")}</p>
        {suggestions.length === 0 ? (
          <EmptyState title={t("noBalances")} hint={t("settled")} />
        ) : (
          <>
            {suggestions.map((s, i) => (
              <Card key={`${s.fromMemberId}-${s.toMemberId}-${i}`}>
                <p className="text-base font-semibold">
                  {name(s.fromMemberId)}{" "}
                  <span className="font-normal text-[var(--tg-hint)]">{t("pays")}</span>{" "}
                  {name(s.toMemberId)}
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--tg-button)]">
                  {formatAmount(s.amount, group.currency, locale)}
                </p>
                <Button
                  className="mt-3"
                  variant="secondary"
                  fullWidth
                  onClick={() =>
                    recordTransfer(s.fromMemberId, s.toMemberId, s.amount)
                  }
                >
                  {t("transfer")}
                </Button>
              </Card>
            ))}
            <Button fullWidth onClick={recordAll}>
              {t("done")} — {t("transfer")}
            </Button>
          </>
        )}
      </div>
      <Toast message={toast} />
    </>
  );
}
