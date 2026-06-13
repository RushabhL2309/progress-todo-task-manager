import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { toClientReminderDTO } from "@/lib/client-serializers";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter } from "@/lib/permissions";
import { ClientProject } from "@/models/ClientProject";
import { ClientProjectEvent } from "@/models/ClientProjectEvent";
import { ClientReminder } from "@/models/ClientReminder";
import { User } from "@/models/User";

async function logEvent(
  clientProjectId: mongoose.Types.ObjectId,
  userId: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await ClientProjectEvent.create({
    clientProjectId,
    userId,
    action: "reminder_added",
    description,
    metadata,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  const { id } = await params;
  await connectDB();

  const client = await ClientProject.findOne({
    _id: id,
    ...(auth.user.role === "master" ? {} : clientAccessFilter(auth.user)),
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reminders = await ClientReminder.find({ clientProjectId: id }).sort({ createdAt: -1 });
  const userIds = [
    ...new Set(
      reminders
        .flatMap((r) => [r.assignedUserId?.toString(), r.createdBy.toString()])
        .filter((x): x is string => Boolean(x))
    ),
  ];
  const users = await User.find({ _id: { $in: userIds } });
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    reminders: reminders.map((r) =>
      toClientReminderDTO(r, {
        assigned: r.assignedUserId ? nameMap[r.assignedUserId.toString()] ?? null : null,
        createdBy: nameMap[r.createdBy.toString()] ?? null,
      })
    ),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const dueDate =
      typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
    const dueTime =
      typeof body.dueTime === "string" && body.dueTime ? body.dueTime : null;
    const assignedUserId =
      typeof body.assignedUserId === "string" && body.assignedUserId
        ? body.assignedUserId
        : null;
    const simple = Boolean(body.simple);

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();
    const client = await ClientProject.findOne({
      _id: id,
      ...(auth.user.role === "master" ? {} : clientAccessFilter(auth.user)),
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reminder = await ClientReminder.create({
      clientProjectId: id,
      title,
      dueDate,
      dueTime,
      assignedUserId: assignedUserId ? new mongoose.Types.ObjectId(assignedUserId) : null,
      simple,
      createdBy: auth.user.id,
    });

    const parts = [title];
    if (dueDate) parts.push(`due ${dueDate}${dueTime ? ` ${dueTime}` : ""}`);
    if (assignedUserId) {
      const u = await User.findById(assignedUserId);
      if (u) parts.push(`→ ${u.name}`);
    }
    if (simple) parts.push("(simple alert)");
    await logEvent(client._id, auth.user.id, `Reminder: ${parts.join(" ")}`, {
      reminderId: reminder._id.toString(),
    });

    if (dueDate && !client.followUpDate) {
      client.followUpDate = dueDate;
      await client.save();
    }

    const assignee = assignedUserId ? await User.findById(assignedUserId) : null;

    return NextResponse.json(
      toClientReminderDTO(reminder, {
        assigned: assignee?.name ?? null,
        createdBy: auth.user.name,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/clients/[id]/reminders", error);
    return NextResponse.json({ error: "Failed to add reminder" }, { status: 500 });
  }
}
