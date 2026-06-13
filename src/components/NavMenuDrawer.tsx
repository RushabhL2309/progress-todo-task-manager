"use client";

import { useEffect, type ReactNode } from "react";
import type { AppPage } from "./Sidebar";

export type MobileNavItem = {
  id: AppPage;
  label: string;
  shortLabel: string;
  desc: string;
  icon: ReactNode;
};

interface NavMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  active: AppPage;
  onNavigate: (page: AppPage) => void;
  userName: string;
}

export function NavMenuDrawer({
  open,
  onClose,
  items,
  active,
  onNavigate,
  userName,
}: NavMenuDrawerProps) {
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
        className="fixed inset-0 z-[55] bg-ink/25 backdrop-blur-[1px] lg:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="fixed left-3 right-3 top-[calc(4.25rem+env(safe-area-inset-top,0px))] z-[56] mx-auto flex max-h-[min(72vh,520px)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-slide-down lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">{userName}</p>
          <p className="text-xs text-muted">Choose a section</p>
        </div>
        <nav className="overflow-y-auto p-3">
          <ul className="grid gap-1 sm:grid-cols-2">
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
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-center text-[11px] text-muted">Routine 1pt · Extra 2pts</p>
        </div>
      </div>
    </>
  );
}
