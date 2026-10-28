import { Client, Account, TablesDB, Storage, ID, Query } from "appwrite";

/**
 * Browser/shared Appwrite client.
 *
 * Every value below is read through a *static* `process.env.NEXT_PUBLIC_*`
 * reference so Next.js can inline it into the client bundle. Dynamic access
 * (`process.env[key]`) resolves to `undefined` in the browser.
 */

export const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";

export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/** TablesDB database ID (legacy env name kept as a fallback). */
export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID ||
  "";

/** TablesDB table IDs (legacy collection env names kept as fallbacks). */
export const TABLE_IDS = {
  ISSUES:
    process.env.NEXT_PUBLIC_APPWRITE_ISSUES_TABLE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_ISSUES_COLLECTION_ID ||
    "issues",
  UPVOTES: process.env.NEXT_PUBLIC_APPWRITE_UPVOTES_TABLE_ID || "upvotes",
  STATUS_EVENTS: process.env.NEXT_PUBLIC_APPWRITE_STATUS_EVENTS_TABLE_ID || "status_events",
} as const;

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || "";

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    if (!APPWRITE_PROJECT_ID) {
      console.warn("[Appwrite] NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set");
    }
    client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  }
  return client;
}

export function getAccount(): Account {
  return new Account(getClient());
}

/** TablesDB service: tables + rows (the current Appwrite Databases API). */
export function getTablesDB(): TablesDB {
  return new TablesDB(getClient());
}

export function getStorage(): Storage {
  return new Storage(getClient());
}

export { ID, Query };
