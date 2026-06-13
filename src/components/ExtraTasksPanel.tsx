"use client";

import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ExtraTaskDTO, ProjectDTO } from "@/lib/types";
import { Checkbox } from "./Checkbox";

interface ExtraTasksPanelProps {
  dateKey: string;
  tasks: ExtraTaskDTO[];
  projects?: ProjectDTO[];
  onAdd: (name: string, projectId?: string) => Promise<void>;
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
  projects = [],
  onAdd,
  onToggle,
  onDelete,
  loading,
  compact,
  subtitle,
  onOpenDrawer,
}: ExtraTasksPanelProps) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const dateLabel = subtitle ?? format(parseISO(dateKey), "EEEE, d MMMM yyyy");
  const activeProjects = projects.filter((p) => p.status === "active");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed, projectId || undefined);
      setName("");
      setProjectId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`card min-w-0 overflow-hidden ${compact ? "border-extra/15" : "border-extra/20"} p-4 sm:p-5`}>
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

      <form onSubmit={handleSubmit} className={`${compact ? "mt-3" : "mt-4"} min-w-0 space-y-2`}>
          {activeProjects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-field max-w-full text-sm"
              disabled={submitting}
            >
              <option value="">No project — one-off extra</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                projectId
                  ? "Today's goal for this project…"
                  : "Add a one-off task for this day"
              }
              className="input-field min-w-0 flex-1"
              disabled={submitting}
            />
            <button type="submit" className="btn-primary w-full shrink-0 sm:w-auto" disabled={submitting || !name.trim()}>
              Add
            </button>
          </div>
          {projectId && !compact && (
            <p className="text-[10px] text-muted">
              Also adds as a task on the project with today&apos;s due date
            </p>
          )}
      </form>

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
              <div className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${
                    task.completed ? "text-muted line-through" : "text-ink"
                  }`}
                >
                  {task.name}
                </span>
                {task.projectId && projectNames[task.projectId] && (
                  <span className="mt-0.5 inline-block rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {projectNames[task.projectId]}
                  </span>
                )}
              </div>
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
