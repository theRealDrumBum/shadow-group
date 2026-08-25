import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  emailsEquivalent,
  isBootstrapAdminEmail,
} from "@/lib/auth/emails";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  account_status: string;
};

export {
  BOOTSTRAP_ADMIN_EMAILS,
  canonicalizeEmail,
  emailsEquivalent,
  isBootstrapAdminEmail,
} from "@/lib/auth/emails";

export function isApprovedAccount(profile: Pick<SessionProfile, "account_status"> | null | undefined) {
  return profile?.account_status === "approved";
}

export function isApprovedAdmin(
  profile: Pick<SessionProfile, "role" | "account_status"> | null | undefined,
) {
  return profile?.role === "admin" && profile.account_status === "approved";
}

function identityEmails(user: User): string[] {
  const emails = new Set<string>();
  if (user.email) emails.add(user.email);
  const metadata = user.user_metadata ?? {};
  for (const key of ["email", "preferred_username"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.includes("@")) emails.add(value);
  }
  for (const identity of user.identities ?? []) {
    const value = identity.identity_data?.email;
    if (typeof value === "string") emails.add(value);
  }
  return [...emails];
}

/**
 * Load the signed-in profile via the service role (bypasses RLS) and promote
 * bootstrap / allow-listed accounts to approved so Command cannot get stuck
 * waiting for a self-approve click.
 */
export async function loadSessionProfile(user: User): Promise<SessionProfile | null> {
  const admin = createSupabaseAdmin();
  await promoteAllowlistedAccount(admin, user);

  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, email, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load session profile", error);
    return null;
  }

  return data as SessionProfile | null;
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

async function promoteAllowlistedAccount(admin: SupabaseClient, user: User) {
  const candidateEmails = identityEmails(user);
  const bootstrap = candidateEmails.some(isBootstrapAdminEmail);

  const { data: allowList, error: allowListError } = await admin
    .from("allowed_accounts")
    .select("email, role, operator_id, is_active, notes")
    .eq("is_active", true);

  if (allowListError) {
    console.error("Failed to read allowed_accounts", allowListError);
  }

  const matched = (allowList ?? []).find((row) =>
    candidateEmails.some((email) => emailsEquivalent(email, row.email)),
  );

  if (!bootstrap && !matched) return;

  const primaryEmail =
    candidateEmails.find(isBootstrapAdminEmail) ??
    candidateEmails.find((email) => emailsEquivalent(email, matched?.email)) ??
    user.email ??
    candidateEmails[0] ??
    null;

  const role = bootstrap ? "admin" : (matched?.role ?? "admin");
  const operatorId = matched?.operator_id ?? null;

  if (primaryEmail) {
    const allowRow: Record<string, unknown> = {
      email: primaryEmail.toLowerCase(),
      role,
      is_active: true,
      notes: bootstrap ? "Bootstrap administrator" : (matched?.notes ?? null),
      updated_at: new Date().toISOString(),
    };
    if (operatorId) allowRow.operator_id = operatorId;
    const { error: upsertAllowError } = await admin.from("allowed_accounts").upsert(
      allowRow,
      { onConflict: "email" },
    );
    if (upsertAllowError) {
      console.error("Failed to upsert allowed_accounts", upsertAllowError);
    }
  }

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id, approved_at, operator_id, display_name, avatar_url, role, account_status, email")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to load profile for promotion", existingError);
  }

  const alreadyApprovedAdmin =
    existing?.account_status === "approved" && existing.role === "admin";
  const alreadyApprovedMember =
    !bootstrap && existing?.account_status === "approved";

  if (alreadyApprovedAdmin || alreadyApprovedMember) {
    return;
  }

  if (primaryEmail) {
    const { data: others } = await admin.from("profiles").select("id, email").neq("id", user.id);
    const conflicting = (others ?? []).filter((row) => emailsEquivalent(row.email, primaryEmail));
    if (conflicting.length) {
      const { error: clearError } = await admin
        .from("profiles")
        .update({ email: null, updated_at: new Date().toISOString() })
        .in(
          "id",
          conflicting.map((row) => row.id),
        );
      if (clearError) {
        console.error("Failed to free bootstrap email on other profiles", clearError);
      }
    }
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    existing?.display_name ||
    primaryEmail?.split("@")[0] ||
    "Operator";

  const avatarUrl =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    existing?.avatar_url ||
    null;

  const payload = {
    display_name: displayName,
    email: primaryEmail,
    avatar_url: avatarUrl,
    last_sign_in_at: user.last_sign_in_at ?? new Date().toISOString(),
    role,
    account_status: "approved",
    approved_at: existing?.approved_at ?? new Date().toISOString(),
    operator_id: existing?.operator_id ?? operatorId,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await admin.from("profiles").update(payload).eq("id", user.id);
    if (updateError) {
      console.error("Failed to approve signed-in profile", updateError);
    }
    return;
  }

  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    ...payload,
  });
  if (insertError) {
    console.error("Failed to create approved profile", insertError);
  }
}
