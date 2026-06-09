import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { completionKey, getColumnsForView, parseDateKey, toDateKey } from "./dates";
import { calculatePeriodStats } from "./score";
import type {
  CompletionDTO,
  ExtraDaySummary,
  ExtraTaskDTO,
  GridData,
  PeriodStats,
  ScheduledTaskDTO,
  ViewMode,
} from "./types";

interface DemoStore {
  scheduledTasks: ScheduledTaskDTO[];
  completions: CompletionDTO[];
  extraTasks: ExtraTaskDTO[];
  nextId: number;
}

function newId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

function buildSeed(): DemoStore {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(today, { weekStartsOn: 1 }),
  }).map(toDateKey);

  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(subDays(today, 1));

  const scheduledTasks: ScheduledTaskDTO[] = [
    {
      id: "demo-st-1",
      name: "Morning workout",
      sortOrder: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-st-2",
      name: "Read 30 minutes",
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-st-3",
      name: "Drink 2L water",
      sortOrder: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-st-4",
      name: "Review daily goals",
      sortOrder: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const completions: CompletionDTO[] = [];
  let cId = 1;

  const todayIndex = weekDays.indexOf(todayKey);
  const patterns: Record<string, number[]> = {
    "demo-st-1": [0, 1, 2, todayIndex].filter((i, idx, arr) => i >= 0 && arr.indexOf(i) === idx),
    "demo-st-2": [0, 2],
    "demo-st-3": weekDays
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d <= todayKey)
      .map(({ i }) => i),
    "demo-st-4": [1],
  };

  for (const [taskId, dayIndexes] of Object.entries(patterns)) {
    for (const i of dayIndexes) {
      const date = weekDays[i];
      if (!date) continue;
      completions.push({
        id: `demo-c-${cId++}`,
        scheduledTaskId: taskId,
        date,
        completed: true,
      });
    }
  }

  const extraTasks: ExtraTaskDTO[] = [
    {
      id: "demo-ex-1",
      name: "Finish project slides",
      date: todayKey,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-ex-2",
      name: "Send client follow-up email",
      date: todayKey,
      completed: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-ex-3",
      name: "Prepare team presentation",
      date: format(subDays(today, -1), "yyyy-MM-dd"),
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-ex-4",
      name: "Deep work: write blog post",
      date: yesterdayKey,
      completed: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-ex-5",
      name: "Call dentist for appointment",
      date: weekDays[0] ?? todayKey,
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    scheduledTasks,
    completions,
    extraTasks,
    nextId: 100,
  };
}

declare global {
  var demoStoreCache: DemoStore | undefined;
}

function getStore(): DemoStore {
  if (!global.demoStoreCache) {
    global.demoStoreCache = buildSeed();
  }
  return global.demoStoreCache;
}

function completionsMap(store: DemoStore): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const c of store.completions) {
    if (c.completed) {
      map[completionKey(c.scheduledTaskId, c.date)] = true;
    }
  }
  return map;
}

