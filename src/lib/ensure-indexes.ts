import { Completion } from "@/models/Completion";
import { ExtraTask } from "@/models/ExtraTask";
import { ScheduledTask } from "@/models/ScheduledTask";

let indexesReady = false;

/** Creates MongoDB collections + indexes on first real DB connection (Vercel-safe). */
export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;

  await Promise.all([
    ScheduledTask.createIndexes(),
    Completion.createIndexes(),
    ExtraTask.createIndexes(),
  ]);

  indexesReady = true;
}
