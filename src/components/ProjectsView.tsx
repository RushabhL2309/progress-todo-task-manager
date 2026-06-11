"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ProjectDTO, ProjectDetailDTO, ProjectItemType } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailView } from "./ProjectDetailView";

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
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [search, setSearch] = useState("");

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

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    });
    if (!res.ok) return;
    const project = (await res.json()) as ProjectDTO;
    setProjects((p) => [project, ...p]);
    setNewName("");
    setNewDesc("");
    setShowNew(false);
    setSelectedId(project.id);
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

  if (selectedId && detail) {
    return (
      <ProjectDetailView
        detail={detail}
        loading={detailLoading}
        onBack={() => setSelectedId(null)}
        onAddItem={handleAddItem}
        onCompleteWork={handleCompleteWork}
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
          <p className="mt-1 text-sm text-muted">Your codebases — open a project for dashboard & issues</p>
        </div>
        <button type="button" onClick={() => setShowNew((v) => !v)} className="btn-primary shrink-0">
          + Add New
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
        <form onSubmit={handleCreateProject} className="card space-y-3 p-4 sm:p-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="input-field"
            required
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description"
            rows={2}
            className="input-field min-h-[72px]"
          />
          <button type="submit" className="btn-primary">Create project</button>
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
