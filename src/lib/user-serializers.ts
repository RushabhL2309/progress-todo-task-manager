import type { UserDocument } from "@/models/User";
import type { UserDTO } from "./auth-types";

export function toUserDTO(doc: UserDocument): UserDTO {
  return {
    id: doc._id.toString(),
    email: doc.email,
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
    createdAt: doc.createdAt.toISOString(),
    lastLoginAt: doc.lastLoginAt?.toISOString() ?? null,
  };
}
