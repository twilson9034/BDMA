# BDMA CMMS

## Overview

BDMA is a comprehensive Computerized Maintenance Management System (CMMS) designed for fleet and asset management. The application enables organizations to track physical assets (vehicles, machinery, facilities), manage work orders and maintenance schedules, handle parts inventory with automated reordering, process complete procurement workflows, and leverage AI-driven predictive maintenance insights.

The system is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and functional components
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query for server state, React Context for auth
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared code)

Key frontend patterns:
- Reusable components in `/client/src/components` (DataTable, StatusBadge, KPICard, etc.)
- Page components in `/client/src/pages` with consistent layout structure
- Custom hooks in `/client/src/hooks` for auth, toasts, and mobile detection
- API requests through centralized queryClient with automatic error handling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect, session storage in PostgreSQL
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Build**: esbuild for production bundling with selective dependency bundling

Key backend patterns:
- Route registration in `/server/routes.ts` with Zod schema validation
- Database operations abstracted through `/server/storage.ts`
- Authentication middleware via Replit integrations
- Static file serving for production builds

### Shared Code
- **Location**: `/shared/schema.ts` and `/shared/models/`
- **Purpose**: Database schema definitions (Drizzle), TypeScript types, Zod validation schemas
- **Pattern**: Schema defined once, used for both database operations and API validation

