"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type { ChatGroupDTO, ChatMessageDTO } from "@/lib/auth-types";

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

export function ChatView() {
  const [groups, setGroups] = useState<ChatGroupDTO[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadGroups = useCallback(async () => {
    const res = await apiFetch("/api/chat/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
      if (data[0] && !activeGroup) setActiveGroup(data[0].id);
    }
    setLoading(false);
  }, [activeGroup]);

  const loadMessages = useCallback(async (groupId: string, before?: string) => {
    const q = new URLSearchParams({ initial: before ? "false" : "true", limit: "40" });
    if (before) q.set("before", before);
    const res = await apiFetch(`/api/chat/groups/${groupId}/messages?${q}`);
    if (!res.ok) return;
    const data = await res.json();
    if (before) {
      setMessages((m) => [...data.messages, ...m]);
    } else {
      setMessages(data.messages);
    }
    setHasMore(data.hasMore);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (activeGroup) loadMessages(activeGroup);
  }, [activeGroup, loadMessages]);

  useEffect(() => {
    if (!activeGroup) return;
    void apiFetch(`/api/chat/groups/${activeGroup}/read`, { method: "POST" });
  }, [activeGroup, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!activeGroup || !text.trim()) return;
    const res = await apiFetch(`/api/chat/groups/${activeGroup}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((m) => [...m, msg]);
      setText("");
    }
  }

  async function handleImage(file: File) {
    if (!activeGroup) return;
    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const max = 1200;
      let w = img.width;
      let h = img.height;
      if (w > max) {
        h = (h * max) / w;
        w = max;
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
      if (!blob) return;

      const form = new FormData();
      form.append("file", blob, "chat.jpg");
      const up = await apiFetch("/api/chat/upload", { method: "POST", body: form });
      if (!up.ok) return;
      const { url: imageUrl, publicId } = await up.json();

      const res = await apiFetch(`/api/chat/groups/${activeGroup}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, imagePublicId: publicId }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((m) => [...m, msg]);
      }
    } finally {
      setUploading(false);
    }
  }

  let lastDay = "";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <div className="card w-full shrink-0 p-3 lg:w-56">
        <h2 className="px-2 text-sm font-semibold text-ink">Groups</h2>
        {loading ? (
          <div className="mt-2 h-16 animate-pulse rounded bg-border/30" />
        ) : groups.length === 0 ? (
          <p className="mt-2 px-2 text-xs text-muted">No groups yet. Admin creates groups.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setActiveGroup(g.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                    activeGroup === g.id ? "bg-accent-light text-accent" : "text-muted hover:bg-canvas"
                  }`}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card flex min-h-[420px] flex-1 flex-col overflow-hidden">
        {!activeGroup ? (
          <p className="p-6 text-sm text-muted">Select a group</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => {
                    const first = messages[0];
                    if (first) loadMessages(activeGroup, first.createdAt);
                  }}
                  className="mb-3 w-full text-center text-xs text-accent hover:underline"
                >
                  Load older messages
                </button>
              )}
              {messages.map((m) => {
                const dl = dayLabel(m.createdAt);
                const showDay = dl !== lastDay;
                if (showDay) lastDay = dl;
                return (
                  <div key={m.id}>
                    {showDay && (
                      <p className="my-3 text-center text-[10px] font-medium uppercase text-muted">
                        {dl}
                      </p>
                    )}
                    <div className="mb-3">
                      <p className="text-[10px] font-medium text-muted">
                        {m.senderName} · {format(parseISO(m.createdAt), "HH:mm")}
                      </p>
                      {m.text && <p className="mt-0.5 text-sm text-ink">{m.text}</p>}
                      {m.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" className="mt-1 max-h-48 rounded-lg border border-border" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
              <label className="btn-ghost shrink-0 cursor-pointer !min-w-0 px-3">
                {uploading ? "…" : "📷"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImage(f);
                  }}
                />
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message…"
                className="input-field flex-1 !min-h-10 text-sm"
              />
              <button type="submit" className="btn-primary shrink-0 !min-h-10">
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
