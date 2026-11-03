import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { subDays } from "date-fns";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FinanceCategory } from "@/models/FinanceCategory";
import { FinanceTransaction } from "@/models/FinanceTransaction";
import { getAccountsWithBalances } from "@/lib/finance-helpers";
import type { FinanceStatsDTO, FinanceTransactionDTO } from "@/lib/types";

const CATEGORY_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
  "#d97706",
  "#14b8a6",
];

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
  const uid = new mongoose.Types.ObjectId(auth.user.id);

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const days = Math.min(Number(searchParams.get("days")) || 30, 365);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultStartStr = subDays(new Date(), days).toISOString().slice(0, 10);

  const fromDate = startDateParam || defaultStartStr;
  const toDate = endDateParam || todayStr;

  const accounts = await getAccountsWithBalances(auth.user.id);

  // Filter query
  const matchFilter: Record<string, unknown> = {
    userId: uid,
    date: { $gte: fromDate, $lte: toDate },
  };

  if (accountId && accountId !== "all") {
    const accObjId = new mongoose.Types.ObjectId(accountId);
    matchFilter.$or = [{ accountId: accObjId }, { toAccountId: accObjId }];
  }

  // 1. Category aggregation for expenses
  const categoryAgg = await FinanceTransaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        ...matchFilter,
        type: "expense",
      },
    },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);

  // Fetch user categories for colors
  const userCats = await FinanceCategory.find({ userId: uid }).lean();
  const catColorMap = new Map(userCats.map((c) => [c.name.toLowerCase(), c.color]));

  const totalExpenseInPeriod = categoryAgg.reduce((acc, c) => acc + c.total, 0);

  const categoryBreakdown = categoryAgg.map((c, idx) => {
    const catName = c._id || "Uncategorized";
    const color = catColorMap.get(catName.toLowerCase()) ?? CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const percentage = totalExpenseInPeriod > 0 ? Math.round((c.total / totalExpenseInPeriod) * 100) : 0;
    return {
      category: catName,
      amount: c.total,
      percentage,
      color,
    };
  });

  // 2. Daily trend aggregation
  const dailyAgg = await FinanceTransaction.aggregate<{
    _id: { date: string; type: string };
    total: number;
  }>([
    { $match: matchFilter },
    {
      $group: {
        _id: { date: "$date", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (const item of dailyAgg) {
    const dateKey = item._id.date;
    const current = dailyMap.get(dateKey) || { income: 0, expense: 0 };
    if (item._id.type === "income") current.income += item.total;
    if (item._id.type === "expense") current.expense += item.total;
    dailyMap.set(dateKey, current);
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, val]) => ({
      date,
      income: val.income,
      expense: val.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 3. Totals in period
  const totalIncomeInPeriod = Array.from(dailyMap.values()).reduce((acc, v) => acc + v.income, 0);
  const netSavings = totalIncomeInPeriod - totalExpenseInPeriod;
  const savingsRatePercent =
    totalIncomeInPeriod > 0
      ? Math.max(0, Math.round(((totalIncomeInPeriod - totalExpenseInPeriod) / totalIncomeInPeriod) * 100))
      : 0;

  // 4. Overall total balance
  const totalBalance =
    accountId && accountId !== "all"
      ? accounts.find((a) => a.id === accountId)?.currentBalance ?? 0
      : accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  // 5. Recent transactions
  const recent = await FinanceTransaction.find(matchFilter)
    .populate("accountId", "name color icon")
    .populate("toAccountId", "name color icon")
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const recentTransactions: FinanceTransactionDTO[] = (recent as unknown as RawTxLean[]).map((t) => {
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

  const stats: FinanceStatsDTO = {
    totalBalance,
    totalIncome: totalIncomeInPeriod,
    totalExpense: totalExpenseInPeriod,
    netSavings,
    savingsRatePercent,
    accounts,
    categoryBreakdown,
    dailyTrend,
    recentTransactions,
  };

  return NextResponse.json(stats);
}
