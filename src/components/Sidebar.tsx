"use client";

import type { ReactNode } from "react";
import type { SessionUser, UserModules } from "@/lib/auth-types";
import { effectiveModules, isMaster } from "@/lib/user-access";

export type AppPage =
  | "grid"
  | "dashboard"
  | "projects"
  | "todo"
  | "tasks"
  | "clients"
  | "chat"
  | "admin"
  | "settings";

interface SidebarProps {
  active: AppPage;
  user: SessionUser;
  onNavigate: (page: AppPage) => void;
}

type NavItem = {
  id: AppPage;
  label: string;
  shortLabel: string;
  desc: string;
  icon: ReactNode;
  module?: keyof UserModules;
  masterOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    id: "grid",
    label: "Progress Grid",
    shortLabel: "Grid",
    desc: "Checkbox table",
    module: "tracker",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Stats",
    desc: "Charts & stats",
    module: "tracker",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M3 17V9M8 17V3M13 17V11M18 17V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    shortLabel: "Proj",
    desc: "Multi-project hub",
    module: "projects",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 4V8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "clients",
    label: "Client updates",
    shortLabel: "Clients",
    desc: "Enquiry & payments",
    module: "client_updates",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 14V6M10 14V4M16 14V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "todo",
    label: "Daily To-Do",
    shortLabel: "To-Do",
    desc: "Add & edit day list",
    module: "todo",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 6H16M7 10H16M7 14H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 10L6.5 11.5L9 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "tasks",
    label: "Manage Tasks",
    shortLabel: "Tasks",
    desc: "Regular & extra",
    module: "tracker",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 6H16M4 10H16M4 14H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Team chat",
    shortLabel: "Chat",
    desc: "Internal messages",
    module: "chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 5H16V13H6L4 15V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "admin",
    label: "Admin",
    shortLabel: "Admin",
    desc: "Users & groups",
    masterOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    desc: "Account",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2.5V4.5M10 15.5V17.5M17.5 10H15.5M4.5 10H2.5M15.1 4.9L13.7 6.3M6.3 13.7L4.9 15.1M15.1 15.1L13.7 13.7M6.3 6.3L4.9 4.9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function visibleNav(user: SessionUser) {
  const mods = effectiveModules(user);
  return NAV.filter((item) => {
    if (item.masterOnly) return isMaster(user);
    if (!item.module) return true;
    return mods[item.module];
  });
}

function NavButton({
  item,
  isActive,
  onClick,
  layout,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  layout: "sidebar" | "mobile";
}) {
  if (layout === "mobile") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-colors ${
          isActive ? "text-accent" : "text-muted"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            isActive ? "bg-accent-light text-accent" : ""
          }`}
        >
          {item.icon}
        </span>
        <span className="max-w-[52px] truncate text-[9px] font-semibold leading-none sm:text-[10px]">
          {item.shortLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        isActive ? "bg-accent-light text-accent shadow-sm" : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      <span className={isActive ? "text-accent" : "text-muted"}>{item.icon}</span>
      <span>
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block text-xs opacity-70">{item.desc}</span>
      </span>
    </button>
  );
}

export function Sidebar({ active, user, onNavigate }: SidebarProps) {
  const items = visibleNav(user);

  return (
    <>
      <aside
        className="fixed left-4 top-4 bottom-4 z-40 hidden w-[220px] flex-col rounded-2xl border border-border bg-surface/95 shadow-[0_8px_32px_rgba(26,26,26,0.08)] backdrop-blur-md lg:flex"
        aria-label="Main navigation"
      >
        <div className="border-b border-border px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M4 10L8 14L16 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={active === item.id}
              onClick={() => onNavigate(item.id)}
              layout="sidebar"
            />
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="rounded-lg bg-canvas px-3 py-2 text-center text-[11px] text-muted">
            Routine 1pt · Extra 2pts
          </p>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_rgba(26,26,26,0.06)] backdrop-blur-md lg:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 overflow-x-auto px-1">
          {items.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={active === item.id}
              onClick={() => onNavigate(item.id)}
              layout="mobile"
            />
          ))}
        </div>
      </nav>
    </>
  );
}

export function defaultPageForUser(user: SessionUser): AppPage {
  const items = visibleNav(user);
  return items[0]?.id ?? "settings";
}

export function canAccessPage(user: SessionUser, page: AppPage): boolean {
  return visibleNav(user).some((item) => item.id === page);
}
