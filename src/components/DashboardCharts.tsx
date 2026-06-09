"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { PeriodStats } from "@/lib/types";

const COLORS = {
  accent: "#5B7C6B",
  accentLight: "#8FAF9B",
  extra: "#C9A227",
  muted: "#E8E8E4",
  pending: "#D4D4CE",
  done: "#5B7C6B",
};

interface DashboardChartsProps {
  stats: PeriodStats | null;
  loading?: boolean;
}

function ChartSkeleton({ className }: { className?: string }) {
  return <div className={`card animate-pulse bg-border/30 ${className ?? "h-64"}`} />;
}

export function DashboardCharts({ stats, loading }: DashboardChartsProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-border/30" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton className="h-72" />
          <ChartSkeleton className="h-72" />
        </div>
        <ChartSkeleton className="h-80" />
      </div>
    );
  }

  const timelineData = stats.dailyScores.map((d) => ({
    label: format(parseISO(d.dateKey), "EEE d"),
    score: d.scorePercent,
    scheduled: d.scheduledCompleted,
    extra: d.extraCompleted,
  }));

  const doneCount =
    stats.scheduledCompleted +
    stats.dailyScores.reduce((s, d) => s + d.extraCompleted, 0);
  const totalCount = stats.scheduledTotal + stats.dailyScores.reduce((s, d) => s + d.extraTotal, 0);
  const pendingCount = Math.max(0, totalCount - doneCount);

  const overallPie = [
    { name: "Completed", value: doneCount, color: COLORS.done },
    { name: "Pending", value: pendingCount, color: COLORS.pending },
  ].filter((d) => d.value > 0);

  const scheduledPie = [
    { name: "Done", value: stats.scheduledCompleted, color: COLORS.accent },
    {
      name: "Pending",
      value: Math.max(0, stats.scheduledTotal - stats.scheduledCompleted),
      color: COLORS.muted,
    },
  ].filter((d) => d.value > 0);

  const extraDone = stats.dailyScores.reduce((s, d) => s + d.extraCompleted, 0);
  const extraTotal = stats.dailyScores.reduce((s, d) => s + d.extraTotal, 0);
  const extraPie = [
    { name: "Done", value: extraDone, color: COLORS.extra },
    { name: "Pending", value: Math.max(0, extraTotal - extraDone), color: COLORS.muted },
  ].filter((d) => d.value > 0);

  const extraLabel =
    stats.extraMaxPoints > 0
      ? `${stats.extraEarnedPoints} / ${stats.extraMaxPoints} pts`
      : "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: "Overall score", value: `${stats.overallScorePercent}%`, sub: "Period average" },
          {
            label: "Scheduled",
            value: `${stats.scheduledCompleted}/${stats.scheduledTotal}`,
            sub: "Routine tasks",
          },
          { label: "Extra bonus", value: extraLabel, sub: "2 pts each" },
          { label: "Pending", value: String(stats.pending), sub: "Still to do" },
        ].map((card) => (
          <div key={card.label} className="card p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-ink">Progress timeline</h3>
        <p className="mt-1 text-xs text-muted">Daily score % across the current period</p>
        <div className="mt-4 h-72 w-full">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E8E8E4",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                  formatter={(value) => [`${value}%`, "Score"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={COLORS.accent}
                  strokeWidth={2.5}
                  fill="url(#scoreGrad)"
                  dot={{ r: 4, fill: COLORS.accent, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted">No data for this period</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Overall completion</h3>
          <p className="mt-1 text-xs text-muted">Done vs pending (all tasks)</p>
          <div className="mt-2 h-56">
            {overallPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {overallPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No tasks yet</p>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Regular tasks</h3>
          <p className="mt-1 text-xs text-muted">Scheduled routine completion</p>
          <div className="mt-2 h-56">
            {scheduledPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scheduledPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {scheduledPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No scheduled tasks</p>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Extra tasks</h3>
          <p className="mt-1 text-xs text-muted">Bonus tasks completion</p>
          <div className="mt-2 h-56">
            {extraPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={extraPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {extraPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No extra tasks this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
