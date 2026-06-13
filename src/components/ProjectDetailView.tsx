"use client";

import { format, parseISO } from "date-fns";
import { useState } from "react";
import type { ProjectDetailDTO } from "@/lib/types";
import { ProjectActivityTab } from "./ProjectActivityTab";
import { ProjectCompleteModal } from "./ProjectCompleteModal";
import { ProjectCloseModal } from "./ProjectCloseModal";
import { ProjectInternalDashboard } from "./ProjectInternalDashboard";
import { ProjectIssuesTab } from "./ProjectIssuesTab";
import { ProjectProgressSummary } from "./ProjectProgressSummary";
import type { ProjectItemType } from "@/lib/types";

type ProjectTab = "dashboard" | "issues" | "activity";

interface ProjectDetailViewProps {
  detail: ProjectDetailDTO;
  loading: boolean;
  isMaster?: boolean;
  onBack: () => void;
  onDelete?: () => Promise<void>;
  onAddItem: (data: {
    title: string;
    description?: string;
    type: ProjectItemType;
    dueDate: string | null;
  }) => Promise<void>;
  onCompleteWork: (data: {
    description: string;
    resolvedItemIds: string[];
    date: string;
    addAsExtraTask: boolean;
    extraTaskTitle: string;
  }) => Promise<void>;
  onCloseProject: (paymentReceived: boolean) => Promise<void>;
}

export function ProjectDetailView({
  detail,
  loading,
  isMaster = false,
  onBack,
  onDelete,
  onAddItem,
  onCompleteWork,
  onCloseProject,
}: ProjectDetailViewProps) {
  const [tab, setTab] = useState<ProjectTab>("dashboard");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [completeItemId, setCompleteItemId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openItems = detail.items.filter((i) => i.status === "open");
  const { project } = detail;
  const today = new Date().toISOString().slice(0, 10);
  const projectDueOverdue = Boolean(project.deadline && project.deadline < today);
  const projectDueToday = project.deadline === today;

  function openComplete(itemId?: string) {
    setCompleteItemId(itemId ?? null);
    setCompleteOpen(true);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(`Delete project "${project.name}" and all its tasks? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const tabs: { id: ProjectTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "issues", label: "Issues & features" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <>
      <div className="min-w-0 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-accent hover:underline"
        >
          ← All projects
        </button>

        <div className="card overflow-hidden">
          <div className="h-1" style={{ backgroundColor: project.color }} />
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-ink sm:text-xl">{project.name}</h1>
                {project.description && (
                  <p className="text-xs text-muted sm:text-sm">{project.description}</p>
                )}
                {project.deadline && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      projectDueOverdue
                        ? "text-red-600"
                        : projectDueToday
                          ? "text-accent"
                          : "text-muted"
                    }`}
                  >
                    Due {format(parseISO(project.deadline), "d MMM yyyy")}
                    {projectDueOverdue && " · Overdue"}
                    {projectDueToday && " · Today"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {project.status !== "completed" && (
                <button
                  type="button"
                  onClick={() => setCloseOpen(true)}
                  className="btn-ghost !min-h-10 border border-border text-sm"
                >
                  Close project
                </button>
              )}
              {project.status === "completed" && (
                <span className="rounded-lg bg-canvas px-3 py-1.5 text-xs font-medium text-muted">
                  Completed
                </span>
              )}
              {isMaster && onDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete project"}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-border px-4 pb-4 sm:px-5">
            <ProjectProgressSummary project={project} />
          </div>

          <div className="border-t border-border px-4 sm:px-5">
            <nav className="-mb-px flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {tab === "dashboard" && <ProjectInternalDashboard detail={detail} />}

        {tab === "issues" && (
          <ProjectIssuesTab
            detail={detail}
            loading={loading}
            onAddItem={onAddItem}
            onCompleteItem={(id) => openComplete(id)}
            onLogWork={() => openComplete()}
          />
        )}

        {tab === "activity" && <ProjectActivityTab activities={detail.activities ?? []} />}
      </div>

      <ProjectCompleteModal
        open={completeOpen}
        projectName={project.name}
        openItems={openItems}
        preselectedId={completeItemId}
        onClose={() => setCompleteOpen(false)}
        onSubmit={onCompleteWork}
      />
      <ProjectCloseModal
        open={closeOpen}
        projectName={project.name}
        onClose={() => setCloseOpen(false)}
        onSubmit={async (paymentReceived) => {
          await onCloseProject(paymentReceived);
          setCloseOpen(false);
        }}
      />
    </>
  );
}
