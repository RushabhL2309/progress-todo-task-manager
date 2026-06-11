"use client";

import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import type { ProjectDetailDTO } from "@/lib/types";

const TYPE_COLORS = { issue: "#C9A227", feature: "#4A6FA5", task: "#5B7C6B" };

interface ProjectInternalDashboardProps {
  detail: ProjectDetailDTO;
}

export function ProjectInternalDashboard({ detail }: ProjectInternalDashboardProps) {
  const { project, items, updates } = detail;
  const open = items.filter((i) => i.status === "open");
  const resolved = items.filter((i) => i.status === "resolved");

  const statusPie = [
    { name: "Open", value: open.length, color: "#E8E8E4" },
    { name: "Resolved", value: resolved.length, color: project.color },
  ].filter((d) => d.value > 0);

  const typeCounts = ["issue", "feature", "task"].map((type) => ({
    name: type,
    count: open.filter((i) => i.type === type).length,
    color: TYPE_COLORS[type as keyof typeof TYPE_COLORS],
  }));

  const activityMap = new Map<string, number>();
  for (const u of updates) {
    activityMap.set(u.date, (activityMap.get(u.date) ?? 0) + 1);
  }
  const activityData = [...activityMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({
      label: format(parseISO(date), "MMM d"),
      updates: count,
    }));

  const overdue = open.filter(
    (i) => i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Issues done", value: `${project.breakdown.issue.done}/${project.breakdown.issue.total}` },
          { label: "Features done", value: `${project.breakdown.feature.done}/${project.breakdown.feature.total}` },
          { label: "Tasks done", value: `${project.breakdown.task.done}/${project.breakdown.task.total}` },
          { label: "Open", value: project.openCount },
          { label: "Updates", value: updates.length },
          { label: "Overdue", value: overdue },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Completion</h3>
          <p className="mt-1 text-xs text-muted">Open vs resolved items</p>
          <div className="mt-3 h-52">
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPie.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No items yet</p>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Open by type</h3>
          <p className="mt-1 text-xs text-muted">Issues, features, tasks still pending</p>
          <div className="mt-3 h-52">
            {typeCounts.some((t) => t.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeCounts} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {typeCounts.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">Nothing open</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">Activity timeline</h3>
        <p className="mt-1 text-xs text-muted">Work logged over time</p>
        <div className="mt-3 h-56">
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="projAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={project.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={project.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="updates"
                  stroke={project.color}
                  strokeWidth={2}
                  fill="url(#projAct)"
                  dot={{ r: 3, fill: project.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted">No activity logged yet</p>
          )}
        </div>
      </div>

      {updates.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Recent updates</h3>
          <ul className="mt-3 space-y-3">
            {updates.slice(0, 5).map((u) => (
              <li key={u.id} className="border-l-2 border-accent/30 pl-3">
                <p className="text-xs text-muted">{format(parseISO(u.date), "EEE, d MMM yyyy")}</p>
                <p className="mt-0.5 text-sm text-ink">{u.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
