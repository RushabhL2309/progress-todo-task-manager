import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { canAccessTaskChat } from "@/lib/project-activity";
import { canAccessTaskItem } from "@/lib/project-tasks";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import { TaskMessage } from "@/models/TaskMessage";
import { User } from "@/models/User";
import type { TaskMessageDTO } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  const { id } = await params;
  await connectDB();

  const item = await ProjectItem.findById(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = item.projectId ? await Project.findById(item.projectId) : null;
  if (!canAccessTaskItem(auth.user, item, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dto = {
    createdBy: item.createdBy?.toString() ?? null,
    assignedUserId: item.assignedUserId?.toString() ?? null,
  };
  if (!canAccessTaskChat(auth.user.id, auth.user.role, dto)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const messages = await TaskMessage.find({ itemId: id }).sort({ createdAt: 1 }).limit(100);
  const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];
  const senders = await User.find({ _id: { $in: senderIds } });
  const nameMap = Object.fromEntries(senders.map((u) => [u._id.toString(), u.name]));

  const dtos: TaskMessageDTO[] = messages.map((m) => ({
    id: m._id.toString(),
    itemId: id,
    senderId: m.senderId.toString(),
    senderName: nameMap[m.senderId.toString()] ?? "User",
    text: m.text,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({ messages: dtos });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await connectDB();
    const item = await ProjectItem.findById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = item.projectId ? await Project.findById(item.projectId) : null;
    if (!canAccessTaskItem(auth.user, item, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const access = {
      createdBy: item.createdBy?.toString() ?? null,
      assignedUserId: item.assignedUserId?.toString() ?? null,
    };
    if (!canAccessTaskChat(auth.user.id, auth.user.role, access)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const msg = await TaskMessage.create({
      itemId: id,
      senderId: auth.user.id,
      text,
    });

    const dto: TaskMessageDTO = {
      id: msg._id.toString(),
      itemId: id,
      senderId: auth.user.id,
      senderName: auth.user.name,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
    };

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/tasks/[id]/messages", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
