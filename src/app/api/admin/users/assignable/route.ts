import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { connectDB } from "@/lib/mongodb";
import { toUserDTO } from "@/lib/user-serializers";
import { User } from "@/models/User";

/** List active users for assignment dropdowns */
export async function GET(request: Request) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const filter =
    user.role === "master"
      ? { isActive: true }
      : { isActive: true, role: "user" as const };
  const users = await User.find(filter).sort({ name: 1 });
  return NextResponse.json(users.map(toUserDTO));
}
