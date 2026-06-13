"use client";

import { format, parseISO } from "date-fns";
import type { ProjectActivityDTO } from "@/lib/types";

const ACTION_LABELS: Record<ProjectActivityDTO["action"], string> = {
  task_created: "Task created",
  task_completed: "Completed",
  task_reopened: "Reopened",
  task_assigned: "Assigned",
  task_overdue: "Overdue",
  work_logged: "Work logged",
  project_closed: "Project closed",
};

const ACTION_COLORS: Record<ProjectActivityDTO["action"], string> = {
  task_created: "bg-accent-light text-accent",
  task_completed: "bg-accent-light text-accent",
  task_reopened: "bg-canvas text-muted",
  task_assigned: "bg-canvas text-ink",
  task_overdue: "bg-red-50 text-red-700",
  work_logged: "bg-accent-light text-accent",
  project_closed: "bg-canvas text-ink",
};

interface ProjectActivityTabProps {
  activities: ProjectActivityDTO[];
}

export function ProjectActivityTab({ activities }: ProjectActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted">
        No activity yet. Task updates, work logs, and overdue items will appear here.
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">Project lifeline</h3>
      <p className="mt-1 text-xs text-muted">
        Tasks, completions, assignments, overdue items, and work logs
      </p>
      <ul className="mt-4 space-y-0">
        {activities.map((a, idx) => (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {idx < activities.length - 1 && (
              <span
                className="absolute left-[7px] top-4 h-full w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-surface ${
                a.action === "task_overdue" ? "bg-red-400" : "bg-accent"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                    ACTION_COLORS[a.action]
                  }`}
                >
                  {ACTION_LABELS[a.action]}
                </span>
                <span className="text-[10px] text-muted">
                  {format(parseISO(a.createdAt), "d MMM yyyy · HH:mm")}
                </span>
                {a.userName && a.userName !== "System" && (
                  <span className="text-[10px] text-muted">· {a.userName}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink">{a.description}</p>
              {a.itemTitle && a.action !== "task_overdue" && (
                <p className="mt-0.5 text-xs text-muted">{a.itemTitle}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
