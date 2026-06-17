import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { masterModules } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPaths =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user && !publicPaths) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email ?? "");
    requestHeaders.set("x-user-name", user.name);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set(
      "x-user-modules",
      JSON.stringify(user.role === "master" ? masterModules() : user.modules)
    );
    requestHeaders.set("x-user-master-data-scope", user.masterDataScope);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
