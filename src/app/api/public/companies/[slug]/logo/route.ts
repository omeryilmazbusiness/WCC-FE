import { NextResponse, type NextRequest } from "next/server";
import { backendFetch } from "@/shared/api/server/backend";
import { isCompanySlug } from "@/shared/lib/workspace-path";

export const dynamic = "force-dynamic";

const PASS_HEADERS = ["content-type", "content-length", "etag", "last-modified"];

/**
 * A company's logo for its sign-in page (public). Versioned URLs (`?v=`) are cached
 * for good; the backend only ever serves sniffed PNG / JPEG / WebP bytes.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCompanySlug(slug)) return new NextResponse(null, { status: 404 });
  const ifNoneMatch = req.headers.get("if-none-match");
  let upstream: Response;
  try {
    upstream = await backendFetch(`/public/companies/${encodeURIComponent(slug)}/logo`, {
      headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : undefined,
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
  if (upstream.status !== 200 && upstream.status !== 304) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }
  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set(
    "Cache-Control",
    req.nextUrl.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=300",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  return new NextResponse(upstream.status === 304 ? null : upstream.body, { status: upstream.status, headers });
}
