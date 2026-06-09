"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getDemoModeEnabled } from "@/lib/api-client";
import { completionKey, formatPeriodLabel, getColumnsForView, navigateDate, parseDateKey, toDateKey } from "@/lib/dates";
import { calculatePeriodStats } from "@/lib/score";
import type {
  ExtraTaskDTO,
  GridData,
  PeriodStats,
  ScheduledTaskDTO,
  ViewMode,
} from "@/lib/types";
import { AddTaskDrawer, type DrawerTaskType } from "./AddTaskDrawer";
import { DashboardCharts } from "./DashboardCharts";
import { DateNavigator } from "./DateNavigator";
import { GridView } from "./GridView";
import { Sidebar, type AppPage } from "./Sidebar";
import { TasksView } from "./TasksView";
import { PriorityTodoCard } from "./PriorityTodoCard";
import { SettingsView } from "./SettingsView";
import { ViewModeTabs } from "./ViewModeTabs";

export function TrackerApp() {
  const [page, setPage] = useState<AppPage>("grid");
  const [drawerType, setDrawerType] = useState<DrawerTaskType | null>(null);

  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskDTO[]>([]);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [extraTasks, setExtraTasks] = useState<ExtraTaskDTO[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraTaskDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(true);

  const periodColumns = getColumnsForView(view, parseDateKey(anchorDate));
  const rangeFrom = periodColumns[0]?.dateKey ?? anchorDate;
  const rangeTo = periodColumns[periodColumns.length - 1]?.dateKey ?? anchorDate;

  const fetchScheduled = useCallback(async () => {
    const res = await apiFetch("/api/tasks/scheduled");
    if (!res.ok) throw new Error("Failed to load scheduled tasks");
    return res.json() as Promise<ScheduledTaskDTO[]>;
  }, []);

  const fetchGrid = useCallback(async (v: ViewMode, date: string) => {
    const res = await apiFetch(`/api/grid?view=${v}&date=${date}`);
    if (!res.ok) throw new Error("Failed to load grid");
    return res.json() as Promise<GridData>;
  }, []);

  const fetchStats = useCallback(async (v: ViewMode, date: string) => {
    const res = await apiFetch(`/api/stats?view=${v}&date=${date}`);
    if (!res.ok) throw new Error("Failed to load stats");
    return res.json() as Promise<PeriodStats>;
  }, []);

  const fetchExtras = useCallback(async (date: string) => {
    const res = await apiFetch(`/api/tasks/extra?date=${date}`);
    if (!res.ok) throw new Error("Failed to load extra tasks");
    return res.json() as Promise<ExtraTaskDTO[]>;
  }, []);

  const fetchExtrasInRange = useCallback(async (from: string, to: string) => {
    const res = await apiFetch(`/api/tasks/extra?from=${from}&to=${to}`);
    if (!res.ok) throw new Error("Failed to load extra tasks");
    return res.json() as Promise<ExtraTaskDTO[]>;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasks, gridData, statsData, extras, periodExtras] = await Promise.all([
        fetchScheduled(),
        fetchGrid(view, anchorDate),
        fetchStats(view, anchorDate),
        fetchExtras(selectedDate),
        fetchExtrasInRange(rangeFrom, rangeTo),
      ]);
      setScheduledTasks(tasks);
      setGrid(gridData);
      setStats(statsData);
      setExtraTasks(extras);
      setAllExtras(periodExtras);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [
    anchorDate,
    fetchExtras,
    fetchExtrasInRange,
    fetchGrid,
    fetchScheduled,
    fetchStats,
    rangeFrom,
    rangeTo,
    selectedDate,
    view,
  ]);

  const refreshQuiet = useCallback(async () => {
    try {
      const [tasks, gridData, statsData, extras, periodExtras] = await Promise.all([
        fetchScheduled(),
        fetchGrid(view, anchorDate),
        fetchStats(view, anchorDate),
        fetchExtras(selectedDate),
        fetchExtrasInRange(rangeFrom, rangeTo),
      ]);
      setScheduledTasks(tasks);
      setGrid(gridData);
      setStats(statsData);
      setExtraTasks(extras);
      setAllExtras(periodExtras);
    } catch {
      /* keep optimistic state on quiet refresh failure */
    }
  }, [
    anchorDate,
    fetchExtras,
    fetchExtrasInRange,
    fetchGrid,
    fetchScheduled,
    fetchStats,
    rangeFrom,
    rangeTo,
    selectedDate,
    view,
  ]);

  useEffect(() => {
    setDemoEnabled(getDemoModeEnabled());
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onDemoChange = () => setDemoEnabled(getDemoModeEnabled());
    window.addEventListener("demo-mode-change", onDemoChange);
    return () => window.removeEventListener("demo-mode-change", onDemoChange);
  }, []);

  useEffect(() => {
    if (view === "day") setSelectedDate(anchorDate);
  }, [view, anchorDate]);

  function recomputeStats(
    completions: Record<string, boolean>,
    extras: ExtraTaskDTO[]
  ) {
    if (!grid) return;
    setStats(
      calculatePeriodStats(
        view,
        parseDateKey(anchorDate),
        grid.scheduledTasks,
        completions,
        extras.filter((e) => e.date >= rangeFrom && e.date <= rangeTo)
      )
    );
  }

  async function handleAddScheduled(name: string) {
    const res = await apiFetch("/api/tasks/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to add task");
    await refreshAll();
  }

  async function handleDeleteScheduled(id: string) {
    const res = await apiFetch(`/api/tasks/scheduled/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to remove task");
    await refreshAll();
  }

  async function handleToggleCompletion(taskId: string, dateKey: string, completed: boolean) {
    const key = completionKey(taskId, dateKey);
    const prevGrid = grid;
    const prevCompletions = { ...(grid?.completions ?? {}) };

    if (completed) prevCompletions[key] = true;
    else delete prevCompletions[key];

    setGrid((g) => (g ? { ...g, completions: prevCompletions } : g));
    recomputeStats(prevCompletions, allExtras);

    try {
      const res = await apiFetch("/api/completions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date: dateKey, completed }),
      });
      if (!res.ok) throw new Error("Failed");
      await refreshQuiet();
    } catch {
      setGrid(prevGrid);
      await refreshQuiet();
    }
  }

  async function handleAddExtra(name: string, date: string) {
    const res = await apiFetch("/api/tasks/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date }),
    });
    if (!res.ok) throw new Error("Failed to add extra task");
    if (date === selectedDate) await refreshAll();
    else await refreshQuiet();
  }

  async function handleToggleExtra(id: string, completed: boolean) {
    const prevExtras = extraTasks;
    const prevAll = allExtras;
    const updated = (list: ExtraTaskDTO[]) =>
      list.map((t) => (t.id === id ? { ...t, completed } : t));

    setExtraTasks(updated(extraTasks));
    setAllExtras(updated(allExtras));
    if (grid) recomputeStats(grid.completions, updated(allExtras));

    try {
      const res = await apiFetch(`/api/tasks/extra/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed");
      await refreshQuiet();
    } catch {
      setExtraTasks(prevExtras);
      setAllExtras(prevAll);
      await refreshQuiet();
    }
  }

  async function handleDeleteExtra(id: string) {
    const res = await apiFetch(`/api/tasks/extra/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete extra task");
    await refreshAll();
  }

  function openDrawer(type: DrawerTaskType) {
    setDrawerType(type);
  }

  function handleNavigate(direction: -1 | 1) {
    const next = navigateDate(view, parseDateKey(anchorDate), direction);
    const nextKey = toDateKey(next);
    setAnchorDate(nextKey);
    if (view === "day") setSelectedDate(nextKey);
  }

  function handleToday() {
    const today = toDateKey(new Date());
    setAnchorDate(today);
    setSelectedDate(today);
  }

  const periodLabel = formatPeriodLabel(view, parseDateKey(anchorDate));

  const pageTitle =
    page === "grid"
      ? "Progress Grid"
      : page === "dashboard"
        ? "Dashboard"
        : page === "tasks"
          ? "Manage Tasks"
          : "Settings";

  function handleDemoChange(enabled: boolean) {
    setDemoEnabled(enabled);
    refreshAll();
  }

  function handleViewAllTodos() {
    const needsSwitch = page !== "grid";
    if (needsSwitch) setPage("grid");
    setTimeout(() => {
      document.getElementById("todo-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, needsSwitch ? 200 : 0);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas">
      <Sidebar active={page} onNavigate={setPage} />

      <div className="min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 lg:pl-[252px]">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
            <div className="min-w-0 shrink-0">
              <h1 className="text-base font-semibold text-ink sm:text-lg">{pageTitle}</h1>
            </div>
            <PriorityTodoCard
              items={stats?.todoItems ?? []}
              loading={loading}
              onToggleScheduled={(taskId, date) => handleToggleCompletion(taskId, date, true)}
              onToggleExtra={(id) => handleToggleExtra(id, true)}
              onViewAll={handleViewAllTodos}
            />
          </div>
        </header>

        <main className="mx-auto max-w-6xl min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {page === "grid" && (
            <GridView
              view={view}
              periodLabel={periodLabel}
              selectedDate={selectedDate}
              scheduledTasks={scheduledTasks}
              grid={grid}
              stats={stats}
              extraTasks={extraTasks}
              loading={loading}
              onViewChange={setView}
              onPrev={() => handleNavigate(-1)}
              onNext={() => handleNavigate(1)}
              onToday={handleToday}
              onSelectDay={setSelectedDate}
              onToggle={handleToggleCompletion}
              onAddRegular={() => openDrawer("regular")}
              onAddExtra={() => openDrawer("extra")}
              onToggleExtra={handleToggleExtra}
              onDeleteExtra={handleDeleteExtra}
              onAddExtraInline={(name) => handleAddExtra(name, selectedDate)}
              onToggleScheduledFromTodo={(taskId, date) =>
                handleToggleCompletion(taskId, date, true)
              }
              onToggleExtraFromTodo={(id) => handleToggleExtra(id, true)}
            />
          )}

          {page === "dashboard" && (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-ink sm:text-2xl">Dashboard</h1>
                  <p className="mt-1 text-sm text-muted">{periodLabel} — scores and charts</p>
                </div>
                <button type="button" onClick={() => setPage("grid")} className="btn-primary shrink-0">
                  Open progress grid
                </button>
              </div>
              <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <ViewModeTabs value={view} onChange={setView} />
                <DateNavigator
                  label={periodLabel}
                  onPrev={() => handleNavigate(-1)}
                  onNext={() => handleNavigate(1)}
                  onToday={handleToday}
                />
              </div>
              <DashboardCharts stats={stats} loading={loading} />
            </div>
          )}

          {page === "tasks" && (
            <TasksView
              scheduledTasks={scheduledTasks}
              allExtras={allExtras}
              loading={loading}
              onAddRegular={() => openDrawer("regular")}
              onAddExtra={() => openDrawer("extra")}
              onDeleteRegular={handleDeleteScheduled}
              onToggleExtra={handleToggleExtra}
              onDeleteExtra={handleDeleteExtra}
            />
          )}

          {page === "settings" && <SettingsView onDemoChange={handleDemoChange} />}
        </main>
      </div>

      <AddTaskDrawer
        open={drawerType !== null}
        type={drawerType}
        selectedDate={selectedDate}
        onClose={() => setDrawerType(null)}
        onAddRegular={handleAddScheduled}
        onAddExtra={handleAddExtra}
      />
    </div>
  );
}
