"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { completionKey } from "@/lib/dates";
import type { ExtraTaskDTO, GridData, PeriodStats, ProjectDTO, ScheduledTaskDTO } from "@/lib/types";
import type { AppPage } from "./Sidebar";

interface OneViewProps {
  userName: string;
  stats: PeriodStats | null;
  scheduledTasks: ScheduledTaskDTO[];
  grid: GridData | null;
  extraTasks: ExtraTaskDTO[];
  projects: ProjectDTO[];
  todoDate: string;
  loading?: boolean;
  onNavigate: (page: AppPage) => void;
  onToggle?: (taskId: string, dateKey: string, completed: boolean) => void;
}

const COMING_SOON = [
  { id: "habits", title: "Habits", desc: "Dedicated habit streaks & badges" },
  { id: "goals", title: "Goals", desc: "Long-term goal progress" },
  { id: "journal", title: "Journal", desc: "Daily reflections" },
] as const;

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);
  return dark;
}

function chartTheme(dark: boolean) {
  return {
    accent: dark ? "#ff4d6d" : "#5B7C6B",
    accentSoft: dark ? "#fb7185" : "#8FAF9B",
    extra: dark ? "#fbbf24" : "#C9A227",
    cyan: dark ? "#22d3ee" : "#0e7490",
    violet: dark ? "#a78bfa" : "#7c3aed",
    green: dark ? "#4ade80" : "#16a34a",
    pending: dark ? "#3f3f46" : "#D4D4CE",
    grid: dark ? "#333333" : "#E8E8E4",
    tick: dark ? "#c4c4c4" : "#6B6B6B",
    tooltipBg: dark ? "#161616" : "#ffffff",
    tooltipBorder: dark ? "#404040" : "#E8E8E4",
    track: dark ? "#262626" : "#E8E8E4",
  };
}

function hourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function OneView({
  userName,
  stats,
  scheduledTasks,
  grid,
  extraTasks,
  projects,
  todoDate,
  loading,
  onNavigate,
  onToggle,
}: OneViewProps) {
  const dark = useDark();
  const C = chartTheme(dark);
  const completions = grid?.completions ?? {};
  const columns = grid?.columns ?? [];
  const tasks = grid?.scheduledTasks?.length ? grid.scheduledTasks : scheduledTasks;

  const routineDone = tasks.filter((t) =>
    Boolean(completions[completionKey(t.id, todoDate)])
  ).length;
  const routineTotal = tasks.length;
  const extrasDone = extraTasks.filter((e) => e.completed).length;
  const extrasTotal = extraTasks.length;
  const score = stats?.overallScorePercent ?? 0;
  const [finStats, setFinStats] = useState<{ totalBalance: number; totalIncome: number; totalExpense: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/finance/stats?days=30")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setFinStats(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const dailyBars = useMemo(
    () =>
      (stats?.dailyScores ?? []).map((d) => ({
        label: format(parseISO(d.dateKey), "d"),
        full: format(parseISO(d.dateKey), "EEE d"),
        score: d.scorePercent,
        done: d.scheduledCompleted + d.extraCompleted,
        total: d.scheduledTotal + d.extraTotal,
      })),
    [stats]
  );

  const last5 = dailyBars.slice(-5);

  const taskAnalysis = useMemo(() => {
    if (!columns.length) return [];
    return tasks.map((task) => {
      const done = columns.filter((c) =>
        Boolean(completions[completionKey(task.id, c.dateKey)])
      ).length;
      const pct = columns.length ? Math.round((done / columns.length) * 100) : 0;
      return { id: task.id, name: task.name, done, total: columns.length, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [tasks, columns, completions]);

  const doneCount =
    (stats?.scheduledCompleted ?? 0) +
    (stats?.dailyScores.reduce((s, d) => s + d.extraCompleted, 0) ?? 0);
  const totalCount =
    (stats?.scheduledTotal ?? 0) +
    (stats?.dailyScores.reduce((s, d) => s + d.extraTotal, 0) ?? 0);
  const leftCount = Math.max(0, totalCount - doneCount);

  const pieData = [
    { name: "Completed", value: doneCount, color: C.accent },
    { name: "Left", value: leftCount, color: C.pending },
  ].filter((d) => d.value > 0);

  const tooltipStyle = {
    borderRadius: 10,
    border: `1px solid ${C.tooltipBorder}`,
    background: C.tooltipBg,
    color: dark ? "#f5f5f5" : "#1a1a1a",
    fontSize: 12,
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Habit tracker · Daily
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
            {hourGreeting()}, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Central grid + surrounding graphs — your One View command center
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate("grid")} className="btn-ghost text-sm">
            Full grid
          </button>
          <button type="button" onClick={() => onNavigate("todo")} className="btn-primary shrink-0">
            + New task
          </button>
        </div>
      </div>

      {/* TOP: graphs */}
      <div className="grid gap-3 lg:grid-cols-12">
        <section className="card-glow p-3 sm:p-4 lg:col-span-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Daily progress</h2>
          <div className="mt-2 h-36">
            {loading || dailyBars.length === 0 ? (
              <Pulse />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBars} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
                    formatter={(v) => [`${v}%`, "Score"]}
                  />
                  <Bar dataKey="score" fill={C.accent} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card-glow p-3 sm:p-4 lg:col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Last 5 days</h2>
          <div className="mt-2 h-36">
            {loading || last5.length === 0 ? (
              <Pulse />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last5} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Done"]} />
                  <Bar dataKey="done" fill={C.cyan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card-glow flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center lg:col-span-4">
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <MiniStat label="Total" value={String(totalCount)} />
            <MiniStat label="Completed" value={String(doneCount)} accent />
            <MiniStat label="Left" value={String(leftCount)} />
          </div>
          <div className="relative mx-auto h-28 w-28 shrink-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={34} outerRadius={48} paddingAngle={3}>
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">—</div>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
              {score}%
            </span>
          </div>
        </section>
      </div>

      {/* MIDDLE: habits list + MATRIX + analysis */}
      <div className="grid gap-3 xl:grid-cols-12">
        <aside className="card-glow p-3 sm:p-4 xl:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">My routines</h2>
          <ul className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto">
            {tasks.length === 0 ? (
              <li className="text-xs text-muted">No routines yet</li>
            ) : (
              tasks.map((t) => {
                const doneToday = Boolean(completions[completionKey(t.id, todoDate)]);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink hover:bg-canvas"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${doneToday ? "bg-accent" : "bg-border"}`}
                    />
                    <span className="truncate">{t.name}</span>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="card-glow overflow-hidden xl:col-span-7">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Completion matrix</h2>
              <p className="text-[10px] text-muted">Tap a cell to check · same as Progress Grid</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("grid")}
              className="text-[11px] font-medium text-accent hover:underline"
            >
              Expand →
            </button>
          </div>
          {loading ? (
            <div className="p-4">
              <Pulse className="h-48" />
            </div>
          ) : tasks.length === 0 || columns.length === 0 ? (
            <p className="p-6 text-sm text-muted">Add routine tasks to fill this matrix.</p>
          ) : (
            <div className="table-scroll-container max-h-[380px] overflow-auto">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas">
                    <th className="sticky left-0 z-10 bg-canvas px-3 py-2 text-left font-semibold text-muted">
                      Task
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.dateKey}
                        className={`min-w-[40px] px-1 py-2 text-center font-medium ${
                          col.isToday ? "text-accent" : "text-muted"
                        }`}
                      >
                        <span className="block text-[10px]">{col.shortLabel}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className={`border-b border-border/50 ${idx % 2 ? "bg-canvas/50" : "bg-surface"}`}
                    >
                      <td className="sticky left-0 z-10 max-w-[140px] truncate bg-inherit px-3 py-1.5 font-medium text-ink">
                        {task.name}
                      </td>
                      {columns.map((col) => {
                        const key = completionKey(task.id, col.dateKey);
                        const checked = Boolean(completions[key]);
                        return (
                          <td key={col.dateKey} className="px-0.5 py-1 text-center">
                            <button
                              type="button"
                              disabled={!onToggle}
                              onClick={() => onToggle?.(task.id, col.dateKey, !checked)}
                              className={`mx-auto flex h-5 w-5 items-center justify-center rounded-sm border transition-colors ${
                                checked
                                  ? "border-accent bg-accent text-white"
                                  : "border-muted/60 bg-canvas hover:border-accent"
                              }`}
                              aria-label={`${task.name} ${col.label}`}
                            >
                              {checked && (
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                                  <path
                                    d="M2 6L5 9L10 3"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="card-glow p-3 sm:p-4 xl:col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Analysis</h2>
          <ul className="mt-3 max-h-[320px] space-y-3 overflow-y-auto">
            {taskAnalysis.length === 0 ? (
              <li className="text-xs text-muted">No data yet</li>
            ) : (
              taskAnalysis.slice(0, 10).map((t) => (
                <li key={t.id}>
                  <div className="mb-1 flex justify-between gap-2 text-[11px]">
                    <span className="truncate text-ink">{t.name}</span>
                    <span className="shrink-0 font-medium text-accent">{t.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.track }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${t.pct}%`,
                        background: t.pct >= 70 ? C.green : t.pct >= 40 ? C.extra : C.accent,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>

      {/* BOTTOM: trend + top + extras */}
      <div className="grid gap-3 lg:grid-cols-12">
        <section className="card-glow p-3 sm:p-4 lg:col-span-7">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Overall trend</h2>
          <div className="mt-2 h-40">
            {loading || dailyBars.length === 0 ? (
              <Pulse className="h-36" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyBars} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="oneViewTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.violet} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={C.violet} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Score"]} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={C.violet}
                    strokeWidth={2.5}
                    fill="url(#oneViewTrend)"
                    dot={{ r: 3, fill: C.violet }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card-glow p-3 sm:p-4 lg:col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Top routines</h2>
          <ol className="mt-3 space-y-2">
            {taskAnalysis.slice(0, 5).map((t, i) => (
              <li key={t.id} className="flex items-center gap-2 text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
                <span className="font-medium text-muted">{t.pct}%</span>
              </li>
            ))}
            {taskAnalysis.length === 0 && <li className="text-xs text-muted">No rankings yet</li>}
          </ol>
        </section>

        <section className="card-glow p-3 sm:p-4 lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Today</h2>
          <p className="mt-3 text-2xl font-semibold text-ink">
            {routineDone}/{routineTotal}
          </p>
          <p className="text-[11px] text-muted">routines done</p>
          <p className="mt-3 text-lg font-semibold text-extra">
            {extrasDone}/{extrasTotal}
          </p>
          <p className="text-[11px] text-muted">extras</p>
          <p className="mt-3 text-xs text-muted">
            {projects.filter((p) => p.status === "active").length} active projects
          </p>
        </section>
      </div>

      {/* Money Tracker Quick Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-lg">
            ₹
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Money Tracker</h3>
            <p className="text-xs text-muted">
              Net Balance:{" "}
              <span className="font-semibold text-ink">
                ₹{(finStats?.totalBalance ?? 0).toLocaleString("en-IN")}
              </span>
              {" • "}
              <span className="text-emerald-600 dark:text-emerald-400">
                +₹{(finStats?.totalIncome ?? 0).toLocaleString("en-IN")}
              </span>
              {" / "}
              <span className="text-rose-600 dark:text-rose-400">
                -₹{(finStats?.totalExpense ?? 0).toLocaleString("en-IN")}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("finance")}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 self-start sm:self-auto"
        >
          Open Money Tracker →
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Coming soon</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {COMING_SOON.map((m) => (
            <div key={m.id} className="rounded-xl border border-dashed border-border bg-surface/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{m.title}</span>
                <span className="coming-soon-badge">Soon</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-canvas/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Pulse({ className }: { className?: string }) {
  return <div className={`h-full min-h-[5rem] animate-pulse rounded-lg bg-border/30 ${className ?? ""}`} />;
}
