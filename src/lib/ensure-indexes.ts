import { Completion } from "@/models/Completion";
import { ExtraTask } from "@/models/ExtraTask";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";
import { ProjectUpdate } from "@/models/ProjectUpdate";
import { ScheduledTask } from "@/models/ScheduledTask";

let indexesReady = false;

/** Creates MongoDB collections + indexes on first real DB connection (Vercel-safe). */
export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;

  await Promise.all([
    ScheduledTask.createIndexes(),
    Completion.createIndexes(),
    ExtraTask.createIndexes(),
    Project.createIndexes(),
    ProjectItem.createIndexes(),
    ProjectUpdate.createIndexes(),
  ]);

  indexesReady = true;
}
