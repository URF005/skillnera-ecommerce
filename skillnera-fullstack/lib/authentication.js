import { jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

// tiny helper to pull a cookie value out of a raw Cookie header string
function readCookie(rawCookie, key) {
  if (!rawCookie) return null;
  const parts = rawCookie.split(/;\s*/);
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export const isAuthenticated = async (allowed = []) => {
  try {
    // 1) Try the standard cookies() API
    let token = null;
    try {
      const jar = cookies();              // can throw in some edge cases
      token = jar.get("access_token")?.value || null;
    } catch { /* noop; we'll fall back to headers */ }

    // 2) Fallback: parse Cookie header (works everywhere)
    if (!token) {
      const h = headers();
      const rawCookie = h.get("cookie") || h.get("Cookie") || "";
      token = readCookie(rawCookie, "access_token");
    }

    // 3) Last resort: Authorization: Bearer <token>
    if (!token) {
      const h = headers();
      const authz = h.get("authorization") || h.get("Authorization");
      if (authz?.toLowerCase().startsWith("bearer ")) {
        token = authz.slice(7).trim();
      }
    }

    if (!token) return { isAuth: false };

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    // normalize payload shape (some places use userId, others _id)
    const role = payload.role;
    const userId = payload.userId || payload._id;

    const allowedRoles = Array.isArray(allowed) ? allowed : [allowed].filter(Boolean);
    const ok =
      allowedRoles.length === 0 ? Boolean(userId) : allowedRoles.includes(role);

    return { isAuth: ok, role, userId, payload };
  } catch (error) {
    return { isAuth: false, error };
  }
};
