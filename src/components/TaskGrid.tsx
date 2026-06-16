"use client";

import { completionKey } from "@/lib/dates";
import type { DayColumn, ExtraDaySummary, ScheduledTaskDTO } from "@/lib/types";
import { Checkbox } from "./Checkbox";

interface TaskGridProps {
  tasks: ScheduledTaskDTO[];
  columns: DayColumn[];
  completions: Record<string, boolean>;
  extraSummaries: ExtraDaySummary[];
  onToggle: (taskId: string, dateKey: string, completed: boolean) => void;
  onSelectDay?: (dateKey: string) => void;
  selectedDate?: string;
  loading?: boolean;
  onAddRegular?: () => void;
}

export function TaskGrid({
  tasks,
  columns,
  completions,
  extraSummaries,
  onToggle,
  onSelectDay,
  selectedDate,
  loading,
  onAddRegular,
}: TaskGridProps) {
  const extraMap = Object.fromEntries(extraSummaries.map((s) => [s.dateKey, s]));
  const showScrollHint = columns.length > 3;

  if (loading && tasks.length === 0) {
    return (
      <div className="card max-w-full overflow-hidden">
        <div className="h-64 animate-pulse bg-gradient-to-r from-border/20 via-border/40 to-border/20" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card flex max-w-full flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light text-accent">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect x="4" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="16" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="16" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <p className="text-base font-medium text-ink">Your progress grid is empty</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Add regular tasks to see them appear across every day column.
        </p>
        {onAddRegular && (
          <button type="button" onClick={onAddRegular} className="btn-primary mt-5">
            + Add regular task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card max-w-full overflow-hidden shadow-sm">
      {showScrollHint && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-canvas/80 px-3 py-2 lg:hidden">
          <p className="text-[11px] font-medium text-muted">Swipe table to see more days</p>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-muted" aria-hidden>
            <path d="M3 8H13M10 5L13 8L10 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div
        className="table-scroll-container relative max-w-full"
        role="region"
        aria-label="Progress grid table — scroll horizontally for more days"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-surface/90 to-transparent lg:hidden" />
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="sticky-col sticky left-0 z-20 min-w-[140px] border-r border-border bg-canvas px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted sm:min-w-[180px] sm:px-4 sm:py-4">
                Task
              </th>
              {columns.map((col) => {
                const extra = extraMap[col.dateKey];
                const isSelected = selectedDate === col.dateKey;
                return (
                  <th
                    key={col.dateKey}
                    className={`min-w-[72px] border-r border-border/60 px-1 py-2 text-center last:border-r-0 sm:min-w-[88px] ${
                      col.isToday ? "bg-accent-light/60" : "bg-canvas/50"
                    } ${isSelected ? "ring-2 ring-inset ring-accent/25" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDay?.(col.dateKey)}
                      className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-white/80"
                    >
                      <span className="hidden text-[11px] font-semibold text-ink sm:inline">{col.label}</span>
                      <span className="text-[11px] font-semibold text-ink sm:hidden">{col.shortLabel}</span>
                      {col.isToday && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Today
                        </span>
                      )}
                      {extra && extra.total > 0 && (
                        <span className="rounded-full bg-extra-light px-1.5 py-0.5 text-[10px] font-semibold text-extra">
                          +{extra.completed}/{extra.total}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, rowIdx) => {
              const rowBg = rowIdx % 2 === 0 ? "bg-surface" : "bg-canvas/40";
              return (
                <tr
                  key={task.id}
                  className={`border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent-light/20 ${rowBg}`}
                >
                  <td
                    className={`sticky-col sticky left-0 z-10 min-w-[140px] border-r border-border px-3 py-3 sm:min-w-[180px] sm:px-4 ${
                      rowIdx % 2 === 0 ? "bg-surface" : "bg-[#F5F5F2]"
                    }`}
                  >
                    <span className="font-medium text-ink">{task.name}</span>
                  </td>
                  {columns.map((col) => {
                    const key = completionKey(task.id, col.dateKey);
                    const checked = Boolean(completions[key]);
                    return (
                      <td
                        key={col.dateKey}
                        className={`min-w-[72px] border-r border-border/40 px-0 py-0 text-center last:border-r-0 sm:min-w-[88px] ${
                          col.isToday ? "bg-accent-light/25" : ""
                        } ${checked ? "bg-accent-light/15" : ""}`}
                      >
                        <div
                          className="flex justify-center py-1"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={checked}
                            onChange={(v) => onToggle(task.id, col.dateKey, v)}
                            label={`${task.name} on ${col.label}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
