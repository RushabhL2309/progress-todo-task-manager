import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  if (!auth.user.emailUpdatesEnabled) {
    return NextResponse.json({ error: "Email updates are not enabled for your account" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const raw =
      typeof body.notificationEmail === "string" ? body.notificationEmail.trim().toLowerCase() : "";

    if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.user.id);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    user.notificationEmail = raw || null;
    await user.save();

    return NextResponse.json({
      notificationEmail: toUserDTO(user).notificationEmail,
    });
  } catch (error) {
    console.error("PATCH /api/auth/notification-email", error);
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }
}
