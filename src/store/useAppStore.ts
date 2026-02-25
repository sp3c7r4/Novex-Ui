import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Workspace, AppEvent } from "@/types";

interface Auth {
  token: string | null;
  user: User | null;
}

interface AppState {
  auth: Auth;
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  isInitializing: boolean;
  eventLogs: AppEvent[];

  // Auth actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => void;

  // Workspace actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setSelectedWorkspace: (ws: Workspace | null) => void;

  // Event actions
  setIsInitializing: (v: boolean) => void;
  addEvent: (event: AppEvent) => void;
  clearEvents: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      auth: { token: null, user: null },
      workspaces: [],
      selectedWorkspace: null,
      isInitializing: false,
      eventLogs: [],

      setToken: (token) =>
        set((s) => ({ auth: { ...s.auth, token } })),

      setUser: (user) =>
        set((s) => ({ auth: { ...s.auth, user } })),

      setAuth: (token, user) =>
        set({ auth: { token, user } }),

      logout: () =>
        set({
          auth: { token: null, user: null },
          workspaces: [],
          selectedWorkspace: null,
          eventLogs: [],
        }),

      setWorkspaces: (workspaces) => set({ workspaces }),

      addWorkspace: (workspace) =>
        set((s) => ({ workspaces: [...s.workspaces, workspace] })),

      removeWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
        })),

      setSelectedWorkspace: (selectedWorkspace) => set({ selectedWorkspace }),

      setIsInitializing: (isInitializing) => set({ isInitializing }),

      addEvent: (event) =>
        set((s) => ({ eventLogs: [...s.eventLogs, event] })),

      clearEvents: () => set({ eventLogs: [] }),
    }),
    {
      name: "novex-storage",
      partialize: (s) => ({ auth: s.auth, workspaces: s.workspaces }),
    }
  )
);
