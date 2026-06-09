import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { DayColumn, ViewMode } from "./types";

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(dateKey: string): Date {
  return parseISO(dateKey);
}

export function getColumnsForView(view: ViewMode, anchorDate: Date): DayColumn[] {
  if (view === "day") {
    return [buildColumn(anchorDate)];
  }

  if (view === "week") {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).map(buildColumn);
  }

  const start = startOfMonth(anchorDate);
  const end = endOfMonth(anchorDate);
  return eachDayOfInterval({ start, end }).map(buildColumn);
}

function buildColumn(date: Date): DayColumn {
  return {
    dateKey: toDateKey(date),
    label: format(date, "EEE d MMM"),
    shortLabel: format(date, "EEE d"),
    isToday: isToday(date),
  };
}

export function getDateKeysForView(view: ViewMode, anchorDate: Date): string[] {
  return getColumnsForView(view, anchorDate).map((c) => c.dateKey);
}

export function navigateDate(view: ViewMode, anchorDate: Date, direction: -1 | 1): Date {
  if (view === "day") return addDays(anchorDate, direction);
  if (view === "week") return addWeeks(anchorDate, direction);
  return addMonths(anchorDate, direction);
}

export function formatPeriodLabel(view: ViewMode, anchorDate: Date): string {
  if (view === "day") return format(anchorDate, "EEEE, d MMMM yyyy");
  if (view === "week") {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
    return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  }
  return format(anchorDate, "MMMM yyyy");
}

export function completionKey(taskId: string, dateKey: string): string {
  return `${taskId}:${dateKey}`;
}

export function isSameDateKey(a: string, b: string): boolean {
  return isSameDay(parseDateKey(a), parseDateKey(b));
}
