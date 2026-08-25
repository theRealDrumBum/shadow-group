import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof NextResponse.next>["cookies"]["set"]>[2];
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicCommand = pathname === "/command/login" || pathname === "/command/set-password";

  function withSessionCookies(next: NextResponse) {
    response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    return next;
  }

  if (pathname.startsWith("/command") && !publicCommand && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/command/login";
    login.search = "";
    if (pathname !== "/command") login.searchParams.set("next", pathname);
    return withSessionCookies(NextResponse.redirect(login));
  }

  if (pathname === "/command/login" && user) {
    return withSessionCookies(NextResponse.redirect(new URL("/command", request.url)));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
