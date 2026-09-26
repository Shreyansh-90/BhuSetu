# DEVELOPER_HANDOFF.md

Welcome to the SIH26016 (BhuSetu) project. This document serves as the authoritative guide for new developers joining the project. It describes what the project does, the technical architecture, implemented and unimplemented features, database schemas, and critical invariants that must be preserved.

---

## 1. PROJECT OVERVIEW

- **Project Name**: BhuSetu (National Land Acquisition & Management Platform)
- **SIH Problem Statement ID**: SIH26016
- **Problem Statement**: Standardizing and digitizing the land acquisition lifecycle under the RFCTLARR Act 2013 to ensure transparency, prevent tampering, handle complex multi-stage approvals, and guarantee fair compensation and rehabilitation.
- **Main User Types**: 
  - Administrative Officers / Project Managers
  - Field Officers / Surveyors
  - Approving Authorities / District Collectors
  - Citizens / Landowners
- **Main System Capabilities**: 
  - Workflow & State Machine Enforcement
  - Geo-tagged Land Parcel tracking (GIS)
  - Compensation & R&R (Rehabilitation & Resettlement) Calculations
  - Immutable Award PDF Generation & Verification via SHA-256
  - Robust offline synchronization for Field Officers
  - Audit Trail Logging
- **High-level End-to-End Workflow**:
  `Project Draft → Field GIS Tagging → SIA/Hearings → Section 19 Approval → Compensation/R&R Generation → Award PDF Generation & Hashing → Disbursement.`

---

## 2. TECH STACK

**IMPLEMENTED** technologies include:
- **Next.js (App Router, v15+)**: Provides both the React frontend and the backend API layer.
- **React (v19)**: UI library.
- **TypeScript**: Used extensively across the stack for strict typing.
- **Tailwind CSS & Shadcn UI**: For UI styling and accessible components.
- **PostgreSQL / Supabase**: Primary relational database.
- **Drizzle ORM**: Used for database schema definitions and querying (no `drizzle-kit push` is used for migrations in this setup; raw SQL/Supabase migrations are authoritative).
- **PostGIS**: PostgreSQL extension used for geospatial boundary storage and querying.
- **Mapbox GL JS**: Frontend map rendering for GIS data.
- **MinIO / Local File Storage**: For Award PDF and document storage (with a fallback to local disk).
- **Service Worker / IndexedDB**: Powers the Offline PWA syncing capabilities for field officials.
- **JWT (Jose) / Edge Middleware**: Used for authentication and role-based access control (RBAC).

---

## 3. PROJECT STRUCTURE

```text
SIH26/
├── public/                 # Static assets, icons, and sw.js (Service Worker)
├── scripts/                # Development and migration scripts
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # Backend REST API routes
│   │   ├── auth/           # Login pages
│   │   ├── citizen/        # Citizen public portal
│   │   └── workspace/      # Authenticated user dashboard & project management
│   ├── components/         # Reusable React components
│   │   ├── layout/         # App shell, headers, sidebar
│   │   ├── gis/            # ProjectMap (Mapbox GL JS wrapper)
│   │   ├── projects/       # LifecycleStepper, dialogs
│   │   ├── pwa/            # OfflineSyncUI.tsx for IDB offline sync
│   │   └── ui/             # Shadcn UI primitives
│   ├── hooks/              # Custom React hooks (e.g., use-auth)
│   └── lib/                # Core business logic and shared utilities
│       ├── api/            # API middleware, error handling, validation
│       ├── db/             # Drizzle ORM setup and schemas
│       ├── storage/        # MinIO client integration
│       └── workflow/       # State machine definitions
├── supabase/               
│   └── migrations/         # Authoritative raw SQL migrations
└── package.json
```

---

## 4. APPLICATION ARCHITECTURE

```text
       [ Browser / PWA ]  <-- (OfflineSyncUI / IndexedDB intercepts offline requests)
              ↓
      [ Next.js API Routes ]
              ↓
  [ Auth & RBAC Middleware (`lib/api/authorize.ts`) ]
              ↓
    [ Business / State Machine Logic ]
              ↓
       [ Drizzle ORM ]
              ↓
  [ Supabase PostgreSQL + PostGIS ]
              ↓
 [ MinIO / FS for Document Storage ]
```

