"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrencyCode, Expense, Member, SplitShare, SplitType } from "@/domain/types";
import { isTransferLike } from "@/domain";
import { computeExpenseOwes, validateSplitInput } from "@/engine/splits";
import { formatAmount, formatStoredAmountInput, parseAmountInput } from "@/engine/money";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { Field, Input, TextArea } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Chip, MemberAvatar } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { haptic, setClosingConfirmation } from "@/lib/telegram/webapp";
import { createId } from "@/domain";

const SPLIT_OPTIONS: SplitType[] = [
  "equal",
  "exact",
  "percentage",
  "shares",
  "full",
  "transfer",
  "refund",
  "adjustment",
];

type Step = "amount" | "payer" | "split" | "people" | "details" | "review";

const STEPS: Step[] = ["amount", "payer", "split", "people", "details", "review"];

interface ExpenseWizardProps {
  groupId: string;
  members: Member[];
  currency: CurrencyCode;
  existing?: Expense;
}

export function ExpenseWizard({
  groupId,
  members,
  currency,
  existing,
}: ExpenseWizardProps) {
  const t = useT();
  const router = useRouter();
  const { addExpense, updateExpense, state } = useAppStore();
  const locale = state.settings.locale;

  const [stepIndex, setStepIndex] = useState(0);
  const [amountRaw, setAmountRaw] = useState(
    existing ? formatStoredAmountInput(existing.amount, currency, locale) : "",
  );
  const [payerId, setPayerId] = useState(existing?.payerId ?? members[0]?.id ?? "");
  const [splitType, setSplitType] = useState<SplitType>(existing?.splitType ?? "equal");
  const [participantIds, setParticipantIds] = useState<string[]>(
    existing?.participantIds ?? members.map((m) => m.id),
  );
  const [shares, setShares] = useState<SplitShare[]>(existing?.shares ?? []);
  const [payerIncluded] = useState(existing?.payerIncluded ?? true);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestId] = useState(() => existing?.clientRequestId ?? createId("req"));

  const step = STEPS[stepIndex];
  const amount = parseAmountInput(amountRaw, currency);
  const hapticsOn = state.settings.hapticFeedback;

  const isDirty =
    Boolean(amountRaw) ||
    Boolean(description.trim()) ||
    Boolean(note.trim()) ||
    stepIndex > 0;

  useEffect(() => {
    setClosingConfirmation(isDirty && !submitting);
    return () => setClosingConfirmation(false);
  }, [isDirty, submitting]);

  const draft = useMemo(
    () => ({
      amount: amount ?? 0,
      payerId,
      splitType,
      participantIds,
      shares,
      payerIncluded,
    }),
    [amount, payerId, splitType, participantIds, shares, payerIncluded],
  );

  const preview = useMemo(() => {
    try {
      if (!amount || amount <= 0) return null;
      return computeExpenseOwes(draft);
    } catch {
      return null;
    }
  }, [draft, amount]);

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.displayName ?? id;

  const toggleParticipant = (id: string) => {
    haptic("selection", hapticsOn);
    setParticipantIds((prev) => {
      if (isTransferLike(splitType)) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const ensureSharesForType = (type: SplitType, ids: string[]) => {
    if (type === "exact") {
      setShares(ids.map((memberId) => ({ memberId, value: 0 })));
    } else if (type === "percentage") {
      const each = ids.length ? Math.floor(100 / ids.length) : 0;
      const list = ids.map((memberId) => ({ memberId, value: each }));
      if (list.length) {
        list[0].value += 100 - list.reduce((a, s) => a + s.value, 0);
      }
      setShares(list);
    } else if (type === "shares") {
      setShares(ids.map((memberId) => ({ memberId, value: 1 })));
    } else {
      setShares([]);
    }
  };

  const goNext = () => {
    setError(null);
    if (step === "amount") {
      if (amount === null || amount <= 0) {
        setError(t("invalidAmount"));
        return;
      }
    }
    if (step === "payer" && !payerId) {
      setError(t("requiredField"));
      return;
    }
    if (step === "people") {
      if (isTransferLike(splitType) && participantIds.length !== 1) {
        setError(t("requiredField"));
        return;
      }
      if (!isTransferLike(splitType) && participantIds.length === 0) {
        setError(t("requiredField"));
        return;
      }
      ensureSharesForType(splitType, participantIds);
    }
    if (step === "details" && !description.trim()) {
      setError(t("requiredField"));
      return;
    }
    if (step === "review") {
      void submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const validation = validateSplitInput(draft);
    if (validation) {
      setError(
        validation.code === "PERCENTAGE_MISMATCH"
          ? t("percentageMust100")
          : validation.code === "AMOUNT_MISMATCH"
            ? t("exactMustMatch")
            : validation.message,
      );
      setSubmitting(false);
      return;
    }
    if (!description.trim() || amount === null) {
      setError(t("requiredField"));
      setSubmitting(false);
      return;
    }

    const payload = {
      groupId,
      description: description.trim(),
      amount,
      currency,
      payerId,
      splitType,
      participantIds,
      shares,
      payerIncluded: participantIds.includes(payerId),
      note: note.trim() || undefined,
      createdBy: state.currentUser?.id ?? "anonymous",
      clientRequestId: requestId,
    };

    try {
      if (existing) {
        await updateExpense(existing.id, payload);
        haptic("success", hapticsOn);
        router.push(`/groups/${groupId}/expenses`);
        return;
      }

      const result = await addExpense(payload);
      if (!result) {
        setError(t("duplicateBlocked"));
        setSubmitting(false);
        return;
      }
      haptic("success", hapticsOn);
      router.push(`/groups/${groupId}`);
    } catch {
      setError(t("errorGeneric"));
      setSubmitting(false);
    }
  };

  const setShareValue = (memberId: string, value: number) => {
    setShares((prev) => {
      const next = prev.filter((s) => s.memberId !== memberId);
      next.push({ memberId, value });
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= stepIndex ? "bg-[var(--tg-button)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      <h2 className="text-base font-semibold">
        {step === "amount" && t("stepAmount")}
        {step === "payer" && t("stepPayer")}
        {step === "split" && t("stepSplit")}
        {step === "people" && t("stepPeople")}
        {step === "details" && t("stepDetails")}
        {step === "review" && t("review")}
      </h2>

      {step === "amount" ? (
        <Field label={t("amount")} error={error ?? undefined}>
          <AmountInput
            value={amountRaw}
            onValueChange={setAmountRaw}
            locale={locale}
            placeholder={locale === "fa" ? "۰" : "0"}
            autoFocus
            className="text-center text-2xl font-bold"
          />
        </Field>
      ) : null}

      {step === "payer" ? (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                haptic("selection", hapticsOn);
                setPayerId(m.id);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-start ${
                payerId === m.id
                  ? "bg-[var(--tg-button)]/15 ring-2 ring-[var(--tg-button)]"
                  : "bg-[var(--tg-secondary-bg)]"
              }`}
            >
              <MemberAvatar name={m.displayName} />
              <span className="font-medium">{m.displayName}</span>
            </button>
          ))}
          {error ? <p className="text-xs text-[var(--tg-destructive)]">{error}</p> : null}
        </div>
      ) : null}

      {step === "split" ? (
        <div className="flex flex-wrap gap-2">
          {SPLIT_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              selected={splitType === opt}
              onClick={() => {
                haptic("selection", hapticsOn);
                setSplitType(opt);
                if (isTransferLike(opt)) {
                  setParticipantIds((prev) =>
                    prev.filter((id) => id !== payerId).slice(0, 1),
                  );
                } else if (opt === "full") {
                  setParticipantIds(members.filter((m) => m.id !== payerId).map((m) => m.id).slice(0, 1));
                } else {
                  setParticipantIds(members.map((m) => m.id));
                }
              }}
            >
              {t(opt)}
            </Chip>
          ))}
        </div>
      ) : null}

      {step === "people" ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {!isTransferLike(splitType) ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setParticipantIds(members.map((m) => m.id))}
                >
                  {t("selectAll")}
                </Button>
                <Button variant="outline" onClick={() => setParticipantIds([])}>
                  {t("clearAll")}
                </Button>
              </>
            ) : (
              <p className="text-sm text-[var(--tg-hint)]">{t("counterparty")}</p>
            )}
          </div>
          {members.length > 12 ? (
            <p className="text-xs text-[var(--tg-hint)]">{t("largeGroupHint")}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleParticipant(m.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-start ${
                  participantIds.includes(m.id)
                    ? "bg-[var(--tg-button)]/15 ring-2 ring-[var(--tg-button)]"
                    : "bg-[var(--tg-secondary-bg)]"
                }`}
              >
                <MemberAvatar name={m.displayName} />
                <span className="font-medium">{m.displayName}</span>
              </button>
            ))}
          </div>
          {error ? <p className="text-xs text-[var(--tg-destructive)]">{error}</p> : null}
        </div>
      ) : null}

      {step === "details" ? (
        <div className="flex flex-col gap-3">
          <Field label={t("description")} error={error ?? undefined}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              autoFocus
            />
          </Field>
          <Field label={t("note")}>
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {(splitType === "exact" ||
            splitType === "percentage" ||
            splitType === "shares") && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t(splitType)}</p>
              {participantIds.map((id) => {
                const shareValue = shares.find((s) => s.memberId === id)?.value ?? 0;
                if (splitType === "exact") {
                  return (
                    <Field key={id} label={memberName(id)}>
                      <AmountInput
                        value={
                          shareValue
                            ? formatStoredAmountInput(shareValue, currency, locale)
                            : ""
                        }
                        onValueChange={(formatted) => {
                          const parsed = parseAmountInput(formatted, currency);
                          setShareValue(id, parsed ?? 0);
                        }}
                        locale={locale}
                        placeholder={locale === "fa" ? "۰" : "0"}
                      />
                    </Field>
                  );
                }
                return (
                  <Field key={id} label={memberName(id)}>
                    <Input
                      inputMode="decimal"
                      value={shareValue ? String(shareValue) : ""}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d.]/g, ""));
                        setShareValue(id, Number.isFinite(n) ? n : 0);
                      }}
                    />
                  </Field>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {step === "review" ? (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-sm text-[var(--tg-hint)]">{t("description")}</p>
            <p className="text-lg font-semibold">{description || "—"}</p>
            <p className="mt-3 text-sm text-[var(--tg-hint)]">{t("amount")}</p>
            <p className="text-xl font-bold">
              {amount !== null ? formatAmount(amount, currency, locale) : "—"}
            </p>
            <p className="mt-3 text-sm text-[var(--tg-hint)]">{t("payer")}</p>
            <p className="font-medium">{memberName(payerId)}</p>
            <p className="mt-3 text-sm text-[var(--tg-hint)]">{t("splitType")}</p>
            <p className="font-medium">{t(splitType)}</p>
          </Card>
          {preview ? (
            <Card>
              <p className="mb-2 font-semibold">{t("preview")}</p>
              {Object.entries(preview.owes).map(([id, owe]) => (
                <div key={id} className="flex justify-between py-1 text-sm">
                  <span>{memberName(id)}</span>
                  <span>{formatAmount(owe, currency, locale)}</span>
                </div>
              ))}
            </Card>
          ) : null}
          {error ? <p className="text-xs text-[var(--tg-destructive)]">{error}</p> : null}
        </div>
      ) : null}

      <div className="sticky bottom-0 mt-2 flex gap-2 bg-[var(--tg-bg)] pb-[max(0.5rem,var(--safe-bottom))] pt-2">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={goPrev} className="flex-1">
            {t("previous")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => router.push(`/groups/${groupId}`)}
            className="flex-1"
          >
            {t("cancel")}
          </Button>
        )}
        <Button onClick={goNext} className="flex-1" disabled={submitting}>
          {step === "review" ? t("submitExpense") : t("next")}
        </Button>
      </div>
    </div>
  );
}
