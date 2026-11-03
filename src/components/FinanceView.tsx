"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type {
  FinanceAccountDTO,
  FinanceCategoryDTO,
  FinanceStatsDTO,
  FinanceTransactionDTO,
  FinanceTransactionType,
} from "@/lib/types";

type FinanceTab = "overview" | "transactions" | "accounts_categories";

const CURRENCY = "₹";

function formatMoney(amount: number) {
  return `${CURRENCY}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);
  return dark;
}

export function FinanceView() {
  const dark = useDark();
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [daysRange, setDaysRange] = useState<number>(30);

  // Data states
  const [accounts, setAccounts] = useState<FinanceAccountDTO[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryDTO[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransactionDTO[]>([]);
  const [stats, setStats] = useState<FinanceStatsDTO | null>(null);

  // Quick Add Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<FinanceTransactionType>("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txToAccountId, setTxToAccountId] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txTitle, setTxTitle] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manage Account Modal / State
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<"bank" | "cash" | "card" | "wallet">("bank");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [newAccColor, setNewAccColor] = useState("#3b82f6");

  // New Category Modal / Inline State
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");
  const [newCatColor, setNewCatColor] = useState("#f59e0b");

  // Filter States for Transactions Log
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch Accounts and Categories
  const loadAccountsAndCategories = useCallback(async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        apiFetch("/api/finance/accounts"),
        apiFetch("/api/finance/categories"),
      ]);
      if (accRes.ok) {
        const accs: FinanceAccountDTO[] = await accRes.json();
        setAccounts(accs);
        if (accs.length > 0 && !txAccountId) {
          setTxAccountId(accs[0].id);
        }
      }
      if (catRes.ok) {
        const cats: FinanceCategoryDTO[] = await catRes.json();
        setCategories(cats);
        if (cats.length > 0 && !txCategory) {
          const firstExp = cats.find((c) => c.type === "expense") ?? cats[0];
          setTxCategory(firstExp.name);
        }
      }
    } catch (err) {
      console.error("Failed to load accounts and categories", err);
    }
  }, [txAccountId, txCategory]);

  // Fetch Stats and Transactions
  const loadStatsAndTransactions = useCallback(async () => {
    try {
      const q = new URLSearchParams({
        accountId: selectedAccountId,
        days: String(daysRange),
      });

      const [statsRes, txRes] = await Promise.all([
        apiFetch(`/api/finance/stats?${q}`),
        apiFetch(`/api/finance/transactions?${q}`),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch finance stats", err);
    }
  }, [selectedAccountId, daysRange]);

  useEffect(() => {
    loadAccountsAndCategories();
  }, [loadAccountsAndCategories]);

  useEffect(() => {
    loadStatsAndTransactions();
  }, [loadStatsAndTransactions]);

  // Handle Quick Add Transaction
  async function handleCreateTransaction(e: FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (!amountNum || amountNum <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0");
      return;
    }
    if (!txAccountId) {
      setErrorMsg("Please select an account");
      return;
    }
    if (!txCategory) {
      setErrorMsg("Please select a category");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: txAccountId,
          toAccountId: txType === "transfer" ? txToAccountId : null,
          type: txType,
          amount: amountNum,
          category: txCategory,
          title: txTitle,
          date: txDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save transaction");
      }

      setTxAmount("");
      setTxTitle("");
      setModalOpen(false);
      await loadAccountsAndCategories();
      await loadStatsAndTransactions();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete Transaction
  async function handleDeleteTransaction(id: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await apiFetch(`/api/finance/transactions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadAccountsAndCategories();
        await loadStatsAndTransactions();
      }
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  }

  // Handle Create Account
  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (!newAccName.trim()) return;
    try {
      const res = await apiFetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccName.trim(),
          type: newAccType,
          initialBalance: parseFloat(newAccBalance) || 0,
          color: newAccColor,
        }),
      });
      if (res.ok) {
        setNewAccName("");
        setNewAccBalance("0");
        setAccountModalOpen(false);
        await loadAccountsAndCategories();
        await loadStatsAndTransactions();
      }
    } catch (err) {
      console.error("Failed to create account", err);
    }
  }

  // Handle Create Category
  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await apiFetch("/api/finance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: newCatType,
          color: newCatColor,
        }),
      });
      if (res.ok) {
        setTxCategory(newCatName.trim());
        setNewCatName("");
        setNewCatOpen(false);
        await loadAccountsAndCategories();
      }
    } catch (err) {
      console.error("Failed to create category", err);
    }
  }

  // Filtered Transactions for List View
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (filterCategory !== "all" && tx.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesAccount = tx.accountName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesAccount) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterCategory, searchQuery]);

  // Selected Account Name Label
  const selectedAccountName = useMemo(() => {
    if (selectedAccountId === "all") return "All Accounts Combined";
    return accounts.find((a) => a.id === selectedAccountId)?.name ?? "Account";
  }, [selectedAccountId, accounts]);

  // Chart theme colors
  const chartColors = useMemo(() => {
    return {
      text: dark ? "#a1a1aa" : "#71717a",
      grid: dark ? "#27272a" : "#e4e4e7",
      tooltipBg: dark ? "#18181b" : "#ffffff",
      tooltipBorder: dark ? "#3f3f46" : "#e4e4e7",
      income: dark ? "#34d399" : "#10b981",
      expense: dark ? "#f87171" : "#ef4444",
    };
  }, [dark]);

  // Categories available for the current modal's txType
  const filteredModalCategories = useMemo(() => {
    return categories.filter((c) => c.type === txType || c.type === "both");
  }, [categories, txType]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Money Tracker
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Live Balances
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Track daily expenses, credits, accounts, and spending analytics.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTxType("expense");
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 4V16M4 10H16" />
            </svg>
            Add Daily Expense
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType("income");
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 4V16M4 10H16" />
            </svg>
            Add Credit (Income)
          </button>
        </div>
      </div>

      {/* Account Selector Pill Bar (Bank, Cash, All Accounts) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">
            Account:
          </span>

          <button
            type="button"
            onClick={() => setSelectedAccountId("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              selectedAccountId === "all"
                ? "bg-accent text-white shadow-sm"
                : "bg-canvas text-muted hover:text-ink"
            }`}
          >
            All Accounts Combined
          </button>

          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-accent text-white shadow-sm"
                    : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: acc.color }}
                />
                <span>{acc.name}</span>
                <span
                  className={`font-semibold ${
                    isSelected ? "text-white/90" : "text-ink"
                  }`}
                >
                  {formatMoney(acc.currentBalance)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent"
          >
            + Add Account
          </button>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>Range:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysRange(d)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                daysRange === d
                  ? "bg-accent/10 text-accent font-semibold"
                  : "hover:bg-canvas text-muted"
              }`}
            >
              {d === 7 ? "7D" : d === 30 ? "30D" : "90D"}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Net Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Current Net Balance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {formatMoney(stats?.totalBalance ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted truncate">
            {selectedAccountName}
          </div>
        </div>

        {/* Total Credited (Income) */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Credited (Inflow)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-3xl">
            +{formatMoney(stats?.totalIncome ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted">
            In the last {daysRange} days
          </div>
        </div>

        {/* Total Daily Expenses (Debit) */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Expenses (Outflow)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 sm:text-3xl">
            -{formatMoney(stats?.totalExpense ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted">
            In the last {daysRange} days
          </div>
        </div>

        {/* Net Savings / Flow */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Period Savings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
              (stats?.netSavings ?? 0) >= 0
                ? "text-purple-600 dark:text-purple-400"
                : "text-rose-500"
            }`}
          >
            {formatMoney(stats?.netSavings ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted">
            Savings Rate: {stats?.savingsRatePercent ?? 0}%
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "overview"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          Overview & Graphs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "transactions"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Transactions Log ({transactions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("accounts_categories")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "accounts_categories"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Manage Accounts & Categories
        </button>
      </div>

      {/* TAB 1: OVERVIEW & GRAPHS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Daily Spend Trend Chart */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Income & Expense Trend
                  </h3>
                  <p className="text-xs text-muted">
                    Daily inflow vs outflow ({selectedAccountName})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Expense
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                {stats?.dailyTrend && stats.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.dailyTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="date"
                        stroke={chartColors.text}
                        fontSize={11}
                        tickFormatter={(d) => {
                          try {
                            return format(parseISO(d), "d MMM");
                          } catch {
                            return d;
                          }
                        }}
                      />
                      <YAxis stroke={chartColors.text} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          borderColor: chartColors.tooltipBorder,
                          borderRadius: "12px",
                          color: dark ? "#fff" : "#000",
                        }}
                        formatter={(val: unknown) => [formatMoney(Number(val) || 0)]}
                      />
                      <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill={chartColors.expense} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-muted">
                    <p>No transactions recorded in this period.</p>
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="mt-2 text-xs font-semibold text-accent hover:underline"
                    >
                      + Add your first transaction
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown (Donut Chart) */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-5">
              <div className="pb-4">
                <h3 className="text-base font-bold text-ink">
                  Expenses by Category
                </h3>
                <p className="text-xs text-muted">
                  Where your money went in the last {daysRange} days
                </p>
              </div>

              <div className="h-56 w-full">
                {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {stats.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          borderColor: chartColors.tooltipBorder,
                          borderRadius: "12px",
                          color: dark ? "#fff" : "#000",
                        }}
                        formatter={(val: unknown, name: unknown) => [
                          formatMoney(Number(val) || 0),
                          String(name ?? ""),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted">
                    No expense categories yet.
                  </div>
                )}
              </div>

              {/* Category Badges List */}
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {stats?.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-ink">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-ink">
                        {formatMoney(cat.amount)}
                      </span>
                      <span className="w-8 text-right text-muted">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Account Breakdown Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
              Accounts Balance Overview
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`cursor-pointer rounded-2xl border p-4.5 transition-all hover:border-accent/50 ${
                    selectedAccountId === acc.id
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                        style={{ backgroundColor: acc.color }}
                      >
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-ink">{acc.name}</h4>
                        <span className="text-[11px] capitalize text-muted">
                          {acc.type} Account
                        </span>
                      </div>
                    </div>
                    {acc.isDefault && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xs text-muted">Current Balance</span>
                    <span className="text-lg font-bold text-ink">
                      {formatMoney(acc.currentBalance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-bold text-ink">Recent Transactions</h3>
              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className="text-xs font-semibold text-accent hover:underline"
              >
                View all ({transactions.length}) →
              </button>
            </div>

            <div className="divide-y divide-border">
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                          tx.type === "income"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : tx.type === "transfer"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {tx.type === "income" ? "+" : tx.type === "transfer" ? "⇄" : "-"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {tx.title || tx.category}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="rounded bg-canvas px-1.5 py-0.5">
                            {tx.accountName}
                          </span>
                          <span>•</span>
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  No recent transactions.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LOG */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search description, category, or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses only</option>
                <option value="income">Credits (Income) only</option>
                <option value="transfer">Transfers only</option>
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="divide-y divide-border">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-canvas/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                          tx.type === "income"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : tx.type === "transfer"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {tx.type === "income" ? "+" : tx.type === "transfer" ? "⇄" : "-"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink">
                            {tx.title || tx.category}
                          </p>
                          <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                            {tx.category}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span className="flex items-center gap-1 text-ink font-medium">
                            {tx.accountName}
                          </span>
                          {tx.toAccountName && (
                            <span>➔ {tx.toAccountName}</span>
                          )}
                          <span>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p
                        className={`text-base font-bold ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
                        title="Delete transaction"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted">
                  No transactions match your current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE ACCOUNTS & CATEGORIES */}
      {activeTab === "accounts_categories" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Accounts Management */}
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Accounts</h3>
                <p className="text-xs text-muted">
                  Manage Bank, Cash, or additional accounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                + New Account
              </button>
            </div>

            <div className="divide-y divide-border">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{acc.name}</h4>
                      <p className="text-xs text-muted">
                        Initial: {formatMoney(acc.initialBalance)} • Current:{" "}
                        <span className="font-semibold text-ink">
                          {formatMoney(acc.currentBalance)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {acc.isDefault && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Categories Management */}
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Categories</h3>
                <p className="text-xs text-muted">
                  Create and organize custom expense & income tags
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCatOpen(true)}
                className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                + New Category
              </button>
            </div>

            {/* Inline New Category Form */}
            {newCatOpen && (
              <form onSubmit={handleCreateCategory} className="rounded-xl border border-border bg-canvas p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Add Custom Category</span>
                  <button
                    type="button"
                    onClick={() => setNewCatOpen(false)}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none"
                    required
                  />
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as "expense" | "income")}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none"
                  >
                    <option value="expense">Expense Tag</option>
                    <option value="income">Income Tag</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Color:</span>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border-0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-[10px] text-muted">({c.type})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD TRANSACTION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-lg font-bold text-ink">
                Record New Transaction
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-xs font-medium text-rose-500">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              {/* Type Switcher (Expense / Income / Transfer) */}
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-canvas p-1">
                <button
                  type="button"
                  onClick={() => setTxType("expense")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    txType === "expense"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Expense (Debit)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("income")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    txType === "income"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Credit (Income)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("transfer")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    txType === "transfer"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Transfer
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Amount ({CURRENCY})
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">
                    {CURRENCY}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-border bg-canvas pl-10 pr-4 py-3 text-xl font-bold text-ink outline-none transition focus:border-accent"
                  />
                </div>
              </div>

              {/* Account Selection (Proper Two Options / Multiple Accounts) */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  {txType === "transfer" ? "From Account" : "Select Account"}
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {accounts.map((acc) => {
                    const isSelected = txAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setTxAccountId(acc.id)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                          isSelected
                            ? "border-accent bg-accent/10 shadow-sm"
                            : "border-border bg-canvas hover:border-accent/40"
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink">
                            {acc.name}
                          </p>
                          <p className="truncate text-[10px] text-muted">
                            {formatMoney(acc.currentBalance)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* To Account (Only if Transfer) */}
              {txType === "transfer" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                    To Account
                  </label>
                  <select
                    value={txToAccountId}
                    onChange={(e) => setTxToAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none"
                    required
                  >
                    <option value="">Select destination account...</option>
                    {accounts
                      .filter((a) => a.id !== txAccountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatMoney(a.currentBalance)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Category Picker & Inline "+ Add Category" */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewCatOpen((v) => !v)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    + Custom Category
                  </button>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {filteredModalCategories.map((c) => {
                    const isSelected = txCategory === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTxCategory(c.name)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          isSelected
                            ? "border-accent bg-accent text-white shadow-sm"
                            : "border-border bg-canvas text-ink hover:border-accent/40"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSelected ? "bg-white" : ""
                          }`}
                          style={!isSelected ? { backgroundColor: c.color } : {}}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Transaction Name / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with team, Groceries, Fuel, Salary, Client payment..."
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-ink outline-none transition focus:border-accent"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Date
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-ink outline-none"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-bold text-ink">Add New Account</h3>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI, Pocket Cash, Credit Card"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted">
                    Account Type
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as "bank" | "cash" | "card" | "wallet")}
                    className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash / Pocket</option>
                    <option value="card">Credit Card</option>
                    <option value="wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Opening Balance ({CURRENCY})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">
                  Theme Color
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={newAccColor}
                    onChange={(e) => setNewAccColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border-0"
                  />
                  <span className="text-xs text-muted">{newAccColor}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
