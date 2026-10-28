/**
 * Simple validation without Zod dependency
 * Lightweight validation for MVP
 */

// Coordinate bounds for India (with buffer)
const INDIA_LAT_MIN = 6.0;
const INDIA_LAT_MAX = 37.0;
const INDIA_LNG_MIN = 68.0;
const INDIA_LNG_MAX = 98.0;

export const VALID_CATEGORIES = [
  "pothole",
  "water",
  "power",
  "garbage",
  "streetlight",
  "drainage",
  "road",
  "other",
] as const;

export const VALID_STATUSES = ["reported", "acknowledged", "in_progress", "resolved"] as const;

export type IssueCategory = typeof VALID_CATEGORIES[number];
export type IssueStatus = typeof VALID_STATUSES[number];

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate Create Issue Request
 */
export interface CreateIssueInput {
  category: string;
  title: string;
  description: string;
  photo_id?: string;
  latitude: number;
  longitude: number;
}

export function validateCreateIssue(data: any): ValidationResult<CreateIssueInput> {
  const errors: string[] = [];

  // Category
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push("Invalid category");
  }

  // Title
  if (!data.title || typeof data.title !== "string") {
    errors.push("Title is required");
  } else if (data.title.trim().length < 10) {
    errors.push("Title must be at least 10 characters");
  } else if (data.title.length > 255) {
    errors.push("Title must be less than 255 characters");
  }

  // Description
  if (!data.description || typeof data.description !== "string") {
    errors.push("Description is required");
  } else if (data.description.trim().length < 20) {
    errors.push("Description must be at least 20 characters");
  } else if (data.description.length > 5000) {
    errors.push("Description must be less than 5000 characters");
  }

  // Latitude
  if (typeof data.latitude !== "number" || isNaN(data.latitude)) {
    errors.push("Invalid latitude");
  } else if (data.latitude < INDIA_LAT_MIN || data.latitude > INDIA_LAT_MAX) {
    errors.push(`Latitude must be between ${INDIA_LAT_MIN} and ${INDIA_LAT_MAX}`);
  }

  // Longitude
  if (typeof data.longitude !== "number" || isNaN(data.longitude)) {
    errors.push("Invalid longitude");
  } else if (data.longitude < INDIA_LNG_MIN || data.longitude > INDIA_LNG_MAX) {
    errors.push(`Longitude must be between ${INDIA_LNG_MIN} and ${INDIA_LNG_MAX}`);
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return {
    success: true,
    data: {
      category: data.category,
      title: data.title.trim(),
      description: data.description.trim(),
      photo_id: data.photo_id,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  };
}

/**
 * Validate Toggle Upvote Request
 */
export interface ToggleUpvoteInput {
  issue_id: string;
}

export function validateToggleUpvote(data: any): ValidationResult<ToggleUpvoteInput> {
  if (!data.issue_id || typeof data.issue_id !== "string") {
    return { success: false, error: "issue_id is required" };
  }

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.issue_id)) {
    return { success: false, error: "Invalid issue_id format" };
  }

  return {
    success: true,
    data: { issue_id: data.issue_id },
  };
}

/**
 * Validate Find Similar Request
 */
export interface FindSimilarInput {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  radius_km: number;
}

export function validateFindSimilar(data: any): ValidationResult<FindSimilarInput> {
  const errors: string[] = [];

  if (!data.title || data.title.length > 500) {
    errors.push("Title must be between 1-500 characters");
  }

  if (!data.description || data.description.length > 2000) {
    errors.push("Description must be between 1-2000 characters");
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push("Invalid category");
  }

  if (typeof data.latitude !== "number" || data.latitude < INDIA_LAT_MIN || data.latitude > INDIA_LAT_MAX) {
    errors.push("Invalid latitude");
  }

  if (typeof data.longitude !== "number" || data.longitude < INDIA_LNG_MIN || data.longitude > INDIA_LNG_MAX) {
    errors.push("Invalid longitude");
  }

  const radius_km = data.radius_km || 1;
  if (radius_km < 0.1 || radius_km > 10) {
    errors.push("Radius must be between 0.1 and 10 km");
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return {
    success: true,
    data: {
      title: data.title,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category,
      radius_km,
    },
  };
}

/**
 * Validate Nearby Issues Query
 */
export interface NearbyIssuesInput {
  latitude: number;
  longitude: number;
  radius_km: number;
  category?: string;
  status?: string;
  sort_by: string;
  limit: number;
  offset: number;
}

export function validateNearbyIssues(data: any): ValidationResult<NearbyIssuesInput> {
  const errors: string[] = [];

  if (typeof data.latitude !== "number" || isNaN(data.latitude)) {
    errors.push("Invalid latitude");
  }

  if (typeof data.longitude !== "number" || isNaN(data.longitude)) {
    errors.push("Invalid longitude");
  }

  const radius_km = data.radius_km || 3;
  if (radius_km < 0.1 || radius_km > 50) {
    errors.push("Radius must be between 0.1 and 50 km");
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    errors.push("Invalid category");
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push("Invalid status");
  }

  const sort_by = data.sort_by || "recent";
  if (!["upvotes", "recent"].includes(sort_by)) {
    errors.push("sort_by must be 'upvotes' or 'recent'");
  }

  const limit = data.limit || 50;
  if (limit < 1 || limit > 100) {
    errors.push("Limit must be between 1 and 100");
  }

  const offset = data.offset || 0;
  if (offset < 0) {
    errors.push("Offset must be >= 0");
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return {
    success: true,
    data: {
      latitude: data.latitude,
      longitude: data.longitude,
      radius_km,
      category: data.category,
      status: data.status,
      sort_by,
      limit,
      offset,
    },
  };
}
