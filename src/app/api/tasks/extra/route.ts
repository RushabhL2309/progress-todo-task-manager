import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoProjectsStore } from "@/lib/demo-projects-store";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/request-user";
import { toExtraTaskDTO } from "@/lib/serializers";
import { ExtraTask } from "@/models/ExtraTask";
import { ProjectItem } from "@/models/ProjectItem";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (isDemoMode(request)) {
      if (date) return NextResponse.json(demoStore.getExtras(date));
      if (from && to) return NextResponse.json(demoStore.getExtrasInRange(from, to));
      return NextResponse.json({ error: "Provide date or from+to query params" }, { status: 400 });
    }

    await connectDB();
    const user = getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userFilter = { userId: user.id };

    if (date) {
      const tasks = await ExtraTask.find({ date, ...userFilter }).sort({ createdAt: 1 });
      return NextResponse.json(tasks.map(toExtraTaskDTO));
    }

    if (from && to) {
      const tasks = await ExtraTask.find({ date: { $gte: from, $lte: to }, ...userFilter }).sort({
        date: 1,
        createdAt: 1,
      });
      return NextResponse.json(tasks.map(toExtraTaskDTO));
    }

    return NextResponse.json({ error: "Provide date or from+to query params" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/tasks/extra", error);
    return NextResponse.json({ error: "Failed to fetch extra tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      if (projectId) {
        const item = demoProjectsStore.addItem(projectId, {
          title: name,
          description: "Today's goal from extra work",
          type: "task",
          dueDate: date,
        });
        if (!item) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        return NextResponse.json(
          demoStore.addExtraTask(name, date, { projectId, projectItemId: item.id }),
          { status: 201 }
        );
      }
      return NextResponse.json(demoStore.addExtraTask(name, date), { status: 201 });
    }

    await connectDB();
    const user = getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (projectId) {
      const count = await ProjectItem.countDocuments({ projectId });
      const item = await ProjectItem.create({
        projectId,
        title: name,
        description: "Today's goal from extra work",
        type: "task",
        dueDate: date,
        sortOrder: count,
      });
      const task = await ExtraTask.create({
        name,
        date,
        projectId,
        projectItemId: item._id,
        userId: user.id,
      });
      return NextResponse.json(toExtraTaskDTO(task), { status: 201 });
    }

    const task = await ExtraTask.create({ name, date, userId: user.id });
    return NextResponse.json(toExtraTaskDTO(task), { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/extra", error);
    return NextResponse.json({ error: "Failed to create extra task" }, { status: 500 });
  }
}
