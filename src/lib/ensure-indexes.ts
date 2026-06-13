import { ensureMasterAdmin } from "./seed-admin";
import { nameKeyFrom } from "./user-login";

let indexesReady = false;

async function prepareUserCollection() {
  const { User } = await import("@/models/User");

  const missing = await User.find({
    $or: [{ nameKey: { $exists: false } }, { nameKey: null }, { nameKey: "" }],
  });
  for (const user of missing) {
    user.nameKey = nameKeyFrom(user.name);
    await user.save();
  }

  try {
    const indexes = await User.collection.indexes();
    const emailIdx = indexes.find((i) => i.name === "email_1");
    if (emailIdx) {
      await User.collection.dropIndex("email_1");
    }
  } catch {
    /* index may not exist */
  }

  await User.createIndexes();
}

/** Creates MongoDB collections + indexes on first real DB connection (Vercel-safe). */
export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;

  await prepareUserCollection();

  const { ClientProject } = await import("@/models/ClientProject");
  const { ClientProjectEvent } = await import("@/models/ClientProjectEvent");
  const { ClientReminder } = await import("@/models/ClientReminder");
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
    ClientReminder.createIndexes(),
    ChatGroup.createIndexes(),
    ChatMessage.createIndexes(),
  ]);

  const { ChatRead } = await import("@/models/ChatRead");
  await ChatRead.createIndexes();

  indexesReady = true;
  await ensureMasterAdmin();
}
