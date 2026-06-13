import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { toClientEventDTO, toClientProjectDTO } from "@/lib/client-serializers";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter } from "@/lib/permissions";
import { ClientProject } from "@/models/ClientProject";
import { ClientProjectEvent } from "@/models/ClientProjectEvent";
import { Project } from "@/models/Project";
import { User } from "@/models/User";

async function logEvent(
  clientProjectId: mongoose.Types.ObjectId,
  userId: string,
  action: string,
  description: string,
  fromStage: string | null = null,
  toStage: string | null = null,
  metadata: Record<string, unknown> = {}
) {
  await ClientProjectEvent.create({
    clientProjectId,
    userId,
    action,
    description,
    fromStage,
    toStage,
    metadata,
  });
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  await connectDB();
  const filter = clientAccessFilter(auth.user);
  const items = await ClientProject.find(filter).sort({ updatedAt: -1 });
  return NextResponse.json(items.map(toClientProjectDTO));
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const stage = ["enquiry", "running", "payment_due", "closed"].includes(body.stage)
      ? body.stage
      : "enquiry";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const assignedUserIds = Array.isArray(body.assignedUserIds)
      ? body.assignedUserIds.filter((x: unknown) => typeof x === "string")
      : [];

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectDB();
    const doc = await ClientProject.create({
      name,
      stage,
      notes,
      createdBy: auth.user.id,
      assignedUserIds: assignedUserIds.map((id: string) => id),
    });

    await logEvent(
      doc._id,
      auth.user.id,
      "created",
      `Created in ${stage}`,
      null,
      stage,
      { name }
    );

    return NextResponse.json(toClientProjectDTO(doc), { status: 201 });
  } catch (error) {
    console.error("POST /api/clients", error);
    return NextResponse.json({ error: "Failed to create client project" }, { status: 500 });
  }
}
