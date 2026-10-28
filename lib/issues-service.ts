import { ID, Query } from "node-appwrite";
import { DATABASE_ID, TABLE_IDS, getTablesDB } from "./appwrite-server";
import type {
  AreaStats,
  Issue,
  IssueCategory,
  IssuePriority,
  IssueStats,
  IssueStatus,
  StatusEvent,
} from "@/types";

/**
 * Server-side data access for the TablesDB `issues`, `upvotes` and
 * `status_events` tables. Column keys are camelCase because that is how the
 * tables in the Appwrite console are defined; the domain objects returned to
 * the app use the flat snake_case `Issue` shape from `@/types`.
 */

type Row = Record<string, any> & {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
};

const PAGE_SIZE = 100; // Appwrite caps page size; keep well inside it
const MAX_SCAN = 500;

function db() {
  return getTablesDB();
}

export function photoUrl(photoId: string): string {
  if (/^https?:\/\//i.test(photoId)) return photoId;

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
  const bucket = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || "";
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  return `${endpoint}/storage/buckets/${bucket}/files/${photoId}/view?project=${project}`;
}

export function toIssue(row: Row): Issue {
  const image = row.imageUrl || undefined;

  return {
    id: row.$id,
    user_id: row.userId ?? "",
    user_name: row.userName || undefined,
    user_email: row.userEmail || undefined,
    category: row.category as IssueCategory,
    title: row.title ?? "",
    description: row.description ?? "",
    priority: (row.priority as IssuePriority) || "medium",
    address: row.address || undefined,
    photo_id: image,
    photo_url: image ? photoUrl(image) : undefined,
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: row.status as IssueStatus,
    upvote_count: Number(row.upvoteCount ?? 0),
    resolved_at: row.resolvedAt || undefined,
    created_at: row.$createdAt,
    updated_at: row.$updatedAt,
  };
}

/** Page through `issues` until `max` rows or the end of the table. */
async function fetchIssues(queries: string[], max = MAX_SCAN): Promise<Issue[]> {
  const rows: Row[] = [];
  let offset = 0;

  while (rows.length < max) {
    const limit = Math.min(PAGE_SIZE, max - rows.length);
    const result = await db().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_IDS.ISSUES,
      queries: [...queries, Query.limit(limit), Query.offset(offset)],
    });

    const page = result.rows as Row[];
    rows.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return rows.map(toIssue);
}

async function countIssues(queries: string[] = []): Promise<number> {
  const result = await db().listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    queries: [...queries, Query.limit(1)],
    total: true,
  });
  return result.total ?? 0;
}

export interface NewIssueInput {
  user_id: string;
  user_name: string;
  user_email: string;
  category: IssueCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  priority?: IssuePriority;
  address?: string;
  photo_id?: string;
}

export async function createIssue(input: NewIssueInput): Promise<Issue> {
  const data: Record<string, unknown> = {
    userId: input.user_id,
    userName: input.user_name,
    userEmail: input.user_email,
    category: input.category,
    title: input.title,
    description: input.description,
    priority: input.priority ?? "medium",
    latitude: input.latitude,
    longitude: input.longitude,
    status: "reported",
    upvoteCount: 0,
  };

  // Optional columns are omitted entirely — Appwrite rejects `null` for
  // non-nullable columns, so never send empty values.
  if (input.address) data.address = input.address;
  if (input.photo_id) data.imageUrl = input.photo_id;

  const row = await db().createRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    rowId: ID.unique(),
    data,
  });

  return toIssue(row as Row);
}

export interface IssueFilters {
  status?: IssueStatus;
  category?: IssueCategory;
  userId?: string;
  limit?: number;
  offset?: number;
}

