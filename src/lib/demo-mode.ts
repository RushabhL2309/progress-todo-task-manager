import { getRequestUser } from "./request-user";

/** Demo only when not logged in (legacy). Logged-in users always use MongoDB. */
export function isDemoMode(request?: Request): boolean {
  if (request) {
    if (getRequestUser(request)) return false;
    const header = request.headers.get("x-demo-mode");
    if (header === "true") return true;
    if (header === "false") return false;
  }

  if (process.env.USE_DEMO_DATA === "false") return false;
  if (process.env.USE_DEMO_DATA === "true") return true;

  return false;
}
