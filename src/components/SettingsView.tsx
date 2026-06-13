"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  getDemoModeEnabled,
  setDemoModeEnabled,
} from "@/lib/api-client";
import type { SessionUser } from "@/lib/auth-types";
import {
  getProjectLayoutView,
  setProjectLayoutView,
  type ProjectLayoutView,
} from "@/lib/project-layout-prefs";
import { LayoutViewToggle } from "./LayoutViewToggle";
import { SettingsIcon } from "./SettingsIcon";

interface HealthResponse {
  demo: boolean;
  database: { configured: boolean; status: string };
  error?: string;
}

interface SettingsViewProps {
  user: SessionUser;
  onDemoChange?: () => void;
}

export function SettingsView({ user, onDemoChange }: SettingsViewProps) {
  const router = useRouter();
  const isMaster = user.role === "master";

  const [projectLayout, setProjectLayout] = useState<ProjectLayoutView>("cards");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState(user.notificationEmail ?? "");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const canSetEmail = user.emailUpdatesEnabled;
  const canChangePassword = user.passwordChangeEnabled;

  const [demoEnabled, setDemoEnabled] = useState(true);
  const [dbStatus, setDbStatus] = useState("checking");
  const [dbError, setDbError] = useState<string | null>(null);
  const [hasMongoUri, setHasMongoUri] = useState(false);

  const checkHealth = useCallback(async (useDemo: boolean) => {
    setDbStatus("checking");
    setDbError(null);
    try {
      const headers = new Headers();
      headers.set("x-demo-mode", useDemo ? "true" : "false");
      const res = await fetch("/api/health", { headers });
      const data = (await res.json()) as HealthResponse;

      if (useDemo) {
        setDbStatus(data.database.configured ? "ready" : "not_configured");
      } else if (data.database.status === "connected") {
        setDbStatus("connected");
      } else {
        setDbStatus(data.database.status);
        setDbError(data.error ?? "Could not connect to MongoDB");
      }
    } catch {
      setDbStatus("error");
      setDbError("Health check failed");
    }
  }, []);

  useEffect(() => {
    setProjectLayout(getProjectLayoutView());
    const onLayoutChange = (e: Event) => {
      const detail = (e as CustomEvent<ProjectLayoutView>).detail;
      if (detail) setProjectLayout(detail);
    };
    window.addEventListener("project-layout-change", onLayoutChange);
    return () => window.removeEventListener("project-layout-change", onLayoutChange);
  }, []);

  useEffect(() => {
    setNotificationEmail(user.notificationEmail ?? "");
  }, [user.notificationEmail, user.emailUpdatesEnabled]);

  useEffect(() => {
    if (!isMaster) return;
    const enabled = getDemoModeEnabled();
    setDemoEnabled(enabled);
    apiFetch("/api/config")
      .then((r) => r.json())
      .then((d: { hasMongoUri?: boolean }) => setHasMongoUri(Boolean(d.hasMongoUri)))
      .catch(() => {});
    checkHealth(enabled);
  }, [isMaster, checkHealth]);

  function handleLayoutDefault(view: ProjectLayoutView) {
    setProjectLayout(view);
    setProjectLayoutView(view);
  }

  function handleTurnOffDemo() {
    setDemoModeEnabled(false);
    setDemoEnabled(false);
    onDemoChange?.();
    checkHealth(false);
  }

  function handleTurnOnDemo() {
    setDemoModeEnabled(true);
    setDemoEnabled(true);
    onDemoChange?.();
    checkHealth(true);
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

  async function handleSaveNotificationEmail(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailError(null);
    setSavingEmail(true);
    try {
      const res = await apiFetch("/api/auth/notification-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to save email");
        return;
      }
      setEmailMsg("Email saved — will be used for updates when email is enabled");
    } catch {
      setEmailError("Something went wrong");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">Settings</h1>
            <p className="mt-1 text-sm text-muted">
              {isMaster
                ? "Your preferences and system options"
                : "Your account and display preferences"}
            </p>
          </div>
        </div>
        {isMaster && (
          <span className="w-fit rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
            Master admin
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Projects layout</h2>
          <p className="mt-1 text-xs text-muted">Default view on the Projects tab</p>
          <div className="mt-4">
            <LayoutViewToggle value={projectLayout} onChange={handleLayoutDefault} />
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Account</h2>
          <dl className="mt-4 text-sm">
            <div className="rounded-lg border border-border bg-canvas/50 px-3 py-2.5">
              <dt className="text-xs text-muted">Login name</dt>
              <dd className="mt-0.5 font-medium text-ink">{user.name}</dd>
            </div>
          </dl>

          {canSetEmail ? (
            <form
              onSubmit={handleSaveNotificationEmail}
              className="mt-5 space-y-3 border-t border-border pt-5"
            >
              <div>
                <p className="text-xs font-medium text-muted">Email for updates</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Optional — for future email notifications from the app
                </p>
              </div>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field text-sm"
                autoComplete="email"
              />
              {emailError && <p className="text-xs text-red-600">{emailError}</p>}
              {emailMsg && <p className="text-xs text-accent">{emailMsg}</p>}
              <button
                type="submit"
                className="btn-primary"
                disabled={savingEmail}
              >
                {savingEmail ? "Saving…" : "Save email"}
              </button>
            </form>
          ) : (
            <p className="mt-5 border-t border-border pt-5 text-xs text-muted">
              Email updates are not enabled for your account. Ask your admin if you need this.
            </p>
          )}

          {canChangePassword ? (
            <form
              onSubmit={handleChangePassword}
              className="mt-5 space-y-3 border-t border-border pt-5"
            >
              <p className="text-xs font-medium text-muted">Change password</p>
              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
              {passwordMsg && <p className="text-xs text-accent">{passwordMsg}</p>}
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  changingPassword || !currentPassword || !newPassword || !confirmPassword
                }
              >
                {changingPassword ? "Updating…" : "Update password"}
              </button>
            </form>
          ) : (
            <p className="mt-5 border-t border-border pt-5 text-xs text-muted">
              Password change is not enabled for your account. Ask your admin if you need this.
            </p>
          )}

          <div className="mt-5 border-t border-border pt-5">
            <button type="button" className="btn-ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {isMaster && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            System (master only)
          </h2>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="card p-4 sm:p-5 lg:col-span-1">
              <h3 className="text-sm font-semibold text-ink">Demo data</h3>
              <p className="mt-1 text-xs text-muted">
                Sample tasks for exploring the app. Off = real MongoDB data.
              </p>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-canvas/60 px-4 py-3">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    demoEnabled ? "bg-extra" : "bg-accent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {demoEnabled ? "Demo data is ON" : "Live database is ON"}
                  </p>
                  <p className="text-xs text-muted">
                    {demoEnabled
                      ? "Changes reset on refresh"
                      : "Reading and saving to MongoDB"}
                  </p>
                </div>
              </div>

              {demoEnabled ? (
                <button
                  type="button"
                  onClick={handleTurnOffDemo}
                  className="btn-primary mt-4 w-full"
                  disabled={!hasMongoUri}
                >
                  Use real database
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTurnOnDemo}
                  className="mt-4 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
                >
                  Turn demo back on
                </button>
              )}

              {!hasMongoUri && demoEnabled && (
                <p className="mt-3 text-xs text-red-600">
                  Add MONGODB_URI before turning off demo.
                </p>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink">Database</h3>
              <p className="mt-1 text-xs text-muted">Auto-created on first use</p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted">MongoDB URI</dt>
                  <dd className="font-medium text-ink">{hasMongoUri ? "Configured" : "Not set"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted">Connection</dt>
                  <dd className="font-medium capitalize text-ink">{dbStatus.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-muted">Collections</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-ink">
                    scheduledtasks, completions, extratasks, projects, users, chat…
                  </dd>
                </div>
              </dl>

              {dbError && !demoEnabled && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{dbError}</p>
              )}

              {!demoEnabled && dbStatus === "connected" && (
                <p className="mt-3 text-xs text-accent">Schema and indexes are ready.</p>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink">Vercel deployment</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li className="rounded-lg bg-canvas/60 px-3 py-2">
                  Set <code className="rounded bg-canvas px-1">MONGODB_URI</code> in Vercel env
                  vars
                </li>
                <li className="rounded-lg bg-canvas/60 px-3 py-2">
                  Atlas: allow <code className="rounded bg-canvas px-1">0.0.0.0/0</code> for
                  serverless
                </li>
                <li className="rounded-lg bg-canvas/60 px-3 py-2">
                  URI needs db name: <code className="rounded bg-canvas px-1">/daily-scheduler</code>
                </li>
                <li className="rounded-lg bg-canvas/60 px-3 py-2">
                  Cloudinary vars optional until uploads
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