**Data Flow**: 
1. The client invokes an API route. 
2. The route wraps execution using `apiHandler` which validates JWTs via `getAuthenticatedUser`.
3. RBAC checks ensure the user has sufficient roles and tenant permissions.
4. Business logic interacts with the `db` (Drizzle).
5. Documents / Spatial changes write explicit JSON audit logs to the `auditEvents` table in the same transaction.

---

## 5. AUTHENTICATION

- **Login Flow**: Users log in via `/api/v1/auth/login` (stubbed/mocked verification in the demo) which assigns a JWT stored in an `auth-token` HTTP-only cookie.
- **Session/JWT**: Managed using the `jose` library. 
- **Middleware**: `src/middleware.ts` intercepts requests. If accessing `/workspace`, it verifies the JWT; if unauthenticated, it redirects to `/auth/login`.
- **API Authorization**: Handled via `getAuthenticatedUser(logger)` inside API routes.
- **Expiration**: The JWT has an expiration, and invalid tokens return `401 UNAUTHENTICATED`.

---

## 6. RBAC (Role-Based Access Control)

**Roles Implemented**:
| Role | Permissions | Scope |
|---|---|---|
| `admin` | Full system access. | National/Global |
| `ministry_officer` | Broad oversight, approvals. | National/Global |
| `district_collector`| Project approval, Award generation. | `districtCode` + `stateCode` |
| `project_manager` | Edit drafts, configure R&R, Compensation. | `districtCode` + `stateCode` |
| `field_officer` | Upload GIS, manage parcels. | `districtCode` + `stateCode` |
| `viewer` | Read-only access to projects. | `districtCode` + `stateCode` |

**Enforcement**: 
- `requireMinimumRole(user, 'project_manager')` enforces minimum hierarchy.
- Scope limits are strictly evaluated in API route handlers by asserting `if (user.districtCode && project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN')`.

---

## 7. MULTI-TENANCY / DATA ISOLATION

- **Tenant Mechanisms**: `districtCode` and `stateCode`.
- Users have optional `stateCode` and `districtCode` properties. Projects and Parcels also have these codes.
- **Enforcement**: 
  At the API layer, whenever fetching a project or parcel, the system explicitly validates the user's scope against the retrieved entity's scope. Administrators (National) bypass this check.
  Example:
  ```ts
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) return FORBIDDEN;
  }
  ```

---

## 8. DATABASE

**Technology**: Supabase PostgreSQL with PostGIS extension. Drizzle ORM is used for the schema map and queries.

**Authoritative Tables**:
| Table | Purpose | Important Relationships |
|---|---|---|
| `users`, `user_profiles` | Identity and RBAC | Links to roles, state, district. |
| `projects` | Core acquisition project. | Root node for all domain entities. |
| `parcels` | Land parcels. | Belongs to `projects`. |
| `parcel_geometries` / `project_geometries` | PostGIS storage. | Maps to `parcels` and `projects`. |
| `compensations` | Monetary evaluation. | Belongs to `parcels` and `projects`. |
| `rehabilitation_records` | R&R beneficiaries. | Belongs to `parcels` and `projects`. |
| `workflow_tasks` | State machine steps/SLAs. | Belongs to `projects`. |
| `audit_events` | Immutable action ledger. | Links to any `entityId` + `metadata` JSONB. |

*Note: There is no formal `documents` schema table. Document metadata is persisted inside the `audit_events` table as JSONB.*

---

## 9. RFCTLARR WORKFLOW / STATE MACHINE

**Location**: `src/lib/workflow/state-machine.ts`

**Core Philosophy**: Projects cannot arbitrarily change states. They advance sequentially when their corresponding `workflowTask` is approved via `PATCH /api/v1/workflow/tasks/[taskId]`.

| Current State | Action required | Next State |
|---|---|---|
| `draft` | Submit Proposal | `preliminary_notification` |
| `preliminary_notification`| Approve SIA / Hearing | `sia_approved` |
| `sia_approved`| Approve Section 19 | `award_declared` |
| `award_declared`| Generate/Disburse Award | `possession_taken` |

**Enforcement**: 
- `api/v1/workflow/tasks/[taskId]/route.ts` is the single mutation point. It validates the user's role, completes the task, calculates the next task based on `ACQUISITION_STAGES`, and mutates the `project.status`.
- Out-of-band state mutation is strictly banned.

---

## 10. GIS / POSTGIS / MAPBOX

