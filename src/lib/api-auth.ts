import { NextResponse } from "next/server";
import type { SessionUser, UserModules } from "./auth-types";
import { getLiveSessionUser } from "./live-session";
import { getSessionUser } from "./auth";
import { getRequestUser } from "./request-user";
import { hasModule, isMaster } from "./permissions";

export async function requireAuth(request: Request): Promise<
  | { user: SessionUser; error: null }
  | { user: null; error: NextResponse }
> {
  const headerUser = getRequestUser(request);
  if (headerUser) {
    return { user: headerUser, error: null };
  }

  const user = (await getLiveSessionUser(request)) ?? (await getSessionUser(request));
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireMaster(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth;
  if (!isMaster(auth.user)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireModule(request: Request, mod: keyof UserModules) {
  const auth = await requireAuth(request);
  if (auth.error) return auth;
  if (!hasModule(auth.user, mod)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Module not enabled" }, { status: 403 }),
    };
  }
  return auth;
}