### Core Entities
1. **Assets**: Physical items (vehicles, equipment, facilities) with status tracking and hierarchy support
2. **Work Orders**: Maintenance tasks with line items, time tracking, and parts consumption
3. **PM Schedules**: Preventive maintenance schedules with interval-based triggers
4. **Inventory/Parts**: Parts management with reorder points and vendor associations
5. **Procurement**: Purchase requisitions and orders with approval workflows
6. **DVIRs**: Driver Vehicle Inspection Reports with defect tracking
7. **Predictions**: AI-generated maintenance predictions with severity levels (critical/high/medium/low), confidence scores, reasoning, and recommended actions. Triggered via AI Analysis button on asset detail page. API routes: GET /api/predictions, POST /api/assets/:id/analyze, PATCH /api/predictions/:id (acknowledge/dismiss)
8. **Estimates**: Maintenance cost estimates tied to assets with line items for inventory parts, zero-stock parts, non-inventory items, and labor. Includes parts fulfillment tracking with needsOrdering flag. Estimate numbers auto-generated as EST-YYYY-####. Status workflow: draft → pending_approval → approved/rejected → converted. Server-side automatic recalculation of parts/labor/grand totals when lines are modified.
9. **Telematics Data**: Engine diagnostic data including GPS coordinates, odometer, engine hours, fuel level, coolant temp, oil pressure, battery voltage, DEF level, speed. Live display on asset detail page. API routes: GET /api/assets/:id/telematics/latest, POST /api/assets/:id/telematics for data ingestion.
10. **Fault Codes**: Diagnostic Trouble Codes (DTCs) with severity levels (low/medium/high/critical), status workflow (active/pending/cleared/resolved), SPN/FMI codes. Display on asset detail page with visual indicators. API routes: GET /api/assets/:id/fault-codes, POST /api/assets/:id/fault-codes.
11. **Work Order Lines**: Line items for work orders with auto-generated line numbers, parts selection from inventory (partId, quantity, unitCost), and timer functionality (start/pause/resume/complete). Status workflow: pending → in_progress → paused → completed/rescheduled. Timer is decoupled from line status - can be started/paused/resumed multiple times, with "Close Line" button to mark completion. Labor hours accumulate across pause/resume cycles. Editable Complaint/Cause/Correction fields with 1.5s debounce auto-save. Parts usage section supports both inventory parts (with automatic stock deduction) and non-inventory items. Lines track completedAt timestamp when closed. Reschedule feature allows deferring work to future work orders. Auto-status update: when all lines are completed/rescheduled, work order auto-updates to "ready_for_review" status and asset auto-updates to "operational" if it was "in_maintenance". API routes: GET/POST /api/work-orders/:id/lines, PATCH/DELETE /api/work-order-lines/:id, POST /api/work-order-lines/:id/start-timer, POST /api/work-order-lines/:id/pause-timer, POST /api/work-order-lines/:id/stop-timer, POST /api/work-order-lines/:id/reschedule, POST /api/work-order-lines/:id/add-item, GET /api/work-order-lines/:id/transactions.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (configured via DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries and migrations
- **connect-pg-simple**: Session storage in PostgreSQL

### Authentication
- **Replit Auth**: OpenID Connect authentication flow
- **Passport.js**: Authentication middleware with openid-client strategy
- **express-session**: Session management

### AI Integrations
- **OpenAI API**: Used via Replit AI Integrations for:
  - Chat completions (text generation)
  - Speech-to-text and text-to-speech
  - Image generation (gpt-image-1)
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### File Storage
- **Google Cloud Storage**: Object storage for file uploads (@google-cloud/storage)
- **Uppy**: Client-side file upload handling with AWS S3 compatible presigned URLs

### UI Libraries
- **Radix UI**: Accessible UI primitives (dialogs, dropdowns, tabs, etc.)
- **Recharts**: Dashboard charts and data visualization
- **Lucide React**: Icon library

### Utilities
- **Zod**: Schema validation for API inputs
- **date-fns**: Date manipulation
- **class-variance-authority + clsx + tailwind-merge**: Component styling utilities

## Phase 3 Features

### AI-Powered Predictive Maintenance
- **AI Analysis Service**: Uses OpenAI GPT-4o to analyze telematics data, fault codes, and maintenance history
- **Prediction Generation**: Creates predictions with severity, confidence, reasoning, and recommended actions
- **Integration**: AI Analysis button on asset detail page triggers analysis
- **Fallback Logic**: Analyzes battery voltage, coolant temp, oil pressure, DEF level, fault codes if OpenAI fails
- **Similar Asset Analysis**: Queries maintenance history from other assets with same make/model to identify patterns and predict similar issues
- **Fleet Part Patterns**: Analyzes fleet-wide part replacement trends to identify frequently replaced parts and potential systemic issues
- **Manual Knowledge Integration**: AI reads associated service/maintenance manuals for the asset's make/model. Manual sections are included in the analysis prompt to provide manufacturer-specific recommendations, known issues, and proper procedures. Uses `storage.getManualsByMakeModel()` and `storage.getManualSections()` to retrieve manual content.

### Barcode/QR Scanning
- **BarcodeScanner Component**: Header-integrated scanner with manual entry and camera modes
- **Quick Lookup**: `/api/scan/:code` endpoint finds assets, parts, or work orders by code
- **Search Priority**: asset number → work order number → part barcode → part number

### Intelligent Asset Status Automation
- **Auto-Status API**: `/api/assets/:id/auto-status` updates status based on conditions
- **Status Logic**: critical faults → down, active work orders → in_maintenance, 2+ high faults → pending_inspection

### Parts Fulfillment & Tracking
- **Inventory Consumption**: `consumePartFromInventory` deducts parts from inventory
- **Transaction Tracking**: Records parts usage in work order transactions
- **Low Stock Alerts**: `/api/parts/low-stock` endpoint for reorder notifications

### Dashboard Widgets
- **FleetHealthWidget**: Displays fleet health score (0-100) based on predictions, faults, and asset status
- **PredictionsWidget**: Shows active AI predictions with acknowledge/dismiss actions

### Checklist Templates
- **Reusable Checklists**: Create maintenance task checklists that can be assigned to multiple PM schedules and assets
- **Categories**: pm_service, inspection, safety, pre_trip, post_trip, seasonal, other
- **Make/Model Assignments**: Bulk-assign checklists to assets based on manufacturer, model, or asset type (e.g., all Ford F-150s get the same "A Service" checklist)
- **AI Generation**: Use "Generate with AI" button to auto-generate task lists based on PM type, interval, vehicle specifications, and associated service manuals. When manufacturer/model is provided, the AI fetches relevant manuals and their sections to generate manufacturer-specific maintenance tasks.
- **API Routes**: 
  - GET/POST /api/checklist-templates - List and create templates
  - GET/PATCH/DELETE /api/checklist-templates/:id - Template CRUD
  - GET/POST /api/checklist-templates/:id/assignments - Make/model assignments
  - DELETE /api/checklist-assignments/:id - Remove assignment
  - GET /api/assets/:id/applicable-checklists - Get checklists for an asset
  - POST /api/ai/generate-checklist - AI-powered task generation
- **PM Schedule Integration**: PM schedules have editable task checklists with inline AI generation, saved to taskChecklist field
- **Navigation**: Sidebar → Operations → Checklists

### Bulk Data Import
- **Import Types**: Assets, parts, work order history, purchase orders, vendors, locations
- **CSV Parsing**: Client-side CSV parsing with column header detection, UTF-8/BOM handling
- **Field Mapping**: Interactive mapping UI to match CSV columns to schema fields
- **Progress Tracking**: Real-time import progress with success/error counts
- **Template Downloads**: Download CSV templates with required/optional columns
- **Import History**: View past imports with status and error details
- **Duplicate Detection**: Pre-import checks for existing records (parts: partNumber/barcode, assets: assetNumber)
- **Detailed Error Reporting**: Row-by-row validation errors with categorized error types (duplicate, missing_required, invalid_format, database_error)
- **Error Summary Dialog**: View error breakdowns by type/field plus individual row failures (stores up to 500 errors, displays 200)
- **Status Handling**: Import status includes "completed_with_errors" for partial successes
- **Navigation**: Sidebar → Resources → Data Import
- **API Routes**: GET/POST /api/import-jobs, GET /api/import-jobs/:id

### Smart Part Suggestions
- **Historical Analysis**: Tracks part usage by VMRS code, manufacturer, model, and year in `part_usage_history` table
- **Work Order Integration**: When adding parts to a work order line with a VMRS code, click "Get Suggestions" to see parts commonly used for similar repairs
- **AI Manual Scanning**: POST /api/smart-part-suggestions/ai endpoint uses OpenAI to recommend parts based on service manuals
- **Usage Recording**: Part usage is recorded for future suggestions when parts are consumed
- **API Routes**: GET /api/smart-part-suggestions, POST /api/smart-part-suggestions/ai, POST /api/part-usage