import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./auth-server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Maps thrown errors to API responses. Expected auth errors are passed through;
 * anything else is logged and reported as a generic failure so internals never
 * leak to the client.
 */
export function handleRouteError(scope: string, error: unknown) {
  if (error instanceof UnauthorizedError) {
    return jsonError(error.message, 401);
  }
  if (error instanceof ForbiddenError) {
    return jsonError(error.message, 403);
  }

  console.error(`[api:${scope}]`, error);
  return jsonError("Something went wrong. Please try again.", 500);
}
