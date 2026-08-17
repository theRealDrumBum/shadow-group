import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { publicCardAssetUrl } from "@/lib/card-registry";
import { pickPrimaryAssetUrl } from "@/lib/card-assets";
import { CardReviewQueue, type ReviewCard, type ReviewVersion } from "./card-review-queue";
import "../../cards/cards.css";

export const dynamic = "force-dynamic";

type OperatorRef = { callsign: string; display_name: string | null; team_role: string | null };
type ExpansionRef = { code: string | null };
type AssetRef = { kind: string | null; storage_path: string | null };

type VersionRow = ReviewVersion & {
  color_identity?: string[] | null;
  preview_token?: string | null;
  card_assets?: AssetRef[] | null;
};

type CardRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  collector_number: string | null;
  submitted_at: string | null;
  created_at: string | null;
  operators: OperatorRef | OperatorRef[] | null;
  expansions: ExpansionRef | ExpansionRef[] | null;
  card_versions: VersionRow[] | null;
};

export default async function CardWorkflowPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("cards")
    .select("id,name,slug,status,collector_number,submitted_at,created_at,operators!cards_operator_id_fkey(callsign,display_name,team_role),expansions(code),card_versions!card_versions_card_id_fkey(id,version_number,status,type_line,mana_cost,color_identity,rules_text,flavor_text,power,toughness,rarity,review_notes,submitted_at,created_at,preview_token,card_assets(kind,storage_path))")
    .order("created_at", { ascending: false })
    .limit(100);

  const cards: ReviewCard[] = ((data ?? []) as CardRow[]).map((card) => {
    const operator = Array.isArray(card.operators) ? card.operators[0] : card.operators;
    const expansion = Array.isArray(card.expansions) ? card.expansions[0] : card.expansions;
    const versions = [...(card.card_versions ?? [])]
      .sort((a, b) => b.version_number - a.version_number)
      .map((version) => ({
        ...version,
        previewPath: version.preview_token ? `/cards/preview/${version.preview_token}` : null,
        artworkUrl: pickPrimaryAssetUrl(
          (version.card_assets ?? []).map((asset) => ({
            kind: asset.kind,
            url: publicCardAssetUrl(asset.storage_path)
          }))
        ),
        callsign: operator?.callsign ?? null,
        role: operator?.team_role ?? null,
        slug: card.slug,
        cardName: card.name,
        collectorNumber: card.collector_number,
        expansionCode: expansion?.code ?? null
      }));
    return {
      id: card.id,
      name: card.name,
      status: card.status,
      callsign: operator?.callsign ?? null,
      operatorName: operator?.display_name ?? null,
      submittedAt: card.submitted_at ?? card.created_at ?? null,
      versions
    };
  });

  const pendingReview = cards.filter((card) =>
    card.versions.some((version) => version.status === "submitted" || version.status === "changes_requested")
  ).length;

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // CARD GOVERNANCE</span>
      <h1 className="page-title">Card workflow.</h1>
      <p>
        Review submitted card versions with a live card-face preview, request changes, reject with feedback, or
        approve a version as the new canonical entry. Approving a version publishes it to the public Card Gallery.
        Only authenticated administrators can perform these actions.
      </p>
      <div className="workflow-summary">
        <div className="workflow-metric">
          <span className="workflow-metric-value">{cards.length}</span>
          <span className="workflow-metric-label">Cards in registry</span>
        </div>
        <div className="workflow-metric">
          <span className="workflow-metric-value">{pendingReview}</span>
          <span className="workflow-metric-label">Awaiting review</span>
        </div>
        <div className="workflow-metric">
          <span className="workflow-metric-value">
            {cards.filter((card) => card.status === "approved").length}
          </span>
          <span className="workflow-metric-label">Published to gallery</span>
        </div>
      </div>
      <CardReviewQueue cards={cards} />
    </main>
  );
}
