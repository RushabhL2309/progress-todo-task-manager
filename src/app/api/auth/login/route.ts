import { NextResponse } from "next/server";
import {
  createSessionToken,
  masterModules,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { nameKeyFrom } from "@/lib/user-login";
import { toSessionUser, toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const loginId =
      typeof body.loginId === "string"
        ? body.loginId.trim()
        : typeof body.name === "string"
          ? body.name.trim()
          : typeof body.email === "string"
            ? body.email.trim()
            : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!loginId || !password) {
      return NextResponse.json({ error: "Name and password required" }, { status: 400 });
    }

    await connectDB();
    const key = nameKeyFrom(loginId);
    let user;
    if (loginId.includes("@")) {
      const matches = await User.find({ isActive: true, email: key });
      user = matches.length === 1 ? matches[0] : null;
    } else {
      user = await User.findOne({ isActive: true, nameKey: key });
    }
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionUser = toSessionUser(
      user,
      user.role === "master" ? masterModules() : toUserDTO(user).modules
    );

    const token = await createSessionToken(sessionUser, rememberMe);
    const res = NextResponse.json({ user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(rememberMe));
    return res;
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
