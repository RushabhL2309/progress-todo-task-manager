"use client";

import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ExtraTaskDTO } from "@/lib/types";
import { Checkbox } from "./Checkbox";

interface ExtraTasksPanelProps {
  dateKey: string;
  tasks: ExtraTaskDTO[];
  onAdd: (name: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  compact?: boolean;
  subtitle?: string;
  onOpenDrawer?: () => void;
}

export function ExtraTasksPanel({
  dateKey,
  tasks,
  onAdd,
  onToggle,
  onDelete,
  loading,
  compact,
  subtitle,
  onOpenDrawer,
}: ExtraTasksPanelProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateLabel = subtitle ?? format(parseISO(dateKey), "EEEE, d MMMM yyyy");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setName("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`card ${compact ? "border-extra/15" : "border-extra/20"} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-md bg-extra-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-extra">
            Extra
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Extra tasks</h2>
            <p className="text-xs text-muted">{dateLabel} · 2 pts each</p>
          </div>
        </div>
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="text-xs font-medium text-extra hover:underline"
          >
            + Add
          </button>
        )}
      </div>

      {!compact && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a one-off task for this day"
            className="input-field flex-1"
            disabled={submitting}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={submitting || !name.trim()}>
            Add
          </button>
        </form>
      )}

      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-border/30" />
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No extra tasks for this day.</p>
      ) : (
        <ul className={`space-y-2 ${compact ? "mt-4" : "mt-4"}`}>
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-canvas/60 px-3 py-2.5 transition-colors hover:border-extra/20"
            >
              <Checkbox
                checked={task.completed}
                onChange={(v) => onToggle(task.id, v)}
                label={task.name}
                size="sm"
              />
              <span
                className={`flex-1 text-sm ${
                  task.completed ? "text-muted line-through" : "text-ink"
                }`}
              >
                {task.name}
              </span>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="text-xs text-muted transition-colors hover:text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
