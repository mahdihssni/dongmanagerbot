/**
 * Future HTTP repository — implement when a backend is ready.
 * Swap LocalStorageRepository for ApiRepository in the store.
 */

import type { AppRepository } from "@/lib/persistence/repository";
import type { AppState } from "@/domain/types";

export class ApiRepository implements AppRepository {
  constructor(private baseUrl: string) {}

  async loadAsync(): Promise<AppState | null> {
    const res = await fetch(`${this.baseUrl}/state`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as AppState;
  }

  load(): AppState | null {
    throw new Error("Use loadAsync() for ApiRepository");
  }

  save(_state: AppState): void {
    throw new Error("Use saveAsync() for ApiRepository");
  }

  async saveAsync(state: AppState): Promise<void> {
    await fetch(`${this.baseUrl}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(state),
    });
  }

  clear(): void {
    void fetch(`${this.baseUrl}/state`, { method: "DELETE", credentials: "include" });
  }
}
