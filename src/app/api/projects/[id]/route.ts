import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireModule } from "@/lib/api-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { canAccessProject } from "@/lib/permissions";
import { toProjectDTO, toProjectItemDTO, toProjectUpdateDTO } from "@/lib/project-serializers";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import { ProjectUpdate } from "@/models/ProjectUpdate";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModule(request, "projects");
    if (auth.error) return auth.error;

    const { id } = await params;

    if (isDemoMode(request)) {
      const detail = demoProjectsStore.getDetail(id);
      if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(detail);
    }

    await connectDB();
    const project = await Project.findById(id);
    if (!project || !canAccessProject(auth.user, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [items, updates] = await Promise.all([
      ProjectItem.find({ projectId: id }).sort({ sortOrder: 1, createdAt: 1 }),
      ProjectUpdate.find({ projectId: id }).sort({ createdAt: -1 }),
    ]);

    const itemDTOs = items.map(toProjectItemDTO);

    return NextResponse.json({
      project: toProjectDTO(project, itemDTOs),
      items: itemDTOs,
      updates: updates.map(toProjectUpdateDTO),
    });
  } catch (error) {
    console.error("GET /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    const project = await Project.findById(id);
    if (!project || !canAccessProject(auth.user, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (typeof body.name === "string" && body.name.trim()) project.name = body.name.trim();
    if (typeof body.description === "string") project.description = body.description.trim();
    if (body.deadline !== undefined) {
      project.deadline = typeof body.deadline === "string" ? body.deadline : null;
    }
    if (Array.isArray(body.assignedUserIds)) {
      project.assignedUserIds = body.assignedUserIds.map(
        (uid: string) => new mongoose.Types.ObjectId(uid)
      );
      if (project.linkedClientId) {
        const { ClientProject } = await import("@/models/ClientProject");
        await ClientProject.findByIdAndUpdate(project.linkedClientId, {
          assignedUserIds: project.assignedUserIds,
        });
      }
    }

    await project.save();
    const items = await ProjectItem.find({ projectId: id });
    return NextResponse.json(toProjectDTO(project, items.map(toProjectItemDTO)));
  } catch (error) {
    console.error("PATCH /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModule(request, "projects");
    if (auth.error) return auth.error;

    const { id } = await params;

    if (isDemoMode(request)) {
      const ok = demoProjectsStore.deleteProject(id);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    await connectDB();
    const project = await Project.findById(id);
    if (!project || !canAccessProject(auth.user, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await Promise.all([
      ProjectItem.deleteMany({ projectId: id }),
      ProjectUpdate.deleteMany({ projectId: id }),
      Project.findByIdAndDelete(id),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
