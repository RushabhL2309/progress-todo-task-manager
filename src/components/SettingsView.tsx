"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/lib/auth-types";
import {
  getProjectLayoutView,
  setProjectLayoutView,
  type ProjectLayoutView,
} from "@/lib/project-layout-prefs";
import { LayoutViewToggle } from "./LayoutViewToggle";

interface SettingsViewProps {
  user: SessionUser;
}

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter();
  const [projectLayout, setProjectLayout] = useState<ProjectLayoutView>("cards");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setProjectLayout(getProjectLayoutView());
    const onLayoutChange = (e: Event) => {
      const detail = (e as CustomEvent<ProjectLayoutView>).detail;
      if (detail) setProjectLayout(detail);
    };
    window.addEventListener("project-layout-change", onLayoutChange);
    return () => window.removeEventListener("project-layout-change", onLayoutChange);
  }, []);

  function handleLayoutDefault(view: ProjectLayoutView) {
    setProjectLayout(view);
    setProjectLayoutView(view);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to change password");
        return;
      }
      setPasswordMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Something went wrong");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Your account and display preferences</p>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Projects layout</h2>
        <p className="mt-1 text-xs text-muted">Default view on the Projects tab</p>
        <div className="mt-4">
          <LayoutViewToggle value={projectLayout} onChange={handleLayoutDefault} />
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border pb-3">
            <dt className="text-muted">Name</dt>
            <dd className="font-medium text-ink">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Login ID</dt>
            <dd className="font-medium text-ink">{user.email}</dd>
          </div>
        </dl>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-3 border-t border-border pt-5">
          <p className="text-xs font-medium text-muted">Change password</p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="input-field text-sm"
            autoComplete="current-password"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="input-field text-sm"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="input-field text-sm"
            autoComplete="new-password"
          />
          {passwordError && (
            <p className="text-xs text-red-600">{passwordError}</p>
          )}
          {passwordMsg && (
            <p className="text-xs text-accent">{passwordMsg}</p>
          )}
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={
              changingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {changingPassword ? "Updating…" : "Update password"}
          </button>
        </form>

        <button type="button" className="btn-ghost mt-5 w-full sm:w-auto" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
