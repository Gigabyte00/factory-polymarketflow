import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/alerts",
  "/whales",
  "/portfolio",
  "/briefings",
  "/settings",
  "/watchlist",

];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth for public routes, API routes, and static files
  const publicPaths = ['/api/', '/sitemap.xml', '/robots.txt', '/auth/', '/_next/'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only call auth for protected routes — skip for all public-facing pages
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  // For non-protected routes, pass through without calling Supabase auth
  if (!isProtectedRoute && pathname !== "/auth") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  // Refresh the auth token — only reached for protected routes and /auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    // Redirect to auth page with return URL
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and goes to /auth, redirect to dashboard
  if (user && request.nextUrl.pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
