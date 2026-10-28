import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateNearbyIssues } from "@/lib/validation-simple";
import { haversineMeters, scanIssues } from "@/lib/issues-service";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { Issue, IssueCategory, IssueStatus } from "@/types";

// GET /api/issues/nearby — radius feed (public)
//
// TablesDB has no geospatial query, so candidate rows are scanned and filtered
// with a haversine distance in process. Fine for town-scale volumes.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    const rateLimited = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.id),
      { interval: 60000, maxRequests: 100 }
    );
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const validation = validateNearbyIssues({
      latitude: Number.parseFloat(searchParams.get("latitude") || ""),
      longitude: Number.parseFloat(searchParams.get("longitude") || ""),
      radius_km: Number.parseFloat(searchParams.get("radius_km") || "3"),
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      sort_by: searchParams.get("sort_by") || "recent",
      limit: Number.parseInt(searchParams.get("limit") || "50", 10),
      offset: Number.parseInt(searchParams.get("offset") || "0", 10),
    });

    if (!validation.success || !validation.data) {
      return jsonError(validation.error || "Invalid query", 400);
    }

    const { latitude, longitude, radius_km, category, status, sort_by, limit, offset } =
      validation.data;

    const origin = { latitude, longitude };
    const radiusMeters = radius_km * 1000;

    const candidates = await scanIssues(
      {
        category: category as IssueCategory | undefined,
        status: status as IssueStatus | undefined,
      },
      300
    );

    const nearby: Issue[] = candidates
      .map((issue) => ({
        ...issue,
        distance_meters: Math.round(haversineMeters(origin, issue)),
      }))
      .filter((issue) => (issue.distance_meters ?? Number.POSITIVE_INFINITY) <= radiusMeters);

    nearby.sort((a, b) => {
      if (sort_by === "upvotes") return b.upvote_count - a.upvote_count;
      if (sort_by === "distance") {
        return (a.distance_meters ?? 0) - (b.distance_meters ?? 0);
      }
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });

    const page = nearby.slice(offset, offset + limit).map((issue) => ({
      ...issue,
      // ~100m precision for privacy
      latitude: Math.round(issue.latitude * 1000) / 1000,
      longitude: Math.round(issue.longitude * 1000) / 1000,
    }));

    return NextResponse.json({
      success: true,
      issues: page,
      total: nearby.length,
    });
  } catch (error) {
    return handleRouteError("issues:nearby", error);
  }
}
