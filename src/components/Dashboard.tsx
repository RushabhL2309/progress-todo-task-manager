"use client";

import type { PeriodStats } from "@/lib/types";

interface DashboardProps {
  stats: PeriodStats | null;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Dashboard({ stats, loading }: DashboardProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-border/30" />
        ))}
      </div>
    );
  }

  const extraLabel =
    stats.extraMaxPoints > 0
      ? `${stats.extraEarnedPoints} / ${stats.extraMaxPoints} pts`
      : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          label="Score"
          value={`${stats.overallScorePercent}%`}
          sub="Period average"
        />
        <StatCard
          label="Scheduled"
          value={`${stats.scheduledCompleted} / ${stats.scheduledTotal}`}
          sub="Routine tasks done"
        />
        <StatCard label="Extra bonus" value={extraLabel} sub="2 pts each when done" />
        <StatCard label="Pending" value={String(stats.pending)} sub="Still to complete" />
      </div>
      <div className="card h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${stats.overallScorePercent}%` }}
        />
      </div>
    </div>
  );
}
