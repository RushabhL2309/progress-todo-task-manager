import mongoose from "mongoose";
import type { SessionUser } from "./auth-types";
import { canAccessProject, projectAccessFilter, viewsAllPlatformData } from "./permissions";
import type { ProjectDocument } from "@/models/Project";

export function taskListFilter(user: SessionUser, accessibleProjectIds: mongoose.Types.ObjectId[]) {
  const uid = new mongoose.Types.ObjectId(user.id);
  const clauses: Record<string, unknown>[] = [
    { projectId: { $in: accessibleProjectIds } },
    { projectId: null, createdBy: uid },
    { projectId: null, assignedUserId: uid },
  ];
  if (viewsAllPlatformData(user)) {
    clauses.push({ projectId: null });
  }
  return { $or: clauses };
}

export function canAssignUserToProject(
  project: ProjectDocument,
  assigneeId: string
): boolean {
  const ids = (project.assignedUserIds ?? []).map((id) => id.toString());
  const creator = project.createdBy?.toString();
  return ids.includes(assigneeId) || assigneeId === creator;
}

export async function getAccessibleProjects(user: SessionUser) {
  const { Project } = await import("@/models/Project");
  const access = projectAccessFilter(user);
  return Project.find(access);
}

export function canAccessTaskItem(
  user: SessionUser,
  item: {
    projectId?: { toString(): string } | string | null;
    createdBy?: { toString(): string } | string | null;
    assignedUserId?: { toString(): string } | string | null;
  },
  project?: ProjectDocument | null
): boolean {
  const uid = user.id;
  if (item.projectId && project) {
    return canAccessProject(user, project);
  }
  if (!item.projectId) {
    if (viewsAllPlatformData(user)) return true;
    const createdBy =
      typeof item.createdBy === "string" ? item.createdBy : item.createdBy?.toString();
    const assigned =
      typeof item.assignedUserId === "string"
        ? item.assignedUserId
        : item.assignedUserId?.toString();
    return createdBy === uid || assigned === uid;
  }
  return false;
}
