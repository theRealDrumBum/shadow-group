import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CardReviewQueue, type ReviewCard, type ReviewVersion } from "./card-review-queue";

export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  name: string;
  status: string;
  operators: { callsign: string } | { callsign: string }[] | null;
  card_versions: ReviewVersion[] | null;
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
    .select("id,name,status,operators(callsign),card_versions(id,version_number,status,type_line,review_notes)")
    .order("created_at", { ascending: false })
    .limit(100);

  const cards: ReviewCard[] = ((data ?? []) as CardRow[]).map((card) => {
    const operator = Array.isArray(card.operators) ? card.operators[0] : card.operators;
    const versions = [...(card.card_versions ?? [])].sort((a, b) => b.version_number - a.version_number);
    return {
      id: card.id,
      name: card.name,
      status: card.status,
      callsign: operator?.callsign ?? null,
      versions
    };
  });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // CARD GOVERNANCE</span>
      <h1 className="page-title">Card workflow.</h1>
      <p>
        Review submitted card versions, request changes, reject with feedback, or approve a version as the new
        canonical entry. Approving a version publishes it to the public Card Gallery. Only authenticated
        administrators can perform these actions.
      </p>
      <CardReviewQueue cards={cards} />
    </main>
  );
}
