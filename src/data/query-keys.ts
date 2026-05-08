export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.users.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },
  plans: {
    all: ["plans"] as const,
    detail: (id: string) => [...queryKeys.plans.all, "detail", id] as const,
    backlinks: (planId: string, dstId: string) =>
      [...queryKeys.plans.all, "backlinks", planId, dstId] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
  },
} as const;
