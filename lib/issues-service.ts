import { getAppwriteDatabases, DATABASE_ID, COLLECTIONS, ID } from './appwrite-client';
import { getCurrentUser } from './auth';
import { Query } from 'appwrite';

export interface Issue {
  $id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  address: string;
  userId: string;
  userName: string;
  userEmail: string;
  upvoteCount: number;
  imageUrl?: string;
  resolvedAt?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateIssueData {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  priority?: string;
}

/**
 * Create a new issue
 */
export async function createIssue(data: CreateIssueData): Promise<Issue> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('User must be logged in to create an issue');
  }

  const databases = getAppwriteDatabases();

  const issueData = {
    title: data.title,
    description: data.description,
    category: data.category,
    status: 'pending',
    priority: data.priority || 'medium',
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    userId: user.$id,
    userName: user.name,
    userEmail: user.email,
    upvoteCount: 0,
    imageUrl: data.imageUrl || null,
    resolvedAt: null
  };

  const issue = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ISSUES,
    ID.unique(),
    issueData
  );

  return issue as Issue;
}

/**
 * Get all issues with optional filters
 */
export async function getIssues(filters?: {
  status?: string;
  category?: string;
  limit?: number;
}): Promise<Issue[]> {
  const databases = getAppwriteDatabases();
  
  const queries: string[] = [];
  
  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  
  if (filters?.category) {
    queries.push(Query.equal('category', filters.category));
  }
  
  queries.push(Query.orderDesc('$createdAt'));
  
  if (filters?.limit) {
    queries.push(Query.limit(filters.limit));
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ISSUES,
    queries
  );

  return response.documents as Issue[];
}

/**
 * Get a single issue by ID
 */
export async function getIssue(issueId: string): Promise<Issue> {
  const databases = getAppwriteDatabases();
  
  const issue = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.ISSUES,
    issueId
  );

  return issue as Issue;
}

/**
 * Update issue status
 */
export async function updateIssueStatus(
  issueId: string,
  newStatus: string,
  note?: string
): Promise<Issue> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('User must be logged in');
  }

  const databases = getAppwriteDatabases();

  // Get current issue
  const currentIssue = await getIssue(issueId);

  // Create status event
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.STATUS_EVENTS,
    ID.unique(),
    {
      issueId,
      oldStatus: currentIssue.status,
      newStatus,
      changedBy: user.name,
      note: note || null
    }
  );

  // Update issue
  const updateData: any = {
    status: newStatus
  };

  if (newStatus === 'resolved') {
    updateData.resolvedAt = new Date().toISOString();
  }

  const updatedIssue = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.ISSUES,
    issueId,
    updateData
  );

  return updatedIssue as Issue;
}

/**
 * Upvote an issue
 */
export async function upvoteIssue(issueId: string): Promise<void> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('User must be logged in to upvote');
  }

  const databases = getAppwriteDatabases();

  // Check if already upvoted
  const existingUpvotes = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.UPVOTES,
    [
      Query.equal('issueId', issueId),
      Query.equal('userId', user.$id)
    ]
  );

  if (existingUpvotes.documents.length > 0) {
    // Remove upvote
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.UPVOTES,
      existingUpvotes.documents[0].$id
    );

    // Decrement count
    const issue = await getIssue(issueId);
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ISSUES,
      issueId,
      { upvoteCount: Math.max(0, issue.upvoteCount - 1) }
    );
  } else {
    // Add upvote
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.UPVOTES,
      ID.unique(),
      {
        issueId,
        userId: user.$id
      }
    );

    // Increment count
    const issue = await getIssue(issueId);
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ISSUES,
      issueId,
      { upvoteCount: issue.upvoteCount + 1 }
    );
  }
}

/**
 * Check if user has upvoted an issue
 */
export async function hasUserUpvoted(issueId: string): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  const databases = getAppwriteDatabases();

  const upvotes = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.UPVOTES,
    [
      Query.equal('issueId', issueId),
      Query.equal('userId', user.$id)
    ]
  );

  return upvotes.documents.length > 0;
}

/**
 * Get issues created by current user
 */
export async function getMyIssues(): Promise<Issue[]> {
  const user = await getCurrentUser();
  
  if (!user) {
    return [];
  }

  const databases = getAppwriteDatabases();

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ISSUES,
    [
      Query.equal('userId', user.$id),
      Query.orderDesc('$createdAt')
    ]
  );

  return response.documents as Issue[];
}

/**
 * Get issue statistics
 */
export async function getIssueStats() {
  const databases = getAppwriteDatabases();

  const [allIssues, pendingIssues, inProgressIssues, resolvedIssues] = await Promise.all([
    databases.listDocuments(DATABASE_ID, COLLECTIONS.ISSUES, [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.ISSUES, [Query.equal('status', 'pending'), Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.ISSUES, [Query.equal('status', 'in_progress'), Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.ISSUES, [Query.equal('status', 'resolved'), Query.limit(1)])
  ]);

  return {
    total: allIssues.total,
    pending: pendingIssues.total,
    inProgress: inProgressIssues.total,
    resolved: resolvedIssues.total
  };
}
