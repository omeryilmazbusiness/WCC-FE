"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isApiError, type ApiError } from "@/shared/api/api-error";
import { VIEWER_REFRESHED_EVENT } from "@/shared/api/http-client";
import type { ViewerSession } from "@/shared/api/session";
import { SessionUserProvider } from "@/shared/api/session-context";
import type { Permission } from "@/shared/config/permissions";
import { fetchViewer } from "../api/viewer-api";
import { can, type CanCheck, type PermissionRequirement } from "./can";

type ViewerContextValue = {
  viewer: ViewerSession;
  refresh: () => Promise<ViewerSession | null>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

type Props = {
  /** Verified server-side from the signed session cookie — avoids a permission flash. */
  initialViewer: ViewerSession;
  onSessionExpired?: (err: ApiError) => void;
  children: React.ReactNode;
};

export function ViewerProvider({ initialViewer, onSessionExpired, children }: Props) {
  const [viewer, setViewer] = useState(initialViewer);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchViewer();
      setViewer(next);
      return next;
    } catch (err) {
      if (isApiError(err) && err.status === 401) onSessionExpired?.(err);
      return null;
    }
  }, [onSessionExpired]);

  useEffect(() => {
    if (!initialViewer.demo) void refresh();
  }, [initialViewer.demo, refresh]);

  useEffect(() => {
    const onRefreshed = () => void refresh();
    window.addEventListener(VIEWER_REFRESHED_EVENT, onRefreshed);
    return () => window.removeEventListener(VIEWER_REFRESHED_EVENT, onRefreshed);
  }, [refresh]);

  const value = useMemo(() => ({ viewer, refresh }), [viewer, refresh]);

  return (
    <ViewerContext.Provider value={value}>
      <SessionUserProvider user={viewer.user}>{children}</SessionUserProvider>
    </ViewerContext.Provider>
  );
}

function useViewerContext(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}

export function useViewer(): ViewerSession {
  return useViewerContext().viewer;
}

export function useRefreshViewer(): () => Promise<ViewerSession | null> {
  return useViewerContext().refresh;
}

/** UI gating only — the backend enforces every permission again. */
export function useCan(perm: PermissionRequirement): boolean;
export function useCan(check: CanCheck): boolean;
export function useCan(arg: PermissionRequirement | CanCheck): boolean {
  const viewer = useContext(ViewerContext)?.viewer ?? null;
  const check: CanCheck =
    typeof arg === "string" || Array.isArray(arg)
      ? { perm: arg as PermissionRequirement }
      : (arg as CanCheck);
  return can(viewer, check);
}

export function usePermissions(): readonly Permission[] {
  return useViewer().permissions;
}
