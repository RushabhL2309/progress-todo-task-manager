"use client";

interface DateNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function DateNavigator({ label, onPrev, onNext, onToday }: DateNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onPrev} className="btn-ghost" aria-label="Previous period">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span className="min-w-[140px] text-center text-sm font-medium text-ink sm:min-w-[200px] sm:text-base">
        {label}
      </span>
      <button type="button" onClick={onNext} className="btn-ghost" aria-label="Next period">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onToday}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
      >
        Today
      </button>
    </div>
  );
}
