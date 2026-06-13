import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth, requireMaster } from "@/lib/api-auth";
import type { ChatGroupDTO } from "@/lib/auth-types";
import { connectDB } from "@/lib/mongodb";
import { hasModule } from "@/lib/permissions";
import { ChatGroup } from "@/models/ChatGroup";
import { User } from "@/models/User";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "chat")) {
    return NextResponse.json({ error: "Module not enabled" }, { status: 403 });
  }

  await connectDB();
  const filter =
    auth.user.role === "master"
      ? {}
      : { memberIds: auth.user.id };
  const groups = await ChatGroup.find(filter).sort({ updatedAt: -1 });

  const allMemberIds = [...new Set(groups.flatMap((g) => g.memberIds.map((id) => id.toString())))];
  const users = await User.find({ _id: { $in: allMemberIds } });
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

  const dtos: ChatGroupDTO[] = groups.map((g) => ({
    id: g._id.toString(),
    name: g.name,
    memberIds: g.memberIds.map((id) => id.toString()),
    memberNames: g.memberIds.map((id) => nameMap[id.toString()] ?? "User"),
    createdAt: g.createdAt.toISOString(),
  }));

  return NextResponse.json(dtos);
}

export async function POST(request: Request) {
  const auth = await requireMaster(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const memberIds = Array.isArray(body.memberIds)
      ? body.memberIds.filter((x: unknown) => typeof x === "string")
      : [];

    if (!name) {
      return NextResponse.json({ error: "Group name required" }, { status: 400 });
    }

    await connectDB();
    const group = await ChatGroup.create({
      name,
      createdBy: auth.user.id,
      memberIds: memberIds.map((id: string) => new mongoose.Types.ObjectId(id)),
    });

    const users = await User.find({ _id: { $in: group.memberIds } });
    const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

    return NextResponse.json(
      {
        id: group._id.toString(),
        name: group.name,
        memberIds: group.memberIds.map((id) => id.toString()),
        memberNames: group.memberIds.map((id) => nameMap[id.toString()] ?? "User"),
        createdAt: group.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/chat/groups", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
