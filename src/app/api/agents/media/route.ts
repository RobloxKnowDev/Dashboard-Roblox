import { NextResponse, type NextRequest } from "next/server";
import { authenticateMachine, handleMedia, MAX_IMAGE_BYTES } from "@/features/agents/ingest-server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Screenshot shared by an agent (multipart: sessionId, agentId?, caption, file). */
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const machine = await authenticateMachine(admin, request.headers.get("authorization"));
  if (!machine) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "Image must be under 8 MB" }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  try {
    const result = await handleMedia(admin, machine, form);
    return result.ok ? NextResponse.json({ ok: true, eventId: result.eventId }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("[agents/media]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
