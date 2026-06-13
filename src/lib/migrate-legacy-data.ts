import mongoose from "mongoose";
import { ClientProject } from "@/models/ClientProject";
import { ExtraTask } from "@/models/ExtraTask";
import { Project } from "@/models/Project";
import { ScheduledTask } from "@/models/ScheduledTask";
import { User } from "@/models/User";

const missingUserId = {
  $or: [{ userId: null }, { userId: { $exists: false } }],
};

const missingCreator = {
  $or: [{ createdBy: null }, { createdBy: { $exists: false } }],
};

/** Assign pre-auth rows (no userId/createdBy) to the master admin account. */
export async function migrateLegacyDataToMaster(): Promise<void> {
  const email = (process.env.MASTER_ADMIN_EMAIL ?? "rush@gmail.com").toLowerCase().trim();
  const master = await User.findOne({ email, role: "master" });
  if (!master) return;

  const masterId = master._id as mongoose.Types.ObjectId;

  const [sched, extra, projects, clients] = await Promise.all([
    ScheduledTask.updateMany(missingUserId, { $set: { userId: masterId } }),
    ExtraTask.updateMany(missingUserId, { $set: { userId: masterId } }),
    Project.updateMany(missingCreator, { $set: { createdBy: masterId } }),
    ClientProject.updateMany(missingCreator, { $set: { createdBy: masterId } }),
  ]);

  const total =
    sched.modifiedCount +
    extra.modifiedCount +
    projects.modifiedCount +
    clients.modifiedCount;

  if (total > 0) {
    console.log(
      `[auth] Migrated ${total} legacy record(s) to master admin (${email})`
    );
  }
}
