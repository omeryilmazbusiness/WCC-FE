import { cookies } from "next/headers";
import { parseSession, SESSION_COOKIE, type Session } from "@/shared/api/session";

export async function getServerSession(): Promise<Session | null> {
  const jar = await cookies();
  return parseSession(jar.get(SESSION_COOKIE)?.value);
}
