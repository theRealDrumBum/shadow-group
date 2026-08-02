import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, slugify, type FieldType } from "@/lib/admin-records";

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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase
    .from("gear_catalog")
    .select("*, brand:brands(name)")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: "Unable to load gear." }, { status: 500 });
  return NextResponse.json({ gear: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  if (!name || !category) return NextResponse.json({ error: "Gear name and category are required." }, { status: 400 });

  const record = pickFields(body ?? {}, GEAR_SPEC);
  record.name = name;
  record.category = category;
  if (!record.slug) record.slug = slugify(name) || `gear-${Date.now()}`;
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("gear_catalog").upsert(record, { onConflict: "slug" }).select("*").single();
  if (error) {
    console.error("Gear save failed", error);
    return NextResponse.json({ error: `Unable to save gear: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ gear: data }, { status: 201 });
}
