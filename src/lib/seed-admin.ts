import { hashPassword, masterModules } from "./auth";
import { migrateLegacyDataToMaster } from "./migrate-legacy-data";
import { nameKeyFrom } from "./user-login";
import { User } from "@/models/User";

let seeded = false;

async function backfillNameKeys() {
  const users = await User.find({ $or: [{ nameKey: { $exists: false } }, { nameKey: null }, { nameKey: "" }] });
  for (const user of users) {
    user.nameKey = nameKeyFrom(user.name);
    await user.save();
  }
}

export async function ensureMasterAdmin(): Promise<void> {
  if (seeded) return;

  const email = (process.env.MASTER_ADMIN_EMAIL ?? "rush@gmail.com").toLowerCase().trim();
  const password = process.env.MASTER_ADMIN_PASSWORD ?? "rush@123";

  await backfillNameKeys();

  const existing = await User.findOne({ $or: [{ email }, { role: "master" }] });
  if (!existing) {
    await User.create({
      name: "Master Admin",
      nameKey: nameKeyFrom("Master Admin"),
      email,
      passwordHash: await hashPassword(password),
      role: "master",
      modules: masterModules(),
      isActive: true,
      emailUpdatesEnabled: true,
      passwordChangeEnabled: true,
    });
    console.log("[auth] Master admin created:", email);
  } else if (!existing.nameKey) {
    existing.nameKey = nameKeyFrom(existing.name);
    existing.emailUpdatesEnabled = true;
    existing.passwordChangeEnabled = true;
    await existing.save();
  }

  await migrateLegacyDataToMaster();

  seeded = true;
}
