import { NextRequest, NextResponse } from "next/server";
import { getUserAccount } from "@/lib/appwrite-server";
import { SESSION_COOKIE, LEGACY_SESSION_COOKIE, clearSessionCookie } from "@/lib/auth-server";

/** POST /api/auth/logout — revokes the Appwrite session and clears the cookie. */
export async function POST(request: NextRequest) {
  const secret =
    request.cookies.get(SESSION_COOKIE)?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE)?.value;

  if (secret) {
    try {
      await getUserAccount(secret).deleteSession("current");
    } catch {
      // Session may already be expired — clearing the cookie is enough.
    }
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
