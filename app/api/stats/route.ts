import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { getAreaStats, getIssueStats } from "@/lib/issues-service";
import { handleRouteError } from "@/lib/api-response";

// GET /api/stats — public analytics (public)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    const rateLimited = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.id),
      { interval: 60000, maxRequests: 30 }
    );
    if (rateLimited) return rateLimited;

    const [stats, categoryStats] = await Promise.all([getIssueStats(), getAreaStats()]);

    return NextResponse.json({
      success: true,
      stats,
      category_stats: categoryStats,
    });
  } catch (error) {
    return handleRouteError("stats", error);
  }
}
