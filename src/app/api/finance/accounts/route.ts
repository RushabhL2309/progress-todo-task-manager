import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FinanceAccount } from "@/models/FinanceAccount";
import { getAccountsWithBalances } from "@/lib/finance-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  await connectDB();
  const accounts = await getAccountsWithBalances(auth.user.id);
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, type = "bank", initialBalance = 0, color = "#3b82f6", icon = "bank" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);

    const account = await FinanceAccount.create({
      userId: uid,
      name: name.trim(),
      type,
      initialBalance: Number(initialBalance) || 0,
      color,
      icon,
      isDefault: false,
    });

    const accounts = await getAccountsWithBalances(auth.user.id);
    return NextResponse.json({ account, accounts }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, name, initialBalance, color, icon } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);

    const updateFields: Record<string, string | number> = {};
    if (name && typeof name === "string") updateFields.name = name.trim();
    if (initialBalance !== undefined) updateFields.initialBalance = Number(initialBalance) || 0;
    if (color) updateFields.color = color;
    if (icon) updateFields.icon = icon;

    const updated = await FinanceAccount.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: uid },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const accounts = await getAccountsWithBalances(auth.user.id);
    return NextResponse.json(accounts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);

    // Don't delete if it's the last account
    const activeCount = await FinanceAccount.countDocuments({ userId: uid, archived: { $ne: true } });
    if (activeCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the only remaining account" }, { status: 400 });
    }

    await FinanceAccount.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: uid },
      { $set: { archived: true } }
    );

    const accounts = await getAccountsWithBalances(auth.user.id);
    return NextResponse.json(accounts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
