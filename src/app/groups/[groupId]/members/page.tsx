"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MemberAvatar, Toast } from "@/components/ui/chip";
import { InviteMembersPanel } from "@/features/invite/invite-members-panel";
import { activeMembers } from "@/domain";
import { confirmDestructive, haptic } from "@/lib/telegram/webapp";

export default function MembersPage() {
  const t = useT();
  const params = useParams<{ groupId: string }>();
  const { state, deactivateMember } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);

  const group = state.groups.find((g) => g.id === params.groupId);
  const members = group ? activeMembers(state.members, group.id) : [];

  if (!group) {
    return (
      <>
        <PageHeader title={t("members")} backHref="/" />
        <EmptyState title={t("errorGeneric")} />
      </>
    );
  }

  const onRemove = async (memberId: string) => {
    const ok = await confirmDestructive(t("confirmDeleteMember"));
    if (!ok) return;
    try {
      await deactivateMember(memberId);
      haptic("success");
      setToast(t("deleted"));
      setTimeout(() => setToast(null), 1200);
    } catch {
      setToast(t("errorGeneric"));
      setTimeout(() => setToast(null), 1600);
    }
  };

  const memberSource = (m: (typeof members)[0]) =>
    m.telegramId || m.userId?.startsWith("tg_") ? t("viaTelegram") : t("viaManual");

  return (
    <>
      <PageHeader title={t("members")} backHref={`/groups/${group.id}`} />
      <div className="flex flex-col gap-4 px-4 py-4">
        <InviteMembersPanel
          group={group}
          onToast={(message) => {
            setToast(message);
            setTimeout(() => setToast(null), 1600);
          }}
        />

        {members.length === 0 ? (
          <EmptyState title={t("noMembers")} hint={t("inviteFriendsHint")} />
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <Card key={m.id} className="flex items-center gap-3">
                <MemberAvatar name={m.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.displayName}</p>
                  <p className="text-xs text-[var(--tg-hint)]">
                    {t("active")} · {memberSource(m)}
                  </p>
                </div>
                <Button variant="danger" onClick={() => onRemove(m.id)}>
                  {t("remove")}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast} />
    </>
  );
}
