import { loadSessionProfile, type SessionProfile } from "@/lib/auth/promote";
import { createClient } from "@/lib/supabase/server";

export type { SessionProfile } from "@/lib/auth/promote";

export {
  BOOTSTRAP_ADMIN_EMAILS,
  canonicalizeEmail,
  emailsEquivalent,
  isBootstrapAdminEmail,
} from "@/lib/auth/emails";

export { loadSessionProfile, promoteAllowlistedAccount } from "@/lib/auth/promote";

export function isApprovedAccount(profile: Pick<SessionProfile, "account_status"> | null | undefined) {
  return profile?.account_status === "approved";
}

export function isApprovedAdmin(
  profile: Pick<SessionProfile, "role" | "account_status"> | null | undefined,
) {
  return profile?.role === "admin" && profile.account_status === "approved";
}

export async function getAuthedUserAndProfile() {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { user: null, profile: null, session };
  const profile = await loadSessionProfile(user);
  return { user, profile, session };
}
