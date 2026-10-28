import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  deleteIssue,
  getIssue,
  listStatusEvents,
} from "@/lib/issues-service";
import { ROW_ID_PATTERN } from "@/lib/validation-simple";
import { handleRouteError, jsonError } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/issues/:id — issue detail + status timeline (public)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!ROW_ID_PATTERN.test(id)) {
      return jsonError("Invalid issue id", 400);
    }

    const issue = await getIssue(id);
    if (!issue) {
      return jsonError("Issue not found", 404);
    }

    const statusHistory = await listStatusEvents(id);

    return NextResponse.json({
      success: true,
      issue: { ...issue, status_history: statusHistory },
    });
  } catch (error) {
    return handleRouteError("issues:get", error);
  }
}

// DELETE /api/issues/:id — admin only
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;
    if (!ROW_ID_PATTERN.test(id)) {
      return jsonError("Invalid issue id", 400);
    }

    const issue = await getIssue(id);
    if (!issue) {
      return jsonError("Issue not found", 404);
    }

    await deleteIssue(id);

    return NextResponse.json({ success: true, message: "Issue deleted successfully" });
  } catch (error) {
    return handleRouteError("issues:delete", error);
  }
}
