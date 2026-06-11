import { NextResponse } from "next/server";
import { getColumnsForView, parseDateKey } from "@/lib/dates";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { calculatePeriodStats } from "@/lib/score";
import { completionsToMap, toExtraTaskDTO, toScheduledTaskDTO } from "@/lib/serializers";
import type { ExtraDaySummary, ViewMode } from "@/lib/types";
import { Completion } from "@/models/Completion";
import { ExtraTask } from "@/models/ExtraTask";
import { ScheduledTask } from "@/models/ScheduledTask";

/** Single round-trip for main app data — faster initial load */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") ?? "week") as ViewMode;
    const anchorDate = searchParams.get("anchorDate") ?? new Date().toISOString().slice(0, 10);
    const selectedDate = searchParams.get("selectedDate") ?? anchorDate;
    const todoDate = searchParams.get("todoDate") ?? anchorDate;

    if (isDemoMode(request)) {
      const columns = getColumnsForView(view, parseDateKey(anchorDate));
      const from = columns[0]?.dateKey ?? anchorDate;
      const to = columns[columns.length - 1]?.dateKey ?? anchorDate;
      const gridData = demoStore.getGrid(view, anchorDate);
      const scheduledTasks = demoStore.getScheduledTasks();
      const completions = gridData.completions;
      const rangeExtras = demoStore.getExtrasInRange(from, to);
      const stats = calculatePeriodStats(
        view,
        parseDateKey(anchorDate),
        scheduledTasks,
        completions,
        rangeExtras
      );

      return NextResponse.json({
        scheduledTasks,
        grid: gridData,
        stats,
        extrasSelected: demoStore.getExtras(selectedDate),
        extrasTodo: demoStore.getExtras(todoDate),
        extrasRange: rangeExtras,
      });
    }

    const anchor = parseDateKey(anchorDate);
    const columns = getColumnsForView(view, anchor);
    const from = columns[0]?.dateKey ?? anchorDate;
    const to = columns[columns.length - 1]?.dateKey ?? anchorDate;

    await connectDB();

    const [scheduledDocs, completionDocs, extraSelected, extraTodo, extraRange, extraAgg] =
      await Promise.all([
        ScheduledTask.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }),
        Completion.find({ date: { $gte: from, $lte: to }, completed: true }),
        ExtraTask.find({ date: selectedDate }).sort({ createdAt: 1 }),
        ExtraTask.find({ date: todoDate }).sort({ createdAt: 1 }),
        ExtraTask.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, createdAt: 1 }),
        ExtraTask.aggregate<{ _id: string; total: number; completed: number }>([
          { $match: { date: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: "$date",
              total: { $sum: 1 },
              completed: { $sum: { $cond: ["$completed", 1, 0] } },
            },
          },
        ]),
      ]);

    const scheduledTasks = scheduledDocs.map(toScheduledTaskDTO);
    const completions = completionsToMap(completionDocs);
    const extraSummaries: ExtraDaySummary[] = extraAgg.map((row) => ({
      dateKey: row._id,
      total: row.total,
      completed: row.completed,
    }));

    const grid = {
      scheduledTasks,
      completions,
      extraSummaries,
      columns,
    };

    const stats = calculatePeriodStats(
      view,
      anchor,
      scheduledTasks,
      completions,
      extraRange.map(toExtraTaskDTO)
    );

    return NextResponse.json({
      scheduledTasks,
      grid,
      stats,
      extrasSelected: extraSelected.map(toExtraTaskDTO),
      extrasTodo: extraTodo.map(toExtraTaskDTO),
      extrasRange: extraRange.map(toExtraTaskDTO),
    });
  } catch (error) {
    console.error("GET /api/bootstrap", error);
    return NextResponse.json({ error: "Failed to load app data" }, { status: 500 });
  }
}
