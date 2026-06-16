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

export type ProjectStatus = "active" | "paused" | "completed";
export type ProjectItemType = "issue" | "feature" | "task";
export type ProjectItemStatus = "open" | "resolved";

export interface ExtraTaskDTO {
  id: string;
  name: string;
  date: string;
  completed: boolean;
  createdAt: string;
  projectId?: string;
  projectItemId?: string;
}

export interface ProjectTypeBreakdown {
  done: number;
  total: number;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  createdAt: string;
  updatedAt: string;
  openCount: number;
  resolvedCount: number;
  totalItems: number;
  /** resolvedCount / totalItems (issues + features + tasks) */
  completionPercent: number;
  breakdown: {
    issue: ProjectTypeBreakdown;
    feature: ProjectTypeBreakdown;
    task: ProjectTypeBreakdown;
  };
  overdueCount: number;
  nextDeadline: string | null;
  deadline: string | null;
  createdBy: string;
  assignedUserIds: string[];
  linkedClientId: string | null;
}

export interface ProjectItemDTO {
  id: string;
  projectId: string | null;
  title: string;
  description: string;
  type: ProjectItemType;
  status: ProjectItemStatus;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  assignedUserId: string | null;
  assignedUserIds?: string[];
  createdBy: string | null;
  completionNote: string;
}

export interface ProjectTaskDTO extends ProjectItemDTO {
  projectName: string | null;
  assignedUserName: string | null;
  createdByName: string | null;
}

export type ProjectActivityAction =
  | "task_created"
  | "task_completed"
  | "task_reopened"
  | "task_assigned"
  | "task_overdue"
  | "work_logged"
  | "project_closed";

export interface ProjectActivityDTO {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  itemId: string | null;
  itemTitle: string | null;
  action: ProjectActivityAction;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TaskMessageDTO {
  id: string;
  itemId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ProjectUpdateDTO {
  id: string;
  projectId: string;
  date: string;
  description: string;
  resolvedItemIds: string[];
  linkedExtraTaskId: string | null;
  createdAt: string;
}

export interface ProjectDetailDTO {
  project: ProjectDTO;
  items: ProjectItemDTO[];
  updates: ProjectUpdateDTO[];
  activities: ProjectActivityDTO[];
}

export interface ProjectsDashboardStats {
  totalProjects: number;
  activeProjects: number;
  openIssues: number;
  resolvedIssues: number;
  projects: ProjectDTO[];
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
