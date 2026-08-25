import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { publicCardAssetUrl } from "@/lib/card-registry";
import { pickPrimaryAssetUrl } from "@/lib/card-assets";
import { CommandPageHeader } from "../command-header";
import { CardWorkspace } from "./card-workspace";
import type { ReviewCard, ReviewVersion } from "./card-review-queue";
import type { OperatorOption } from "./card-composer";
import "../../cards/cards.css";

export const dynamic = "force-dynamic";

type OperatorRef = { id?: string; callsign: string; display_name: string | null; team_role: string | null };
type ExpansionRef = { code: string | null };
type AssetRef = { kind: string | null; storage_path: string | null; created_at?: string | null };

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
  operator_id?: string | null;
  operators: OperatorRef | OperatorRef[] | null;
  expansions: ExpansionRef | ExpansionRef[] | null;
  card_versions: VersionRow[] | null;
};

type CardWorkflowPageProps = {
  searchParams: Promise<{ tab?: string; card?: string }>;
};

export default async function CardWorkflowPage({ searchParams }: CardWorkflowPageProps) {
  const params = await searchParams;
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAdmin(profile)) redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data }, { data: operatorRows }] = await Promise.all([
    admin
      .from("cards")
      .select("id,name,slug,status,collector_number,operator_id,submitted_at,created_at,operators!cards_operator_id_fkey(id,callsign,display_name,team_role),expansions(code),card_versions!card_versions_card_id_fkey(id,version_number,status,type_line,mana_cost,color_identity,rules_text,flavor_text,power,toughness,rarity,review_notes,submitted_at,created_at,preview_token,card_assets(kind,storage_path,created_at))")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("operators")
      .select("id,callsign,display_name,team_role")
      .order("callsign", { ascending: true })
  ]);

  const operators: OperatorOption[] = ((operatorRows ?? []) as OperatorOption[]);

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
            url: publicCardAssetUrl(asset.storage_path),
            created_at: asset.created_at
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
      slug: card.slug,
      status: card.status,
      callsign: operator?.callsign ?? null,
      operatorName: operator?.display_name ?? null,
      operatorId: card.operator_id ?? operator?.id ?? null,
      submittedAt: card.submitted_at ?? card.created_at ?? null,
      versions
    };
  });

  const pendingReview = cards.filter((card) =>
    card.versions.some((version) => version.status === "submitted" || version.status === "changes_requested")
  ).length;
  const missingArt = cards.filter((card) => {
    const latest = card.versions[0];
    const approved = card.versions.find((version) => version.status === "approved") ?? latest;
    return !approved?.artworkUrl;
  }).length;

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Cards"
        title="Cards"
        description="Read a finished render into the form, ask Cardsmith to draft one, then review and publish. Approving a version puts it in the public gallery."
      />
      <div className="workflow-summary">
        <div className="workflow-metric">
          <span className="workflow-metric-value">{cards.length}</span>
          <span className="workflow-metric-label">In registry</span>
        </div>
        <div className="workflow-metric">
          <span className="workflow-metric-value">{pendingReview}</span>
          <span className="workflow-metric-label">Needs review</span>
        </div>
        <div className="workflow-metric">
          <span className="workflow-metric-value">{missingArt}</span>
          <span className="workflow-metric-label">Missing art</span>
        </div>
        <div className="workflow-metric">
          <span className="workflow-metric-value">
            {cards.filter((card) => card.status === "approved").length}
          </span>
          <span className="workflow-metric-label">Published</span>
        </div>
      </div>
      <CardWorkspace
        cards={cards}
        operators={operators}
        initialTab={params.tab === "create" || (!pendingReview && !params.card) ? "create" : "review"}
      />
    </main>
  );
}
