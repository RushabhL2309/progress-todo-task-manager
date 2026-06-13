"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { formatDeadlineLabel } from "@/lib/project-stats";
import type { ProjectDTO } from "@/lib/types";
import { ProjectProgressSummary } from "./ProjectProgressSummary";

interface ProjectCardProps {
  project: ProjectDTO;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const initial = project.name.charAt(0).toUpperCase();
  const updatedAgo = formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true });
  const deadlineLabel = formatDeadlineLabel(project.nextDeadline);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border border-border bg-surface text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: project.color }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-ink group-hover:text-accent">
              {project.name}
            </h3>
            <StatusDot status={project.status} />
          </div>
          {project.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{project.description}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted/60">No description</p>
          )}
          {project.deadline && (
            <p className="mt-1 text-[10px] text-muted">
              Project due {project.deadline}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-canvas/40 px-4 py-3 sm:px-5">
        <ProjectProgressSummary project={project} compact />
      </div>

      <p className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted sm:px-5">
        <span>Updated {updatedAgo}</span>
        {deadlineLabel && (
          <span className={project.overdueCount > 0 ? "font-medium text-red-600" : ""}>
            {deadlineLabel}
            {project.nextDeadline && project.overdueCount === 0 && (
              <> · {format(parseISO(project.nextDeadline), "d MMM")}</>
            )}
          </span>
        )}
      </p>
    </button>
  );
}

function StatusDot({ status }: { status: ProjectDTO["status"] }) {
  const colors = {
    active: "bg-accent",
    paused: "bg-extra",
    completed: "bg-muted",
  };
  return (
    <span
      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
