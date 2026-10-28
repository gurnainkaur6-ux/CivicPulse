import { NextRequest, NextResponse } from "next/server";
import { Account } from "node-appwrite";
import { APPWRITE_PROJECT_ID, getAdminClient, getUserAccount } from "@/lib/appwrite-server";
import { setSessionCookie } from "@/lib/auth-server";
import { handleRouteError, jsonError } from "@/lib/api-response";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";

/**
 * POST /api/auth/login
 *
 * Sessions are created on the server so the secret can be stored in a
 * first-party HttpOnly cookie. The browser SDK's own cookie lives on the
 * Appwrite domain and is invisible to Next.js route handlers.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await withRateLimit(request, getRateLimitIdentifier(request), {
      interval: 60000,
      maxRequests: 10,
    });
    if (rateLimited) return rateLimited;

    if (!APPWRITE_PROJECT_ID) {
      return jsonError("Appwrite is not configured (missing project ID)", 500);
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    const account = new Account(getAdminClient());

    let session;
    try {
      session = await account.createEmailPasswordSession(email, password);
    } catch (error) {
      const status = (error as { code?: number }).code;
      if (status === 401 || status === 404) {
        return jsonError("Invalid email or password", 401);
      }
      throw error;
    }

    const user = await getUserAccount(session.secret).get();

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        labels: user.labels ?? [],
      },
    });
    setSessionCookie(response, session.secret);
    return response;
  } catch (error) {
    return handleRouteError("auth:login", error);
  }
}
