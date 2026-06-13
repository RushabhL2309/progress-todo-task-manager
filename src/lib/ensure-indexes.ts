import { ensureMasterAdmin } from "./seed-admin";

let indexesReady = false;

/** Creates MongoDB collections + indexes on first real DB connection (Vercel-safe). */
export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;

  const { User } = await import("@/models/User");
  const { ClientProject } = await import("@/models/ClientProject");
  const { ClientProjectEvent } = await import("@/models/ClientProjectEvent");
  const { ChatGroup } = await import("@/models/ChatGroup");
  const { ChatMessage } = await import("@/models/ChatMessage");
  const { Completion } = await import("@/models/Completion");
  const { ExtraTask } = await import("@/models/ExtraTask");
  const { Project } = await import("@/models/Project");
  const { ProjectItem } = await import("@/models/ProjectItem");
  const { ProjectUpdate } = await import("@/models/ProjectUpdate");
  const { ProjectActivity } = await import("@/models/ProjectActivity");
  const { TaskMessage } = await import("@/models/TaskMessage");
  const { ScheduledTask } = await import("@/models/ScheduledTask");

  await Promise.all([
    User.createIndexes(),
    ScheduledTask.createIndexes(),
    Completion.createIndexes(),
    ExtraTask.createIndexes(),
    Project.createIndexes(),
    ProjectItem.createIndexes(),
    ProjectUpdate.createIndexes(),
    ProjectActivity.createIndexes(),
    TaskMessage.createIndexes(),
    ClientProject.createIndexes(),
    ClientProjectEvent.createIndexes(),
    ChatGroup.createIndexes(),
    ChatMessage.createIndexes(),
  ]);

  const { ChatRead } = await import("@/models/ChatRead");
  await ChatRead.createIndexes();

  indexesReady = true;
  await ensureMasterAdmin();
}
