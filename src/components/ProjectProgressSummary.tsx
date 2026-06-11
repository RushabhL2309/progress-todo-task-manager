"use client";

import { format, parseISO } from "date-fns";
import { formatDeadlineLabel } from "@/lib/project-stats";
import type { ProjectDTO } from "@/lib/types";

interface ProjectProgressSummaryProps {
  project: ProjectDTO;
  compact?: boolean;
}

export function ProjectProgressSummary({ project, compact }: ProjectProgressSummaryProps) {
  const pct = project.completionPercent;
  const deadlineLabel = formatDeadlineLabel(project.nextDeadline);

  const rows = [
    { key: "Issues", ...project.breakdown.issue, color: "text-extra" },
    { key: "Features", ...project.breakdown.feature, color: "text-blue-700" },
    { key: "Tasks", ...project.breakdown.task, color: "text-accent" },
  ].filter((r) => r.total > 0);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            <span className="font-semibold text-ink">{project.resolvedCount}</span>
            <span> / {project.totalItems} completed</span>
          </p>
          {rows.length > 0 && (
            <p className="mt-0.5 truncate text-[10px] text-muted">
              {rows.map((r) => `${r.done}/${r.total} ${r.key.toLowerCase()}`).join(" · ")}
            </p>
          )}
          {deadlineLabel && (
            <p
              className={`mt-0.5 text-[10px] font-medium ${
                project.overdueCount > 0 ? "text-red-600" : "text-muted"
              }`}
            >
              {deadlineLabel}
              {project.nextDeadline && project.overdueCount === 0 && (
                <span className="font-normal">
                  {" "}
                  ({format(parseISO(project.nextDeadline), "d MMM")})
                </span>
              )}
            </p>
          )}
        </div>
        <ProgressRing percent={pct} color={project.color} size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <ProgressRing percent={pct} color={project.color} size="md" />
        <div>
          <p className="text-2xl font-semibold text-ink">{pct}%</p>
          <p className="text-sm text-muted">
            {project.resolvedCount} of {project.totalItems} items done
          </p>
          {project.overdueCount > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {project.overdueCount} overdue
            </p>
          )}
          {deadlineLabel && project.overdueCount === 0 && project.nextDeadline && (
            <p className="mt-1 text-xs text-muted">
              Next deadline: {format(parseISO(project.nextDeadline), "d MMM yyyy")}
            </p>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.key} className="rounded-lg border border-border bg-canvas/50 px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase ${r.color}`}>{r.key}</p>
              <p className="mt-0.5 text-sm font-medium text-ink">
                {r.done} / {r.total} done
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressRing({
  percent,
  color,
  size,
}: {
  percent: number;
  color: string;
  size: "sm" | "md";
}) {
  const dim = size === "sm" ? 28 : 48;
  const r = size === "sm" ? 11 : 18;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <svg className="-rotate-90" width={dim} height={dim} aria-hidden>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="#E8E8E4"
          strokeWidth={size === "sm" ? 2.5 : 3}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={size === "sm" ? 2.5 : 3}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold text-ink ${
          size === "sm" ? "text-[8px]" : "text-xs"
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}
