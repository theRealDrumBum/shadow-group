import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MemberProfileForm } from "./member-profile-form";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/command/login");

  const { data: profile } = await session
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_status !== "approved") redirect("/command");

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">MEMBER MODULE // MY PROFILE</span>
      <h1 className="page-title">My profile.</h1>
      <p>
        Keep your details on file with Shadow Group. Private contact and medical information stays secure and is
        never published. Your public profile is reviewed by an administrator before it appears on the team site.
      </p>
      <MemberProfileForm />
    </main>
  );
}
