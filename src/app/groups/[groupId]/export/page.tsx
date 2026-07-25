"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/chip";
import { activeMembers, expensesForGroup } from "@/domain";
import { computeBalances } from "@/engine/balances";
import { suggestSettlements } from "@/engine/settlement";
import { formatAmount, formatSignedAmount } from "@/engine/money";
import { haptic } from "@/lib/telegram/webapp";

export default function ExportPage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const group = state.groups.find((g) => g.id === params.groupId);

  const summary = useMemo(() => {
    if (!group) return "";
    const locale = state.settings.locale;
    const members = activeMembers(state.members, group.id);
    const expenses = expensesForGroup(state.expenses, group.id);
    const balances = computeBalances(state.members, state.expenses, group.id);
    const settlements = suggestSettlements(balances);
    const total = expenses
      .filter((e) => !["transfer", "refund", "adjustment"].includes(e.splitType))
      .reduce((a, e) => a + e.amount, 0);

    const lines: string[] = [
      `${t("exportSummary")}: ${group.name}`,
      `${t("totalExpenses")}: ${formatAmount(total, group.currency, locale)}`,
      "",
      `— ${t("members")} —`,
      ...members.map((m) => `• ${m.displayName}`),
      "",
      `— ${t("expenses")} —`,
      ...expenses.map((e) => {
        const payer = members.find((m) => m.id === e.payerId)?.displayName ?? "?";
        return `• ${e.description}: ${formatAmount(e.amount, group.currency, locale)} (${payer})`;
      }),
      "",
      `— ${t("balances")} —`,
      ...balances.map((b) => {
        const name = members.find((m) => m.id === b.memberId)?.displayName ?? "?";
        return `• ${name}: ${formatSignedAmount(b.net, group.currency, locale)}`;
      }),
      "",
      `— ${t("settle")} —`,
      ...(settlements.length === 0
        ? [t("settled")]
        : settlements.map((s) => {
            const from = members.find((m) => m.id === s.fromMemberId)?.displayName;
            const to = members.find((m) => m.id === s.toMemberId)?.displayName;
            return `• ${from} ${t("pays")} ${to}: ${formatAmount(s.amount, group.currency, locale)}`;
          })),
    ];
    return lines.join("\n");
  }, [group, state, t]);

  if (!group) {
    return (
      <>
        <PageHeader title={t("export")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      haptic("success");
      setToast(t("copied"));
      setTimeout(() => setToast(null), 1200);
    } catch {
      setToast(t("errorGeneric"));
    }
  };

  return (
    <>
      <PageHeader title={t("export")} backHref={`/groups/${group.id}`} />
      <div className="flex flex-col gap-3 px-4 py-4">
        <Card>
          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {summary}
          </pre>
        </Card>
        <Button fullWidth onClick={copy}>
          {t("copySummary")}
        </Button>
      </div>
      <Toast message={toast} />
    </>
  );
}
