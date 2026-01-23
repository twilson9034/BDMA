# FleetMaster CMMS - AI Coding Agent Instructions

## Project Overview
FleetMaster is a full-stack TypeScript CMMS (Computerized Maintenance Management System) for fleet and asset management. It's a React + Express + PostgreSQL application designed for organizations to track assets, manage work orders, handle maintenance schedules, and leverage AI-driven predictive maintenance insights.

## Architecture Patterns

### Full-Stack Architecture
- **Frontend**: React 18 + Vite (`client/src/`) with Wouter routing and TanStack Query
- **Backend**: Express.js (`server/`) with Drizzle ORM for PostgreSQL
- **Shared Code**: `/shared/schema.ts` contains single source of truth for database schema, TypeScript types, and Zod validation schemas
- **Data Flow**: API requests from React through `lib/queryClient.ts` → Express routes (`server/routes.ts`) → Storage layer (`server/storage.ts`) → Database

### Authentication Flow (Replit Auth)
- OpenID Connect via Replit with Passport.js strategy
- Session storage in PostgreSQL (`sessions` and `users` tables in `shared/models/auth.ts`)
- Frontend: `AuthProvider` context hook manages user state and login/logout
- Backend: `requireAuth` middleware guards protected endpoints
- Client-side redirects to `/api/login` for authentication
- Token refresh handled automatically on protected routes via `isAuthenticated` middleware in `server/replit_integrations/auth/replitAuth.ts`

### Schema & Validation Pattern
All database tables defined in `shared/schema.ts` with Drizzle ORM:
- Each table → `Insert*Schema` Zod validator → `Insert*` TypeScript type → `*` select type
- Example: `assets` table → `insertAssetSchema` → `InsertAsset` type → `Asset` type
- API routes parse request bodies with `Schema.parse(req.body)` and return typed responses
- This ensures type safety across frontend/backend without duplication

### Core Entity Relationships
**Work Orders** (center of maintenance workflow):
- Contain `WorkOrderLine` items with parts, timer tracking (start/pause/complete), and labor hours
- Each line tracks `Complaint/Cause/Correction` fields with auto-save (1.5s debounce)
- Auto-status updates: when all lines complete/reschedule → work order marked "ready_for_review"
- Asset status auto-updates to "operational" when work order completes
- Auto-generated work order numbers: `WO-YYYY-####`

**Assets** (tracked equipment):
- Hierarchy support via `parentAssetId` (child assets for sub-components)
- Status enum: `operational | in_maintenance | down | retired | pending_inspection`
- Telematics data: GPS, odometer, engine hours, fuel, temps, voltage (stored in `telematicsData` table)
- Fault codes with severity (critical/high/medium/low) and SPN/FMI codes
- Asset detail page displays: predictions, telematics, fault codes, AI analysis button

**Preventive Maintenance (PM Schedules)**:
- Interval-based maintenance with `pmAssetInstances` for per-asset tracking
- Task checklists (auto-generated via AI or manually created)
- Linked to `ChecklistTemplate` reusable checklists assigned by make/model

**Procurement**:
- `PurchaseRequisition` (internal request) → `PurchaseOrder` (vendor order)
- `PurchaseOrder` line items include costs, parts, descriptions
- Auto-generated numbers: `REQ-YYYY-####` and `PO-YYYY-####`

**AI Predictions & Analysis**:
- Manual trigger: "AI Analysis" button on asset detail page
- API: `POST /api/assets/:id/analyze` calls OpenAI with telematics + fault codes + similar asset history
- Output: severity, confidence (0-100), reasoning, recommended actions
- Predictions are acknowledgeable/dismissible, displayed on dashboard

**Estimates**:
- Maintenance cost estimates tied to assets
- Status workflow: `draft → pending_approval → approved/rejected → converted`
- Server auto-recalculates totals on line modification
- Auto-generated: `EST-YYYY-####`

## Development Workflows

### Start Development
```bash
npm run dev  # Starts Express server with tsx, watches for changes
# In another terminal: Frontend auto-reloads via Vite on file changes
# Database operations don't require migration during dev (schema-driven)
```

### Build & Deploy
```bash
npm run build  # Runs script/build.ts → esbuild bundles to dist/index.cjs
npm start      # NODE_ENV=production node dist/index.cjs
```

### Database Migrations
```bash
npm run db:push  # Drizzle Kit pushes schema changes to DATABASE_URL
# Schema is source of truth; push when schema.ts changes
```

### Type Checking
```bash
npm run check  # tsc validates no TypeScript errors
```

## Project-Specific Patterns

### Route Registration Pattern
In `server/routes.ts`:
1. Async function `registerRoutes(httpServer: Server, app: Express)`
2. Register auth setup first: `await setupAuth(app); registerAuthRoutes(app);`
3. For each resource: list → detail → create → update → delete endpoints
4. Always wrap create/update in try/catch with Zod validation
5. Protected endpoints use `requireAuth` middleware
6. Respond with `201` for creation, auto-update derived data after modifications

