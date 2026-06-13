import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { MasterDataScope, SessionUser, UserModules } from "./auth-types";

export const SESSION_COOKIE = "pt_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-change-me-in-production-min-32-chars!!"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function masterModules(): UserModules {
  return {
    todo: true,
    tracker: true,
    projects: true,
    client_updates: true,
    chat: true,
  };
}

export async function createSessionToken(
  user: SessionUser,
  rememberMe: boolean
): Promise<string> {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  return new SignJWT({
    email: user.email ?? "",
    name: user.name,
    role: user.role,
    modules: user.role === "master" ? masterModules() : user.modules,
    notificationEmail: user.notificationEmail ?? "",
    emailUpdatesEnabled: user.emailUpdatesEnabled,
    passwordChangeEnabled: user.passwordChangeEnabled,
    masterDataScope: user.masterDataScope,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const id = payload.sub;
    if (!id || typeof id !== "string") return null;
    return {
      id,
      email: payload.email ? String(payload.email) : null,
      name: String(payload.name ?? ""),
      role: payload.role === "master" ? "master" : "user",
      modules: (payload.modules as UserModules) ?? masterModules(),
      notificationEmail: payload.notificationEmail ? String(payload.notificationEmail) : null,
      emailUpdatesEnabled: Boolean(payload.emailUpdatesEnabled),
      passwordChangeEnabled: Boolean(payload.passwordChangeEnabled),
      masterDataScope:
        payload.masterDataScope === "personal" ? "personal" : "platform",
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(rememberMe: boolean) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
