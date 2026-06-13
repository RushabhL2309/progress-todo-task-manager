"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type {
  ClientPaymentCheck,
  ClientProjectDTO,
  ClientProjectEventDTO,
  ClientStage,
  UserDTO,
} from "@/lib/auth-types";

const STAGES: { id: ClientStage; label: string; color: string; next?: ClientStage; nextLabel?: string }[] = [
  { id: "enquiry", label: "Enquiry", color: "border-extra/30 bg-extra-light/50", next: "running", nextLabel: "Shift to Running" },
  { id: "running", label: "Running", color: "border-accent/30 bg-accent-light/50", next: "payment_due", nextLabel: "Shift to Payment Due" },
  { id: "payment_due", label: "Payment due", color: "border-blue-200 bg-blue-50/50", next: "closed", nextLabel: "Close — payment received" },
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

function PaymentChecksEditor({
  client,
  onSave,
}: {
  client: ClientProjectDTO;
  onSave: (checks: ClientPaymentCheck[], notes: string) => Promise<void>;
}) {
  const [checks, setChecks] = useState(client.paymentChecks);
  const [notes, setNotes] = useState(client.paymentNotes);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setChecks(client.paymentChecks);
    setNotes(client.paymentNotes);
  }, [client.id, client.paymentChecks, client.paymentNotes]);

  function addCheck() {
    const label = newLabel.trim();
    if (!label || checks.some((c) => c.label.toLowerCase() === label.toLowerCase())) return;
    const next = [...checks, { label, checked: false }];
    setChecks(next);
    setNewLabel("");
    void onSave(next, notes);
  }

  function toggleCheck(index: number) {
    const next = checks.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c));
    setChecks(next);
    void onSave(next, notes);
  }

  function removeCheck(index: number) {
    const next = checks.filter((_, i) => i !== index);
    setChecks(next);
    void onSave(next, notes);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Payment checklist</p>
      {checks.length === 0 ? (
        <p className="text-xs text-muted">No items yet — add your own below.</p>
      ) : (
        <ul className="space-y-1.5">
          {checks.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.checked}
                onChange={() => toggleCheck(i)}
                className="rounded border-border"
              />
              <span className={`flex-1 text-xs ${c.checked ? "text-muted line-through" : "text-ink"}`}>
                {c.label}
              </span>
              <button
                type="button"
                onClick={() => removeCheck(i)}
                className="text-[10px] text-muted hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Advance received, 50% paid…"
          className="input-field !min-h-9 flex-1 text-xs"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCheck())}
        />
        <button type="button" onClick={addCheck} className="btn-ghost shrink-0 !min-h-9 text-xs">
          Add
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void onSave(checks, notes)}
        placeholder="Extra payment notes…"
        rows={2}
        className="input-field min-h-[48px] text-xs"
      />
    </div>
  );
}

export function ClientUpdatesView() {
  const [clients, setClients] = useState<ClientProjectDTO[]>([]);
  const [assignable, setAssignable] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newStage, setNewStage] = useState<ClientStage>("enquiry");
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<ClientProjectEventDTO[]>([]);
  const [shifting, setShifting] = useState<string | null>(null);

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

  async function shiftClient(id: string, stage: ClientStage) {
    setShifting(id);
    try {
      await apiFetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await load();
    } finally {
      setShifting(null);
    }
  }

  async function savePayment(id: string, paymentChecks: ClientPaymentCheck[], paymentNotes: string) {
    await apiFetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentChecks, paymentNotes }),
    });
    await load();
  }

  async function saveFollowUp(id: string, followUpDate: string | null) {
    await apiFetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpDate }),
    });
    await load();
  }

  async function showHistory(id: string) {
    setHistoryId(id);
    const res = await apiFetch(`/api/clients/${id}`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.events ?? []);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Daily client update</h1>
        <p className="mt-1 text-sm text-muted">Enquiry → Running → Payment due → Closed</p>
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
            return (
              <div key={stage.id} className={`rounded-xl border p-3 ${stage.color}`}>
                <h2 className="text-sm font-semibold text-ink">
                  {stage.label} ({items.length})
                </h2>
                <ul className="mt-3 space-y-2">
                  {items.map((c) => (
                    <li key={c.id} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
                      <p className="font-medium text-ink">{c.name}</p>
                      {c.notes && <p className="mt-1 text-xs text-muted">{c.notes}</p>}
                      {c.linkedProjectId && (
                        <p className="mt-1 text-[10px] font-medium text-accent">Linked in Projects tab</p>
                      )}
                      {c.assignedUserIds.length > 0 && (
                        <p className="mt-1 text-[10px] text-muted">
                          Assigned:{" "}
                          {c.assignedUserIds
                            .map((id) => assignable.find((u) => u.id === id)?.name ?? "User")
                            .join(", ")}
                        </p>
                      )}
                      {(stage.id === "enquiry" || stage.id === "running") && (
                        <div className="mt-2">
                          <label className="text-[10px] font-medium text-muted">
                            Follow-up / connect again
                          </label>
                          <input
                            type="date"
                            defaultValue={c.followUpDate ?? ""}
                            key={`${c.id}-${c.followUpDate ?? ""}`}
                            onBlur={(e) => {
                              const v = e.target.value || null;
                              if (v !== (c.followUpDate ?? null)) void saveFollowUp(c.id, v);
                            }}
                            className="input-field mt-1 !min-h-8 w-full text-xs"
                          />
                        </div>
                      )}
                      {stage.id === "payment_due" && (
                        <PaymentChecksEditor client={c} onSave={(checks, notes) => savePayment(c.id, checks, notes)} />
                      )}
                      <div className="mt-3 flex flex-col gap-2">
                        {stage.next && stage.nextLabel && (
                          <button
                            type="button"
                            disabled={shifting === c.id}
                            onClick={() => shiftClient(c.id, stage.next!)}
                            className="btn-primary w-full !min-h-10 text-xs sm:text-sm"
                          >
                            {shifting === c.id ? "Shifting…" : stage.nextLabel}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => showHistory(c.id)}
                          className="btn-ghost w-full !min-h-9 text-xs"
                          title="See who did what and when for this client"
                        >
                          Activity log
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

      {historyId && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Activity log</h3>
              <p className="mt-0.5 text-xs text-muted">
                Every move, payment update, and assignee change with date &amp; time
              </p>
            </div>
            <button type="button" onClick={() => setHistoryId(null)} className="text-xs text-muted">
              Close
            </button>
          </div>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {history.map((ev) => (
              <li key={ev.id} className="border-b border-border pb-2 text-xs">
                <span className="font-medium text-ink">{ev.userName}</span>
                <span className="text-muted">
                  {" "}
                  · {format(parseISO(ev.createdAt), "d MMM yyyy HH:mm")}
                </span>
                <p className="mt-0.5 text-muted">{ev.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
