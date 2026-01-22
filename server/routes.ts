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
    
    // Explicitly update actual cost and hours before returning
    // @ts-ignore
    await storage.updateWorkOrderActualCost(wo.id);
    
    // Re-fetch to get updated values
    const updatedWo = await storage.getWorkOrder(wo.id);
    res.json(updatedWo);
  });

  app.post("/api/work-orders", requireAuth, async (req, res) => {
    try {
      const workOrderNumber = await generateWorkOrderNumber();
      
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
      const requisition = await storage.createRequisition({
        ...validated,
        requestedById: (req.user as any)?.id || null,
      });
      res.status(201).json(requisition);
    } catch (error) {
      console.error("Requisition creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create requisition" });
    }
  });

  app.patch("/api/requisitions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const req_ = await storage.getRequisition(id);
      if (!req_) return res.status(404).json({ error: "Requisition not found" });

      const data = { ...req.body };
      if (data.approvedAt && typeof data.approvedAt === 'string') {
        data.approvedAt = new Date(data.approvedAt);
      }

      console.log("Updating requisition status to:", data.status);
      const updated = await storage.updateRequisition(id, data);
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

      const poNumber = await generatePONumber();
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

  app.patch("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
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
      if (!updated) return res.status(404).json({ error: "Purchase order not found" });
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
      const { quantityReceived } = req.body;

      // Validate input - must be a positive number
      const qtyToReceive = parseFloat(quantityReceived);
      if (!quantityReceived || isNaN(qtyToReceive) || qtyToReceive <= 0) {
        return res.status(400).json({ error: "Quantity must be a positive number" });
      }

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

      res.json(updatedLine);
    } catch (error) {
      console.error("Receive PO line error:", error);
      res.status(500).json({ error: "Failed to receive PO line" });
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

  // Estimates
  app.get("/api/estimates", async (req, res) => {
    const estimates = await storage.getEstimates();
    res.json(estimates);
  });

  // Unfulfilled Parts Widget - must be before :id route
  app.get("/api/estimates/unfulfilled-parts", async (req, res) => {
    const lines = await storage.getUnfulfilledEstimateLines();
    res.json(lines);
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

  // All predictions (for dashboard)
  app.get("/api/predictions", async (req, res) => {
    try {
      const predictions = await storage.getPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get predictions" });
    }
  });

  // Acknowledge/dismiss prediction
  app.patch("/api/predictions/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updatePrediction(parseInt(req.params.id), {
        acknowledged: true,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge prediction" });
    }
  });

  app.patch("/api/predictions/:id/dismiss", requireAuth, async (req, res) => {
    try {
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

  return httpServer;
}
