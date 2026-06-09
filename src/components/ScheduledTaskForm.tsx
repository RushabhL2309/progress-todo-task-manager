"use client";

import { FormEvent, useState } from "react";
import type { ScheduledTaskDTO } from "@/lib/types";

interface ScheduledTaskFormProps {
  tasks: ScheduledTaskDTO[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ScheduledTaskForm({ tasks, onAdd, onDelete }: ScheduledTaskFormProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">Scheduled tasks</h2>
      <p className="mt-1 text-xs text-muted">Your everyday routine — appears on every day in the grid.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning workout"
          className="input-field flex-1"
          disabled={submitting}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={submitting || !name.trim()}>
          Add
        </button>
      </form>

      {tasks.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">{task.name}</span>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="text-xs text-muted transition-colors hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
