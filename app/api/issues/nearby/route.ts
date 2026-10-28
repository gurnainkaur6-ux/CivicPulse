import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateNearbyIssues } from "@/lib/validation-simple";
import { optionalAuth } from "@/lib/auth-simple";

export async function GET(request: NextRequest) {
  try {
    // 1. Optional auth (public endpoint but track user for rate limiting)
    const user = await optionalAuth(request);

    // 2. Rate limiting (100 requests per minute per IP/user)
    const rateLimitResponse = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.userId),
      { interval: 60000, maxRequests: 100 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Parse and validate query parameters
    const { searchParams } = new URL(request.url);

    const queryData = {
      latitude: parseFloat(searchParams.get("latitude") || ""),
      longitude: parseFloat(searchParams.get("longitude") || ""),
      radius_km: parseFloat(searchParams.get("radius_km") || "3"),
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      sort_by: searchParams.get("sort_by") || "recent",
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const validation = validateNearbyIssues(queryData);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { latitude, longitude, radius_km, category, status, sort_by, limit, offset } = validation.data!;

    const pgPool = getPostgresPool();
    const radiusMeters = radius_km * 1000;

    const result = await pgPool.query(
      `SELECT * FROM find_nearby_issues($1, $2, $3, $4, $5, $6, $7, $8)`,
      [latitude, longitude, radiusMeters, category, status, sort_by, limit, offset]
    );

    return NextResponse.json({
      success: true,
      issues: result.rows.map((row) => ({
        ...row,
        // Round coordinates for privacy (±100m precision)
        latitude: Math.round(row.latitude * 1000) / 1000,
        longitude: Math.round(row.longitude * 1000) / 1000,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Nearby issues error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby issues" },
      { status: 500 }
    );
  }
}
