import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { demoStore } from "@/lib/demo-store";
import { requireModule } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { logProjectActivity } from "@/lib/project-activity";
import { toExtraTaskDTO } from "@/lib/serializers";
import { toProjectUpdateDTO } from "@/lib/project-serializers";
import { ExtraTask } from "@/models/ExtraTask";
import { ProjectItem } from "@/models/ProjectItem";
import { ProjectUpdate } from "@/models/ProjectUpdate";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const date = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
    const resolvedItemIds = Array.isArray(body.resolvedItemIds)
      ? body.resolvedItemIds.filter((x: unknown) => typeof x === "string")
      : [];
    const addAsExtraTask = Boolean(body.addAsExtraTask);
    const extraTaskTitle =
      typeof body.extraTaskTitle === "string" ? body.extraTaskTitle.trim() : "";

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      let linkedExtraTaskId: string | null = null;
      if (addAsExtraTask) {
        const title = extraTaskTitle || description.slice(0, 80);
        const extra = demoStore.addExtraTask(`[Project] ${title}`, date, {
          completed: true,
          projectId,
        });
        linkedExtraTaskId = extra.id;
      }
      const update = demoProjectsStore.completeWork(projectId, {
        description,
        resolvedItemIds,
        date,
        linkedExtraTaskId,
      });
      if (!update) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      for (const itemId of resolvedItemIds) {
        demoStore.syncExtraForProjectItem(itemId, true);
      }
      return NextResponse.json({ update, linkedExtraTaskId });
    }

    await connectDB();

    let linkedExtraTaskId = null;
    if (addAsExtraTask) {
      const title = extraTaskTitle || description.slice(0, 80);
      const extra = await ExtraTask.create({
        name: `[Project] ${title}`,
        date,
        projectId,
        completed: true,
      });
      linkedExtraTaskId = extra._id;
    }

    if (resolvedItemIds.length > 0) {
      await ProjectItem.updateMany(
        { _id: { $in: resolvedItemIds }, projectId },
        { status: "resolved" }
      );
      await ExtraTask.updateMany(
        { projectItemId: { $in: resolvedItemIds }, completed: false },
        { completed: true }
      );
    }

    const updateDoc = await ProjectUpdate.create({
      projectId,
      date,
      description,
      resolvedItemIds,
      linkedExtraTaskId,
    });

    await logProjectActivity({
      projectId,
      userId: auth.user.id,
      action: "work_logged",
      description,
      metadata: { date, resolvedItemIds },
    });

    const linkedDoc = linkedExtraTaskId
      ? await ExtraTask.findById(linkedExtraTaskId)
      : null;

    return NextResponse.json({
      update: toProjectUpdateDTO(updateDoc),
      linkedExtraTaskId: linkedExtraTaskId?.toString() ?? null,
      linkedExtra: linkedDoc ? toExtraTaskDTO(linkedDoc) : null,
    });
  } catch (error) {
    console.error("POST /api/projects/[id]/complete", error);
    return NextResponse.json({ error: "Failed to log work" }, { status: 500 });
  }
}
