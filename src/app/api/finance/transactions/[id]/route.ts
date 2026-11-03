import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FinanceTransaction } from "@/models/FinanceTransaction";
import { getAccountsWithBalances } from "@/lib/finance-helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  await connectDB();
  const uid = new mongoose.Types.ObjectId(auth.user.id);

  const deleted = await FinanceTransaction.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: uid,
  });

  if (!deleted) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const updatedAccounts = await getAccountsWithBalances(auth.user.id);
  return NextResponse.json({ success: true, accounts: updatedAccounts });
}
