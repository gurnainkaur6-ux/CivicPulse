import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  addStatusEvent,
  getIssue,
  listStatusEvents,
  updateIssue,
} from "@/lib/issues-service";
import { ROW_ID_PATTERN, VALID_STATUSES } from "@/lib/validation-simple";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { IssueStatus } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/issues/:id/status — admin only
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await context.params;
    if (!ROW_ID_PATTERN.test(id)) {
      return jsonError("Invalid issue id", 400);
    }

    const body = await request.json().catch(() => null);
    const status = body?.status as IssueStatus | undefined;
    const note = typeof body?.note === "string" ? body.note : undefined;

    if (!status || !VALID_STATUSES.includes(status)) {
      return jsonError("Invalid status", 400);
    }

    const issue = await getIssue(id);
    if (!issue) {
      return jsonError("Issue not found", 404);
    }
    if (issue.status === status) {
      return jsonError(`Issue is already "${status}"`, 400);
    }

    const updated = await updateIssue(id, {
      status,
      ...(status === "resolved" ? { resolvedAt: new Date().toISOString() } : {}),
    });

    try {
      await addStatusEvent({
        issueId: id,
        oldStatus: issue.status,
        newStatus: status,
        changedByUserId: admin.id,
        notes: note,
      });
    } catch (eventError) {
      // The status change already happened; a missing audit row must not fail it.
      console.error("[api:issues:status] Failed to record status event", eventError);
    }

    const statusHistory = await listStatusEvents(id);

    return NextResponse.json({
      success: true,
      issue: { ...updated, status_history: statusHistory },
    });
  } catch (error) {
    return handleRouteError("issues:status", error);
  }
}
