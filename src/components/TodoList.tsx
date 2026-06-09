"use client";

import { formatTodoDate } from "@/lib/score";
import type { TodoItem } from "@/lib/types";

interface TodoListProps {
  items: TodoItem[];
  onToggleScheduled?: (taskId: string, date: string) => void;
  onToggleExtra?: (id: string) => void;
  loading?: boolean;
}

export function TodoList({ items, onToggleScheduled, onToggleExtra, loading }: TodoListProps) {
  if (loading) {
    return <div className="card h-32 animate-pulse bg-border/30" />;
  }

  return (
    <div id="todo-list" className="card scroll-mt-24 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">To-do list</h2>
      <p className="mt-1 text-xs text-muted">Unchecked items in the current period</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-accent">All caught up for this period.</p>
      ) : (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => {
                  if (item.type === "scheduled" && item.scheduledTaskId) {
                    onToggleScheduled?.(item.scheduledTaskId, item.date);
                  } else if (item.type === "extra") {
                    onToggleExtra?.(item.id.replace("extra-", ""));
                  }
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border transition-colors hover:border-accent"
                aria-label={`Mark ${item.name} complete`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{item.name}</p>
                <p className="text-xs text-muted">{formatTodoDate(item.date)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  item.type === "extra"
                    ? "bg-extra-light text-extra"
                    : "bg-accent-light text-accent"
                }`}
              >
                {item.type === "extra" ? "Extra" : "Routine"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
