"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { UserDTO, UserModules, ChatGroupDTO } from "@/lib/auth-types";
import { ALL_MODULES } from "@/lib/auth-types";

const MODULE_LABELS: Record<keyof UserModules, string> = {
  todo: "Daily To-Do",
  tracker: "Progress tracker",
  projects: "Project management",
  client_updates: "Daily client update",
  chat: "Internal chat",
};

const EMPTY_MODULES: UserModules = {
  todo: false,
  tracker: false,
  projects: false,
  client_updates: false,
  chat: false,
};

function UserEditForm({
  user,
  onSave,
  onDeactivate,
  onReactivate,
  onCancel,
  saving,
}: {
  user: UserDTO;
  onSave: (data: {
    name: string;
    password: string;
    modules: UserModules;
    emailUpdatesEnabled: boolean;
    passwordChangeEnabled: boolean;
  }) => Promise<void>;
  onDeactivate: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [modules, setModules] = useState<UserModules>({ ...user.modules });
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(user.emailUpdatesEnabled);
  const [passwordChangeEnabled, setPasswordChangeEnabled] = useState(user.passwordChangeEnabled);

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-field text-sm"
        placeholder="Name"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-field text-sm"
        placeholder="New password (leave blank to keep)"
      />
      <div className="flex flex-wrap gap-2">
        {ALL_MODULES.map((mod) => (
          <label
            key={mod}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${
              modules[mod] ? "border-accent/40 bg-accent-light text-accent" : "border-border text-muted"
            }`}
          >
            <input
              type="checkbox"
              checked={modules[mod]}
              onChange={() => setModules((m) => ({ ...m, [mod]: !m[mod] }))}
            />
            {MODULE_LABELS[mod]}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={emailUpdatesEnabled}
          onChange={(e) => setEmailUpdatesEnabled(e.target.checked)}
        />
        Allow email option in Settings (for future email updates)
      </label>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={passwordChangeEnabled}
          onChange={(e) => setPasswordChangeEnabled(e.target.checked)}
        />
        Allow password change in Settings
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({ name, password, modules, emailUpdatesEnabled, passwordChangeEnabled })
          }
          className="btn-primary text-xs"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-xs" disabled={saving}>
          Cancel
        </button>
        {user.isActive ? (
          <button
            type="button"
            disabled={saving}
            onClick={onDeactivate}
            className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Deactivate user
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={onReactivate}
            className="btn-ghost text-xs text-accent"
          >
            Reactivate user
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminView() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailUpdatesOnCreate, setEmailUpdatesOnCreate] = useState(false);
  const [passwordChangeOnCreate, setPasswordChangeOnCreate] = useState(false);
  const [modules, setModules] = useState<UserModules>({
    ...EMPTY_MODULES,
    tracker: true,
  });
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroupDTO[]>([]);

  const load = useCallback(async () => {
    const [uRes, gRes] = await Promise.all([
      apiFetch("/api/admin/users"),
      apiFetch("/api/chat/groups"),
    ]);
    if (uRes.ok) setUsers(await uRes.json());
    if (gRes.ok) setChatGroups(await gRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setMessage(null);
    const res = await apiFetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage((data as { error?: string }).error ?? "Update failed");
    } else {
      const updated = (await res.json()) as UserDTO;
      setUsers((list) => list.map((u) => (u.id === id ? updated : u)));
      setMessage("Saved — user sees changes within ~15 seconds (or on tab focus).");
      setEditingId(null);
    }
    setSavingId(null);
    await load();
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        password,
        modules,
        emailUpdatesEnabled: emailUpdatesOnCreate,
        passwordChangeEnabled: passwordChangeOnCreate,
      }),
    });
    if (res.ok) {
      setPassword("");
      setName("");
      setEmailUpdatesOnCreate(false);
      setPasswordChangeOnCreate(false);
      setModules({ ...EMPTY_MODULES, tracker: true });
      setMessage("User created.");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage((data as { error?: string }).error ?? "Create failed");
    }
  }

  async function toggleEmailUpdates(user: UserDTO) {
    const next = !user.emailUpdatesEnabled;
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, emailUpdatesEnabled: next } : u))
    );
    await patchUser(user.id, { emailUpdatesEnabled: next });
  }

  async function togglePasswordChange(user: UserDTO) {
    const next = !user.passwordChangeEnabled;
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, passwordChangeEnabled: next } : u))
    );
    await patchUser(user.id, { passwordChangeEnabled: next });
  }

  async function toggleUserModule(user: UserDTO, mod: keyof UserModules) {
    const next = { ...user.modules, [mod]: !user.modules[mod] };
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, modules: next } : u))
    );
    await patchUser(user.id, { modules: next });
  }

  async function deactivateUser(id: string) {
    if (!confirm("Deactivate this user? They will be signed out on next refresh.")) return;
    setSavingId(id);
    const res = await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("User deactivated.");
      setEditingId(null);
      await load();
    }
    setSavingId(null);
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    await apiFetch("/api/chat/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName, memberIds: groupMembers }),
    });
    setGroupName("");
    setGroupMembers([]);
    setMessage("Chat group created.");
    const gRes = await apiFetch("/api/chat/groups");
    if (gRes.ok) setChatGroups(await gRes.json());
  }

  async function deleteChatGroup(id: string, name: string) {
    if (!confirm(`Delete chat group "${name}" and all its messages?`)) return;
    const res = await apiFetch(`/api/chat/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      setChatGroups((list) => list.filter((g) => g.id !== id));
      setMessage("Chat group deleted.");
    } else {
      setMessage("Failed to delete chat group.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Create, edit, deactivate users · module changes apply live on their account
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-accent/20 bg-accent-light px-4 py-2.5 text-sm text-accent">
          {message}
        </div>
      )}

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Create user</h2>
        <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name (used to sign in)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-sm"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={emailUpdatesOnCreate}
              onChange={(e) => setEmailUpdatesOnCreate(e.target.checked)}
            />
            Allow email option in Settings
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={passwordChangeOnCreate}
              onChange={(e) => setPasswordChangeOnCreate(e.target.checked)}
            />
            Allow password change in Settings
          </label>
          <div className="flex flex-wrap gap-3">
            {ALL_MODULES.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={modules[mod]}
                  onChange={() => setModules((m) => ({ ...m, [mod]: !m[mod] }))}
                />
                {MODULE_LABELS[mod]}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary">
            Create user
          </button>
        </form>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Manage users</h2>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded bg-border/30" />
        ) : (
          <ul className="mt-4 space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className={`rounded-xl border p-3 ${!u.isActive ? "border-red-200 bg-red-50/30" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {u.name}{" "}
                      <span className="text-xs text-muted">
                        {u.role === "master" ? "· master" : ""}
                        {u.notificationEmail ? ` · ${u.notificationEmail}` : ""}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!u.isActive && <span className="text-xs font-medium text-red-600">Inactive</span>}
                    {u.role !== "master" && (
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                        className="btn-ghost !min-h-8 px-2 text-xs"
                      >
                        {editingId === u.id ? "Close" : "Edit"}
                      </button>
                    )}
                  </div>
                </div>
                {u.role !== "master" && editingId !== u.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ALL_MODULES.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        disabled={savingId === u.id || !u.isActive}
                        onClick={() => toggleUserModule(u, mod)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                          u.modules[mod]
                            ? "bg-accent-light text-accent"
                            : "bg-canvas text-muted"
                        } ${savingId === u.id ? "opacity-50" : ""}`}
                      >
                        {MODULE_LABELS[mod]}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={savingId === u.id || !u.isActive}
                      onClick={() => toggleEmailUpdates(u)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                        u.emailUpdatesEnabled
                          ? "bg-blue-50 text-blue-700"
                          : "bg-canvas text-muted"
                      } ${savingId === u.id ? "opacity-50" : ""}`}
                    >
                      Email in Settings
                    </button>
                    <button
                      type="button"
                      disabled={savingId === u.id || !u.isActive}
                      onClick={() => togglePasswordChange(u)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                        u.passwordChangeEnabled
                          ? "bg-amber-50 text-amber-800"
                          : "bg-canvas text-muted"
                      } ${savingId === u.id ? "opacity-50" : ""}`}
                    >
                      Change password
                    </button>
                  </div>
                )}
                {u.role !== "master" && editingId === u.id && (
                  <UserEditForm
                    user={u}
                    saving={savingId === u.id}
                    onCancel={() => setEditingId(null)}
                    onSave={async ({
                      name: n,
                      password: p,
                      modules: m,
                      emailUpdatesEnabled: eu,
                      passwordChangeEnabled: pc,
                    }) => {
                      const body: Record<string, unknown> = {
                        name: n,
                        modules: m,
                        emailUpdatesEnabled: eu,
                        passwordChangeEnabled: pc,
                      };
                      if (p.trim()) body.password = p.trim();
                      await patchUser(u.id, body);
                    }}
                    onDeactivate={() => deactivateUser(u.id)}
                    onReactivate={() => patchUser(u.id, { isActive: true })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Create chat group</h2>
        <form onSubmit={handleCreateGroup} className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="input-field text-sm"
            required
          />
          <div className="flex flex-wrap gap-2">
            {users
              .filter((u) => u.role === "user" && u.isActive)
              .map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={groupMembers.includes(u.id)}
                    onChange={(e) =>
                      setGroupMembers((ids) =>
                        e.target.checked ? [...ids, u.id] : ids.filter((x) => x !== u.id)
                      )
                    }
                  />
                  {u.name}
                </label>
              ))}
          </div>
          <button type="submit" className="btn-primary">
            Create group
          </button>
        </form>

        {chatGroups.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Existing groups</h3>
            <ul className="mt-3 space-y-2">
              {chatGroups.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{g.name}</p>
                    <p className="text-[10px] text-muted">
                      {g.memberNames.length > 0 ? g.memberNames.join(", ") : "No members"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteChatGroup(g.id, g.name)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
