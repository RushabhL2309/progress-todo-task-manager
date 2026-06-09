import { addDays, format, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { connectDB } from "@/lib/mongodb";
import { toExtraTaskDTO } from "@/lib/serializers";
import { ExtraTask } from "@/models/ExtraTask";

function nextDateKey(fromDate: string): string {
  return format(addDays(parseISO(fromDate), 1), "yyyy-MM-dd");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";

    if (!fromDate) {
      return NextResponse.json({ error: "fromDate is required" }, { status: 400 });
    }

    const toDate = nextDateKey(fromDate);

    if (isDemoMode(request)) {
      const result = demoStore.carryForwardExtras(fromDate, toDate);
      return NextResponse.json(result);
    }

    await connectDB();

    const incomplete = await ExtraTask.find({ date: fromDate, completed: false });
    const existingTomorrow = await ExtraTask.find({ date: toDate });
    const existingNames = new Set(existingTomorrow.map((t) => t.name.toLowerCase()));

    const created = [];
    for (const task of incomplete) {
      if (existingNames.has(task.name.toLowerCase())) continue;
      const copy = await ExtraTask.create({ name: task.name, date: toDate, completed: false });
      created.push(toExtraTaskDTO(copy));
      existingNames.add(task.name.toLowerCase());
    }

    return NextResponse.json({ carried: created.length, toDate, tasks: created });
  } catch (error) {
    console.error("POST /api/tasks/extra/carry-forward", error);
    return NextResponse.json({ error: "Failed to carry forward tasks" }, { status: 500 });
  }
}
