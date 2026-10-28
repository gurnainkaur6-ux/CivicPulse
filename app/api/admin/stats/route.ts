import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getIssueStats } from "@/lib/issues-service";
import { handleRouteError } from "@/lib/api-response";

// GET /api/admin/stats — admin dashboard counters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const stats = await getIssueStats();

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return handleRouteError("admin:stats", error);
  }
}
