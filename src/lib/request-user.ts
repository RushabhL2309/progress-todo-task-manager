import type { MasterDataScope, SessionUser, UserModules } from "./auth-types";
import { masterModules } from "./auth";

export function getRequestUser(request: Request): SessionUser | null {
  const id = request.headers.get("x-user-id");
  if (!id) return null;
  const role = request.headers.get("x-user-role") === "master" ? "master" : "user";
  let modules: UserModules = masterModules();
  try {
    const parsed = JSON.parse(request.headers.get("x-user-modules") ?? "{}") as UserModules;
    modules = role === "master" ? masterModules() : parsed;
  } catch {
    /* default */
  }
  const scopeHeader = request.headers.get("x-user-master-data-scope");
  const masterDataScope: MasterDataScope =
    scopeHeader === "personal" ? "personal" : "platform";

  return {
    id,
    email: request.headers.get("x-user-email") || null,
    name: request.headers.get("x-user-name") ?? "",
    role,
    modules,
    notificationEmail: null,
    emailUpdatesEnabled: false,
    passwordChangeEnabled: false,
    masterDataScope: role === "master" ? masterDataScope : "personal",
  };
}
