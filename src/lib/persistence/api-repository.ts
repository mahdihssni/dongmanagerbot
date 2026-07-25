/**
 * Future blob repository — prefer resource REST via remote-api.ts.
 * Kept as a thin optional full-state sync helper.
 */

import type { AppState } from "@/domain/types";

export class ApiRepository {
  constructor(private baseUrl: string) {}

  async loadAsync(): Promise<AppState | null> {
    const res = await fetch(`${this.baseUrl}/me`, { credentials: "include" });
    if (!res.ok) return null;
    const me = await res.json();
    return {
      version: 1,
      currentUser: me.user,
      groups: me.groups ?? [],
      members: me.members ?? [],
      expenses: me.expenses ?? [],
      settings: me.settings,
    };
  }
}
