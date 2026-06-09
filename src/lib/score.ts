import type {
  DayScore,
  ExtraTaskDTO,
  PeriodStats,
  ScheduledTaskDTO,
  TodoItem,
  ViewMode,
} from "./types";
import { getDateKeysForView, parseDateKey } from "./dates";

const SCHEDULED_WEIGHT = 1;
const EXTRA_WEIGHT = 2;

export function calculateDayScore(
  dateKey: string,
  scheduledTasks: ScheduledTaskDTO[],
  completions: Record<string, boolean>,
  extras: ExtraTaskDTO[]
): DayScore {
  const dayExtras = extras.filter((e) => e.date === dateKey);
  const scheduledCompleted = scheduledTasks.filter(
    (t) => completions[`${t.id}:${dateKey}`]
  ).length;
  const extraCompleted = dayExtras.filter((e) => e.completed).length;

  const earnedPoints =
    scheduledCompleted * SCHEDULED_WEIGHT + extraCompleted * EXTRA_WEIGHT;
  const maxPoints =
    scheduledTasks.length * SCHEDULED_WEIGHT + dayExtras.length * EXTRA_WEIGHT;

  return {
    dateKey,
    scheduledCompleted,
    scheduledTotal: scheduledTasks.length,
    extraCompleted,
    extraTotal: dayExtras.length,
    earnedPoints,
    maxPoints,
    scorePercent: maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100,
  };
}

export function calculatePeriodStats(
  view: ViewMode,
  anchorDate: Date,
  scheduledTasks: ScheduledTaskDTO[],
  completions: Record<string, boolean>,
  extras: ExtraTaskDTO[]
): PeriodStats {
  const dateKeys = getDateKeysForView(view, anchorDate);
  const dailyScores = dateKeys.map((dk) =>
    calculateDayScore(dk, scheduledTasks, completions, extras)
  );

  const scheduledCompleted = dailyScores.reduce((s, d) => s + d.scheduledCompleted, 0);
  const scheduledTotal = dailyScores.reduce((s, d) => s + d.scheduledTotal, 0);
  const extraEarnedPoints = dailyScores.reduce(
    (s, d) => s + d.extraCompleted * EXTRA_WEIGHT,
    0
  );
  const extraMaxPoints = dailyScores.reduce(
    (s, d) => s + d.extraTotal * EXTRA_WEIGHT,
    0
  );

  const overallScorePercent =
    dailyScores.length > 0
      ? Math.round(
          dailyScores.reduce((s, d) => s + d.scorePercent, 0) / dailyScores.length
        )
      : 100;

  const todoItems: TodoItem[] = [];

  for (const dateKey of dateKeys) {
    for (const task of scheduledTasks) {
      if (!completions[`${task.id}:${dateKey}`]) {
        todoItems.push({
          id: `scheduled-${task.id}-${dateKey}`,
          name: task.name,
          date: dateKey,
          type: "scheduled",
          scheduledTaskId: task.id,
        });
      }
    }
    for (const extra of extras.filter((e) => e.date === dateKey && !e.completed)) {
      todoItems.push({
        id: `extra-${extra.id}`,
        name: extra.name,
        date: dateKey,
        type: "extra",
      });
    }
  }

  const pending = todoItems.length;

  return {
    view,
    anchorDate: dateKeys[0] ?? anchorDate.toISOString(),
    overallScorePercent,
    scheduledCompleted,
    scheduledTotal,
    extraEarnedPoints,
    extraMaxPoints,
    pending,
    dailyScores,
    todoItems,
  };
}

export function formatTodoDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Today first, then extras before routine, then earliest date */
export function getPriorityTodos(
  items: TodoItem[],
  todayKey: string,
  limit = 5
): TodoItem[] {
  return [...items]
    .sort((a, b) => {
      const aToday = a.date === todayKey ? 0 : 1;
      const bToday = b.date === todayKey ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;

      const aExtra = a.type === "extra" ? 0 : 1;
      const bExtra = b.type === "extra" ? 0 : 1;
      if (aExtra !== bExtra) return aExtra - bExtra;

      return a.date.localeCompare(b.date);
    })
    .slice(0, limit);
}
