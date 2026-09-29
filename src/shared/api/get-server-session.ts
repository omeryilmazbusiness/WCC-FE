import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, WORKSPACE_HEADER, type ViewerSession } from "@/shared/api/session";
import { verifySession } from "@/shared/api/server/session-token";
import { parseWorkspaceRef, type WorkspaceRef } from "@/shared/lib/workspace-path";

export async function getServerSession(): Promise<ViewerSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Workspace the middleware rewrote this request from (`/{company}/{branch}/...`). */
export async function getServerWorkspace(): Promise<WorkspaceRef | null> {
  return parseWorkspaceRef((await headers()).get(WORKSPACE_HEADER));
}
