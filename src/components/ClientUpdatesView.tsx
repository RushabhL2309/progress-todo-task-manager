"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ClientProjectDTO, ClientStage, UserDTO } from "@/lib/auth-types";
import { ClientDetailDrawer } from "./ClientDetailDrawer";

const STAGES: { id: ClientStage; label: string; color: string }[] = [
  { id: "enquiry", label: "Enquiry", color: "border-extra/30 bg-extra-light/50" },
  { id: "running", label: "Running", color: "border-accent/30 bg-accent-light/50" },
  { id: "payment_due", label: "Payment due", color: "border-blue-200 bg-blue-50/50" },
  { id: "closed", label: "Closed", color: "border-border bg-canvas/80" },
];

function AssigneePicker({
  users,
  selected,
  onChange,
}: {
  users: UserDTO[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (users.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {users.map((u) => (
        <label key={u.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-2 py-1 text-xs">
          <input
            type="checkbox"
            checked={selected.includes(u.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...selected, u.id] : selected.filter((id) => id !== u.id))
            }
          />
          {u.name}
        </label>
      ))}
    </div>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5H13M6 4.5V3.25C6 2.56 6.56 2 7.25 2H8.75C9.44 2 10 2.56 10 3.25V4.5M6.25 7V11.25M9.75 7V11.25M4.5 4.5L5 13.25C5 13.94 5.56 14.5 6.25 14.5H9.75C10.44 14.5 11 13.94 11 13.25L11.5 4.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClientUpdatesView() {
  const [clients, setClients] = useState<ClientProjectDTO[]>([]);
  const [assignable, setAssignable] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newStage, setNewStage] = useState<ClientStage>("enquiry");
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<ClientStage>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleStageCollapse(stageId: ClientStage) {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  const load = useCallback(async () => {
    const [cRes, uRes] = await Promise.all([
      apiFetch("/api/clients"),
      apiFetch("/api/admin/users/assignable"),
    ]);
    if (cRes.ok) setClients(await cRes.json());
    if (uRes.ok) setAssignable(await uRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        stage: newStage,
        assignedUserIds: newAssignees,
      }),
    });
    setNewName("");
    setNewAssignees([]);
    await load();
  }

  async function handleDeleteClient(client: ClientProjectDTO) {
    if (!confirm(`Delete daily client "${client.name}"? This cannot be undone.`)) return;
    setDeletingId(client.id);
    try {
      const res = await apiFetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedId === client.id) setSelectedId(null);
        await load();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Daily client update</h1>
        <p className="mt-1 text-sm text-muted">Enquiry → Running → Payment due → Closed — click a card to open details</p>
      </div>

      <form onSubmit={handleAdd} className="card space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            type="text"
            placeholder="Client or project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input-field flex-1 text-sm"
          />
          <select
            value={newStage}
            onChange={(e) => setNewStage(e.target.value as ClientStage)}
            className="input-field !w-auto text-sm"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                Add to {s.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary shrink-0">
            Add
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">Assign team (optional)</p>
          <AssigneePicker users={assignable} selected={newAssignees} onChange={setNewAssignees} />
        </div>
      </form>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-border/30" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => {
            const items = clients.filter((c) => c.stage === stage.id);
            const collapsed = collapsedStages.has(stage.id);
            return (
              <div key={stage.id} className={`rounded-xl border p-3 ${stage.color}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink">
                    {stage.label} ({items.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleStageCollapse(stage.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface/80 text-muted transition-colors hover:text-ink md:hidden"
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? `Show ${stage.label} clients` : `Hide ${stage.label} clients`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden
                      className={`transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
                    >
                      <path
                        d="M3.5 5.25L7 8.75L10.5 5.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <ul
                  className={`mt-3 space-y-2 ${collapsed ? "hidden md:block" : ""}`}
                >
                  {items.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className="min-w-0 flex-1 text-left transition-shadow hover:opacity-90"
                        >
                          <p className="font-medium text-ink">{c.name}</p>
                          {c.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">{c.notes}</p>
                          )}
                          {c.followUpDate && (stage.id === "enquiry" || stage.id === "running") && (
                            <p className="mt-1 text-[10px] text-accent">Follow-up: {c.followUpDate}</p>
                          )}
                          {c.assignedUserIds.length > 0 && (
                            <p className="mt-1 text-[10px] text-muted">
                              {c.assignedUserIds
                                .map((id) => assignable.find((u) => u.id === id)?.name ?? "User")
                                .join(", ")}
                            </p>
                          )}
                          <p className="mt-2 text-[10px] font-medium text-muted">Tap for details & reminders →</p>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => void handleDeleteClient(c)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:h-8 sm:w-8"
                          aria-label={`Delete ${c.name}`}
                          title="Delete client"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <ClientDetailDrawer
        clientId={selectedId}
        assignable={assignable}
        onClose={() => setSelectedId(null)}
        onUpdated={load}
      />
    </div>
  );
}
