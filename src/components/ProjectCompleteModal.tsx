"use client";

import { FormEvent, useEffect, useState } from "react";
import { toDateKey } from "@/lib/dates";
import type { ProjectItemDTO } from "@/lib/types";

interface ProjectCompleteModalProps {
  open: boolean;
  projectName: string;
  openItems: ProjectItemDTO[];
  preselectedId?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    resolvedItemIds: string[];
    date: string;
    addAsExtraTask: boolean;
    extraTaskTitle: string;
  }) => Promise<void>;
}

export function ProjectCompleteModal({
  open,
  projectName,
  openItems,
  preselectedId,
  onClose,
  onSubmit,
}: ProjectCompleteModalProps) {
  const [description, setDescription] = useState("");
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [addAsExtra, setAddAsExtra] = useState(true);
  const [extraTitle, setExtraTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setAddAsExtra(true);
    setExtraTitle("");
    const initial = new Set<string>();
    if (preselectedId) initial.add(preselectedId);
    setResolved(initial);
  }, [open, preselectedId]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        resolvedItemIds: Array.from(resolved),
        date: toDateKey(new Date()),
        addAsExtraTask: addAsExtra,
        extraTaskTitle: extraTitle.trim() || description.trim().slice(0, 80),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function toggleId(id: string) {
    setResolved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Log work done</h2>
          <p className="mt-1 text-sm text-muted">{projectName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              What did you complete?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field min-h-[88px] resize-y"
              placeholder="Describe what you implemented, fixed, or shipped…"
              autoFocus
              required
            />
          </div>

          {openItems.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Mark resolved items / issues</p>
              <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                {openItems.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-canvas">
                      <input
                        type="checkbox"
                        checked={resolved.has(item.id)}
                        onChange={() => toggleId(item.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{item.title}</span>
                        <span className="text-[10px] uppercase text-muted">{item.type}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-extra/20 bg-extra-light/50 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={addAsExtra}
                onChange={(e) => setAddAsExtra(e.target.checked)}
              />
              <span className="text-sm text-ink">Add to today&apos;s extra tasks (+2 pts)</span>
            </label>
            {addAsExtra && (
              <input
                type="text"
                value={extraTitle}
                onChange={(e) => setExtraTitle(e.target.value)}
                placeholder="Task title for daily list (optional)"
                className="input-field mt-2 !min-h-10 text-sm"
              />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting || !description.trim()}>
              {submitting ? "Saving…" : "Save update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
