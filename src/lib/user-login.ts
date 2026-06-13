/** Lowercase trimmed name used for login lookup */
export function nameKeyFrom(name: string): string {
  return name.trim().toLowerCase();
}

/** Placeholder login email — users are identified by name only */
export const DEFAULT_USER_EMAIL = "a@gmail.com";

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
