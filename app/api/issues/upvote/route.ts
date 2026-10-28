import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { getAppwriteServerClient, DOCUMENTS_DB_ID, REALTIME_COLLECTION_ID } from "@/lib/appwrite-server";
import { Query } from "node-appwrite";
import { validateAuth } from "@/lib/auth-simple";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateToggleUpvote } from "@/lib/validation-simple";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    let user;
    try {
      user = await validateAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to upvote issues." },
        { status: 401 }
      );
    }

    // 2. Rate limiting (30 upvotes per minute per user)
    const rateLimitResponse = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user.userId),
      { interval: 60000, maxRequests: 30 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validate request body
    const body = await request.json();
    const validation = validateToggleUpvote(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { issue_id } = validation.data!;

    // 4. Toggle upvote with proper locking
    const pgPool = getPostgresPool();

    // Check if user already upvoted
    const checkResult = await pgPool.query(
      `SELECT id FROM upvotes WHERE issue_id = $1 AND user_id = $2`,
      [issue_id, user.userId]
    );

    let action: "added" | "removed";
    let newUpvoteCount: number;

    if (checkResult.rows.length > 0) {
      // Remove upvote
      await pgPool.query(`DELETE FROM upvotes WHERE issue_id = $1 AND user_id = $2`, [issue_id, user.userId]);
      action = "removed";
    } else {
      // Add upvote
      try {
        await pgPool.query(`INSERT INTO upvotes (issue_id, user_id) VALUES ($1, $2)`, [issue_id, user.userId]);
        action = "added";
      } catch (error: any) {
        // Handle duplicate upvote (race condition)
        if (error.code === "23505") {
          return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
        }
        throw error;
      }
    }

    // Get updated upvote count (trigger automatically updates this)
    const countResult = await pgPool.query(`SELECT upvote_count, updated_at FROM issues WHERE id = $1`, [issue_id]);

    if (countResult.rows.length === 0) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    newUpvoteCount = countResult.rows[0].upvote_count;
    const updatedAt = countResult.rows[0].updated_at;

    // Update DocumentsDB for Realtime (non-critical)
    try {
      const { databases } = getAppwriteServerClient();
      const realtimeDocs = await databases.listDocuments(DOCUMENTS_DB_ID, REALTIME_COLLECTION_ID, [
        Query.equal("issue_id", issue_id),
      ]);

      if (realtimeDocs.documents.length > 0) {
        await databases.updateDocument(DOCUMENTS_DB_ID, REALTIME_COLLECTION_ID, realtimeDocs.documents[0].$id, {
          upvote_count: newUpvoteCount,
          updated_at: updatedAt.toISOString(),
        });
      }
    } catch (docDbError) {
      console.error("DocumentsDB sync failed (non-critical):", docDbError);
    }

    return NextResponse.json({
      success: true,
      action,
      upvote_count: newUpvoteCount,
    });
  } catch (error) {
    console.error("Toggle upvote error:", error);
    return NextResponse.json(
      { error: "Failed to toggle upvote. Please try again." },
      { status: 500 }
    );
  }
}
