import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  masterModules,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as "master" | "user",
      modules: user.role === "master" ? masterModules() : toUserDTO(user).modules,
    };

    const token = await createSessionToken(sessionUser, rememberMe);
    const res = NextResponse.json({ user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(rememberMe));
    return res;
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
