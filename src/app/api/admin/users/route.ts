import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import type { UserModules } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { DEFAULT_USER_EMAIL, nameKeyFrom } from "@/lib/user-login";
import { toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function GET(request: Request) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  await connectDB();
  const users = await User.find().sort({ createdAt: -1 });
  return NextResponse.json(users.map(toUserDTO));
}

export async function POST(request: Request) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.toLowerCase().trim()
        : DEFAULT_USER_EMAIL;
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const modules = (body.modules ?? {}) as Partial<UserModules>;
    const emailUpdatesEnabled = Boolean(body.emailUpdatesEnabled);
    const passwordChangeEnabled = Boolean(body.passwordChangeEnabled);

    if (!password || !name) {
      return NextResponse.json({ error: "Name and password required" }, { status: 400 });
    }

    const nameKey = nameKeyFrom(name);

    await connectDB();
    const exists = await User.findOne({ nameKey });
    if (exists) {
      return NextResponse.json({ error: "A user with this name already exists" }, { status: 409 });
    }

    const user = await User.create({
      name,
      nameKey,
      email,
      passwordHash: await hashPassword(password),
      role: "user",
      modules: {
        todo: Boolean(modules.todo),
        tracker: Boolean(modules.tracker),
        projects: Boolean(modules.projects),
        client_updates: Boolean(modules.client_updates),
        chat: Boolean(modules.chat),
      },
      isActive: true,
      emailUpdatesEnabled,
      passwordChangeEnabled,
    });

    return NextResponse.json(toUserDTO(user), { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users", error);
    const message =
      error instanceof Error && error.name === "ValidationError"
        ? error.message.replace(/^User validation failed: /, "")
        : error instanceof Error && "code" in error && (error as { code?: number }).code === 11000
          ? "A user with this name already exists"
          : error instanceof Error
            ? error.message
            : "Failed to create user";
    const status =
      error instanceof Error && (error.name === "ValidationError" || (error as { code?: number }).code === 11000)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
