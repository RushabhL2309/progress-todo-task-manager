"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { formatDeadlineLabel } from "@/lib/project-stats";
import type { ProjectDTO } from "@/lib/types";
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
    <div className="group w-full overflow-hidden rounded-xl border border-border bg-surface text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-md">
      <div className="flex items-start gap-2 p-4 sm:p-5">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
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
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:mt-1"
            aria-label={`Delete ${project.name}`}
            title="Delete project"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 4.5H13M6 4.5V3.25C6 2.56 6.56 2 7.25 2H8.75C9.44 2 10 2.56 10 3.25V4.5M6.25 7V11.25M9.75 7V11.25M4.5 4.5L5 13.25C5 13.94 5.56 14.5 6.25 14.5H9.75C10.44 14.5 11 13.94 11 13.25L11.5 4.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <button type="button" onClick={onClick} className="w-full text-left">
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
      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
