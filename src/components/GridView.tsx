"use client";

import { format, parseISO } from "date-fns";
import type { ExtraTaskDTO, GridData, PeriodStats, ProjectDTO, ScheduledTaskDTO, ViewMode } from "@/lib/types";
import { DateNavigator } from "./DateNavigator";
import { ExtraTasksPanel } from "./ExtraTasksPanel";
import { TaskGrid } from "./TaskGrid";
import { TodoList } from "./TodoList";
import { ViewModeTabs } from "./ViewModeTabs";

interface GridViewProps {
  view: ViewMode;
  periodLabel: string;
  selectedDate: string;
  scheduledTasks: ScheduledTaskDTO[];
  grid: GridData | null;
  stats: PeriodStats | null;
  extraTasks: ExtraTaskDTO[];
  projects?: ProjectDTO[];
  loading: boolean;
  onViewChange: (v: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDay: (dateKey: string) => void;
  onToggle: (taskId: string, dateKey: string, completed: boolean) => void;
  onAddRegular: () => void;
  onAddExtra: () => void;
  onToggleExtra: (id: string, completed: boolean) => Promise<void>;
  onDeleteExtra: (id: string) => Promise<void>;
  onAddExtraInline: (name: string, projectId?: string) => Promise<void>;
  onToggleScheduledFromTodo: (taskId: string, date: string) => void;
  onToggleExtraFromTodo: (id: string) => void;
}

export function GridView({
  view,
  periodLabel,
  selectedDate,
  scheduledTasks,
  grid,
  stats,
  extraTasks,
  projects,
  loading,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onSelectDay,
  onToggle,
  onAddRegular,
  onAddExtra,
  onToggleExtra,
  onDeleteExtra,
  onAddExtraInline,
  onToggleScheduledFromTodo,
  onToggleExtraFromTodo,
}: GridViewProps) {
  const selectedLabel = format(parseISO(selectedDate), "EEE, d MMM");

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Progress Grid</h1>
          <p className="mt-1 text-sm text-muted">Mark daily routine tasks — click a day column for extras</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAddRegular} className="btn-primary gap-2 !px-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Regular task
          </button>
          <button
            type="button"
            onClick={onAddExtra}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-extra/30 bg-extra-light px-4 py-2 text-sm font-medium text-extra transition-colors hover:bg-extra-light/80"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Extra task
          </button>
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <ViewModeTabs value={view} onChange={onViewChange} />
        <DateNavigator label={periodLabel} onPrev={onPrev} onNext={onNext} onToday={onToday} />
      </div>

      <TaskGrid
        tasks={grid?.scheduledTasks ?? scheduledTasks}
        columns={grid?.columns ?? []}
        completions={grid?.completions ?? {}}
        extraSummaries={grid?.extraSummaries ?? []}
        onToggle={onToggle}
        onSelectDay={onSelectDay}
        selectedDate={selectedDate}
        loading={loading}
        onAddRegular={onAddRegular}
      />

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ExtraTasksPanel
            dateKey={selectedDate}
            tasks={extraTasks}
            projects={projects}
            onAdd={onAddExtraInline}
            onToggle={onToggleExtra}
            onDelete={onDeleteExtra}
            loading={loading}
            compact
            subtitle={selectedLabel}
            onOpenDrawer={onAddExtra}
          />
        </div>
        <div className="xl:col-span-2">
          <TodoList
            items={stats?.todoItems ?? []}
            onToggleScheduled={onToggleScheduledFromTodo}
            onToggleExtra={onToggleExtraFromTodo}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
