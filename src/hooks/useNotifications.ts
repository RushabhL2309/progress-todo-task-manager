"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppNotification } from "@/lib/auth-types";

export function useNotifications(onToast: (message: string) => void) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const load = useCallback(async () => {
    try {
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
    } catch {
      // Server offline — keep last known notifications
    }
  }, [onToast]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return { items, count, reload: load };
}
