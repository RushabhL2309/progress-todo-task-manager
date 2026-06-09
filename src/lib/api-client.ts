export const DEMO_MODE_STORAGE_KEY = "demo-mode-enabled";

/** Demo data is ON by default until user turns it off in Settings */
export function getDemoModeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(DEMO_MODE_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

export function setDemoModeEnabled(enabled: boolean): void {
  localStorage.setItem(DEMO_MODE_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent("demo-mode-change", { detail: enabled }));
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("x-demo-mode", getDemoModeEnabled() ? "true" : "false");
  return fetch(input, { ...init, headers });
}
