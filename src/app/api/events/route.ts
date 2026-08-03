import { NextResponse } from "next/server";
import { getPublicEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getPublicEvents(12);
  return NextResponse.json({ events, count: events.length }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
  });
}
