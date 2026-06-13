import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import type { UserModules } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
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
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const modules = (body.modules ?? {}) as Partial<UserModules>;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name required" }, { status: 400 });
    }

    await connectDB();
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      name,
      role: "user",
      modules: {
        todo: Boolean(modules.todo),
        tracker: Boolean(modules.tracker),
        projects: Boolean(modules.projects),
        client_updates: Boolean(modules.client_updates),
        chat: Boolean(modules.chat),
      },
      isActive: true,
    });

    return NextResponse.json(toUserDTO(user), { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
