"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppNotification } from "@/lib/auth-types";
import type { AppPage } from "./Sidebar";

interface NotificationBellProps {
  onNavigate: (page: AppPage) => void;
  onToast: (message: string) => void;
}

export function NotificationBell({ onNavigate, onToast }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = (await res.json()) as { notifications: AppNotification[]; count: number };
    setItems(data.notifications);
    setCount(data.count);

    for (const n of data.notifications) {
      if (!seenRef.current.has(n.id)) {
        seenRef.current.add(n.id);
        if (initializedRef.current) {
          onToast(`${n.title} — ${n.body}`);
        }
      }
    }
    initializedRef.current = true;
  }, [onToast]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function updatePos() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  function handleClick(n: AppNotification) {
    onNavigate(n.page);
    setOpen(false);
  }

  const menu = open && mounted && (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60]"
        aria-label="Close notifications"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed z-[70] w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-border bg-surface shadow-xl sm:w-80"
        style={{ top: menuPos.top, right: menuPos.right }}
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-ink">Notifications</p>
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-3 py-4 text-xs text-muted">All caught up — nothing pending.</li>
          ) : (
            items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-canvas ${
                    n.severity === "urgent" ? "bg-red-50/50" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-ink">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">{n.body}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-2">
      {count === 0 && (
        <span className="hidden rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 sm:inline sm:text-xs">
          All caught up
        </span>
      )}
      <div className="relative shrink-0">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative btn-ghost !min-h-9 px-2.5"
          title="Notifications"
          aria-label={`Notifications${count ? `, ${count} items` : ""}`}
          aria-expanded={open}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 3C7.5 3 5.5 5 5.5 7.5V11L4 13H16L14.5 11V7.5C14.5 5 12.5 3 10 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M8 15H12C12 16.1 11.1 17 10 17C8.9 17 8 16.1 8 15Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
        {mounted && menu && createPortal(menu, document.body)}
      </div>
    </div>
  );
}
