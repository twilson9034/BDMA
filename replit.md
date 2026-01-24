# BDMA (Best Damn Maintenance App)

## Overview

BDMA is a comprehensive Computerized Maintenance Management System (CMMS) designed for efficient fleet and asset management. It enables organizations to track physical assets, manage work orders and maintenance schedules, handle parts inventory with automated reordering, process procurement workflows, and leverage AI-driven predictive maintenance insights. The system aims to optimize asset uptime, reduce maintenance costs, and streamline operational workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (server state), React Context (auth)
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **API Design**: RESTful endpoints
- **Build**: esbuild

### Shared Code
- **Purpose**: Centralized database schema definitions (Drizzle), TypeScript types, and Zod validation schemas for both frontend and backend.

### Core Entities & Features
- **Assets**: Tracking of physical items with status and hierarchy.
- **Work Orders**: Management of maintenance tasks, time tracking, parts consumption, and a detailed line item system with status workflows, timer functionality, auto-status updates, signature capture (technician and customer), and batch operations (bulk status updates).
- **PM Schedules**: Interval-based preventive maintenance scheduling.
- **Inventory/Parts**: Comprehensive parts management with reorder points.
- **Procurement**: Purchase requisitions and orders with approval workflows.
- **DVIRs**: Driver Vehicle Inspection Reports with defect tracking.
- **Predictions**: AI-generated predictive maintenance insights based on telematics, fault codes, and maintenance history, including similar asset and fleet-wide pattern analysis, and manual knowledge integration.
- **Estimates**: Detailed maintenance cost estimates with line items and fulfillment tracking.
- **Telematics Data**: Live display and ingestion of engine diagnostic data.
- **Fault Codes**: Tracking and display of Diagnostic Trouble Codes.
- **Barcode/QR Scanning**: Quick lookup for assets, parts, or work orders.
- **Intelligent Asset Status Automation**: Automated status updates based on real-time conditions.
- **Parts Fulfillment & Tracking**: Inventory consumption, transaction tracking, and low stock alerts.
- **Checklist Templates**: Reusable maintenance checklists with AI-powered generation based on make/model and service manuals.
- **Bulk Data Import**: CSV parsing, field mapping, and detailed error reporting for various data types.
- **Smart Part Suggestions**: AI-powered and historical data-driven part recommendations for work orders.
- **Workflow Management**: Dedicated pages for Receiving, Part Requests, Ready for Review (work order approvals), and Reorder Alerts.
- **Transaction Reversals**: Atomic reversal of inventory and labor transactions.
- **Part Kits**: Bundling of parts for common maintenance tasks with automatic consumption.
- **ABC Classification & Cycle Counting**: Automatic ABC classification of parts for optimized cycle counting schedules and inventory reconciliation.
- **PM Dues & Batch Work Order Creation**: Tracking PM due dates/meters and batch creation of work orders for multiple PM instances.
- **Enhanced Dashboard**: KPI metrics (MTTR, MTBF, Asset Uptime %, PM Compliance, Avg Cost/WO), Procurement Overview widget, and Parts Analytics widget.
- **Multi-User Labor Tracking**: Timer-based labor tracking per technician with hourly rates, start/pause/stop functionality, and calculated labor costs.
- **Deferred Lines Display**: Visualization of work order lines that have been rescheduled from other work orders.
- **Notification Center**: In-app notifications with bell icon, unread count badge, real-time polling, priority levels, and entity linking.
- **Asset Images**: Multiple photo uploads per asset with primary image selection.
- **Asset Documents**: Document attachments (manuals, warranties, certificates) with expiration tracking.
- **Asset Lifecycle Tracking**: Lifecycle status (active, disposed, sold, transferred, scrapped), disposition date, salvage value, depreciation tracking.
- **Batch Meter Updates**: Update meters for multiple assets simultaneously.
- **Enhanced Parts Fields**: Max quantity, critical flag, and serialization tracking.
- **Multi-Tenant Architecture**: Organizations with isolated data, user memberships with role-based access (owner/admin/manager/technician/viewer), and plan-based pricing (starter/professional/enterprise with fleet size limits).
- **Tire Management**: Complete tire inventory with specifications (make, model, size, DOT code), condition tracking, lifecycle management (new/installed/retreaded/scrapped), and TPMS-ready monitoring fields.
- **Messaging System**: In-app direct messages and group conversations with entity tagging, priority levels, and conversation-based threading.
- **GPS & Location Tracking**: GPS location capture and storage with lat/lng coordinates, speed, heading, and provider integration fields.
- **Saved Reports**: Custom report definitions with parameters, output formats, and optional scheduling.
- **Customizable Dashboard**: Drag-and-drop widget layout with persistence, including Tire Health Widget and Parts Usage Analytics.
- **Bulk DVIR QR Code Printing**: Checkbox selection on assets page for bulk QR code generation, printable 3-column grid layout with vehicle labels.
- **Enhanced Asset History**: Tabbed interface on asset detail showing work orders, PM schedules, parts consumed, and DVIRs with filtering and navigation.
- **Part Barcoding**: Auto-generated P-prefixed barcodes (P00000123 format), Code 39 barcode display using Libre Barcode 39 font, and printable labels.
- **Custom Asset Fields**: Flexible JSONB-based custom fields for assets with add/edit/remove UI, displayed in both edit and view modes.

