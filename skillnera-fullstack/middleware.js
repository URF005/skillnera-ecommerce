import { NextResponse } from "next/server";
import { USER_DASHBOARD, WEBSITE_LOGIN } from "./routes/WebsiteRoute";
import { jwtVerify } from "jose";
import { ADMIN_DASHBOARD } from "./routes/AdminPanelRoute";

export async function middleware(request) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // ---- 1) Capture ?ref=CODE on any public page ----
  const ref = url.searchParams.get("ref");
  // Always create a response so we can attach cookies if needed
  const response = NextResponse.next();

  if (ref) {
    response.cookies.set("ref_code", ref, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // ---- 2) Route guards (only for protected paths) ----
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/my-account");

  const hasToken = request.cookies.has("access_token");

  try {
    // If no token:
    if (!hasToken) {
      // protect admin & user areas only
      if (isAdminRoute || isUserRoute) {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
      }
      // allow access to /auth and all public routes
      return response;
    }

    // Has token: verify it
    const access_token = request.cookies.get("access_token").value;
    const { payload } = await jwtVerify(
      access_token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    const role = payload.role;

    // Block logged-in users from hitting /auth/*
    if (isAuthRoute) {
      return NextResponse.redirect(
        new URL(role === "admin" ? ADMIN_DASHBOARD : USER_DASHBOARD, url)
      );
    }

    // Protect /admin for admins only
    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
    }

    // Protect /my-account for regular users only
    if (isUserRoute && role !== "user") {
      return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
    }

    // Otherwise allow
    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
  }
}

// IMPORTANT: run middleware on ALL non-static, non-API routes
// so referral capture works on public pages (home, product, etc.)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
