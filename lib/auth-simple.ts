import { NextRequest } from "next/server";

export interface AuthUser {
  userId: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
}

/**
 * Simple auth validation for demo/MVP
 * Returns mock user for now - replace with Appwrite validation later
 */
export async function validateAuth(request: NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader) {
    throw new Error("No authorization header");
  }

  // For MVP: Accept any bearer token and create a demo user
  // TODO: Replace with proper Appwrite session validation
  const token = authHeader.replace("Bearer ", "");
  
  if (!token || token === "") {
    throw new Error("Invalid token");
  }

  // Mock user for demo
  return {
    userId: `user_${Date.now()}`,
    email: "demo@example.com",
    name: "Demo User",
    isAdmin: false,
  };
}

/**
 * Optional auth - returns user if authenticated, null otherwise
 */
export async function optionalAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    return await validateAuth(request);
  } catch {
    return null;
  }
}
