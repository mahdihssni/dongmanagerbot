"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { JoinInviteResult } from "@/domain/types";
import { parseCurrencyCode } from "@/lib/config";
import { haptic } from "@/lib/telegram/webapp";

export default function JoinInvitePage() {
  const t = useT();
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const { hydrated, joinViaInvite, state } = useAppStore();
  const [result, setResult] = useState<JoinInviteResult | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const shell = {
      groupId: search.get("gid") ?? "",
      name: search.get("n") ?? "",
      currency: parseCurrencyCode(search.get("c")),
    };
    const hasShell = Boolean(shell.groupId && shell.name);

    void (async () => {
      const next = await joinViaInvite(params.code, hasShell ? shell : null);
      if (cancelled) return;
      setResult(next);
      if (next.status === "joined" || next.status === "already_member") {
        haptic("success", state.settings.hapticFeedback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, joinViaInvite, params.code, search, state.settings.hapticFeedback]);

  return (
    <>
      <PageHeader title={t("inviteFriends")} backHref="/" />
      <div className="px-4 py-6">
        {!hydrated || !result ? (
          <EmptyState title={t("joiningGroup")} />
        ) : result.status === "invalid" ? (
          <EmptyState title={t("inviteInvalid")} hint={t("inviteFriendsHint")} />
        ) : (
          <Card className="flex flex-col gap-3 text-center">
            <p className="text-lg font-semibold">{result.group.name}</p>
            <p className="text-sm text-[var(--tg-hint)]">
              {result.status === "joined" ? t("joinedGroup") : t("alreadyInGroup")}
            </p>
            <Link href={`/groups/${result.group.id}`}>
              <Button fullWidth>{t("inviteOpenGroup")}</Button>
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
