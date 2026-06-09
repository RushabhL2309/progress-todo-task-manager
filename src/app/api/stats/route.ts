import { NextResponse } from "next/server";
import { getColumnsForView, parseDateKey } from "@/lib/dates";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { calculatePeriodStats } from "@/lib/score";
import { completionsToMap, toExtraTaskDTO, toScheduledTaskDTO } from "@/lib/serializers";
import type { ViewMode } from "@/lib/types";
import { Completion } from "@/models/Completion";
import { ExtraTask } from "@/models/ExtraTask";
import { ScheduledTask } from "@/models/ScheduledTask";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") ?? "week") as ViewMode;
    const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    if (!["day", "week", "month"].includes(view)) {
      return NextResponse.json({ error: "Invalid view mode" }, { status: 400 });
    }

    if (isDemoMode(request)) {
      return NextResponse.json(demoStore.getStats(view, dateParam));
    }

    const anchorDate = parseDateKey(dateParam);
    const columns = getColumnsForView(view, anchorDate);
    const from = columns[0]?.dateKey;
    const to = columns[columns.length - 1]?.dateKey;

    if (!from || !to) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    await connectDB();

    const [scheduledDocs, completionDocs, extraDocs] = await Promise.all([
      ScheduledTask.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }),
      Completion.find({ date: { $gte: from, $lte: to }, completed: true }),
      ExtraTask.find({ date: { $gte: from, $lte: to } }),
    ]);

    const scheduledTasks = scheduledDocs.map(toScheduledTaskDTO);
    const completions = completionsToMap(completionDocs);
    const extras = extraDocs.map(toExtraTaskDTO);

    const stats = calculatePeriodStats(view, anchorDate, scheduledTasks, completions, extras);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/stats", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