**Flow**:
`GeoJSON (UI)` → `API /spatial` → `PostGIS (ST_GeomFromGeoJSON)` → `Mapbox GL JS (Frontend)`

- The API clears active versions (`is_active = false`) and inserts the new GeoJSON polygons.
- Rendering relies on a custom Mapbox UI component (`src/components/gis/ProjectMap.tsx`) embedded inside a split-screen spatial workspace.
- The **Spatial & Parcels** tab in the project workspace shows the map on the left and parcel data on the right (stacks vertically on mobile).
- An offline badge appears over the map when the browser is disconnected.
- Permissions limit spatial uploads to `draft` status projects to prevent mutating boundaries post-notification.
- Uploading triggers an `auditEvent` natively within the transaction.

---

## 11. ULPIN / CITIZEN PORTAL

- **Citizen Tracking**: Implemented at `src/app/citizen/track/page.tsx` and `api/v1/citizen/track/route.ts`.
- Citizens query using the 14-digit ULPIN (Bhu-Aadhaar) or a specific Project ID.
- **Protection**: Internal database UUIDs, exact monetary breakdowns, and workflow clarifications are explicitly stripped from the response payload to protect PII.

---

## 12. COMPENSATION

- **Implementation**: `/api/v1/projects/[projectId]/compensations`.
- The compensation calculation enforces relationships strictly to `parcels`.
- Calculates `baseMarketValue * multiplicationFactor + solatiumAmount`.
- `LEGAL SOURCE REQUIRED — NOT VERIFIED`: The actual legal statutory multi-factor formulas are unimplemented intentionally to avoid hardcoding assumptions. The UI allows manual input of these validated fields.
- Saving compensation emits an `auditEvent`.

---

## 13. R&R / REHABILITATION

- **Implementation**: `/api/v1/projects/[projectId]/rehabilitation`.
- Exists in the schema as `rehabilitation_records`. 
- Allows adding R&R beneficiaries linked to specific `parcels`.
- Follows the identical district/state isolation and RBAC rules as compensations.

---

## 14. AWARD GENERATION

- **Preconditions**: The project must explicitly be in the `award_declared` state (meaning the Section 19 workflow task was signed off).
- **Implementation**: `/api/v1/projects/[projectId]/compensations/generate-award/route.ts`.
- Generates a PDF via `pdf-lib` containing the landowner, parcel, compensation, and R&R totals.
- Uploads the PDF stream to MinIO/Local Disk.
- Updates the `compensations.awardDocumentHash` field.
- **Rules**: Bypassing the state machine to generate awards early is cryptographically and logically prohibited.

---

## 15. SHA-256 DOCUMENT INTEGRITY

- **Process**: During Award PDF generation, the raw byte array of the PDF is hashed using Node's `crypto.createHash('sha256')` BEFORE being persisted to storage.
- The base64 hash string is persisted to `compensations.awardDocumentHash`.
- **Verification**: `api/v1/projects/[projectId]/compensations/[compensationId]/verify-award/route.ts` allows users to upload a PDF. The backend hashes the uploaded bytes in-memory and securely compares them with the authoritative DB hash. It does NOT prove legal validity, only byte-level cryptographic integrity.

---

## 16. DOCUMENT STORAGE

- **Storage Layer**: MinIO (`bhushetu-documents` and `bhushetu-awards` buckets).
- **Metadata**: Standard documents (e.g., Notices) persist their metadata cleanly into the `auditEvents` table (`eventType: 'document_uploaded'`) containing the storage URL, removing the need for a secondary `documents` table while fulfilling persistence requirements.
- Award documents rely on the URL derivation paired with the `compensations` table hash.

---

## 17. AUDIT TRAIL

- **Implementation**: `audit_events` table.
- Traps: `project_created`, `task_approved`, `compensation_calculated`, `award_generated`, `gis_data_uploaded`, `document_uploaded`.
- Logs `actorId`, `actorRole`, `actorIp`, `metadata`, and timestamps.
- **Rule**: High-risk mutations MUST be wrapped in a `db.transaction` where the final step is writing to the `audit_events` ledger.

---

## 18. OFFLINE PWA