### Multi-Tenant Architecture
- **Organizations Table**: Stores organization data with name, slug, plan, status, and maxAssets limit.
- **Org Memberships Table**: Links users to organizations with roles (owner/admin/manager/technician/viewer).
- **Tenant Scoping**: All tenant-scoped tables have an orgId column. Storage methods filter by orgId.
- **Tenant Middleware**: Express middleware (server/tenant.ts) that extracts org context from session and adds to request.
- **Organization Switcher**: UI component in the header for switching between organizations.
- **Data Isolation**: Routes validate orgId on entity access to prevent cross-tenant data leakage.

#### Multi-Tenant Implementation Status (January 2026)
**Completed:**
- Database schema with 30+ tenant-scoped tables (all have orgId column)
- Tenant middleware pattern: `tenantMiddleware()` for writes, `tenantMiddleware({ required: false })` for reads
- Major routes tenant-scoped: assets, parts, work orders, locations, vendors, requisitions, POs, estimates, DVIRs, PM schedules, manuals, notifications, predictions, feedback, dashboard
- Org-scoped storage methods for all major entities including dashboard analytics
- Organization Settings page with editable name/slug (owners/admins only)
- Team Member Management with role display and role editing (owners/admins only)
- Protection against demoting the only organization owner
- PM due calculation uses pmAssetInstances.nextDueDate within 7-day window

**Storage Layer Methods for Organization Management:**
- `getOrganization(orgId)` - Get organization by ID
- `updateOrganization(orgId, data)` - Update organization (validated with updateOrganizationSchema)
- `getOrgMembers(orgId)` - Get all members with user details
- `getOrgMembership(orgId, userId)` - Get specific membership
- `updateOrgMemberRole(membershipId, role)` - Update member role (validated with updateOrgMemberRoleSchema)
- `countOrgOwners(orgId)` - Count owners (for protection logic)
- `getSubsidiaryOrgs(parentOrgId)` - Get all subsidiary organizations
- `setParentOrg(orgId, parentOrgId)` - Link org to parent (validated with setParentOrgSchema)
- `getOrgsForCorporateAdmin(userId)` - Get all orgs visible to corporate admin
- `updateMemberCorporateAdmin(orgId, memberId, isCorporateAdmin)` - Set corporate admin status
- `hasCorporateAdminMembership(userId)` - Check if user has any corporate admin membership

**Parent-Subsidiary Organization Features:**
- `parentOrgId` field on organizations table for hierarchical relationships
- `isCorporateAdmin` field on org_memberships for cross-org visibility
- Circular reference prevention via ancestor chain validation
- Corporate admins can view parent org and all subsidiaries
- OrganizationSwitcher only visible to users with multiple orgs or corporate admin role
- Parent linking requires owner/admin/corporate-admin role on parent organization

**Remaining Work for Complete Isolation:**
- Helper generators (work order/PO/requisition/estimate numbers) still use unscoped storage
- Some nested asset routes (images, documents, batch meter updates) need org validation
- Notification read/dismiss/unread-count endpoints need org membership validation

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe ORM.
- **connect-pg-simple**: PostgreSQL session storage.

### Authentication
- **Replit Auth**: OpenID Connect authentication.
- **Passport.js**: Authentication middleware.
- **express-session**: Session management.

### AI Integrations
- **OpenAI API**: Via Replit AI Integrations for chat completions, speech-to-text/text-to-speech, and image generation.

### File Storage
- **Google Cloud Storage**: Object storage for file uploads.
- **Uppy**: Client-side file upload handling.

### UI Libraries
- **Radix UI**: Accessible UI primitives.
- **Recharts**: Charting library.
- **Lucide React**: Icon library.

### Utilities
- **Zod**: Schema validation.
- **date-fns**: Date manipulation.
- **class-variance-authority, clsx, tailwind-merge**: Component styling utilities.