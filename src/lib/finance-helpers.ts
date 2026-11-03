import mongoose from "mongoose";
import { FinanceAccount } from "@/models/FinanceAccount";
import { FinanceCategory } from "@/models/FinanceCategory";
import { FinanceTransaction } from "@/models/FinanceTransaction";
import type { FinanceAccountDTO, FinanceAccountType, FinanceCategoryDTO } from "./types";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food & Dining", color: "#f59e0b", icon: "utensils" },
  { name: "Travel & Fuel", color: "#3b82f6", icon: "car" },
  { name: "Rent & Bills", color: "#ef4444", icon: "home" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-bag" },
  { name: "Groceries", color: "#10b981", icon: "shopping-cart" },
  { name: "Entertainment", color: "#8b5cf6", icon: "film" },
  { name: "Health & Medical", color: "#06b6d4", icon: "heart-pulse" },
  { name: "General Expense", color: "#6b7280", icon: "receipt" },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", color: "#10b981", icon: "briefcase" },
  { name: "Client Payment", color: "#059669", icon: "user-check" },
  { name: "Investment & Returns", color: "#8b5cf6", icon: "trending-up" },
  { name: "Refund / Cashback", color: "#3b82f6", icon: "arrow-down-left" },
  { name: "Other Income", color: "#6b7280", icon: "plus-circle" },
];

export async function ensureDefaultFinanceData(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);

  // 1. Ensure accounts exist (Bank Account & Cash)
  const accountCount = await FinanceAccount.countDocuments({ userId: uid, archived: { $ne: true } });
  if (accountCount === 0) {
    await FinanceAccount.create([
      {
        userId: uid,
        name: "Bank Account",
        type: "bank",
        color: "#3b82f6",
        icon: "bank",
        initialBalance: 0,
        isDefault: true,
      },
      {
        userId: uid,
        name: "Cash",
        type: "cash",
        color: "#10b981",
        icon: "cash",
        initialBalance: 0,
        isDefault: false,
      },
    ]);
  }

  // 2. Ensure categories exist
  const categoryCount = await FinanceCategory.countDocuments({ userId: uid });
  if (categoryCount === 0) {
    const catsToInsert = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        userId: uid,
        name: c.name,
        type: "expense" as const,
        color: c.color,
        icon: c.icon,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
        userId: uid,
        name: c.name,
        type: "income" as const,
        color: c.color,
        icon: c.icon,
      })),
    ];
    await FinanceCategory.insertMany(catsToInsert);
  }
}

export async function getAccountsWithBalances(userId: string): Promise<FinanceAccountDTO[]> {
  await ensureDefaultFinanceData(userId);
  const uid = new mongoose.Types.ObjectId(userId);

  const accounts = await FinanceAccount.find({ userId: uid, archived: { $ne: true } })
    .sort({ createdAt: 1 })
    .lean();

  const accountIds = accounts.map((a) => a._id);

  // Aggregate transactions by accountId
  const [incomes, expenses, transfersOut, transfersIn] = await Promise.all([
    // Income per account
    FinanceTransaction.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: uid, accountId: { $in: accountIds }, type: "income" } },
      { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
    ]),
    // Expense per account
    FinanceTransaction.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: uid, accountId: { $in: accountIds }, type: "expense" } },
      { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
    ]),
    // Transfers Out from account
    FinanceTransaction.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: uid, accountId: { $in: accountIds }, type: "transfer" } },
      { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
    ]),
    // Transfers In to toAccountId
    FinanceTransaction.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: uid, toAccountId: { $in: accountIds }, type: "transfer" } },
      { $group: { _id: "$toAccountId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const incomeMap = new Map(incomes.map((i) => [i._id.toString(), i.total]));
  const expenseMap = new Map(expenses.map((e) => [e._id.toString(), e.total]));
  const transferOutMap = new Map(transfersOut.map((t) => [t._id.toString(), t.total]));
  const transferInMap = new Map(transfersIn.map((t) => [t._id.toString(), t.total]));

  return accounts.map((a) => {
    const aid = a._id.toString();
    const inc = incomeMap.get(aid) ?? 0;
    const exp = expenseMap.get(aid) ?? 0;
    const tOut = transferOutMap.get(aid) ?? 0;
    const tIn = transferInMap.get(aid) ?? 0;
    const initial = a.initialBalance ?? 0;
    const currentBalance = initial + inc - exp - tOut + tIn;

    return {
      id: aid,
      name: a.name,
      type: (a.type as FinanceAccountType) ?? "bank",
      initialBalance: initial,
      currentBalance,
      color: a.color ?? "#3b82f6",
      icon: a.icon ?? "bank",
      isDefault: Boolean(a.isDefault),
      createdAt: a.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  });
}

interface CategoryDocLike {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  type?: "expense" | "income" | "both";
  color?: string;
  icon?: string;
}

export function toCategoryDTO(doc: CategoryDocLike): FinanceCategoryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    type: doc.type ?? "expense",
    color: doc.color ?? "#6366f1",
    icon: doc.icon ?? "tag",
  };
}
