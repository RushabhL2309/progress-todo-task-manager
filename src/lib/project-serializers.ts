import type { ProjectDocument } from "@/models/Project";
import type { ProjectItemDocument } from "@/models/ProjectItem";
import type { ProjectUpdateDocument } from "@/models/ProjectUpdate";
import { computeProjectProgress } from "./project-stats";
import type { ProjectDTO, ProjectItemDTO, ProjectUpdateDTO } from "./types";

type ProjectItemStatsFields = Pick<ProjectItemDTO, "type" | "status" | "dueDate">;

export function projectStatsFromItems(
  items: ProjectItemStatsFields[]
): ReturnType<typeof computeProjectProgress> {
  return computeProjectProgress(items as ProjectItemDTO[]);
}

export function toProjectDTO(
  doc: ProjectDocument,
  items: ProjectItemDTO[] = []
): ProjectDTO {
  const stats = computeProjectProgress(items);
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? "",
    status: doc.status as ProjectDTO["status"],
    color: doc.color ?? "#5B7C6B",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    openCount: stats.openCount,
    resolvedCount: stats.resolvedCount,
    totalItems: stats.totalItems,
    completionPercent: stats.completionPercent,
    breakdown: stats.breakdown,
    overdueCount: stats.overdueCount,
    nextDeadline: stats.nextDeadline,
    deadline: doc.deadline ?? null,
    createdBy: doc.createdBy?.toString() ?? "",
    assignedUserIds: (doc.assignedUserIds ?? []).map((id) => id.toString()),
    linkedClientId: doc.linkedClientId?.toString() ?? null,
  };
}

export function projectDTOFromStats(
  base: Omit<
    ProjectDTO,
    | "openCount"
    | "resolvedCount"
    | "totalItems"
    | "completionPercent"
    | "breakdown"
    | "overdueCount"
    | "nextDeadline"
  >,
  items: ProjectItemDTO[]
): ProjectDTO {
  const stats = computeProjectProgress(items);
  return { ...base, ...stats };
}

export function toProjectItemDTO(doc: ProjectItemDocument): ProjectItemDTO {
  const assignedUserIds = (doc.assignedUserIds ?? []).map((id) => id.toString());
  const assignedUserId = doc.assignedUserId?.toString() ?? assignedUserIds[0] ?? null;
  return {
    id: doc._id.toString(),
    projectId: doc.projectId?.toString() ?? null,
    title: doc.title,
    description: doc.description ?? "",
    type: doc.type as ProjectItemDTO["type"],
    status: doc.status as ProjectItemDTO["status"],
    dueDate: doc.dueDate ?? null,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
    assignedUserId,
    assignedUserIds,
    createdBy: doc.createdBy?.toString() ?? null,
    completionNote: doc.completionNote ?? "",
  };
}

export function toProjectUpdateDTO(doc: ProjectUpdateDocument): ProjectUpdateDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    date: doc.date,
    description: doc.description,
    resolvedItemIds: (doc.resolvedItemIds ?? []).map((id) => id.toString()),
    linkedExtraTaskId: doc.linkedExtraTaskId?.toString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}
