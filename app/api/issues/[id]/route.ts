import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { getMySQLPool } from "@/lib/mysql";
import { validateAuth } from "@/lib/auth-simple";

// GET single issue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pgPool = getPostgresPool();

    const result = await pgPool.query(
      `SELECT 
        id, user_id, category, title, description, photo_id,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        status, upvote_count, created_at, updated_at
      FROM issues
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const issue = result.rows[0];

    // Get status history from MySQL
    let statusHistory = [];
    try {
      const mysqlPool = getMySQLPool();
      const [events] = await mysqlPool.query(
        `SELECT old_status, new_status, changed_by_user_id, notes, created_at
         FROM status_events
         WHERE issue_id = ?
         ORDER BY created_at ASC`,
        [id]
      );
      statusHistory = events;
    } catch (mysqlError) {
      console.error("Failed to get status history:", mysqlError);
    }

    return NextResponse.json({
      success: true,
      issue: {
        ...issue,
        created_at: issue.created_at.toISOString(),
        updated_at: issue.updated_at.toISOString(),
        status_history: statusHistory,
      },
    });
  } catch (error) {
    console.error("Get issue error:", error);
    return NextResponse.json(
      { error: "Failed to fetch issue" },
      { status: 500 }
    );
  }
}

// DELETE issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    try {
      await validateAuth(request);
      // TODO: Check if user.isAdmin === true
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const pgPool = getPostgresPool();

    // Delete from PostgreSQL (will cascade to upvotes)
    const result = await pgPool.query(
      "DELETE FROM issues WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    console.error("Delete issue error:", error);
    return NextResponse.json(
      { error: "Failed to delete issue" },
      { status: 500 }
    );
  }
}
