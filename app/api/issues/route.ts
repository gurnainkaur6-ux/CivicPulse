import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getSessionUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { listIssues, countIssues } from "@/lib/issues-service";
import { ROW_ID_PATTERN } from "@/lib/validation-simple";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { IssueCategory, IssueStatus } from "@/types";

// GET /api/issues — paginated issue list (public)
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
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    if (status && !["reported", "acknowledged", "in_progress", "resolved"].includes(status)) {
      return jsonError("Invalid status", 400);
    }
    if (category && !ROW_ID_PATTERN.test(category)) {
      return jsonError("Invalid category", 400);
    }

    const filters = {
      status: status as IssueStatus | undefined,
      category: category as IssueCategory | undefined,
      limit,
      offset,
    };

    const [issues, total] = await Promise.all([
      listIssues(filters),
      countIssues([
        ...(filters.status ? [Query.equal("status", filters.status)] : []),
        ...(filters.category ? [Query.equal("category", filters.category)] : []),
      ]),
    ]);

    return NextResponse.json({ success: true, issues, total });
  } catch (error) {
    return handleRouteError("issues:list", error);
  }
}
