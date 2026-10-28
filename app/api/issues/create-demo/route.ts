import { NextRequest, NextResponse } from "next/server";

// DEMO VERSION - Works without database setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, description, latitude, longitude } = body;

    // Validate input
    if (!category || !title || !description || latitude == null || longitude == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create mock issue response
    const mockIssue = {
      id: `issue-${Date.now()}`,
      user_id: "demo-user",
      category,
      title,
      description,
      latitude,
      longitude,
      status: "reported",
      upvote_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // In demo mode, we just return success without database
    // In production, this would save to database
    
    return NextResponse.json({
      success: true,
      issue: mockIssue,
      message: "Demo mode: Issue created successfully (not saved to database)",
    });
  } catch (error) {
    console.error("Create issue error:", error);
    return NextResponse.json(
      { error: "Failed to create issue", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
