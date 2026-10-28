import { NextRequest, NextResponse } from "next/server";
import { getMySQLPool } from "@/lib/mysql";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { optionalAuth } from "@/lib/auth-simple";

export async function GET(request: NextRequest) {
  try {
    // 1. Optional auth (public stats)
    const user = await optionalAuth(request);

    // 2. Rate limiting (30 requests per minute)
    const rateLimitResponse = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.userId),
      { interval: 60000, maxRequests: 30 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    const mysqlPool = getMySQLPool();

    // Get aggregated statistics by category
    const [categoryStats] = await mysqlPool.query(`
      SELECT 
        category,
        SUM(total_issues) as total_issues,
        SUM(resolved_issues) as resolved_issues,
        ROUND(
          (SUM(resolved_issues) * 100.0 / NULLIF(SUM(total_issues), 0)),
          2
        ) as resolution_rate,
        ROUND(AVG(avg_resolution_time_hours), 2) as avg_resolution_hours
      FROM daily_area_stats
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY category
      ORDER BY total_issues DESC
    `);

    // Get overall stats
    const [overallStats] = await mysqlPool.query(`
      SELECT 
        SUM(total_issues) as total_issues,
        SUM(resolved_issues) as resolved_issues,
        ROUND(AVG(avg_resolution_time_hours), 2) as avg_resolution_hours
      FROM daily_area_stats
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    return NextResponse.json({
      success: true,
      category_stats: categoryStats,
      overall_stats: (overallStats as any)[0],
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
