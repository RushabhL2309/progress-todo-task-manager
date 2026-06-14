"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { formatDeadlineLabel } from "@/lib/project-stats";
import type { ProjectDTO } from "@/lib/types";
import { DeleteIconButton } from "./DeleteIconButton";
import { ProjectProgressSummary } from "./ProjectProgressSummary";

interface ProjectCardProps {
  project: ProjectDTO;
  onClick: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function ProjectCard({ project, onClick, onDelete, deleting }: ProjectCardProps) {
  const initial = project.name.charAt(0).toUpperCase();
  const updatedAgo = formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true });
  const deadlineLabel = formatDeadlineLabel(project.nextDeadline);

  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-border bg-surface text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-md">
      {onDelete && (
        <DeleteIconButton
          label={`Delete ${project.name}`}
          disabled={deleting}
          onClick={onDelete}
          className="absolute right-2.5 top-2.5 z-10 sm:right-3 sm:top-3"
        />
      )}

      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left ${onDelete ? "pr-10 sm:pr-11" : ""}`}
      >
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: project.color }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 pr-1">
              <h3 className="min-w-0 flex-1 truncate font-semibold text-ink group-hover:text-accent">
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
              <p className="mt-1 text-[10px] text-muted">Project due {project.deadline}</p>
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
    </div>
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
      className={`h-2 w-2 shrink-0 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
