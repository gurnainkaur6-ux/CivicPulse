// Issue Categories
export type IssueCategory =
  | "pothole"
  | "water"
  | "power"
  | "garbage"
  | "streetlight"
  | "drainage"
  | "road"
  | "other";

// Issue Status
export type IssueStatus = "reported" | "acknowledged" | "in_progress" | "resolved";

// Database Models
export interface Issue {
  id: string;
  user_id: string;
  category: IssueCategory;
  title: string;
  description: string;
  photo_id?: string;
  photo_url?: string;
  latitude: number;
  longitude: number;
  location_geohash?: string;
  status: IssueStatus;
  upvote_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string; // Appwrite Auth user ID
  name: string;
  email: string;
  is_admin: boolean;
  created_at: Date;
}

export interface Upvote {
  id: string;
  issue_id: string;
  user_id: string;
  created_at: Date;
}

export interface StatusEvent {
  id: string;
  issue_id: string;
  old_status: IssueStatus | null;
  new_status: IssueStatus;
  changed_by_user_id: string;
  notes?: string;
  created_at: Date;
}

export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export interface DailyAreaStats {
  id: string;
  date: Date;
  area_geohash: string; // Precision 5 geohash (~4.9km x 4.9km)
  category: IssueCategory;
  total_issues: number;
  resolved_issues: number;
  avg_resolution_time_hours?: number;
  created_at: Date;
}

// DocumentsDB Realtime Model (lightweight mirror)
export interface IssueRealtimeFeed {
  $id: string;
  issue_id: string; // References PostgreSQL issue.id
  latitude: number;
  longitude: number;
  category: IssueCategory;
  status: IssueStatus;
  upvote_count: number;
  created_at: string;
  updated_at: string;
}

// API Request/Response Types
export interface CreateIssueRequest {
  category: IssueCategory;
  title: string;
  description: string;
  photo_id?: string;
  latitude: number;
  longitude: number;
}

export interface UpdateStatusRequest {
  issue_id: string;
  new_status: IssueStatus;
  notes?: string;
}

export interface ToggleUpvoteRequest {
  issue_id: string;
}

export interface FindSimilarRequest {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: IssueCategory;
  radius_km?: number;
}

export interface SimilarIssue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  distance_meters: number;
  similarity_score: number;
  upvote_count: number;
}

export interface NearbyIssuesQuery {
  latitude: number;
  longitude: number;
  radius_km: number;
  category?: IssueCategory;
  status?: IssueStatus;
  sort_by?: "upvotes" | "recent";
  limit?: number;
  offset?: number;
}

export interface AreaStats {
  area_name: string;
  category: IssueCategory;
  total_issues: number;
  resolved_issues: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
}

// Utility Types
export const ISSUE_CATEGORIES: Record<IssueCategory, string> = {
  pothole: "Pothole",
  water: "Water Supply",
  power: "Power Outage",
  garbage: "Garbage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  road: "Road Damage",
  other: "Other",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  reported: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  acknowledged: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};
