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
  insertPurchaseOrderSchema,
  insertManualSchema,
  insertDvirSchema,
  insertDvirDefectSchema,
  insertFeedbackSchema,
  insertEstimateSchema,
  insertEstimateLineSchema,
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function generateWorkOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const workOrders = await storage.getWorkOrders();
  const thisYearOrders = workOrders.filter(w => w.workOrderNumber.startsWith(`WO-${year}`));
  const nextNum = thisYearOrders.length + 1;
  return `WO-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generateRequisitionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const reqs = await storage.getRequisitions();
  const thisYearReqs = reqs.filter(r => r.requisitionNumber.startsWith(`REQ-${year}`));
  const nextNum = thisYearReqs.length + 1;
  return `REQ-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pos = await storage.getPurchaseOrders();
  const thisYearPOs = pos.filter(p => p.poNumber.startsWith(`PO-${year}`));
  const nextNum = thisYearPOs.length + 1;
  return `PO-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function generateEstimateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const estimates = await storage.getEstimates();
  const thisYearEstimates = estimates.filter(e => e.estimateNumber.startsWith(`EST-${year}`));
  const nextNum = thisYearEstimates.length + 1;
  return `EST-${year}-${String(nextNum).padStart(4, "0")}`;
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

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Locations
  app.get("/api/locations", async (req, res) => {
    const locations = await storage.getLocations();
    res.json(locations);
  });

  app.get("/api/locations/:id", async (req, res) => {
    const location = await storage.getLocation(parseInt(req.params.id));
    if (!location) return res.status(404).json({ error: "Location not found" });
    res.json(location);
  });

  // Assets
  app.get("/api/assets", async (req, res) => {
    const assets = await storage.getAssets();
    res.json(assets);
  });

  app.get("/api/assets/:id", async (req, res) => {
    const asset = await storage.getAsset(parseInt(req.params.id));
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    res.json(asset);
  });

  app.post("/api/assets", requireAuth, async (req, res) => {
    try {
      const validated = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(validated);
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

  // Vendors
  app.get("/api/vendors", async (req, res) => {
    const vendors = await storage.getVendors();
    res.json(vendors);
  });

  app.get("/api/vendors/:id", async (req, res) => {
    const vendor = await storage.getVendor(parseInt(req.params.id));
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  });

  app.post("/api/vendors", requireAuth, async (req, res) => {
    try {
      const validated = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validated);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateVendor(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Vendor not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // Parts
  app.get("/api/parts", async (req, res) => {
    const parts = await storage.getParts();
    res.json(parts);
  });

  app.get("/api/parts/:id", async (req, res) => {
    const part = await storage.getPart(parseInt(req.params.id));
    if (!part) return res.status(404).json({ error: "Part not found" });
    res.json(part);
  });

  app.post("/api/parts", requireAuth, async (req, res) => {
    try {
      const validated = insertPartSchema.parse(req.body);
      const part = await storage.createPart(validated);
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

  // Work Orders
  app.get("/api/work-orders", async (req, res) => {
    const workOrders = await storage.getWorkOrders();
    res.json(workOrders);
  });

  app.get("/api/work-orders/recent", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const workOrders = await storage.getRecentWorkOrders(limit);
    res.json(workOrders);
  });

  app.get("/api/work-orders/:id", async (req, res) => {
    const wo = await storage.getWorkOrder(parseInt(req.params.id));
    if (!wo) return res.status(404).json({ error: "Work order not found" });
    res.json(wo);
  });

  app.post("/api/work-orders", requireAuth, async (req, res) => {
    try {
      const workOrderNumber = await generateWorkOrderNumber();
      const validated = insertWorkOrderSchema.parse({
        ...req.body,
        workOrderNumber,
      });
      const wo = await storage.createWorkOrder(validated);
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

  // Work Order Lines
  app.get("/api/work-orders/:id/lines", async (req, res) => {
    const lines = await storage.getWorkOrderLines(parseInt(req.params.id));
    res.json(lines);
  });

  app.post("/api/work-orders/:id/lines", requireAuth, async (req, res) => {
    try {
      const validated = insertWorkOrderLineSchema.parse({
        ...req.body,
        workOrderId: parseInt(req.params.id),
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

  // PM Schedules
  app.get("/api/pm-schedules", async (req, res) => {
    const schedules = await storage.getPmSchedules();
    res.json(schedules);
  });

  app.get("/api/pm-schedules/:id", async (req, res) => {
    const schedule = await storage.getPmSchedule(parseInt(req.params.id));
    if (!schedule) return res.status(404).json({ error: "PM schedule not found" });
    res.json(schedule);
  });

  app.post("/api/pm-schedules", requireAuth, async (req, res) => {
    try {
      const validated = insertPmScheduleSchema.parse(req.body);
      const schedule = await storage.createPmSchedule(validated);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create PM schedule" });
    }
  });

  app.patch("/api/pm-schedules/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updatePmSchedule(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "PM schedule not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update PM schedule" });
    }
  });

  // Requisitions
  app.get("/api/requisitions", async (req, res) => {
    const requisitions = await storage.getRequisitions();
    res.json(requisitions);
  });

  app.get("/api/requisitions/:id", async (req, res) => {
    const req_ = await storage.getRequisition(parseInt(req.params.id));
    if (!req_) return res.status(404).json({ error: "Requisition not found" });
    res.json(req_);
  });

  app.post("/api/requisitions", requireAuth, async (req, res) => {
    try {
      const requisitionNumber = await generateRequisitionNumber();
      const validated = insertPurchaseRequisitionSchema.parse({
        ...req.body,
        requisitionNumber,
      });
      const requisition = await storage.createRequisition(validated);
      res.status(201).json(requisition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create requisition" });
    }
  });

  app.patch("/api/requisitions/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateRequisition(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Requisition not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update requisition" });
    }
  });

  // Purchase Orders
  app.get("/api/purchase-orders", async (req, res) => {
    const orders = await storage.getPurchaseOrders();
    res.json(orders);
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    const po = await storage.getPurchaseOrder(parseInt(req.params.id));
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    res.json(po);
  });

  app.post("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const poNumber = await generatePONumber();
      const validated = insertPurchaseOrderSchema.parse({
        ...req.body,
        poNumber,
      });
      const po = await storage.createPurchaseOrder(validated);
      res.status(201).json(po);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  app.patch("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updatePurchaseOrder(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Purchase order not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update purchase order" });
    }
  });

  // Manuals
  app.get("/api/manuals", async (req, res) => {
    const manuals = await storage.getManuals();
    res.json(manuals);
  });

  app.get("/api/manuals/:id", async (req, res) => {
    const manual = await storage.getManual(parseInt(req.params.id));
    if (!manual) return res.status(404).json({ error: "Manual not found" });
    res.json(manual);
  });

  app.post("/api/manuals", requireAuth, async (req, res) => {
    try {
      const validated = insertManualSchema.parse(req.body);
      const manual = await storage.createManual(validated);
      res.status(201).json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create manual" });
    }
  });

  app.patch("/api/manuals/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateManual(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Manual not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update manual" });
    }
  });

  // DVIRs
  app.get("/api/dvirs", async (req, res) => {
    const dvirs = await storage.getDvirs();
    res.json(dvirs);
  });

  app.get("/api/dvirs/:id", async (req, res) => {
    const dvir = await storage.getDvir(parseInt(req.params.id));
    if (!dvir) return res.status(404).json({ error: "DVIR not found" });
    res.json(dvir);
  });

  app.post("/api/dvirs", requireAuth, async (req, res) => {
    try {
      const validated = insertDvirSchema.parse(req.body);
      const dvir = await storage.createDvir(validated);
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

  // Feedback
  app.get("/api/feedback", async (req, res) => {
    const feedback = await storage.getFeedback();
    res.json(feedback);
  });

  app.get("/api/feedback/:id", async (req, res) => {
    const item = await storage.getFeedbackItem(parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    res.json(item);
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const validated = insertFeedbackSchema.parse({
        ...req.body,
        userId,
      });
      const item = await storage.createFeedback(validated);
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

  // Predictions
  app.get("/api/predictions", async (req, res) => {
    const predictions = await storage.getPredictions();
    res.json(predictions);
  });

  // Estimates
  app.get("/api/estimates", async (req, res) => {
    const estimates = await storage.getEstimates();
    res.json(estimates);
  });

  app.get("/api/estimates/:id", async (req, res) => {
    const estimate = await storage.getEstimate(parseInt(req.params.id));
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });
    res.json(estimate);
  });

  app.post("/api/estimates", requireAuth, async (req, res) => {
    try {
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
      const estimateNumber = await generateEstimateNumber();
      const estimate = await storage.createEstimate({
        ...parsed.data,
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

  app.patch("/api/estimates/:id", requireAuth, async (req, res) => {
    try {
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
      if (!updated) return res.status(404).json({ error: "Estimate not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.delete("/api/estimates/:id", requireAuth, async (req, res) => {
    try {
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

  // Unfulfilled Parts Widget
  app.get("/api/estimates/unfulfilled-parts", async (req, res) => {
    const lines = await storage.getUnfulfilledEstimateLines();
    res.json(lines);
  });

  return httpServer;
}
