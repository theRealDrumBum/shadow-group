import "./command.css";
import { getAuthedUserAndProfile, isApprovedAccount, isApprovedAdmin } from "@/lib/auth/session-profile";
import { CommandShell, type CommandAccess } from "./command-shell";

export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getAuthedUserAndProfile();
  const access: CommandAccess = isApprovedAdmin(profile)
    ? "admin"
    : isApprovedAccount(profile)
      ? "member"
      : "guest";

  return (
    <div className="command-app">
      <CommandShell access={access} />
      {children}
    </div>
  );
}
