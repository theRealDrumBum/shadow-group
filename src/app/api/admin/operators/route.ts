import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { buildOperatorRecord, slugify } from "@/lib/operator-fields";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("operators")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) return NextResponse.json({ error: "Unable to load operators." }, { status: 500 });
  return NextResponse.json({ operators: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const callsign = typeof body?.callsign === "string" ? body.callsign.trim() : "";
  if (!callsign) return NextResponse.json({ error: "A callsign is required." }, { status: 400 });

  const record = buildOperatorRecord(body ?? {});
  record.callsign = callsign;
  if (!record.slug) record.slug = slugify(callsign) || `operator-${Date.now()}`;
  if (record.active === undefined) record.active = true;
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("operators")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    console.error("Operator create failed", error);
    return NextResponse.json({ error: `Unable to create operator: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ operator: data }, { status: 201 });
}
