import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { toCompletionDTO } from "@/lib/serializers";
import { Completion } from "@/models/Completion";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to query params are required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      const grid = demoStore.getGrid("week", from);
      const completions = Object.entries(grid.completions)
        .filter(([key]) => {
          const date = key.split(":")[1];
          return date && date >= from && date <= to;
        })
        .map(([key]) => {
          const [taskId, date] = key.split(":");
          return { id: key, scheduledTaskId: taskId, date, completed: true };
        });
      return NextResponse.json(completions);
    }

    await connectDB();
    const completions = await Completion.find({
      date: { $gte: from, $lte: to },
      completed: true,
    });
    return NextResponse.json(completions.map(toCompletionDTO));
  } catch (error) {
    console.error("GET /api/completions", error);
    return NextResponse.json({ error: "Failed to fetch completions" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    const date =
      typeof body.date === "string"
        ? body.date
        : typeof body.dateKey === "string"
          ? body.dateKey
          : "";
    const completed = Boolean(body.completed);

    if (!taskId || !date) {
      return NextResponse.json({ error: "taskId and date are required" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      return NextResponse.json(demoStore.toggleCompletion(taskId, date, completed));
    }

    await connectDB();

    if (!completed) {
      await Completion.findOneAndDelete({ scheduledTaskId: taskId, date });
      return NextResponse.json({ taskId, date, completed: false });
    }

    const completion = await Completion.findOneAndUpdate(
      { scheduledTaskId: taskId, date },
      { completed: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(toCompletionDTO(completion));
  } catch (error) {
    console.error("PATCH /api/completions", error);
    return NextResponse.json({ error: "Failed to update completion" }, { status: 500 });
  }
}
