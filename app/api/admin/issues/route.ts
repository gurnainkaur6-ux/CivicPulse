import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { validateAuth } from "@/lib/auth-simple";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    let user;
    try {
      user = await validateAuth(request);
      // TODO: Check if user.isAdmin === true
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const pgPool = getPostgresPool();
    
    // Build query
    let query = `
      SELECT 
        id, user_id, category, title, description, photo_id,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        status, upvote_count, created_at, updated_at
      FROM issues
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pgPool.query(query, params);

    return NextResponse.json({
      success: true,
      issues: result.rows.map((row) => ({
        ...row,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin issues error:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
