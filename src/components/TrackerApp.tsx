"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { completionKey, formatPeriodLabel, getColumnsForView, navigateDate, parseDateKey, toDateKey } from "@/lib/dates";
import { calculatePeriodStats } from "@/lib/score";
import type {
  ExtraTaskDTO,
  GridData,
  PeriodStats,
  ProjectDTO,
  ScheduledTaskDTO,
  ViewMode,
} from "@/lib/types";
import { AddTaskDrawer, type DrawerTaskType } from "./AddTaskDrawer";
import { DailyTodoView } from "./DailyTodoView";
import { DashboardCharts } from "./DashboardCharts";
import { DateNavigator } from "./DateNavigator";
import { GridView } from "./GridView";
import { Sidebar, type AppPage } from "./Sidebar";
import { TasksView } from "./TasksView";
import { PriorityTodoCard } from "./PriorityTodoCard";
import { ProjectsView } from "./ProjectsView";
import { SettingsView } from "./SettingsView";
import { ViewModeTabs } from "./ViewModeTabs";

export function TrackerApp() {
  const [page, setPage] = useState<AppPage>("grid");
  const [drawerType, setDrawerType] = useState<DrawerTaskType | null>(null);

  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [todoDate, setTodoDate] = useState(() => toDateKey(new Date()));

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskDTO[]>([]);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [extraTasks, setExtraTasks] = useState<ExtraTaskDTO[]>([]);
  const [todoDayExtras, setTodoDayExtras] = useState<ExtraTaskDTO[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraTaskDTO[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const periodColumns = getColumnsForView(view, parseDateKey(anchorDate));
  const rangeFrom = periodColumns[0]?.dateKey ?? anchorDate;
  const rangeTo = periodColumns[periodColumns.length - 1]?.dateKey ?? anchorDate;

  const fetchBootstrap = useCallback(async () => {
    const q = new URLSearchParams({
      view,
      anchorDate,
      selectedDate,
      todoDate,
    });
    const res = await apiFetch(`/api/bootstrap?${q}`);
    if (!res.ok) throw new Error("Failed to load data");
    return res.json() as Promise<{
      scheduledTasks: ScheduledTaskDTO[];
      grid: GridData;
      stats: PeriodStats;
      extrasSelected: ExtraTaskDTO[];
      extrasTodo: ExtraTaskDTO[];
      extrasRange: ExtraTaskDTO[];
    }>;
  }, [anchorDate, selectedDate, todoDate, view]);

  const applyBootstrap = useCallback(
    (data: Awaited<ReturnType<typeof fetchBootstrap>>) => {
      setScheduledTasks(data.scheduledTasks);
      setGrid(data.grid);
      setStats(data.stats);
      setExtraTasks(data.extrasSelected);
      setTodoDayExtras(data.extrasTodo);
      setAllExtras(data.extrasRange);
    },
    []
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyBootstrap(await fetchBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap, fetchBootstrap]);

  const refreshQuiet = useCallback(async () => {
    try {
      applyBootstrap(await fetchBootstrap());
    } catch {
      /* keep optimistic state on quiet refresh failure */
    }
  }, [applyBootstrap, fetchBootstrap]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onDemoChange = () => refreshAll();
    window.addEventListener("demo-mode-change", onDemoChange);
    return () => window.removeEventListener("demo-mode-change", onDemoChange);
  }, [refreshAll]);

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

  useEffect(() => {
    apiFetch("/api/projects")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ProjectDTO[]) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  async function handleAddExtra(name: string, date: string, projectId?: string) {
    const res = await apiFetch("/api/tasks/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, projectId: projectId || undefined }),
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

  async function handleEditExtra(id: string, name: string) {
    const res = await apiFetch(`/api/tasks/extra/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    await refreshAll();
  }

  async function handleCarryForward(fromDate: string) {
    const res = await apiFetch("/api/tasks/extra/carry-forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate }),
    });
    if (!res.ok) throw new Error("Failed to carry forward");
    const data = (await res.json()) as { carried: number; toDate?: string };
    await refreshAll();
    if (data.toDate) setTodoDate(data.toDate);
    return { carried: data.carried };
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
        : page === "projects"
          ? "Projects"
          : page === "todo"
            ? "Daily To-Do"
            : page === "tasks"
              ? "Manage Tasks"
              : "Settings";

  const routinePending = scheduledTasks
    .filter((t) => !grid?.completions[completionKey(t.id, todoDate)])
    .map((t) => ({ id: t.id, name: t.name }));

  function handleDemoChange() {
    refreshAll();
  }

  function handleViewAllTodos() {
    const first = stats?.todoItems[0];
    if (first) setTodoDate(first.date);
    setPage("todo");
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
              projects={projects}
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
              onAddExtraInline={(name, projectId) => handleAddExtra(name, selectedDate, projectId)}
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

          {page === "projects" && (
            <ProjectsView onWorkLogged={refreshQuiet} />
          )}

          {page === "todo" && (
            <DailyTodoView
              dateKey={todoDate}
              extras={todoDayExtras}
              scheduledTasks={scheduledTasks}
              routinePending={routinePending}
              projects={projects}
              loading={loading}
              onDateChange={setTodoDate}
              onPrevDay={() => setTodoDate(toDateKey(addDays(parseDateKey(todoDate), -1)))}
              onNextDay={() => setTodoDate(toDateKey(addDays(parseDateKey(todoDate), 1)))}
              onToday={() => setTodoDate(toDateKey(new Date()))}
              onAdd={(name, projectId) => handleAddExtra(name, todoDate, projectId)}
              onToggle={handleToggleExtra}
              onEdit={handleEditExtra}
              onDelete={handleDeleteExtra}
              onCarryForward={() => handleCarryForward(todoDate)}
              onToggleRoutine={(taskId) => handleToggleCompletion(taskId, todoDate, true)}
            />
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
        projects={projects}
        onClose={() => setDrawerType(null)}
        onAddRegular={handleAddScheduled}
        onAddExtra={handleAddExtra}
      />
    </div>
  );
}