export async function listIssues(filters: IssueFilters = {}): Promise<Issue[]> {
  const limit = Math.min(filters.limit ?? 50, 100);
  const queries: string[] = [];

  if (filters.status) queries.push(Query.equal("status", filters.status));
  if (filters.category) queries.push(Query.equal("category", filters.category));
  if (filters.userId) queries.push(Query.equal("userId", filters.userId));

  queries.push(Query.orderDesc("$createdAt"));
  queries.push(Query.limit(limit));
  if (filters.offset) queries.push(Query.offset(filters.offset));

  const result = await db().listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    queries,
  });

  return (result.rows as Row[]).map(toIssue);
}

/**
 * Walk several pages of `issues` so radius/similarity searches are not limited
 * to the most recent page.
 */
export async function scanIssues(filters: IssueFilters = {}, max = 300): Promise<Issue[]> {
  const pageSize = 100;
  const collected: Issue[] = [];

  for (let offset = 0; offset < max; offset += pageSize) {
    const page = await listIssues({ ...filters, limit: pageSize, offset });
    collected.push(...page);
    if (page.length < pageSize) break;
  }

  return collected;
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  try {
    const row = await db().getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_IDS.ISSUES,
      rowId: issueId,
    });
    return toIssue(row as Row);
  } catch {
    return null;
  }
}

export async function updateIssue(
  issueId: string,
  data: Record<string, unknown>
): Promise<Issue> {
  const row = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    rowId: issueId,
    data,
  });
  return toIssue(row as Row);
}

export async function deleteIssue(issueId: string): Promise<void> {
  await db().deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    rowId: issueId,
  });
}

/* ---------------------------------------------------------------- upvotes */

export async function findUpvote(issueId: string, userId: string): Promise<string | null> {
  const result = await db().listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.UPVOTES,
    queries: [
      Query.equal("issueId", issueId),
      Query.equal("userId", userId),
      Query.limit(1),
    ],
  });

  const row = (result.rows as Row[])[0];
  return row ? row.$id : null;
}

export async function hasUserUpvoted(issueId: string, userId: string): Promise<boolean> {
  return (await findUpvote(issueId, userId)) !== null;
}

/**
 * Toggle a vote. The count is adjusted with TablesDB increment/decrement so two
 * concurrent votes cannot overwrite each other.
 */
export async function toggleUpvote(
  issueId: string,
  userId: string
): Promise<{ action: "added" | "removed"; upvote_count: number }> {
  const existingUpvoteId = await findUpvote(issueId, userId);

  if (existingUpvoteId) {
    await db().deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_IDS.UPVOTES,
      rowId: existingUpvoteId,
    });

    const row = (await db().decrementRowColumn({
      databaseId: DATABASE_ID,
      tableId: TABLE_IDS.ISSUES,
      rowId: issueId,
      column: "upvoteCount",
      value: 1,
      min: 0,
    })) as Row;

    return { action: "removed", upvote_count: Number(row.upvoteCount ?? 0) };
  }

  await db().createRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.UPVOTES,
    rowId: ID.unique(),
    data: { issueId, userId },
  });

  const row = (await db().incrementRowColumn({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.ISSUES,
    rowId: issueId,
    column: "upvoteCount",
    value: 1,
  })) as Row;

  return { action: "added", upvote_count: Number(row.upvoteCount ?? 0) };
}

/* ---------------------------------------------------------- status events */

export async function listStatusEvents(issueId: string): Promise<StatusEvent[]> {
  const result = await db().listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.STATUS_EVENTS,
    queries: [
      Query.equal("issueId", issueId),
      Query.orderAsc("$createdAt"),
      Query.limit(50),
    ],
  });

  return (result.rows as Row[]).map((row) => ({
    id: row.$id,
    issue_id: row.issueId,
    old_status: (row.oldStatus as IssueStatus) || null,
    new_status: row.newStatus as IssueStatus,
    changed_by_user_id: row.changedBy ?? "",
    notes: row.note || undefined,
    created_at: row.$createdAt,
  }));
}

