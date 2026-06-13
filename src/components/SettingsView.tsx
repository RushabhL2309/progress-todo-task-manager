"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getDemoModeEnabled, setDemoModeEnabled } from "@/lib/api-client";
import type { SessionUser } from "@/lib/auth-types";

interface HealthResponse {
  demo: boolean;
  database: { configured: boolean; status: string };
  error?: string;
}

interface SettingsViewProps {
  user: SessionUser;
  onDemoChange: () => void;
}

export function SettingsView({ user, onDemoChange }: SettingsViewProps) {
  const router = useRouter();
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [dbStatus, setDbStatus] = useState<string>("checking");
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
    const enabled = getDemoModeEnabled();
    setDemoEnabled(enabled);
    apiFetch("/api/config")
      .then((r) => r.json())
      .then((d: { hasMongoUri?: boolean }) => setHasMongoUri(Boolean(d.hasMongoUri)))
      .catch(() => {});
    checkHealth(enabled);
  }, [checkHealth]);

  function handleTurnOffDemo() {
    setDemoModeEnabled(false);
    setDemoEnabled(false);
    onDemoChange();
    checkHealth(false);
  }

  function handleTurnOnDemo() {
    setDemoModeEnabled(true);
    setDemoEnabled(true);
    onDemoChange();
    checkHealth(true);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Data source and deployment options</p>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Demo data</h2>
        <p className="mt-1 text-xs text-muted">
          Sample tasks for exploring the app. Off = your real MongoDB data.
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
                ? "Showing sample tasks — changes reset on refresh"
                : "Reading and saving to MongoDB"}
            </p>
          </div>
        </div>

        {demoEnabled ? (
          <button
            type="button"
            onClick={handleTurnOffDemo}
            className="btn-primary mt-4 w-full sm:w-auto"
            disabled={!hasMongoUri}
          >
            Turn off demo — use real database
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTurnOnDemo}
            className="mt-4 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas sm:w-auto"
          >
            Turn demo data back on
          </button>
        )}

        {!hasMongoUri && demoEnabled && (
          <p className="mt-3 text-xs text-red-600">
            Add MONGODB_URI to .env (local) or Vercel env vars before turning off demo.
          </p>
        )}
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Database</h2>
        <p className="mt-1 text-xs text-muted">MongoDB collections created automatically on first use</p>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted">MongoDB URI</dt>
            <dd className="font-medium text-ink">{hasMongoUri ? "Configured" : "Not set"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted">Connection</dt>
            <dd className="font-medium capitalize text-ink">{dbStatus.replace(/_/g, " ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Collections</dt>
            <dd className="text-right text-xs text-ink">
              scheduledtasks, completions, extratasks
            </dd>
          </div>
        </dl>

        {dbError && !demoEnabled && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{dbError}</p>
        )}

        {!demoEnabled && dbStatus === "connected" && (
          <p className="mt-3 text-xs text-accent">
            Schema and indexes are ready. Add tasks from the grid to populate your database.
          </p>
        )}
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{user.name}</span> ({user.email})
        </p>
        <button
          type="button"
          className="btn-ghost mt-4"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Vercel deployment</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-muted">
          <li>Set <code className="rounded bg-canvas px-1">MONGODB_URI</code> in Vercel → Settings → Environment Variables</li>
          <li>Use Atlas Network Access: allow <code className="rounded bg-canvas px-1">0.0.0.0/0</code> for serverless</li>
          <li>URI must include database name: <code className="rounded bg-canvas px-1">/daily-scheduler</code></li>
          <li>Cloudinary vars are optional until you add uploads</li>
        </ul>
      </div>
    </div>
  );
}
