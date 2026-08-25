import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { COMMISSION_SYSTEM, normalizeCardsmithDraft } from "@/lib/cardsmith";
import { OpenAIConfigError, openaiJsonObject } from "@/lib/openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  brief?: string;
  operatorCallsign?: string;
  operatorName?: string;
  operatorRole?: string;
  expansionCode?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const brief = body?.brief?.trim();
  const callsign = body?.operatorCallsign?.trim();
  if (!brief || !callsign) {
    return NextResponse.json({ error: "Choose an operator and describe the card you want." }, { status: 400 });
  }

  const operatorLine = [
    `Callsign: ${callsign}`,
    body?.operatorName ? `Name: ${body.operatorName}` : null,
    body?.operatorRole ? `Role: ${body.operatorRole}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await openaiJsonObject(
      [
        { role: "system", content: COMMISSION_SYSTEM },
        {
          role: "user",
          content: `Design a card for this Shadow Group operator.\n${operatorLine}\nExpansion: ${(body?.expansionCode || "SG").toUpperCase()}\n\nBrief:\n${brief}`,
        },
      ],
      { temperature: 0.7 },
    );

    const card = normalizeCardsmithDraft(raw);
    card.operatorCallsign = callsign;
    if (body?.expansionCode) card.expansionCode = body.expansionCode.toUpperCase();
    return NextResponse.json({ card });
  } catch (error) {
    if (error instanceof OpenAIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Cardsmith commission failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to commission that card." },
      { status: 502 },
    );
  }
}
