import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, type FieldType } from "@/lib/admin-records";

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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const record = pickFields(body, BRAND_SPEC);
  if (Object.keys(record).length === 0) return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("brands").update(record).eq("id", id).select("*").single();
  if (error) {
    console.error("Brand update failed", error);
    return NextResponse.json({ error: `Unable to update brand: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ brand: data });
}
