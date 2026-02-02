import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAssetSchema,
  insertVendorSchema,
  insertPartSchema,
  insertWorkOrderSchema,
  insertWorkOrderLineSchema,
  insertPmScheduleSchema,
  insertPurchaseRequisitionSchema,
  insertPurchaseRequisitionLineSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderLineSchema,
  insertManualSchema,
  insertDvirSchema,
  insertDvirDefectSchema,
  insertFeedbackSchema,
  insertEstimateSchema,
  insertEstimateLineSchema,
  insertTelematicsDataSchema,
  insertFaultCodeSchema,
  insertVmrsCodeSchema,
  insertChecklistTemplateSchema,
  insertChecklistMakeModelAssignmentSchema,
  insertReceivingTransactionSchema,
  insertPartRequestSchema,
  insertNotificationSchema,
  insertAssetImageSchema,
  insertAssetDocumentSchema,
  insertPartKitSchema,
  insertPartKitLineSchema,
  insertCycleCountSchema,
  type ImportErrorSummary,
} from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { tenantMiddleware, getUserOrgMemberships, getOrgId } from "./tenant";
import { organizations, orgMemberships, insertOrganizationSchema, insertOrgMembershipSchema, updateOrganizationSchema, updateOrgMemberRoleSchema, setParentOrgSchema, updateCorporateAdminSchema, tires, insertTireSchema, conversations, messages, insertConversationSchema, insertMessageSchema, savedReports, insertSavedReportSchema, gpsLocations, insertGpsLocationSchema, tireReplacementSettings, insertTireReplacementSettingSchema, publicAssetTokens, insertPublicAssetTokenSchema, insertPmScheduleModelSchema, insertPmScheduleKitModelSchema, customRoles, insertCustomRoleSchema, updateCustomRoleSchema, DEFAULT_ROLE_PERMISSIONS } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull } from "drizzle-orm";
import { appEvents } from "./events";
import { users, oosRulesVersions, oosInspections, oosSources, insertOosInspectionSchema } from "@shared/schema";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function generateWorkOrderNumber(orgId?: number): Promise<string> {
  const year = new Date().getFullYear();
  const workOrders = orgId ? await storage.getWorkOrdersByOrg(orgId) : await storage.getWorkOrders();
  const thisYearOrders = workOrders.filter(w => w.workOrderNumber?.startsWith(`WO-${year}`));
  const nextNum = thisYearOrders.length + 1;
  return `WO-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generateRequisitionNumber(orgId?: number): Promise<string> {
  const year = new Date().getFullYear();
  const reqs = orgId ? await storage.getRequisitionsByOrg(orgId) : await storage.getRequisitions();
  const thisYearReqs = reqs.filter(r => r.requisitionNumber?.startsWith(`REQ-${year}`));
  const nextNum = thisYearReqs.length + 1;
  return `REQ-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generatePONumber(orgId?: number): Promise<string> {
  const year = new Date().getFullYear();
  const pos = orgId ? await storage.getPurchaseOrdersByOrg(orgId) : await storage.getPurchaseOrders();
  const thisYearPOs = pos.filter(p => p.poNumber?.startsWith(`PO-${year}`));
  const nextNum = thisYearPOs.length + 1;
  return `PO-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generateEstimateNumber(orgId?: number): Promise<string> {
  const year = new Date().getFullYear();
  const estimates = orgId ? await storage.getEstimatesByOrg(orgId) : await storage.getEstimates();
  const thisYearEstimates = estimates.filter(e => e.estimateNumber?.startsWith(`EST-${year}`));
  const nextNum = thisYearEstimates.length + 1;
  return `EST-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function checkAndUpdateWorkOrderStatus(workOrderId: number): Promise<void> {
  console.log(`Checking status for Work Order ${workOrderId}`);
  const lines = await storage.getWorkOrderLines(workOrderId);
  if (lines.length === 0) {
    console.log(`No lines found for Work Order ${workOrderId}`);
    return;
  }

  const allDone = lines.every(line => 
    line.status === "completed" || line.status === "rescheduled" || line.status === "cancelled"
  );
  
  console.log(`All lines done for Work Order ${workOrderId}: ${allDone}`);
  console.log(`Line statuses: ${lines.map(l => l.status).join(", ")}`);

  if (allDone) {
    const wo = await storage.getWorkOrder(workOrderId);
    if (wo && wo.status !== "completed" && wo.status !== "cancelled") {
      console.log(`Updating Work Order ${workOrderId} to ready_for_review`);
      await storage.updateWorkOrder(workOrderId, { status: "ready_for_review" });
      
      // Update asset status to operational if it was in maintenance
      if (wo.assetId) {
        const asset = await storage.getAsset(wo.assetId);
        console.log(`Asset ${wo.assetId} current status: ${asset?.status}`);
        if (asset && (asset.status === "in_maintenance" || asset.status === "down" || asset.status === "pending_inspection")) {
          console.log(`Updating Asset ${wo.assetId} to operational`);
          await storage.updateAsset(wo.assetId, { status: "operational" });
        }
      }
    }
  }
}

async function recalculateEstimateTotals(estimateId: number): Promise<void> {
  const lines = await storage.getEstimateLines(estimateId);
  const estimate = await storage.getEstimate(estimateId);
  let partsTotal = 0;
  let laborTotal = 0;
  
  for (const line of lines) {
    const cost = parseFloat(line.totalCost || "0");
    if (line.lineType === "labor") {
      laborTotal += cost;
    } else {
      partsTotal += cost;
    }
  }
  
  const subtotal = partsTotal + laborTotal;
  const markupPercent = parseFloat(estimate?.markupPercent || "0");
  const markupTotal = subtotal * (markupPercent / 100);
  const grandTotal = subtotal + markupTotal;
  
  await storage.updateEstimate(estimateId, {
    partsTotal: partsTotal.toFixed(2),
    laborTotal: laborTotal.toFixed(2),
    markupTotal: markupTotal.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Auth user endpoint
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.json(null);
    }
  });

  // Server-Sent Events endpoint for real-time updates
  app.get("/api/events", requireAuth, tenantMiddleware({ required: false }), (req, res) => {
    const orgId = req.tenant?.orgId;
    
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

    const userId = (req.user as any)?.claims?.sub || "anonymous";
    const clientId = `${orgId || "no-org"}-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (orgId) {
      appEvents.addClient(clientId, orgId, res);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (e) {
        clearInterval(heartbeat);
        if (orgId) appEvents.removeClient(clientId);
      }
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      if (orgId) appEvents.removeClient(clientId);
    });
  });

  // Organization management endpoints
  app.get("/api/organizations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const memberships = await getUserOrgMemberships(userId);
      res.json(memberships);
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({ error: "Failed to get organizations" });
    }
  });

  app.get("/api/organizations/current", requireAuth, tenantMiddleware(), async (req, res) => {
    if (!req.tenant) {
      return res.status(403).json({ error: "No organization context" });
    }
    res.json(req.tenant);
  });

  app.post("/api/organizations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const validated = insertOrganizationSchema.parse(req.body);
      
      const [newOrg] = await db.insert(organizations)
        .values(validated)
        .returning();
      
      await db.insert(orgMemberships).values({
        orgId: newOrg.id,
        userId,
        role: "owner",
      });
      
      res.status(201).json(newOrg);
    } catch (error) {
      console.error("Create organization error:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.post("/api/organizations/switch/:orgId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const orgId = parseInt(req.params.orgId);
      
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const memberships = await getUserOrgMemberships(userId);
      const hasMembership = memberships.some(m => m.orgId === orgId);
      
      // Allow switching if user is a member OR if user has dev role (can view all orgs)
      if (!hasMembership) {
        const isDev = await storage.isDevOfAnyOrg(userId);
        if (!isDev) {
          return res.status(403).json({ error: "Not a member of this organization" });
        }
        // Verify the target org exists
        const targetOrg = await storage.getOrganization(orgId);
        if (!targetOrg) {
          return res.status(404).json({ error: "Organization not found" });
        }
      }
      
      if (req.session) {
        (req.session as any).selectedOrgId = orgId;
      }
      
      res.json({ success: true, orgId });
    } catch (error) {
      console.error("Switch organization error:", error);
      res.status(500).json({ error: "Failed to switch organization" });
    }
  });

  // Update organization settings (only owner/admin can update)
  app.patch("/api/organizations/current", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      // Check user has owner or admin role using storage
      const membership = await storage.getOrgMembership(orgId, userId);
      
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ error: "Only owners and admins can update organization settings" });
      }
      
      // Validate with schema
      const validated = updateOrganizationSchema.parse(req.body);
      
      if (Object.keys(validated).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      const updated = await storage.updateOrganization(orgId, validated);
      if (!updated) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update organization error:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Get organization members
  app.get("/api/organizations/current/members", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const members = await storage.getOrgMembers(orgId);
      res.json(members);
    } catch (error) {
      console.error("Get org members error:", error);
      res.status(500).json({ error: "Failed to get organization members" });
    }
  });

  // Update member role (only owner/admin can update)
  app.patch("/api/organizations/current/members/:memberId", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      
      // Validate with schema from shared/schema.ts
      const validated = updateOrgMemberRoleSchema.parse(req.body);
      
      // Check user has owner or admin role using storage
      const membership = await storage.getOrgMembership(orgId, userId);
      
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ error: "Only owners and admins can update member roles" });
      }
      
      // Get the target member to check their current role
      const orgMembers = await storage.getOrgMembers(orgId);
      const targetMember = orgMembers.find(m => m.id === memberId);
      
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // Cannot demote owner unless there's another owner
      if (targetMember.role === "owner" && validated.role !== "owner") {
        const ownerCount = await storage.countOrgOwners(orgId);
        if (ownerCount <= 1) {
          return res.status(400).json({ error: "Cannot demote the only owner" });
        }
      }
      
      const updated = await storage.updateOrgMemberRole(memberId, validated.role);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update member role error:", error);
      res.status(500).json({ error: "Failed to update member role" });
    }
  });

  // Update member primary location (only owner/admin can update)
  app.patch("/api/organizations/current/members/:memberId/location", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      const { primaryLocationId } = req.body;
      
      // Check user has owner or admin role using storage
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ error: "Only owners and admins can update member locations" });
      }
      
      // Verify the target member belongs to this org
      const orgMembers = await storage.getOrgMembers(orgId);
      const targetMember = orgMembers.find(m => m.id === memberId);
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // Verify the location belongs to this org (if specified)
      if (primaryLocationId !== null && primaryLocationId !== undefined) {
        const location = await storage.getLocation(primaryLocationId);
        if (!location || location.orgId !== orgId) {
          return res.status(400).json({ error: "Invalid location" });
        }
      }
      
      const updated = await storage.updateMemberPrimaryLocation(memberId, primaryLocationId ?? null);
      res.json(updated);
    } catch (error) {
      console.error("Update member location error:", error);
      res.status(500).json({ error: "Failed to update member location" });
    }
  });

  // Update member hourly rate (only owner/admin/manager can update)
  app.patch("/api/organizations/current/members/:memberId/hourly-rate", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      const { hourlyRate } = req.body;
      
      // Check user has owner, admin, or manager role
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || !["owner", "admin", "manager"].includes(membership.role || "")) {
        return res.status(403).json({ error: "Only owners, admins, and managers can update hourly rates" });
      }
      
      // Verify the target member belongs to this org
      const orgMembers = await storage.getOrgMembers(orgId);
      const targetMember = orgMembers.find(m => m.id === memberId);
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      const updated = await storage.updateMemberHourlyRate(memberId, hourlyRate ?? null);
      res.json(updated);
    } catch (error) {
      console.error("Update member hourly rate error:", error);
      res.status(500).json({ error: "Failed to update member hourly rate" });
    }
  });

  // Get member location assignments (for multi-location mode)
  app.get("/api/organizations/current/members/:memberId/locations", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      
      // Verify the member belongs to this org
      const orgMembers = await storage.getOrgMembers(orgId);
      if (!orgMembers.find(m => m.id === memberId)) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      const memberLocs = await storage.getMemberLocations(memberId);
      res.json(memberLocs);
    } catch (error) {
      console.error("Get member locations error:", error);
      res.status(500).json({ error: "Failed to get member locations" });
    }
  });

  // Add member to location (for multi-location mode)
  app.post("/api/organizations/current/members/:memberId/locations", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      const { locationId } = req.body;
      
      // Check user has owner or admin role
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ error: "Only owners and admins can manage member locations" });
      }
      
      // Verify the target member belongs to this org
      const orgMembers = await storage.getOrgMembers(orgId);
      if (!orgMembers.find(m => m.id === memberId)) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // Verify the location belongs to this org
      const location = await storage.getLocation(locationId);
      if (!location || location.orgId !== orgId) {
        return res.status(400).json({ error: "Invalid location" });
      }
      
      const memberLoc = await storage.addMemberLocation({ membershipId: memberId, locationId });
      res.json(memberLoc);
    } catch (error) {
      console.error("Add member location error:", error);
      res.status(500).json({ error: "Failed to add member location" });
    }
  });

  // Remove member from location (for multi-location mode)
  app.delete("/api/organizations/current/members/:memberId/locations/:locationId", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const memberId = parseInt(req.params.memberId);
      const locationId = parseInt(req.params.locationId);
      
      // Check user has owner or admin role
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ error: "Only owners and admins can manage member locations" });
      }
      
      // Verify the target member belongs to this org
      const orgMembers = await storage.getOrgMembers(orgId);
      if (!orgMembers.find(m => m.id === memberId)) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      await storage.removeMemberLocation(memberId, locationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove member location error:", error);
      res.status(500).json({ error: "Failed to remove member location" });
    }
  });

  // Get current user's membership (for getting primary location for filtering)
  app.get("/api/organizations/current/my-membership", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const membership = await storage.getOrgMembership(orgId, userId);
      res.json(membership);
    } catch (error) {
      console.error("Get my membership error:", error);
      res.status(500).json({ error: "Failed to get membership" });
    }
  });

  // Get subsidiary organizations (requires owner/admin or corporate admin)
  app.get("/api/organizations/current/subsidiaries", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || (!["owner", "admin"].includes(membership.role) && !req.tenant?.isCorporateAdmin)) {
        return res.status(403).json({ error: "Only owners, admins, or corporate admins can view subsidiaries" });
      }
      
      const subsidiaries = await storage.getSubsidiaryOrgs(orgId);
      res.json(subsidiaries);
    } catch (error) {
      console.error("Get subsidiaries error:", error);
      res.status(500).json({ error: "Failed to get subsidiary organizations" });
    }
  });

  // Set parent organization (requires owner of current org)
  app.patch("/api/organizations/current/parent", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || membership.role !== "owner") {
        return res.status(403).json({ error: "Only owners can set parent organization" });
      }
      
      // Validate request body with Zod
      const validationResult = setParentOrgSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: validationResult.error.errors });
      }
      
      const { parentOrgId } = validationResult.data;
      
      // Validate parent org exists if provided
      if (parentOrgId !== null && parentOrgId !== undefined) {
        const parentOrg = await storage.getOrganization(parentOrgId);
        if (!parentOrg) {
          return res.status(400).json({ error: "Parent organization not found" });
        }
        // Prevent self-reference
        if (parentOrgId === orgId) {
          return res.status(400).json({ error: "Organization cannot be its own parent" });
        }
        
        // User must be owner/admin of parent org or corporate admin to link (prevents unauthorized linking)
        const parentMembership = await storage.getOrgMembership(parentOrgId, userId);
        if (!parentMembership || (!["owner", "admin"].includes(parentMembership.role) && !parentMembership.isCorporateAdmin)) {
          return res.status(403).json({ error: "You must be an owner, admin, or corporate admin of the parent organization to link" });
        }
        
        // Prevent circular references by checking if parent org has this org as ancestor
        let currentParent = parentOrg;
        const visited = new Set<number>([orgId]);
        while (currentParent?.parentOrgId) {
          if (visited.has(currentParent.parentOrgId)) {
            return res.status(400).json({ error: "Cannot create circular parent-child relationship" });
          }
          visited.add(currentParent.parentOrgId);
          currentParent = await storage.getOrganization(currentParent.parentOrgId);
        }
      }
      
      const updated = await storage.setParentOrg(orgId, parentOrgId ?? null);
      res.json(updated);
    } catch (error) {
      console.error("Set parent org error:", error);
      res.status(500).json({ error: "Failed to set parent organization" });
    }
  });

  // Get all organizations (requires dev role in any org)
  app.get("/api/organizations/all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      // Verify user has dev role in at least one organization
      const isDev = await storage.isDevOfAnyOrg(userId);
      if (!isDev) {
        return res.status(403).json({ error: "Access denied. Dev role required." });
      }
      
      const orgs = await storage.getAllOrganizations();
      res.json(orgs);
    } catch (error) {
      console.error("Get all organizations error:", error);
      res.status(500).json({ error: "Failed to get organizations" });
    }
  });

  // Get all organizations for corporate admin (requires corporate admin status)
  app.get("/api/organizations/corporate-admin", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      // Verify user has at least one corporate admin membership
      const isCorporateAdmin = await storage.hasCorporateAdminMembership(userId);
      if (!isCorporateAdmin) {
        return res.status(403).json({ error: "Access denied. Corporate admin status required." });
      }
      
      const orgs = await storage.getOrgsForCorporateAdmin(userId);
      res.json(orgs);
    } catch (error) {
      console.error("Get corporate admin orgs error:", error);
      res.status(500).json({ error: "Failed to get organizations" });
    }
  });

  // Update member corporate admin status (requires owner)
  app.patch("/api/organizations/current/members/:memberId/corporate-admin", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not found" });
      
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "No organization context" });
      
      const membership = await storage.getOrgMembership(orgId, userId);
      if (!membership || membership.role !== "owner") {
        return res.status(403).json({ error: "Only owners can set corporate admin status" });
      }
      
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      
      // Validate request body with Zod
      const validationResult = updateCorporateAdminSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: validationResult.error.errors });
      }
      
      const { isCorporateAdmin } = validationResult.data;
      
      // Use storage method with tenant-scoped validation
      const updated = await storage.updateMemberCorporateAdmin(orgId, memberId, isCorporateAdmin);
      
      if (!updated) {
        return res.status(404).json({ error: "Member not found in this organization" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update corporate admin status error:", error);
      res.status(500).json({ error: "Failed to update corporate admin status" });
    }
  });

  // ============================================================
  // CUSTOM ROLES (Granular Permissions)
  // ============================================================
  
  // Get all custom roles for the organization
  app.get("/api/custom-roles", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const roles = await db.select().from(customRoles).where(eq(customRoles.orgId, orgId));
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Get a single role
  app.get("/api/custom-roles/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const [role] = await db.select().from(customRoles)
        .where(and(eq(customRoles.id, parseInt(req.params.id)), eq(customRoles.orgId, orgId)));
      
      if (!role) return res.status(404).json({ error: "Role not found" });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  // Create a new custom role
  app.post("/api/custom-roles", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const parsed = insertCustomRoleSchema.safeParse({ ...req.body, orgId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid role data", details: parsed.error.issues });
      }
      
      const [role] = await db.insert(customRoles).values(parsed.data).returning();
      res.status(201).json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Update a custom role
  app.patch("/api/custom-roles/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const roleId = parseInt(req.params.id);
      const parsed = updateCustomRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid role data", details: parsed.error.issues });
      }
      
      const [updated] = await db.update(customRoles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(customRoles.id, roleId), eq(customRoles.orgId, orgId)))
        .returning();
      
      if (!updated) return res.status(404).json({ error: "Role not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Delete a custom role
  app.delete("/api/custom-roles/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const roleId = parseInt(req.params.id);
      
      // Check if role is a system role
      const [role] = await db.select().from(customRoles)
        .where(and(eq(customRoles.id, roleId), eq(customRoles.orgId, orgId)));
      
      if (!role) return res.status(404).json({ error: "Role not found" });
      if (role.isSystem) return res.status(400).json({ error: "Cannot delete system roles" });
      
      await db.delete(customRoles)
        .where(and(eq(customRoles.id, roleId), eq(customRoles.orgId, orgId)));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // Seed standard roles for an organization
  app.post("/api/custom-roles/seed", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      // Check if roles already exist
      const existingRoles = await db.select().from(customRoles).where(eq(customRoles.orgId, orgId));
      if (existingRoles.length > 0) {
        return res.json({ message: "Roles already exist", roles: existingRoles });
      }
      
      // Create standard roles
      const standardRoles = [
        { name: "Owner", description: "Full access to all features and settings", color: "#f59e0b", isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.owner },
        { name: "Administrator", description: "Full access except organization ownership", color: "#ef4444", isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.admin },
        { name: "Manager", description: "Manage day-to-day operations and staff", color: "#8b5cf6", isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.manager },
        { name: "Technician", description: "Perform maintenance and inspections", color: "#22c55e", isSystem: true, isDefault: true, permissions: DEFAULT_ROLE_PERMISSIONS.technician },
        { name: "Viewer", description: "Read-only access to data", color: "#6b7280", isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.viewer },
      ];
      
      const createdRoles = await db.insert(customRoles)
        .values(standardRoles.map(r => ({ ...r, orgId })))
        .returning();
      
      res.status(201).json(createdRoles);
    } catch (error) {
      console.error("Seed roles error:", error);
      res.status(500).json({ error: "Failed to seed roles" });
    }
  });

  // Set view-as role for role preview (stores in session)
  app.post("/api/custom-roles/view-as/:roleId", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const roleId = parseInt(req.params.roleId);
      
      // Verify role exists and belongs to org
      const [role] = await db.select().from(customRoles)
        .where(and(eq(customRoles.id, roleId), eq(customRoles.orgId, orgId)));
      
      if (!role) return res.status(404).json({ error: "Role not found" });
      
      // Store in session
      (req.session as any).viewAsRoleId = roleId;
      (req.session as any).viewAsPermissions = role.permissions;
      
      res.json({ success: true, role });
    } catch (error) {
      res.status(500).json({ error: "Failed to set view-as role" });
    }
  });

  // Clear view-as role
  app.delete("/api/custom-roles/view-as", requireAuth, async (req, res) => {
    try {
      delete (req.session as any).viewAsRoleId;
      delete (req.session as any).viewAsPermissions;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear view-as role" });
    }
  });

  // Get current view-as role
  app.get("/api/custom-roles/view-as", requireAuth, async (req, res) => {
    try {
      const viewAsRoleId = (req.session as any).viewAsRoleId;
      const viewAsPermissions = (req.session as any).viewAsPermissions;
      res.json({ viewAsRoleId, viewAsPermissions });
    } catch (error) {
      res.status(500).json({ error: "Failed to get view-as role" });
    }
  });

  // Get current user's effective permissions (either from view-as or actual role)
  app.get("/api/permissions/current", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      // Check for view-as mode first
      const viewAsPermissions = (req.session as any).viewAsPermissions;
      if (viewAsPermissions) {
        return res.json({ 
          permissions: viewAsPermissions, 
          isViewAs: true,
          viewAsRoleId: (req.session as any).viewAsRoleId 
        });
      }
      
      // Get user's actual membership and role
      const userId = (req.user as any)?.claims?.sub;
      const membership = await storage.getMembershipByUserAndOrg(userId, orgId);
      
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      
      // If user has a custom role, use its permissions
      if (membership.customRoleId) {
        const [role] = await db.select().from(customRoles)
          .where(eq(customRoles.id, membership.customRoleId));
        if (role) {
          return res.json({ permissions: role.permissions, isViewAs: false, role: membership.role });
        }
      }
      
      // Fall back to base role permissions
      const baseRole = membership.role || 'technician';
      const permissions = DEFAULT_ROLE_PERMISSIONS[baseRole] || DEFAULT_ROLE_PERMISSIONS.viewer;
      
      res.json({ permissions, isViewAs: false, role: baseRole });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current permissions" });
    }
  });

  // Assign a custom role to a member
  app.patch("/api/organizations/current/members/:memberId/role", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const memberId = parseInt(req.params.memberId);
      const { customRoleId, role } = req.body;
      
      const updateData: any = {};
      if (customRoleId !== undefined) updateData.customRoleId = customRoleId;
      if (role !== undefined) updateData.role = role;
      
      const [updated] = await db.update(orgMemberships)
        .set(updateData)
        .where(and(eq(orgMemberships.id, memberId), eq(orgMemberships.orgId, orgId)))
        .returning();
      
      if (!updated) return res.status(404).json({ error: "Member not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update member role" });
    }
  });

  // Dashboard stats (tenant-scoped)
  app.get("/api/dashboard/stats", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      if (orgId) {
        const stats = await storage.getDashboardStatsByOrg(orgId, locationId);
        res.json(stats);
      } else {
        const stats = await storage.getDashboardStats();
        res.json(stats);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/kpis", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      if (orgId) {
        const kpis = await storage.getKpiMetricsByOrg(orgId, locationId);
        res.json(kpis);
      } else {
        const kpis = await storage.getKpiMetrics();
        res.json(kpis);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get KPI metrics" });
    }
  });

  app.get("/api/dashboard/procurement", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      if (orgId) {
        const overview = await storage.getProcurementOverviewByOrg(orgId, locationId);
        res.json(overview);
      } else {
        const overview = await storage.getProcurementOverview();
        res.json(overview);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get procurement overview" });
    }
  });

  app.get("/api/dashboard/parts-analytics", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      if (orgId) {
        const analytics = await storage.getPartsAnalyticsByOrg(orgId, locationId);
        res.json(analytics);
      } else {
        const analytics = await storage.getPartsAnalytics();
        res.json(analytics);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get parts analytics" });
    }
  });

  // Tire health dashboard widget
  app.get("/api/dashboard/tire-health", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      const tireHealth = await storage.getTireHealthStats(orgId, locationId);
      res.json(tireHealth);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tire health data" });
    }
  });

  // Admin record counts for data purge page (org-scoped)
  app.get("/api/admin/record-counts", requireAuth, tenantMiddleware({ required: true }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        return res.status(403).json({ error: "Organization context required" });
      }
      const counts = await storage.getAdminRecordCounts(orgId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get record counts" });
    }
  });

  // Seed test data endpoint - comprehensive CMMS simulation
  const seedTestDataSchema = z.object({
    workOrders: z.number().min(0).max(100).default(30),
    dvirs: z.number().min(0).max(100).default(25),
    predictions: z.number().min(0).max(50).default(15),
    purchaseOrders: z.number().min(0).max(50).default(10),
  });

  app.post("/api/admin/seed-test-data", requireAuth, tenantMiddleware({ required: true }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        return res.status(403).json({ error: "Organization context required" });
      }

      const parsed = seedTestDataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { workOrders: woCount, dvirs: dvirCount, predictions: predCount, purchaseOrders: poCount } = parsed.data;

      // Get existing data for the org to link test data
      const existingAssets = await storage.getAssets(orgId);
      if (existingAssets.length === 0) {
        return res.status(400).json({ error: "No assets found. Create some assets first." });
      }
      const existingParts = await storage.getPartsByOrg(orgId);
      const existingVendors = await storage.getVendorsByOrg(orgId);
      const existingLocations = await storage.getLocationsByOrg(orgId);

      const results = { workOrders: 0, workOrderLines: 0, partsUsed: 0, laborEntries: 0, dvirs: 0, predictions: 0, purchaseOrders: 0, purchaseOrderLines: 0 };
      const now = new Date();

      // Technician names for labor tracking
      const technicians = [
        { id: "tech-001", name: "John Smith" },
        { id: "tech-002", name: "Maria Garcia" },
        { id: "tech-003", name: "David Lee" },
        { id: "tech-004", name: "Sarah Johnson" },
        { id: "tech-005", name: "Mike Brown" },
      ];

      // Work Order types and priorities
      const woTypes = ["corrective", "preventive", "inspection", "emergency"] as const;
      const woPriorities = ["low", "medium", "high", "critical"] as const;
      const woStatuses = ["open", "in_progress", "on_hold", "completed"] as const;
      const lineStatuses = ["pending", "in_progress", "completed"] as const;

      // VMRS codes for work order lines (common maintenance tasks)
      const vmrsCodes = [
        { code: "013-001-001", title: "Engine Oil Change" },
        { code: "013-002-001", title: "Oil Filter Replacement" },
        { code: "042-001-001", title: "Brake Pad Inspection" },
        { code: "042-002-001", title: "Brake Adjustment" },
        { code: "017-001-001", title: "Air Filter Service" },
        { code: "041-001-001", title: "Tire Rotation" },
        { code: "041-002-001", title: "Tire Pressure Check" },
        { code: "015-001-001", title: "Coolant Flush" },
        { code: "044-001-001", title: "Steering Inspection" },
        { code: "032-001-001", title: "Battery Service" },
        { code: "043-001-001", title: "Suspension Check" },
        { code: "045-001-001", title: "Electrical Diagnostic" },
      ];

      // Generate work orders with lines (past 90 days)
      for (let i = 0; i < woCount; i++) {
        const daysAgo = Math.floor(Math.random() * 90);
        const asset = existingAssets[Math.floor(Math.random() * existingAssets.length)];
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const status = woStatuses[Math.floor(Math.random() * woStatuses.length)];
        const technician = technicians[Math.floor(Math.random() * technicians.length)];
        
        const titles = [
          "Engine oil change and filter replacement",
          "Brake inspection and adjustment",
          "Tire rotation and pressure check",
          "Transmission fluid service",
          "Cooling system flush",
          "Air filter replacement",
          "Battery load test and cleaning",
          "Suspension inspection",
          "Fuel system cleaning",
          "Electrical system diagnostic",
          "Hydraulic system service",
          "Drive belt inspection",
          "Steering system check",
          "Exhaust system inspection",
          "HVAC system service",
          "DOT annual inspection",
          "Pre-trip inspection follow-up",
          "Emergency road call repair",
        ];

        const wo = await storage.createWorkOrder({
          orgId,
          assetId: asset.id,
          locationId: existingLocations.length > 0 ? existingLocations[Math.floor(Math.random() * existingLocations.length)].id : null,
          assignedToId: technician.id,
          workOrderNumber: `WO-${now.getFullYear()}-${String(i + 1000).slice(-4)}`,
          title: titles[Math.floor(Math.random() * titles.length)],
          description: `Maintenance work order for ${asset.name} - ${asset.assetNumber || 'N/A'}`,
          type: woTypes[Math.floor(Math.random() * woTypes.length)],
          priority: woPriorities[Math.floor(Math.random() * woPriorities.length)],
          status,
          startDate,
          dueDate: status === "completed" ? null : new Date(startDate.getTime() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000),
          completedDate: status === "completed" ? new Date(startDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          estimatedHours: String((Math.random() * 4 + 0.5).toFixed(1)),
          actualHours: status === "completed" ? String((Math.random() * 5 + 0.5).toFixed(1)) : null,
          meterReading: asset.currentMeterReading ? String(Number(asset.currentMeterReading) + Math.floor(Math.random() * 1000)) : null,
        });
        results.workOrders++;

        // Generate 1-4 work order lines per work order
        const lineCount = Math.floor(Math.random() * 4) + 1;
        for (let j = 0; j < lineCount; j++) {
          const vmrs = vmrsCodes[Math.floor(Math.random() * vmrsCodes.length)];
          const lineStatus = status === "completed" ? "completed" : lineStatuses[Math.floor(Math.random() * lineStatuses.length)];
          const laborHrs = (Math.random() * 2 + 0.25);
          const laborRate = 75;
          
          const line = await storage.createWorkOrderLine({
            workOrderId: wo.id,
            lineNumber: j + 1,
            description: vmrs.title,
            status: lineStatus,
            vmrsCode: vmrs.code,
            vmrsTitle: vmrs.title,
            complaint: j === 0 ? `Customer reported issue with ${vmrs.title.toLowerCase()}` : null,
            cause: lineStatus === "completed" ? "Normal wear and tear" : null,
            correction: lineStatus === "completed" ? `Completed ${vmrs.title.toLowerCase()} as per manufacturer specifications` : null,
            laborHours: lineStatus === "completed" ? String(laborHrs.toFixed(2)) : null,
            laborRate: String(laborRate.toFixed(2)),
            laborCost: lineStatus === "completed" ? String((laborHrs * laborRate).toFixed(2)) : null,
            partsCost: existingParts.length > 0 && Math.random() > 0.5 ? String((Math.random() * 200 + 10).toFixed(2)) : null,
            totalCost: lineStatus === "completed" ? String((Math.random() * 300 + 50).toFixed(2)) : null,
          });
          results.workOrderLines++;

          // Add parts usage transactions for completed lines (70% chance)
          if (lineStatus === "completed" && existingParts.length > 0 && Math.random() > 0.3) {
            const partsToUse = Math.floor(Math.random() * 3) + 1; // 1-3 parts per line
            for (let k = 0; k < partsToUse; k++) {
              const part = existingParts[Math.floor(Math.random() * existingParts.length)];
              const qty = Math.floor(Math.random() * 3) + 1;
              const unitCost = Number(part.unitCost) || (Math.random() * 50 + 5);
              
              await storage.createWorkOrderTransaction({
                workOrderId: wo.id,
                workOrderLineId: line.id,
                type: "part_consumption",
                partId: part.id,
                quantity: String(qty),
                unitCost: String(unitCost.toFixed(4)),
                totalCost: String((qty * unitCost).toFixed(2)),
                description: `Used ${qty} x ${part.name} (${part.partNumber})`,
                performedById: technician.id,
              });
              results.partsUsed++;
            }
          }

          // Add labor entry for in-progress or completed lines
          if ((lineStatus === "completed" || lineStatus === "in_progress") && Math.random() > 0.4) {
            const laborStartTime = new Date(startDate.getTime() + Math.random() * 4 * 60 * 60 * 1000);
            const laborEndTime = lineStatus === "completed" 
              ? new Date(laborStartTime.getTime() + laborHrs * 60 * 60 * 1000)
              : null;
            
            await storage.createLaborEntry({
              workOrderId: wo.id,
              workOrderLineId: line.id,
              userId: technician.id,
              status: lineStatus === "completed" ? "completed" : "running",
              startTime: laborStartTime,
              endTime: laborEndTime,
              hourlyRate: String(laborRate.toFixed(2)),
              notes: `Labor for ${vmrs.title}`,
            });
            results.laborEntries++;
          }
        }
      }

      // Generate DVIRs with varying dates (past 60 days)
      const dvirStatuses = ["safe", "needs_repair", "out_of_service"] as const;
      for (let i = 0; i < dvirCount; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        const asset = existingAssets[Math.floor(Math.random() * existingAssets.length)];
        const inspectionDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const status = dvirStatuses[Math.floor(Math.random() * dvirStatuses.length)];

        const dvir = await storage.createDvir({
          orgId,
          assetId: asset.id,
          inspectorName: ["John Smith", "Maria Garcia", "David Lee", "Sarah Johnson", "Mike Brown"][Math.floor(Math.random() * 5)],
          inspectionDate,
          status,
          preTrip: Math.random() > 0.3,
          meterReading: String(Math.floor(Math.random() * 50000 + 10000)),
          notes: status === "safe" ? "All systems checked and functioning properly" : "Issues found during inspection",
        });

        // Add defects for non-safe DVIRs
        if (status !== "safe") {
          const defectCategories = ["Brakes", "Tires", "Lights", "Steering", "Horn", "Mirrors", "Wipers", "Exhaust"];
          const defectCount = status === "out_of_service" ? Math.floor(Math.random() * 3) + 2 : 1;
          
          for (let j = 0; j < defectCount; j++) {
            await storage.createDvirDefect({
              dvirId: dvir.id,
              category: defectCategories[Math.floor(Math.random() * defectCategories.length)],
              description: "Defect identified during inspection requiring attention",
              severity: status === "out_of_service" ? "critical" : (Math.random() > 0.5 ? "major" : "minor"),
            });
          }
        }
        results.dvirs++;
      }

      // Generate predictions with varying dates and types
      const predTypes = ["component_failure", "maintenance_optimization", "fuel_efficiency", "safety_concern"] as const;
      const predSeverities = ["low", "medium", "high", "critical"] as const;
      
      const predictionTemplates = [
        { type: "component_failure", prediction: "Brake pad wear approaching minimum threshold", action: "Schedule brake pad replacement within 7 days", cost: "350" },
        { type: "component_failure", prediction: "Battery showing signs of degradation", action: "Test and replace battery if needed", cost: "200" },
        { type: "component_failure", prediction: "Drive belt showing wear patterns", action: "Inspect and replace drive belt", cost: "150" },
        { type: "component_failure", prediction: "Transmission fluid degradation detected", action: "Schedule transmission service", cost: "450" },
        { type: "maintenance_optimization", prediction: "Oil change interval can be extended based on usage", action: "Adjust PM schedule interval", cost: null },
        { type: "maintenance_optimization", prediction: "Air filter replacement frequency too high for conditions", action: "Review air filter replacement schedule", cost: null },
        { type: "fuel_efficiency", prediction: "Fuel efficiency decreased 12% over last month", action: "Check tire pressure and engine tuning", cost: "100" },
        { type: "fuel_efficiency", prediction: "Idle time increased significantly", action: "Review driver training on idle reduction", cost: null },
        { type: "safety_concern", prediction: "Tire tread depth approaching minimum safe level", action: "Schedule tire inspection and replacement", cost: "800" },
        { type: "safety_concern", prediction: "Steering response time slower than baseline", action: "Inspect power steering system", cost: "300" },
      ];

      for (let i = 0; i < predCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const asset = existingAssets[Math.floor(Math.random() * existingAssets.length)];
        const template = predictionTemplates[Math.floor(Math.random() * predictionTemplates.length)];
        const confidence = (0.65 + Math.random() * 0.30).toFixed(4);
        
        await storage.createPrediction({
          orgId,
          assetId: asset.id,
          predictionType: template.type,
          prediction: `${template.prediction} - ${asset.name}`,
          confidence,
          severity: predSeverities[Math.floor(Math.random() * predSeverities.length)],
          reasoning: `Analysis based on ${Math.floor(Math.random() * 50 + 10)} data points from maintenance history, telematics, and similar assets`,
          recommendedAction: template.action,
          estimatedCost: template.cost,
          dueDate: new Date(now.getTime() + (Math.random() * 30) * 24 * 60 * 60 * 1000),
          acknowledged: Math.random() > 0.7,
        });
        results.predictions++;
      }

      // Generate purchase orders if vendors exist
      if (existingVendors.length > 0 && existingParts.length > 0 && poCount > 0) {
        const poStatuses = ["draft", "submitted", "approved", "ordered", "partially_received", "received", "cancelled"] as const;
        
        for (let i = 0; i < poCount; i++) {
          const daysAgo = Math.floor(Math.random() * 60);
          const vendor = existingVendors[Math.floor(Math.random() * existingVendors.length)];
          const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          const status = poStatuses[Math.floor(Math.random() * poStatuses.length)];
          
          const po = await storage.createPurchaseOrder({
            orgId,
            poNumber: `PO-${now.getFullYear()}-${String(i + 1000).slice(-4)}`,
            vendorId: vendor.id,
            status,
            orderDate,
            expectedDeliveryDate: new Date(orderDate.getTime() + (Math.random() * 14 + 3) * 24 * 60 * 60 * 1000),
            notes: `Purchase order for maintenance supplies from ${vendor.name}`,
          });
          results.purchaseOrders++;

          // Add 1-5 lines per PO
          const lineCount = Math.floor(Math.random() * 5) + 1;
          let totalAmount = 0;
          
          for (let j = 0; j < lineCount; j++) {
            const part = existingParts[Math.floor(Math.random() * existingParts.length)];
            const qty = Math.floor(Math.random() * 10) + 1;
            const unitCost = Number(part.unitCost) || (Math.random() * 100 + 10);
            const lineCost = qty * unitCost;
            totalAmount += lineCost;
            
            const qtyReceived = status === "received" ? qty : 
                               status === "partially_received" ? Math.floor(qty * Math.random()) : 0;
            
            await storage.createPurchaseOrderLine({
              poId: po.id,
              partId: part.id,
              description: `${part.name} - ${part.partNumber}`,
              quantityOrdered: String(qty),
              quantityReceived: String(qtyReceived),
              unitCost: String(unitCost.toFixed(4)),
              totalCost: String(lineCost.toFixed(2)),
            });
            results.purchaseOrderLines++;
          }
          
          // Update PO total
          await storage.updatePurchaseOrder(po.id, { totalAmount: String(totalAmount.toFixed(2)) });
        }
      }

      const summary = [
        `${results.workOrders} work orders (${results.workOrderLines} lines, ${results.partsUsed} parts used, ${results.laborEntries} labor entries)`,
        `${results.dvirs} DVIRs`,
        `${results.predictions} predictions`,
        results.purchaseOrders > 0 ? `${results.purchaseOrders} purchase orders (${results.purchaseOrderLines} lines)` : null,
      ].filter(Boolean).join(", ");

      res.json({ 
        success: true, 
        message: `Generated ${summary}`,
        results 
      });
    } catch (error) {
      console.error("Seed test data error:", error);
      res.status(500).json({ error: "Failed to seed test data" });
    }
  });

  // Locations (tenant-scoped)
  app.get("/api/locations", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const locs = await storage.getLocationsByOrg(orgId);
      res.json(locs);
    } else {
      const locs = await storage.getLocations();
      res.json(locs);
    }
  });

  app.get("/api/locations/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const location = await storage.getLocation(parseInt(req.params.id));
    if (!location) return res.status(404).json({ error: "Location not found" });
    const orgId = getOrgId(req);
    if (orgId && location.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(location);
  });

  // VMRS Codes
  app.get("/api/vmrs-codes", async (req, res) => {
    const codes = await storage.getVmrsCodes();
    res.json(codes);
  });

  app.get("/api/vmrs-codes/:id", async (req, res) => {
    const code = await storage.getVmrsCode(parseInt(req.params.id));
    if (!code) return res.status(404).json({ error: "VMRS code not found" });
    res.json(code);
  });

  app.post("/api/vmrs-codes", requireAuth, async (req, res) => {
    try {
      console.log("Creating VMRS code with body:", req.body);
      const validated = insertVmrsCodeSchema.parse(req.body);
      const code = await storage.createVmrsCode(validated);
      res.status(201).json(code);
    } catch (error) {
      console.error("VMRS creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create VMRS code" });
    }
  });

  app.patch("/api/vmrs-codes/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateVmrsCode(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "VMRS code not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update VMRS code" });
    }
  });

  app.delete("/api/vmrs-codes/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVmrsCode(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete VMRS code" });
    }
  });

  // ============================================================
  // VMRS AUTO-SUGGEST (tenant-scoped)
  // ============================================================
  app.post("/api/vmrs/suggest/:partId", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const { suggestVmrsForPart } = await import("./services/vmrsSuggestionService");
      const result = await suggestVmrsForPart(parseInt(req.params.partId), orgId);
      res.json(result);
    } catch (error) {
      console.error("VMRS suggestion error:", error);
      res.status(500).json({ error: "Failed to suggest VMRS codes" });
    }
  });

  app.post("/api/vmrs/suggest-bulk", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const limit = req.body.limit || 100;
      const { suggestVmrsForPartsWithoutCodes } = await import("./services/vmrsSuggestionService");
      const results = await suggestVmrsForPartsWithoutCodes(orgId, limit);
      res.json({ 
        processed: results.length,
        results,
        highConfidence: results.filter(r => r.topSuggestion && r.topSuggestion.confidence >= 0.90).length,
      });
    } catch (error) {
      console.error("VMRS bulk suggestion error:", error);
      res.status(500).json({ error: "Failed to suggest VMRS codes" });
    }
  });

  const vmrsAcceptSchema = z.object({
    partId: z.number(),
    suggestion: z.object({
      systemCode: z.string(),
      assemblyCode: z.string().optional(),
      componentCode: z.string().optional(),
      safetySystem: z.string().optional().nullable(),
      confidence: z.number(),
      explanation: z.string().optional(),
    }),
    acceptedSystemCode: z.string(),
    acceptedAssemblyCode: z.string().optional(),
    acceptedComponentCode: z.string().optional(),
    acceptedSafetySystem: z.string().optional().nullable(),
    notes: z.string().optional(),
  });

  app.post("/api/vmrs/accept", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not authenticated" });
      
      const validated = vmrsAcceptSchema.parse(req.body);
      const { acceptVmrsSuggestion } = await import("./services/vmrsSuggestionService");
      await acceptVmrsSuggestion(
        validated.partId, 
        orgId, 
        userId, 
        validated.suggestion, 
        validated.acceptedSystemCode, 
        validated.acceptedAssemblyCode, 
        validated.acceptedComponentCode, 
        validated.acceptedSafetySystem, 
        validated.notes
      );
      res.json({ success: true });
    } catch (error) {
      console.error("VMRS accept error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to accept VMRS suggestion" });
    }
  });

  const vmrsRejectSchema = z.object({
    partId: z.number(),
    suggestion: z.object({
      systemCode: z.string(),
      assemblyCode: z.string().optional(),
      componentCode: z.string().optional(),
      safetySystem: z.string().optional().nullable(),
      confidence: z.number(),
      explanation: z.string().optional(),
    }),
    notes: z.string().optional(),
  });

  app.post("/api/vmrs/reject", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "User not authenticated" });
      
      const validated = vmrsRejectSchema.parse(req.body);
      const { rejectVmrsSuggestion } = await import("./services/vmrsSuggestionService");
      await rejectVmrsSuggestion(validated.partId, orgId, userId, validated.suggestion, validated.notes);
      res.json({ success: true });
    } catch (error) {
      console.error("VMRS reject error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to reject VMRS suggestion" });
    }
  });

  app.post("/api/vmrs/seed-dictionary", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { seedVmrsDictionary } = await import("./services/vmrsSuggestionService");
      const count = await seedVmrsDictionary(orgId || null);
      res.json({ success: true, insertedCount: count });
    } catch (error) {
      console.error("VMRS seed error:", error);
      res.status(500).json({ error: "Failed to seed VMRS dictionary" });
    }
  });

  // ============================================================
  // OOS (Out-of-Service) RULES & INSPECTIONS (tenant-scoped)
  // ============================================================
  app.get("/api/oos/rules-versions", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const versions = await db.select().from(oosRulesVersions)
        .where(or(eq(oosRulesVersions.orgId, orgId), isNull(oosRulesVersions.orgId)));
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OOS rules versions" });
    }
  });

  app.get("/api/oos/rules/:versionId", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { getRulesForVersion } = await import("./services/oosRulesEngine");
      const rules = await getRulesForVersion(parseInt(req.params.versionId), orgId || undefined);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OOS rules" });
    }
  });

  app.post("/api/oos/seed-rules", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { seedOosRules } = await import("./services/oosRulesEngine");
      const result = await seedOosRules(orgId || null);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("OOS seed error:", error);
      res.status(500).json({ error: "Failed to seed OOS rules" });
    }
  });

  app.get("/api/oos/inspections", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const inspections = await db.select().from(oosInspections).where(eq(oosInspections.orgId, orgId));
      res.json(inspections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OOS inspections" });
    }
  });

  app.post("/api/oos/inspections", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const validated = insertOosInspectionSchema.parse({ ...req.body, orgId });
      const { createInspection } = await import("./services/oosRulesEngine");
      const inspection = await createInspection(orgId, validated);
      res.status(201).json(inspection);
    } catch (error) {
      console.error("OOS inspection create error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create inspection" });
    }
  });

  app.post("/api/oos/inspections/:id/evaluate", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const { evaluateInspection } = await import("./services/oosRulesEngine");
      const result = await evaluateInspection(parseInt(req.params.id), req.body.findings || []);
      res.json(result);
    } catch (error) {
      console.error("OOS evaluation error:", error);
      res.status(500).json({ error: "Failed to evaluate inspection" });
    }
  });

  app.get("/api/oos/sources", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const sources = await db.select().from(oosSources)
        .where(or(eq(oosSources.orgId, orgId), isNull(oosSources.orgId)));
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OOS sources" });
    }
  });

  const oosSourceSchema = z.object({
    title: z.string().min(1, "Title is required"),
    sourceType: z.enum(['regulation', 'company_policy', 'manufacturer']),
    url: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable(),
  });

  app.post("/api/oos/sources", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const parsed = oosSourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid source data", details: parsed.error.issues });
      }
      
      const { title, sourceType, url, notes } = parsed.data;
      const [source] = await db.insert(oosSources).values({
        orgId,
        title,
        sourceType,
        url: url || null,
        notes: notes || null,
      }).returning();
      res.status(201).json(source);
    } catch (error) {
      res.status(500).json({ error: "Failed to create OOS source" });
    }
  });

  app.patch("/api/oos/sources/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const sourceId = parseInt(req.params.id);
      const parsed = oosSourceSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid source data", details: parsed.error.issues });
      }
      
      const { title, sourceType, url, notes } = parsed.data;
      
      const [updated] = await db.update(oosSources)
        .set({
          ...(title !== undefined && { title }),
          ...(sourceType !== undefined && { sourceType }),
          url: url || null,
          notes: notes || null,
        })
        .where(and(eq(oosSources.id, sourceId), eq(oosSources.orgId, orgId)))
        .returning();
      
      if (!updated) return res.status(404).json({ error: "Source not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update OOS source" });
    }
  });

  app.delete("/api/oos/sources/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const sourceId = parseInt(req.params.id);
      await db.delete(oosSources)
        .where(and(eq(oosSources.id, sourceId), eq(oosSources.orgId, orgId)));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete OOS source" });
    }
  });

  app.patch("/api/oos/rules-versions/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const versionId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const [updated] = await db.update(oosRulesVersions)
        .set({ isActive })
        .where(and(eq(oosRulesVersions.id, versionId), eq(oosRulesVersions.orgId, orgId)))
        .returning();
      
      if (!updated) return res.status(404).json({ error: "Version not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update OOS rules version" });
    }
  });

  // Assets (tenant-scoped)
  app.get("/api/assets", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const assets = await storage.getAssetsByOrg(orgId);
      res.json(assets);
    } else {
      const assets = await storage.getAssets();
      res.json(assets);
    }
  });

  // NOTE: This must come before /api/assets/:id to prevent :id from catching "make-models"
  app.get("/api/assets/make-models", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const makeModels = await storage.getAssetMakeModels(orgId || undefined);
      res.json(makeModels);
    } catch (error) {
      res.status(500).json({ error: "Failed to get asset make/models" });
    }
  });

  app.get("/api/assets/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const asset = await storage.getAsset(parseInt(req.params.id));
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    const orgId = getOrgId(req);
    if (orgId && asset.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(asset);
  });

  app.post("/api/assets", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset({ ...validated, orgId });
      if (orgId) appEvents.broadcast("assets", orgId);
      if (orgId) appEvents.broadcast("dashboard", orgId);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      // Convert empty strings to null for numeric fields to avoid PostgreSQL parse errors
      const data = { ...req.body };
      const numericFields = ['year', 'currentMeterReading', 'purchasePrice', 'salvageValue', 'residualValue', 'usefulLifeYears', 'locationId', 'parentAssetId'];
      for (const field of numericFields) {
        if (data[field] === '' || data[field] === undefined) {
          data[field] = null;
        }
      }
      
      const updated = await storage.updateAsset(parseInt(req.params.id), data);
      if (!updated) return res.status(404).json({ error: "Asset not found" });
      if (updated.orgId) appEvents.broadcast("assets", updated.orgId);
      if (updated.orgId) appEvents.broadcast("dashboard", updated.orgId);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update asset:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAsset(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Batch meter updates
  const batchMeterUpdateSchema = z.object({
    updates: z.array(z.object({
      assetId: z.number(),
      meterReading: z.string(),
      meterType: z.string().optional(),
    })).min(1, "At least one update is required"),
  });
  
  app.post("/api/assets/batch-meters", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = batchMeterUpdateSchema.parse(req.body);
      
      // Validate all assets belong to user's org
      if (orgId) {
        for (const update of validated.updates) {
          const asset = await storage.getAsset(update.assetId);
          if (!asset || asset.orgId !== orgId) {
            return res.status(403).json({ error: `Access denied for asset ${update.assetId}` });
          }
        }
      }
      
      const updatedAssets = await storage.batchUpdateAssetMeters(validated.updates);
      res.json(updatedAssets);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to batch update meters" });
    }
  });

  // Asset Images (tenant-scoped)
  app.get("/api/assets/:assetId/images", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const images = await storage.getAssetImages(assetId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset images" });
    }
  });

  app.post("/api/assets/:assetId/images", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const validated = insertAssetImageSchema.parse({
        ...req.body,
        assetId,
      });
      const image = await storage.createAssetImage(validated);
      res.status(201).json(image);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create asset image" });
    }
  });

  app.delete("/api/asset-images/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const image = await storage.getAssetImage(parseInt(req.params.id));
      if (!image) return res.status(404).json({ error: "Image not found" });
      if (orgId) {
        const asset = await storage.getAsset(image.assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      await storage.deleteAssetImage(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset image" });
    }
  });

  app.post("/api/assets/:assetId/images/:imageId/primary", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      await storage.setPrimaryAssetImage(assetId, parseInt(req.params.imageId));
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set primary image" });
    }
  });

  // Asset Documents (tenant-scoped)
  app.get("/api/assets/:assetId/documents", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const documents = await storage.getAssetDocuments(assetId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset documents" });
    }
  });

  app.post("/api/assets/:assetId/documents", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const validated = insertAssetDocumentSchema.parse({
        ...req.body,
        assetId,
      });
      const document = await storage.createAssetDocument(validated);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create asset document" });
    }
  });

  app.patch("/api/asset-documents/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const doc = await storage.getAssetDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (orgId) {
        const asset = await storage.getAsset(doc.assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const validated = insertAssetDocumentSchema.partial().parse(req.body);
      const document = await storage.updateAssetDocument(parseInt(req.params.id), validated);
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update asset document" });
    }
  });

  app.delete("/api/asset-documents/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const doc = await storage.getAssetDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (orgId) {
        const asset = await storage.getAsset(doc.assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      await storage.deleteAssetDocument(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset document" });
    }
  });

  // ============================================================
  // ASSET BRAKE SETTINGS
  // ============================================================
  app.get("/api/assets/:assetId/brake-settings", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const settings = await storage.getAssetBrakeSettings(assetId);
      if (!settings) {
        return res.json({ settings: null, axles: [] });
      }
      const axles = await storage.getAssetBrakeAxles(settings.id);
      res.json({ settings, axles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brake settings" });
    }
  });

  app.put("/api/assets/:assetId/brake-settings", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const { settings, axles } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      if (!Array.isArray(axles)) {
        return res.status(400).json({ error: "Axles must be an array" });
      }
      const result = await storage.upsertAssetBrakeSettings(assetId, settings, axles);
      const updatedAxles = await storage.getAssetBrakeAxles(result.id);
      res.json({ settings: result, axles: updatedAxles });
    } catch (error) {
      console.error("Failed to save brake settings:", error);
      res.status(500).json({ error: "Failed to save brake settings" });
    }
  });

  // ============================================================
  // ASSET TIRE SETTINGS
  // ============================================================
  app.get("/api/assets/:assetId/tire-settings", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const settings = await storage.getAssetTireSettings(assetId);
      if (!settings) {
        return res.json({ settings: null, axles: [] });
      }
      const axles = await storage.getAssetTireAxles(settings.id);
      res.json({ settings, axles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire settings" });
    }
  });

  app.put("/api/assets/:assetId/tire-settings", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { settings, axles } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      if (!Array.isArray(axles)) {
        return res.status(400).json({ error: "Axles must be an array" });
      }
      const assetId = parseInt(req.params.assetId);
      if (orgId) {
        const asset = await storage.getAsset(assetId);
        if (!asset || asset.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const result = await storage.upsertAssetTireSettings(assetId, settings, axles);
      const updatedAxles = await storage.getAssetTireAxles(result.id);
      res.json({ settings: result, axles: updatedAxles });
    } catch (error) {
      console.error("Failed to save tire settings:", error);
      res.status(500).json({ error: "Failed to save tire settings" });
    }
  });

  // ============================================================
  // BRAKE INSPECTIONS (Work Order linked)
  // ============================================================
  app.get("/api/work-orders/:workOrderId/brake-inspections", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const workOrderId = parseInt(req.params.workOrderId);
      if (orgId) {
        const wo = await storage.getWorkOrder(workOrderId);
        if (!wo || wo.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const inspections = await storage.getBrakeInspections(workOrderId);
      // Include axles with each inspection for viewing
      const inspectionsWithAxles = await Promise.all(
        inspections.map(async (insp) => {
          const axles = await storage.getBrakeInspectionAxles(insp.id);
          return { ...insp, axles };
        })
      );
      res.json(inspectionsWithAxles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brake inspections" });
    }
  });

  app.get("/api/brake-inspections/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const inspection = await storage.getBrakeInspection(parseInt(req.params.id));
      if (!inspection) return res.status(404).json({ error: "Inspection not found" });
      if (orgId && inspection.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const axles = await storage.getBrakeInspectionAxles(inspection.id);
      res.json({ inspection, axles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brake inspection" });
    }
  });

  app.post("/api/work-orders/:workOrderId/brake-inspections", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const workOrderId = parseInt(req.params.workOrderId);
      const wo = await storage.getWorkOrder(workOrderId);
      if (!wo) {
        return res.status(404).json({ error: "Work order not found" });
      }
      if (orgId && wo.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!wo.assetId) {
        return res.status(400).json({ error: "Work order has no linked asset" });
      }
      const { inspection, axles } = req.body;
      if (!inspection || typeof inspection !== 'object') {
        return res.status(400).json({ error: "Invalid inspection data" });
      }
      if (!Array.isArray(axles)) {
        return res.status(400).json({ error: "Axles must be an array" });
      }
      const userId = (req.user as any)?.claims?.sub;
      const inspectionData = {
        assetId: wo.assetId,
        notes: inspection.notes || null,
        passed: inspection.passed !== false,
        meterReading: inspection.meterReading || null,
        workOrderId,
        orgId: orgId || null,
        inspectorId: userId,
        inspectedAt: new Date(),
      };
      const created = await storage.createBrakeInspection(inspectionData, axles);
      const createdAxles = await storage.getBrakeInspectionAxles(created.id);
      res.status(201).json({ inspection: created, axles: createdAxles });
    } catch (error) {
      console.error("Failed to create brake inspection:", error);
      res.status(500).json({ error: "Failed to create brake inspection" });
    }
  });

  // ============================================================
  // TIRE INSPECTIONS (Work Order linked)
  // ============================================================
  app.get("/api/work-orders/:workOrderId/tire-inspections", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const workOrderId = parseInt(req.params.workOrderId);
      if (orgId) {
        const wo = await storage.getWorkOrder(workOrderId);
        if (!wo || wo.orgId !== orgId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const inspections = await storage.getTireInspections(workOrderId);
      // Include axles with each inspection for viewing
      const inspectionsWithAxles = await Promise.all(
        inspections.map(async (insp) => {
          const axles = await storage.getTireInspectionAxles(insp.id);
          return { ...insp, axles };
        })
      );
      res.json(inspectionsWithAxles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire inspections" });
    }
  });

  app.get("/api/tire-inspections/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const inspection = await storage.getTireInspection(parseInt(req.params.id));
      if (!inspection) return res.status(404).json({ error: "Inspection not found" });
      if (orgId && inspection.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const axles = await storage.getTireInspectionAxles(inspection.id);
      res.json({ inspection, axles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire inspection" });
    }
  });

  app.post("/api/work-orders/:workOrderId/tire-inspections", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const workOrderId = parseInt(req.params.workOrderId);
      const wo = await storage.getWorkOrder(workOrderId);
      if (!wo) {
        return res.status(404).json({ error: "Work order not found" });
      }
      if (orgId && wo.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!wo.assetId) {
        return res.status(400).json({ error: "Work order has no linked asset" });
      }
      const { inspection, axles } = req.body;
      if (!inspection || typeof inspection !== 'object') {
        return res.status(400).json({ error: "Invalid inspection data" });
      }
      if (!Array.isArray(axles)) {
        return res.status(400).json({ error: "Axles must be an array" });
      }
      const userId = (req.user as any)?.claims?.sub;
      const inspectionData = {
        assetId: wo.assetId,
        notes: inspection.notes || null,
        passed: inspection.passed !== false,
        meterReading: inspection.meterReading || null,
        workOrderId,
        orgId: orgId || null,
        inspectorId: userId,
        inspectedAt: new Date(),
      };
      const created = await storage.createTireInspection(inspectionData, axles);
      const createdAxles = await storage.getTireInspectionAxles(created.id);
      res.status(201).json({ inspection: created, axles: createdAxles });
    } catch (error) {
      console.error("Failed to create tire inspection:", error);
      res.status(500).json({ error: "Failed to create tire inspection" });
    }
  });

  // Public Asset Tokens (for DVIR QR codes)
  app.get("/api/assets/:assetId/dvir-token", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const orgId = getOrgId(req);
      
      // Verify asset belongs to org
      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      if (orgId && asset.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const token = await storage.getPublicAssetTokenByAsset(assetId);
      if (!token) {
        return res.json(null);
      }
      res.json(token);
    } catch (error) {
      res.status(500).json({ error: "Failed to get DVIR token" });
    }
  });

  app.post("/api/assets/:assetId/dvir-token", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const orgId = getOrgId(req);
      
      // Verify asset belongs to org
      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      if (orgId && asset.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Deactivate existing tokens for this asset
      const existingToken = await storage.getPublicAssetTokenByAsset(assetId);
      if (existingToken) {
        await storage.updatePublicAssetToken(existingToken.id, { isActive: false });
      }
      
      // Generate new token - expires in 1 year (365 days)
      const crypto = await import("crypto");
      const tokenValue = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const newToken = await storage.createPublicAssetToken({
        assetId,
        orgId: orgId || asset.orgId,
        token: tokenValue,
        expiresAt,
        isActive: true,
      });
      
      res.json(newToken);
    } catch (error) {
      console.error("Error creating DVIR token:", error);
      res.status(500).json({ error: "Failed to create DVIR token" });
    }
  });

  // Public DVIR submission (no auth required)
  app.get("/api/public/dvir/:token", async (req, res) => {
    try {
      const tokenRecord = await storage.getPublicAssetTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      // Check expiration
      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Token has expired" });
      }
      
      // Get asset info
      const asset = await storage.getAsset(tokenRecord.assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        assetType: asset.type,
        manufacturer: asset.manufacturer,
        model: asset.model,
        currentMeterReading: asset.currentMeterReading,
        meterType: asset.meterType,
      });
    } catch (error) {
      console.error("Error getting public DVIR info:", error);
      res.status(500).json({ error: "Failed to get asset info" });
    }
  });

  app.post("/api/public/dvir/:token", async (req, res) => {
    try {
      const tokenRecord = await storage.getPublicAssetTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      // Check expiration
      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Token has expired" });
      }
      
      const asset = await storage.getAsset(tokenRecord.assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      // Create DVIR
      const { inspectorName, meterReading, defects, signature, notes, status } = req.body;
      
      const dvir = await storage.createDvir({
        assetId: tokenRecord.assetId,
        orgId: tokenRecord.orgId,
        inspectorName: inspectorName || "Unknown Driver",
        inspectionDate: new Date(),
        meterReading: meterReading || asset.currentMeterReading,
        status: status || (defects?.length > 0 ? "defects_found" : "passed"),
        defects: defects || [],
        signature: signature || null,
        notes: notes || null,
        isPublicSubmission: true,
      });
      
      // Update asset meter reading if provided
      if (meterReading && meterReading !== asset.currentMeterReading) {
        await storage.updateAsset(asset.id, { currentMeterReading: meterReading });
      }
      
      res.status(201).json(dvir);
    } catch (error) {
      console.error("Error creating public DVIR:", error);
      res.status(500).json({ error: "Failed to create DVIR" });
    }
  });

  // Vendors (tenant-scoped)
  app.get("/api/vendors", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const vendors = await storage.getVendorsByOrg(orgId);
      res.json(vendors);
    } else {
      const vendors = await storage.getVendors();
      res.json(vendors);
    }
  });

  app.get("/api/vendors/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const vendor = await storage.getVendor(parseInt(req.params.id));
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    const orgId = getOrgId(req);
    if (orgId && vendor.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(vendor);
  });

  app.post("/api/vendors", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor({ ...validated, orgId });
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const vendor = await storage.getVendor(parseInt(req.params.id));
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      const orgId = getOrgId(req);
      if (orgId && vendor.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateVendor(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // Parts (tenant-scoped) - with pagination
  app.get("/api/parts", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;
    
    try {
      if (orgId) {
        const result = await storage.getPartsByOrgPaginated(orgId, { limit, offset, search });
        res.json(result);
      } else {
        const result = await storage.getPartsPaginated({ limit, offset, search });
        res.json(result);
      }
    } catch (error) {
      console.error("Error fetching parts:", error);
      res.status(500).json({ error: "Failed to fetch parts" });
    }
  });

  app.get("/api/parts/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const part = await storage.getPart(parseInt(req.params.id));
    if (!part) return res.status(404).json({ error: "Part not found" });
    const orgId = getOrgId(req);
    if (orgId && part.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(part);
  });

  app.post("/api/parts", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertPartSchema.parse(req.body);
      const part = await storage.createPart({ ...validated, orgId });
      res.status(201).json(part);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create part" });
    }
  });

  app.patch("/api/parts/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updatePart(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Part not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update part" });
    }
  });

  // Work Orders (tenant-scoped)
  app.get("/api/work-orders", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const workOrders = await storage.getWorkOrdersByOrg(orgId);
      res.json(workOrders);
    } else {
      const workOrders = await storage.getWorkOrders();
      res.json(workOrders);
    }
  });

  app.get("/api/work-orders/recent", tenantMiddleware({ required: false }), async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const orgId = getOrgId(req);
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    const workOrders = await storage.getRecentWorkOrders(limit, orgId ?? undefined, locationId);
    res.json(workOrders);
  });

  app.get("/api/work-orders/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const wo = await storage.getWorkOrder(parseInt(req.params.id));
    if (!wo) return res.status(404).json({ error: "Work order not found" });
    
    const orgId = getOrgId(req);
    if (orgId && wo.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Explicitly update actual cost and hours before returning
    // @ts-ignore
    await storage.updateWorkOrderActualCost(wo.id);
    
    // Re-fetch to get updated values
    const updatedWo = await storage.getWorkOrder(wo.id);
    res.json(updatedWo);
  });

  app.post("/api/work-orders", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const workOrderNumber = await generateWorkOrderNumber(orgId);
      
      // Auto-generate title: WO# | Asset#
      let autoTitle = workOrderNumber;
      if (req.body.assetId) {
        const asset = await storage.getAsset(parseInt(req.body.assetId));
        if (asset) {
          autoTitle = `${workOrderNumber} | ${asset.assetNumber}`;
        }
      }
      
      const validated = insertWorkOrderSchema.parse({
        ...req.body,
        workOrderNumber,
        title: req.body.title || autoTitle,
      });
      const wo = await storage.createWorkOrder({ ...validated, orgId });
      if (orgId) appEvents.broadcast("workorders", orgId);
      if (orgId) appEvents.broadcast("dashboard", orgId);
      res.status(201).json(wo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create work order" });
    }
  });

  app.patch("/api/work-orders/:id", requireAuth, async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.id);
      const existingWO = await storage.getWorkOrder(workOrderId);
      if (!existingWO) return res.status(404).json({ error: "Work order not found" });
      
      const updated = await storage.updateWorkOrder(workOrderId, req.body);
      if (!updated) return res.status(404).json({ error: "Work order not found" });
      
      // AI Feedback Loop: When a WO linked to a prediction is completed, use notes as feedback
      // Only update feedback when there's actual textual evidence to learn from
      if (updated.predictionId && updated.status === "completed" && existingWO.status !== "completed") {
        const prediction = await storage.getPrediction(updated.predictionId);
        if (prediction && !prediction.feedbackType) {
          const userId = (req.user as any)?.claims?.sub;
          // Compile feedback from WO notes and resolution
          const feedbackData: string[] = [];
          if (updated.notes) feedbackData.push(`Notes: ${updated.notes}`);
          if (updated.resolution) feedbackData.push(`Resolution: ${updated.resolution}`);
          if (updated.rootCause) feedbackData.push(`Root Cause: ${updated.rootCause}`);
          
          // Only proceed with AI learning if there's actual textual evidence
          if (feedbackData.length > 0) {
            const notesLower = (updated.notes || "").toLowerCase();
            const resolutionLower = (updated.resolution || "").toLowerCase();
            const rootCauseLower = (updated.rootCause || "").toLowerCase();
            const combinedText = `${notesLower} ${resolutionLower} ${rootCauseLower}`;
            
            // Determine feedback type based on WO outcome with keyword matching
            let feedbackType: "completed_repair" | "not_needed" | "false_positive" | null = null;
            
            // Check for false positive indicators
            if (combinedText.includes("no issue found") || combinedText.includes("false alarm") ||
                combinedText.includes("not needed") || combinedText.includes("no problem") ||
                combinedText.includes("unnecessary") || combinedText.includes("incorrect prediction")) {
              feedbackType = "false_positive";
            } 
            // Check for confirmed repair indicators
            else if (combinedText.includes("repaired") || combinedText.includes("replaced") ||
                     combinedText.includes("fixed") || combinedText.includes("issue confirmed") ||
                     combinedText.includes("problem found") || combinedText.includes("resolved") ||
                     combinedText.includes("completed") || combinedText.includes("installed")) {
              feedbackType = "completed_repair";
            }
            
            // Only update prediction if we have a confident feedback classification
            if (feedbackType) {
              await storage.updatePrediction(updated.predictionId, {
                feedbackType,
                feedbackNotes: `[AI Learning from WO ${updated.workOrderNumber}] ${feedbackData.join("; ")}`,
                feedbackAt: new Date(),
                feedbackById: userId,
              });
            }
          }
        }
      }
      
      if (updated.orgId) appEvents.broadcast("workorders", updated.orgId);
      if (updated.orgId) appEvents.broadcast("dashboard", updated.orgId);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update work order:", error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  });

  app.delete("/api/work-orders/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteWorkOrder(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete work order" });
    }
  });

  // Work Order Batch Update
  app.post("/api/work-orders/batch-update", requireAuth, async (req, res) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No work orders selected" });
      }
      
      const results = await Promise.all(
        ids.map(id => storage.updateWorkOrder(id, updates))
      );
      
      res.json({ updated: results.length, workOrders: results });
    } catch (error) {
      console.error("Error batch updating work orders:", error);
      res.status(500).json({ error: "Failed to batch update work orders" });
    }
  });

  // Work Order Signature
  app.post("/api/work-orders/:id/signature", requireAuth, async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.id);
      const { type, signature, signedBy } = req.body;
      
      const updateData: Record<string, any> = {};
      const now = new Date();
      
      if (type === "technician") {
        updateData.technicianSignature = signature;
        updateData.technicianSignedAt = now;
      } else if (type === "customer") {
        updateData.customerSignature = signature;
        updateData.customerSignedAt = now;
        updateData.customerSignedBy = signedBy || null;
      }
      
      const workOrder = await storage.updateWorkOrder(workOrderId, updateData);
      res.json(workOrder);
    } catch (error) {
      console.error("Error saving signature:", error);
      res.status(500).json({ error: "Failed to save signature" });
    }
  });

  // Labor Entries (Multi-user Time Tracking)
  app.get("/api/work-orders/:id/labor-entries", async (req, res) => {
    try {
      const entries = await storage.getLaborEntries(parseInt(req.params.id));
      res.json(entries);
    } catch (error) {
      console.error("Error fetching labor entries:", error);
      res.status(500).json({ error: "Failed to fetch labor entries" });
    }
  });

  app.get("/api/labor-entries/active", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub || user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const entries = await storage.getActiveLaborEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching active labor entries:", error);
      res.status(500).json({ error: "Failed to fetch active labor entries" });
    }
  });

  app.post("/api/labor-entries", requireAuth, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const userId = reqUser?.claims?.sub || reqUser?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user's hourly rate if available
      const user = await storage.getUser(userId);
      const hourlyRate = user?.hourlyRate || null;

      const entry = await storage.createLaborEntry({
        ...req.body,
        userId,
        hourlyRate,
        status: "running",
        startTime: new Date(),
      });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating labor entry:", error);
      res.status(500).json({ error: "Failed to create labor entry" });
    }
  });

  app.patch("/api/labor-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateLaborEntry(parseInt(req.params.id), req.body);
      if (!entry) {
        return res.status(404).json({ error: "Labor entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating labor entry:", error);
      res.status(500).json({ error: "Failed to update labor entry" });
    }
  });

  app.post("/api/labor-entries/:id/complete", requireAuth, async (req, res) => {
    try {
      const entry = await storage.completeLaborEntry(parseInt(req.params.id));
      if (!entry) {
        return res.status(404).json({ error: "Labor entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error completing labor entry:", error);
      res.status(500).json({ error: "Failed to complete labor entry" });
    }
  });

  app.delete("/api/labor-entries/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLaborEntry(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting labor entry:", error);
      res.status(500).json({ error: "Failed to delete labor entry" });
    }
  });

  // Work Order Lines
  app.get("/api/work-orders/:id/lines", async (req, res) => {
    const lines = await storage.getWorkOrderLines(parseInt(req.params.id));
    res.json(lines);
  });

  app.get("/api/work-orders/:id/deferred-lines", async (req, res) => {
    try {
      const lines = await storage.getRescheduledLinesToWorkOrder(parseInt(req.params.id));
      res.json(lines);
    } catch (error) {
      console.error("Error fetching deferred lines:", error);
      res.status(500).json({ error: "Failed to fetch deferred lines" });
    }
  });

  app.get("/api/rescheduled-lines", async (req, res) => {
    try {
      const lines = await storage.getRescheduledLines();
      res.json(lines);
    } catch (error) {
      console.error("Error fetching rescheduled lines:", error);
      res.status(500).json({ error: "Failed to fetch rescheduled lines" });
    }
  });

  app.post("/api/work-orders/:id/lines", requireAuth, async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.id);
      const nextLineNumber = await storage.getNextWorkOrderLineNumber(workOrderId);
      
      const validated = insertWorkOrderLineSchema.parse({
        ...req.body,
        workOrderId,
        lineNumber: req.body.lineNumber || nextLineNumber,
      });
      const line = await storage.createWorkOrderLine(validated);
      res.status(201).json(line);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create work order line" });
    }
  });

  app.patch("/api/work-order-lines/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateWorkOrderLine(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Work order line not found" });
      
      // Check if status changed and trigger work order status check
      if (req.body.status) {
        await checkAndUpdateWorkOrderStatus(updated.workOrderId);
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update work order line" });
    }
  });

  app.post("/api/work-order-lines/:id/request-part", requireAuth, async (req, res) => {
    try {
      const { partId, quantity } = req.body;
      if (!partId || !quantity) {
        return res.status(400).json({ error: "partId and quantity are required" });
      }
      await storage.requestPartForLine(parseInt(req.params.id), parseInt(partId), parseFloat(quantity));
      res.status(200).json({ message: "Part requested successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to request part" });
    }
  });

  app.post("/api/work-order-lines/:id/post-part", requireAuth, async (req, res) => {
    try {
      const line = await storage.getWorkOrderLine(parseInt(req.params.id));
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      
      const { partId, quantity } = req.body;
      if (!partId || !quantity) {
        return res.status(400).json({ error: "partId and quantity are required" });
      }
      
      await storage.consumePartFromInventory(parseInt(partId), parseFloat(quantity), line.workOrderId, line.id);
      res.status(200).json({ message: "Part posted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to post part" });
    }
  });

  app.delete("/api/work-order-lines/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteWorkOrderLine(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete work order line" });
    }
  });

  app.get("/api/work-order-lines/:id/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getLineTransactions(parseInt(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get line transactions" });
    }
  });

  app.post("/api/work-order-lines/:id/add-item", requireAuth, async (req, res) => {
    try {
      const { description, quantity, unitCost, partId } = req.body;
      if (!description || !quantity || unitCost === undefined) {
        return res.status(400).json({ error: "description, quantity, and unitCost are required" });
      }
      await storage.addLineItem(parseInt(req.params.id), {
        description,
        quantity: parseFloat(quantity),
        unitCost: parseFloat(unitCost),
        partId: partId ? parseInt(partId) : undefined,
      });
      res.status(200).json({ message: "Item added successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to add item" });
    }
  });

  // Start/Stop timer for work order lines
  app.post("/api/work-order-lines/:id/start-timer", requireAuth, async (req, res) => {
    try {
      const line = await storage.getWorkOrderLine(parseInt(req.params.id));
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      
      const updated = await storage.updateWorkOrderLine(parseInt(req.params.id), {
        startTime: new Date(),
        status: "in_progress",
        technicianId: req.body.technicianId || (req.user as any)?.id,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to start timer" });
    }
  });

  app.post("/api/work-order-lines/:id/stop-timer", requireAuth, async (req, res) => {
    try {
      const line = await storage.getWorkOrderLine(parseInt(req.params.id));
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      
      let updateData: any = {};
      
      if (line.startTime) {
        const endTime = new Date();
        const startTime = new Date(line.startTime);
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const existingHours = parseFloat(line.laborHours || "0");
        
        updateData.endTime = endTime;
        updateData.laborHours = (existingHours + hoursWorked).toFixed(2);
        updateData.startTime = null;
      }

      if (req.body.complete) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else {
        updateData.status = "pending";
      }
      
      const updated = await storage.updateWorkOrderLine(parseInt(req.params.id), updateData);

      if (updated) {
        // @ts-ignore - explicitly call updateWorkOrderActualCost to ensure totals are updated
        await storage.updateWorkOrderActualCost(updated.workOrderId);
        // Check if all lines are completed/rescheduled and update work order status
        await checkAndUpdateWorkOrderStatus(updated.workOrderId);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to stop timer" });
    }
  });

  app.post("/api/work-order-lines/:id/pause-timer", requireAuth, async (req, res) => {
    try {
      const line = await storage.getWorkOrderLine(parseInt(req.params.id));
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      if (!line.startTime) return res.status(400).json({ error: "Timer not started" });
      
      const pauseTime = new Date();
      const startTime = new Date(line.startTime);
      const hoursWorked = (pauseTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const existingHours = parseFloat(line.laborHours || "0");
      
      const updated = await storage.updateWorkOrderLine(parseInt(req.params.id), {
        startTime: null,
        laborHours: (existingHours + hoursWorked).toFixed(2),
        status: "paused",
      });
      
      if (updated) {
        // @ts-ignore
        await storage.updateWorkOrderActualCost(updated.workOrderId);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to pause timer" });
    }
  });

  // Reschedule a work order line
  app.post("/api/work-order-lines/:id/reschedule", requireAuth, async (req, res) => {
    try {
      const line = await storage.getWorkOrderLine(parseInt(req.params.id));
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      
      // If timer is running, stop it first and accumulate hours
      let updateData: any = {
        status: "rescheduled",
        rescheduledTo: req.body.newWorkOrderId || null,
      };
      
      if (line.startTime) {
        const now = new Date();
        const startTime = new Date(line.startTime);
        const hoursWorked = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const existingHours = parseFloat(line.laborHours || "0");
        updateData.laborHours = (existingHours + hoursWorked).toFixed(2);
        updateData.startTime = null;
      }
      
      const updated = await storage.updateWorkOrderLine(parseInt(req.params.id), updateData);
      
      if (updated) {
        // @ts-ignore
        await storage.updateWorkOrderActualCost(updated.workOrderId);
        await checkAndUpdateWorkOrderStatus(updated.workOrderId);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to reschedule line" });
    }
  });

  // Work Order Checklists
  app.get("/api/work-orders/:workOrderId/checklists", async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.workOrderId);
      const checklists = await storage.getWorkOrderChecklists(workOrderId);
      
      // Fetch items for each checklist
      const checklistsWithItems = await Promise.all(
        checklists.map(async (checklist) => {
          const items = await storage.getWorkOrderChecklistItems(checklist.id);
          return { ...checklist, items };
        })
      );
      
      res.json(checklistsWithItems);
    } catch (error) {
      console.error("Error fetching work order checklists:", error);
      res.status(500).json({ error: "Failed to fetch checklists" });
    }
  });

  app.post("/api/work-orders/:workOrderId/checklists", requireAuth, async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.workOrderId);
      const { templateId, workOrderLineId } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: "templateId is required" });
      }
      
      const checklist = await storage.createWorkOrderChecklist(
        workOrderId,
        parseInt(templateId),
        workOrderLineId ? parseInt(workOrderLineId) : undefined
      );
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Error creating work order checklist:", error);
      res.status(500).json({ error: "Failed to create checklist" });
    }
  });

  app.get("/api/work-orders/:workOrderId/checklists/:checklistId", async (req, res) => {
    try {
      const checklistId = parseInt(req.params.checklistId);
      const checklist = await storage.getWorkOrderChecklist(checklistId);
      
      if (!checklist) {
        return res.status(404).json({ error: "Checklist not found" });
      }
      
      const items = await storage.getWorkOrderChecklistItems(checklistId);
      res.json({ ...checklist, items });
    } catch (error) {
      console.error("Error fetching work order checklist:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  app.patch("/api/work-order-checklist-items/:itemId", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { status, notes } = req.body;
      const userId = (req.user as any)?.claims?.sub;
      
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }
      
      const validStatuses = ["pending", "pass", "needs_repair", "na"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      
      const updated = await storage.updateChecklistItemStatus(itemId, status, notes, userId);
      if (!updated) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  app.post("/api/work-order-checklist-items/:itemId/suggest-vmrs", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { suggestVmrsWithAI } = await import("./services/vmrsSuggestionService");
      
      const item = await storage.getWorkOrderChecklistItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      
      const orgId = getOrgId(req);
      const result = await suggestVmrsWithAI(item.itemText, item.notes || undefined, orgId || undefined);
      res.json(result);
    } catch (error) {
      console.error("Error suggesting VMRS for checklist item:", error);
      res.status(500).json({ error: "Failed to suggest VMRS code" });
    }
  });

  app.post("/api/work-order-checklist-items/:itemId/create-line", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { workOrderId, vmrsCode, vmrsTitle } = req.body;
      
      if (!workOrderId) {
        return res.status(400).json({ error: "workOrderId is required" });
      }
      
      const line = await storage.createWorkOrderLineFromChecklistItem(
        itemId, 
        parseInt(workOrderId),
        vmrsCode || undefined,
        vmrsTitle || undefined
      );
      res.status(201).json(line);
    } catch (error) {
      console.error("Error creating work order line from checklist item:", error);
      res.status(500).json({ error: "Failed to create work order line" });
    }
  });

  app.get("/api/predictions", async (_req, res) => {
    const results = await storage.getPredictions();
    res.json(results);
  });

  app.patch("/api/predictions/:id/acknowledge", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.acknowledgePrediction(id);
    res.json({ success: true });
  });

  app.patch("/api/predictions/:id/dismiss", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.dismissPrediction(id);
    res.json({ success: true });
  });

  // PM Schedules (tenant-scoped)
  app.get("/api/pm-schedules", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const schedules = await storage.getPmSchedulesByOrg(orgId);
      res.json(schedules);
    } else {
      const schedules = await storage.getPmSchedules();
      res.json(schedules);
    }
  });

  app.get("/api/pm-schedules/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const schedule = await storage.getPmSchedule(parseInt(req.params.id));
    if (!schedule) return res.status(404).json({ error: "PM schedule not found" });
    const orgId = getOrgId(req);
    if (orgId && schedule.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(schedule);
  });

  app.post("/api/pm-schedules", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      // Convert empty strings to null for numeric fields
      const body = { ...req.body };
      if (body.estimatedHours === "") body.estimatedHours = null;
      if (body.estimatedCost === "") body.estimatedCost = null;
      const validated = insertPmScheduleSchema.parse(body);
      const schedule = await storage.createPmSchedule({ ...validated, orgId });
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("PM schedule creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create PM schedule", details: error?.message });
    }
  });

  app.patch("/api/pm-schedules/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const schedule = await storage.getPmSchedule(parseInt(req.params.id));
      if (!schedule) return res.status(404).json({ error: "PM schedule not found" });
      const orgId = getOrgId(req);
      if (orgId && schedule.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Convert empty strings to null for numeric fields
      const body = { ...req.body };
      if (body.estimatedHours === "") body.estimatedHours = null;
      if (body.estimatedCost === "") body.estimatedCost = null;
      const partialSchema = insertPmScheduleSchema.partial();
      const validated = partialSchema.parse(body);
      const updated = await storage.updatePmSchedule(parseInt(req.params.id), validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update PM schedule" });
    }
  });

  // Requisitions (tenant-scoped)
  app.get("/api/requisitions", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const requisitions = await storage.getRequisitionsByOrg(orgId);
      res.json(requisitions);
    } else {
      const requisitions = await storage.getRequisitions();
      res.json(requisitions);
    }
  });

  app.get("/api/requisitions/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const req_ = await storage.getRequisition(parseInt(req.params.id));
    if (!req_) return res.status(404).json({ error: "Requisition not found" });
    const orgId = getOrgId(req);
    if (orgId && req_.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(req_);
  });

  app.post("/api/requisitions", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const requisitionNumber = await generateRequisitionNumber(orgId);
      const validated = insertPurchaseRequisitionSchema.parse({
        ...req.body,
        requisitionNumber,
      });
      const requisition = await storage.createRequisition({
        ...validated,
        orgId,
        requestedById: (req.user as any)?.id || null,
      });
      
      // Create notification for new requisition (simulates email notification)
      const userId = (req.user as any)?.id;
      if (userId) {
        try {
          await storage.createNotification({
            orgId,
            userId,
            type: "requisition_created",
            title: "New Requisition Created",
            message: `Requisition ${requisitionNumber} has been submitted for review: ${validated.title}`,
            priority: "normal",
            entityType: "requisition",
            entityId: requisition.id,
          });
          console.log(`[Email Notification] New requisition ${requisitionNumber} created - notification sent`);
        } catch (notifError) {
          console.log("Failed to create requisition notification:", notifError);
        }
      }
      
      res.status(201).json(requisition);
    } catch (error) {
      console.error("Requisition creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create requisition" });
    }
  });

  app.patch("/api/requisitions/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const req_ = await storage.getRequisition(id);
      if (!req_) return res.status(404).json({ error: "Requisition not found" });
      const orgId = getOrgId(req);
      if (orgId && req_.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = { ...req.body };
      if (data.approvedAt && typeof data.approvedAt === 'string') {
        data.approvedAt = new Date(data.approvedAt);
      }

      const previousStatus = req_.status;
      console.log("Updating requisition status to:", data.status);
      const updated = await storage.updateRequisition(id, data);
      
      // Create notification for status changes (simulates email notification)
      if (data.status && data.status !== previousStatus) {
        try {
          let notifType = "requisition_updated";
          let notifTitle = "Requisition Updated";
          let notifMessage = `Requisition ${req_.requisitionNumber} status changed to ${data.status}`;
          let priority: "normal" | "high" | "low" = "normal";
          
          if (data.status === "approved") {
            notifType = "requisition_approved";
            notifTitle = "Requisition Approved";
            notifMessage = `Requisition ${req_.requisitionNumber} has been approved and is ready for ordering`;
            priority = "high";
          } else if (data.status === "rejected") {
            notifType = "requisition_rejected";
            notifTitle = "Requisition Rejected";
            notifMessage = `Requisition ${req_.requisitionNumber} has been rejected`;
            priority = "high";
          }
          
          const notifyUserId = req_.requestedById || (req.user as any)?.id;
          if (notifyUserId) {
            await storage.createNotification({
              orgId: req_.orgId,
              userId: notifyUserId,
              type: notifType,
              title: notifTitle,
              message: notifMessage,
              priority,
              entityType: "requisition",
              entityId: id,
            });
          }
          console.log(`[Email Notification] Requisition ${req_.requisitionNumber} ${data.status} - notification sent`);
        } catch (notifError) {
          console.log("Failed to create requisition update notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update requisition error:", error);
      res.status(500).json({ error: "Failed to update requisition" });
    }
  });

  app.post("/api/requisitions/:id/convert", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requisition = await storage.getRequisition(id);
      if (!requisition) return res.status(404).json({ error: "Requisition not found" });
      if (requisition.status !== "approved") {
        return res.status(400).json({ error: "Only approved requisitions can be converted" });
      }

      const lines = await storage.getRequisitionLines(id);
      if (lines.length === 0) {
        return res.status(400).json({ error: "Requisition has no lines" });
      }

      const poNumber = await generatePONumber(orgId);
      const po = await storage.createPurchaseOrder({
        poNumber,
        requisitionId: id,
        vendorId: requisition.vendorId!,
        title: requisition.title,
        description: requisition.description,
        totalAmount: requisition.totalAmount,
        status: "draft",
        createdById: (req.user as any)?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const line of lines) {
        await storage.createPurchaseOrderLine({
          poId: po.id,
          partId: line.partId,
          description: line.description,
          quantityOrdered: line.quantity,
          unitCost: line.unitCost,
          totalCost: line.totalCost,
        });
      }

      await storage.updateRequisition(id, { status: "converted" });
      
      // Ensure the client knows this is a PO with the correct properties
      res.status(201).json({
        ...po,
        id: po.id,
        poNumber: po.poNumber
      });
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ error: "Failed to convert requisition to PO" });
    }
  });

  // Requisition Lines
  app.get("/api/requisitions/:id/lines", async (req, res) => {
    const lines = await storage.getRequisitionLines(parseInt(req.params.id));
    res.json(lines);
  });

  app.post("/api/requisitions/:id/lines", requireAuth, async (req, res) => {
    try {
      const validated = insertPurchaseRequisitionLineSchema.parse({
        ...req.body,
        requisitionId: parseInt(req.params.id),
      });
      const line = await storage.createRequisitionLine(validated);
      res.status(201).json(line);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create requisition line" });
    }
  });

  app.patch("/api/requisition-lines/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateRequisitionLine(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Requisition line not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update requisition line" });
    }
  });

  app.delete("/api/requisition-lines/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteRequisitionLine(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete requisition line" });
    }
  });

  // Purchase Orders (tenant-scoped)
  app.get("/api/purchase-orders", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const orders = await storage.getPurchaseOrdersByOrg(orgId);
      res.json(orders);
    } else {
      const orders = await storage.getPurchaseOrders();
      res.json(orders);
    }
  });

  app.get("/api/purchase-orders/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const po = await storage.getPurchaseOrder(parseInt(req.params.id));
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    const orgId = getOrgId(req);
    if (orgId && po.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(po);
  });

  app.post("/api/purchase-orders", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const poNumber = await generatePONumber(orgId);
      const data = { ...req.body };
      
      // Ensure vendorId is a number
      if (data.vendorId && typeof data.vendorId === 'string') {
        data.vendorId = parseInt(data.vendorId);
      }
      
      // Parse dates if they are strings
      if (data.expectedDeliveryDate && typeof data.expectedDeliveryDate === 'string' && data.expectedDeliveryDate.trim()) {
        data.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
      } else {
        delete data.expectedDeliveryDate;
      }

      if (data.orderDate && typeof data.orderDate === 'string' && data.orderDate.trim()) {
        data.orderDate = new Date(data.orderDate);
      } else {
        delete data.orderDate;
      }

      // Ensure numeric fields are numbers or null, never empty strings
      if (data.totalAmount === "") {
        data.totalAmount = null;
      }
      if (data.shippingCost === "") {
        data.shippingCost = null;
      }

      const validated = insertPurchaseOrderSchema.parse({
        ...data,
        poNumber,
      });
      const po = await storage.createPurchaseOrder({
        ...validated,
        orgId,
        createdById: (req.user as any)?.id || null,
      });
      res.status(201).json(po);
    } catch (error) {
      console.error("PO creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  app.patch("/api/purchase-orders/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(parseInt(req.params.id));
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      const orgId = getOrgId(req);
      if (orgId && po.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const data = { ...req.body };
      if (data.vendorId && typeof data.vendorId === 'string') {
        data.vendorId = parseInt(data.vendorId);
      }
      if (data.orderDate && typeof data.orderDate === 'string' && data.orderDate.trim()) {
        data.orderDate = new Date(data.orderDate);
      } else if (data.orderDate === "") {
        data.orderDate = null;
      }
      if (data.expectedDeliveryDate && typeof data.expectedDeliveryDate === 'string' && data.expectedDeliveryDate.trim()) {
        data.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
      } else if (data.expectedDeliveryDate === "") {
        data.expectedDeliveryDate = null;
      }
      if (data.receivedDate && typeof data.receivedDate === 'string' && data.receivedDate.trim()) {
        data.receivedDate = new Date(data.receivedDate);
      } else if (data.receivedDate === "") {
        data.receivedDate = null;
      }
      
      const updated = await storage.updatePurchaseOrder(parseInt(req.params.id), data);
      res.json(updated);
    } catch (error) {
      console.error("Update PO error:", error);
      res.status(500).json({ error: "Failed to update purchase order" });
    }
  });

  // Purchase Order Lines
  app.get("/api/purchase-orders/:id/lines", async (req, res) => {
    const lines = await storage.getPurchaseOrderLines(parseInt(req.params.id));
    res.json(lines);
  });

  app.post("/api/purchase-orders/:id/lines", requireAuth, async (req, res) => {
    try {
      const poId = parseInt(req.params.id);
      const validated = insertPurchaseOrderLineSchema.parse({
        ...req.body,
        poId,
      });
      const line = await storage.createPurchaseOrderLine(validated);

      // Recalculate PO total
      const lines = await storage.getPurchaseOrderLines(poId);
      const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.totalCost || "0")), 0).toString();
      await storage.updatePurchaseOrder(poId, { totalAmount });

      res.status(201).json(line);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create PO line" });
    }
  });

  app.patch("/api/po-lines/:id", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const updated = await storage.updatePurchaseOrderLine(lineId, req.body);
      if (!updated) return res.status(404).json({ error: "PO line not found" });

      // Recalculate PO total
      const lines = await storage.getPurchaseOrderLines(updated.poId);
      const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.totalCost || "0")), 0).toString();
      await storage.updatePurchaseOrder(updated.poId, { totalAmount });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update PO line" });
    }
  });

  app.delete("/api/po-lines/:id", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const line = await storage.getPurchaseOrderLine(lineId);
      if (!line) return res.status(404).json({ error: "PO line not found" });

      await storage.deletePurchaseOrderLine(lineId);

      // Recalculate PO total
      const lines = await storage.getPurchaseOrderLines(line.poId);
      const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.totalCost || "0")), 0).toString();
      await storage.updatePurchaseOrder(line.poId, { totalAmount });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete PO line" });
    }
  });

  // Receive PO Line - updates line quantity received and increments part inventory
  app.post("/api/po-lines/:id/receive", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      
      // Validate input with Zod schema
      const receiveSchema = z.object({
        quantityReceived: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: "Quantity must be a positive number"
        }),
        notes: z.string().optional(),
        discrepancyType: z.enum(["none", "damaged", "wrong_item", "over", "under"]).optional(),
        discrepancyNotes: z.string().optional(),
      });
      
      const validatedInput = receiveSchema.safeParse(req.body);
      if (!validatedInput.success) {
        return res.status(400).json({ error: validatedInput.error.errors[0]?.message || "Invalid input" });
      }
      
      const { quantityReceived, notes, discrepancyType, discrepancyNotes } = validatedInput.data;
      const qtyToReceive = parseFloat(quantityReceived);

      // Get the line
      const line = await storage.getPurchaseOrderLine(lineId);
      if (!line) {
        return res.status(404).json({ error: "PO line not found" });
      }

      // Calculate new received quantity
      const currentReceived = parseFloat(line.quantityReceived || "0");
      const newReceived = currentReceived + qtyToReceive;
      const ordered = parseFloat(line.quantityOrdered);

      if (newReceived > ordered) {
        return res.status(400).json({ error: `Cannot receive more than ordered. Remaining: ${(ordered - currentReceived).toFixed(2)}` });
      }

      // Update the line with new received quantity
      const updatedLine = await storage.updatePurchaseOrderLine(lineId, {
        quantityReceived: newReceived.toString(),
      });

      // If line has a partId, increment the part's inventory
      if (line.partId) {
        const part = await storage.getPart(line.partId);
        if (part) {
          const currentQty = parseFloat(part.quantityOnHand || "0");
          const newQty = currentQty + qtyToReceive;
          await storage.updatePart(line.partId, {
            quantityOnHand: newQty.toString(),
          });
        }
      }

      // Re-fetch all lines after update to calculate PO status correctly
      const allLines = await storage.getPurchaseOrderLines(line.poId);
      let totalOrdered = 0;
      let totalReceived = 0;
      for (const l of allLines) {
        totalOrdered += parseFloat(l.quantityOrdered);
        totalReceived += parseFloat(l.quantityReceived || "0");
      }

      // Update PO status based on receipt progress
      let newStatus: string | undefined;
      if (totalReceived >= totalOrdered) {
        newStatus = "received";
      } else if (totalReceived > 0) {
        newStatus = "partial";
      }

      if (newStatus) {
        const updateData: any = { status: newStatus };
        if (newStatus === "received") {
          updateData.receivedDate = new Date();
        }
        await storage.updatePurchaseOrder(line.poId, updateData);
      }

      // Create receiving transaction for audit trail
      const user = (req as any).user;
      await storage.createReceivingTransaction({
        poId: line.poId,
        poLineId: lineId,
        partId: line.partId || undefined,
        quantityReceived: qtyToReceive.toString(),
        receivedById: user?.id,
        receivedByName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email,
        receivedDate: new Date(),
        notes: notes,
        discrepancyType: discrepancyType || "none",
        discrepancyNotes: discrepancyNotes,
      });

      res.json(updatedLine);
    } catch (error) {
      console.error("Receive PO line error:", error);
      res.status(500).json({ error: "Failed to receive PO line" });
    }
  });

  // Receiving Transactions
  app.get("/api/receiving-transactions", async (req, res) => {
    const poId = req.query.poId ? parseInt(req.query.poId as string) : undefined;
    const transactions = await storage.getReceivingTransactions(poId);
    res.json(transactions);
  });

  // Part Requests
  app.get("/api/part-requests", async (req, res) => {
    const status = req.query.status as string | undefined;
    const requests = await storage.getPartRequests(status);
    res.json(requests);
  });

  app.get("/api/part-requests/:id", async (req, res) => {
    const request = await storage.getPartRequest(parseInt(req.params.id));
    if (!request) return res.status(404).json({ error: "Part request not found" });
    res.json(request);
  });

  app.post("/api/part-requests", requireAuth, async (req, res) => {
    try {
      const requestNumber = await storage.getNextPartRequestNumber();
      const user = (req as any).user;
      const validated = insertPartRequestSchema.parse({
        ...req.body,
        requestNumber,
        requestedById: user?.id,
        requestedByName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email,
      });
      const request = await storage.createPartRequest(validated);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create part request error:", error);
      res.status(500).json({ error: "Failed to create part request" });
    }
  });

  app.patch("/api/part-requests/:id", requireAuth, async (req, res) => {
    try {
      // Validate partial update with allowed fields (using coercion for flexible input types)
      const updateSchema = z.object({
        status: z.enum(["pending", "approved", "ordered", "received", "fulfilled", "cancelled"]).optional(),
        notes: z.string().optional().nullable(),
        quantityFulfilled: z.string().optional(),
        fulfilledDate: z.coerce.date().optional(),
        fulfilledById: z.string().optional(),
        fulfilledByName: z.string().optional(),
        poId: z.coerce.number().optional(),
      });
      const validatedData = updateSchema.parse(req.body);
      const updated = await storage.updatePartRequest(parseInt(req.params.id), validatedData);
      if (!updated) return res.status(404).json({ error: "Part request not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update part request error:", error);
      res.status(500).json({ error: "Failed to update part request" });
    }
  });

  // Notifications (tenant-scoped)
  app.get("/api/notifications", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      if (orgId) {
        const notificationsList = await storage.getNotificationsByOrg(orgId, userId);
        res.json(notificationsList);
      } else {
        const notificationsList = await storage.getNotifications(userId);
        res.json(notificationsList);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const orgId = getOrgId(req);
      // Use org-scoped count if org is selected, otherwise fall back to user-level count
      const count = orgId 
        ? await storage.getUnreadNotificationCountByOrg(userId, orgId)
        : await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      
      // Validate with schema and force userId from authenticated user
      const validated = insertNotificationSchema.parse({
        ...req.body,
        userId, // Override any userId in body with authenticated user
      });
      
      const notification = await storage.createNotification({ ...validated, orgId });
      if (orgId) appEvents.broadcast("notifications", orgId);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      
      // Validate notification belongs to user's org
      const notification = await storage.getNotification(parseInt(req.params.id));
      if (!notification) return res.status(404).json({ error: "Notification not found" });
      if (orgId && notification.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.markNotificationRead(parseInt(req.params.id), userId);
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      const count = orgId 
        ? await storage.markAllNotificationsReadByOrg(userId, orgId)
        : await storage.markAllNotificationsRead(userId);
      res.json({ updated: count });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      
      // Validate notification belongs to user's org
      const notification = await storage.getNotification(parseInt(req.params.id));
      if (!notification) return res.status(404).json({ error: "Notification not found" });
      if (orgId && notification.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.dismissNotification(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing notification:", error);
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  // Manuals (tenant-scoped)
  app.get("/api/manuals", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const manuals = await storage.getManualsByOrg(orgId);
      res.json(manuals);
    } else {
      const manuals = await storage.getManuals();
      res.json(manuals);
    }
  });

  app.get("/api/manuals/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const manual = await storage.getManual(parseInt(req.params.id));
    if (!manual) return res.status(404).json({ error: "Manual not found" });
    const orgId = getOrgId(req);
    if (orgId && manual.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(manual);
  });

  app.post("/api/manuals", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertManualSchema.parse(req.body);
      const manual = await storage.createManual({ ...validated, orgId });
      res.status(201).json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create manual" });
    }
  });

  app.patch("/api/manuals/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const manual = await storage.getManual(parseInt(req.params.id));
      if (!manual) return res.status(404).json({ error: "Manual not found" });
      const orgId = getOrgId(req);
      if (orgId && manual.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateManual(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update manual" });
    }
  });

  // DVIRs (tenant-scoped)
  app.get("/api/dvirs", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    let dvirList;
    if (orgId) {
      dvirList = await storage.getDvirsByOrg(orgId);
    } else {
      dvirList = await storage.getDvirs();
    }
    // Enrich with asset info including location
    const enrichedDvirs = await Promise.all(dvirList.map(async (dvir) => {
      const asset = await storage.getAsset(dvir.assetId);
      return {
        ...dvir,
        assetName: asset?.name,
        assetNumber: asset?.assetNumber,
        assetLocationId: asset?.locationId,
      };
    }));
    res.json(enrichedDvirs);
  });

  app.get("/api/dvirs/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const dvir = await storage.getDvir(parseInt(req.params.id));
    if (!dvir) return res.status(404).json({ error: "DVIR not found" });
    const orgId = getOrgId(req);
    if (orgId && dvir.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(dvir);
  });

  app.post("/api/dvirs", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertDvirSchema.parse(req.body);
      const dvir = await storage.createDvir({ ...validated, orgId });
      res.status(201).json(dvir);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create DVIR" });
    }
  });

  // DVIR Defects
  app.get("/api/dvirs/:id/defects", async (req, res) => {
    const defects = await storage.getDvirDefects(parseInt(req.params.id));
    res.json(defects);
  });

  app.post("/api/dvirs/:id/defects", requireAuth, async (req, res) => {
    try {
      const validated = insertDvirDefectSchema.parse({
        ...req.body,
        dvirId: parseInt(req.params.id),
      });
      const defect = await storage.createDvirDefect(validated);
      res.status(201).json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create DVIR defect" });
    }
  });

  // Tires (tenant-scoped)
  app.get("/api/tires", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const tireList = orgId ? await storage.getTiresByOrg(orgId) : await storage.getTires();
      res.json(tireList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tires" });
    }
  });

  app.get("/api/tires/:id", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const tire = await storage.getTire(parseInt(req.params.id));
      if (!tire) return res.status(404).json({ error: "Tire not found" });
      const orgId = getOrgId(req);
      if (orgId && tire.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(tire);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire" });
    }
  });

  app.post("/api/tires", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertTireSchema.parse(req.body);
      const tire = await storage.createTire({ ...validated, orgId });
      res.status(201).json(tire);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create tire" });
    }
  });

  app.patch("/api/tires/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const existing = await storage.getTire(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ error: "Tire not found" });
      if (orgId && existing.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateTire(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tire" });
    }
  });

  app.delete("/api/tires/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const existing = await storage.getTire(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ error: "Tire not found" });
      if (orgId && existing.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteTire(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tire" });
    }
  });

  app.get("/api/tires/health/stats", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const stats = await storage.getTireHealthStats(orgId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire health stats" });
    }
  });

  // Conversations & Messages (tenant-scoped - requires org context)
  app.get("/api/conversations", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const convList = await storage.getConversationsByOrg(orgId);
      res.json(convList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { participantIds, ...conversationData } = req.body;
      const validated = insertConversationSchema.parse({ ...conversationData, createdBy: userId });
      const conv = await storage.createConversation({ ...validated, orgId });
      
      // Add the creator as a participant
      await storage.addConversationParticipant(conv.id, userId);
      
      // Add other participants if provided
      if (participantIds && Array.isArray(participantIds)) {
        for (const participantId of participantIds) {
          if (participantId !== userId) {
            await storage.addConversationParticipant(conv.id, participantId);
          }
        }
      }
      
      res.status(201).json(conv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const conversationId = parseInt(req.params.id);
      const conv = await storage.getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const msgList = await storage.getMessagesByConversation(conversationId);
      res.json(msgList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const conversationId = parseInt(req.params.id);
      const conv = await storage.getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validated = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: userId,
      });
      const msg = await storage.createMessage(validated);
      res.status(201).json(msg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // SMART Classification System (tenant-scoped)
  app.get("/api/classification/runs", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const runs = await storage.getClassificationRuns(orgId);
      res.json(runs);
    } catch (error) {
      console.error("Failed to fetch classification runs:", error);
      res.status(500).json({ error: "Failed to fetch classification runs" });
    }
  });

  app.get("/api/classification/runs/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const run = await storage.getClassificationRun(parseInt(req.params.id));
      if (!run) return res.status(404).json({ error: "Run not found" });
      if (run.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      res.json(run);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classification run" });
    }
  });

  app.post("/api/classification/run", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const { runClassification } = await import("./services/classificationService");
      const rawWindowMonths = req.body.windowMonths;
      const windowMonths = typeof rawWindowMonths === "number" && rawWindowMonths >= 1 && rawWindowMonths <= 60 
        ? rawWindowMonths 
        : 12;
      const result = await runClassification(orgId, windowMonths);
      
      res.json({ 
        success: true, 
        runId: result.runId,
        partsProcessed: result.results.length,
        classBreakdown: {
          S: result.results.filter(r => r.smartClass === "S").length,
          A: result.results.filter(r => r.smartClass === "A").length,
          B: result.results.filter(r => r.smartClass === "B").length,
          C: result.results.filter(r => r.smartClass === "C").length,
        }
      });
    } catch (error) {
      console.error("Failed to run classification:", error);
      res.status(500).json({ error: "Failed to run classification" });
    }
  });

  app.get("/api/classification/runs/:runId/snapshots", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const run = await storage.getClassificationRun(parseInt(req.params.runId));
      if (!run) return res.status(404).json({ error: "Run not found" });
      if (run.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      
      const snapshots = await storage.getPartClassificationSnapshots(parseInt(req.params.runId));
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.get("/api/parts/:id/classification", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const partId = parseInt(req.params.id);
      const part = await storage.getPart(partId);
      if (!part) return res.status(404).json({ error: "Part not found" });
      if (part.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      
      const latestSnapshot = await storage.getLatestPartClassificationSnapshot(partId);
      const auditLog = await storage.getClassificationAuditLog(orgId, partId);
      
      res.json({
        currentClass: part.smartClass,
        currentXyz: part.xyzClass,
        priorityScore: part.priorityScore,
        lastClassifiedAt: part.lastClassifiedAt,
        isLocked: part.classificationLocked,
        safetySystem: part.safetySystem,
        failureSeverity: part.failureSeverity,
        complianceOverride: part.complianceOverride,
        traceabilityRequired: part.traceabilityRequired,
        leadTimeDays: part.leadTimeDays,
        latestSnapshot,
        recentAuditLog: auditLog.slice(0, 10),
      });
    } catch (error) {
      console.error("Failed to get part classification:", error);
      res.status(500).json({ error: "Failed to get part classification" });
    }
  });

  app.post("/api/parts/:id/classification/override", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req.user as any)?.claims?.sub;
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const partId = parseInt(req.params.id);
      const { newClass, newXyz, reason } = req.body;
      
      if (!["S", "A", "B", "C"].includes(newClass)) {
        return res.status(400).json({ error: "Invalid class. Must be S, A, B, or C" });
      }
      
      const { overridePartClassification } = await import("./services/classificationService");
      await overridePartClassification(partId, newClass, newXyz, reason || "Manual override", userId, orgId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to override classification:", error);
      res.status(500).json({ error: "Failed to override classification" });
    }
  });

  app.post("/api/parts/:id/classification/unlock", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req.user as any)?.claims?.sub;
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { unlockPartClassification } = await import("./services/classificationService");
      await unlockPartClassification(parseInt(req.params.id), userId, orgId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unlock classification:", error);
      res.status(500).json({ error: "Failed to unlock classification" });
    }
  });

  app.get("/api/classification/audit", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const partId = req.query.partId ? parseInt(req.query.partId as string) : undefined;
      const auditLog = await storage.getClassificationAuditLog(orgId, partId);
      res.json(auditLog);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  app.patch("/api/parts/:id/safety-settings", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const partId = parseInt(req.params.id);
      const part = await storage.getPart(partId);
      if (!part) return res.status(404).json({ error: "Part not found" });
      if (part.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      
      const { safetySystem, failureSeverity, complianceOverride, traceabilityRequired, substituteAllowed, leadTimeDays } = req.body;
      
      const updateData: any = {};
      if (safetySystem !== undefined) updateData.safetySystem = safetySystem;
      if (failureSeverity !== undefined) updateData.failureSeverity = failureSeverity;
      if (complianceOverride !== undefined) updateData.complianceOverride = complianceOverride;
      if (traceabilityRequired !== undefined) updateData.traceabilityRequired = traceabilityRequired;
      if (substituteAllowed !== undefined) updateData.substituteAllowed = substituteAllowed;
      if (leadTimeDays !== undefined) updateData.leadTimeDays = leadTimeDays;
      
      const updated = await storage.updatePart(partId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update safety settings:", error);
      res.status(500).json({ error: "Failed to update safety settings" });
    }
  });

  // Events (Road Calls, Breakdowns, etc.) - tenant-scoped
  app.get("/api/events", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const evts = await storage.getEventsByOrg(orgId);
      res.json(evts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      
      const { insertEventSchema } = await import("@shared/schema");
      const validated = insertEventSchema.parse({ ...req.body, orgId });
      const event = await storage.createEvent(validated);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/events/:id/parts", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      
      const eventParts = await storage.getEventParts(parseInt(req.params.id));
      res.json(eventParts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event parts" });
    }
  });

  app.post("/api/events/:id/parts", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.orgId !== orgId) return res.status(403).json({ error: "Access denied" });
      
      const { insertEventPartSchema } = await import("@shared/schema");
      const validated = insertEventPartSchema.parse({ ...req.body, eventId: parseInt(req.params.id) });
      const eventPart = await storage.createEventPart(validated);
      res.status(201).json(eventPart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to link part to event" });
    }
  });

  // Saved Reports (tenant-scoped)
  app.get("/api/saved-reports", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const reports = orgId ? await storage.getSavedReportsByOrg(orgId) : await storage.getSavedReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved reports" });
    }
  });

  app.post("/api/saved-reports", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validated = insertSavedReportSchema.parse({ ...req.body, createdBy: userId });
      const report = await storage.createSavedReport({ ...validated, orgId });
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create saved report" });
    }
  });

  app.delete("/api/saved-reports/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const existing = await storage.getSavedReport(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ error: "Report not found" });
      if (orgId && existing.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteSavedReport(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved report" });
    }
  });

  // GPS Locations (tenant-scoped)
  app.get("/api/gps-locations", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;
      const locations = orgId 
        ? await storage.getGpsLocationsByOrg(orgId, assetId) 
        : await storage.getGpsLocations(assetId);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GPS locations" });
    }
  });

  app.post("/api/gps-locations", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const validated = insertGpsLocationSchema.parse(req.body);
      const location = await storage.createGpsLocation({ ...validated, orgId });
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create GPS location" });
    }
  });

  app.get("/api/assets/:id/gps-locations", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const assetId = parseInt(req.params.id);
      const asset = await storage.getAsset(assetId);
      if (asset && orgId && asset.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const locations = await storage.getGpsLocationsByAsset(assetId);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset GPS locations" });
    }
  });

  // Feedback (tenant-scoped)
  app.get("/api/feedback", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const feedbackList = await storage.getFeedbackByOrg(orgId);
      res.json(feedbackList);
    } else {
      const feedbackList = await storage.getFeedback();
      res.json(feedbackList);
    }
  });

  app.get("/api/feedback/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const item = await storage.getFeedbackItem(parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    const orgId = getOrgId(req);
    if (orgId && item.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(item);
  });

  app.post("/api/feedback", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req.user as any)?.id;
      const validated = insertFeedbackSchema.parse({
        ...req.body,
        userId,
      });
      const item = await storage.createFeedback({ ...validated, orgId });
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });

  app.post("/api/feedback/:id/vote", requireAuth, async (req, res) => {
    try {
      const updated = await storage.voteFeedback(parseInt(req.params.id));
      if (!updated) return res.status(404).json({ error: "Feedback not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  // Predictions (tenant-scoped)
  app.get("/api/predictions", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const predictionsList = await storage.getPredictionsByOrg(orgId);
      res.json(predictionsList);
    } else {
      const predictionsList = await storage.getPredictions();
      res.json(predictionsList);
    }
  });

  app.patch("/api/predictions/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updatePrediction(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Prediction not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update prediction" });
    }
  });

  // Telematics Data
  app.get("/api/assets/:id/telematics", async (req, res) => {
    const data = await storage.getTelematicsData(parseInt(req.params.id));
    res.json(data);
  });

  app.get("/api/assets/:id/telematics/latest", async (req, res) => {
    const data = await storage.getLatestTelematicsData(parseInt(req.params.id));
    res.json(data || null);
  });

  app.post("/api/assets/:id/telematics", requireAuth, async (req, res) => {
    try {
      const validated = insertTelematicsDataSchema.parse({
        ...req.body,
        assetId: parseInt(req.params.id),
      });
      const data = await storage.createTelematicsData(validated);
      res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create telematics data" });
    }
  });

  // Fault Codes
  app.get("/api/fault-codes", async (req, res) => {
    const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;
    const faultCodes = await storage.getFaultCodes(assetId);
    res.json(faultCodes);
  });

  app.get("/api/fault-codes/active", async (req, res) => {
    const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;
    const faultCodes = await storage.getActiveFaultCodes(assetId);
    res.json(faultCodes);
  });

  app.get("/api/assets/:id/fault-codes", async (req, res) => {
    const faultCodes = await storage.getFaultCodes(parseInt(req.params.id));
    res.json(faultCodes);
  });

  app.post("/api/fault-codes", requireAuth, async (req, res) => {
    try {
      const validated = insertFaultCodeSchema.parse(req.body);
      const code = await storage.createFaultCode(validated);
      res.status(201).json(code);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create fault code" });
    }
  });

  app.patch("/api/fault-codes/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateFaultCode(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Fault code not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fault code" });
    }
  });

  // Estimates (tenant-scoped)
  app.get("/api/estimates", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const estimates = await storage.getEstimatesByOrg(orgId);
      res.json(estimates);
    } else {
      const estimates = await storage.getEstimates();
      res.json(estimates);
    }
  });

  // Unfulfilled Parts Widget - must be before :id route
  app.get("/api/estimates/unfulfilled-parts", async (req, res) => {
    const lines = await storage.getUnfulfilledEstimateLines();
    res.json(lines);
  });

  app.get("/api/estimates/:id", tenantMiddleware({ required: false }), async (req, res) => {
    const estimate = await storage.getEstimate(parseInt(req.params.id));
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });
    const orgId = getOrgId(req);
    if (orgId && estimate.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(estimate);
  });

  app.post("/api/estimates", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const createSchema = insertEstimateSchema.omit({ 
        estimateNumber: true, 
        partsTotal: true,
        laborTotal: true,
        grandTotal: true,
      });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid estimate data", details: parsed.error.errors });
      }
      const estimateNumber = await generateEstimateNumber(orgId);
      const estimate = await storage.createEstimate({
        ...parsed.data,
        orgId,
        estimateNumber,
        partsTotal: "0",
        laborTotal: "0",
        grandTotal: "0",
      });
      res.status(201).json(estimate);
    } catch (error) {
      res.status(500).json({ error: "Failed to create estimate" });
    }
  });

  app.patch("/api/estimates/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const estimate = await storage.getEstimate(parseInt(req.params.id));
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });
      const orgId = getOrgId(req);
      if (orgId && estimate.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateSchema = insertEstimateSchema.omit({ 
        estimateNumber: true,
        partsTotal: true,
        laborTotal: true,
        markupTotal: true,
        grandTotal: true,
      }).partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid estimate data", details: parsed.error.errors });
      }
      const updated = await storage.updateEstimate(parseInt(req.params.id), parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.delete("/api/estimates/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const estimate = await storage.getEstimate(parseInt(req.params.id));
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });
      const orgId = getOrgId(req);
      if (orgId && estimate.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteEstimate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });

  // Estimate Lines
  app.get("/api/estimates/:id/lines", async (req, res) => {
    const lines = await storage.getEstimateLines(parseInt(req.params.id));
    res.json(lines);
  });

  app.post("/api/estimates/:id/lines", requireAuth, async (req, res) => {
    try {
      const estimateId = parseInt(req.params.id);
      const createSchema = insertEstimateLineSchema.omit({ estimateId: true });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid line data", details: parsed.error.errors });
      }
      const line = await storage.createEstimateLine({
        ...parsed.data,
        estimateId,
      });
      await recalculateEstimateTotals(estimateId);
      res.status(201).json(line);
    } catch (error) {
      res.status(500).json({ error: "Failed to create estimate line" });
    }
  });

  app.patch("/api/estimate-lines/:id", requireAuth, async (req, res) => {
    try {
      const updateSchema = insertEstimateLineSchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid line data", details: parsed.error.errors });
      }
      const updated = await storage.updateEstimateLine(parseInt(req.params.id), parsed.data);
      if (!updated) return res.status(404).json({ error: "Estimate line not found" });
      if (updated.estimateId) {
        await recalculateEstimateTotals(updated.estimateId);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update estimate line" });
    }
  });

  app.delete("/api/estimate-lines/:id", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const line = await storage.getEstimateLine(lineId);
      const estimateId = line?.estimateId;
      await storage.deleteEstimateLine(lineId);
      if (estimateId) {
        await recalculateEstimateTotals(estimateId);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete estimate line" });
    }
  });

  // Convert Estimate to Work Order
  app.post("/api/estimates/:id/convert", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const estimateId = parseInt(req.params.id);
      
      // Validate estimateId
      if (isNaN(estimateId)) {
        return res.status(400).json({ error: "Invalid estimate ID" });
      }
      
      const orgId = getOrgId(req);
      
      // Get the estimate with lines
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Check tenant access
      if (orgId && estimate.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if already converted
      if (estimate.convertedToWorkOrderId) {
        return res.status(400).json({ error: "Estimate has already been converted to a work order" });
      }
      
      // Get organization settings to check if approval is required
      // Use estimate's orgId if request orgId is not available
      let requireApproval = true;
      const effectiveOrgId = orgId || estimate.orgId;
      if (effectiveOrgId) {
        const org = await storage.getOrganization(effectiveOrgId);
        if (org) {
          requireApproval = org.requireEstimateApproval !== false;
        }
      }
      
      // Check if estimate is approved (when approval is required)
      if (requireApproval && estimate.status !== "approved") {
        return res.status(400).json({ error: "Estimate must be approved before converting to a work order" });
      }
      
      // If approval is not required, allow conversion from draft or pending_approval status
      if (!requireApproval && estimate.status === "rejected") {
        return res.status(400).json({ error: "Rejected estimates cannot be converted to work orders" });
      }
      
      // Get the estimate lines
      const lines = await storage.getEstimateLines(estimateId);
      
      // Validate that estimate has lines
      if (!lines || lines.length === 0) {
        return res.status(400).json({ error: "Estimate must have at least one line item before converting to a work order" });
      }
      
      // Get the asset for title
      const asset = await storage.getAsset(estimate.assetId);
      
      // Generate work order number
      const workOrderNumber = await generateWorkOrderNumber(orgId);
      
      // Create the work order
      const workOrder = await storage.createWorkOrder({
        orgId: estimate.orgId,
        workOrderNumber,
        title: estimate.title || `Work Order from Estimate ${estimate.estimateNumber}`,
        description: estimate.description || `Converted from estimate ${estimate.estimateNumber}`,
        type: "corrective" as const,
        status: "open" as const,
        priority: "medium" as const,
        assetId: estimate.assetId,
        estimatedCost: estimate.grandTotal || "0",
        notes: estimate.notes,
      });
      
      // Create work order lines from estimate lines
      for (const line of lines) {
        // Build description that includes part info if applicable
        let lineDescription = line.description;
        if (line.partNumber) {
          lineDescription = `[${line.partNumber}] ${line.description}`;
        }
        
        await storage.createWorkOrderLine({
          workOrderId: workOrder.id,
          lineNumber: line.lineNumber,
          description: lineDescription,
          status: "pending" as const,
          notes: line.notes || undefined,
          partsCost: line.lineType !== "labor" ? line.totalCost : undefined,
          laborCost: line.lineType === "labor" ? line.totalCost : undefined,
        });
      }
      
      // Update the estimate with the work order reference and status
      await storage.updateEstimate(estimateId, {
        convertedToWorkOrderId: workOrder.id,
        status: "converted" as const,
      });
      
      res.json({ 
        message: "Estimate converted to work order successfully",
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber
      });
    } catch (error) {
      console.error("Error converting estimate to work order:", error);
      res.status(500).json({ error: "Failed to convert estimate to work order" });
    }
  });

  // ============================================================
  // PHASE 3: AI Predictions, Scanning, Status Automation
  // ============================================================

  // AI-Powered Predictive Maintenance
  app.post("/api/assets/:id/analyze", requireAuth, async (req, res) => {
    try {
      const { analyzeAssetHealth, savePredictions } = await import("./services/aiAnalysis");
      const assetId = parseInt(req.params.id);
      const predictions = await analyzeAssetHealth(assetId);
      
      // Save predictions to database
      await savePredictions(assetId, predictions);
      
      res.json({ predictions, count: predictions.length });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze asset" });
    }
  });

  // Get predictions for an asset
  app.get("/api/assets/:id/predictions", async (req, res) => {
    try {
      const predictions = await storage.getPredictionsByAsset(parseInt(req.params.id));
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get predictions" });
    }
  });

  // Fleet health score
  app.get("/api/fleet/health", async (req, res) => {
    try {
      const { calculateFleetHealthScore } = await import("./services/aiAnalysis");
      const health = await calculateFleetHealthScore();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate fleet health" });
    }
  });

  // Predictions acknowledge/dismiss (tenant-scoped) - duplicate GET removed, handled earlier
  app.patch("/api/predictions/:id/acknowledge", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const prediction = await storage.getPrediction(parseInt(req.params.id));
      if (!prediction) return res.status(404).json({ error: "Prediction not found" });
      const orgId = getOrgId(req);
      if (orgId && prediction.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updatePrediction(parseInt(req.params.id), {
        acknowledged: true,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge prediction" });
    }
  });

  app.patch("/api/predictions/:id/dismiss", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const prediction = await storage.getPrediction(parseInt(req.params.id));
      if (!prediction) return res.status(404).json({ error: "Prediction not found" });
      const orgId = getOrgId(req);
      if (orgId && prediction.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updatePrediction(parseInt(req.params.id), {
        dismissedAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss prediction" });
    }
  });

  // Prediction feedback - submit feedback after acknowledging
  const predictionFeedbackSchema = z.object({
    feedbackType: z.enum(['completed_repair', 'scheduled', 'not_needed', 'false_positive', 'deferred']),
    feedbackNotes: z.string().optional().nullable(),
    linkedWorkOrderId: z.number().optional().nullable(),
  });
  
  app.patch("/api/predictions/:id/feedback", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const prediction = await storage.getPrediction(parseInt(req.params.id));
      if (!prediction) return res.status(404).json({ error: "Prediction not found" });
      const orgId = getOrgId(req);
      if (orgId && prediction.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Validate input
      const parsed = predictionFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error.issues });
      }
      
      const { feedbackType, feedbackNotes, linkedWorkOrderId } = parsed.data;
      const userId = (req.user as any)?.claims?.sub;
      
      // Validate work order link if provided
      if (linkedWorkOrderId) {
        const workOrder = await storage.getWorkOrder(linkedWorkOrderId);
        if (!workOrder) {
          return res.status(400).json({ error: "Linked work order not found" });
        }
        if (orgId && workOrder.orgId !== orgId) {
          return res.status(403).json({ error: "Cannot link to work order from another organization" });
        }
      }
      
      const updated = await storage.updatePrediction(parseInt(req.params.id), {
        feedbackType,
        feedbackNotes: feedbackNotes || null,
        feedbackAt: new Date(),
        feedbackById: userId,
        linkedWorkOrderId: linkedWorkOrderId || null,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit prediction feedback" });
    }
  });

  // Create work order from prediction - auto-links bidirectionally
  app.post("/api/predictions/:id/create-work-order", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const prediction = await storage.getPrediction(parseInt(req.params.id));
      if (!prediction) return res.status(404).json({ error: "Prediction not found" });
      const orgId = getOrgId(req);
      if (orgId && prediction.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Prevent duplicate work orders from the same prediction
      if (prediction.linkedWorkOrderId) {
        return res.status(400).json({ error: "A work order already exists for this prediction" });
      }

      const userId = (req.user as any)?.claims?.sub;
      const asset = await storage.getAsset(prediction.assetId);
      
      // Generate work order number
      const allWorkOrders = orgId ? await storage.getWorkOrdersByOrg(orgId) : await storage.getWorkOrders();
      const woNumber = `WO-${String(allWorkOrders.length + 1).padStart(5, '0')}`;
      
      // Determine priority from severity
      let priority: "low" | "medium" | "high" | "critical" = "medium";
      if (prediction.severity === "critical") priority = "critical";
      else if (prediction.severity === "high") priority = "high";
      else if (prediction.severity === "low") priority = "low";

      // Create work order linked to prediction
      const workOrder = await storage.createWorkOrder({
        orgId: orgId || undefined,
        workOrderNumber: woNumber,
        title: `AI Prediction: ${prediction.prediction}`,
        description: `Created from AI prediction.\n\nPrediction: ${prediction.prediction}\n\nRecommended Action: ${prediction.recommendedAction || 'Review and repair as needed'}\n\nAI Reasoning: ${prediction.reasoning || 'N/A'}`,
        type: "corrective",
        status: "open",
        priority,
        assetId: prediction.assetId,
        dueDate: prediction.dueDate || undefined,
        estimatedCost: prediction.estimatedCost || undefined,
        predictionId: prediction.id,
        requestedById: userId,
      });

      // Update prediction with linked work order and feedback
      await storage.updatePrediction(prediction.id, {
        acknowledged: true,
        feedbackType: "scheduled",
        feedbackAt: new Date(),
        feedbackById: userId,
        linkedWorkOrderId: workOrder.id,
      });

      res.status(201).json({ workOrder, prediction: await storage.getPrediction(prediction.id) });
    } catch (error) {
      console.error("Failed to create work order from prediction:", error);
      res.status(500).json({ error: "Failed to create work order from prediction" });
    }
  });

  // Defer prediction - schedule for later by date or PM schedule
  const deferPredictionSchema = z.object({
    deferredUntil: z.string().optional().nullable(),
    deferredScheduleId: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  });

  app.patch("/api/predictions/:id/defer", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const prediction = await storage.getPrediction(parseInt(req.params.id));
      if (!prediction) return res.status(404).json({ error: "Prediction not found" });
      const orgId = getOrgId(req);
      if (orgId && prediction.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const parsed = deferPredictionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid defer data", details: parsed.error.issues });
      }

      const { deferredUntil, deferredScheduleId, notes } = parsed.data;
      const userId = (req.user as any)?.claims?.sub;

      // Validate PM schedule if provided
      if (deferredScheduleId) {
        const schedule = await storage.getPmSchedule(deferredScheduleId);
        if (!schedule) {
          return res.status(400).json({ error: "PM schedule not found" });
        }
        if (orgId && schedule.orgId !== orgId) {
          return res.status(403).json({ error: "Cannot defer to PM schedule from another organization" });
        }
      }

      const updated = await storage.updatePrediction(parseInt(req.params.id), {
        acknowledged: true,
        feedbackType: "deferred",
        feedbackNotes: notes || null,
        feedbackAt: new Date(),
        feedbackById: userId,
        deferredUntil: deferredUntil ? new Date(deferredUntil) : null,
        deferredScheduleId: deferredScheduleId || null,
      });
      res.json(updated);
    } catch (error) {
      console.error("Failed to defer prediction:", error);
      res.status(500).json({ error: "Failed to defer prediction" });
    }
  });

  // ============================================================
  // BARCODE/QR SCANNING
  // ============================================================

  // Scan lookup - find asset, part, or work order by scanned code
  app.get("/api/scan/:code", async (req, res) => {
    try {
      const code = req.params.code.trim();
      
      // Try to find as asset number
      const asset = await storage.getAssetByNumber(code);
      if (asset) {
        return res.json({ type: "asset", data: asset });
      }
      
      // Try to find as work order number
      const workOrder = await storage.getWorkOrderByNumber(code);
      if (workOrder) {
        return res.json({ type: "workOrder", data: workOrder });
      }
      
      // Try to find as part barcode
      const partByBarcode = await storage.getPartByBarcode(code);
      if (partByBarcode) {
        return res.json({ type: "part", data: partByBarcode });
      }
      
      // Try to find as part number
      const partByNumber = await storage.getPartByNumber(code);
      if (partByNumber) {
        return res.json({ type: "part", data: partByNumber });
      }
      
      res.status(404).json({ error: "No matching asset, part, or work order found" });
    } catch (error) {
      res.status(500).json({ error: "Scan lookup failed" });
    }
  });

  // ============================================================
  // INTELLIGENT ASSET STATUS AUTOMATION
  // ============================================================

  // Auto-update asset status based on conditions
  app.post("/api/assets/:id/auto-status", requireAuth, async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      
      const faultCodes = await storage.getFaultCodes(assetId);
      const activeFaults = faultCodes.filter(f => f.status === "active");
      const criticalFaults = activeFaults.filter(f => f.severity === "critical");
      const highFaults = activeFaults.filter(f => f.severity === "high");
      
      const workOrders = await storage.getWorkOrdersByAsset(assetId);
      const activeWorkOrders = workOrders.filter(wo => 
        wo.status === "open" || wo.status === "in_progress"
      );
      
      let newStatus = asset.status;
      let reason = "";
      
      // Status logic: critical faults or active work orders affect status
      if (criticalFaults.length > 0) {
        newStatus = "down";
        reason = `Critical fault codes active: ${criticalFaults.map(f => f.code).join(", ")}`;
      } else if (activeWorkOrders.length > 0) {
        newStatus = "in_maintenance";
        reason = `Active work orders: ${activeWorkOrders.map(wo => wo.workOrderNumber).join(", ")}`;
      } else if (highFaults.length >= 2) {
        newStatus = "pending_inspection";
        reason = `Multiple high severity faults require inspection`;
      } else if (activeFaults.length === 0 && activeWorkOrders.length === 0) {
        newStatus = "operational";
        reason = "No active issues";
      }
      
      if (newStatus !== asset.status) {
        await storage.updateAsset(assetId, { status: newStatus });
        await storage.createActivityLog({
          action: "status_change",
          entityType: "asset",
          entityId: assetId,
          description: `Status changed from ${asset.status} to ${newStatus}: ${reason}`,
        });
      }
      
      res.json({ 
        previousStatus: asset.status, 
        newStatus, 
        changed: newStatus !== asset.status,
        reason 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to auto-update status" });
    }
  });

  // ============================================================
  // PARTS FULFILLMENT
  // ============================================================

  // Get low stock parts
  app.get("/api/parts/low-stock", async (req, res) => {
    try {
      const lowStock = await storage.getLowStockParts();
      res.json(lowStock);
    } catch (error) {
      res.status(500).json({ error: "Failed to get low stock parts" });
    }
  });

  // Consume parts from work order line (when line is completed)
  app.post("/api/work-order-lines/:id/consume-parts", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const line = await storage.getWorkOrderLine(lineId);
      if (!line) return res.status(404).json({ error: "Line not found" });
      
      // Get the part ID and quantity from the line's parts cost context
      const { partId, quantity } = req.body;
      if (!partId || !quantity) {
        return res.status(400).json({ error: "partId and quantity required" });
      }
      
      await storage.consumePartFromInventory(partId, quantity, line.workOrderId, lineId);
      
      res.json({ success: true, message: "Parts consumed from inventory" });
    } catch (error) {
      res.status(500).json({ error: "Failed to consume parts" });
    }
  });

  // Get work order transactions (parts consumption history)
  app.get("/api/work-orders/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getWorkOrderTransactions(parseInt(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });

  // Get a single transaction
  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to get transaction" });
    }
  });

  // Reverse a transaction
  app.post("/api/transactions/:id/reverse", requireAuth, async (req, res) => {
    try {
      const reverseSchema = z.object({
        reason: z.string().min(1, "Reason is required"),
      });
      
      const { reason } = reverseSchema.parse(req.body);
      const user = (req as any).user;
      
      const reversal = await storage.reverseTransaction(
        parseInt(req.params.id),
        user?.id || null,
        reason
      );
      
      res.status(201).json(reversal);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      if (error.message === "Transaction not found") {
        return res.status(404).json({ error: "Transaction not found" });
      }
      if (error.message === "Transaction already reversed") {
        return res.status(400).json({ error: "Transaction has already been reversed" });
      }
      console.error("Reverse transaction error:", error);
      res.status(500).json({ error: "Failed to reverse transaction" });
    }
  });

  // ============================================================
  // CHECKLIST TEMPLATES
  // ============================================================
  
  app.get("/api/checklist-templates", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to get checklist templates" });
    }
  });

  app.get("/api/checklist-templates/:id", async (req, res) => {
    try {
      const template = await storage.getChecklistTemplate(parseInt(req.params.id));
      if (!template) return res.status(404).json({ error: "Checklist template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to get checklist template" });
    }
  });

  app.post("/api/checklist-templates", requireAuth, async (req, res) => {
    try {
      const validated = insertChecklistTemplateSchema.parse(req.body);
      const template = await storage.createChecklistTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create checklist template" });
    }
  });

  app.patch("/api/checklist-templates/:id", requireAuth, async (req, res) => {
    try {
      const partialSchema = insertChecklistTemplateSchema.partial();
      const validated = partialSchema.parse(req.body);
      const updated = await storage.updateChecklistTemplate(parseInt(req.params.id), validated);
      if (!updated) return res.status(404).json({ error: "Checklist template not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteChecklistTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete checklist template" });
    }
  });

  // ============================================================
  // CHECKLIST MAKE/MODEL ASSIGNMENTS
  // ============================================================

  app.get("/api/checklist-templates/:id/assignments", async (req, res) => {
    try {
      const assignments = await storage.getChecklistAssignments(parseInt(req.params.id));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to get assignments" });
    }
  });

  app.post("/api/checklist-templates/:id/assignments", requireAuth, async (req, res) => {
    try {
      const validated = insertChecklistMakeModelAssignmentSchema.parse({
        ...req.body,
        checklistTemplateId: parseInt(req.params.id),
      });
      const assignment = await storage.createChecklistAssignment(validated);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Get PM schedules linked to a checklist template
  app.get("/api/checklist-templates/:id/pm-schedules", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const links = await storage.getPmSchedulesByChecklistId(parseInt(req.params.id), orgId ?? undefined);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to get linked PM schedules" });
    }
  });

  app.delete("/api/checklist-assignments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteChecklistAssignment(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Get checklists applicable to an asset based on make/model
  app.get("/api/assets/:id/applicable-checklists", async (req, res) => {
    try {
      const asset = await storage.getAsset(parseInt(req.params.id));
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      
      const checklists = await storage.getChecklistsForAsset(
        asset.manufacturer || "",
        asset.model || "",
        asset.type
      );
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ error: "Failed to get applicable checklists" });
    }
  });

  // ============================================================
  // AI LABOR RATE ASSISTANCE
  // ============================================================

  app.post("/api/ai/suggest-overhead-costs", requireAuth, tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const { 
        location,
        shopSqFt,
        technicianCount,
        region,
        existingCosts = {}
      } = req.body;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `You are a fleet maintenance shop financial advisor. Based on the following information, suggest reasonable annual overhead costs for a maintenance shop.

Shop Information:
- Location/Region: ${location || region || 'Unknown'}
- Shop Size: ${shopSqFt ? `${shopSqFt} sq ft` : 'Unknown'}
- Number of Technicians: ${technicianCount || 'Unknown'}

Currently known costs (if any):
${Object.entries(existingCosts).map(([k, v]) => v ? `- ${k}: $${v}` : '').filter(Boolean).join('\n') || '- None specified'}

Please provide estimated annual costs for a typical fleet maintenance shop. Consider regional cost differences. Return ONLY valid JSON in this exact format:
{
  "annualRent": <number>,
  "annualUtilities": <number>,
  "annualInsurance": <number>,
  "annualEquipment": <number>,
  "annualSupplies": <number>,
  "annualTraining": <number>,
  "annualSoftware": <number>,
  "annualOther": <number>,
  "reasoning": "<brief explanation of your estimates>"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a fleet maintenance business advisor. Provide realistic cost estimates based on industry standards and regional data. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Try to parse JSON from the response
      let suggestions;
      try {
        // Find JSON in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", responseText);
        return res.status(500).json({ error: "Failed to parse AI suggestions" });
      }

      res.json(suggestions);
    } catch (error) {
      console.error("AI overhead cost suggestion error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // AI CHECKLIST GENERATION
  // ============================================================

  app.post("/api/ai/generate-checklist", requireAuth, async (req, res) => {
    try {
      const { 
        pmType, 
        assetType, 
        manufacturer, 
        model, 
        intervalType,
        intervalValue,
        existingTasks = []
      } = req.body;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Fetch associated manuals for the make/model
      // Wrapped in try/catch to gracefully handle manual retrieval failures
      let manualContext = "";
      if (manufacturer) {
        try {
          const manuals = await storage.getManualsByMakeModel(manufacturer, model || undefined);
          if (manuals.length > 0) {
            manualContext = "\n\nASSOCIATED SERVICE MANUALS:\n";
            manualContext += "The following maintenance and service manuals are available. Reference them when generating tasks:\n\n";
            
            let totalContentLength = 0;
            const MAX_MANUAL_CONTENT_CHARS = 6000; // Cap total manual content to prevent token overflow
            
            for (const manual of manuals.slice(0, 3)) {
              if (totalContentLength >= MAX_MANUAL_CONTENT_CHARS) break;
              
              manualContext += `Manual: ${manual.title} (${manual.type})\n`;
              if (manual.description) {
                manualContext += `Description: ${manual.description}\n`;
              }
              
              // Get manual sections for more detailed content
              const sections = await storage.getManualSections(manual.id);
              if (sections.length > 0) {
                manualContext += `Sections:\n`;
                for (const section of sections.slice(0, 8)) {
                  if (totalContentLength >= MAX_MANUAL_CONTENT_CHARS) break;
                  
                  manualContext += `  - ${section.title}`;
                  if (section.content) {
                    const remainingBudget = MAX_MANUAL_CONTENT_CHARS - totalContentLength;
                    const previewLength = Math.min(300, remainingBudget);
                    const preview = section.content.substring(0, previewLength);
                    manualContext += `: ${preview}${section.content.length > previewLength ? '...' : ''}\n`;
                    totalContentLength += preview.length + section.title.length;
                  } else {
                    manualContext += `\n`;
                    totalContentLength += section.title.length;
                  }
                }
              }
              manualContext += `\n`;
            }
            manualContext += "Use the information from these manuals to generate accurate, manufacturer-specific maintenance tasks. Reference specific procedures, torque specs, and fluid specifications where applicable.\n";
          }
        } catch (error) {
          console.warn("Failed to fetch manuals for checklist generation, proceeding without manual knowledge:", error);
          // Continue without manual context - AI will still generate generic tasks
        }
      }

      const prompt = `You are a fleet maintenance expert. Generate a comprehensive preventive maintenance task checklist for the following:

PM Type/Name: ${pmType || "Preventive Maintenance Service"}
Asset Type: ${assetType || "Vehicle"}
${manufacturer ? `Manufacturer: ${manufacturer}` : ""}
${model ? `Model: ${model}` : ""}
${intervalType ? `Interval: Every ${intervalValue} ${intervalType}` : ""}
${manualContext}
${existingTasks.length > 0 ? `Existing tasks to consider (don't duplicate): ${existingTasks.join(", ")}` : ""}

Generate 10-20 specific, actionable maintenance tasks. Each task should be a clear, concise instruction (e.g., "Check engine oil level and condition", "Inspect brake pads for wear"). If service manual information is provided, incorporate manufacturer-specific procedures and specifications into the tasks.

Return ONLY a JSON array of strings with the task descriptions. No explanations, just the JSON array.
Example: ["Check engine oil level", "Inspect tire pressure and tread depth", "Test all exterior lights"]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "[]";
      
      // Parse the JSON response
      let tasks: string[] = [];
      try {
        // Handle potential markdown code blocks
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("Failed to parse AI response:", content);
        tasks = [];
      }

      res.json({ tasks });
    } catch (error) {
      console.error("AI checklist generation error:", error);
      res.status(500).json({ error: "Failed to generate checklist" });
    }
  });

  // ============================================================
  // IMPORT JOBS (Bulk Data Import)
  // ============================================================
  app.get("/api/import-jobs", async (req, res) => {
    try {
      const jobs = await storage.getImportJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching import jobs:", error);
      res.status(500).json({ error: "Failed to fetch import jobs" });
    }
  });

  app.get("/api/import-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getImportJob(parseInt(req.params.id));
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching import job:", error);
      res.status(500).json({ error: "Failed to fetch import job" });
    }
  });

  app.post("/api/import-jobs", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { type, fileName, data, mappings } = req.body;
      
      // Create the import job
      const job = await storage.createImportJob({
        type,
        fileName,
        status: "processing",
        totalRows: data?.length || 0,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        errors: [],
        mappings,
        startedAt: new Date(),
      });

      // Process the import in the background
      processImportJob(job.id, type, data, mappings, orgId);

      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating import job:", error);
      res.status(500).json({ error: "Failed to create import job" });
    }
  });

  async function processImportJob(jobId: number, type: string, data: any[], mappings: Record<string, string>, orgId?: number) {
    let successCount = 0;
    let errorCount = 0;
    let skippedDuplicates = 0;
    const errors: { row: number; field?: string; value?: string; message: string; errorType: string }[] = [];
    
    // Track seen values for duplicate detection within this import
    const seenPartNumbers = new Set<string>();
    const seenBarcodes = new Set<string>();
    const seenAssetNumbers = new Set<string>();
    
    // Pre-fetch existing records for duplicate checking (org-scoped if available)
    const existingParts = type === "parts" ? (orgId ? await storage.getPartsByOrg(orgId) : await storage.getParts()) : [];
    const existingAssets = type === "assets" ? (orgId ? await storage.getAssetsByOrg(orgId) : await storage.getAssets()) : [];
    const existingPartNumbers = new Set(existingParts.map(p => p.partNumber?.toLowerCase()));
    const existingBarcodes = new Set(existingParts.filter(p => p.barcode).map(p => p.barcode!.toLowerCase()));
    const existingAssetNumbers = new Set(existingAssets.map(a => a.assetNumber?.toLowerCase()));

    // Special handling for work_order_parts import type
    if (type === "work_order_parts") {
      try {
        const rows = data.map(row => {
          const mapped: any = {};
          for (const [csvColumn, schemaField] of Object.entries(mappings)) {
            if (row[csvColumn] !== undefined && row[csvColumn] !== "") {
              mapped[schemaField] = row[csvColumn];
            }
          }
          return mapped;
        });

        const result = await storage.importWorkOrderPartsHistory(rows);
        successCount = result.successCount;
        errorCount = result.errorCount;
        errors.push(...result.errors);
      } catch (error: any) {
        errorCount = data.length;
        errors.push({ row: 1, message: error.message || "Failed to import work order parts", errorType: "system_error" });
      }
    } else {
      // Standard row-by-row processing for other import types
      for (let i = 0; i < data.length; i++) {
        try {
        const row = data[i];
        const mapped = mapRowToSchema(row, mappings);
        
        // Validate required fields
        const validationErrors = validateImportRow(type, mapped, i + 1);
        if (validationErrors.length > 0) {
          errors.push(...validationErrors);
          errorCount++;
          continue;
        }

        switch (type) {
          case "assets": {
            const assetNum = String(mapped.assetNumber || "").toLowerCase().trim();
            if (!assetNum) {
              errors.push({ row: i + 1, field: "assetNumber", message: "Asset number is required", errorType: "missing_required" });
              errorCount++;
              continue;
            }
            // Check for duplicates
            if (existingAssetNumbers.has(assetNum) || seenAssetNumbers.has(assetNum)) {
              errors.push({ row: i + 1, field: "assetNumber", value: mapped.assetNumber, message: `Duplicate asset number: "${mapped.assetNumber}" already exists`, errorType: "duplicate" });
              skippedDuplicates++;
              errorCount++;
              continue;
            }
            seenAssetNumbers.add(assetNum);
            await storage.createAsset({ ...mapped, orgId });
            break;
          }
          
          case "parts": {
            const partNum = String(mapped.partNumber || "").toLowerCase().trim();
            const barcode = mapped.barcode ? String(mapped.barcode).toLowerCase().trim() : null;
            
            if (!partNum) {
              errors.push({ row: i + 1, field: "partNumber", message: "Part number is required", errorType: "missing_required" });
              errorCount++;
              continue;
            }
            
            // Check for duplicate part number
            if (existingPartNumbers.has(partNum) || seenPartNumbers.has(partNum)) {
              errors.push({ row: i + 1, field: "partNumber", value: mapped.partNumber, message: `Duplicate part number: "${mapped.partNumber}" already exists`, errorType: "duplicate" });
              skippedDuplicates++;
              errorCount++;
              continue;
            }
            
            // Check for duplicate barcode (if provided)
            if (barcode && (existingBarcodes.has(barcode) || seenBarcodes.has(barcode))) {
              errors.push({ row: i + 1, field: "barcode", value: mapped.barcode, message: `Duplicate barcode: "${mapped.barcode}" already exists`, errorType: "duplicate" });
              skippedDuplicates++;
              errorCount++;
              continue;
            }
            
            seenPartNumbers.add(partNum);
            if (barcode) seenBarcodes.add(barcode);
            
            // Clean up numeric fields
            if (mapped.unitCost) mapped.unitCost = String(parseFloat(String(mapped.unitCost).replace(/[^0-9.-]/g, "")) || 0);
            if (mapped.quantityOnHand) mapped.quantityOnHand = String(parseInt(String(mapped.quantityOnHand).replace(/[^0-9-]/g, "")) || 0);
            if (mapped.reorderPoint) mapped.reorderPoint = String(parseInt(String(mapped.reorderPoint).replace(/[^0-9-]/g, "")) || 0);
            if (mapped.reorderQuantity) mapped.reorderQuantity = String(parseInt(String(mapped.reorderQuantity).replace(/[^0-9-]/g, "")) || 0);
            if (mapped.orderPrice) mapped.orderPrice = String(parseFloat(String(mapped.orderPrice).replace(/[^0-9.-]/g, "")) || 0);
            
            await storage.createPart({ ...mapped, orgId });
            break;
          }
          
          case "vendors":
            if (!mapped.name) {
              errors.push({ row: i + 1, field: "name", message: "Vendor name is required", errorType: "missing_required" });
              errorCount++;
              continue;
            }
            await storage.createVendor({ ...mapped, orgId });
            break;
            
          case "work_orders":
            const woNumber = await generateWorkOrderNumber(orgId);
            await storage.createWorkOrder({ ...mapped, workOrderNumber: woNumber, orgId });
            break;
            
          case "vmrs_codes":
            await storage.createVmrsCode(mapped);
            break;
            
          case "purchase_orders":
            const poNumImport = await generatePONumber(orgId);
            await storage.createPurchaseOrder({ ...mapped, poNumber: poNumImport, orgId });
            break;
            
          default:
            throw new Error(`Unsupported import type: ${type}`);
        }
        successCount++;
      } catch (error: any) {
        errorCount++;
        // Parse database errors for better messages
        let errorMessage = error.message || "Unknown error";
        let errorType = "database_error";
        
        if (errorMessage.includes("duplicate key")) {
          errorType = "duplicate";
          errorMessage = "Record already exists in database";
        } else if (errorMessage.includes("violates not-null")) {
          errorType = "missing_required";
          const match = errorMessage.match(/column "(\w+)"/);
          errorMessage = match ? `Required field "${match[1]}" is missing` : "Required field is missing";
        } else if (errorMessage.includes("invalid input syntax")) {
          errorType = "invalid_format";
          errorMessage = "Invalid data format";
        }
        
        errors.push({ row: i + 1, message: errorMessage, errorType });
      }

      // Update progress every 50 rows (reduced frequency for large imports)
      if ((i + 1) % 50 === 0 || i === data.length - 1) {
        await storage.updateImportJob(jobId, {
          processedRows: i + 1,
          successRows: successCount,
          errorRows: errorCount,
          errors: errors.slice(0, 500), // Limit stored errors to prevent huge payloads
        });
      }
    }
    }

    // Generate error summary
    const errorSummary = generateErrorSummary(errors);

    // Mark as completed
    await storage.updateImportJob(jobId, {
      status: successCount === 0 ? "failed" : errors.length > 0 ? "completed_with_errors" : "completed",
      processedRows: data.length,
      successRows: successCount,
      errorRows: errorCount,
      errors: errors.slice(0, 500),
      errorSummary,
      completedAt: new Date(),
    });
  }
  
  function validateImportRow(type: string, mapped: Record<string, any>, rowNum: number): { row: number; field?: string; message: string; errorType: string }[] {
    const errors: { row: number; field?: string; message: string; errorType: string }[] = [];
    
    switch (type) {
      case "parts":
        if (!mapped.partNumber || String(mapped.partNumber).trim() === "") {
          errors.push({ row: rowNum, field: "partNumber", message: "Part number is required", errorType: "missing_required" });
        }
        if (!mapped.name || String(mapped.name).trim() === "") {
          errors.push({ row: rowNum, field: "name", message: "Part name is required", errorType: "missing_required" });
        }
        break;
      case "assets":
        if (!mapped.assetNumber || String(mapped.assetNumber).trim() === "") {
          errors.push({ row: rowNum, field: "assetNumber", message: "Asset number is required", errorType: "missing_required" });
        }
        if (!mapped.name || String(mapped.name).trim() === "") {
          errors.push({ row: rowNum, field: "name", message: "Asset name is required", errorType: "missing_required" });
        }
        if (!mapped.type || String(mapped.type).trim() === "") {
          errors.push({ row: rowNum, field: "type", message: "Asset type is required", errorType: "missing_required" });
        }
        break;
    }
    
    return errors;
  }
  
  function generateErrorSummary(errors: { row: number; field?: string; message: string; errorType: string }[]): ImportErrorSummary {
    const byType: Record<string, number> = {};
    const byField: Record<string, number> = {};
    const sampleErrors: Record<string, string[]> = {};
    
    for (const error of errors) {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1;
      if (error.field) {
        byField[error.field] = (byField[error.field] || 0) + 1;
      }
      
      // Keep sample errors for each type
      if (!sampleErrors[error.errorType]) {
        sampleErrors[error.errorType] = [];
      }
      if (sampleErrors[error.errorType].length < 3) {
        sampleErrors[error.errorType].push(`Row ${error.row}: ${error.message}`);
      }
    }
    
    return { byType, byField, sampleErrors, totalErrors: errors.length };
  }

  function mapRowToSchema(row: Record<string, any>, mappings: Record<string, string>) {
    const mapped: Record<string, any> = {};
    for (const [csvColumn, schemaField] of Object.entries(mappings)) {
      if (row[csvColumn] !== undefined && row[csvColumn] !== "") {
        mapped[schemaField] = row[csvColumn];
      }
    }
    return mapped;
  }

  // ============================================================
  // SMART PART SUGGESTIONS
  // ============================================================
  app.get("/api/smart-part-suggestions", async (req, res) => {
    try {
      const { vmrsCode, manufacturer, model, year } = req.query;
      
      if (!vmrsCode) {
        return res.status(400).json({ error: "vmrsCode is required" });
      }

      // Get historical part suggestions based on usage
      const historicalSuggestions = await storage.getSmartPartSuggestions(
        vmrsCode as string,
        manufacturer as string | undefined,
        model as string | undefined,
        year ? parseInt(year as string) : undefined
      );

      res.json({
        historical: historicalSuggestions,
        source: "usage_history"
      });
    } catch (error) {
      console.error("Error fetching smart part suggestions:", error);
      res.status(500).json({ error: "Failed to fetch part suggestions" });
    }
  });

  app.post("/api/smart-part-suggestions/ai", async (req, res) => {
    try {
      const { vmrsCode, vmrsTitle, manufacturer, model, year } = req.body;

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Fetch manuals for the make/model to get part recommendations
      let manualContext = "";
      if (manufacturer) {
        try {
          const manuals = await storage.getManualsByMakeModel(manufacturer, model);
          if (manuals.length > 0) {
            manualContext = "\n\nRelevant service manual information:\n";
            for (const manual of manuals.slice(0, 2)) {
              const sections = await storage.getManualSections(manual.id);
              for (const section of sections.slice(0, 5)) {
                if (section.content && section.content.toLowerCase().includes("part")) {
                  manualContext += `- ${section.title}: ${section.content.substring(0, 300)}\n`;
                }
              }
            }
          }
        } catch (error) {
          console.warn("Failed to fetch manuals for part suggestions:", error);
        }
      }

      // Get existing parts inventory
      const allParts = await storage.getParts();
      const partsContext = allParts.slice(0, 50).map(p => `${p.partNumber}: ${p.name}`).join("\n");

      const prompt = `You are a fleet maintenance expert. Suggest the most appropriate parts for the following repair:

VMRS Code: ${vmrsCode}${vmrsTitle ? ` (${vmrsTitle})` : ""}
Vehicle: ${manufacturer || "Unknown"} ${model || ""} ${year || ""}
${manualContext}

Available parts in inventory:
${partsContext}

Based on the VMRS code and vehicle information, suggest 3-5 parts that would typically be needed for this repair. Return ONLY a JSON array with objects containing:
- partNumber: The part number from the inventory (if applicable) or a generic description
- reason: Brief explanation why this part is suggested

Example: [{"partNumber": "BP-001", "reason": "Standard brake pads for this model"}]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || "[]";
      let suggestions: { partNumber: string; reason: string }[] = [];
      
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("Failed to parse AI suggestions:", content);
      }

      res.json({ suggestions, source: "ai" });
    } catch (error) {
      console.error("AI part suggestions error:", error);
      res.status(500).json({ error: "Failed to get AI part suggestions" });
    }
  });

  // Record part usage for future suggestions
  app.post("/api/part-usage", async (req, res) => {
    try {
      const usage = await storage.createPartUsageHistory(req.body);
      res.status(201).json(usage);
    } catch (error) {
      console.error("Error recording part usage:", error);
      res.status(500).json({ error: "Failed to record part usage" });
    }
  });

  // ============================================================
  // PART KITS
  // ============================================================
  app.get("/api/part-kits", async (req, res) => {
    try {
      const kits = await storage.getPartKits();
      res.json(kits);
    } catch (error) {
      res.status(500).json({ error: "Failed to get part kits" });
    }
  });

  app.get("/api/part-kits/:id", async (req, res) => {
    try {
      const kit = await storage.getPartKit(parseInt(req.params.id));
      if (!kit) return res.status(404).json({ error: "Part kit not found" });
      res.json(kit);
    } catch (error) {
      res.status(500).json({ error: "Failed to get part kit" });
    }
  });

  app.post("/api/part-kits", requireAuth, async (req, res) => {
    try {
      const kitNumber = await storage.getNextKitNumber();
      const validated = insertPartKitSchema.parse({ ...req.body, kitNumber });
      const kit = await storage.createPartKit(validated);
      res.status(201).json(kit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create part kit" });
    }
  });

  app.patch("/api/part-kits/:id", requireAuth, async (req, res) => {
    try {
      const partialSchema = insertPartKitSchema.partial();
      const validated = partialSchema.parse(req.body);
      const kit = await storage.updatePartKit(parseInt(req.params.id), validated);
      if (!kit) return res.status(404).json({ error: "Part kit not found" });
      res.json(kit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update part kit" });
    }
  });

  app.delete("/api/part-kits/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePartKit(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete part kit" });
    }
  });

  // Part Kit Lines
  app.get("/api/part-kits/:id/lines", async (req, res) => {
    try {
      const lines = await storage.getPartKitLines(parseInt(req.params.id));
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: "Failed to get kit lines" });
    }
  });

  app.post("/api/part-kits/:id/lines", requireAuth, async (req, res) => {
    try {
      const kitId = parseInt(req.params.id);
      const part = await storage.getPart(req.body.partId);
      if (!part) return res.status(400).json({ error: "Part not found" });
      
      const quantity = Number(req.body.quantity || 1);
      const unitCost = Number(part.unitCost || 0);
      const lineCost = quantity * unitCost;
      
      const validated = insertPartKitLineSchema.parse({
        ...req.body,
        kitId,
        unitCost: String(unitCost),
        lineCost: String(lineCost),
      });
      const line = await storage.createPartKitLine(validated);
      res.status(201).json(line);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add kit line" });
    }
  });

  app.delete("/api/part-kit-lines/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePartKitLine(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete kit line" });
    }
  });

  // Consume kit on work order
  app.post("/api/work-order-lines/:id/consume-kit", requireAuth, async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const { kitId } = req.body;
      
      const line = await storage.getWorkOrderLine(lineId);
      if (!line) return res.status(404).json({ error: "Work order line not found" });
      
      const result = await storage.consumeKitOnWorkOrder(
        kitId,
        line.workOrderId,
        lineId,
        (req.user as any)?.id
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to consume kit" });
    }
  });

  // PM Schedule Kits
  app.get("/api/pm-schedules/:id/kits", async (req, res) => {
    try {
      const kits = await storage.getPmScheduleKits(parseInt(req.params.id));
      res.json(kits);
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM schedule kits" });
    }
  });

  app.post("/api/pm-schedules/:id/kits", requireAuth, async (req, res) => {
    try {
      const pmScheduleId = parseInt(req.params.id);
      const { kitId } = req.body;
      const link = await storage.addKitToPmSchedule(pmScheduleId, kitId);
      res.status(201).json(link);
    } catch (error) {
      res.status(500).json({ error: "Failed to add kit to PM schedule" });
    }
  });

  app.delete("/api/pm-schedule-kits/:id", requireAuth, async (req, res) => {
    try {
      await storage.removeKitFromPmSchedule(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove kit from PM schedule" });
    }
  });

  // PM Schedule Models (link PM schedules to make/model combinations)
  app.get("/api/pm-schedules/:id/models", async (req, res) => {
    try {
      const models = await storage.getPmScheduleModels(parseInt(req.params.id));
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM schedule models" });
    }
  });

  app.post("/api/pm-schedules/:id/models", requireAuth, async (req, res) => {
    try {
      const pmScheduleId = parseInt(req.params.id);
      const validated = insertPmScheduleModelSchema.parse({ ...req.body, pmScheduleId });
      const created = await storage.addPmScheduleModel(validated);
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add model to PM schedule" });
    }
  });

  app.delete("/api/pm-schedule-models/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePmScheduleModel(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove model from PM schedule" });
    }
  });

  // PM Schedule Kit Models (link kits to specific models within a PM schedule)
  app.get("/api/pm-schedule-kits/:id/models", async (req, res) => {
    try {
      const models = await storage.getPmScheduleKitModels(parseInt(req.params.id));
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM schedule kit models" });
    }
  });

  app.post("/api/pm-schedule-kits/:id/models", requireAuth, async (req, res) => {
    try {
      const pmScheduleKitId = parseInt(req.params.id);
      const validated = insertPmScheduleKitModelSchema.parse({ ...req.body, pmScheduleKitId });
      const created = await storage.addPmScheduleKitModel(validated);
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add model to PM schedule kit" });
    }
  });

  app.delete("/api/pm-schedule-kit-models/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePmScheduleKitModel(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove model from PM schedule kit" });
    }
  });

  // PM Schedule Checklists (link checklist templates to PM schedules)
  app.get("/api/pm-schedules/:id/checklists", async (req, res) => {
    try {
      const checklists = await storage.getPmScheduleChecklists(parseInt(req.params.id));
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM schedule checklists" });
    }
  });

  app.post("/api/pm-schedules/:id/checklists", requireAuth, async (req, res) => {
    try {
      const pmScheduleId = parseInt(req.params.id);
      const { checklistTemplateId, autoSyncModels } = req.body;
      
      // Create the link
      const created = await storage.addPmScheduleChecklist({
        pmScheduleId,
        checklistTemplateId,
        autoSyncModels: autoSyncModels ?? true,
      });
      
      // If autoSyncModels is true, sync the PM schedule models to the checklist
      if (autoSyncModels !== false) {
        const pmModels = await storage.getPmScheduleModels(pmScheduleId);
        for (const pmModel of pmModels) {
          // Check if assignment already exists
          const existingAssignments = await storage.getChecklistAssignments(checklistTemplateId);
          const exists = existingAssignments.some(a => 
            a.manufacturer === pmModel.make && a.model === pmModel.model
          );
          if (!exists) {
            await storage.createChecklistAssignment({
              checklistTemplateId,
              manufacturer: pmModel.make,
              model: pmModel.model,
            });
          }
        }
      }
      
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add checklist to PM schedule" });
    }
  });

  app.delete("/api/pm-schedule-checklists/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePmScheduleChecklist(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove checklist from PM schedule" });
    }
  });

  // Get PM schedule by VMRS code (for WO line auto-population)
  app.get("/api/pm-schedules/by-vmrs/:vmrsCodeId", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const vmrsCodeId = parseInt(req.params.vmrsCodeId);
      const orgId = getOrgId(req);
      const schedule = await storage.getPmScheduleByVmrsCode(vmrsCodeId, orgId || undefined);
      if (!schedule) {
        return res.status(404).json({ error: "No PM schedule linked to this VMRS code" });
      }
      
      // Also fetch related data (models, kits, checklists)
      const [models, kits, checklists] = await Promise.all([
        storage.getPmScheduleModels(schedule.id),
        storage.getPmScheduleKits(schedule.id),
        storage.getPmScheduleChecklists(schedule.id),
      ]);
      
      res.json({
        schedule,
        models,
        kits,
        checklists,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM schedule by VMRS code" });
    }
  });

  // ============================================================
  // CYCLE COUNTS
  // ============================================================
  app.get("/api/cycle-counts", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const counts = await storage.getCycleCounts(status);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cycle counts" });
    }
  });

  app.get("/api/cycle-counts/:id", async (req, res) => {
    try {
      const count = await storage.getCycleCount(parseInt(req.params.id));
      if (!count) return res.status(404).json({ error: "Cycle count not found" });
      res.json(count);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cycle count" });
    }
  });

  app.post("/api/cycle-counts", requireAuth, async (req, res) => {
    try {
      const countNumber = await storage.getNextCycleCountNumber();
      const validated = insertCycleCountSchema.parse({ ...req.body, countNumber });
      const count = await storage.createCycleCount(validated);
      res.status(201).json(count);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create cycle count" });
    }
  });

  app.post("/api/cycle-counts/:id/execute", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actualQuantity, notes } = req.body;
      const user = req.user as any;
      
      const count = await storage.executeCycleCount(
        id,
        Number(actualQuantity),
        user?.id || null,
        user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null,
        notes
      );
      
      if (!count) return res.status(404).json({ error: "Cycle count not found" });
      res.json(count);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute cycle count" });
    }
  });

  app.post("/api/cycle-counts/:id/reconcile", requireAuth, async (req, res) => {
    try {
      const count = await storage.reconcileCycleCount(parseInt(req.params.id));
      if (!count) return res.status(400).json({ error: "Cannot reconcile count" });
      res.json(count);
    } catch (error) {
      res.status(500).json({ error: "Failed to reconcile cycle count" });
    }
  });

  // Generate cycle count schedule based on ABC classification
  app.post("/api/cycle-counts/generate-schedule", requireAuth, async (req, res) => {
    try {
      const result = await storage.scheduleCycleCountsForParts();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate cycle count schedule" });
    }
  });

  // ============================================================
  // ABC CLASSIFICATION
  // ============================================================
  app.post("/api/parts/recalculate-abc", requireAuth, async (req, res) => {
    try {
      const result = await storage.recalculateABCClassification();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to recalculate ABC classification" });
    }
  });

  // Recalculate Min/Max and reorder points based on usage patterns
  const recalculateMinMaxSchema = z.object({
    leadTimeDays: z.number().min(1).max(365).optional().default(14),
    safetyStockDays: z.number().min(0).max(180).optional().default(7),
    lookbackDays: z.number().min(7).max(365).optional().default(90),
  });
  
  app.post("/api/parts/recalculate-minmax", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        return res.status(403).json({ error: "Organization context required" });
      }
      
      // Validate request body
      const parseResult = recalculateMinMaxSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid parameters", details: parseResult.error.flatten() });
      }
      const { leadTimeDays, safetyStockDays, lookbackDays } = parseResult.data;
      
      // Use storage method for tenant-safe recalculation
      const result = await storage.recalculateMinMax(orgId, { leadTimeDays, safetyStockDays, lookbackDays });
      
      res.json({
        success: true,
        ...result,
        parameters: { leadTimeDays, safetyStockDays, lookbackDays },
      });
    } catch (error) {
      console.error("Min/Max recalculation error:", error);
      res.status(500).json({ error: "Failed to recalculate Min/Max values" });
    }
  });

  // ============================================================
  // PM DUES & COMPLETION
  // ============================================================
  app.get("/api/pm-dues", async (req, res) => {
    try {
      const dues = await storage.getPmDueList();
      res.json(dues);
    } catch (error) {
      res.status(500).json({ error: "Failed to get PM dues" });
    }
  });

  app.post("/api/pm-dues/batch-create-work-orders", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      const { instanceIds } = req.body;
      if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
        return res.status(400).json({ error: "Instance IDs required" });
      }

      const createdWorkOrders: any[] = [];
      
      for (const instanceId of instanceIds) {
        const dues = await storage.getPmDueList();
        const instance = dues.find(d => d.id === instanceId);
        if (!instance || !instance.asset || !instance.pmSchedule) continue;

        const workOrderNumber = await generateWorkOrderNumber(orgId);
        const wo = await storage.createWorkOrder({
          workOrderNumber,
          title: `PM: ${instance.pmSchedule.name} - ${instance.asset.name}`,
          description: `Preventive maintenance for ${instance.asset.name}`,
          type: "preventive",
          status: "open",
          priority: instance.pmSchedule.priority || "medium",
          assetId: instance.assetId,
          dueDate: instance.nextDueDate || new Date(),
        });
        
        createdWorkOrders.push(wo);
      }

      res.status(201).json({ created: createdWorkOrders.length, workOrders: createdWorkOrders });
    } catch (error) {
      res.status(500).json({ error: "Failed to create work orders" });
    }
  });

  app.post("/api/pm-instances/:id/complete", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completionDate, meterReading } = req.body;
      
      const instance = await storage.completePmFromWorkOrder(
        id,
        new Date(completionDate || Date.now()),
        meterReading ? Number(meterReading) : undefined
      );
      
      if (!instance) return res.status(404).json({ error: "PM instance not found" });
      res.json(instance);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete PM" });
    }
  });

  // ==============================================
  // TIRE REPLACEMENT SETTINGS
  // ==============================================
  app.get("/api/tire-replacement-settings", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.json([]);
      const settings = await storage.getTireReplacementSettingsByOrg(orgId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tire replacement settings" });
    }
  });

  app.post("/api/tire-replacement-settings", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const validated = insertTireReplacementSettingSchema.parse({
        ...req.body,
        orgId,
      });
      const setting = await storage.createTireReplacementSetting(validated);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create tire replacement setting" });
    }
  });

  app.patch("/api/tire-replacement-settings/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const id = parseInt(req.params.id);
      const existing = await storage.getTireReplacementSetting(id);
      if (!existing || existing.orgId !== orgId) {
        return res.status(404).json({ error: "Setting not found" });
      }
      const updated = await storage.updateTireReplacementSetting(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tire replacement setting" });
    }
  });

  app.delete("/api/tire-replacement-settings/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const id = parseInt(req.params.id);
      const existing = await storage.getTireReplacementSetting(id);
      if (!existing || existing.orgId !== orgId) {
        return res.status(404).json({ error: "Setting not found" });
      }
      await storage.deleteTireReplacementSetting(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tire replacement setting" });
    }
  });

  // ==============================================
  // PUBLIC ASSET TOKENS (for QR Code DVIR)
  // ==============================================
  app.get("/api/public-asset-tokens", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const tokens = await storage.getPublicAssetTokensByOrg(orgId);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch public asset tokens" });
    }
  });

  app.get("/api/assets/:id/public-token", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const assetId = parseInt(req.params.id);
      const token = await storage.getPublicAssetTokenByAsset(assetId);
      res.json(token || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch public asset token" });
    }
  });

  app.post("/api/assets/:id/generate-qr-token", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const assetId = parseInt(req.params.id);
      
      // Check if asset exists and belongs to org
      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      
      // Deactivate any existing tokens for this asset
      const existingToken = await storage.getPublicAssetTokenByAsset(assetId);
      if (existingToken) {
        await storage.updatePublicAssetToken(existingToken.id, { isActive: false });
      }
      
      // Generate new token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      
      const newToken = await storage.createPublicAssetToken({
        orgId,
        assetId,
        token,
        isActive: true,
      });
      
      res.status(201).json(newToken);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR token" });
    }
  });

  app.delete("/api/public-asset-tokens/:id", requireAuth, tenantMiddleware(), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(403).json({ error: "Organization context required" });
      const id = parseInt(req.params.id);
      await storage.deletePublicAssetToken(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete public asset token" });
    }
  });

  return httpServer;
}
