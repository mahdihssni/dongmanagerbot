"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import {
  readIncomingInviteCode,
  readInviteShellFromUrl,
} from "@/lib/telegram/invite";
import { haptic } from "@/lib/telegram/webapp";

const HANDLED_KEY = "dongbot.invite.handled";

/**
 * Consumes Telegram start_param / /join URL once after hydrate
 * and adds the current Telegram user to the group when possible.
 */
export function InviteBootstrap() {
  const { hydrated, joinViaInvite, state } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    // Let the dedicated join page own the flow when already there.
    if (pathname.startsWith("/join/")) return;
    ran.current = true;

    const code = readIncomingInviteCode();
    if (!code) return;

    try {
      if (sessionStorage.getItem(HANDLED_KEY) === code) return;
    } catch {
      /* ignore */
    }

    const shell = readInviteShellFromUrl();
    const result = joinViaInvite(code, shell);
    const hapticsOn = state.settings.hapticFeedback;

    if (result.status === "joined" || result.status === "already_member") {
      try {
        sessionStorage.setItem(HANDLED_KEY, code);
      } catch {
        /* ignore */
      }
      haptic("success", hapticsOn);
      router.replace(`/groups/${result.group.id}`);
      return;
    }

    // Only mark handled on success so a missing shell can retry with full URL.
    router.replace(`/join/${encodeURIComponent(code)}${window.location.search}`);
  }, [hydrated, joinViaInvite, pathname, router, state.settings.hapticFeedback]);

  return null;
}
