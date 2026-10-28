import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateFindSimilar } from "@/lib/validation-simple";
import { haversineMeters, scanIssues, textSimilarity } from "@/lib/issues-service";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { IssueCategory, SimilarIssue } from "@/types";

const MIN_SIMILARITY = 0.2;
const MAX_RESULTS = 5;

// POST /api/issues/similar — duplicate detection while reporting (public)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    const rateLimited = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user?.id),
      { interval: 60000, maxRequests: 20 }
    );
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    const validation = validateFindSimilar(body);
    if (!validation.success || !validation.data) {
      return jsonError(validation.error || "Invalid request", 400);
    }

    const { title, description, latitude, longitude, category, radius_km } = validation.data;

    const origin = { latitude, longitude };
    const radiusMeters = radius_km * 1000;
    const query = `${title} ${description}`;

    const candidates = await scanIssues({ category: category as IssueCategory }, 300);

    const similar: SimilarIssue[] = candidates
      .map((issue) => ({
        ...issue,
        distance_meters: Math.round(haversineMeters(origin, issue)),
        similarity_score:
          Math.round(textSimilarity(query, `${issue.title} ${issue.description}`) * 100) / 100,
      }))
      .filter(
        (issue) =>
          (issue.distance_meters ?? Number.POSITIVE_INFINITY) <= radiusMeters &&
          issue.similarity_score >= MIN_SIMILARITY
      )
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ success: true, similar_issues: similar });
  } catch (error) {
    return handleRouteError("issues:similar", error);
  }
}
