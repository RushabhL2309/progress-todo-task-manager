"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type {
  ClientPaymentCheck,
  ClientProjectDTO,
  ClientProjectEventDTO,
  ClientReminderDTO,
  ClientStage,
  UserDTO,
} from "@/lib/auth-types";
import { Drawer } from "./Drawer";

const STAGE_LABELS: Record<ClientStage, string> = {
  enquiry: "Enquiry",
  running: "Running",
  payment_due: "Payment due",
  closed: "Closed",
};

const STAGE_NEXT: Partial<Record<ClientStage, { stage: ClientStage; label: string }>> = {
  enquiry: { stage: "running", label: "Shift to Running" },
  running: { stage: "payment_due", label: "Shift to Payment Due" },
  payment_due: { stage: "closed", label: "Close — payment received" },
};

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
  checks,
  notes,
  onSave,
}: {
  checks: ClientPaymentCheck[];
  notes: string;
  onSave: (checks: ClientPaymentCheck[], notes: string) => Promise<void>;
}) {
  const [localChecks, setLocalChecks] = useState(checks);
  const [localNotes, setLocalNotes] = useState(notes);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setLocalChecks(checks);
    setLocalNotes(notes);
  }, [checks, notes]);

  function addCheck() {
    const label = newLabel.trim();
    if (!label || localChecks.some((c) => c.label.toLowerCase() === label.toLowerCase())) return;
    const next = [...localChecks, { label, checked: false }];
    setLocalChecks(next);
    setNewLabel("");
    void onSave(next, localNotes);
  }

  function toggleCheck(index: number) {
    const next = localChecks.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c));
    setLocalChecks(next);
    void onSave(next, localNotes);
  }

  function removeCheck(index: number) {
    const next = localChecks.filter((_, i) => i !== index);
    setLocalChecks(next);
    void onSave(next, localNotes);
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Payment checklist</p>
      {localChecks.length === 0 ? (
        <p className="text-xs text-muted">No items yet — add your own below.</p>
      ) : (
        <ul className="space-y-1.5">
          {localChecks.map((c, i) => (
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
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        onBlur={() => void onSave(localChecks, localNotes)}
        placeholder="Extra payment notes…"
        rows={2}
        className="input-field min-h-[48px] text-xs"
      />
    </div>
  );
}

interface ClientDetailDrawerProps {
  clientId: string | null;
  assignable: UserDTO[];
  isMaster?: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ClientDetailDrawer({
  clientId,
  assignable,
  isMaster = false,
  onClose,
  onUpdated,
}: ClientDetailDrawerProps) {
  const [client, setClient] = useState<ClientProjectDTO | null>(null);
  const [events, setEvents] = useState<ClientProjectEventDTO[]>([]);
  const [reminders, setReminders] = useState<ClientReminderDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"details" | "activity">("details");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [shifting, setShifting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderAssignee, setReminderAssignee] = useState("");
  const [reminderSimple, setReminderSimple] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setEvents(data.events ?? []);
        setReminders(data.reminders ?? []);
        setNotes(data.client.notes ?? "");
        setFollowUpDate(data.client.followUpDate ?? "");
        setAssignees(data.client.assignedUserIds ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clientId) {
      setTab("details");
      load(clientId);
    } else {
      setClient(null);
      setEvents([]);
      setReminders([]);
    }
  }, [clientId, load]);

  async function patchClient(body: Record<string, unknown>) {
    if (!client) return;
    const res = await apiFetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = (await res.json()) as ClientProjectDTO;
      setClient(updated);
      onUpdated();
      await load(client.id);
    }
  }

  async function saveNotes() {
    if (!client || notes === client.notes) return;
    setSavingNotes(true);
    try {
      await patchClient({ notes });
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveFollowUp() {
    if (!client) return;
    const v = followUpDate || null;
    if (v === (client.followUpDate ?? null)) return;
    await patchClient({ followUpDate: v });
  }

  async function saveAssignees(ids: string[]) {
    setAssignees(ids);
    await patchClient({ assignedUserIds: ids });
  }

  async function shiftStage() {
    if (!client) return;
    const next = STAGE_NEXT[client.stage];
    if (!next) return;
    setShifting(true);
    try {
      await patchClient({ stage: next.stage });
    } finally {
      setShifting(false);
    }
  }

  async function savePayment(checks: ClientPaymentCheck[], paymentNotes: string) {
    await patchClient({ paymentChecks: checks, paymentNotes });
  }

  async function handleAddReminder(e: FormEvent) {
    e.preventDefault();
    if (!client || !reminderTitle.trim()) return;
    setAddingReminder(true);
    try {
      const res = await apiFetch(`/api/clients/${client.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminderTitle.trim(),
          dueDate: reminderDate || null,
          dueTime: reminderTime || null,
          assignedUserId: reminderAssignee || null,
          simple: reminderSimple,
        }),
      });
      if (res.ok) {
        setReminderTitle("");
        setReminderDate("");
        setReminderTime("");
        setReminderAssignee("");
        setReminderSimple(false);
        await load(client.id);
        onUpdated();
      }
    } finally {
      setAddingReminder(false);
    }
  }

  const nextStage = client ? STAGE_NEXT[client.stage] : null;

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Delete daily client "${client.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Drawer
      open={Boolean(clientId)}
      onClose={onClose}
      title={client?.name ?? "Client"}
      subtitle={client ? STAGE_LABELS[client.stage] : undefined}
    >
      {loading && !client ? (
        <div className="h-32 animate-pulse rounded-lg bg-border/30" />
      ) : client ? (
        <div className="space-y-5">
          <div className="flex gap-1 rounded-lg border border-border bg-canvas p-1">
            {(["details", "activity"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t === "details" ? "Details & reminders" : "Activity"}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <div className="space-y-5">
              {client.linkedProjectId && (
                <p className="text-xs font-medium text-accent">Linked in Projects tab</p>
              )}

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => void saveNotes()}
                  placeholder="Client notes…"
                  rows={3}
                  className="input-field mt-1 min-h-[72px] text-sm"
                />
                {savingNotes && <p className="mt-1 text-[10px] text-muted">Saving…</p>}
              </div>

              {(client.stage === "enquiry" || client.stage === "running") && (
                <>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Team assignees
                    </label>
                    <div className="mt-2">
                      <AssigneePicker users={assignable} selected={assignees} onChange={saveAssignees} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Next connect / follow-up
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      onBlur={() => void saveFollowUp()}
                      className="input-field mt-1 !min-h-9 w-full text-sm"
                    />
                  </div>
                </>
              )}

              {client.stage === "payment_due" && (
                <PaymentChecksEditor
                  checks={client.paymentChecks}
                  notes={client.paymentNotes}
                  onSave={savePayment}
                />
              )}

              <form onSubmit={handleAddReminder} className="space-y-3 rounded-xl border border-border bg-canvas/50 p-4">
                <p className="text-sm font-semibold text-ink">Add reminder</p>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Task name or description"
                  className="input-field !min-h-9 w-full text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted">Date (optional)</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="input-field mt-0.5 !min-h-9 w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Time (optional)</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="input-field mt-0.5 !min-h-9 w-full text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted">Assign to (optional)</label>
                  <select
                    value={reminderAssignee}
                    onChange={(e) => setReminderAssignee(e.target.value)}
                    className="input-field mt-0.5 !min-h-9 w-full text-xs"
                  >
                    <option value="">Anyone / unassigned</option>
                    {assignable.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={reminderSimple}
                    onChange={(e) => setReminderSimple(e.target.checked)}
                  />
                  Simple reminder — shows as a quick alert (no assignee needed)
                </label>
                <button type="submit" disabled={addingReminder} className="btn-primary w-full !min-h-10 text-sm">
                  {addingReminder ? "Adding…" : "Add reminder"}
                </button>
              </form>

              {reminders.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Reminders</p>
                  <ul className="mt-2 space-y-2">
                    {reminders.map((r) => (
                      <li key={r.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                        <p className="font-medium text-ink">{r.title}</p>
                        <p className="mt-0.5 text-muted">
                          {r.dueDate
                            ? `Due ${format(parseISO(r.dueDate), "d MMM yyyy")}${r.dueTime ? ` ${r.dueTime}` : ""}`
                            : "No date — simple alert"}
                          {r.assignedUserName ? ` · ${r.assignedUserName}` : ""}
                          {r.simple ? " · Simple" : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {nextStage && (
                <button
                  type="button"
                  disabled={shifting}
                  onClick={() => void shiftStage()}
                  className="btn-primary w-full !min-h-10 text-sm"
                >
                  {shifting ? "Shifting…" : nextStage.label}
                </button>
              )}

              {isMaster && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="w-full rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete client"}
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted">
                Every move, payment update, reminder, and assignee change
              </p>
              <ul className="mt-3 space-y-3">
                {events.length === 0 ? (
                  <li className="text-xs text-muted">No activity yet.</li>
                ) : (
                  events.map((ev) => (
                    <li key={ev.id} className="border-b border-border pb-3 text-xs last:border-0">
                      <span className="font-medium text-ink">{ev.userName}</span>
                      <span className="text-muted">
                        {" "}
                        · {format(parseISO(ev.createdAt), "d MMM yyyy HH:mm")}
                      </span>
                      <p className="mt-0.5 text-muted">{ev.description}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
