export type ProjectLayoutView = "cards" | "table";

export const PROJECT_LAYOUT_STORAGE_KEY = "project-layout-view";

export function getProjectLayoutView(): ProjectLayoutView {
  if (typeof window === "undefined") return "cards";
  return localStorage.getItem(PROJECT_LAYOUT_STORAGE_KEY) === "table" ? "table" : "cards";
}

export function setProjectLayoutView(view: ProjectLayoutView): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECT_LAYOUT_STORAGE_KEY, view);
  window.dispatchEvent(new CustomEvent("project-layout-change", { detail: view }));
}
