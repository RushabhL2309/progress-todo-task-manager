import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { connectDB } from "@/lib/mongodb";
import { toProjectDTO, toProjectItemDTO } from "@/lib/project-serializers";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";

export async function GET(request: Request) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(demoProjectsStore.dashboard());
    }

    await connectDB();
    const projects = await Project.find().sort({ updatedAt: -1 });
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
    const list = projects.map((p) =>
      toProjectDTO(p, itemsByProject.get(p._id.toString()) ?? [])
    );

    return NextResponse.json({
      totalProjects: list.length,
      activeProjects: list.filter((p) => p.status === "active").length,
      openIssues: list.reduce((s, p) => s + p.openCount, 0),
      resolvedIssues: list.reduce((s, p) => s + p.resolvedCount, 0),
      projects: list,
    });
  } catch (error) {
    console.error("GET /api/projects/dashboard", error);
    return NextResponse.json({ error: "Failed to fetch project dashboard" }, { status: 500 });
  }
}
