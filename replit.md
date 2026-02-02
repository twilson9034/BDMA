# BDMA (Best Damn Maintenance App)

## Overview

BDMA is a comprehensive Computerized Maintenance Management System (CMMS) designed for efficient fleet and asset management. It enables organizations to track physical assets, manage work orders and maintenance schedules, handle parts inventory with automated reordering, process procurement workflows, and leverage AI-driven predictive maintenance insights. The system aims to optimize asset uptime, reduce maintenance costs, and streamline operational workflows through intelligent automation and data-driven decisions.

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
- **Database Interaction**: Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **API Design**: RESTful endpoints
- **Real-time Updates**: Server-Sent Events (SSE) via `/api/events` endpoint
- **Build**: esbuild

### Shared Code
Centralized database schema definitions, TypeScript types, and Zod validation schemas for both frontend and backend.

### Core Features & Design Principles
- **Asset Management**: Tracking with status, hierarchy, images, documents, lifecycle, and custom fields.
- **Work Order Management**: Comprehensive task management, time tracking, parts consumption, status workflows, digital signatures, and batch operations.
- **Predictive Maintenance**: AI-driven insights from telematics, fault codes, and historical data, including similar asset analysis and manual knowledge integration.
    - **Create WO from Prediction**: One-click work order creation with automatic bidirectional linking and priority assignment based on severity.
    - **Defer Predictions**: Schedule predictions to resurface at a future date or when a PM schedule triggers.
    - **AI Feedback Loop**: Learns from work order notes when linked WOs are completed, classifying feedback type based on keyword matching.
- **Inventory & Procurement**: Full parts management with reorder points, intelligent classification (SMART, ABC), cycle counting, purchase requisitions, orders, and workflow management.
    - **Auto Min/Max Updates**: Automatic recalculation of Min/Max and reorder points based on part usage patterns via `/api/parts/recalculate-minmax` endpoint.
    - **Smart Parts Search**: Work order part additions show high-probability parts based on VMRS code matching and usage history.
- **Scheduling & Inspections**: Interval-based PM schedules and Driver Vehicle Inspection Reports (DVIRs) with defect tracking and bulk QR code printing.
- **Estimates**: Detailed maintenance cost estimates with approval workflows and conversion to work orders.
- **Telematics & Diagnostics**: Live display and ingestion of engine diagnostic data and fault codes.
- **Workflow Automation**: Intelligent asset status updates, smart part suggestions, and transaction reversals.
- **Checklists**: Reusable templates with AI-powered generation.
    - **Work Order Checklists**: Attach checklist templates to work orders with Pass/Needs Repair/N/A status options per item.
    - **Checklist Item Notes**: Add notes to individual checklist items for detailed documentation.
    - **Auto-Create WO Lines**: "Needs Repair" items can automatically generate new work order lines with notes transferred.
- **Data Handling**: Bulk data import with error reporting, barcode/QR scanning, and part creation from PO lines.
- **User & Team Management**: Multi-user labor tracking with rates, technician management, and role-based access control.
- **Notifications**: In-app notification center with priority levels and real-time updates via Server-Sent Events (SSE).
- **Reporting & Dashboards**: Enhanced dashboards with KPI metrics, customizable widgets, and saved reports.
- **Specialized Modules**: Tire management with tire-specific fields and VMRS auto-assignment for code suggestions.
    - **Configurable Brake Settings**: Per-organization brake measurement modes (stroke, pad_thickness, both, or N/A) for customized inspection workflows.
- **Out-of-Service (OOS) Compliance**: Rules-based inspection engine for CVSA compliance checking, with configurable rules and integration into checklists.
- **Multi-Tenant Architecture**:
    - **Data Isolation**: Organizations have isolated data, managed via `orgId` on all tenant-scoped tables.
    - **Access Control**: Role-based access (owner/admin/manager/technician/viewer) and plan-based limitations.
    - **Hierarchy**: Support for parent-subsidiary organizations with `parentOrgId` and `isCorporateAdmin` for cross-org visibility.
    - **Implementation**: Tenant middleware for request context, organization switcher UI, and robust storage layer methods for managing organizations and memberships.
- **Custom Roles Management**:
    - **Custom Roles**: Organizations can create, edit, duplicate, and delete custom roles with granular permissions.
    - **Permission Categories (10 total, 60 permissions)**: Assets, Work Orders, Inventory, Procurement, Scheduling, Inspections, Estimates, Reports, AI Features, and Administration.
    - **System Roles**: 5 pre-built editable roles (Owner, Administrator, Manager, Technician, Viewer) can be seeded and customized.
    - **View as Role**: Administrators can preview the app with different role permissions for testing access control.
    - **API Endpoints**: `/api/custom-roles` for CRUD, `/api/custom-roles/seed` for seeding, `/api/custom-roles/view-as` for role impersonation.
    - **Database**: `custom_roles` table with JSONB `permissions` field for flexible permission storage.

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