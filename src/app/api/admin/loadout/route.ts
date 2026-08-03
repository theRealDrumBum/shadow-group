import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, type FieldType } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

const LOADOUT_SPEC: Record<string, FieldType> = {
  operator_id: "uuid",
  gear_id: "uuid",
  custom_name: "text",
  category: "text",
  loadout_group: "text",
  notes: "text",
  custom_product_url: "text",
  custom_affiliate_url: "text",
  sponsor_label: "text",
  is_sponsored: "bool",
  is_public: "bool",
  is_featured: "bool",
  display_order: "int"
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const operatorId = request.nextUrl.searchParams.get("operator_id");
  let query = auth.supabase
    .from("operator_loadout_items")
    .select("*, gear:gear_catalog(name,category,brand:brands(name))")
    .order("display_order", { ascending: true });
  if (operatorId) query = query.eq("operator_id", operatorId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load loadout." }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const record = pickFields(body ?? {}, LOADOUT_SPEC);
  if (!record.operator_id) return NextResponse.json({ error: "An operator is required." }, { status: 400 });
  if (!record.category) return NextResponse.json({ error: "A category is required." }, { status: 400 });
  if (!record.gear_id && !record.custom_name) {
    return NextResponse.json({ error: "Pick a gear item or provide a custom name." }, { status: 400 });
  }
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("operator_loadout_items").insert(record).select("*").single();
  if (error) {
    console.error("Loadout create failed", error);
    return NextResponse.json({ error: `Unable to add loadout item: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
}
