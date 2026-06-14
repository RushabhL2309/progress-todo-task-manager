import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import type { SessionUser } from "@/lib/auth-types";
import { projectAccessFilter } from "@/lib/permissions";
import { projectStatsFromItems, toProjectDTO } from "@/lib/project-serializers";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import type { ProjectDTO, ProjectItemDTO, ProjectItemType } from "@/lib/types";

async function listWithStats(user: SessionUser) {
  const access = projectAccessFilter(user);
  const projects = await Project.find(access).sort({ updatedAt: -1 }).lean();
  const ids = projects.map((p) => p._id);
  const allItems = ids.length
    ? await ProjectItem.find(
        { projectId: { $in: ids } },
        { projectId: 1, type: 1, status: 1, dueDate: 1 }
      ).lean()
    : [];
  const itemsByProject = new Map<
    string,
    { type: ProjectItemType; status: ProjectItemDTO["status"]; dueDate: string | null }[]
  >();
  for (const item of allItems) {
    if (!item.projectId) continue;
    const pid = item.projectId.toString();
    const list = itemsByProject.get(pid) ?? [];
    list.push({
      type: item.type as ProjectItemDTO["type"],
      status: item.status as ProjectItemDTO["status"],
      dueDate: item.dueDate ?? null,
    });
    itemsByProject.set(pid, list);
  }
  return projects.map((p) => {
    const stats = projectStatsFromItems(itemsByProject.get(p._id.toString()) ?? []);
    return {
      id: p._id.toString(),
      name: p.name,
      description: p.description ?? "",
      status: p.status as ProjectDTO["status"],
      color: p.color ?? "#5B7C6B",
      createdAt: new Date(p.createdAt).toISOString(),
      updatedAt: new Date(p.updatedAt).toISOString(),
      deadline: p.deadline ?? null,
      createdBy: p.createdBy?.toString() ?? "",
      assignedUserIds: (p.assignedUserIds ?? []).map((id) => id.toString()),
      linkedClientId: p.linkedClientId?.toString() ?? null,
      ...stats,
    } satisfies ProjectDTO;
  });
}

export async function GET(request: Request) {
  try {
    const auth = await requireModule(request, "projects");
    if (auth.error) return auth.error;

    if (isDemoMode(request)) {
      return NextResponse.json(demoProjectsStore.list());
    }

    await connectDB();
    return NextResponse.json(await listWithStats(auth.user));
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
