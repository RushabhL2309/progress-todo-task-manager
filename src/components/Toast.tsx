"use client";

import { useEffect } from "react";

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[100] w-[min(92vw,24rem)] -translate-x-1/2">
      <div className="rounded-xl border border-accent/30 bg-surface px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-ink">{message}</p>
      </div>
    </div>
  );
}
