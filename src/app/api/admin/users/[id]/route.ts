import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import type { UserModules } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "master") {
      return NextResponse.json({ error: "Cannot edit master admin" }, { status: 403 });
    }

    if (typeof body.name === "string" && body.name.trim()) user.name = body.name.trim();
    if (typeof body.isActive === "boolean") user.isActive = body.isActive;
    if (body.modules) {
      const m = body.modules as Partial<UserModules>;
      user.modules = {
        todo: Boolean(m.todo),
        tracker: Boolean(m.tracker),
        projects: Boolean(m.projects),
        client_updates: Boolean(m.client_updates),
        chat: Boolean(m.chat),
      };
    }
    if (typeof body.password === "string" && body.password.length >= 4) {
      user.passwordHash = await hashPassword(body.password);
    }

    await user.save();
    return NextResponse.json(toUserDTO(user));
  } catch (error) {
    console.error("PATCH /api/admin/users/[id]", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await connectDB();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "master") {
      return NextResponse.json({ error: "Cannot delete master admin" }, { status: 403 });
    }
    user.isActive = false;
    await user.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id]", error);
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
