import { Client, Databases, Account, ID, Storage } from 'appwrite';

// Singleton client instance
let client: Client | null = null;
let databases: Databases | null = null;
let account: Account | null = null;
let storage: Storage | null = null;

export function getAppwriteClient() {
  if (!client) {
    client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  }
  return client;
}

export function getAppwriteDatabases() {
  if (!databases) {
    databases = new Databases(getAppwriteClient());
  }
  return databases;
}

export function getAppwriteAccount() {
  if (!account) {
    account = new Account(getAppwriteClient());
  }
  return account;
}

export function getAppwriteStorage() {
  if (!storage) {
    storage = new Storage(getAppwriteClient());
  }
  return storage;
}

// Helper to generate unique IDs
export { ID };

// Collection IDs (we'll create these in Appwrite)
export const COLLECTIONS = {
  ISSUES: 'issues',
  UPVOTES: 'upvotes',
  STATUS_EVENTS: 'status_events',
  USER_PROFILES: 'user_profiles'
};

// Database ID from .env
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID!;