Example resource pattern:
```typescript
// Get all
app.get("/api/items", async (req, res) => {
  const items = await storage.getItems();
  res.json(items);
});

// Create with validation
app.post("/api/items", requireAuth, async (req, res) => {
  try {
    const validated = insertItemSchema.parse(req.body);
    const item = await storage.createItem(validated);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: "Failed to create item" });
  }
});
```

### Storage Layer Pattern
`server/storage.ts` abstracts all database operations:
- Each entity has `get*`, `create*`, `update*`, `delete*` methods
- Methods accept/return typed objects matching schema
- Complex queries (filters, joins) encapsulated in storage methods
- Example: `storage.getWorkOrderLines(workOrderId)` returns typed array

### Frontend Page Component Structure
Pages in `client/src/pages/` follow consistent patterns:
1. Query hook at top: `const { data: items, isLoading } = useQuery({...})`
2. Loading state handling
3. Data validation / empty state
4. Mutations for create/update/delete
5. Toast notifications on success/error via `useToast()`
6. Form components for input, DataTable for lists

### Query Client & API Requests
- Centralized in `client/src/lib/queryClient.ts`
- Use `getQueryFn({ on401: "throw" | "returnNull" })` for standardized queries
- `apiRequest(method, url, data)` for mutations
- Auth context provides login/logout without manual token management
- 401 responses trigger redirect to login via `redirectToLogin()` in `lib/auth-utils.ts`

### Component Patterns
- Reusable components: `DataTable` (filterable lists), `StatusBadge`, `PriorityBadge`, `KPICard`
- UI components from shadcn/ui: buttons, forms, dialogs, dropdowns, tabs
- Styling: Tailwind CSS with CSS variables via theme provider (light/dark mode)
- Mobile detection via `useMobile()` hook for responsive UI

## Critical Integration Points

### Replit AI Integrations
- Chat, image generation, speech-to-text in `server/replit_integrations/`
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Used for: asset analysis predictions, checklist generation, part suggestions

### Barcode/QR Scanning
- `BarcodeScanner` component in header
- `POST /api/scan/:code` endpoint finds assets by asset number, work orders by number, parts by barcode/number
- Priority: asset number → work order number → part barcode → part number

### File Upload to Google Cloud Storage
- `ObjectUploader` component handles presigned URLs
- Route: `POST /api/uploads/request-url` generates presigned URL
- Client uploads directly to Google Cloud Storage
- Used for: asset images, manual PDFs, work order documentation

### Telematics & Fault Codes
- Real-time engine diagnostic data: GPS, fuel, temps, voltage, fault codes
- `POST /api/assets/:id/telematics` ingests data
- `GET /api/assets/:id/telematics/latest` for dashboard display
- Fault codes status workflow: `active → pending → cleared/resolved`

## Data Conventions

### Auto-Generated Numbers
- Work Orders: `WO-YYYY-####` (incremented per year)
- Requisitions: `REQ-YYYY-####`
- Purchase Orders: `PO-YYYY-####`
- Estimates: `EST-YYYY-####`
- Generation logic in `server/routes.ts` (filter by year, count, pad to 4 digits)

### Enums (String Discriminated Unions)
Defined in schema as `as const` arrays:
- Asset status: `["operational", "in_maintenance", "down", "retired", "pending_inspection"]`
- Asset type: `["vehicle", "equipment", "facility", "tool", "other"]`
- Work order status: `["pending", "in_progress", "ready_for_review", "completed", "cancelled"]`
- Work order line status: `["pending", "in_progress", "paused", "completed", "rescheduled", "cancelled"]`

### Timestamps & Dates
- Database: `timestamp` type with `defaultNow()` for creation, manual `new Date()` for updates
- Frontend: Use date-fns for formatting and manipulation
- UTC throughout backend; frontend displays in local timezone via browser

## Common Modification Points

**Adding a new resource**:
1. Add table definition in `shared/schema.ts`
2. Create `Insert*Schema` and types
3. Add `create*`, `get*`, `update*`, `delete*` methods in `server/storage.ts`
4. Add CRUD routes in `server/routes.ts` with Zod validation
5. Create page component in `client/src/pages/`
6. Add route in `client/src/App.tsx` router
7. Add navigation link in `AppSidebar.tsx`

**Adding a field to existing entity**:
1. Update table in `shared/schema.ts`
2. Run `npm run db:push` to migrate
3. Update Insert schema and types (often auto-via `createInsertSchema`)
4. Update form/page component if user-editable
5. Update relevant storage methods if used in queries/filters

**Adding an API endpoint**:
1. Define Zod schema in `shared/schema.ts` if validation needed
2. Add route in `server/routes.ts` with proper HTTP method, auth requirement, and error handling
3. Use `storage.*` for data access
4. Create React Query hook or use `apiRequest()` in page component
5. Handle 401 errors with redirect to login

## Debugging Tips
- Backend logs via `log(message)` function in `server/index.ts`
- Frontend React Query devtools available in development
- Drizzle Studio: `drizzle-kit studio` connects to PostgreSQL schema
- Check work order auto-status updates in `checkAndUpdateWorkOrderStatus()` logic in routes
- Telematics/fault codes: validate data structure before storage, stored as JSON in database
