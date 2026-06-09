"use client";

import { FormEvent, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import type { ExtraTaskDTO, ScheduledTaskDTO } from "@/lib/types";
import { Checkbox } from "./Checkbox";

interface DailyTodoViewProps {
  dateKey: string;
  extras: ExtraTaskDTO[];
  scheduledTasks: ScheduledTaskDTO[];
  routinePending: { id: string; name: string }[];
  loading: boolean;
  onDateChange: (dateKey: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onAdd: (name: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onEdit: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCarryForward: () => Promise<{ carried: number }>;
  onToggleRoutine: (taskId: string) => void;
}

export function DailyTodoView({
  dateKey,
  extras,
  scheduledTasks,
  routinePending,
  loading,
  onDateChange,
  onPrevDay,
  onNextDay,
  onToday,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onCarryForward,
  onToggleRoutine,
}: DailyTodoViewProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [carrying, setCarrying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const dateLabel = format(parseISO(dateKey), "EEEE, d MMMM yyyy");
  const nextLabel = format(addDays(parseISO(dateKey), 1), "EEE d MMM");
  const incompleteCount = extras.filter((t) => !t.completed).length;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await onAdd(trimmed);
      setName("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await onEdit(id, trimmed);
    setEditingId(null);
    setEditName("");
  }

  async function handleCarryForward() {
    setCarrying(true);
    setMessage(null);
    try {
      const { carried } = await onCarryForward();
      setMessage(
        carried > 0
          ? `Carried ${carried} task${carried > 1 ? "s" : ""} to ${nextLabel}`
          : "No incomplete tasks to carry forward (or already on next day)"
      );
    } finally {
      setCarrying(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Daily to-do</h1>
          <p className="mt-1 text-sm text-muted">Add, edit, and carry tasks for one day</p>
        </div>
        {incompleteCount > 0 && (
          <button
            type="button"
            onClick={handleCarryForward}
            disabled={carrying || loading}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-extra/30 bg-extra-light px-4 py-2 text-sm font-medium text-extra transition-colors hover:bg-extra-light/80 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8H13M10 5L13 8L10 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {carrying ? "Carrying…" : `Carry forward to ${nextLabel}`}
          </button>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevDay} className="btn-ghost" aria-label="Previous day">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <input
            type="date"
            value={dateKey}
            onChange={(e) => onDateChange(e.target.value)}
            className="input-field !min-h-10 max-w-[160px] text-sm"
          />
          <button type="button" onClick={onNextDay} className="btn-ghost" aria-label="Next day">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            Today
          </button>
        </div>
        <p className="text-sm font-medium text-ink">{dateLabel}</p>
      </div>

      {message && (
        <div className="rounded-lg border border-accent/20 bg-accent-light px-4 py-2.5 text-sm text-accent">
          {message}
        </div>
      )}

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Today&apos;s to-do list</h2>
        <p className="mt-1 text-xs text-muted">Extra tasks for this day · 2 pts each when done</p>

        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a task for this day…"
            className="input-field flex-1"
            disabled={submitting}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={submitting || !name.trim()}>
            Add
          </button>
        </form>

        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-border/30" />
        ) : extras.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No to-do items yet for this day.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {extras.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-canvas/50 px-3 py-2.5 sm:gap-3"
              >
                <Checkbox
                  checked={task.completed}
                  onChange={(v) => onToggle(task.id, v)}
                  label={task.name}
                  size="sm"
                />
                {editingId === task.id ? (
                  <div className="flex min-w-0 flex-1 gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field !min-h-9 flex-1 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(task.id)}
                      className="shrink-0 text-xs font-medium text-accent hover:underline"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="shrink-0 text-xs text-muted hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        task.completed ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      {task.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(task.id);
                        setEditName(task.name);
                      }}
                      className="shrink-0 text-xs text-muted hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="shrink-0 text-xs text-muted hover:text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {scheduledTasks.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Routine still pending</h2>
          <p className="mt-1 text-xs text-muted">Scheduled tasks not yet checked off today · 1 pt each</p>
          {routinePending.length === 0 ? (
            <p className="mt-3 text-sm text-accent">All routine tasks done for this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {routinePending.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onToggleRoutine(task.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border hover:border-accent"
                    aria-label={`Mark ${task.name} complete`}
                  />
                  <span className="text-sm text-ink">{task.name}</span>
                  <span className="ml-auto rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-medium text-accent">
                    Routine
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
