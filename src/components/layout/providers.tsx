"use client";

import { AppProvider } from "@/store/app-store";
import { AppShell } from "@/components/layout/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
