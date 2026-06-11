import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { toProjectDTO, toProjectItemDTO, toProjectUpdateDTO } from "@/lib/project-serializers";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import { ProjectUpdate } from "@/models/ProjectUpdate";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDemoMode(request)) {
      const detail = demoProjectsStore.getDetail(id);
      if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(detail);
    }

    await connectDB();
    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDemoMode(request)) {
      const ok = demoProjectsStore.deleteProject(id);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    await connectDB();
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
