import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateCreateIssue } from "@/lib/validation-simple";
import { createIssue } from "@/lib/issues-service";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { IssueCategory, IssuePriority } from "@/types";

// POST /api/issues/create — report a new issue (TablesDB `issues` table)
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // 5 reports per hour per user
    const rateLimited = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user.id),
      { interval: 3600000, maxRequests: 5 }
    );
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON body", 400);

    const validation = validateCreateIssue(body);
    if (!validation.success || !validation.data) {
      return jsonError(validation.error || "Invalid issue", 400);
    }

    const input = validation.data;

    const issue = await createIssue({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      category: input.category as IssueCategory,
      title: input.title,
      description: input.description,
      priority: input.priority as IssuePriority,
      address: input.address,
      photo_id: input.photo_id,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return NextResponse.json({ success: true, issue }, { status: 201 });
  } catch (error) {
    return handleRouteError("issues:create", error);
  }
}
