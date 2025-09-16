import { NextResponse } from "next/server";
import { USER_DASHBOARD, WEBSITE_LOGIN } from "./routes/WebsiteRoute";
import { jwtVerify } from "jose";
import {
  ADMIN_DASHBOARD,
  ADMIN_SUPPORT_SHOW, // make sure this exports "/admin/support"
} from "./routes/AdminPanelRoute";

export async function middleware(request) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // capture ?ref= on public pages
  const ref = url.searchParams.get("ref");
  const response = NextResponse.next();
  if (ref) {
    response.cookies.set("ref_code", ref, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/my-account");
  const hasToken = request.cookies.has("access_token");

  try {
    if (!hasToken) {
      // protect admin & user areas only
      if (isAdminRoute || isUserRoute) {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
      }
      // allow /auth and all public routes
      return response;
    }

    // has token → verify
    const access_token = request.cookies.get("access_token").value;
    const { payload } = await jwtVerify(
      access_token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );
    const role = payload.role;

    // 🚩 IMPORTANT: decide where logged-in users go when they hit /auth/*
    if (isAuthRoute) {
      if (role === "admin") {
        return NextResponse.redirect(new URL(ADMIN_DASHBOARD, url));
      }
      if (role === "support") {
        return NextResponse.redirect(new URL(ADMIN_SUPPORT_SHOW || "/admin/support", url));
      }
      // default: normal users
      return NextResponse.redirect(new URL(USER_DASHBOARD, url));
    }

    // Admin guard (support can ONLY access /admin/support/**)
    if (isAdminRoute) {
      if (role === "admin") {
        // full access
      } else if (role === "support") {
        if (!pathname.startsWith(ADMIN_SUPPORT_SHOW || "/admin/support")) {
          return NextResponse.redirect(new URL(ADMIN_SUPPORT_SHOW || "/admin/support", url));
        }
      } else {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
      }
    }

    // User area guard
    if (isUserRoute && role !== "user") {
      return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
    }

    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(new URL(WEBSITE_LOGIN, url));
  }
}

// run on all non-static, non-API routes (so referral capture works)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
