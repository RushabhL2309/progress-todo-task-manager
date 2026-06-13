import mongoose from "mongoose";
import type { ProjectActivityDocument } from "@/models/ProjectActivity";
import type { ProjectActivityAction, ProjectActivityDTO, ProjectItemDTO, ProjectUpdateDTO } from "./types";

export async function logProjectActivity(params: {
  projectId: mongoose.Types.ObjectId | string;
  userId: string;
  action: ProjectActivityAction;
  description: string;
  itemId?: mongoose.Types.ObjectId | string | null;
  metadata?: Record<string, unknown>;
}) {
  const { ProjectActivity } = await import("@/models/ProjectActivity");
  return ProjectActivity.create({
    projectId: params.projectId,
    userId: params.userId,
    itemId: params.itemId ?? null,
    action: params.action,
    description: params.description,
    metadata: params.metadata ?? {},
  });
}

export function toProjectActivityDTO(
  doc: ProjectActivityDocument,
  userName: string,
  itemTitle?: string | null
): ProjectActivityDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    userId: doc.userId.toString(),
    userName,
    itemId: doc.itemId?.toString() ?? null,
    itemTitle: itemTitle ?? null,
    action: doc.action as ProjectActivityAction,
    description: doc.description,
    metadata: (doc.metadata as Record<string, unknown>) ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}

function overdueActivities(items: ProjectItemDTO[]): ProjectActivityDTO[] {
  const today = new Date().toISOString().slice(0, 10);
  return items
    .filter((i) => i.status === "open" && i.dueDate && i.dueDate < today)
    .map((i) => ({
      id: `overdue-${i.id}`,
      projectId: i.projectId ?? "",
      userId: "",
      userName: "System",
      itemId: i.id,
      itemTitle: i.title,
      action: "task_overdue" as const,
      description: `Overdue: ${i.title}`,
      metadata: { dueDate: i.dueDate },
      createdAt: `${i.dueDate}T12:00:00.000Z`,
    }));
}

export function mergeProjectTimeline(
  activities: ProjectActivityDTO[],
  updates: ProjectUpdateDTO[],
  items: ProjectItemDTO[]
): ProjectActivityDTO[] {
  const fromUpdates: ProjectActivityDTO[] = updates.map((u) => ({
    id: `update-${u.id}`,
    projectId: u.projectId,
    userId: "",
    userName: "Team",
    itemId: u.resolvedItemIds[0] ?? null,
    itemTitle:
      u.resolvedItemIds.length > 0
        ? items.find((i) => i.id === u.resolvedItemIds[0])?.title ?? null
        : null,
    action: "work_logged",
    description: u.description,
    metadata: { date: u.date, resolvedItemIds: u.resolvedItemIds },
    createdAt: u.createdAt,
  }));

  const storedIds = new Set(activities.filter((a) => a.action === "work_logged").map((a) => a.description));
  const dedupedUpdates = fromUpdates.filter((u) => !storedIds.has(u.description));

  return [...activities, ...dedupedUpdates, ...overdueActivities(items)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function canAccessTaskChat(
  userId: string,
  role: string,
  item: {
    createdBy?: string | null;
    assignedUserId?: string | null;
  }
): boolean {
  if (role === "master") return true;
  return userId === item.createdBy || userId === item.assignedUserId;
}
