import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { strictLimiter } from "@/lib/rateLimiter";

export async function middleware(request: NextRequest) {
  // ── Guard: Skip Supabase middleware if env vars aren't configured yet ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const isConfigured =
    supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");

  if (!isConfigured) {
    // Dev mode without Supabase — allow all routes through
    return NextResponse.next({ request });
  }

  // ── Rate limiting for API routes ──
  if (request.nextUrl.pathname.startsWith("/api")) {
    const identifier = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "anonymous";
    
    const rateLimitResult = await strictLimiter.check(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          }
        }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /dashboard routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Protect /admin routes — redirect to admin login (separate from user login)
  if (!user && request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  // Only redirect if user has a valid session (not just a user object)
  if (user && user.email && (
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/signup")
  )) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in non-admin users away from admin login
  if (user && user.email && request.nextUrl.pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/api/:path*", "/admin/:path*"],
};

