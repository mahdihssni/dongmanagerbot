/** Tiny className helper — no external dependency. */
export type ClassValue = string | false | null | undefined | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") out.push(input);
    else if (Array.isArray(input)) {
      const inner = clsx(...input);
      if (inner) out.push(inner);
    }
  }
  return out.join(" ");
}
