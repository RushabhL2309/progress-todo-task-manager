import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import type { ChatMessageDTO } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { hasModule } from "@/lib/permissions";
import { ChatGroup } from "@/models/ChatGroup";
import { ChatMessage } from "@/models/ChatMessage";
import { User } from "@/models/User";

function canAccessGroup(userId: string, role: string, group: { memberIds: { toString(): string }[] }) {
  if (role === "master") return true;
  return group.memberIds.some((id) => id.toString() === userId);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "chat")) {
    return NextResponse.json({ error: "Module not enabled" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const initial = searchParams.get("initial") === "true";

  await connectDB();
  const group = await ChatGroup.findById(id);
  if (!group || !canAccessGroup(auth.user.id, auth.user.role, group)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let query: Record<string, unknown> = { groupId: id };

  if (initial) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    query = { groupId: id, createdAt: { $gte: yesterday } };
  } else if (before) {
    query = { groupId: id, createdAt: { $lt: new Date(before) } };
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

  const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];
  const users = await User.find({ _id: { $in: senderIds } });
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  const dtos: ChatMessageDTO[] = messages.reverse().map((m) => ({
    id: m._id.toString(),
    groupId: m.groupId.toString(),
    senderId: m.senderId.toString(),
    senderName: nameMap[m.senderId.toString()] ?? "User",
    text: m.text ?? null,
    imageUrl: m.imageUrl ?? null,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({ messages: dtos, hasMore: messages.length === limit });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "chat")) {
    return NextResponse.json({ error: "Module not enabled" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const imagePublicId = typeof body.imagePublicId === "string" ? body.imagePublicId : null;

    if (!text && !imageUrl) {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }

    await connectDB();
    const group = await ChatGroup.findById(id);
    if (!group || !canAccessGroup(auth.user.id, auth.user.role, group)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const msg = await ChatMessage.create({
      groupId: id,
      senderId: auth.user.id,
      text: text || null,
      imageUrl,
      imagePublicId,
    });

    await ChatGroup.findByIdAndUpdate(id, { updatedAt: new Date() });

    const dto: ChatMessageDTO = {
      id: msg._id.toString(),
      groupId: id,
      senderId: auth.user.id,
      senderName: auth.user.name,
      text: msg.text ?? null,
      imageUrl: msg.imageUrl ?? null,
      createdAt: msg.createdAt.toISOString(),
    };

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/messages", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
