import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { getMySQLPool } from "@/lib/mysql";
import { getAppwriteServerClient, DOCUMENTS_DB_ID, REALTIME_COLLECTION_ID } from "@/lib/appwrite-server";
import { ID } from "node-appwrite";
import { validateAuth } from "@/lib/auth-simple";
import { withRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit-simple";
import { validateCreateIssue } from "@/lib/validation-simple";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    let user;
    try {
      user = await validateAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to report issues." },
        { status: 401 }
      );
    }

    // 2. Rate limiting (5 issues per hour per user)
    const rateLimitResponse = await withRateLimit(
      request,
      getRateLimitIdentifier(request, user.userId),
      { interval: 3600000, maxRequests: 5 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = validateCreateIssue(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { category, title, description, photo_id, latitude, longitude } = validation.data!;

    // 4. Execute dual-write with transaction-like semantics
    const pgPool = getPostgresPool();
    const mysqlPool = getMySQLPool();
    let createdIssueId: string | null = null;

    try {
      // Step 1: Insert into PostgreSQL (source of truth)
      const pgResult = await pgPool.query(
        `INSERT INTO issues (user_id, category, title, description, photo_id, location, status, upvote_count)
         VALUES ($1, $2, $3, $4, $5, ST_MakePoint($6, $7)::geography, 'reported', 0)
         RETURNING id, user_id, category, title, description, photo_id, 
                   ST_Y(location::geometry) as latitude, 
                   ST_X(location::geometry) as longitude,
                   status, upvote_count, created_at, updated_at`,
        [user.userId, category, title, description, photo_id || null, longitude, latitude]
      );

      const issue = pgResult.rows[0];
      createdIssueId = issue.id;

      // Step 2: Insert status event into MySQL
      try {
        await mysqlPool.execute(
          `INSERT INTO status_events (issue_id, old_status, new_status, changed_by_user_id, notes)
           VALUES (?, NULL, 'reported', ?, 'Issue created')`,
          [issue.id, user.userId]
        );
      } catch (mysqlError) {
        console.error("MySQL insert failed (non-critical):", mysqlError);
        // Continue - MySQL is for analytics only
      }

      // Step 3: Sync to DocumentsDB for Realtime
      try {
        const { databases } = getAppwriteServerClient();
        await databases.createDocument(
          DOCUMENTS_DB_ID,
          REALTIME_COLLECTION_ID,
          ID.unique(),
          {
            issue_id: issue.id,
            latitude: issue.latitude,
            longitude: issue.longitude,
            category: issue.category,
            status: issue.status,
            upvote_count: issue.upvote_count,
            created_at: issue.created_at.toISOString(),
            updated_at: issue.updated_at.toISOString(),
          }
        );
      } catch (docDbError) {
        console.error("DocumentsDB sync failed (non-critical):", docDbError);
        // Continue - realtime is nice-to-have
      }

      return NextResponse.json({
        success: true,
        issue: {
          ...issue,
          created_at: issue.created_at.toISOString(),
          updated_at: issue.updated_at.toISOString(),
        },
      });
    } catch (error) {
      // If PostgreSQL fails, rollback is automatic (transaction not committed)
      console.error("Create issue error:", error);
      
      // Don't leak internal error details to client
      return NextResponse.json(
        { error: "Failed to create issue. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
