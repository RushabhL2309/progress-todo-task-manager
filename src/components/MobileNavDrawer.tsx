"use client";

import { useEffect } from "react";
import type { AppPage } from "./Sidebar";
import type { ReactNode } from "react";

export type MobileNavItem = {
  id: AppPage;
  label: string;
  shortLabel: string;
  desc: string;
  icon: ReactNode;
};

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  active: AppPage;
  onNavigate: (page: AppPage) => void;
  userName: string;
}

export function MobileNavDrawer({
  open,
  onClose,
  items,
  active,
  onNavigate,
  userName,
}: MobileNavDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[55] bg-ink/30 backdrop-blur-[1px] lg:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[56] max-h-[min(78vh,520px)] overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl animate-slide-up lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex justify-center border-b border-border py-3">
          <div className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">{userName}</p>
          <p className="text-xs text-muted">Choose a section</p>
        </div>
        <nav className="max-h-[calc(min(78vh,520px)-7rem)] overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                      isActive ? "bg-accent-light text-accent" : "text-ink hover:bg-canvas"
                    }`}
                  >
                    <span className={isActive ? "text-accent" : "text-muted"}>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs opacity-70">{item.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
