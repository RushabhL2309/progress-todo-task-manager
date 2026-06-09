export type ViewMode = "day" | "week" | "month";

export interface ScheduledTaskDTO {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CompletionDTO {
  id: string;
  scheduledTaskId: string;
  date: string;
  completed: boolean;
}

export interface ExtraTaskDTO {
  id: string;
  name: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface DayColumn {
  dateKey: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
}

export interface ExtraDaySummary {
  dateKey: string;
  total: number;
  completed: number;
}

export interface DayScore {
  dateKey: string;
  scheduledCompleted: number;
  scheduledTotal: number;
  extraCompleted: number;
  extraTotal: number;
  earnedPoints: number;
  maxPoints: number;
  scorePercent: number;
}

export interface PeriodStats {
  view: ViewMode;
  anchorDate: string;
  overallScorePercent: number;
  scheduledCompleted: number;
  scheduledTotal: number;
  extraEarnedPoints: number;
  extraMaxPoints: number;
  pending: number;
  dailyScores: DayScore[];
  todoItems: TodoItem[];
}

export interface TodoItem {
  id: string;
  name: string;
  date: string;
  type: "scheduled" | "extra";
  scheduledTaskId?: string;
}

export interface GridData {
  scheduledTasks: ScheduledTaskDTO[];
  completions: Record<string, boolean>;
  extraSummaries: ExtraDaySummary[];
  columns: DayColumn[];
}
