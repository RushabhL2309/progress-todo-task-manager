"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type { ProjectTaskDTO, TaskMessageDTO } from "@/lib/types";
import { Drawer } from "./Drawer";

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated: (task: ProjectTaskDTO) => void;
  onOpenProject?: (projectId: string) => void;
}

export function TaskDetailDrawer({
  taskId,
  onClose,
  onUpdated,
  onOpenProject,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<ProjectTaskDTO | null>(null);
  const [messages, setMessages] = useState<TaskMessageDTO[]>([]);
  const [canChat, setCanChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [detailRes, meRes] = await Promise.all([
        apiFetch(`/api/projects/tasks/${id}`),
        fetch("/api/auth/me"),
      ]);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setTask(data.task);
        setMessages(data.messages ?? []);
        setCanChat(Boolean(data.canChat));
        setCompletionNote("");
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserId(me?.id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) load(taskId);
    else {
      setTask(null);
      setMessages([]);
    }
  }, [taskId, load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleComplete(e: FormEvent) {
    e.preventDefault();
    if (!task || !completionNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/projects/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", completionNote: completionNote.trim() }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ProjectTaskDTO;
        setTask(updated);
        onUpdated(updated);
        setCompletionNote("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen() {
    if (!task) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/projects/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ProjectTaskDTO;
        setTask(updated);
        onUpdated(updated);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendChat(e: FormEvent) {
    e.preventDefault();
    if (!task || !chatText.trim() || !canChat) return;
    setSendingChat(true);
    try {
      const res = await apiFetch(`/api/projects/tasks/${task.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatText.trim() }),
      });
      if (res.ok) {
        const msg = (await res.json()) as TaskMessageDTO;
        setMessages((list) => [...list, msg]);
        setChatText("");
      }
    } finally {
      setSendingChat(false);
    }
  }

  const open = Boolean(taskId);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task?.title ?? "Task"}
      subtitle={
        task
          ? `${task.type}${task.projectName ? ` · ${task.projectName}` : " · Independent"}`
          : undefined
      }
    >
      {loading || !task ? (
        <div className="h-40 animate-pulse rounded-xl bg-border/30" />
      ) : (
        <div className="space-y-6">
          {task.description && (
            <p className="text-sm text-muted">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted">
            {task.projectId && (
              <button
                type="button"
                onClick={() => onOpenProject?.(task.projectId!)}
                className="rounded-full bg-accent-light px-2 py-0.5 font-medium text-accent hover:underline"
              >
                {task.projectName}
              </button>
            )}
            {task.dueDate && (
              <span>Due {format(parseISO(task.dueDate), "d MMM yyyy")}</span>
            )}
            {task.createdByName && <span>Created by {task.createdByName}</span>}
            {task.assignedUserName && <span>Assigned to {task.assignedUserName}</span>}
          </div>

          {canChat && (task.createdBy || task.assignedUserId) ? (
            <div className="rounded-xl border border-border bg-canvas p-3">
              <h3 className="text-sm font-semibold text-ink">Task messages</h3>
              <p className="mt-0.5 text-xs text-muted">
                Chat between {task.createdByName ?? "creator"} and{" "}
                {task.assignedUserName ?? "assignee (not set yet)"}
              </p>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted">No messages yet — start the conversation</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm ${
                        m.senderId === currentUserId ? "text-right" : "text-left"
                      }`}
                    >
                      <p className="text-[10px] text-muted">{m.senderName}</p>
                      <p
                        className={`mt-0.5 inline-block rounded-lg px-2.5 py-1.5 ${
                          m.senderId === currentUserId
                            ? "bg-accent text-white"
                            : "bg-canvas text-ink"
                        }`}
                      >
                        {m.text}
                      </p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Type a message…"
                  className="input-field flex-1 !min-h-9 text-sm"
                />
                <button
                  type="submit"
                  className="btn-primary shrink-0 !min-h-9 px-4"
                  disabled={sendingChat || !chatText.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-canvas px-3 py-2 text-xs text-muted">
              Messages are only visible to the person who created this task and whoever it is assigned to.
              {!task.assignedUserId && " Assign someone to enable the conversation."}
            </p>
          )}

          {task.status === "resolved" && task.completionNote && (
            <div className="rounded-lg border border-border bg-canvas p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Work performed
              </p>
              <p className="mt-1 text-sm text-ink">{task.completionNote}</p>
            </div>
          )}

          {task.status === "open" ? (
            <form onSubmit={handleComplete} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  What was performed? (required to complete)
                </label>
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Describe the work you did…"
                  rows={4}
                  className="input-field min-h-[100px] text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={submitting || !completionNote.trim()}
              >
                {submitting ? "Saving…" : "Mark complete"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              className="btn-ghost w-full border border-border text-sm"
              disabled={submitting}
            >
              Reopen task
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}
