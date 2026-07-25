"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import type { CurrencyCode } from "@/domain/types";
import { CURRENCY_META } from "@/domain";
import { haptic } from "@/lib/telegram/webapp";

const CURRENCIES: CurrencyCode[] = ["IRT", "IRR", "USD", "EUR", "TRY"];

export default function CreateGroupPage() {
  const t = useT();
  const router = useRouter();
  const { createGroup, state } = useAppStore();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(state.settings.currency);
  const [memberName, setMemberName] = useState(state.currentUser?.firstName ?? "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("requiredField"));
      return;
    }
    const group = createGroup(name, currency, memberName || undefined);
    haptic("success");
    router.replace(`/groups/${group.id}`);
  };

  return (
    <>
      <PageHeader title={t("createGroup")} backHref="/" />
      <form onSubmit={onSubmit} className="flex flex-col gap-4 px-4 py-4">
        <Field label={t("groupName")} error={error ?? undefined}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groupNamePlaceholder")}
            autoFocus
          />
        </Field>
        <Field label={t("currency")}>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <Chip
                key={c}
                selected={currency === c}
                onClick={() => setCurrency(c)}
              >
                {state.settings.locale === "fa"
                  ? CURRENCY_META[c].nameFa
                  : CURRENCY_META[c].nameEn}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={t("memberName")} hint={t("members")}>
          <Input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder={t("memberNamePlaceholder")}
          />
        </Field>
        <Button type="submit" fullWidth>
          {t("save")}
        </Button>
      </form>
    </>
  );
}
