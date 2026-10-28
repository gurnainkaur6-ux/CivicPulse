import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { validateAuth } from "@/lib/auth-simple";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    try {
      await validateAuth(request);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pgPool = getPostgresPool();

    // Get overall stats
    const statsResult = await pgPool.query(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE status = 'reported') as reported,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as issues_today
      FROM issues
    `);

    // Get average resolution time
    const resolutionResult = await pgPool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
      FROM issues
      WHERE status = 'resolved'
        AND updated_at > created_at
    `);

    const stats = {
      ...statsResult.rows[0],
      avg_resolution_hours: resolutionResult.rows[0]?.avg_hours || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
