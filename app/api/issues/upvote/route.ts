import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateToggleUpvote } from "@/lib/validation-simple";
import { findUpvote, getIssue, toggleUpvote } from "@/lib/issues-service";
import { handleRouteError, jsonError } from "@/lib/api-response";

// POST /api/issues/upvote — toggle the current user's vote on an issue
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // 30 votes per minute per user
    const rateLimited = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user.id),
      { interval: 60000, maxRequests: 30 }
    );
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    const validation = validateToggleUpvote(body);
    if (!validation.success || !validation.data) {
      return jsonError(validation.error || "Invalid request", 400);
    }

    const { issue_id } = validation.data;

    const issue = await getIssue(issue_id);
    if (!issue) {
      return jsonError("Issue not found", 404);
    }

    const result = await toggleUpvote(issue_id, user.id);

    return NextResponse.json({
      success: true,
      action: result.action,
      upvote_count: result.upvote_count,
      has_upvoted: result.action === "added",
    });
  } catch (error) {
    return handleRouteError("issues:upvote", error);
  }
}

// GET /api/issues/upvote?issue_id=... — has the current user voted?
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const issueId = new URL(request.url).searchParams.get("issue_id");

    if (!issueId) {
      return jsonError("issue_id is required", 400);
    }

    const upvoteRowId = await findUpvote(issueId, user.id);
    return NextResponse.json({ success: true, has_upvoted: upvoteRowId !== null });
  } catch (error) {
    return handleRouteError("issues:upvote:get", error);
  }
}
