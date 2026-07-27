import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const expansion = request.nextUrl.searchParams.get("expansion")?.trim().toUpperCase();

    let query = supabase.from("complete_cards").select("*");
    if (expansion) query = query.eq("expansion_code", expansion);

    const { data, error } = await query;
    if (error) throw error;

    if (!data?.length) {
      return NextResponse.json({ card: null, count: 0 }, { status: 200 });
    }

    const card = data[Math.floor(Math.random() * data.length)];
    return NextResponse.json(
      { card, count: data.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Random card API failed", error);
    return NextResponse.json({ error: "Unable to load a random card." }, { status: 500 });
  }
}
