import { cookies } from "next/headers";
import { SESSION_COOKIE, type ViewerSession } from "@/shared/api/session";
import { verifySession } from "@/shared/api/server/session-token";

export async function getServerSession(): Promise<ViewerSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}
