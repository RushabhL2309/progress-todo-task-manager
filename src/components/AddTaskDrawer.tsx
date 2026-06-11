"use client";

import { FormEvent, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ProjectDTO } from "@/lib/types";
import { Drawer } from "./Drawer";

export type DrawerTaskType = "regular" | "extra";

interface AddTaskDrawerProps {
  open: boolean;
  type: DrawerTaskType | null;
  selectedDate: string;
  projects?: ProjectDTO[];
  onClose: () => void;
  onAddRegular: (name: string) => Promise<void>;
  onAddExtra: (name: string, date: string, projectId?: string) => Promise<void>;
}

export function AddTaskDrawer({
  open,
  type,
  selectedDate,
  projects = [],
  onClose,
  onAddRegular,
  onAddExtra,
}: AddTaskDrawerProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegular = type === "regular";
  const activeProjects = projects.filter((p) => p.status === "active");

  useEffect(() => {
    if (open) {
      setDate(selectedDate);
      setProjectId("");
    }
  }, [open, selectedDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      if (isRegular) {
        await onAddRegular(trimmed);
      } else {
        await onAddExtra(trimmed, date, projectId || undefined);
      }
      setName("");
      setProjectId("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open && type !== null}
      onClose={onClose}
      title={isRegular ? "Add regular task" : "Add extra task"}
      subtitle={
        isRegular
          ? "Repeats every day in your progress grid"
          : "One-off task for a specific day — worth 2 bonus points"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isRegular && activeProjects.length > 0 && (
          <div>
            <label htmlFor="task-project" className="mb-1.5 block text-sm font-medium text-ink">
              Link to project (optional)
            </label>
            <select
              id="task-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-field"
              disabled={submitting}
            >
              <option value="">No project</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {projectId && (
              <p className="mt-1.5 text-xs text-muted">
                Adds today&apos;s goal as a task on the project (due {format(parseISO(date), "d MMM")})
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="task-name" className="mb-1.5 block text-sm font-medium text-ink">
            {projectId && !isRegular ? "Today's goal" : "Task name"}
          </label>
          <input
            id="task-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              isRegular
                ? "e.g. Morning workout"
                : projectId
                  ? "e.g. Finish API integration"
                  : "e.g. Finish presentation"
            }
            className="input-field"
            autoFocus
            disabled={submitting}
          />
        </div>

        {!isRegular && (
          <div>
            <label htmlFor="task-date" className="mb-1.5 block text-sm font-medium text-ink">
              Date
            </label>
            <input
              id="task-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              disabled={submitting}
            />
            <p className="mt-1.5 text-xs text-muted">
              {format(parseISO(date), "EEEE, d MMMM yyyy")}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 !min-w-0" disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={submitting || !name.trim()}>
            {submitting ? "Adding…" : "Add task"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
