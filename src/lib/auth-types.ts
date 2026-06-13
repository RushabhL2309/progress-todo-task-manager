export type UserRole = "master" | "user";

export interface UserModules {
  todo: boolean;
  tracker: boolean;
  projects: boolean;
  client_updates: boolean;
  chat: boolean;
}

export const ALL_MODULES: (keyof UserModules)[] = [
  "todo",
  "tracker",
  "projects",
  "client_updates",
  "chat",
];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  modules: UserModules;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  modules: UserModules;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export type ClientStage = "enquiry" | "running" | "payment_due" | "closed";

export interface ClientPaymentCheck {
  label: string;
  checked: boolean;
}

/** @deprecated legacy — use paymentChecks */
export interface ClientPaymentFlags {
  advanceReceived: boolean;
  partialPaid: boolean;
  fullPaid: boolean;
  customLabels: string[];
}

export interface ClientProjectDTO {
  id: string;
  name: string;
  stage: ClientStage;
  notes: string;
  paymentNotes: string;
  paymentChecks: ClientPaymentCheck[];
  linkedProjectId: string | null;
  followUpDate: string | null;
  createdBy: string;
  assignedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientProjectEventDTO {
  id: string;
  clientProjectId: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  fromStage: ClientStage | null;
  toStage: ClientStage | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChatGroupDTO {
  id: string;
  name: string;
  memberIds: string[];
  memberNames: string[];
  createdAt: string;
}

export interface ChatMessageDTO {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface ClientReminderDTO {
  id: string;
  clientProjectId: string;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  simple: boolean;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type:
    | "client_followup"
    | "client_reminder"
    | "project_deadline"
    | "item_due"
    | "item_overdue"
    | "chat";
  title: string;
  body: string;
  page: "clients" | "projects" | "chat";
  entityId?: string;
  severity: "info" | "warning" | "urgent";
  createdAt: string;
}
