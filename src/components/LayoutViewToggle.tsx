"use client";

import type { ProjectLayoutView } from "@/lib/project-layout-prefs";

interface LayoutViewToggleProps {
  value: ProjectLayoutView;
  onChange: (view: ProjectLayoutView) => void;
}

export function LayoutViewToggle({ value, onChange }: LayoutViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-canvas p-1">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
          value === "cards" ? "bg-surface text-accent shadow-sm" : "text-muted"
        }`}
        title="Card view"
      >
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
          value === "table" ? "bg-surface text-accent shadow-sm" : "text-muted"
        }`}
        title="Table view"
      >
        Table
      </button>
    </div>
  );
}
