import { NextRequest, NextResponse } from "next/server";
import { APPWRITE_PROJECT_ID, getUserAccount } from "./appwrite-server";

/**
 * Server-side authentication built on real Appwrite sessions.
 *
 * The browser SDK stores the session in a cookie named `a_session_<projectId>`.
 * API routes validate that cookie against Appwrite's Account API instead of
 * trusting an arbitrary bearer token.
 */

export const SESSION_COOKIE = `a_session_${APPWRITE_PROJECT_ID}`;
export const LEGACY_SESSION_COOKIE = `${SESSION_COOKIE}_legacy`;

/** 30 days, matching Appwrite's default session duration. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Stores the Appwrite session secret in a first-party HttpOnly cookie.
 * Appwrite itself sets its cookie on the API domain, which Next.js route
 * handlers can never read, so the server mirror is what makes SSR auth work.
 */
export function setSessionCookie(response: NextResponse, secret: string): void {
  response.cookies.set(SESSION_COOKIE, secret, sessionCookieOptions(SESSION_MAX_AGE));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(LEGACY_SESSION_COOKIE, "", sessionCookieOptions(0));
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  labels: string[];
  isAdmin: boolean;
}

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}

function readSessionSecret(request: NextRequest): string | null {
  // Next.js already URL-decodes cookie values when parsing the header.
  const fromCookie =
    request.cookies.get(SESSION_COOKIE)?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  // Fallback for scripts / API clients: the Appwrite session secret itself.
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) return token;
  }

  return null;
}

function isAdminEmail(email: string): boolean {
  const allowList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(email.toLowerCase());
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const secret = readSessionSecret(request);
  if (!secret) return null;

  try {
    const account = getUserAccount(secret);
    const user = await account.get();
    const labels = user.labels ?? [];
    return {
      id: user.$id,
      email: user.email,
      name: user.name,
      labels,
      isAdmin: labels.includes("admin") || isAdminEmail(user.email),
    };
  } catch (error) {
    console.warn("[auth] Session validation failed:", (error as Error).message);
    return null;
  }
}

/** Throws UnauthorizedError when no valid session is present. */
export async function requireUser(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to do that");
  }
  return user;
}

/** Throws ForbiddenError when the signed-in user is not an admin. */
export async function requireAdmin(request: NextRequest): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}