- **IMPLEMENTED** via a Service Worker (`public/sw.js`) and UI Context (`src/components/pwa/OfflineSyncUI.tsx`).
- **Flow**:
  1. Officer loses connection.
  2. The Service Worker intercepts `POST`/`PATCH` to `/api/*`.
  3. SW serializes the request into `BhuSetuOfflineDB` (IndexedDB) and immediately returns `503 Service Unavailable` with `X-Offline-Queued: true`.
  4. The frontend UI detects the queued state, hides the standard error, and updates the floating Sync Manager widget.
  5. Upon network restoration, `OfflineSyncUI` replays the requests sequentially, actively appending an `X-Idempotency-Key` header to prevent duplicate server state.
  6. **Conflict Handling**: Failed replays update to a `failed` state in the UI for user review.

---

## 19. FRONTEND ARCHITECTURE

The frontend was fully reconstructed to present a cohesive "Land Management Platform" instead of a generic admin template.

### Navigation Architecture

| Sidebar Link | Route | Access |
|---|---|---|
| Dashboard | `/workspace` | All authenticated |
| National Dashboard | `/workspace/national` | National roles only |
| Projects | `/workspace/projects` | All authenticated |
| My Tasks | `/workspace/tasks` | Approvers only |
| Notifications | `/workspace/notifications` | All authenticated |
| Public Portal | `/citizen/track` | All (public) |
| Settings | `/workspace/settings` | All authenticated |

### Project Workspace Tabs

The project detail page (`/workspace/projects/[id]`) uses a unified **Acquisition Case** layout:

| Tab | Components | Purpose |
|---|---|---|
| **Overview** | Project Classification + Location cards | Quick reference |
| **Spatial & Parcels** | `ProjectParcels` (split-screen: Map left, Parcels right) | GIS + ULPIN management |
| **Documents** | `ProjectDocuments` + Cryptographic Award Section | Upload docs, generate awards, verify SHA-256 |
| **Financials & R&R** | `ProjectCompensation` + `ProjectRehabilitation` | Combined financial ledger |
| **Activity Timeline** | `ProjectTimeline` | Audit trail for the project |

### Key UI Components

| Component | Location | Purpose |
|---|---|---|
| `LifecycleStepper` | `components/projects/LifecycleStepper.tsx` | Horizontal workflow visualization (Draft → Possession) |
| `ProjectMap` | `components/gis/ProjectMap.tsx` | Mapbox GL JS wrapper with project/parcel layers |
| `OfflineSyncUI` | `components/pwa/OfflineSyncUI.tsx` | Floating sync queue manager |
| `DashboardData` | `workspace/DashboardData.tsx` | Real-time metrics from `/api/v1/metrics/dashboard` |

### Pages

| Page | Purpose |
|---|---|
| `/auth/login` | Secure entry point |
| `/workspace` | Role-contextual dashboard |
| `/workspace/projects` | Project portfolio with status badges |
| `/workspace/projects/[id]` | Unified project workspace (5 tabs) |
| `/workspace/tasks` | SLA workflow inbox |
| `/workspace/tasks/[id]` | Individual task review/approval |
| `/citizen/track` | Public ULPIN search portal |

- All data flows from real API endpoints. No hardcoded mock data in production views.
- Network state and offline queue are managed globally by `OfflineSyncUI.tsx` injected at the `RootLayout` level.

---

## 20. API REFERENCE

| Method | Route | Purpose | Auth/Role |
|---|---|---|---|
| GET | `/api/v1/auth/me` | Fetches session capabilities | Authenticated |
| POST | `/api/v1/projects/[id]/spatial` | Updates GIS geometry | `project_manager` |
| PATCH| `/api/v1/parcels/[id]` | Edits parcel ULPIN | `field_officer` |
| PATCH| `/api/v1/workflow/tasks/[id]` | Approves SLA milestones | Assigned Role |
| POST | `/api/v1/projects/[id]/documents`| Uploads standard docs | Authenticated |
| POST | `/api/v1/projects/.../generate-award`| Creates final PDF | `district_collector` |
| POST | `/api/v1/projects/.../verify-award`| Verifies PDF SHA-256 | Authenticated |

---

## 21. ENVIRONMENT VARIABLES

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres Pooler string | YES |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox GIS token | YES |
| `MINIO_ENDPOINT` | Local/Remote MinIO host | NO (Falls back to disk) |
| `CRON_SECRET` | Header secret for SLA trigger | NO |

---

## 22. HOW TO RUN THE PROJECT

**Install dependencies**:
```bash
npm install
```

**Development**:
```bash
npm run dev
```

**Production Build**:
```bash
npm run build
npm run start
```

---

