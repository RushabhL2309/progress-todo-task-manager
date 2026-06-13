import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import type { AppNotification } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { clientAccessFilter, hasModule, projectAccessFilter } from "@/lib/permissions";
import { ChatGroup } from "@/models/ChatGroup";
import { ChatMessage } from "@/models/ChatMessage";
import { ChatRead } from "@/models/ChatRead";
import { ClientProject } from "@/models/ClientProject";
import { Project } from "@/models/Project";
import { ProjectItem } from "@/models/ProjectItem";

const today = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  await connectDB();
  const uid = auth.user.id;
  const items: AppNotification[] = [];
  const now = today();

  if (hasModule(auth.user, "client_updates")) {
    const clientFilter =
      auth.user.role === "master" ? {} : clientAccessFilter(auth.user);
    const clients = await ClientProject.find({
      ...clientFilter,
      followUpDate: { $ne: null },
      stage: { $in: ["enquiry", "running"] },
    });
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
  }

  if (hasModule(auth.user, "projects")) {
    const access = projectAccessFilter(auth.user);
    const projects = await Project.find({ ...access, status: { $ne: "completed" } });
    const ids = projects.map((p) => p._id);
    const projectItems = await ProjectItem.find({
      projectId: { $in: ids },
      status: "open",
      dueDate: { $ne: null },
    });

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

  if (hasModule(auth.user, "chat")) {
    const groupFilter =
      auth.user.role === "master" ? {} : { memberIds: new mongoose.Types.ObjectId(uid) };
    const groups = await ChatGroup.find(groupFilter);
    for (const g of groups) {
      const read = await ChatRead.findOne({ userId: uid, groupId: g._id });
      const since = read?.lastReadAt ?? new Date(0);
      const unread = await ChatMessage.findOne({
        groupId: g._id,
        senderId: { $ne: uid },
        createdAt: { $gt: since },
      }).sort({ createdAt: -1 });
      if (unread) {
        items.push({
          id: `chat-${g._id}-${unread._id}`,
          type: "chat",
          title: "New chat message",
          body: `${g.name}: ${unread.text?.slice(0, 60) ?? "Image"}`,
          page: "chat",
          entityId: g._id.toString(),
          severity: "info",
          createdAt: unread.createdAt.toISOString(),
        });
      }
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ notifications: items, count: items.length });
}
