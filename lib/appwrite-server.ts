import { Client, Account, TablesDB, Storage, Users, ID, Query } from "node-appwrite";

/**
 * Server-side Appwrite client (API keys).
 *
 * Everything is resolved lazily so that importing this module never throws at
 * build time when environment variables are missing.
 */

export const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";

export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID ||
  "";

export const TABLE_IDS = {
  ISSUES:
    process.env.NEXT_PUBLIC_APPWRITE_ISSUES_TABLE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_ISSUES_COLLECTION_ID ||
    "issues",
  UPVOTES: process.env.NEXT_PUBLIC_APPWRITE_UPVOTES_TABLE_ID || "upvotes",
  STATUS_EVENTS: process.env.NEXT_PUBLIC_APPWRITE_STATUS_EVENTS_TABLE_ID || "status_events",
} as const;

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || "";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function assertConfig(): void {
  if (!DATABASE_ID) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID (TablesDB database ID)");
  }
}

let adminClient: Client | null = null;

/** Client authenticated with APPWRITE_API_KEY (server only). */
export function getAdminClient(): Client {
  if (!adminClient) {
    adminClient = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(requireEnv("APPWRITE_API_KEY"));
  }
  return adminClient;
}

/** TablesDB service backed by the API key (full table/row access). */
export function getTablesDB(): TablesDB {
  assertConfig();
  return new TablesDB(getAdminClient());
}

export function getStorage(): Storage {
  return new Storage(getAdminClient());
}

export function getUsers(): Users {
  return new Users(getAdminClient());
}

/** Account service acting as the user behind a session secret (cookie). */
export function getUserAccount(sessionSecret: string): Account {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setSession(sessionSecret);
  return new Account(client);
}

export { ID, Query };
