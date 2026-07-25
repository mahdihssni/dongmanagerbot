"use client";

import { AppProvider } from "@/store/app-store";
import { AppShell } from "@/components/layout/app-shell";
import { InviteBootstrap } from "@/features/invite/invite-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <InviteBootstrap />
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
