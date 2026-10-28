import { NextRequest, NextResponse } from "next/server";
import { Account, ID } from "node-appwrite";
import { APPWRITE_PROJECT_ID, getAdminClient, getUserAccount } from "@/lib/appwrite-server";
import { setSessionCookie } from "@/lib/auth-server";
import { handleRouteError, jsonError } from "@/lib/api-response";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";

/** POST /api/auth/signup — creates the account and immediately starts a session. */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await withRateLimit(request, getRateLimitIdentifier(request), {
      interval: 60000,
      maxRequests: 5,
    });
    if (rateLimited) return rateLimited;

    if (!APPWRITE_PROJECT_ID) {
      return jsonError("Appwrite is not configured (missing project ID)", 500);
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!email || !password || !name) {
      return jsonError("Name, email and password are required", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Enter a valid email address", 400);
    }
    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    const account = new Account(getAdminClient());

    try {
      await account.create(ID.unique(), email, password, name);
    } catch (error) {
      const status = (error as { code?: number }).code;
      if (status === 409) {
        return jsonError("An account with this email already exists", 409);
      }
      throw error;
    }

    const session = await account.createEmailPasswordSession(email, password);
    const user = await getUserAccount(session.secret).get();

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.$id,
          email: user.email,
          name: user.name,
          labels: user.labels ?? [],
        },
      },
      { status: 201 }
    );
    setSessionCookie(response, session.secret);
    return response;
  } catch (error) {
    return handleRouteError("auth:signup", error);
  }
}
