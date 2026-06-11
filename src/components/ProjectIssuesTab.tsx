"use client";

import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ProjectDetailDTO, ProjectItemDTO, ProjectItemType } from "@/lib/types";

type FilterType = "all" | ProjectItemType;

interface ProjectIssuesTabProps {
  detail: ProjectDetailDTO;
  loading: boolean;
  onAddItem: (data: {
    title: string;
    description?: string;
    type: ProjectItemType;
    dueDate: string | null;
  }) => Promise<void>;
  onCompleteItem: (itemId: string) => void;
  onLogWork: () => void;
}

export function ProjectIssuesTab({
  detail,
  loading,
  onAddItem,
  onCompleteItem,
  onLogWork,
}: ProjectIssuesTabProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectItemType>("task");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [submitting, setSubmitting] = useState(false);

  const openItems = detail.items.filter((i) => i.status === "open");
  const resolvedItems = detail.items.filter((i) => i.status === "resolved");
  const filteredOpen =
    filter === "all" ? openItems : openItems.filter((i) => i.type === filter);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onAddItem({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueDate: dueDate || null,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
    } finally {
      setSubmitting(false);
    }
  }

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "issue", label: "Issues" },
    { id: "feature", label: "Features" },
    { id: "task", label: "Tasks" },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Issues & feature notes</h2>
            <p className="mt-1 text-xs text-muted">Track what needs building or fixing</p>
          </div>
          <button type="button" onClick={onLogWork} className="btn-primary shrink-0">
            Log work done
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add issue, feature, or task…"
            className="input-field text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional — saved with title for now)"
            rows={2}
            className="input-field min-h-[64px] resize-y text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectItemType)}
              className="input-field !min-h-10 !w-auto text-sm"
            >
              <option value="issue">Issue</option>
              <option value="feature">Feature</option>
              <option value="task">Task</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field !min-h-10 !w-auto text-sm"
            />
            <button type="submit" className="btn-primary !min-h-10" disabled={submitting || !title.trim()}>
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f.id ? "bg-accent text-white" : "text-muted hover:text-ink"
            }`}
          >
            {f.label}
            {f.id !== "all" && (
              <span className="ml-1 opacity-70">
                ({openItems.filter((i) => i.type === f.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Open</h3>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded bg-border/30" />
        ) : filteredOpen.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No open items in this filter.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filteredOpen.map((item) => (
              <IssueRow key={item.id} item={item} onComplete={() => onCompleteItem(item.id)} />
            ))}
          </ul>
        )}
      </div>

      {resolvedItems.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Resolved ({resolvedItems.length})
          </h3>
          <ul className="mt-3 space-y-1.5">
            {resolvedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm text-muted line-through">
                <TypeBadge type={item.type} small />
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IssueRow({ item, onComplete }: { item: ProjectItemDTO; onComplete: () => void }) {
  const isOverdue =
    item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-canvas/40 p-3 transition-colors hover:border-accent/20">
      <button
        type="button"
        onClick={onComplete}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border transition-colors hover:border-accent"
        aria-label={`Complete ${item.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          {item.dueDate && (
            <span className={`text-[10px] ${isOverdue ? "font-medium text-red-600" : "text-muted"}`}>
              Due {format(parseISO(item.dueDate), "d MMM")}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-ink">{item.title}</p>
        {item.description && (
          <p className="mt-1 text-xs text-muted">{item.description}</p>
        )}
        {item.description === "Today's goal from extra work" && (
          <p className="mt-1 text-[10px] font-medium text-extra">From daily extra work</p>
        )}
      </div>
    </li>
  );
}

function TypeBadge({ type, small }: { type: ProjectItemType; small?: boolean }) {
  const styles = {
    issue: "bg-extra-light text-extra",
    feature: "bg-blue-50 text-blue-700",
    task: "bg-accent-light text-accent",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-semibold uppercase ${small ? "text-[9px]" : "text-[10px]"} ${styles[type]}`}
    >
      {type}
    </span>
  );
}
