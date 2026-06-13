import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { projectAccessFilter } from "@/lib/permissions";
import { toProjectDTO, toProjectItemDTO } from "@/lib/project-serializers";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";

async function listWithStats(userId: string, role: string) {
  const access = projectAccessFilter({ id: userId, email: "", name: "", role: role as "master" | "user", modules: {} as never });
  const projects = await Project.find(access).sort({ updatedAt: -1 });
  const ids = projects.map((p) => p._id);
  const allItems = await ProjectItem.find({ projectId: { $in: ids } }).sort({
    sortOrder: 1,
    createdAt: 1,
  });
  const itemsByProject = new Map<string, ReturnType<typeof toProjectItemDTO>[]>();
  for (const item of allItems) {
    const pid = item.projectId.toString();
    const list = itemsByProject.get(pid) ?? [];
    list.push(toProjectItemDTO(item));
    itemsByProject.set(pid, list);
  }
  return projects.map((p) =>
    toProjectDTO(p, itemsByProject.get(p._id.toString()) ?? [])
  );
}

export async function GET(request: Request) {
  try {
    const auth = await requireModule(request, "projects");
    if (auth.error) return auth.error;

    if (isDemoMode(request)) {
      return NextResponse.json(demoProjectsStore.list());
    }

    await connectDB();
    return NextResponse.json(await listWithStats(auth.user.id, auth.user.role));
  } catch (error) {
    console.error("GET /api/projects", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireModule(request, "projects");
    if (auth.error) return auth.error;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const status = body.status === "paused" || body.status === "completed" ? body.status : "active";
    const deadline = typeof body.deadline === "string" ? body.deadline : null;
    const assignedUserIds = Array.isArray(body.assignedUserIds)
      ? body.assignedUserIds.filter((x: unknown) => typeof x === "string")
      : [];

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      return NextResponse.json(
        demoProjectsStore.createProject(name, description, status),
        { status: 201 }
      );
    }

    await connectDB();
    const linkedClientId =
      typeof body.linkedClientId === "string" ? body.linkedClientId.trim() : "";

    const project = await Project.create({
      name,
      description,
      status,
      deadline,
      createdBy: auth.user.id,
      assignedUserIds: assignedUserIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      linkedClientId: linkedClientId || null,
    });

    if (linkedClientId) {
      const { ClientProject } = await import("@/models/ClientProject");
      await ClientProject.findByIdAndUpdate(linkedClientId, {
        linkedProjectId: project._id,
        assignedUserIds: project.assignedUserIds,
      });
    }

    return NextResponse.json(toProjectDTO(project, []), { status: 201 });
  } catch (error) {
    console.error("POST /api/projects", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
