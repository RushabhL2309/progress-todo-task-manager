"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type { UserDTO } from "@/lib/auth-types";
import type { ProjectDTO, ProjectItemType, ProjectTaskDTO } from "@/lib/types";
import { Drawer } from "./Drawer";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

interface ProjectTasksViewProps {
  projects: ProjectDTO[];
  onOpenProject?: (id: string) => void;
}

export function ProjectTasksView({ projects, onOpenProject }: ProjectTasksViewProps) {
  const [tasks, setTasks] = useState<ProjectTaskDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectItemType>("task");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [tRes, uRes] = await Promise.all([
      apiFetch("/api/projects/tasks"),
      apiFetch("/api/admin/users/assignable"),
    ]);
    if (tRes.ok) setTasks(await tRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    setLoadedOnce(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeProjects = projects.filter((p) => p.status !== "completed");
  const selectedProject = activeProjects.find((p) => p.id === projectId);

  const assigneeOptions = useMemo(() => {
    if (!selectedProject) return users;
    const ids = new Set(selectedProject.assignedUserIds);
    if (selectedProject.createdBy) ids.add(selectedProject.createdBy);
    return users.filter((u) => ids.has(u.id));
  }, [selectedProject, users]);

  useEffect(() => {
    if (assignedUserId && !assigneeOptions.some((u) => u.id === assignedUserId)) {
      setAssignedUserId("");
    }
  }, [assigneeOptions, assignedUserId]);

  useEffect(() => {
    setAssignedUserIds((ids) => ids.filter((id) => assigneeOptions.some((u) => u.id === id)));
  }, [assigneeOptions]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("task");
    setDueDate("");
    setProjectId("");
    setAssignedUserId("");
    setAssignedUserIds([]);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/projects/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          dueDate: dueDate || null,
          projectId: projectId || null,
          assignedUserId: assignedUserId || null,
          assignedUserIds,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as ProjectTaskDTO;
        setTasks((list) => [created, ...list]);
        resetForm();
        setDrawerOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(task: ProjectTaskDTO) {
    if (task.status === "open") {
      setDetailTaskId(task.id);
      return;
    }
    const res = await apiFetch(`/api/projects/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ProjectTaskDTO;
      setTasks((list) => list.map((t) => (t.id === task.id ? updated : t)));
    }
  }

  function handleTaskUpdated(updated: ProjectTaskDTO) {
    setTasks((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function reassign(taskId: string, userId: string) {
    const res = await apiFetch(`/api/projects/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedUserId: userId || null }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ProjectTaskDTO;
      setTasks((list) => list.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  const shown = tasks.filter((t) => filter === "all" || t.status === "open");
  const openCount = tasks.filter((t) => t.status === "open").length;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {openCount} open · {tasks.length} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                filter === "open" ? "bg-surface text-accent shadow-sm" : "text-muted"
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                filter === "all" ? "bg-surface text-accent shadow-sm" : "text-muted"
              }`}
            >
              All
            </button>
          </div>
          <button type="button" onClick={() => setDrawerOpen(true)} className="btn-primary shrink-0">
            + Add task
          </button>
        </div>
      </div>

      {loading && !loadedOnce ? (
        <div className="h-32 animate-pulse rounded-xl bg-border/30" />
      ) : shown.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No tasks yet.{" "}
          <button type="button" onClick={() => setDrawerOpen(true)} className="text-accent hover:underline">
            Add one
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((task) => {
            const project = task.projectId
              ? projects.find((p) => p.id === task.projectId)
              : null;
            const rowAssignees = project
              ? users.filter(
                  (u) =>
                    project.assignedUserIds.includes(u.id) ||
                    u.id === project.createdBy
                )
              : users;

            return (
              <li
                key={task.id}
                className={`card min-w-0 cursor-pointer p-4 transition-colors hover:bg-canvas/50 ${
                  task.status === "resolved" ? "opacity-70" : ""
                }`}
                onClick={() => setDetailTaskId(task.id)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(task);
                        }}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                          task.status === "resolved"
                            ? "border-accent bg-accent text-white"
                            : "border-border"
                        }`}
                        aria-label={task.status === "open" ? "Mark done" : "Reopen"}
                      >
                        {task.status === "resolved" && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </button>
                      <p
                        className={`font-medium text-ink ${
                          task.status === "resolved" ? "line-through text-muted" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                        {task.type}
                      </span>
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted">{task.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-accent">Click for messages & completion →</span>
                      {task.projectId ? (
                        <button
                          type="button"
                          onClick={() => onOpenProject?.(task.projectId!)}
                          className="rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-medium text-accent hover:underline"
                        >
                          {task.projectName ?? "Project"}
                        </button>
                      ) : (
                        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">
                          Independent
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-muted">
                          Due {format(parseISO(task.dueDate), "d MMM yyyy")}
                        </span>
                      )}
                      {task.assignedUserName && (
                        <span className="text-[10px] text-muted">→ {task.assignedUserName}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:w-44" onClick={(e) => e.stopPropagation()}>
                    <label className="mb-1 block text-[10px] font-medium text-muted">
                      Assigned
                    </label>
                    <select
                      value={task.assignedUserId ?? ""}
                      onChange={(e) => reassign(task.id, e.target.value)}
                      className="input-field !min-h-9 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {rowAssignees.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        title="Add task"
        subtitle="Link to a project or keep it independent"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="input-field"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details (optional)"
            rows={3}
            className="input-field min-h-[80px]"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Project (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">No project — independent task</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Assign to (single)</label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {selectedProject && assigneeOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted">Assign users on the project first.</p>
            )}
          </div>
          {assigneeOptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Assign users (multiple)</p>
              <div className="flex flex-wrap gap-2">
                {assigneeOptions.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={assignedUserIds.includes(u.id)}
                      onChange={(e) =>
                        setAssignedUserIds((ids) =>
                          e.target.checked ? [...ids, u.id] : ids.filter((id) => id !== u.id)
                        )
                      }
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectItemType)}
                className="input-field text-sm"
              >
                <option value="task">Task</option>
                <option value="issue">Issue</option>
                <option value="feature">Feature</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting || !title.trim()}>
              {submitting ? "Adding…" : "Add task"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                resetForm();
              }}
              className="btn-ghost flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>

      <TaskDetailDrawer
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onUpdated={handleTaskUpdated}
        onOpenProject={onOpenProject}
      />
    </div>
  );
}
