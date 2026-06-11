import type { ProjectItemDTO, ProjectItemType } from "./types";

export interface TypeBreakdown {
  done: number;
  total: number;
}

export interface ProjectProgressStats {
  openCount: number;
  resolvedCount: number;
  totalItems: number;
  /** Completed items ÷ all issues + features + tasks */
  completionPercent: number;
  breakdown: Record<ProjectItemType, TypeBreakdown>;
  overdueCount: number;
  nextDeadline: string | null;
}

const TYPES: ProjectItemType[] = ["issue", "feature", "task"];

export function computeProjectProgress(items: ProjectItemDTO[]): ProjectProgressStats {
  const today = new Date().toISOString().slice(0, 10);
  const breakdown = {} as Record<ProjectItemType, TypeBreakdown>;

  for (const type of TYPES) {
    const ofType = items.filter((i) => i.type === type);
    breakdown[type] = {
      total: ofType.length,
      done: ofType.filter((i) => i.status === "resolved").length,
    };
  }

  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const openCount = items.filter((i) => i.status === "open").length;
  const totalItems = items.length;

  const openWithDue = items
    .filter((i) => i.status === "open" && i.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  const overdueCount = openWithDue.filter((i) => i.dueDate! < today).length;
  const nextDeadline = openWithDue[0]?.dueDate ?? null;

  return {
    openCount,
    resolvedCount,
    totalItems,
    completionPercent:
      totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0,
    breakdown,
    overdueCount,
    nextDeadline,
  };
}

export function formatDeadlineLabel(dateKey: string | null): string | null {
  if (!dateKey) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey < today) return "Overdue";
  if (dateKey === today) return "Due today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  if (dateKey === tomorrowKey) return "Due tomorrow";
  return "Next deadline";
}
