"use client";

import { useState } from "react";
import type { ProjectDetailDTO } from "@/lib/types";
import { ProjectCompleteModal } from "./ProjectCompleteModal";
import { ProjectInternalDashboard } from "./ProjectInternalDashboard";
import { ProjectIssuesTab } from "./ProjectIssuesTab";
import { ProjectProgressSummary } from "./ProjectProgressSummary";
import type { ProjectItemType } from "@/lib/types";

type ProjectTab = "dashboard" | "issues";

interface ProjectDetailViewProps {
  detail: ProjectDetailDTO;
  loading: boolean;
  onBack: () => void;
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
}

export function ProjectDetailView({
  detail,
  loading,
  onBack,
  onAddItem,
  onCompleteWork,
}: ProjectDetailViewProps) {
  const [tab, setTab] = useState<ProjectTab>("dashboard");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeItemId, setCompleteItemId] = useState<string | null>(null);

  const openItems = detail.items.filter((i) => i.status === "open");
  const { project } = detail;

  function openComplete(itemId?: string) {
    setCompleteItemId(itemId ?? null);
    setCompleteOpen(true);
  }

  const tabs: { id: ProjectTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "issues", label: "Issues & features" },
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
              </div>
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
      </div>

      <ProjectCompleteModal
        open={completeOpen}
        projectName={project.name}
        openItems={openItems}
        preselectedId={completeItemId}
        onClose={() => setCompleteOpen(false)}
        onSubmit={onCompleteWork}
      />
    </>
  );
}
