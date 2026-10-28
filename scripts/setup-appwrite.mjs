#!/usr/bin/env node
/**
 * Appwrite TablesDB provisioning + seed for CivicPulse.
 *
 *   node --env-file=.env scripts/setup-appwrite.mjs           # inspect only
 *   node --env-file=.env scripts/setup-appwrite.mjs --apply   # create what is missing
 *   node --env-file=.env scripts/setup-appwrite.mjs --seed    # insert demo rows
 *
 * `--apply` is additive: existing tables and columns are left untouched, missing
 * ones are created, and the two optional columns this app relies on
 * (`address`, `imageUrl`) are switched to "not required" if they are not.
 *
 * The API key needs the databases/tables/columns/rows and buckets read+write
 * scopes.
 */

import { Client, TablesDB, Storage, ID, Query, Permission, Role } from "node-appwrite";

const APPLY = process.argv.includes("--apply");
const SEED = process.argv.includes("--seed");
const FORCE = process.argv.includes("--force");

const env = (key, fallback) => process.env[key] || fallback || "";

const ENDPOINT = env("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1");
const PROJECT_ID = env("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const DATABASE_ID = env(
  "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
  env("NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID")
);
const API_KEY = env("APPWRITE_API_KEY");

const ISSUES_TABLE = env("NEXT_PUBLIC_APPWRITE_ISSUES_TABLE_ID", "issues");
const UPVOTES_TABLE = env("NEXT_PUBLIC_APPWRITE_UPVOTES_TABLE_ID", "upvotes");
const STATUS_EVENTS_TABLE = env("NEXT_PUBLIC_APPWRITE_STATUS_EVENTS_TABLE_ID", "status_events");
const BUCKET_ID = env("NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID", "photos");

