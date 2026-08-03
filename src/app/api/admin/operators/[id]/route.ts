import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { buildOperatorRecord } from "@/lib/operator-fields";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const record = buildOperatorRecord(body);
  if (typeof body.callsign === "string" && !body.callsign.trim()) {
    return NextResponse.json({ error: "Callsign cannot be empty." }, { status: 400 });
  }
  if (Object.keys(record).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("operators")
    .update(record)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Operator update failed", error);
    return NextResponse.json({ error: `Unable to update operator: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ operator: data });
}
