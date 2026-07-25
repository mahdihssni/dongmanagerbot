/**
 * Future HTTP repository — implement when a backend is ready.
 * Swap LocalStorageRepository for ApiRepository in the store.
 */

import type { AppRepository } from "@/lib/persistence/repository";
import type { AppState } from "@/domain/types";

export class ApiRepository implements AppRepository {
  constructor(private baseUrl: string) {}

  load(): AppState | null {
    throw new Error("Use loadAsync() for ApiRepository");
  }

  save(_state: AppState): { ok: boolean; error?: string } {
    return { ok: false, error: "Use saveAsync() for ApiRepository" };
  }

  async loadAsync(): Promise<AppState | null> {
    const res = await fetch(`${this.baseUrl}/state`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as AppState;
  }

  async saveAsync(state: AppState): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(state),
      });
      if (!res.ok) return { ok: false, error: `http_${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "network" };
    }
  }

  clear(): void {
    void fetch(`${this.baseUrl}/state`, { method: "DELETE", credentials: "include" });
  }
}
