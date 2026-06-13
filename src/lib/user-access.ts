import type { SessionUser, UserModules } from "./auth-types";

const ALL_TRUE: UserModules = {
  todo: true,
  tracker: true,
  projects: true,
  client_updates: true,
  chat: true,
};

export function effectiveModules(user: SessionUser): UserModules {
  return user.role === "master" ? ALL_TRUE : user.modules;
}

export function isMaster(user: SessionUser): boolean {
  return user.role === "master";
}

export function hasModule(user: SessionUser, mod: keyof UserModules): boolean {
  return effectiveModules(user)[mod];
}
