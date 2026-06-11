"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ProjectsDashboardStats } from "@/lib/types";

interface ProjectsDashboardSectionProps {
  onOpenProjects?: () => void;
}

export function ProjectsDashboardSection({ onOpenProjects }: ProjectsDashboardSectionProps) {
  const [stats, setStats] = useState<ProjectsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/projects/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card h-40 animate-pulse bg-border/30" />;
  }

  if (!stats || stats.totalProjects === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink">Projects</h2>
        <p className="mt-2 text-sm text-muted">No projects tracked yet.</p>
        {onOpenProjects && (
          <button type="button" onClick={onOpenProjects} className="btn-primary mt-4">
            Open projects
          </button>
        )}
      </div>
    );
  }

  const progress =
    stats.openIssues + stats.resolvedIssues > 0
      ? Math.round(
          (stats.resolvedIssues / (stats.openIssues + stats.resolvedIssues)) * 100
        )
      : 0;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Projects overview</h2>
        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="text-xs font-medium text-accent hover:underline"
          >
            View all
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Projects", value: stats.totalProjects },
          { label: "Active", value: stats.activeProjects },
          { label: "Open items", value: stats.openIssues },
          { label: "Resolved", value: stats.resolvedIssues },
        ].map((c) => (
          <div key={c.label} className="rounded-lg bg-canvas px-3 py-2">
            <p className="text-[10px] uppercase text-muted">{c.label}</p>
            <p className="text-lg font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Overall resolution</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {stats.projects.slice(0, 4).map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span className="truncate text-sm font-medium text-ink">{p.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {p.openCount} open · {p.resolvedCount} done
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
