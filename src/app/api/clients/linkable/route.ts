import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { toClientProjectDTO } from "@/lib/client-serializers";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter, hasModule } from "@/lib/permissions";
import { ClientProject } from "@/models/ClientProject";

/** Clients available to link when creating a project */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "projects")) {
    return NextResponse.json({ error: "Module not enabled" }, { status: 403 });
  }

  await connectDB();
  const filter = {
    linkedProjectId: null,
    ...(clientAccessFilter(auth.user)),
  };
  const items = await ClientProject.find(filter).sort({ updatedAt: -1 });
  return NextResponse.json(items.map(toClientProjectDTO));
}
