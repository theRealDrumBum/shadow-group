import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const { searchParams } = request.nextUrl;
    const syncKey = searchParams.get("syncKey")?.trim();
    const slug = searchParams.get("slug")?.trim();
    const name = searchParams.get("name")?.trim();
    const callsign = searchParams.get("callsign")?.trim();

    if (!syncKey && !slug && !name && !callsign) {
      return NextResponse.json(
        { error: "Provide syncKey, slug, name, or callsign." },
        { status: 400 }
      );
    }

    let query = supabase.from("complete_cards").select("*").limit(20);

    if (syncKey) query = query.eq("sync_key", syncKey);
    if (slug) query = query.eq("slug", slug);
    if (name) query = query.ilike("name", name);
    if (callsign) query = query.ilike("callsign", callsign);

    const { data, error } = await query;

    if (error) {
      console.error("Card lookup failed", error);
      return NextResponse.json({ error: "Unable to search cards." }, { status: 500 });
    }

    return NextResponse.json({ exists: Boolean(data?.length), matches: data ?? [] });
  } catch (error) {
    console.error("Card lookup configuration failed", error);
    return NextResponse.json({ error: "Card API is not configured." }, { status: 503 });
  }
}