const CATEGORIES = [
  "pothole",
  "water",
  "power",
  "garbage",
  "streetlight",
  "drainage",
  "road",
  "other",
];
const STATUSES = ["reported", "acknowledged", "in_progress", "resolved"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

if (!PROJECT_ID || !API_KEY) {
  console.error("Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env");
  process.exit(1);
}
if (!DATABASE_ID) {
  console.error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID in .env");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new TablesDB(client);
const storage = new Storage(client);

/**
 * Column definitions, each expressed with the typed create* helper it needs.
 * Keys match the column names used by lib/issues-service.ts.
 */
const SCHEMA = {
  [ISSUES_TABLE]: {
    name: "Issues",
    columns: [
      ["createStringColumn", "title", { size: 200, required: true }],
      ["createTextColumn", "description", { required: true }],
      ["createEnumColumn", "category", { elements: CATEGORIES, required: true }],
      ["createEnumColumn", "status", { elements: STATUSES, required: true, xdefault: "reported" }],
      ["createEnumColumn", "priority", { elements: PRIORITIES, required: true, xdefault: "medium" }],
      ["createFloatColumn", "latitude", { required: true, min: -90, max: 90 }],
      ["createFloatColumn", "longitude", { required: true, min: -180, max: 180 }],
      ["createStringColumn", "address", { size: 300, required: false }],
      ["createStringColumn", "imageUrl", { size: 500, required: false }],
      ["createStringColumn", "userId", { size: 64, required: true }],
      ["createStringColumn", "userName", { size: 120, required: false }],
      ["createEmailColumn", "userEmail", { required: false }],
      ["createIntegerColumn", "upvoteCount", { required: false, xdefault: 0, min: 0 }],
      ["createDatetimeColumn", "resolvedAt", { required: false }],
    ],
    indexes: [
      ["idx_status", "key", ["status"]],
      ["idx_category", "key", ["category"]],
      ["idx_user", "key", ["userId"]],
    ],
  },
  [UPVOTES_TABLE]: {
    name: "Upvotes",
    columns: [
      ["createStringColumn", "issueId", { size: 64, required: true }],
      ["createStringColumn", "userId", { size: 64, required: true }],
    ],
    indexes: [["idx_issue_user", "unique", ["issueId", "userId"]]],
  },
  [STATUS_EVENTS_TABLE]: {
    name: "Status events",
    columns: [
      ["createStringColumn", "issueId", { size: 64, required: true }],
      ["createEnumColumn", "oldStatus", { elements: STATUSES, required: false }],
      ["createEnumColumn", "newStatus", { elements: STATUSES, required: true }],
      ["createStringColumn", "changedBy", { size: 64, required: false }],
      ["createStringColumn", "note", { size: 500, required: false }],
    ],
    indexes: [["idx_issue", "key", ["issueId"]]],
  },
};

/** Columns that must tolerate empty values for the app's insert paths. */
const OPTIONAL_COLUMNS = [
  [ISSUES_TABLE, "address"],
  [ISSUES_TABLE, "imageUrl"],
  [ISSUES_TABLE, "userName"],
  [ISSUES_TABLE, "userEmail"],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function listTables() {
  const result = await db.listTables({ databaseId: DATABASE_ID, queries: [Query.limit(100)] });
  return result.tables ?? [];
}

async function listColumns(tableId) {
  const result = await db.listColumns({
    databaseId: DATABASE_ID,
    tableId,
    queries: [Query.limit(200)],
  });
  return result.columns ?? [];
}

async function describeTable(tableId) {
  const columns = await listColumns(tableId);
  const total = await db
    .listRows({ databaseId: DATABASE_ID, tableId, queries: [Query.limit(1)], total: true })
    .then((result) => result.total ?? 0)
    .catch(() => -1);

  console.log(`  - ${tableId}  rows:${total}`);
  console.log(
    `      columns: ${columns
      .map((column) => `${column.key}:${column.type}${column.required ? "*" : ""}`)
      .join(", ")}`
  );
}

async function createTable(tableId, definition) {
  try {
    await db.createTable({
      databaseId: DATABASE_ID,
      tableId,
      name: definition.name,
      permissions: [],
      rowSecurity: false,
    });
    console.log(`  + table ${tableId}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`  = table ${tableId}`);
      return;
    }
    throw error;
  }
}

async function syncColumns(tableId, definition) {
  const existing = new Set((await listColumns(tableId)).map((column) => column.key));

  for (const [method, key, options] of definition.columns) {
    if (existing.has(key)) continue;
    try {
      await db[method]({ databaseId: DATABASE_ID, tableId, key, ...options });
      console.log(`    + column ${key}`);
      // Column creation is processed asynchronously by Appwrite.
      await sleep(600);
    } catch (error) {
      console.log(`    ! column ${key}: ${error.message}`);
    }
  }
}

async function relaxOptionalColumns() {
  for (const [tableId, key] of OPTIONAL_COLUMNS) {
    const column = (await listColumns(tableId)).find((entry) => entry.key === key);
    if (!column) continue;
    if (!column.required) {
      console.log(`    = ${tableId}.${key} already optional`);
      continue;
    }

    try {
      if (column.type === "text") {
        await db.updateTextColumn({
          databaseId: DATABASE_ID,
          tableId,
          key,
          required: false,
          xdefault: null,
        });
      } else if (column.type === "string" || column.type === "varchar") {
        const method = column.type === "varchar" ? "updateVarcharColumn" : "updateStringColumn";
        await db[method]({ databaseId: DATABASE_ID, tableId, key, required: false });
      } else if (column.type === "email") {
        await db.updateEmailColumn({
          databaseId: DATABASE_ID,
          tableId,
          key,
          required: false,
          xdefault: null,
        });
      } else {
        console.log(`    ! ${tableId}.${key} is ${column.type}; make it optional in the console`);
        continue;
      }
      console.log(`    ~ ${tableId}.${key} is now optional`);
    } catch (error) {
      console.log(`    ! ${tableId}.${key}: ${error.message}`);
    }
  }
}

async function syncIndexes(tableId, definition) {
  const result = await db.listIndexes({
    databaseId: DATABASE_ID,
    tableId,
    queries: [Query.limit(100)],
  });
  const existing = new Set(result.indexes.map((index) => index.key));
  const columns = await listColumns(tableId);
  const types = new Map(columns.map((column) => [column.key, column.type]));

  for (const [key, type, columnKeys] of definition.indexes) {
    if (existing.has(key)) continue;

    // MySQL backs full-text columns with a 767 byte index limit, so any text
    // column needs an explicit prefix length.
    const needsLengths = columnKeys.some((columnKey) => types.get(columnKey) === "text");
    const lengths = needsLengths ? columnKeys.map(() => 190) : undefined;

    try {
      await db.createIndex({
        databaseId: DATABASE_ID,
        tableId,
        key,
        type,
        columns: columnKeys,
        ...(lengths ? { lengths } : {}),
      });
      console.log(`    + index ${key}`);
      await sleep(600);
    } catch (error) {
      console.log(`    ! index ${key}: ${error.message}`);
    }
  }
}

async function syncBucket() {
  let buckets = [];
  try {
    const result = await storage.listBuckets({ queries: [Query.limit(100)] });
    buckets = result.buckets;
  } catch (error) {
    console.log(`  ! could not list buckets: ${error.message}`);
    return;
  }

  if (buckets.some((bucket) => bucket.$id === BUCKET_ID)) {
    console.log(`  = bucket ${BUCKET_ID}`);
    return;
  }

  try {
    await storage.createBucket({
      bucketId: BUCKET_ID,
      name: "Issue photos",
      permissions: [Permission.read(Role.any())],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 5 * 1024 * 1024,
      allowedFileExtensions: ["jpg", "jpeg", "png", "webp", "heic"],
    });
    console.log(`  + bucket ${BUCKET_ID}`);
  } catch (error) {
    console.log(`  ! bucket ${BUCKET_ID}: ${error.message}`);
  }
}

/* ------------------------------------------------------------------- seed */

const DEMO_USER = { id: "demo-seed-user", name: "Demo Resident", email: "demo@civicpulse.in" };

/**
 * `createdDaysAgo` and `resolvedHoursAfter` drive realistic timestamps, so the
 * stats page shows a believable average resolution time. Appwrite accepts
 * explicit `$createdAt` / `$updatedAt` values on row creation.
 */
const DEMO_ISSUES = [
  { title: "Large pothole near bus stand", description: "Deep pothole almost a foot wide right after the bus stand. Two-wheelers swerve into traffic to avoid it.", category: "pothole", priority: "high", status: "reported", votes: 12, lat: 30.9021, lng: 75.8582, address: "Ferozepur Road bus stand", createdDaysAgo: 0.1 },
  { title: "Garbage not collected for 5 days", description: "The community bin behind Block C has not been emptied since Monday. Strong smell and stray dogs.", category: "garbage", priority: "urgent", status: "acknowledged", votes: 31, lat: 30.9048, lng: 75.8512, address: "Block C, Model Town", createdDaysAgo: 4, resolvedHoursAfter: 26 },
  { title: "Streetlight dark for a week", description: "The streetlight outside house 214 has been off since the storm. The lane is completely dark after 7pm.", category: "streetlight", priority: "medium", status: "in_progress", votes: 8, lat: 30.8975, lng: 75.8619, address: "Sarabha Nagar lane 4", createdDaysAgo: 6, resolvedHoursAfter: 14 },
  { title: "No water pressure in mornings", description: "Water only trickles between 6am and 8am. Upper floors get nothing at all.", category: "water", priority: "high", status: "reported", votes: 19, lat: 30.9081, lng: 75.8466, address: "BRS Nagar, Street 7", createdDaysAgo: 0.2 },
  { title: "Open drain overflow", description: "Storm drain overflows onto the road every time it rains, flooding the shop fronts.", category: "drainage", priority: "urgent", status: "in_progress", votes: 24, lat: 30.8942, lng: 75.8551, address: "Chaura Bazar", createdDaysAgo: 9, resolvedHoursAfter: 20 },
  { title: "Frequent power cuts", description: "Four to five outages every evening, each lasting 20-40 minutes. Damaged appliances already.", category: "power", priority: "high", status: "acknowledged", votes: 15, lat: 30.911, lng: 75.864, address: "Dugri Phase 2", createdDaysAgo: 3, resolvedHoursAfter: 11 },
  { title: "Broken footpath tiles", description: "Footpath tiles are loose for about 20 metres, elderly residents keep tripping.", category: "road", priority: "medium", status: "reported", votes: 6, lat: 30.8998, lng: 75.8535, address: "Gurdev Nagar", createdDaysAgo: 5 },
  { title: "Trash dumped on empty plot", description: "Construction debris and household waste dumped on the empty plot on the corner.", category: "garbage", priority: "low", status: "resolved", votes: 42, lat: 30.9052, lng: 75.8601, address: "Kitchlu Nagar", createdDaysAgo: 12, resolvedHoursAfter: 72 },
  { title: "Potholes on school route", description: "Three potholes in a row right outside the school gate. Risk during drop-off hours.", category: "pothole", priority: "urgent", status: "resolved", votes: 37, lat: 30.8963, lng: 75.849, address: "Bharat Nagar", createdDaysAgo: 15, resolvedHoursAfter: 44 },
  { title: "Water tank leak wasting supply", description: "The overhead tank near the park has been leaking continuously for two weeks.", category: "water", priority: "medium", status: "resolved", votes: 21, lat: 30.9007, lng: 75.8467, address: "BRS Nagar park", createdDaysAgo: 8, resolvedHoursAfter: 30 },
  { title: "Missing manhole cover", description: "The manhole cover was stolen. The open pit is at a busy junction and unmarked at night.", category: "drainage", priority: "urgent", status: "resolved", votes: 28, lat: 30.9035, lng: 75.8504, address: "Miller Ganj", createdDaysAgo: 20, resolvedHoursAfter: 18 },
  { title: "Dead trees blocking signboard", description: "Two dead trees are leaning over the road sign and could fall in the next storm.", category: "other", priority: "low", status: "acknowledged", votes: 4, lat: 30.9072, lng: 75.8571, address: "Sarabha Nagar main road", createdDaysAgo: 7, resolvedHoursAfter: 9 },
];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** Removes rows created by a previous `--seed` run. */
async function clearDemoRows(tableId, matchColumn, matchValue) {
  const result = await db.listRows({
    databaseId: DATABASE_ID,
    tableId,
    queries: [Query.equal(matchColumn, matchValue), Query.limit(500)],
  });

  for (const row of result.rows) {
    await db.deleteRow({ databaseId: DATABASE_ID, tableId, rowId: row.$id });
  }
  return result.rows.length;
}

async function seed() {
  const existing = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: ISSUES_TABLE,
    queries: [Query.limit(1)],
    total: true,
  });

  if ((existing.total ?? 0) > 0 && !FORCE) {
    console.log(
      `Issues table already has ${existing.total} row(s); re-run with --force to replace the demo rows.`
    );
    return;
  }

  if (FORCE) {
    const events = await clearDemoRows(STATUS_EVENTS_TABLE, "changedBy", "demo-admin");
    const issues = await clearDemoRows(ISSUES_TABLE, "userId", DEMO_USER.id);
    console.log(`  - removed ${issues} demo issue(s) and ${events} status event(s)`);
  }

  const created = [];

  for (const demo of DEMO_ISSUES) {
    const createdAt = new Date(Date.now() - demo.createdDaysAgo * DAY);
    const resolvedAt = demo.resolvedHoursAfter
      ? new Date(createdAt.getTime() + demo.resolvedHoursAfter * HOUR)
      : null;
    const updatedAt = resolvedAt ?? createdAt;

    const row = await db.createRow({
      databaseId: DATABASE_ID,
      tableId: ISSUES_TABLE,
      rowId: ID.unique(),
      data: {
        title: demo.title,
        description: demo.description,
        category: demo.category,
        status: demo.status,
        priority: demo.priority,
        latitude: demo.lat,
        longitude: demo.lng,
        address: demo.address,
        userId: DEMO_USER.id,
        userName: DEMO_USER.name,
        userEmail: DEMO_USER.email,
        upvoteCount: demo.votes,
        ...(resolvedAt ? { resolvedAt: resolvedAt.toISOString() } : {}),
        $createdAt: createdAt.toISOString(),
        $updatedAt: updatedAt.toISOString(),
      },
    });
    created.push({ row, createdAt, resolvedAt });
    console.log(`  + issue ${row.$id} (${demo.category}, ${demo.status})`);
  }

  // Give non-reported issues a timeline entry so the detail page is not empty.
  for (const { row, createdAt, resolvedAt } of created) {
    if (row.status === "reported") continue;
    const eventAt = new Date((resolvedAt ?? createdAt).getTime() - HOUR / 2);

    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: STATUS_EVENTS_TABLE,
      rowId: ID.unique(),
      data: {
        issueId: row.$id,
        oldStatus: "reported",
        newStatus: row.status,
        changedBy: "demo-admin",
        note: "Status updated by the municipal team.",
        $createdAt: eventAt.toISOString(),
        $updatedAt: eventAt.toISOString(),
      },
    });
  }

  console.log(`Seeded ${created.length} issues.`);
}

/* ------------------------------------------------------------------- main */

async function main() {
  console.log(`Endpoint  : ${ENDPOINT}`);
  console.log(`Project   : ${PROJECT_ID}`);
  console.log(`Database  : ${DATABASE_ID}`);
  console.log(`Tables    : ${ISSUES_TABLE}, ${UPVOTES_TABLE}, ${STATUS_EVENTS_TABLE}`);

  try {
    const database = await db.get({ databaseId: DATABASE_ID });
    console.log(`Database OK: ${database.name}`);
  } catch (error) {
    console.error(`\nCannot read database ${DATABASE_ID}: ${error.message}`);
    console.error(
      "Check the ID and that the API key has the databases/tables/columns/rows/buckets scopes."
    );
    process.exit(1);
  }

  if (APPLY) {
    console.log("\nProvisioning schema...");
    for (const [tableId, definition] of Object.entries(SCHEMA)) {
      await createTable(tableId, definition);
    }
    console.log("\nColumns and indexes:");
    for (const [tableId, definition] of Object.entries(SCHEMA)) {
      console.log(`  ${tableId}`);
      await syncColumns(tableId, definition);
      await syncIndexes(tableId, definition);
    }
    await relaxOptionalColumns();
    console.log("\nStorage:");
    await syncBucket();
  }

  if (SEED) {
    console.log("\nSeeding demo rows...");
    await seed();
  }

  if (!APPLY && !SEED) {
    const tables = await listTables();
    console.log(`\nTables (${tables.length}):`);
    for (const table of tables) {
      await describeTable(table.$id);
    }

    try {
      const buckets = await storage.listBuckets({ queries: [Query.limit(100)] });
      console.log(
        `\nBuckets (${buckets.buckets.length}): ${buckets.buckets.map((b) => b.$id).join(", ") || "none"}`
      );
    } catch (error) {
      console.log(`\nBuckets: unavailable (${error.message})`);
    }
  }
}

main().catch((error) => {
  console.error("\nFailed:", error.message);
  if (error.code) console.error("code:", error.code, "type:", error.type);
  process.exit(1);
});
