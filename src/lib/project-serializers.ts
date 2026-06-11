import type { ProjectDocument } from "@/models/Project";
import type { ProjectItemDocument } from "@/models/ProjectItem";
import type { ProjectUpdateDocument } from "@/models/ProjectUpdate";
import { computeProjectProgress } from "./project-stats";
import type { ProjectDTO, ProjectItemDTO, ProjectUpdateDTO } from "./types";

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
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    title: doc.title,
    description: doc.description ?? "",
    type: doc.type as ProjectItemDTO["type"],
    status: doc.status as ProjectItemDTO["status"],
    dueDate: doc.dueDate ?? null,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
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
