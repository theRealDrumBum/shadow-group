import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export function cardSyncUnauthorized() {
  return NextResponse.json({ error: "Unauthorized. Send Authorization: Bearer <CARD_SYNC_API_KEY>." }, { status: 401 });
}

export function cardSyncNotConfigured(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}

/** 401 if the bearer key is wrong, 503 if the server has no CARD_SYNC_API_KEY. */
export function authorizeCardSync(request: NextRequest): NextResponse | null {
  const expected = process.env.CARD_SYNC_API_KEY?.trim();
  if (!expected) {
    return cardSyncNotConfigured("CARD_SYNC_API_KEY is not configured on the server.");
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!supplied || supplied !== expected) return cardSyncUnauthorized();
  return null;
}

export function createCardSyncAdmin() {
  try {
    return { supabase: createSupabaseAdmin() };
  } catch {
    return {
      error: cardSyncNotConfigured(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      )
    };
  }
}
