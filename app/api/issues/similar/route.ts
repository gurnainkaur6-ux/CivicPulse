import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateFindSimilar } from "@/lib/validation-simple";
import { optionalAuth } from "@/lib/auth-simple";

export async function POST(request: NextRequest) {
  try {
    // 1. Optional auth (public endpoint but track for rate limiting)
    const user = await optionalAuth(request);

    // 2. Rate limiting (20 requests per minute - expensive query)
    const rateLimitResponse = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.userId),
      { interval: 60000, maxRequests: 20 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validate request body
    const body = await request.json();
    const validation = validateFindSimilar(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description, latitude, longitude, category, radius_km } = validation.data!;

    const pgPool = getPostgresPool();
    const radiusMeters = radius_km * 1000;

    const result = await pgPool.query(
      `SELECT * FROM find_similar_issues($1, $2, $3, $4, $5, $6, 0.3)`,
      [title, description, latitude, longitude, category, radiusMeters]
    );

    return NextResponse.json({
      success: true,
      similar_issues: result.rows.map((row) => ({
        ...row,
        // Round coordinates for privacy
        latitude: Math.round(row.latitude * 1000) / 1000,
        longitude: Math.round(row.longitude * 1000) / 1000,
      })),
    });
  } catch (error) {
    console.error("Find similar issues error:", error);
    return NextResponse.json(
      { error: "Failed to find similar issues" },
      { status: 500 }
    );
  }
}
