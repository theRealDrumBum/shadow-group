import "./command.css";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { getAuthedUserAndProfile, isApprovedAccount, isApprovedAdmin } from "@/lib/auth/session-profile";
import { CommandShell, type CommandAccess } from "./command-shell";

export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  let access: CommandAccess = "guest";
  if (hasPublicSupabaseConfig()) {
    const { profile } = await getAuthedUserAndProfile();
    access = isApprovedAdmin(profile)
      ? "admin"
      : isApprovedAccount(profile)
        ? "member"
        : "guest";
  }

  return (
    <div className="command-app">
      <CommandShell access={access} />
      {children}
    </div>
  );
}
