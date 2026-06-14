import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import type { AppNotification } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter, hasModule, projectAccessFilter, viewsAllPlatformData } from "@/lib/permissions";
import { ChatGroup } from "@/models/ChatGroup";
import { ChatMessage } from "@/models/ChatMessage";
import { ChatRead } from "@/models/ChatRead";
import { ClientProject } from "@/models/ClientProject";
import { ClientReminder } from "@/models/ClientReminder";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";

const today = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  await connectDB();
  const uid = auth.user.id;
  const uidObj = new mongoose.Types.ObjectId(uid);
  const items: AppNotification[] = [];
  const now = today();

  const clientModule = hasModule(auth.user, "client_updates");
  const projectsModule = hasModule(auth.user, "projects");
  const chatModule = hasModule(auth.user, "chat");

  const clientFilter = clientModule ? clientAccessFilter(auth.user) : null;
  const projectAccess = projectsModule ? projectAccessFilter(auth.user) : null;

  const accessOr = viewsAllPlatformData(auth.user)
    ? []
    : [
        { assignedUserId: uidObj },
        { createdBy: uidObj },
        { assignedUserId: null, simple: true },
      ];

  const dueOr = [
    { dueDate: { $lte: now, $nin: [null, ""] } },
    { simple: true, $or: [{ dueDate: null }, { dueDate: "" }] },
  ];

  const reminderQuery =
    accessOr.length > 0 ? { $and: [{ $or: accessOr }, { $or: dueOr }] } : { $or: dueOr };

  const groupFilter = chatModule
    ? viewsAllPlatformData(auth.user)
      ? {}
      : { memberIds: uidObj }
    : null;

  const projects = projectsModule
    ? await Project.find({ ...projectAccess, status: { $ne: "completed" } }).lean()
    : [];
  const projectIds = projects.map((p) => p._id);
  const groups = chatModule ? await ChatGroup.find(groupFilter ?? {}).lean() : [];
  const chatGroupIds = groups.map((g) => g._id);

  const [clients, reminders, projectItems, chatReads, latestChatByGroup] = await Promise.all([
      clientModule
        ? ClientProject.find({
            ...clientFilter,
            followUpDate: { $ne: null },
            stage: { $in: ["enquiry", "running"] },
          }).lean()
        : Promise.resolve([]),
      clientModule
        ? ClientReminder.find(reminderQuery).populate("clientProjectId", "name stage").lean()
        : Promise.resolve([]),
      projectsModule && projectIds.length > 0
        ? ProjectItem.find({
            projectId: { $in: projectIds },
            status: "open",
            dueDate: { $ne: null },
          }).lean()
        : Promise.resolve([]),
      chatModule
        ? ChatRead.find({ userId: uid }).lean()
        : Promise.resolve([]),
      chatModule && chatGroupIds.length > 0
        ? ChatMessage.aggregate<{
            _id: mongoose.Types.ObjectId;
            text: string;
            createdAt: Date;
            msgId: mongoose.Types.ObjectId;
          }>([
            {
              $match: {
                groupId: { $in: chatGroupIds },
                senderId: { $ne: uidObj },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$groupId",
                text: { $first: "$text" },
                createdAt: { $first: "$createdAt" },
                msgId: { $first: "$_id" },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

  if (clientModule) {
    for (const c of clients) {
      if (!c.followUpDate) continue;
      const overdue = c.followUpDate < now;
      const dueToday = c.followUpDate === now;
      if (overdue || dueToday) {
        items.push({
          id: `client-fu-${c._id}`,
          type: "client_followup",
          title: overdue ? "Follow-up overdue" : "Follow-up today",
          body: `${c.name} — connect again ${overdue ? "(overdue)" : ""}`,
          page: "clients",
          entityId: c._id.toString(),
          severity: overdue ? "urgent" : "warning",
          createdAt: new Date().toISOString(),
        });
      }
    }

    for (const r of reminders) {
      const clientDoc = r.clientProjectId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
      } | null;
      if (!clientDoc?.name) continue;
      const clientId = clientDoc._id.toString();

      if (r.simple && !r.dueDate) {
        items.push({
          id: `client-rm-simple-${r._id}`,
          type: "client_reminder",
          title: "Reminder",
          body: `${clientDoc.name}: ${r.title}`,
          page: "clients",
          entityId: clientId,
          severity: "info",
          createdAt: new Date(r.createdAt).toISOString(),
        });
        continue;
      }

      if (!r.dueDate) continue;
      const overdue = r.dueDate < now;
      const dueToday = r.dueDate === now;
      if (overdue || dueToday) {
        items.push({
          id: `client-rm-${r._id}`,
          type: "client_reminder",
          title: overdue ? "Reminder overdue" : "Reminder today",
          body: `${clientDoc.name}: ${r.title}${r.dueTime ? ` at ${r.dueTime}` : ""}`,
          page: "clients",
          entityId: clientId,
          severity: overdue ? "urgent" : "warning",
          createdAt: new Date(r.createdAt).toISOString(),
        });
      }
    }
  }

  if (projectsModule) {
    const projectIdSet = new Set(projectIds.map((id) => id.toString()));

    for (const p of projects) {
      if (p.deadline) {
        const overdue = p.deadline < now;
        const dueToday = p.deadline === now;
        if (overdue || dueToday) {
          items.push({
            id: `proj-dl-${p._id}`,
            type: "project_deadline",
            title: overdue ? "Project deadline passed" : "Project due today",
            body: p.name,
            page: "projects",
            entityId: p._id.toString(),
            severity: overdue ? "urgent" : "warning",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    for (const item of projectItems) {
      if (!item.dueDate || !item.projectId) continue;
      if (!projectIdSet.has(item.projectId.toString())) continue;
      const overdue = item.dueDate < now;
      const dueToday = item.dueDate === now;
      if (overdue || dueToday) {
        items.push({
          id: `item-${item._id}`,
          type: overdue ? "item_overdue" : "item_due",
          title: overdue ? "Task overdue" : "Task due today",
          body: item.title,
          page: "projects",
          entityId: item.projectId.toString(),
          severity: overdue ? "urgent" : "info",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (chatModule && groups.length > 0) {
    const groupIds = new Set(groups.map((g) => g._id.toString()));
    const readMap = new Map(
      chatReads.map((r) => [r.groupId.toString(), r.lastReadAt ?? new Date(0)])
    );

    for (const row of latestChatByGroup) {
      const groupId = row._id.toString();
      if (!groupIds.has(groupId)) continue;
      const since = readMap.get(groupId) ?? new Date(0);
      if (row.createdAt <= since) continue;
      const group = groups.find((g) => g._id.toString() === groupId);
      if (!group) continue;
      items.push({
        id: `chat-${groupId}-${row.msgId}`,
        type: "chat",
        title: "New chat message",
        body: `${group.name}: ${row.text?.slice(0, 60) ?? "Image"}`,
        page: "chat",
        entityId: groupId,
        severity: "info",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ notifications: items, count: items.length });
}
