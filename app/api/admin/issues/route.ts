import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { requireAdmin } from "@/lib/auth-server";
import { countIssues, listIssues } from "@/lib/issues-service";
import { handleRouteError, jsonError } from "@/lib/api-response";
import type { IssueCategory, IssueStatus } from "@/types";

// GET /api/admin/issues — admin issue table with filters + pagination
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    if (status && !["reported", "acknowledged", "in_progress", "resolved"].includes(status)) {
      return jsonError("Invalid status", 400);
    }

    const filters = {
      status: status as IssueStatus | undefined,
      category: category as IssueCategory | undefined,
      limit,
      offset,
    };

    let [issues, total] = await Promise.all([
      listIssues(filters),
      countIssues([
        ...(filters.status ? [Query.equal("status", filters.status)] : []),
        ...(filters.category ? [Query.equal("category", filters.category)] : []),
      ]),
    ]);

    // TablesDB has no full-text search; filter the fetched page in process.
    if (search) {
      issues = issues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(search) ||
          issue.description.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, issues, total });
  } catch (error) {
    return handleRouteError("admin:issues", error);
  }
}
