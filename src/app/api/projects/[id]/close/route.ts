import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { canAccessProject } from "@/lib/permissions";
import { logProjectActivity } from "@/lib/project-activity";
import { toProjectDTO, toProjectItemDTO } from "@/lib/project-serializers";
import { ClientProject } from "@/models/ClientProject";
import { ClientProjectEvent } from "@/models/ClientProjectEvent";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModule(request, "projects");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const paymentReceived = Boolean(body.paymentReceived);

    await connectDB();
    const project = await Project.findById(id);
    if (!project || !canAccessProject(auth.user, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    project.status = "completed";
    await project.save();

    await logProjectActivity({
      projectId: id,
      userId: auth.user.id,
      action: "project_closed",
      description: paymentReceived
        ? "Project closed — payment received"
        : "Project closed — moved to payment due",
      metadata: { paymentReceived },
    });

    if (project.linkedClientId) {
      const client = await ClientProject.findById(project.linkedClientId);
      if (client) {
        const prev = client.stage;
        client.stage = paymentReceived ? "closed" : "payment_due";
        await client.save();
        await ClientProjectEvent.create({
          clientProjectId: client._id,
          userId: auth.user.id,
          action: "project_closed",
          description: paymentReceived
            ? "Project closed — payment received"
            : "Project closed — moved to payment due",
          fromStage: prev,
          toStage: client.stage,
          metadata: { projectId: id, paymentReceived },
        });
      }
    }

    const items = await ProjectItem.find({ projectId: id });
    return NextResponse.json({
      project: toProjectDTO(project, items.map(toProjectItemDTO)),
      clientStage: paymentReceived ? "closed" : "payment_due",
    });
  } catch (error) {
    console.error("POST /api/projects/[id]/close", error);
    return NextResponse.json({ error: "Failed to close project" }, { status: 500 });
  }
}
