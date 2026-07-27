import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const { searchParams } = request.nextUrl;
    const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const expansion = searchParams.get("expansion");
    const callsign = searchParams.get("callsign");

    let query = supabase
      .from("complete_cards")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (expansion) query = query.eq("expansion_code", expansion.toUpperCase());
    if (callsign) query = query.ilike("callsign", callsign);

    const { data, error } = await query;

    if (error) {
      console.error("Card API query failed", error);
      return NextResponse.json({ error: "Unable to load cards." }, { status: 500 });
    }

    return NextResponse.json(
      { cards: data ?? [], count: data?.length ?? 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
        }
      }
    );
  } catch (error) {
    console.error("Card API configuration failed", error);
    return NextResponse.json({ error: "Card API is not configured." }, { status: 503 });
  }
}
