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
import { organizations, orgMemberships, insertOrganizationSchema, insertOrgMembershipSchema, updateOrganizationSchema, updateOrgMemberRoleSchema, tires, insertTireSchema, conversations, messages, insertConversationSchema, insertMessageSchema, savedReports, insertSavedReportSchema, gpsLocations, insertGpsLocationSchema } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users } from "@shared/schema";

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
      
      if (!hasMembership) {
        return res.status(403).json({ error: "Not a member of this organization" });
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

  // Dashboard stats (tenant-scoped)
  app.get("/api/dashboard/stats", tenantMiddleware({ required: false }), async (req, res) => {
    try {
      const orgId = getOrgId(req);
      if (orgId) {
        const stats = await storage.getDashboardStatsByOrg(orgId);
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
      if (orgId) {
        const kpis = await storage.getKpiMetricsByOrg(orgId);
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
      if (orgId) {
        const overview = await storage.getProcurementOverviewByOrg(orgId);
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
      if (orgId) {
        const analytics = await storage.getPartsAnalyticsByOrg(orgId);
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
      const tireHealth = await storage.getTireHealthStats(orgId);
      res.json(tireHealth);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tire health data" });
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
      const updated = await storage.updateAsset(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Asset not found" });
      res.json(updated);
    } catch (error) {
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

  // Parts (tenant-scoped)
  app.get("/api/parts", tenantMiddleware({ required: false }), async (req, res) => {
    const orgId = getOrgId(req);
    if (orgId) {
      const parts = await storage.getPartsByOrg(orgId);
      res.json(parts);
    } else {
      const parts = await storage.getParts();
      res.json(parts);
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
    const workOrders = await storage.getRecentWorkOrders(limit);
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
      const updated = await storage.updateWorkOrder(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Work order not found" });
      res.json(updated);
    } catch (error) {
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
      const validated = insertPmScheduleSchema.parse(req.body);
      const schedule = await storage.createPmSchedule({ ...validated, orgId });
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create PM schedule" });
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
      const partialSchema = insertPmScheduleSchema.partial();
      const validated = partialSchema.parse(req.body);
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
    if (orgId) {
      const dvirs = await storage.getDvirsByOrg(orgId);
      res.json(dvirs);
    } else {
      const dvirs = await storage.getDvirs();
      res.json(dvirs);
    }
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
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const validated = insertConversationSchema.parse({ ...req.body, createdBy: req.user.id });
      const conv = await storage.createConversation({ ...validated, orgId });
      res.status(201).json(conv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
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
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
        senderId: req.user.id,
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
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const validated = insertSavedReportSchema.parse({ ...req.body, createdBy: req.user.id });
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

  return httpServer;
}
