import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

type RegisterBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter the email on the command allowlist." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data: allowed, error: allowError } = await supabase
      .from("allowed_accounts")
      .select("email, role, is_active")
      .ilike("email", email)
      .maybeSingle();
    if (allowError) throw allowError;

    if (!allowed?.is_active) {
      return NextResponse.json(
        { error: "This email is not on the command allowlist. Ask an administrator to add it first." },
        { status: 403 }
      );
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json(
        { error: "An account already exists for this email. Sign in, or use forgot password." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: email.split("@")[0] }
    });
    if (error) {
      const duplicate = /already/i.test(error.message);
      return NextResponse.json(
        {
          error: duplicate
            ? "An account already exists for this email. Sign in, or use forgot password."
            : error.message
        },
        { status: duplicate ? 409 : 400 }
      );
    }

    return NextResponse.json({
      created: true,
      userId: data.user.id,
      role: allowed.role,
      message: "Command account created. Sign in with this email and password."
    }, { status: 201 });
  } catch (cause) {
    console.error("Command register failed", cause);
    return NextResponse.json({ error: "Unable to create a command account." }, { status: 500 });
  }
}