function activeScheduled(store: DemoStore): ScheduledTaskDTO[] {
  return store.scheduledTasks
    .filter((t) => t.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const demoStore = {
  getScheduledTasks(): ScheduledTaskDTO[] {
    return activeScheduled(getStore());
  },

  addScheduledTask(name: string): ScheduledTaskDTO {
    const store = getStore();
    const task: ScheduledTaskDTO = {
      id: newId("demo-st", store.nextId++),
      name,
      sortOrder: store.scheduledTasks.filter((t) => t.isActive).length,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.scheduledTasks.push(task);
    return task;
  },

  deleteScheduledTask(id: string): boolean {
    const store = getStore();
    const task = store.scheduledTasks.find((t) => t.id === id);
    if (!task) return false;
    task.isActive = false;
    return true;
  },

  toggleCompletion(taskId: string, date: string, completed: boolean) {
    const store = getStore();
    const idx = store.completions.findIndex(
      (c) => c.scheduledTaskId === taskId && c.date === date
    );

    if (!completed) {
      if (idx >= 0) store.completions.splice(idx, 1);
      return { taskId, date, completed: false };
    }

    if (idx >= 0) {
      store.completions[idx].completed = true;
      return store.completions[idx];
    }

    const entry: CompletionDTO = {
      id: newId("demo-c", store.nextId++),
      scheduledTaskId: taskId,
      date,
      completed: true,
    };
    store.completions.push(entry);
    return entry;
  },

  getExtras(date: string): ExtraTaskDTO[] {
    return getStore()
      .extraTasks.filter((t) => t.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  getExtrasInRange(from: string, to: string): ExtraTaskDTO[] {
    return getStore()
      .extraTasks.filter((t) => t.date >= from && t.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  },

  addExtraTask(name: string, date: string): ExtraTaskDTO {
    const store = getStore();
    const task: ExtraTaskDTO = {
      id: newId("demo-ex", store.nextId++),
      name,
      date,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    store.extraTasks.push(task);
    return task;
  },

  updateExtraTask(id: string, update: { completed?: boolean; name?: string }): ExtraTaskDTO | null {
    const store = getStore();
    const task = store.extraTasks.find((t) => t.id === id);
    if (!task) return null;
    if (typeof update.completed === "boolean") task.completed = update.completed;
    if (update.name) task.name = update.name;
    return task;
  },

  deleteExtraTask(id: string): boolean {
    const store = getStore();
    const idx = store.extraTasks.findIndex((t) => t.id === id);
    if (idx < 0) return false;
    store.extraTasks.splice(idx, 1);
    return true;
  },

  carryForwardExtras(fromDate: string, toDate: string): {
    carried: number;
    toDate: string;
    tasks: ExtraTaskDTO[];
  } {
    const store = getStore();
    const incomplete = store.extraTasks.filter((t) => t.date === fromDate && !t.completed);
    const existingNames = new Set(
      store.extraTasks.filter((t) => t.date === toDate).map((t) => t.name.toLowerCase())
    );

    const created: ExtraTaskDTO[] = [];
    for (const task of incomplete) {
      if (existingNames.has(task.name.toLowerCase())) continue;
      const copy: ExtraTaskDTO = {
        id: newId("demo-ex", store.nextId++),
        name: task.name,
        date: toDate,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      store.extraTasks.push(copy);
      created.push(copy);
      existingNames.add(task.name.toLowerCase());
    }

    return { carried: created.length, toDate, tasks: created };
  },

  getGrid(view: ViewMode, dateParam: string): GridData {
    const store = getStore();
    const anchorDate = parseDateKey(dateParam);
    const columns = getColumnsForView(view, anchorDate);
    const from = columns[0]?.dateKey ?? dateParam;
    const to = columns[columns.length - 1]?.dateKey ?? dateParam;

    const extrasInRange = store.extraTasks.filter((t) => t.date >= from && t.date <= to);
    const extraSummaries: ExtraDaySummary[] = [];

    for (const col of columns) {
      const dayExtras = extrasInRange.filter((t) => t.date === col.dateKey);
      if (dayExtras.length > 0) {
        extraSummaries.push({
          dateKey: col.dateKey,
          total: dayExtras.length,
          completed: dayExtras.filter((t) => t.completed).length,
        });
      }
    }

    return {
      scheduledTasks: activeScheduled(store),
      completions: completionsMap(store),
      extraSummaries,
      columns,
    };
  },

  getStats(view: ViewMode, dateParam: string): PeriodStats {
    const store = getStore();
    const anchorDate = parseDateKey(dateParam);
    const columns = getColumnsForView(view, anchorDate);
    const from = columns[0]?.dateKey ?? dateParam;
    const to = columns[columns.length - 1]?.dateKey ?? dateParam;

    return calculatePeriodStats(
      view,
      anchorDate,
      activeScheduled(store),
      completionsMap(store),
      store.extraTasks.filter((t) => t.date >= from && t.date <= to)
    );
  },
};
