import { connectDB } from "./mongodb";
import { hashPassword, masterModules } from "./auth";
import { User } from "@/models/User";

let seeded = false;

export async function ensureMasterAdmin(): Promise<void> {
  if (seeded) return;

  const email = (process.env.MASTER_ADMIN_EMAIL ?? "rush@gmail.com").toLowerCase().trim();
  const password = process.env.MASTER_ADMIN_PASSWORD ?? "rush@123";

  await connectDB();

  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      email,
      passwordHash: await hashPassword(password),
      name: "Master Admin",
      role: "master",
      modules: masterModules(),
      isActive: true,
    });
    console.log("[auth] Master admin created:", email);
  }

  seeded = true;
}
