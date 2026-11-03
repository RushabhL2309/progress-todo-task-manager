import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FinanceAccount } from "@/models/FinanceAccount";
import { FinanceTransaction } from "@/models/FinanceTransaction";
import { ensureDefaultFinanceData, getAccountsWithBalances } from "@/lib/finance-helpers";
import type { FinanceTransactionDTO } from "@/lib/types";

interface PopulatedAccount {
  _id?: mongoose.Types.ObjectId;
  name?: string;
  color?: string;
  icon?: string;
}

interface RawTxLean {
  _id: mongoose.Types.ObjectId;
  accountId?: PopulatedAccount | mongoose.Types.ObjectId;
  toAccountId?: PopulatedAccount | mongoose.Types.ObjectId;
  type: "expense" | "income" | "transfer";
  amount: number;
  category: string;
  title?: string;
  date: string;
  createdAt?: Date;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  await connectDB();
  await ensureDefaultFinanceData(auth.user.id);
  const uid = new mongoose.Types.ObjectId(auth.user.id);

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 300);

  const query: Record<string, unknown> = { userId: uid };

  if (accountId) {
    const accObjId = new mongoose.Types.ObjectId(accountId);
    query.$or = [{ accountId: accObjId }, { toAccountId: accObjId }];
  }

  if (type && ["expense", "income", "transfer"].includes(type)) {
    query.type = type;
  }

  if (category) {
    query.category = category;
  }

  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.date = { $gte: startDate };
  } else if (endDate) {
    query.date = { $lte: endDate };
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { title: { $regex: s, $options: "i" } },
      { category: { $regex: s, $options: "i" } },
    ];
  }

  const transactions = await FinanceTransaction.find(query)
    .populate("accountId", "name color icon")
    .populate("toAccountId", "name color icon")
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const dtos: FinanceTransactionDTO[] = (transactions as unknown as RawTxLean[]).map((t) => {
    const accObj = t.accountId && typeof t.accountId === "object" && "name" in t.accountId ? (t.accountId as PopulatedAccount) : null;
    const toAccObj = t.toAccountId && typeof t.toAccountId === "object" && "name" in t.toAccountId ? (t.toAccountId as PopulatedAccount) : null;

    return {
      id: t._id.toString(),
      accountId: accObj?._id?.toString() ?? t.accountId?.toString() ?? "",
      accountName: accObj?.name ?? "Account",
      toAccountId: toAccObj?._id?.toString() ?? t.toAccountId?.toString() ?? null,
      toAccountName: toAccObj?.name ?? null,
      type: t.type,
      amount: t.amount,
      category: t.category,
      title: t.title ?? "",
      date: t.date,
      createdAt: t.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  });

  return NextResponse.json(dtos);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      accountId,
      toAccountId,
      type = "expense",
      amount,
      category,
      title = "",
      date = new Date().toISOString().slice(0, 10),
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount greater than 0" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: "Please select an account" }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: "Please choose or enter a category" }, { status: 400 });
    }

    await connectDB();
    const uid = new mongoose.Types.ObjectId(auth.user.id);
    const accObjId = new mongoose.Types.ObjectId(accountId);

    // Verify account exists
    const account = await FinanceAccount.findOne({ _id: accObjId, userId: uid });
    if (!account) {
      return NextResponse.json({ error: "Selected account not found" }, { status: 404 });
    }

    let toAccObjId: mongoose.Types.ObjectId | null = null;
    if (type === "transfer" && toAccountId) {
      toAccObjId = new mongoose.Types.ObjectId(toAccountId);
    }

    const transaction = await FinanceTransaction.create({
      userId: uid,
      accountId: accObjId,
      toAccountId: toAccObjId,
      type,
      amount: numAmount,
      category: category.trim(),
      title: title.trim(),
      date,
    });

    const populated = await FinanceTransaction.findById(transaction._id)
      .populate("accountId", "name color icon")
      .populate("toAccountId", "name color icon")
      .lean();

    const raw = populated as unknown as RawTxLean;
    const accObj = raw.accountId && typeof raw.accountId === "object" && "name" in raw.accountId ? (raw.accountId as PopulatedAccount) : null;
    const toAccObj = raw.toAccountId && typeof raw.toAccountId === "object" && "name" in raw.toAccountId ? (raw.toAccountId as PopulatedAccount) : null;

    const dto: FinanceTransactionDTO = {
      id: raw._id.toString(),
      accountId: accObj?._id?.toString() ?? "",
      accountName: accObj?.name ?? "Account",
      toAccountId: toAccObj?._id?.toString() ?? null,
      toAccountName: toAccObj?.name ?? null,
      type: raw.type,
      amount: raw.amount,
      category: raw.category,
      title: raw.title ?? "",
      date: raw.date,
      createdAt: raw.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };

    const updatedAccounts = await getAccountsWithBalances(auth.user.id);

    return NextResponse.json({ transaction: dto, accounts: updatedAccounts }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
