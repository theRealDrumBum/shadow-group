import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAccount } from "@/lib/auth/session-profile";
import { CommandPageHeader } from "../command-header";
import { MemberProfileForm } from "./member-profile-form";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAccount(profile)) redirect("/command");

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Me"
        title="My profile"
        description="Private contact and medical details stay off the public site. Public roster copy is reviewed before it goes live."
      />
      <MemberProfileForm />
    </main>
  );
}
