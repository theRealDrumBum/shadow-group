import { createClient } from "@/lib/supabase/client";

/** Session JWT for `/api/admin/*` routes. Throws if the browser session is gone. */
export async function adminBearerToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}
