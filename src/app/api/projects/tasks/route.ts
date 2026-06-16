import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { logProjectActivity } from "@/lib/project-activity";
import { canAssignUserToProject, getAccessibleProjects, taskListFilter } from "@/lib/project-tasks";
import { toProjectItemDTO } from "@/lib/project-serializers";
import type { ProjectItemType, ProjectTaskDTO } from "@/lib/types";
import { ProjectItem } from "@/models/ProjectItem";
import { User } from "@/models/User";

export async function GET(request: Request) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  await connectDB();
  const projects = await getAccessibleProjects(auth.user);
  const projectIds = projects.map((p) => p._id);
  const nameMap = Object.fromEntries(projects.map((p) => [p._id.toString(), p.name]));

  const items = await ProjectItem.find(taskListFilter(auth.user, projectIds)).sort({
    createdAt: -1,
  });

  const userIds = [
    ...new Set(
      items
        .flatMap((i) => [
          i.assignedUserId?.toString(),
          ...(i.assignedUserIds ?? []).map((id) => id.toString()),
          i.createdBy?.toString(),
        ])
        .filter((x): x is string => Boolean(x))
    ),
  ];
  const users = await User.find({ _id: { $in: userIds } });
  const userNameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  const dtos: ProjectTaskDTO[] = items.map((doc) => {
    const base = toProjectItemDTO(doc);
    return {
      ...base,
      projectName: base.projectId ? nameMap[base.projectId] ?? "Project" : null,
      assignedUserName: ((base.assignedUserIds ?? []).length > 0
        ? (base.assignedUserIds ?? []).map((id) => userNameMap[id] ?? "User").join(", ")
        : base.assignedUserId
          ? userNameMap[base.assignedUserId] ?? "User"
          : null),
      createdByName: base.createdBy ? userNameMap[base.createdBy] ?? "User" : null,
    };
  });

  return NextResponse.json(dtos);
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const type = (["issue", "feature", "task"].includes(body.type)
      ? body.type
      : "task") as ProjectItemType;
    const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
    const projectId =
      typeof body.projectId === "string" && body.projectId ? body.projectId : null;
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

    await connectDB();

    let projectOid: mongoose.Types.ObjectId | null = null;
    if (projectId) {
      const projects = await getAccessibleProjects(auth.user);
      const project = projects.find((p) => p._id.toString() === projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (assignedUserIds.some((uid: string) => !canAssignUserToProject(project, uid))) {
        return NextResponse.json(
          { error: "Assignee must be a user on this project" },
          { status: 400 }
        );
      }
      projectOid = project._id;
    }

    const count = await ProjectItem.countDocuments(
      projectOid ? { projectId: projectOid } : { projectId: null, createdBy: auth.user.id }
    );

    const item = await ProjectItem.create({
      projectId: projectOid,
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

    if (projectOid) {
      const assigneeUsers = assignedUserIds.length > 0 ? await User.find({ _id: { $in: assignedUserIds } }) : [];
      const assigneeNames = assigneeUsers.map((u) => u.name).join(", ");
      await logProjectActivity({
        projectId: projectOid,
        userId: auth.user.id,
        action: "task_created",
        description: assigneeNames
          ? `Task created: ${title} → ${assigneeNames}`
          : `Task created: ${title}`,
        itemId: item._id,
        metadata: { taskTitle: title, type, assigneeNames: assigneeNames || null },
      });
    }

    const dto = toProjectItemDTO(item);
    let projectName: string | null = null;
    let assignedUserName: string | null = null;
    if (dto.projectId) {
      const projects = await getAccessibleProjects(auth.user);
      projectName = projects.find((p) => p._id.toString() === dto.projectId)?.name ?? null;
    }
    const assignedIds = dto.assignedUserIds ?? (dto.assignedUserId ? [dto.assignedUserId] : []);
    if (assignedIds.length > 0) {
      const users = await User.find({ _id: { $in: assignedIds } });
      assignedUserName = users.map((u) => u.name).join(", ") || null;
    }

    return NextResponse.json(
      {
        ...dto,
        projectName,
        assignedUserName,
        createdByName: auth.user.name,
      } satisfies ProjectTaskDTO,
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/projects/tasks", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
