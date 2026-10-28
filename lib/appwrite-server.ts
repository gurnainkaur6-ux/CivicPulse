import { Client, Databases, Storage, Users } from "node-appwrite";

/**
 * Get environment variable or throw error if missing
 */
function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Server SDK (API routes and Functions)
export function getAppwriteServerClient() {
  const client = new Client()
    .setEndpoint(getEnvOrThrow("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
    .setProject(getEnvOrThrow("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
    .setKey(getEnvOrThrow("APPWRITE_API_KEY"));

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  };
}

export const REALTIME_COLLECTION_ID = getEnvOrThrow("NEXT_PUBLIC_APPWRITE_ISSUES_COLLECTION_ID");
export const DOCUMENTS_DB_ID = getEnvOrThrow("NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID");
export const STORAGE_BUCKET_ID = getEnvOrThrow("NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID");
