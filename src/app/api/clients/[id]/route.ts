import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { toClientEventDTO, toClientProjectDTO, toClientReminderDTO } from "@/lib/client-serializers";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter } from "@/lib/permissions";
import { ClientProject } from "@/models/ClientProject";
import { ClientProjectEvent } from "@/models/ClientProjectEvent";
import { ClientReminder } from "@/models/ClientReminder";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  const { id } = await params;
  await connectDB();
  const doc = await ClientProject.findOne({
    _id: id,
    ...(clientAccessFilter(auth.user)),
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await ClientProjectEvent.find({ clientProjectId: id })
    .sort({ createdAt: -1 })
    .limit(100);
  const reminders = await ClientReminder.find({ clientProjectId: id }).sort({ createdAt: -1 });

  const userIds = [
    ...new Set(
      [
        ...events.map((e) => e.userId.toString()),
        ...reminders.flatMap((r) => [
          r.createdBy.toString(),
          r.assignedUserId?.toString(),
        ]),
      ].filter((x): x is string => Boolean(x))
    ),
  ];
  const users = await User.find({ _id: { $in: userIds } });
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    client: toClientProjectDTO(doc),
    events: events.map((e) => toClientEventDTO(e, nameMap[e.userId.toString()] ?? "User")),
    reminders: reminders.map((r) =>
      toClientReminderDTO(r, {
        assigned: r.assignedUserId ? nameMap[r.assignedUserId.toString()] ?? null : null,
        createdBy: nameMap[r.createdBy.toString()] ?? null,
      })
    ),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    const doc = await ClientProject.findOne({
      _id: id,
      ...(clientAccessFilter(auth.user)),
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const prevStage = doc.stage;

    if (typeof body.notes === "string") {
      doc.notes = body.notes.trim();
      await logEvent(doc._id, auth.user.id, "note_updated", "Notes updated");
    }
    if (body.paymentChecks && Array.isArray(body.paymentChecks)) {
      doc.paymentChecks = body.paymentChecks
        .filter((x: unknown) => x && typeof x === "object" && typeof (x as { label?: string }).label === "string")
        .map((x: { label: string; checked?: boolean }) => ({
          label: x.label.trim(),
          checked: Boolean(x.checked),
        }))
        .filter((x: { label: string }) => x.label.length > 0);
      await logEvent(doc._id, auth.user.id, "payment_updated", "Payment checklist updated");
    }
    if (typeof body.paymentNotes === "string") {
      doc.paymentNotes = body.paymentNotes.trim();
      await logEvent(doc._id, auth.user.id, "payment_updated", "Payment notes updated");
    }
    if (Array.isArray(body.assignedUserIds)) {
      doc.assignedUserIds = body.assignedUserIds.map(
        (uid: string) => new mongoose.Types.ObjectId(uid)
      );
      await logEvent(doc._id, auth.user.id, "assignees_updated", "Assignees updated");
      if (doc.linkedProjectId) {
        await Project.findByIdAndUpdate(doc.linkedProjectId, {
          assignedUserIds: doc.assignedUserIds,
        });
      }
    }

    if (body.followUpDate !== undefined) {
      doc.followUpDate = typeof body.followUpDate === "string" && body.followUpDate ? body.followUpDate : null;
      await logEvent(doc._id, auth.user.id, "followup_set", "Follow-up date updated");
    }

    if (
      ["enquiry", "running", "payment_due", "closed"].includes(body.stage) &&
      body.stage !== doc.stage
    ) {
      doc.stage = body.stage;
      await logEvent(
        doc._id,
        auth.user.id,
        "moved",
        `Moved from ${prevStage} to ${body.stage}`,
        prevStage,
        body.stage
      );

      if (body.stage === "running" && body.createProject && !doc.linkedProjectId) {
        const project = await Project.create({
          name: doc.name,
          description: doc.notes || "From client pipeline",
          createdBy: doc.createdBy,
          assignedUserIds: doc.assignedUserIds,
          linkedClientId: doc._id,
          status: "active",
        });
        doc.linkedProjectId = project._id;
        await logEvent(doc._id, auth.user.id, "project_linked", `Linked project "${doc.name}"`, null, null, {
          projectId: project._id.toString(),
        });
      }
    }

    await doc.save();
    return NextResponse.json(toClientProjectDTO(doc));
  } catch (error) {
    console.error("PATCH /api/clients/[id]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "client_updates");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await connectDB();

    const doc = await ClientProject.findOne({
      _id: id,
      ...clientAccessFilter(auth.user),
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (doc.linkedProjectId) {
      await Project.findByIdAndUpdate(doc.linkedProjectId, { $set: { linkedClientId: null } });
    }

    await Promise.all([
      ClientProjectEvent.deleteMany({ clientProjectId: id }),
      ClientReminder.deleteMany({ clientProjectId: id }),
      ClientProject.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clients/[id]", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
