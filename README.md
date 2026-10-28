# CivicPulse 🏙️

**Hyperlocal Civic Issue Tracker for Indian Towns**

[![Appwrite Hackathon](https://img.shields.io/badge/Appwrite-Hackathon%202026-F02E65?style=for-the-badge&logo=appwrite)](https://appwrite.io)

A real-time civic engagement platform where citizens can report and track local issues like potholes, water problems, power outages, garbage, and streetlight failures. Built for the Appwrite Hackathon (Oct 19-31, 2026).

![Appwrite](https://img.shields.io/badge/Appwrite-F02E65?style=flat&logo=appwrite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

---

## 🚀 Quick Start

```bash
# 1. Install Node.js from https://nodejs.org (if not installed)

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your Appwrite credentials (see SETUP.md)

# 4. Run database migrations
npm run db:migrate:postgres
npm run db:migrate:mysql
npm run db:seed

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000
```

See [SETUP.md](./SETUP.md) for detailed Appwrite configuration.

---

## 📋 The Problem

Citizens in Indian towns (e.g., Ludhiana) face significant challenges:
- **No quick way** to report civic issues like potholes, power outages, or garbage problems
- **Duplicate reports** because neighbors can't see if someone already reported the same issue
- **No visibility** into whether reported issues are being addressed
- **No accountability** for resolution times or action taken

**Result:** Civic problems go unreported or duplicated, and authorities lack prioritization data.

---

## ✨ MVP Features

1. **Authentication:** Browse publicly; login required to report or upvote (Appwrite Auth)
2. **Report Issues:** Category, title, description, photo upload, map pin with GPS autofill
3. **Nearby Feed:** View issues within 1km/3km/5km radius, filter by category/status, sort by upvotes or recency
4. **Upvote System:** "Me too" functionality with one vote per user per issue (DB-enforced unique constraint)
5. **Live Updates:** New issues, upvotes, and status changes appear without page refresh (Appwrite Realtime via DocumentsDB mirror)
6. **Duplicate Detection:** As you type, see similar issues nearby and upvote instead of re-reporting
7. **Status Lifecycle:** Reported → Acknowledged → In Progress → Resolved (admin-only), with full timeline
8. **Interactive Map:** Clustered pins showing issue locations, mobile-first responsive design
9. **Public Stats Page:** Top issues by area, resolution rate, average resolution time

---

## 🏗️ Architecture

### Two-Database Strategy

#### **A) Managed PostgreSQL** (Source of Truth)
- **Why:** Native PostGIS for geospatial queries, pg_trgm for fuzzy text search, ACID compliance
- **Tables:**
  - `users_profile` - User accounts linked to Appwrite Auth
  - `issues` - Core issue data with `geography(Point,4326)` for location
  - `upvotes` - Vote tracking with `UNIQUE(issue_id, user_id)` constraint
- **Indexes:**
  - GiST spatial index on `location` for radius queries
  - GIN trigram indexes on `title` and `description` for similarity search
  - B-tree on `status`, `category`, `upvote_count`, `created_at`
- **Functions:**
  - `find_nearby_issues()` - ST_DWithin + ST_Distance for radius feed
  - `find_similar_issues()` - pg_trgm `similarity()` + geospatial filter for duplicate detection
  - Triggers for automatic `upvote_count` updates

#### **B) Managed MySQL** (Analytics & Audit)
- **Why:** Optimized for append-only writes, time-series analytics, aggregations
- **Tables:**
  - `status_events` - Append-only audit trail of all status changes
  - `comments` - User comments on issues (future feature)
  - `daily_area_stats` - Pre-aggregated stats by geohash + category + date
  - `notifications_queue` - Notification dispatch queue
- **Sync:** Appwrite Functions write events to MySQL when issues are created/updated in PostgreSQL

#### **C) Appwrite DocumentsDB** (Realtime Mirror)
- **Why:** Native Realtime WebSocket support for live updates (native PG/MySQL don't support Appwrite Realtime)
- **Collection:** `issues_realtime_feed`
- **Schema:** Lightweight `{issue_id, lat, lng, category, status, upvote_count, updated_at}`
- **Sync:** Appwrite Functions + API routes dual-write to DocumentsDB whenever PostgreSQL is updated
- **Client:** Browser subscribes to collection for instant feed updates

```mermaid
graph TB
    subgraph Client["Web Client (Next.js)"]
        UI[React UI]
        SDK[Appwrite Web SDK]
    end

    subgraph Appwrite["Appwrite Cloud"]
        Auth[Auth Service]
        Storage[Storage - Photos]
        DocDB[DocumentsDB<br/>Realtime Feed]
        PG[(PostgreSQL<br/>PostGIS + pg_trgm)]
        MySQL[(MySQL<br/>Analytics)]
        Functions[Functions<br/>Node.js]
    end

    subgraph API["Next.js API Routes"]
        CreateAPI[POST /api/issues/create]
        NearbyAPI[GET /api/issues/nearby]
        SimilarAPI[POST /api/issues/similar]
        UpvoteAPI[POST /api/issues/upvote]
        StatsAPI[GET /api/stats]
    end

    UI -->|Login/Signup| Auth
    UI -->|Upload Photo| Storage
    UI -->|Subscribe Realtime| SDK
    SDK -->|WebSocket| DocDB
    
    UI -->|Report Issue| CreateAPI
    UI -->|Get Nearby| NearbyAPI
    UI -->|Check Duplicates| SimilarAPI
    UI -->|Toggle Upvote| UpvoteAPI
    
    CreateAPI -->|Write Source| PG
    CreateAPI -->|Audit Log| MySQL
    CreateAPI -->|Sync Mirror| DocDB
    
    NearbyAPI -->|ST_DWithin Query| PG
    SimilarAPI -->|similarity() + geo| PG
    UpvoteAPI -->|UPSERT| PG
    UpvoteAPI -->|Update Mirror| DocDB
    
    StatsAPI -->|Aggregations| MySQL
    
    Functions -->|Scheduled| MySQL
    Functions -.->|Aggregate Stats| MySQL

    style PG fill:#336791,color:#fff
    style MySQL fill:#4479A1,color:#fff
    style DocDB fill:#FD366E,color:#fff
    style Auth fill:#FD366E,color:#fff
    style Storage fill:#FD366E,color:#fff
```

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Next.js API Routes (Node.js)
- **Databases:**
  - Appwrite Managed PostgreSQL 18 with PostGIS + pg_trgm
  - Appwrite Managed MySQL 8.4 for analytics
  - Appwrite DocumentsDB for Realtime
- **Real-time:** Appwrite Realtime (WebSocket subscriptions)
- **Auth:** Appwrite Auth (email/password, OAuth providers)
- **Storage:** Appwrite Storage (photo uploads)
- **Map:** MapLibre GL JS with OpenStreetMap tiles
- **Functions:** Appwrite Functions (Node.js) for dual-writes and scheduled aggregations

---

## 📦 Setup Instructions

### Prerequisites

1. **Node.js 20+** and **npm**
2. **Appwrite Cloud account** ([cloud.appwrite.io](https://cloud.appwrite.io))

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd CivicPulse
npm install
```

### 2. Appwrite Project Setup

#### Create Project
1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Create a new project: **CivicPulse**
3. Note your **Project ID**

#### Create Managed PostgreSQL
1. Go to **Databases** → **Create Database**
2. Select **PostgreSQL** (Native)
3. Choose a specification (e.g., `s-2vcpu-2gb`)
4. Wait for `ready` status
5. Go to **Settings** → **Extensions** → Install:
   - `postgis`
   - `pg_trgm`
   - `uuid-ossp`
6. Copy connection credentials

#### Create Managed MySQL
1. Create another database
2. Select **MySQL** (Native)
3. Choose a specification
4. Copy connection credentials

#### Create DocumentsDB
1. Create database: **CivicPulse Realtime**
2. Create collection: **issues_realtime_feed**
3. Set permissions: `read("any")`
4. Add attributes:
   - `issue_id` (string, 36 chars, required)
   - `latitude` (float, required)
   - `longitude` (float, required)
   - `category` (string, 50 chars, required)
   - `status` (string, 50 chars, required)
   - `upvote_count` (integer, required)
   - `created_at` (string, required)
   - `updated_at` (string, required)
5. Create index on `issue_id` (key)

#### Create Storage Bucket
1. Go to **Storage** → **Create Bucket**
2. Name: **issue-photos**
3. Permissions: `create("users")`, `read("any")`
4. File size limit: 5MB
5. Allowed extensions: jpg, jpeg, png, webp

#### Generate API Key
1. Go to **Overview** → **API Keys**
2. Create new key with scopes:
   - `databases.read`, `databases.write`
   - `files.read`, `files.write`

### 3. Environment Configuration

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your credentials:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID=<documents-db-id>
NEXT_PUBLIC_APPWRITE_ISSUES_COLLECTION_ID=<collection-id>
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=<bucket-id>

APPWRITE_API_KEY=<your-api-key>

POSTGRES_HOST=db-xxxxx.fra.appwrite.center
POSTGRES_PORT=5432
POSTGRES_DB=civicpulse
POSTGRES_USER=<pg-user>
POSTGRES_PASSWORD=<pg-password>
POSTGRES_SSL=true

MYSQL_HOST=db-yyyyy.fra.appwrite.center
MYSQL_PORT=3306
MYSQL_DB=civicpulse_analytics
MYSQL_USER=<mysql-user>
MYSQL_PASSWORD=<mysql-password>
MYSQL_SSL=true
```

### 4. Run Migrations

```bash
# PostgreSQL
npm run db:migrate:postgres

# MySQL
npm run db:migrate:mysql
```

Verify extensions:
```bash
# Check PostgreSQL extensions
psql "host=<host> dbname=civicpulse user=<user> sslmode=require" \
  -c "SELECT extname FROM pg_extension;"
```

### 5. Seed Data (Optional)

```bash
npm run db:seed
```

This creates ~40 realistic issues around Ludhiana for testing.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗂️ Project Structure

```
CivicPulse/
├── app/
│   ├── api/
│   │   ├── issues/
│   │   │   ├── create/route.ts       # POST create issue (PG + MySQL + DocDB)
│   │   │   ├── nearby/route.ts       # GET nearby issues (PG query)
│   │   │   ├── similar/route.ts      # POST find duplicates (pg_trgm)
│   │   │   └── upvote/route.ts       # POST toggle upvote
│   │   └── stats/route.ts            # GET aggregated stats (MySQL)
│   ├── issues/
│   │   ├── page.tsx                  # Map view + feed
│   │   ├── new/page.tsx              # Report issue form
│   │   └── [id]/page.tsx             # Issue detail page
│   ├── stats/page.tsx                # Public stats dashboard
│   ├── auth/page.tsx                 # Login/signup
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Homepage
├── components/
│   ├── map/
│   │   ├── IssueMap.tsx              # MapLibre interactive map
│   │   └── IssueMarker.tsx           # Custom map markers
│   ├── ui/                           # shadcn/ui components
│   └── IssueCard.tsx                 # Issue display card
├── db/
│   ├── postgres/
│   │   ├── 001_initial_schema.sql    # PostGIS tables + functions
│   │   └── migrate.js                # Migration runner
│   ├── mysql/
│   │   ├── 001_initial_schema.sql    # Analytics tables + views
│   │   └── migrate.js                # Migration runner
│   └── seed.js                       # Sample data generator
├── functions/
│   ├── aggregate-stats/              # Scheduled stats aggregation
│   └── sync-realtime/                # Event-driven DocDB sync
├── lib/
│   ├── appwrite.ts                   # Client SDK config
│   ├── appwrite-server.ts            # Server SDK config
│   ├── postgres.ts                   # PG pool
│   ├── mysql.ts                      # MySQL pool
│   └── utils.ts                      # Helper functions
├── types/
│   └── index.ts                      # TypeScript definitions
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔍 Key Implementation Details

### Geospatial Queries (PostgreSQL + PostGIS)

**Nearby Issues (Radius Search):**
```sql
SELECT *, 
  ST_Distance(location, ST_MakePoint($lng, $lat)::geography) as distance_meters
FROM issues
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_meters)
ORDER BY distance_meters;
```

**Duplicate Detection (pg_trgm + Geo):**
```sql
SELECT id, title, 
  similarity(title || ' ' || description, $search_text) as score
FROM issues
WHERE category = $category
  AND ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, 1000)
  AND similarity(title || ' ' || description, $search_text) > 0.3
ORDER BY score DESC
LIMIT 3;
```

### Dual-Write Pattern (Realtime Sync)

```typescript
// 1. Write to PostgreSQL (source of truth)
const issue = await pgPool.query(`INSERT INTO issues ...`);

// 2. Log to MySQL (audit)
await mysqlPool.execute(`INSERT INTO status_events ...`);

// 3. Sync to DocumentsDB (realtime mirror)
await databases.createDocument(DOCUMENTS_DB_ID, COLLECTION_ID, {
  issue_id: issue.id,
  latitude: issue.latitude,
  // ... lightweight fields only
});
```

### Realtime Subscriptions (Client)

```typescript
client.subscribe(
  `databases.${DB_ID}.collections.${COLLECTION_ID}.documents`,
  (response) => {
    if (response.events.includes("databases.*.collections.*.documents.*.create")) {
      // New issue created - add to map
    }
    if (response.events.includes("databases.*.collections.*.documents.*.update")) {
      // Issue updated - refresh count/status
    }
  }
);
```

---

## 📊 Database Schemas

### PostgreSQL Tables

#### `issues`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | VARCHAR(255) | Appwrite Auth user ID |
| `category` | VARCHAR(50) | pothole/water/power/garbage/... |
| `title` | VARCHAR(255) | Short description |
| `description` | TEXT | Detailed description |
| `photo_id` | VARCHAR(255) | Appwrite Storage file ID |
| `location` | GEOGRAPHY(Point,4326) | PostGIS point (lng, lat) |
| `status` | VARCHAR(50) | reported/acknowledged/in_progress/resolved |
| `upvote_count` | INTEGER | Cached count, updated by trigger |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- GiST on `location` (spatial)
- GIN on `title gin_trgm_ops` (fuzzy search)
- B-tree on `status`, `category`, `upvote_count DESC`, `created_at DESC`

#### `upvotes`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `issue_id` | UUID | Foreign key → issues(id) |
| `user_id` | VARCHAR(255) | Appwrite Auth user ID |
| `created_at` | TIMESTAMPTZ | Vote timestamp |

**Unique Constraint:** `UNIQUE(issue_id, user_id)` - enforces one vote per user per issue

### MySQL Tables

#### `status_events` (Audit Log)
| Column | Type | Description |
|--------|------|-------------|
| `id` | CHAR(36) | UUID primary key |
| `issue_id` | CHAR(36) | References PostgreSQL issue |
| `old_status` | VARCHAR(50) | Previous status (NULL for new) |
| `new_status` | VARCHAR(50) | New status |
| `changed_by_user_id` | VARCHAR(255) | Who made the change |
| `notes` | TEXT | Optional comment |
| `created_at` | TIMESTAMP | Event timestamp |

#### `daily_area_stats` (Aggregations)
| Column | Type | Description |
|--------|------|-------------|
| `id` | CHAR(36) | UUID primary key |
| `date` | DATE | Aggregation date |
| `area_geohash` | VARCHAR(10) | Precision-5 geohash (~4.9km area) |
| `category` | VARCHAR(50) | Issue category |
| `total_issues` | INT | Issues reported |
| `resolved_issues` | INT | Issues resolved |
| `avg_resolution_time_hours` | DECIMAL | Avg time to resolve |

**Unique Key:** `(date, area_geohash, category)`

---

## 🚀 Appwrite Features Used

### ✅ Databases
- **Managed PostgreSQL:** PostGIS geospatial queries, pg_trgm fuzzy search, ACID transactions
- **Managed MySQL:** Time-series analytics, append-only audit logs
- **DocumentsDB:** Realtime WebSocket subscriptions for live feed updates

### ✅ Authentication
- Email/password login
- Session management
- User metadata for admin role

### ✅ Storage
- Photo uploads with file size limits
- Public read access, authenticated write
- Direct CDN URLs for images

### ✅ Realtime
- WebSocket subscriptions to DocumentsDB collection
- Server-side event filtering
- Sub-second update latency

### ✅ Functions
- Event-driven sync between databases
- Scheduled aggregation jobs (MySQL stats)
- Dual-write orchestration

---

## 🎯 Why Two Databases?

| Concern | PostgreSQL | MySQL | DocumentsDB |
|---------|-----------|-------|-------------|
| **Geospatial queries** | ✅ PostGIS native | ❌ No spatial extensions | ❌ No SQL |
| **Fuzzy text search** | ✅ pg_trgm | ❌ Limited FULLTEXT | ❌ |
| **Realtime events** | ❌ Native DB, no Appwrite API | ❌ | ✅ Native support |
| **Append-only logs** | ⚠️ Overkill for simple writes | ✅ Optimized | ❌ |
| **Time-series aggregations** | ⚠️ Slower for analytics | ✅ Excellent | ❌ |
| **ACID transactions** | ✅ Strong | ✅ Adequate | ❌ |

**Decision:**
- **PostgreSQL** = Source of truth (geospatial + search + strong consistency)
- **MySQL** = Analytics warehouse (audit logs + stats rollups)
- **DocumentsDB** = Realtime mirror (WebSocket events for browser clients)

---

## 🧪 Testing

### Manual Testing Checklist

1. **Report Issue:**
   - ✅ Upload photo
   - ✅ GPS autofill location
   - ✅ Similar issues shown while typing

2. **Nearby Feed:**
   - ✅ Change radius (1km/3km/5km)
   - ✅ Filter by category/status
   - ✅ Sort by upvotes/recent

3. **Upvote:**
   - ✅ Toggle on/off
   - ✅ Count updates in real-time
   - ✅ Cannot vote twice (DB constraint)

4. **Live Updates:**
   - ✅ Open two browser windows
   - ✅ Create issue in one → appears in other
   - ✅ Upvote in one → count updates in other

5. **Admin Status Change:**
   - ✅ Change status to "Acknowledged"
   - ✅ Timeline shows event in MySQL
   - ✅ Realtime feed updates status

### Performance Benchmarks (Expected)

- **Nearby search (3km):** <100ms (GiST index)
- **Duplicate detection:** <200ms (GIN trigram index)
- **Upvote toggle:** <50ms (single UPDATE + trigger)
- **Realtime latency:** <500ms (WebSocket delivery)

---

## 🎨 Screenshots

*(Add screenshots here after deployment)*

- Homepage
- Map view with clustered markers
- Issue detail with timeline
- Duplicate detection during report
- Stats dashboard

---

## 🚢 Deployment

### Option 1: Appwrite Sites (Recommended)

```bash
npm run build
# Upload .next folder to Appwrite Sites
```

### Option 2: Vercel

```bash
vercel --prod
```

**Environment Variables:** Add all `.env` values to Vercel dashboard

---

## 🛣️ Roadmap (Post-MVP)

- [ ] Comments on issues
- [ ] Push notifications (FCM)
- [ ] Email digests (weekly summary)
- [ ] Admin dashboard
- [ ] Heatmap visualization
- [ ] OAuth login (Google, Facebook)
- [ ] PWA support
- [ ] Multi-language (Hindi, Punjabi)

---

## 📄 License

MIT License - feel free to use for your own civic projects!

---

## 👨‍💻 Author

Built for **Appwrite Hackathon Oct 2026**

**Contact:** [Your GitHub/Twitter]

---

## 🙏 Acknowledgments

- **Appwrite** for managed databases + realtime + auth
- **PostGIS** for geospatial superpowers
- **pg_trgm** for fuzzy duplicate detection
- **shadcn/ui** for beautiful components
- **OpenStreetMap** for free map tiles

---

**⭐ If this project helps your community, please star the repo!**
#   C i v i c P u l s e  
 #   C i v i c P u l s e  
 