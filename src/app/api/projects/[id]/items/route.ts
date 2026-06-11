import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { toProjectItemDTO } from "@/lib/project-serializers";
import type { ProjectItemType } from "@/lib/types";
import { ProjectItem } from "@/models/ProjectItem";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const type = (["issue", "feature", "task"].includes(body.type)
      ? body.type
      : "task") as ProjectItemType;
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      const item = demoProjectsStore.addItem(projectId, { title, description, type, dueDate });
      if (!item) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      return NextResponse.json(item, { status: 201 });
    }

    await connectDB();
    const count = await ProjectItem.countDocuments({ projectId });
    const item = await ProjectItem.create({
      projectId,
      title,
      description,
      type,
      dueDate,
      sortOrder: count,
    });
    return NextResponse.json(toProjectItemDTO(item), { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/items", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
