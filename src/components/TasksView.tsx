"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { ExtraTaskDTO, ScheduledTaskDTO } from "@/lib/types";
import { Checkbox } from "./Checkbox";

type TaskTab = "regular" | "extra";

interface TasksViewProps {
  scheduledTasks: ScheduledTaskDTO[];
  allExtras: ExtraTaskDTO[];
  loading: boolean;
  onAddRegular: () => void;
  onAddExtra: () => void;
  onDeleteRegular: (id: string) => Promise<void>;
  onToggleExtra: (id: string, completed: boolean) => Promise<void>;
  onDeleteExtra: (id: string) => Promise<void>;
}

export function TasksView({
  scheduledTasks,
  allExtras,
  loading,
  onAddRegular,
  onAddExtra,
  onDeleteRegular,
  onToggleExtra,
  onDeleteExtra,
}: TasksViewProps) {
  const [tab, setTab] = useState<TaskTab>("regular");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Manage Tasks</h1>
          <p className="mt-1 text-sm text-muted">Add, review, and remove your routine and extra tasks</p>
        </div>
        <button
          type="button"
          onClick={tab === "regular" ? onAddRegular : onAddExtra}
          className={tab === "regular" ? "btn-primary" : "inline-flex min-h-[44px] items-center rounded-lg border border-extra/30 bg-extra-light px-4 py-2 text-sm font-medium text-extra"}
        >
          + Add {tab === "regular" ? "regular" : "extra"} task
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {(["regular", "extra"] as TaskTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[36px] rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? t === "regular"
                  ? "bg-accent text-white"
                  : "bg-extra-light text-extra"
                : "text-muted hover:text-ink"
            }`}
          >
            {t === "regular" ? "Regular tasks" : "Extra tasks"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card h-48 animate-pulse bg-border/30" />
      ) : tab === "regular" ? (
        <div className="card divide-y divide-border">
          {scheduledTasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">No regular tasks yet.</p>
              <button type="button" onClick={onAddRegular} className="btn-primary mt-4">
                Add your first routine task
              </button>
            </div>
          ) : (
            scheduledTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{task.name}</p>
                    <p className="text-xs text-muted">Repeats daily · 1 point</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRegular(task.id)}
                  className="text-xs text-muted transition-colors hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {allExtras.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">No extra tasks in this period.</p>
              <button
                type="button"
                onClick={onAddExtra}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-extra/30 bg-extra-light px-4 py-2 text-sm font-medium text-extra"
              >
                Add an extra task
              </button>
            </div>
          ) : (
            allExtras.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-4">
                <Checkbox
                  checked={task.completed}
                  onChange={(v) => onToggleExtra(task.id, v)}
                  label={task.name}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.completed ? "text-muted line-through" : "text-ink"}`}>
                    {task.name}
                  </p>
                  <p className="text-xs text-muted">
                    {format(parseISO(task.date), "EEE, d MMM yyyy")} · 2 points
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteExtra(task.id)}
                  className="text-xs text-muted transition-colors hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
