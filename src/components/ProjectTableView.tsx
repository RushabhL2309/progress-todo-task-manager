"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { formatDeadlineLabel } from "@/lib/project-stats";
import type { ProjectDTO } from "@/lib/types";

interface ProjectTableViewProps {
  projects: ProjectDTO[];
  onSelect: (id: string) => void;
}

export function ProjectTableView({ projects, onSelect }: ProjectTableViewProps) {
  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="table-scroll-container">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const deadlineLabel = formatDeadlineLabel(p.nextDeadline);
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent-light/20"
                  onClick={() => onSelect(p.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{p.name}</p>
                        {p.description && (
                          <p className="truncate text-xs text-muted">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">{p.status}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{p.completionPercent}%</span>
                    <span className="text-muted">
                      {" "}
                      ({p.resolvedCount}/{p.totalItems})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.deadline ? (
                      <span className={p.overdueCount > 0 ? "font-medium text-red-600" : "text-muted"}>
                        {p.deadline}
                        {deadlineLabel && ` · ${deadlineLabel}`}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDistanceToNow(parseISO(p.updatedAt), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