export async function addStatusEvent(input: {
  issueId: string;
  oldStatus: IssueStatus | null;
  newStatus: IssueStatus;
  changedByUserId: string;
  notes?: string;
}): Promise<StatusEvent> {
  const data: Record<string, unknown> = {
    issueId: input.issueId,
    newStatus: input.newStatus,
    changedBy: input.changedByUserId,
  };
  if (input.oldStatus) data.oldStatus = input.oldStatus;
  if (input.notes) data.note = input.notes;

  const row = (await db().createRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_IDS.STATUS_EVENTS,
    rowId: ID.unique(),
    data,
  })) as Row;

  return {
    id: row.$id,
    issue_id: row.issueId,
    old_status: (row.oldStatus as IssueStatus) || null,
    new_status: row.newStatus as IssueStatus,
    changed_by_user_id: row.changedBy ?? "",
    notes: row.note || undefined,
    created_at: row.$createdAt,
  };
}

/* --------------------------------------------------- geo + text matching */

export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "is", "are", "on", "in", "at", "to", "of", "for",
  "near", "there", "this", "that", "it", "has", "have", "been", "very", "with",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

/** Dice coefficient over meaningful words (0..1). */
export function textSimilarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  left.forEach((word) => {
    if (right.has(word)) shared += 1;
  });

  return (2 * shared) / (left.size + right.size);
}

/* ------------------------------------------------------------- aggregates */

export async function getIssueStats(): Promise<IssueStats> {
  const [total, reported, acknowledged, in_progress, resolvedCount, recent, resolvedRecent] =
    await Promise.all([
      countIssues(),
      countIssues([Query.equal("status", "reported")]),
      countIssues([Query.equal("status", "acknowledged")]),
      countIssues([Query.equal("status", "in_progress")]),
      countIssues([Query.equal("status", "resolved")]),
      fetchIssues([Query.orderDesc("$createdAt")], 200),
      fetchIssues([Query.equal("status", "resolved"), Query.orderDesc("$createdAt")], 200),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const issuesToday = recent.filter((issue) => issue.created_at.slice(0, 10) === today).length;

  const durations = resolvedRecent
    .map((issue) => {
      const end = issue.resolved_at ? Date.parse(issue.resolved_at) : Date.parse(issue.updated_at);
      const start = Date.parse(issue.created_at);
      if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) return null;
      return (end - start) / 3600000;
    })
    .filter((value): value is number => value !== null);

  const avgResolutionHours =
    durations.length > 0
      ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
      : 0;

  return {
    total,
    reported,
    acknowledged,
    in_progress,
    resolved: resolvedCount,
    issues_today: issuesToday,
    avg_resolution_hours: avgResolutionHours,
  };
}

export async function getAreaStats(): Promise<AreaStats[]> {
  const issues = await fetchIssues([], MAX_SCAN);
  const buckets = new Map<IssueCategory, { total: number; resolved: number; hours: number[] }>();

  for (const issue of issues) {
    const bucket = buckets.get(issue.category) ?? { total: 0, resolved: 0, hours: [] };
    bucket.total += 1;

    if (issue.status === "resolved") {
      bucket.resolved += 1;
      const end = issue.resolved_at ? Date.parse(issue.resolved_at) : Date.parse(issue.updated_at);
      const start = Date.parse(issue.created_at);
      if (Number.isFinite(end) && Number.isFinite(start) && end > start) {
        bucket.hours.push((end - start) / 3600000);
      }
    }

    buckets.set(issue.category, bucket);
  }

  return Array.from(buckets.entries())
    .map(([category, bucket]) => ({
      category,
      total_issues: bucket.total,
      resolved_issues: bucket.resolved,
      resolution_rate:
        bucket.total > 0 ? Math.round((bucket.resolved / bucket.total) * 1000) / 10 : 0,
      avg_resolution_hours:
        bucket.hours.length > 0
          ? Math.round(
              (bucket.hours.reduce((sum, value) => sum + value, 0) / bucket.hours.length) * 10
            ) / 10
          : 0,
    }))
    .sort((a, b) => b.total_issues - a.total_issues);
}

export { countIssues };
