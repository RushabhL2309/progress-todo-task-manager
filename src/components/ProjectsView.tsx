"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ClientProjectDTO, UserDTO } from "@/lib/auth-types";
import type { ProjectDTO, ProjectDetailDTO, ProjectItemType } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailView } from "./ProjectDetailView";

type CreateMode = "new" | "from_client";

interface ProjectsViewProps {
  onWorkLogged?: () => void;
}

export function ProjectsView({ onWorkLogged }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [detail, setDetail] = useState<ProjectDetailDTO | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
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
    const d = await loadDetail(selectedId);
    setDetail(d);
    const list = await loadList();
    setProjects(list);
  }, [selectedId, loadDetail, loadList]);

  useEffect(() => {
    setListLoading(true);
    loadList()
      .then(setProjects)
      .finally(() => setListLoading(false));
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    loadDetail(selectedId)
      .then(setDetail)
      .finally(() => setDetailLoading(false));
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!showNew) return;
    Promise.all([
      apiFetch("/api/clients/linkable"),
      apiFetch("/api/admin/users/assignable"),
    ]).then(async ([cRes, uRes]) => {
      if (cRes.ok) setLinkableClients(await cRes.json());
      if (uRes.ok) setAssignableUsers(await uRes.json());
    });
  }, [showNew]);

  useEffect(() => {
    if (createMode !== "from_client" || !selectedClientId) return;
    const client = linkableClients.find((c) => c.id === selectedClientId);
    if (client) {
      setNewName(client.name);
      setNewDesc(client.notes || "");
      setAssignedUserIds(client.assignedUserIds);
    }
  }, [createMode, selectedClientId, linkableClients]);

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
      setProjects((p) => [project, ...p]);
      setNewName("");
      setNewDesc("");
      setNewDeadline("");
      setAssignedUserIds([]);
      setSelectedClientId("");
      setShowNew(false);
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

  if (selectedId && detail) {
    return (
      <ProjectDetailView
        detail={detail}
        loading={detailLoading}
        onBack={() => setSelectedId(null)}
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
          <p className="mt-1 text-sm text-muted">From daily client or new — assign users to share access</p>
        </div>
        <button type="button" onClick={() => setShowNew((v) => !v)} className="btn-primary shrink-0">
          + Add project
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects…"
        className="input-field max-w-md text-sm"
      />

      {showNew && (
        <form onSubmit={handleCreateProject} className="card space-y-4 p-4 sm:p-5">
          <div className="inline-flex rounded-lg border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => setCreateMode("from_client")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                createMode === "from_client" ? "bg-surface text-accent shadow-sm" : "text-muted"
              }`}
            >
              From daily client
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("new")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
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
            rows={2}
            className="input-field min-h-[72px]"
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Project deadline (optional)</label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="input-field !w-auto text-sm"
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

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || (createMode === "from_client" && !selectedClientId)}
          >
            {submitting ? "Creating…" : "Create project"}
          </button>
        </form>
      )}

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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => setSelectedId(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
