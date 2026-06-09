"use client";

import { useEffect, useRef, useState } from "react";
import { formatTodoDate, getPriorityTodos } from "@/lib/score";
import { toDateKey } from "@/lib/dates";
import type { TodoItem } from "@/lib/types";

interface PriorityTodoCardProps {
  items: TodoItem[];
  loading?: boolean;
  onToggleScheduled?: (taskId: string, date: string) => void;
  onToggleExtra?: (id: string) => void;
  onViewAll?: () => void;
}

export function PriorityTodoCard({
  items,
  loading,
  onToggleScheduled,
  onToggleExtra,
  onViewAll,
}: PriorityTodoCardProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const todayKey = toDateKey(new Date());
  const priority = getPriorityTodos(items, todayKey, 5);
  const top = priority[0];
  const moreCount = Math.max(0, items.length - 1);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleToggle(item: TodoItem) {
    if (item.type === "scheduled" && item.scheduledTaskId) {
      onToggleScheduled?.(item.scheduledTaskId, item.date);
    } else if (item.type === "extra") {
      onToggleExtra?.(item.id.replace("extra-", ""));
    }
  }

  if (loading) {
    return (
      <div className="h-9 w-full max-w-[280px] animate-pulse rounded-lg bg-border/40 sm:max-w-xs" />
    );
  }

  if (!top) {
    return (
      <div className="flex h-9 items-center gap-1.5 rounded-lg border border-accent/20 bg-accent-light/60 px-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent" aria-hidden>
          <path d="M3 7L5.5 9.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-medium text-accent">All caught up</span>
      </div>
    );
  }

  const isToday = top.date === todayKey;

  return (
    <div ref={ref} className="relative w-full max-w-[300px] sm:max-w-xs">
      <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 shadow-sm">
        <button
          type="button"
          onClick={() => handleToggle(top)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-border transition-colors hover:border-accent"
          aria-label={`Mark ${top.name} complete`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink">{top.name}</p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
            top.type === "extra" ? "bg-extra-light text-extra" : "bg-accent-light text-accent"
          }`}
        >
          {top.type === "extra" ? "Extra" : "Routine"}
        </span>
        {isToday && (
          <span className="shrink-0 text-[9px] font-medium text-muted">Today</span>
        )}
        {moreCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted hover:text-ink"
            aria-expanded={open}
            aria-label={`${moreCount} more to-do items`}
          >
            +{moreCount}
          </button>
        )}
        {items.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 text-[10px] font-medium text-accent hover:underline"
            aria-label="View full to-do list"
          >
            All
          </button>
        )}
      </div>

      {open && priority.length > 1 && (
        <ul className="absolute right-0 top-[calc(100%+6px)] z-50 w-full min-w-[260px] rounded-lg border border-border bg-surface py-1 shadow-lg">
          {priority.slice(1).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleToggle(item)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-canvas"
              >
                <span className="flex h-4 w-4 shrink-0 rounded border-2 border-border" />
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{item.name}</span>
                <span className="shrink-0 text-[10px] text-muted">{formatTodoDate(item.date)}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-border">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onViewAll?.();
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-accent hover:bg-canvas"
            >
              View full list →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
