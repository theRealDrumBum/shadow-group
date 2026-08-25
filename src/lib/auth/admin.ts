import { NextRequest } from "next/server";
import { isApprovedAdmin, loadSessionProfile } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { authorized: false as const, status: 401, error: "Missing bearer token." };

  const supabase = createSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return { authorized: false as const, status: 401, error: "Invalid or expired session." };
  }

  const profile = await loadSessionProfile(user);

  if (!profile || !isApprovedAdmin(profile)) {
    return { authorized: false as const, status: 403, error: "Administrator access required." };
  }

  return { authorized: true as const, user, profile, supabase };
}
