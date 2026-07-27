import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "submitted";
  const { data, error } = await auth.supabase
    .from("cards")
    .select("*, operators(*), expansions(*), card_versions(*)")
    .eq("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Admin review queue failed", error);
    return NextResponse.json({ error: "Unable to load review queue." }, { status: 500 });
  }

  return NextResponse.json({ cards: data ?? [], count: data?.length ?? 0 });
}
