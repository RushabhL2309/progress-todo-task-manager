import { getSessionUser, masterModules } from "./auth";
import type { SessionUser } from "./auth-types";
import { connectDB } from "./mongodb";
import { getRequestUser } from "./request-user";
import { toSessionUser } from "./user-serializers";
import { User } from "@/models/User";

/** Session from JWT + fresh profile from MongoDB */
export async function getLiveSessionUser(request: Request): Promise<SessionUser | null> {
  const tokenUser = getRequestUser(request) ?? (await getSessionUser(request));
  if (!tokenUser) return null;

  try {
    await connectDB();
    const doc = await User.findById(tokenUser.id);
    if (!doc || !doc.isActive) return null;

    return toSessionUser(doc, doc.role === "master" ? masterModules() : undefined);
  } catch {
    return tokenUser;
  }
}
