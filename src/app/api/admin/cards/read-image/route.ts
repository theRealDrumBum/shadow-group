import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { normalizeCardsmithDraft, READ_IMAGE_SYSTEM } from "@/lib/cardsmith";
import { OpenAIConfigError, openaiJsonObject } from "@/lib/openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, or GIF of the finished card." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Keep the image under 6 MB." }, { status: 400 });
    }
    const mime = file.type || "image/jpeg";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or GIF." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

    const raw = await openaiJsonObject(
      [
        { role: "system", content: READ_IMAGE_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Read every printed field on this Shadow Group / Magic-style card." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      { temperature: 0 },
    );

    return NextResponse.json({ card: normalizeCardsmithDraft(raw) });
  } catch (error) {
    if (error instanceof OpenAIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Card image read failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read that card image." },
      { status: 502 },
    );
  }
}
