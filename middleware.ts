import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: SESSION_COOKIE_OPTIONS,
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't need auth.
  // /claim + /api/auth = logged-out claim & password-reset flow (must be public,
  // or new members get bounced to /login before they can claim).
  // /api/notify-admin-signup is called from the public signup page.
  // /events/ (trailing slash, so the /events list itself stays members-only) lets
  // an individual event page render a public teaser for shared links — see
  // app/(app)/events/[id]/page.tsx. /api/events/ backs that teaser's data fetch.
  // /newsletter/ is the same pattern for a sent newsletter's public teaser
  // (the landing page a LinkedIn share link points to) — see
  // app/(app)/newsletter/[id]/page.tsx.
  // /api/cron/ is Vercel's scheduler hitting these on its own — no browser
  // session, just the CRON_SECRET header each route checks itself. Without
  // this, every cron job gets redirected to /login before its own auth
  // check ever runs, and silently never fires.
  const publicRoutes = ["/login", "/signup", "/claim", "/auth/callback", "/auth/reset-password", "/forgot-password", "/mockup", "/pending", "/privacy", "/terms", "/unsubscribe", "/api/auth", "/api/notify-admin-signup", "/api/unsubscribe", "/api/webhooks", "/api/cron/", "/events/", "/api/events/", "/api/signup/", "/newsletter/"];
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    // app/(app)/layout.tsx has its own independent auth redirect and can't
    // see the matched route below it, so hand it the pathname explicitly —
    // that's how it knows to let a logged-out visitor through to the public
    // event teaser instead of bouncing them to /login.
    supabaseResponse.headers.set("x-pathname", pathname);
    return supabaseResponse;
  }

  // Root landing page is public, but send already-signed-in visitors straight to the app
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes — check role
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
