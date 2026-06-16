"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import type { UserDTO } from "@/lib/auth-types";
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
  onBack: () => void;
  onDelete?: () => Promise<void>;
  assignableUsers?: UserDTO[];
  onUpdateMembers?: (assignedUserIds: string[]) => Promise<void>;
  onAddItem: (data: {
    title: string;
    description?: string;
    type: ProjectItemType;
    dueDate: string | null;
    assignedUserIds?: string[];
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
  onBack,
  onDelete,
  assignableUsers = [],
  onUpdateMembers,
  onAddItem,
  onCompleteWork,
  onCloseProject,
}: ProjectDetailViewProps) {
  const [tab, setTab] = useState<ProjectTab>("dashboard");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [completeItemId, setCompleteItemId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [memberEditorOpen, setMemberEditorOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>(detail.project.assignedUserIds);
  const [savingMembers, setSavingMembers] = useState(false);

  useEffect(() => {
    setMemberIds(detail.project.assignedUserIds);
  }, [detail.project.assignedUserIds]);

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
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveMembers() {
    if (!onUpdateMembers) return;
    setSavingMembers(true);
    try {
      await onUpdateMembers(memberIds);
      setMemberEditorOpen(false);
    } finally {
      setSavingMembers(false);
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
              {onDelete && (
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
            {onUpdateMembers && (
              <div className="mt-4 rounded-lg border border-border bg-canvas/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted">
                    Members:{" "}
                    {assignableUsers
                      .filter((u) => memberIds.includes(u.id))
                      .map((u) => u.name)
                      .join(", ") || "None"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMemberEditorOpen((v) => !v)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {memberEditorOpen ? "Close" : "Manage members"}
                  </button>
                </div>
                {memberEditorOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {assignableUsers.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={memberIds.includes(u.id)}
                            onChange={(e) =>
                              setMemberIds((ids) =>
                                e.target.checked
                                  ? [...ids, u.id]
                                  : ids.filter((id) => id !== u.id)
                              )
                            }
                          />
                          {u.name}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveMembers()}
                      disabled={savingMembers}
                      className="btn-primary !min-h-9 text-xs"
                    >
                      {savingMembers ? "Saving…" : "Save members"}
                    </button>
                  </div>
                )}
              </div>
            )}
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
            assigneeOptions={assignableUsers.filter(
              (u) => memberIds.includes(u.id) || u.id === project.createdBy
            )}
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
