"use client";

import { useState } from "react";
import type { Group } from "@/domain/types";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  buildPreferredInviteUrl,
  buildWebInviteUrl,
  copyGroupInviteLink,
  getBotUsername,
  shareGroupInvite,
} from "@/lib/telegram/invite";
import { haptic } from "@/lib/telegram/webapp";

export function InviteMembersPanel({
  group,
  onToast,
}: {
  group: Group;
  onToast: (message: string) => void;
}) {
  const t = useT();
  const { addMember, state } = useAppStore();
  const [showManual, setShowManual] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inviteUrl = buildPreferredInviteUrl(group);
  const webUrl = buildWebInviteUrl(group);
  const botMissing = !getBotUsername();

  const onShare = async () => {
    const method = await shareGroupInvite(group, state.settings.locale);
    haptic("success");
    onToast(method === "clipboard" ? t("inviteLinkCopied") : t("inviteShared"));
  };

  const onCopy = async () => {
    await copyGroupInviteLink(group);
    haptic("success");
    onToast(t("inviteLinkCopied"));
  };

  const onManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("requiredField"));
      return;
    }
    addMember(group.id, name.trim());
    setName("");
    setError(null);
    haptic("success");
    onToast(t("saved"));
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">{t("inviteFriends")}</p>
          <p className="mt-1 text-sm text-[var(--tg-hint)]">{t("inviteFriendsHint")}</p>
        </div>
        {botMissing ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t("botUsernameMissing")}
          </p>
        ) : null}
        <p className="break-all rounded-xl bg-[var(--tg-bg)] px-3 py-2 text-xs text-[var(--tg-hint)]">
          {inviteUrl}
        </p>
        {inviteUrl !== webUrl ? (
          <p className="break-all text-[11px] text-[var(--tg-hint)]">{webUrl}</p>
        ) : null}
        <Button fullWidth onClick={onShare}>
          {t("shareInvite")}
        </Button>
        <Button fullWidth variant="secondary" onClick={onCopy}>
          {t("copyInviteLink")}
        </Button>
      </Card>

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="text-start text-sm font-medium text-[var(--tg-button)]"
      >
        {showManual ? t("hideManualAdd") : t("showManualAdd")}
      </button>

      {showManual ? (
        <Card>
          <p className="mb-2 text-sm text-[var(--tg-hint)]">{t("addManuallyHint")}</p>
          <form onSubmit={onManualAdd} className="flex flex-col gap-2">
            <Field label={t("addManually")} error={error ?? undefined}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("memberNamePlaceholder")}
              />
            </Field>
            <Button type="submit" variant="outline" fullWidth>
              {t("addMember")}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
