import type { SessionUser, UserModules } from "./auth-types";
import { effectiveModules as clientEffectiveModules } from "./user-access";

export function effectiveModules(user: SessionUser): UserModules {
  return clientEffectiveModules(user);
}

export function hasModule(user: SessionUser, mod: keyof UserModules): boolean {
  return effectiveModules(user)[mod];
}

export function isMaster(user: SessionUser): boolean {
  return user.role === "master";
}

/** Project visible if creator, assignee, or master admin */
export function canAccessProject(
  user: SessionUser,
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

export function projectAccessFilter(user: SessionUser) {
  if (isMaster(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}

export function clientAccessFilter(user: SessionUser) {
  if (isMaster(user)) return {};
  return {
    $or: [{ createdBy: user.id }, { assignedUserIds: user.id }],
  };
}
