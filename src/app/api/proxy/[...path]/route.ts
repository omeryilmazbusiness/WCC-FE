import type { NextRequest } from "next/server";
import { proxyRequest } from "@/shared/api/server/proxy";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, { params }: Context) {
  const { path } = await params;
  return proxyRequest(req, path);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
