import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { hasModule } from "@/lib/permissions";
import { ChatRead } from "@/models/ChatRead";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "chat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: groupId } = await params;
  await connectDB();
  await ChatRead.findOneAndUpdate(
    { userId: auth.user.id, groupId },
    { lastReadAt: new Date() },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
