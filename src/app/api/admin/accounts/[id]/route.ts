import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const ROLES = ["pending", "recruit", "member", "editor", "admin", "alumni"];
const STATUSES = ["pending", "approved", "suspended", "denied"];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    role?: string;
    account_status?: string;
    operator_id?: string | null;
    notes?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  if (body.role && !ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (body.account_status && !STATUSES.includes(body.account_status)) {
    return NextResponse.json({ error: "Invalid account status." }, { status: 400 });
  }

  const { data: current, error: loadError } = await auth.supabase
    .from("profiles")
    .select("id, role, account_status, operator_id, approved_at")
    .eq("id", id)
    .single();
  if (loadError || !current) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (body.role) update.role = body.role;
  if (body.account_status) update.account_status = body.account_status;
  if ("operator_id" in body) update.operator_id = body.operator_id || null;

  if (body.account_status === "approved") {
    update.approved_at = current.approved_at ?? now;
    update.approved_by = auth.user.id;
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, role, account_status, operator_id")
    .single();
  if (updateError) {
    console.error("Account update failed", updateError);
    return NextResponse.json({ error: `Unable to update account: ${updateError.message}` }, { status: 400 });
  }

  // Record the role/status change for the audit trail.
  const roleChanged = body.role && body.role !== current.role;
  const statusChanged = body.account_status && body.account_status !== current.account_status;
  if (roleChanged || statusChanged) {
    await auth.supabase.from("account_role_events").insert({
      profile_id: id,
      old_role: current.role,
      new_role: updated.role,
      old_status: current.account_status,
      new_status: updated.account_status,
      changed_by: auth.user.id,
      notes: body.notes ?? null
    });
  }

  return NextResponse.json({ account: updated });
}
