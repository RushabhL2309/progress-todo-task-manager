import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { ChatGroup } from "@/models/ChatGroup";
import { ChatMessage } from "@/models/ChatMessage";
import { ChatRead } from "@/models/ChatRead";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await connectDB();
    await Promise.all([
      ChatMessage.deleteMany({ groupId: id }),
      ChatRead.deleteMany({ groupId: id }),
      ChatGroup.findByIdAndDelete(id),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/chat/groups/[id]", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
