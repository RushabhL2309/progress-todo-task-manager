import type { SessionUser, UserModules } from "./auth-types";
import { effectiveModules as clientEffectiveModules } from "./user-access";
import mongoose from "mongoose";

/** Subset used by DB access filters (id + role only). */
export type AccessUser = Pick<SessionUser, "id" | "role">;

export function effectiveModules(user: SessionUser): UserModules {
  return clientEffectiveModules(user);
}

export function hasModule(user: SessionUser, mod: keyof UserModules): boolean {
  return effectiveModules(user)[mod];
}

export function isMaster(user: Pick<SessionUser, "role">): boolean {
  return user.role === "master";
}

/** Project visible if creator, assignee, or master admin */
export function canAccessProject(
  user: AccessUser,
  project: {
    createdBy?: { toString(): string } | string | null;
    assignedUserIds?: { toString(): string }[];
  }
): boolean {
  if (isMaster(user)) return true;
  const uid = user.id;
  const createdBy =
    typeof project.createdBy === "string"
      ? project.createdBy
      : project.createdBy?.toString();
  if (createdBy === uid) return true;
  return (project.assignedUserIds ?? []).some((id) => id.toString() === uid);
}

export function projectAccessFilter(user: AccessUser) {
  if (isMaster(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}

export function clientAccessFilter(user: AccessUser) {
  if (isMaster(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}

/** Scheduled + extra tasks scoped per user; master also sees unclaimed pre-auth rows. */
export function personalTaskFilter(user: AccessUser) {
  const uid = new mongoose.Types.ObjectId(user.id);
  if (isMaster(user)) {
    return {
      $or: [{ userId: uid }, { userId: null }, { userId: { $exists: false } }],
    };
  }
  return { userId: uid };
}
