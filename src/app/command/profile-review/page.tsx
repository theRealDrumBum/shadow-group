import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ProfileReviewQueue, type ProfileSubmission } from "./profile-review-queue";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  status: string;
  display_name: string | null;
  callsign: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  short_bio: string | null;
  bio: string | null;
  portrait_url: string | null;
  gallery_urls: string[] | null;
  review_notes: string | null;
  submitted_at: string | null;
  profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null;
};

export default async function ProfileReviewPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/command/login");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("member_profile_submissions")
    .select("id,status,display_name,callsign,primary_role,secondary_role,short_bio,bio,portrait_url,gallery_urls,review_notes,submitted_at,profiles(display_name,email)")
    .order("submitted_at", { ascending: false })
    .limit(100);

  const submissions: ProfileSubmission[] = ((data ?? []) as SubmissionRow[]).map((row) => {
    const member = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      status: row.status,
      memberName: member?.display_name ?? null,
      memberEmail: member?.email ?? null,
      display_name: row.display_name,
      callsign: row.callsign,
      primary_role: row.primary_role,
      secondary_role: row.secondary_role,
      short_bio: row.short_bio,
      bio: row.bio,
      portrait_url: row.portrait_url,
      gallery_urls: row.gallery_urls ?? [],
      review_notes: row.review_notes,
      submitted_at: row.submitted_at
    };
  });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // PROFILE APPROVALS</span>
      <h1 className="page-title">Profile approvals.</h1>
      <p>
        Review member-submitted public profiles before they go live. Approving publishes the profile to the
        roster; requesting changes or rejecting sends your notes back to the member. Private contact and medical
        details are never shown here or published.
      </p>
      <ProfileReviewQueue submissions={submissions} />
    </main>
  );
}
