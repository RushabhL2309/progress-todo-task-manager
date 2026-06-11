import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { toExtraTaskDTO } from "@/lib/serializers";
import { ExtraTask } from "@/models/ExtraTask";
import { ProjectItem } from "@/models/ProjectItem";

async function syncProjectItem(
  projectItemId: string | undefined | null,
  completed: boolean
) {
  if (!projectItemId) return;
  await ProjectItem.findByIdAndUpdate(projectItemId, {
    status: completed ? "resolved" : "open",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const update: { completed?: boolean; name?: string } = {};

    if (typeof body.completed === "boolean") update.completed = body.completed;
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();

    if (isDemoMode(request)) {
      const task = demoStore.updateExtraTask(id, update);
      if (!task) return NextResponse.json({ error: "Extra task not found" }, { status: 404 });
      return NextResponse.json(task);
    }

    await connectDB();
    const existing = await ExtraTask.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Extra task not found" }, { status: 404 });
    }

    const task = await ExtraTask.findByIdAndUpdate(id, update, { new: true });

    if (typeof update.completed === "boolean" && task?.projectItemId) {
      await syncProjectItem(task.projectItemId.toString(), update.completed);
    }

    return NextResponse.json(toExtraTaskDTO(task!));
  } catch (error) {
    console.error("PATCH /api/tasks/extra/[id]", error);
    return NextResponse.json({ error: "Failed to update extra task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDemoMode(_request)) {
      const ok = demoStore.deleteExtraTask(id);
      if (!ok) return NextResponse.json({ error: "Extra task not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    await connectDB();
    const task = await ExtraTask.findByIdAndDelete(id);

    if (!task) {
      return NextResponse.json({ error: "Extra task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/extra/[id]", error);
    return NextResponse.json({ error: "Failed to delete extra task" }, { status: 500 });
  }
}
