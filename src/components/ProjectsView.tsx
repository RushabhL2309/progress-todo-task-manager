"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ClientProjectDTO, UserDTO } from "@/lib/auth-types";
import {
  getProjectLayoutView,
  setProjectLayoutView,
  type ProjectLayoutView,
} from "@/lib/project-layout-prefs";
import type { ProjectDTO, ProjectDetailDTO, ProjectItemType } from "@/lib/types";
import { Drawer } from "./Drawer";
import { LayoutViewToggle } from "./LayoutViewToggle";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailView } from "./ProjectDetailView";
import { ProjectTableView } from "./ProjectTableView";
import { ProjectTasksView } from "./ProjectTasksView";

type CreateMode = "new" | "from_client";
type ProjectsTab = "projects" | "tasks";

interface ProjectsViewProps {
  onWorkLogged?: () => void;
  projects?: ProjectDTO[];
  projectsLoading?: boolean;
  onProjectsChange?: (projects: ProjectDTO[]) => void;
}

export function ProjectsView({
  onWorkLogged,
  projects: sharedProjects,
  projectsLoading: sharedProjectsLoading,
  onProjectsChange,
}: ProjectsViewProps) {
  const [tab, setTab] = useState<ProjectsTab>("projects");
  const [layoutView, setLayoutView] = useState<ProjectLayoutView>("cards");
  const [projects, setProjects] = useState<ProjectDTO[]>(sharedProjects ?? []);
  const [detail, setDetail] = useState<ProjectDetailDTO | null>(null);
  const [listLoading, setListLoading] = useState(sharedProjects === undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("new");
  const [linkableClients, setLinkableClients] = useState<ClientProjectDTO[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserDTO[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLayoutView(getProjectLayoutView());
    const onLayoutChange = (e: Event) => {
      const detail = (e as CustomEvent<ProjectLayoutView>).detail;
      if (detail) setLayoutView(detail);
    };
    window.addEventListener("project-layout-change", onLayoutChange);
    return () => window.removeEventListener("project-layout-change", onLayoutChange);
  }, []);

  function handleLayoutChange(view: ProjectLayoutView) {
    setLayoutView(view);
    setProjectLayoutView(view);
  }

  const loadList = useCallback(async () => {
    const res = await apiFetch("/api/projects");
    if (!res.ok) throw new Error("Failed to load projects");
    return res.json() as Promise<ProjectDTO[]>;
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error("Failed to load project");
    return res.json() as Promise<ProjectDetailDTO>;
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedId) return;
    const [d, list] = await Promise.all([loadDetail(selectedId), loadList()]);
    setDetail(d);
    setProjects(list);
    onProjectsChange?.(list);
  }, [selectedId, loadDetail, loadList, onProjectsChange]);

  useEffect(() => {
    if (sharedProjects !== undefined) {
      setProjects(sharedProjects);
      setListLoading(sharedProjectsLoading ?? false);
      return;
    }
    setListLoading(true);
    loadList()
      .then((list) => {
        setProjects(list);
        onProjectsChange?.(list);
      })
      .finally(() => setListLoading(false));
  }, [sharedProjects, sharedProjectsLoading, loadList, onProjectsChange]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    loadDetail(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!drawerOpen) return;
    Promise.all([
      apiFetch("/api/clients/linkable"),
      apiFetch("/api/admin/users/assignable"),
    ]).then(async ([cRes, uRes]) => {
      if (cRes.ok) setLinkableClients(await cRes.json());
      if (uRes.ok) setAssignableUsers(await uRes.json());
    });
  }, [drawerOpen]);

  useEffect(() => {
    if (createMode !== "from_client" || !selectedClientId) return;
    const client = linkableClients.find((c) => c.id === selectedClientId);
    if (client) {
      setNewName(client.name);
      setNewDesc(client.notes || "");
      setAssignedUserIds(client.assignedUserIds);
    }
  }, [createMode, selectedClientId, linkableClients]);

  function resetProjectForm() {
    setNewName("");
    setNewDesc("");
    setNewDeadline("");
    setAssignedUserIds([]);
    setSelectedClientId("");
    setCreateMode("new");
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    const name =
      createMode === "from_client"
        ? linkableClients.find((c) => c.id === selectedClientId)?.name ?? newName
        : newName;
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: newDesc.trim(),
          deadline: newDeadline || null,
          assignedUserIds,
          linkedClientId: createMode === "from_client" ? selectedClientId : undefined,
        }),
      });
      if (!res.ok) return;
      const project = (await res.json()) as ProjectDTO;
      setProjects((p) => {
        const next = [project, ...p];
        onProjectsChange?.(next);
        return next;
      });
      resetProjectForm();
      setDrawerOpen(false);
      setSelectedId(project.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddItem(data: {
    title: string;
    description?: string;
    type: ProjectItemType;
    dueDate: string | null;
  }) {
    if (!selectedId) return;
    await apiFetch(`/api/projects/${selectedId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refreshDetail();
  }

  async function handleCompleteWork(data: {
    description: string;
    resolvedItemIds: string[];
    date: string;
    addAsExtraTask: boolean;
    extraTaskTitle: string;
  }) {
    if (!selectedId) return;
    await apiFetch(`/api/projects/${selectedId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refreshDetail();
    onWorkLogged?.();
  }

  async function handleCloseProject(paymentReceived: boolean) {
    if (!selectedId) return;
    await apiFetch(`/api/projects/${selectedId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentReceived }),
    });
    await refreshDetail();
  }

  async function handleDeleteProject(id?: string) {
    const projectId = id ?? selectedId;
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId) ?? detail?.project;
    const name = project?.name ?? "this project";
    if (!confirm(`Delete project "${name}" and all its tasks? This cannot be undone.`)) return;

    setDeletingId(projectId);
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) return;
      const list = await loadList();
      setProjects(list);
      onProjectsChange?.(list);
      if (selectedId === projectId) {
        setSelectedId(null);
        setDetail(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (selectedId) {
    if (!detail || detail.project.id !== selectedId) {
      return (
        <div className="min-w-0 space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-border/30" />
        </div>
      );
    }
    return (
      <ProjectDetailView
        detail={detail}
        loading={false}
        onBack={() => setSelectedId(null)}
        onDelete={() => handleDeleteProject()}
        onAddItem={handleAddItem}
        onCompleteWork={handleCompleteWork}
        onCloseProject={handleCloseProject}
      />
    );
  }

  const filtered = projects.filter(
    (p) =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Projects</h1>
          <p className="mt-1 text-sm text-muted">Manage projects and all related tasks in one place</p>
        </div>
        {tab === "projects" && (
          <button type="button" onClick={() => setDrawerOpen(true)} className="btn-primary shrink-0">
            + Add project
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-canvas p-1">
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              tab === "projects" ? "bg-surface text-accent shadow-sm" : "text-muted"
            }`}
          >
            Projects
          </button>
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              tab === "tasks" ? "bg-surface text-accent shadow-sm" : "text-muted"
            }`}
          >
            Tasks
          </button>
        </div>
        {tab === "projects" && <LayoutViewToggle value={layoutView} onChange={handleLayoutChange} />}
      </div>

      {tab === "tasks" ? (
        <ProjectTasksView
          projects={projects}
          onOpenProject={(id) => {
            setTab("projects");
            setSelectedId(id);
          }}
        />
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="input-field max-w-md text-sm"
          />

          {listLoading && projects.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-border/20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-muted">
                {projects.length === 0 ? "No projects yet." : "No projects match your search."}
              </p>
            </div>
          ) : layoutView === "table" ? (
            <ProjectTableView projects={filtered} onSelect={setSelectedId} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  deleting={deletingId === p.id}
                  onClick={() => setSelectedId(p.id)}
                  onDelete={() => handleDeleteProject(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetProjectForm();
        }}
        title="Add project"
        subtitle="From daily client or create new"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="inline-flex w-full rounded-lg border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => setCreateMode("from_client")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                createMode === "from_client" ? "bg-surface text-accent shadow-sm" : "text-muted"
              }`}
            >
              From daily client
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("new")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                createMode === "new" ? "bg-surface text-accent shadow-sm" : "text-muted"
              }`}
            >
              New project
            </button>
          </div>

          {createMode === "from_client" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Select client from pipeline (not linked yet)
              </label>
              {linkableClients.length === 0 ? (
                <p className="text-sm text-muted">No unlinked clients — add one in Client updates first.</p>
              ) : (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="input-field text-sm"
                  required
                >
                  <option value="">Choose client…</option>
                  {linkableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.stage.replace("_", " ")})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="input-field"
              required
            />
          )}

          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="input-field min-h-[80px]"
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Project deadline (optional)</label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Assign users — they will see this project</p>
            {assignableUsers.length === 0 ? (
              <p className="text-xs text-muted">No other users yet. Create users in Admin.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignableUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={assignedUserIds.includes(u.id)}
                      onChange={(e) =>
                        setAssignedUserIds((ids) =>
                          e.target.checked ? [...ids, u.id] : ids.filter((id) => id !== u.id)
                        )
                      }
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={submitting || (createMode === "from_client" && !selectedClientId)}
            >
              {submitting ? "Creating…" : "Create project"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                resetProjectForm();
              }}
              className="btn-ghost flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
