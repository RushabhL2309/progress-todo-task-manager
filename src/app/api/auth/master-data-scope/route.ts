import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import type { MasterDataScope } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { toSessionUser } from "@/lib/user-serializers";
import { User } from "@/models/User";

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  if (auth.user.role !== "master") {
    return NextResponse.json({ error: "Master admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const scope: MasterDataScope =
      body.masterDataScope === "personal" ? "personal" : "platform";

    await connectDB();
    const user = await User.findById(auth.user.id);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    user.masterDataScope = scope;
    await user.save();

    return NextResponse.json({ user: toSessionUser(user) });
  } catch (error) {
    console.error("PATCH /api/auth/master-data-scope", error);
    return NextResponse.json({ error: "Failed to update data view" }, { status: 500 });
  }
}
