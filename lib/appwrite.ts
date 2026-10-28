import { Client, Account, Databases, Storage } from "appwrite";

/**
 * Get environment variable or use fallback for demo mode
 */
function getClientEnv(key: string, fallback: string): string {
  if (typeof window === "undefined") {
    // Server-side: require the value
    const value = process.env[key];
    if (!value) {
      console.warn(`[Appwrite] Missing environment variable: ${key}, using fallback: ${fallback}`);
      return fallback;
    }
    return value;
  }
  // Client-side: read from window or use fallback
  return process.env[key] || fallback;
}

// Client SDK (browser-side)
export const client = new Client()
  .setEndpoint(getClientEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1"))
  .setProject(getClientEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "demo-project"));

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// DocumentsDB Realtime collection IDs
export const REALTIME_COLLECTION_ID = getClientEnv("NEXT_PUBLIC_APPWRITE_ISSUES_COLLECTION_ID", "demo-collection");
export const DOCUMENTS_DB_ID = getClientEnv("NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID", "demo-db");
export const STORAGE_BUCKET_ID = getClientEnv("NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID", "demo-bucket");
