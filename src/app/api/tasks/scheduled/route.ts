import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { toScheduledTaskDTO } from "@/lib/serializers";
import { ScheduledTask } from "@/models/ScheduledTask";

export async function GET(request: Request) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(demoStore.getScheduledTasks());
    }

    await connectDB();
    const tasks = await ScheduledTask.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    return NextResponse.json(tasks.map(toScheduledTaskDTO));
  } catch (error) {
    console.error("GET /api/tasks/scheduled", error);
    return NextResponse.json({ error: "Failed to fetch scheduled tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Task name is required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      return NextResponse.json(demoStore.addScheduledTask(name), { status: 201 });
    }

    await connectDB();
    const count = await ScheduledTask.countDocuments({ isActive: true });
    const task = await ScheduledTask.create({ name, sortOrder: count });
    return NextResponse.json(toScheduledTaskDTO(task), { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/scheduled", error);
    return NextResponse.json({ error: "Failed to create scheduled task" }, { status: 500 });
  }
}
