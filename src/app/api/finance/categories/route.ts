import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FinanceCategory } from "@/models/FinanceCategory";
import { ensureDefaultFinanceData, toCategoryDTO } from "@/lib/finance-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  await connectDB();
  await ensureDefaultFinanceData(auth.user.id);
  const uid = new mongoose.Types.ObjectId(auth.user.id);

  const categories = await FinanceCategory.find({ userId: uid }).sort({ name: 1 }).lean();
  return NextResponse.json(categories.map(toCategoryDTO));
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, type = "expense", color = "#6366f1", icon = "tag" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);

    const existing = await FinanceCategory.findOne({
      userId: uid,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }

    const cat = await FinanceCategory.create({
      userId: uid,
      name: name.trim(),
      type,
      color,
      icon,
    });

    const all = await FinanceCategory.find({ userId: uid }).sort({ name: 1 }).lean();
    return NextResponse.json({ category: toCategoryDTO(cat), categories: all.map(toCategoryDTO) }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create category";
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
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);

    await FinanceCategory.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: uid,
    });

    const all = await FinanceCategory.find({ userId: uid }).sort({ name: 1 }).lean();
    return NextResponse.json(all.map(toCategoryDTO));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
