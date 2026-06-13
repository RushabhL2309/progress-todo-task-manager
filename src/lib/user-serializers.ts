import type { UserDocument } from "@/models/User";
import type { UserDTO } from "./auth-types";

export function toUserDTO(doc: UserDocument): UserDTO {
  return {
    id: doc._id.toString(),
    email: doc.email ?? null,
    name: doc.name,
    role: doc.role as UserDTO["role"],
    modules: {
      todo: doc.modules?.todo ?? false,
      tracker: doc.modules?.tracker ?? false,
      projects: doc.modules?.projects ?? false,
      client_updates: doc.modules?.client_updates ?? false,
      chat: doc.modules?.chat ?? false,
    },
    isActive: doc.isActive,
    notificationEmail: doc.notificationEmail ?? null,
    emailUpdatesEnabled: Boolean(doc.emailUpdatesEnabled),
    passwordChangeEnabled: Boolean(doc.passwordChangeEnabled),
    createdAt: doc.createdAt.toISOString(),
    lastLoginAt: doc.lastLoginAt?.toISOString() ?? null,
  };
}

export function toSessionUser(
  doc: UserDocument,
  modulesOverride?: UserDTO["modules"]
): import("./auth-types").SessionUser {
  const dto = toUserDTO(doc);
  const isMaster = dto.role === "master";
  return {
    id: dto.id,
    email: dto.email,
    name: dto.name,
    role: dto.role,
    modules: modulesOverride ?? dto.modules,
    notificationEmail: dto.notificationEmail,
    emailUpdatesEnabled: isMaster ? true : dto.emailUpdatesEnabled,
    passwordChangeEnabled: isMaster ? true : dto.passwordChangeEnabled,
  };
}
