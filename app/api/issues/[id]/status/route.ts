import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { getMySQLPool } from "@/lib/mysql";
import { validateAuth } from "@/lib/auth-simple";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    let user;
    try {
      user = await validateAuth(request);
      // TODO: Check if user.isAdmin === true
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = ["reported", "acknowledged", "in_progress", "resolved"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const pgPool = getPostgresPool();
    const mysqlPool = getMySQLPool();

    // Get current status
    const currentResult = await pgPool.query(
      "SELECT status FROM issues WHERE id = $1",
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const oldStatus = currentResult.rows[0].status;

    // Update status in PostgreSQL
    await pgPool.query(
      "UPDATE issues SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id]
    );

    // Log status change in MySQL
    try {
      await mysqlPool.execute(
        `INSERT INTO status_events (issue_id, old_status, new_status, changed_by_user_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [id, oldStatus, status, user.userId, notes || null]
      );
    } catch (mysqlError) {
      console.error("MySQL log failed (non-critical):", mysqlError);
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
