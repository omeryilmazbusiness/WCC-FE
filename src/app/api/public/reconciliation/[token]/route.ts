import { NextResponse, type NextRequest } from "next/server";
import { backendFetch, clientMetaFrom } from "@/shared/api/server/backend";

export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;
const MAX_BODY = 4096;

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

async function relay(upstream: Response): Promise<NextResponse> {
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { ...noStore, "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

/** Balance confirmation letter, opened by its recipient without signing in. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return NextResponse.json({ error: { code: "not_found" } }, { status: 404, headers: noStore });
  try {
    return await relay(await backendFetch(`/public/reconciliation/${token}`, { meta: clientMetaFrom(req.headers) }));
  } catch {
    return NextResponse.json({ error: { code: "upstream_unavailable" } }, { status: 503, headers: noStore });
  }
}

/** Confirm or dispute. The custom header keeps cross-site form posts out. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return NextResponse.json({ error: { code: "not_found" } }, { status: 404, headers: noStore });
  if (req.headers.get("x-requested-with") !== "wcc") return NextResponse.json({ error: { code: "forbidden" } }, { status: 403, headers: noStore });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: { code: "too_large" } }, { status: 413, headers: noStore });
  let body: { confirm?: unknown; name?: unknown; note?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 400, headers: noStore });
  }
  const payload = {
    confirm: body.confirm === true,
    name: typeof body.name === "string" ? body.name.slice(0, 120) : "",
    note: typeof body.note === "string" ? body.note.slice(0, 1000) : "",
  };
  try {
    return await relay(
      await backendFetch(`/public/reconciliation/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        meta: clientMetaFrom(req.headers),
      }),
    );
  } catch {
    return NextResponse.json({ error: { code: "upstream_unavailable" } }, { status: 503, headers: noStore });
  }
}
