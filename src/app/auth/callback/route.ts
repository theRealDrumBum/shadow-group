import { NextResponse } from "next/server";
import { loadSessionProfile } from "@/lib/auth/session-profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/command";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/command";

  if (!code) {
    return NextResponse.redirect(new URL("/command/login?auth_error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/command/login?auth_error=callback_failed", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await loadSessionProfile(user);
    } catch (cause) {
      console.error("Failed to provision signed-in profile", cause);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
