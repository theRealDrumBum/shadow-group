import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, slugify, type FieldType } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

const BRAND_SPEC: Record<string, FieldType> = {
  slug: "text",
  name: "text",
  website_url: "text",
  logo_url: "text",
  description: "text",
  partnership_level: "text",
  partner_since: "text",
  is_sponsor: "bool",
  is_active: "bool",
  featured: "bool",
  display_order: "int"
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.from("brands").select("*").order("display_order", { ascending: true }).order("name");
  if (error) return NextResponse.json({ error: "Unable to load brands." }, { status: 500 });
  return NextResponse.json({ brands: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "A brand name is required." }, { status: 400 });

  const record = pickFields(body ?? {}, BRAND_SPEC);
  record.name = name;
  if (!record.slug) record.slug = slugify(name) || `brand-${Date.now()}`;
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("brands").upsert(record, { onConflict: "slug" }).select("*").single();
  if (error) {
    console.error("Brand save failed", error);
    return NextResponse.json({ error: `Unable to save brand: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ brand: data }, { status: 201 });
}