## 23. DATABASE SETUP

The project does NOT use `drizzle-kit push`. The actual Supabase PostgreSQL instance relies on `.sql` files located in `supabase/migrations/` (or run manually via Supabase dashboard).
- Avoid manually editing schemas in `src/lib/db/schema` without pushing a corresponding `.sql` migration file, or the application will throw relations errors.

---

## 24. TESTING / VERIFICATION

Automated test suites are currently limited. Verification relies on:
- **TypeScript**: `npm run build` strictly checks typings across components and API routes.
- **Red Team / Manual**: Core offline queues, SHA-256 hashing, and GIS bounds are validated via rigorous manual flows.

---

## 25. KNOWN LIMITATIONS

| Feature | Status | Details |
|---|---|---|
| Dashboard analytics | PARTIAL | Basic tasks/projects count works; complex multi-dimensional charts are absent. |
| Legal entitlement formulas | NOT VERIFIED | Statutory multipliers intentionally omitted to avoid hallucinations. |
| SLA Dashboard UI | PARTIAL | Cron check works in backend; missing frontend specific charts. |
| Bhashini Translation | MOCK FALLBACK | Citizen portal uses a static dictionary; real Bhashini API integration pending. |

---

## 26. DO NOT BREAK THESE RULES

1. **NEVER bypass the workflow state machine.** Do not `db.update(projects)` to jump statuses. Always complete the relevant `workflowTasks` which inherently computes the project status.
2. **Always perform RBAC and Tenant validation Server-Side.** UI hiding is insufficient. Ensure `user.districtCode !== project.districtCode` logic exists on every scoped API route.
3. **Preserve Transaction Boundaries.** Any operation that touches multiple schemas or inserts an `auditEvent` must reside in a `db.transaction`.
4. **Never expose internal UUIDs/PII through Citizen APIs.** Limit `/citizen/track` payloads safely.
5. **Never mock the offline API.** Ensure the Service worker returns a `503` with `X-Offline-Queued` instead of a fake `202 Success`, so the frontend `OfflineSyncUI` can safely manage idempotency replays.
6. **Do NOT calculate compensation totals solely in the frontend.** Always display the backend's `totalAwardAmount`.
7. **Do NOT mock SHA-256 verification.** The UI must actually upload the file to `/verify-award` and render the real response.
8. **Do NOT strip `X-Idempotency-Key` headers** when modifying forms — this breaks the offline retry mechanism.

---

## 27. TROUBLESHOOTING

- **Database Connection Failure (`ENOTFOUND` pooler)**: Supabase IPv4 connection strings using `.pooler.supabase.com` may fail locally depending on ISP/DNS routing. Verify `DATABASE_URL` uses the direct connection or IPv6 if necessary.
- **GIS Uploads Failing**: Ensure the uploaded GeoJSON is a strictly compliant `FeatureCollection`. Invalid polygons will cause a PostGIS parsing rejection.
- **Next.js Build Failure**: Type checks strictly enforce Lucide-react props. Wrap SVG icons in generic `<span>` tags if you need to pass `title` attributes.
- **Award Section Not Showing**: Ensure `projectStatus` is passed to `ProjectDocuments`. The cryptographic section only renders when `projectStatus === 'award_declared'` or awards exist.

---

## 28. CURRENT PROJECT STATUS

### Implemented
- Authentication, RBAC, District/State Isolation.
- RFCTLARR SLA Workflow state machine.
- GIS Integration (PostGIS, Mapbox GL) with split-screen spatial workspace.
- Compensation & R&R management (combined Financials tab).
- Award Generation (PDF & SHA-256 cryptographic verification).
- True Offline IndexedDB Queue + Replay Sync for field officers.
- Audit Event Ledger (including seamless document metadata storage).
- Full frontend reconstruction with LifecycleStepper, unified project workspace, and real API data.
- Frontend acceptance test passed (12 bugs found and fixed).

### Partial / Not Implemented
- Deep executive dashboard multi-dimensional analytics.
- Real Bhashini translation API integration (currently uses mock dictionary).

### Legal/Domain Verification Required
- Real-world R&R computation multipliers.

### Recommended Next Development
- Fleshing out the Dashboard Analytics graphs.
- Integrating Bhashini API for real-time multilingual citizen portal.
- Migrating the current `auditEvents` metadata document storage to a dedicated schema if query loads exceed performance thresholds.
