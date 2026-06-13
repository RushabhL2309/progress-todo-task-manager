import type { MasterDataScope, SessionUser } from "./auth-types";

/** Subset used by DB access filters. */
export type AccessUser = Pick<SessionUser, "id" | "role" | "masterDataScope">;

export function viewsAllPlatformData(
  user: Pick<SessionUser, "role" | "masterDataScope">
): boolean {
  return user.role === "master" && user.masterDataScope !== "personal";
}
