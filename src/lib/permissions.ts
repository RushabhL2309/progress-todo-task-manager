import type { SessionUser, UserModules } from "./auth-types";
import { viewsAllPlatformData, type AccessUser } from "./master-data-scope";
import { effectiveModules as clientEffectiveModules } from "./user-access";
import mongoose from "mongoose";

export { viewsAllPlatformData, type AccessUser } from "./master-data-scope";

export function effectiveModules(user: SessionUser): UserModules {
  return clientEffectiveModules(user);
}

export function hasModule(user: SessionUser, mod: keyof UserModules): boolean {
  return effectiveModules(user)[mod];
}

export function isMaster(user: Pick<SessionUser, "role">): boolean {
  return user.role === "master";
}

/** Project visible if creator, assignee, or master in platform view */
export function canAccessProject(
  user: AccessUser,
  project: {
    createdBy?: { toString(): string } | string | null;
    assignedUserIds?: { toString(): string }[];
  }
): boolean {
  if (viewsAllPlatformData(user)) return true;
  const uid = user.id;
  const createdBy =
    typeof project.createdBy === "string"
      ? project.createdBy
      : project.createdBy?.toString();
  if (createdBy === uid) return true;
  return (project.assignedUserIds ?? []).some((id) => id.toString() === uid);
}

export function projectAccessFilter(user: AccessUser) {
  if (viewsAllPlatformData(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}

export function clientAccessFilter(user: AccessUser) {
  if (viewsAllPlatformData(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}

/** Scheduled + extra tasks scoped per user; platform master sees unclaimed legacy rows too */
export function personalTaskFilter(user: AccessUser) {
  const uid = new mongoose.Types.ObjectId(user.id);
  if (viewsAllPlatformData(user)) {
    return {
      $or: [{ userId: uid }, { userId: null }, { userId: { $exists: false } }],
    };
  }
  return { userId: uid };
}
