import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { canAccessProject } from "@/lib/permissions";
import { canAssignUserToProject } from "@/lib/project-tasks";
import { logProjectActivity } from "@/lib/project-activity";
import { toProjectItemDTO } from "@/lib/project-serializers";
import type { ProjectItemType } from "@/lib/types";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import { User } from "@/models/User";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const type = (["issue", "feature", "task"].includes(body.type)
      ? body.type
      : "task") as ProjectItemType;
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;
    const assignedUserId =
      typeof body.assignedUserId === "string" && body.assignedUserId
        ? body.assignedUserId
        : null;
    const assignedUserIds = Array.isArray(body.assignedUserIds)
      ? body.assignedUserIds.filter((x: unknown): x is string => typeof x === "string" && Boolean(x))
      : assignedUserId
        ? [assignedUserId]
        : [];

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      const item = demoProjectsStore.addItem(projectId, { title, description, type, dueDate });
      if (!item) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      return NextResponse.json(item, { status: 201 });
    }

    await connectDB();
    const project = await Project.findById(projectId);
    if (!project || !canAccessProject(auth.user, project)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (assignedUserIds.some((uid: string) => !canAssignUserToProject(project, uid))) {
      return NextResponse.json(
        { error: "Assignee must be a user on this project" },
        { status: 400 }
      );
    }

    const count = await ProjectItem.countDocuments({ projectId });
    const item = await ProjectItem.create({
      projectId,
      title,
      description,
      type,
      dueDate,
      sortOrder: count,
      assignedUserId: assignedUserIds[0]
        ? new mongoose.Types.ObjectId(assignedUserIds[0])
        : null,
      assignedUserIds: assignedUserIds.map((uid: string) => new mongoose.Types.ObjectId(uid)),
      createdBy: auth.user.id,
    });

    const assigneeUsers = assignedUserIds.length > 0 ? await User.find({ _id: { $in: assignedUserIds } }) : [];
    const assigneeNames = assigneeUsers.map((u) => u.name).join(", ");
    await logProjectActivity({
      projectId,
      userId: auth.user.id,
      action: "task_created",
      description: assigneeNames
        ? `${type} created: ${title} → ${assigneeNames}`
        : `${type} created: ${title}`,
      itemId: item._id,
      metadata: { taskTitle: title, type, assigneeNames: assigneeNames || null },
    });

    return NextResponse.json(toProjectItemDTO(item), { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/items", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
