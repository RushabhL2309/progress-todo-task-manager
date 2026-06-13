import { mergeProjectTimeline } from "./project-activity";
import { toDateKey } from "./dates";
import { projectDTOFromStats } from "./project-serializers";
import type {
  ProjectDTO,
  ProjectDetailDTO,
  ProjectItemDTO,
  ProjectItemType,
  ProjectStatus,
  ProjectUpdateDTO,
  ProjectsDashboardStats,
} from "./types";

interface DemoProject {
  project: ProjectDTO;
  items: ProjectItemDTO[];
  updates: ProjectUpdateDTO[];
}

function newId(prefix: string, n: number) {
  return `${prefix}-${n}`;
}

function demoItem(
  partial: Omit<ProjectItemDTO, "assignedUserId" | "createdBy" | "completionNote"> &
    Partial<Pick<ProjectItemDTO, "assignedUserId" | "createdBy" | "completionNote">>
): ProjectItemDTO {
  return {
    assignedUserId: null,
    createdBy: null,
    completionNote: "",
    ...partial,
  };
}

function buildSeed(): { projects: DemoProject[]; nextId: number } {
  const today = toDateKey(new Date());
  const projects: DemoProject[] = [
    {
      project: {
        id: "demo-proj-1",
        name: "Progress Tracker",
        description: "Daily habit tracker with grid, scoring, and MongoDB",
        status: "active",
        color: "#5B7C6B",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ProjectDTO,
      items: [
        demoItem({
          id: "demo-pi-1",
          projectId: "demo-proj-1",
          title: "Vercel production deploy",
          description: "Fix build errors and env vars",
          type: "task",
          status: "resolved",
          dueDate: today,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
        }),
        demoItem({
          id: "demo-pi-2",
          projectId: "demo-proj-1",
          title: "Projects hub UI",
          description: "Cards, timeline, issue tracking",
          type: "feature",
          status: "open",
          dueDate: today,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
        }),
        demoItem({
          id: "demo-pi-3",
          projectId: "demo-proj-1",
          title: "Mobile nav overflow",
          description: "5 tabs on small screens",
          type: "issue",
          status: "open",
          dueDate: null,
          sortOrder: 2,
          createdAt: new Date().toISOString(),
        }),
      ],
      updates: [
        {
          id: "demo-pu-1",
          projectId: "demo-proj-1",
          date: today,
          description: "Fixed Vercel build — request param typo in extra DELETE route",
          resolvedItemIds: ["demo-pi-1"],
          linkedExtraTaskId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    {
      project: {
        id: "demo-proj-2",
        name: "Client Dashboard",
        description: "Analytics dashboard for retail client",
        status: "active",
        color: "#4A6FA5",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ProjectDTO,
      items: [
        demoItem({
          id: "demo-pi-4",
          projectId: "demo-proj-2",
          title: "Export CSV reports",
          type: "feature",
          status: "open",
          description: "",
          dueDate: today,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
        }),
        demoItem({
          id: "demo-pi-5",
          projectId: "demo-proj-2",
          title: "Chart loading slow",
          type: "issue",
          status: "open",
          description: "Recharts bundle size",
          dueDate: null,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
        }),
      ],
      updates: [],
    },
  ];

  for (const p of projects) syncCounts(p);
  return { projects, nextId: 100 };
}

declare global {
  var demoProjectsCache:
    | { projects: DemoProject[]; nextId: number }
    | undefined;
}

function getStore() {
  if (!global.demoProjectsCache) {
    global.demoProjectsCache = buildSeed();
  }
  return global.demoProjectsCache;
}

function syncCounts(p: DemoProject) {
  p.project = projectDTOFromStats(
    {
      ...p.project,
      updatedAt: new Date().toISOString(),
    },
    p.items
  );
}

export const demoProjectsStore = {
  list(): ProjectDTO[] {
    return getStore().projects.map((p) => p.project);
  },

  dashboard(): ProjectsDashboardStats {
    const list = this.list();
    return {
      totalProjects: list.length,
      activeProjects: list.filter((p) => p.status === "active").length,
      openIssues: list.reduce((s, p) => s + p.openCount, 0),
      resolvedIssues: list.reduce((s, p) => s + p.resolvedCount, 0),
      projects: list,
    };
  },

  getDetail(id: string): ProjectDetailDTO | null {
    const p = getStore().projects.find((x) => x.project.id === id);
    if (!p) return null;
    return {
      project: p.project,
      items: [...p.items].sort((a, b) => a.sortOrder - b.sortOrder),
      updates: [...p.updates].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      ),
      activities: mergeProjectTimeline([], p.updates, p.items),
    };
  },

  createProject(name: string, description: string, status: ProjectStatus = "active") {
    const store = getStore();
    const base = {
      id: newId("demo-proj", store.nextId++),
      name,
      description,
      status,
      color: "#5B7C6B",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deadline: null,
      createdBy: "",
      assignedUserIds: [] as string[],
      linkedClientId: null,
    };
    const project = projectDTOFromStats(base, []);
    store.projects.push({ project, items: [], updates: [] });
    return project;
  },

  setItemStatus(
    projectId: string,
    itemId: string,
    status: "open" | "resolved"
  ): boolean {
    const p = getStore().projects.find((x) => x.project.id === projectId);
    if (!p) return false;
    const item = p.items.find((i) => i.id === itemId);
    if (!item) return false;
    item.status = status;
    syncCounts(p);
    return true;
  },

  addItem(
    projectId: string,
    data: {
      title: string;
      description?: string;
      type?: ProjectItemType;
      dueDate?: string | null;
    }
  ): ProjectItemDTO | null {
    const p = getStore().projects.find((x) => x.project.id === projectId);
    if (!p) return null;
    const item = demoItem({
      id: newId("demo-pi", getStore().nextId++),
      projectId,
      title: data.title,
      description: data.description ?? "",
      type: data.type ?? "task",
      status: "open",
      dueDate: data.dueDate ?? null,
      sortOrder: p.items.length,
      createdAt: new Date().toISOString(),
    });
    p.items.push(item);
    syncCounts(p);
    return item;
  },

  completeWork(
    projectId: string,
    data: {
      description: string;
      resolvedItemIds: string[];
      date: string;
      linkedExtraTaskId?: string | null;
    }
  ): ProjectUpdateDTO | null {
    const p = getStore().projects.find((x) => x.project.id === projectId);
    if (!p) return null;

    for (const id of data.resolvedItemIds) {
      const item = p.items.find((i) => i.id === id);
      if (item) item.status = "resolved";
    }

    const update: ProjectUpdateDTO = {
      id: newId("demo-pu", getStore().nextId++),
      projectId,
      date: data.date,
      description: data.description,
      resolvedItemIds: data.resolvedItemIds,
      linkedExtraTaskId: data.linkedExtraTaskId ?? null,
      createdAt: new Date().toISOString(),
    };
    p.updates.unshift(update);
    syncCounts(p);
    return update;
  },

  deleteProject(id: string): boolean {
    const store = getStore();
    const idx = store.projects.findIndex((p) => p.project.id === id);
    if (idx < 0) return false;
    store.projects.splice(idx, 1);
    return true;
  },
};
