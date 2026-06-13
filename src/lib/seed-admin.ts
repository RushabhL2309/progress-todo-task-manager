import { hashPassword, masterModules } from "./auth";
import { MASTER_DISPLAY_NAME } from "./auth-types";
import { migrateLegacyDataToMaster } from "./migrate-legacy-data";
import { nameKeyFrom } from "./user-login";
import { User } from "@/models/User";

let seeded = false;

async function backfillNameKeys() {
  const users = await User.find({
    $or: [{ nameKey: { $exists: false } }, { nameKey: null }, { nameKey: "" }],
  });
  for (const user of users) {
    user.nameKey = nameKeyFrom(user.name);
    await user.save();
  }
}

async function ensureMasterProfile(master: InstanceType<typeof User>) {
  let changed = false;
  if (master.name === "Master Admin" || !master.name?.trim()) {
    master.name = MASTER_DISPLAY_NAME;
    master.nameKey = nameKeyFrom(MASTER_DISPLAY_NAME);
    changed = true;
  }
  if (!master.nameKey) {
    master.nameKey = nameKeyFrom(master.name);
    changed = true;
  }
  master.emailUpdatesEnabled = true;
  master.passwordChangeEnabled = true;
  if (!master.masterDataScope) {
    master.masterDataScope = "platform";
    changed = true;
  }
  if (changed) await master.save();
}

export async function ensureMasterAdmin(): Promise<void> {
  if (seeded) return;

  const email = (process.env.MASTER_ADMIN_EMAIL ?? "rush@gmail.com").toLowerCase().trim();
  const password = process.env.MASTER_ADMIN_PASSWORD ?? "rush@123";

  await backfillNameKeys();

  const existing = await User.findOne({ $or: [{ email }, { role: "master" }] });
  if (!existing) {
    await User.create({
      name: MASTER_DISPLAY_NAME,
      nameKey: nameKeyFrom(MASTER_DISPLAY_NAME),
      email,
      passwordHash: await hashPassword(password),
      role: "master",
      modules: masterModules(),
      isActive: true,
      emailUpdatesEnabled: true,
      passwordChangeEnabled: true,
      masterDataScope: "platform",
    });
    console.log("[auth] Master admin created:", MASTER_DISPLAY_NAME);
  } else {
    await ensureMasterProfile(existing);
  }

  await migrateLegacyDataToMaster();

  seeded = true;
}
