import { z } from "zod";
import type { IssueCategory, IssueStatus } from "@/types";

// Coordinate bounds for India (with buffer)
const INDIA_LAT_MIN = 6.0;
const INDIA_LAT_MAX = 37.0;
const INDIA_LNG_MIN = 68.0;
const INDIA_LNG_MAX = 98.0;

// Issue categories enum
const issueCategoryEnum = z.enum([
  "pothole",
  "water",
  "power",
  "garbage",
  "streetlight",
  "drainage",
  "road",
  "other",
]);

// Issue status enum
const issueStatusEnum = z.enum(["reported", "acknowledged", "in_progress", "resolved"]);

/**
 * Create Issue Request Schema
 */
export const CreateIssueSchema = z.object({
  category: issueCategoryEnum,
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(255, "Title must be less than 255 characters")
    .trim(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be less than 5000 characters")
    .trim(),
  photo_id: z.string().uuid().optional(),
  latitude: z
    .number()
    .min(INDIA_LAT_MIN, `Latitude must be between ${INDIA_LAT_MIN} and ${INDIA_LAT_MAX}`)
    .max(INDIA_LAT_MAX, `Latitude must be between ${INDIA_LAT_MIN} and ${INDIA_LAT_MAX}`),
  longitude: z
    .number()
    .min(INDIA_LNG_MIN, `Longitude must be between ${INDIA_LNG_MIN} and ${INDIA_LNG_MAX}`)
    .max(INDIA_LNG_MAX, `Longitude must be between ${INDIA_LNG_MIN} and ${INDIA_LNG_MAX}`),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;

/**
 * Update Status Request Schema
 */
export const UpdateStatusSchema = z.object({
  issue_id: z.string().uuid(),
  new_status: issueStatusEnum,
  notes: z.string().max(1000).optional(),
});

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

/**
 * Toggle Upvote Request Schema
 */
export const ToggleUpvoteSchema = z.object({
  issue_id: z.string().uuid("Invalid issue ID format"),
});

export type ToggleUpvoteInput = z.infer<typeof ToggleUpvoteSchema>;

/**
 * Find Similar Issues Request Schema
 */
export const FindSimilarSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  latitude: z.number().min(INDIA_LAT_MIN).max(INDIA_LAT_MAX),
  longitude: z.number().min(INDIA_LNG_MIN).max(INDIA_LNG_MAX),
  category: issueCategoryEnum,
  radius_km: z.number().min(0.1).max(10).default(1),
});

export type FindSimilarInput = z.infer<typeof FindSimilarSchema>;

/**
 * Nearby Issues Query Schema
 */
export const NearbyIssuesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_km: z.number().min(0.1).max(50).default(3),
  category: issueCategoryEnum.optional(),
  status: issueStatusEnum.optional(),
  sort_by: z.enum(["upvotes", "recent"]).default("recent"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type NearbyIssuesInput = z.infer<typeof NearbyIssuesSchema>;

/**
 * Validation error formatter
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
}

/**
 * Safe parse with custom error handling
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: formatZodError(result.error) };
}
