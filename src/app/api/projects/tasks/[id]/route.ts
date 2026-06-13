import { NextResponse } from "next/server";

import mongoose from "mongoose";

import { requireModule } from "@/lib/api-auth";

import { connectDB } from "@/lib/mongodb";

import { logProjectActivity, canAccessTaskChat } from "@/lib/project-activity";

import { canAccessTaskItem, canAssignUserToProject } from "@/lib/project-tasks";

import { toProjectItemDTO } from "@/lib/project-serializers";

import { Project, type ProjectDocument } from "@/models/Project";

import { ProjectItem, type ProjectItemDocument } from "@/models/ProjectItem";

import { TaskMessage } from "@/models/TaskMessage";

import { User } from "@/models/User";

import type { ProjectTaskDTO, TaskMessageDTO } from "@/lib/types";



async function enrichTaskDto(
  item: ProjectItemDocument,
  project: ProjectDocument | null
): Promise<ProjectTaskDTO> {
  const dto = toProjectItemDTO(item);

  let projectName: string | null = null;

  let assignedUserName: string | null = null;

  let createdByName: string | null = null;

  if (dto.projectId && project) projectName = project.name;

  const userIds = [dto.assignedUserId, dto.createdBy].filter(Boolean) as string[];

  if (userIds.length > 0) {

    const users = await User.find({ _id: { $in: userIds } });

    const map = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

    assignedUserName = dto.assignedUserId ? map[dto.assignedUserId] ?? null : null;

    createdByName = dto.createdBy ? map[dto.createdBy] ?? null : null;

  }

  return { ...dto, projectName, assignedUserName, createdByName };

}



export async function GET(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  const auth = await requireModule(request, "projects");

  if (auth.error) return auth.error;



  try {

    const { id } = await params;

    await connectDB();



    const item = await ProjectItem.findById(id);

    if (!item) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    const project = item.projectId ? await Project.findById(item.projectId) : null;

    if (!canAccessTaskItem(auth.user, item, project)) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    const task = await enrichTaskDto(item, project);

    const canChat = canAccessTaskChat(auth.user.id, auth.user.role, {

      createdBy: task.createdBy,

      assignedUserId: task.assignedUserId,

    });



    let messages: TaskMessageDTO[] = [];

    if (canChat) {

      const msgs = await TaskMessage.find({ itemId: id }).sort({ createdAt: 1 }).limit(100);

      const senderIds = [...new Set(msgs.map((m) => m.senderId.toString()))];

      const senders = await User.find({ _id: { $in: senderIds } });

      const nameMap = Object.fromEntries(senders.map((u) => [u._id.toString(), u.name]));

      messages = msgs.map((m) => ({

        id: m._id.toString(),

        itemId: id,

        senderId: m.senderId.toString(),

        senderName: nameMap[m.senderId.toString()] ?? "User",

        text: m.text,

        createdAt: m.createdAt.toISOString(),

      }));

    }



    return NextResponse.json({ task, messages, canChat });

  } catch (error) {

    console.error("GET /api/projects/tasks/[id]", error);

    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });

  }

}



export async function PATCH(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  const auth = await requireModule(request, "projects");

  if (auth.error) return auth.error;



  try {

    const { id } = await params;

    const body = await request.json();

    await connectDB();



    const item = await ProjectItem.findById(id);

    if (!item) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    const project = item.projectId ? await Project.findById(item.projectId) : null;

    if (!canAccessTaskItem(auth.user, item, project)) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    const prevStatus = item.status;

    const prevAssignee = item.assignedUserId?.toString() ?? null;



    if (typeof body.status === "string" && ["open", "resolved"].includes(body.status)) {

      if (body.status === "resolved" && prevStatus === "open") {

        const note =

          typeof body.completionNote === "string" ? body.completionNote.trim() : "";

        if (!note) {

          return NextResponse.json(

            { error: "Describe what was performed to complete this task" },

            { status: 400 }

          );

        }

        item.completionNote = note;

        item.status = "resolved";

        if (item.projectId) {

          await logProjectActivity({

            projectId: item.projectId,

            userId: auth.user.id,

            action: "task_completed",

            description: `Completed: ${item.title} — ${note}`,

            itemId: item._id,

            metadata: { completionNote: note, taskTitle: item.title },

          });

        }

      } else if (body.status === "open" && prevStatus === "resolved") {

        item.status = "open";

        if (item.projectId) {

          await logProjectActivity({

            projectId: item.projectId,

            userId: auth.user.id,

            action: "task_reopened",

            description: `Reopened: ${item.title}`,

            itemId: item._id,

            metadata: { taskTitle: item.title },

          });

        }

      } else {

        item.status = body.status;

      }

    }



    if (body.assignedUserId !== undefined) {

      const assignee =

        typeof body.assignedUserId === "string" && body.assignedUserId

          ? body.assignedUserId

          : null;

      if (assignee && project && !canAssignUserToProject(project, assignee)) {

        return NextResponse.json(

          { error: "Assignee must be a user on this project" },

          { status: 400 }

        );

      }

      item.assignedUserId = assignee ? new mongoose.Types.ObjectId(assignee) : null;

      if (assignee !== prevAssignee && item.projectId) {

        const assigneeUser = assignee ? await User.findById(assignee) : null;

        await logProjectActivity({

          projectId: item.projectId,

          userId: auth.user.id,

          action: "task_assigned",

          description: assigneeUser

            ? `Assigned "${item.title}" to ${assigneeUser.name}`

            : `Unassigned "${item.title}"`,

          itemId: item._id,

          metadata: {

            taskTitle: item.title,

            assigneeId: assignee,

            assigneeName: assigneeUser?.name ?? null,

          },

        });

      }

    }



    if (typeof body.title === "string" && body.title.trim()) {

      item.title = body.title.trim();

    }

    if (typeof body.dueDate === "string" || body.dueDate === null) {

      item.dueDate = body.dueDate;

    }



    await item.save();



    const dto = await enrichTaskDto(item, project);

    return NextResponse.json(dto);

  } catch (error) {

    console.error("PATCH /api/projects/tasks/[id]", error);

    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });

  }

}

