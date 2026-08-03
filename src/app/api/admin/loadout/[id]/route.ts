import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pickFields, type FieldType } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

const LOADOUT_SPEC: Record<string, FieldType> = {
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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const record = pickFields(body, LOADOUT_SPEC);
  if (Object.keys(record).length === 0) return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  record.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase.from("operator_loadout_items").update(record).eq("id", id).select("*").single();
  if (error) {
    console.error("Loadout update failed", error);
    return NextResponse.json({ error: `Unable to update loadout item: ${error.message}` }, { status: 400 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const { error } = await auth.supabase.from("operator_loadout_items").delete().eq("id", id);
  if (error) {
    console.error("Loadout delete failed", error);
    return NextResponse.json({ error: "Unable to remove loadout item." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
