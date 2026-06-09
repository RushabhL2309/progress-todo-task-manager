"use client";

import type { ViewMode } from "@/lib/types";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

interface ViewModeTabsProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeTabs({ value, onChange }: ViewModeTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          className={`min-h-[36px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
            value === mode.value
              ? "bg-accent text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
