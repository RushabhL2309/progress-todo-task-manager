import { getSessionUser, masterModules } from "./auth";
import type { SessionUser } from "./auth-types";
import { connectDB } from "./mongodb";
import { getRequestUser } from "./request-user";
import { toUserDTO } from "./user-serializers";
import { User } from "@/models/User";

/** Session from JWT + fresh modules/name/active flag from MongoDB */
export async function getLiveSessionUser(request: Request): Promise<SessionUser | null> {
  const tokenUser = getRequestUser(request) ?? (await getSessionUser(request));
  if (!tokenUser) return null;

  try {
    await connectDB();
    const doc = await User.findById(tokenUser.id);
    if (!doc || !doc.isActive) return null;

    const dto = toUserDTO(doc);
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name,
      role: dto.role,
      modules: dto.role === "master" ? masterModules() : dto.modules,
    };
  } catch {
    return tokenUser;
  }
}
