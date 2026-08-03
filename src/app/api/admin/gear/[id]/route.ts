import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, type FieldType } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

const GEAR_SPEC: Record<string, FieldType> = {
  slug: "text",
  name: "text",
  category: "text",
  model: "text",
  image_url: "text",
  product_url: "text",
  affiliate_url: "text",
  affiliate_network: "text",
  affiliate_campaign: "text",
  affiliate_code: "text",
  sponsor_note: "text",
  disclosure_text: "text",
  brand_id: "uuid",
  is_active: "bool"
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const record = pickFields(body, GEAR_SPEC);
  if (Object.keys(record).length === 0) return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("gear_catalog").update(record).eq("id", id).select("*").single();
  if (error) {
    console.error("Gear update failed", error);
    return NextResponse.json({ error: `Unable to update gear: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ gear: data });
}
