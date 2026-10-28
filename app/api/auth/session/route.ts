import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";

/** GET /api/auth/session — the signed-in user (or null) for client-side guards. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return NextResponse.json({ success: true, user });
}
