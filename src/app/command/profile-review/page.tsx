import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CommandPageHeader } from "../command-header";
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
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAdmin(profile)) redirect("/command");

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
    <main className="command-page">
      <CommandPageHeader
        kicker="Personnel"
        title="Profile approvals"
        description="Approve public roster profiles. Private contact and medical details never appear here."
      />
      <ProfileReviewQueue submissions={submissions} />
    </main>
  );
}
