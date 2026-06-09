import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { ScheduledTask } from "@/models/ScheduledTask";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDemoMode(_request)) {
      const ok = demoStore.deleteScheduledTask(id);
      if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    await connectDB();
    const task = await ScheduledTask.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/scheduled/[id]", error);
    return NextResponse.json({ error: "Failed to delete scheduled task" }, { status: 500 });
  }
}
