import { eq, desc, sql, and, lt, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  locations,
  vmrsCodes,
  assets,
  vendors,
  parts,
  workOrders,
  workOrderLines,
  workOrderTransactions,
  pmSchedules,
  pmAssetInstances,
  purchaseRequisitions,
  purchaseRequisitionLines,
  purchaseOrders,
  purchaseOrderLines,
  manuals,
  manualSections,
  assetManuals,
  dvirs,
  dvirDefects,
  feedback,
  reorderAlerts,
  predictions,
  activityLogs,
  estimates,
  estimateLines,
  telematicsData,
  faultCodes,
  type User,
  type UpsertUser,
  type InsertLocation,
  type Location,
  type InsertVmrsCode,
  type VmrsCode,
  type InsertAsset,
  type Asset,
  type InsertVendor,
  type Vendor,
  type InsertPart,
  type Part,
  type InsertWorkOrder,
  type WorkOrder,
  type InsertWorkOrderLine,
  type WorkOrderLine,
  type InsertPmSchedule,
  type PmSchedule,
  type InsertPmAssetInstance,
  type PmAssetInstance,
  type InsertPurchaseRequisition,
  type PurchaseRequisition,
  type InsertPurchaseOrder,
  type PurchaseOrder,
  type InsertManual,
  type Manual,
  type InsertDvir,
  type Dvir,
  type InsertDvirDefect,
  type DvirDefect,
  type InsertFeedback,
  type Feedback,
  type InsertPrediction,
  type Prediction,
  type InsertActivityLog,
  type ActivityLog,
  type InsertEstimate,
  type Estimate,
  type InsertEstimateLine,
  type EstimateLine,
  type InsertTelematicsData,
  type TelematicsData,
  type InsertFaultCode,
  type FaultCode,
  type WorkOrderTransaction,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  
  // VMRS Codes
  getVmrsCodes(): Promise<VmrsCode[]>;
  getVmrsCode(id: number): Promise<VmrsCode | undefined>;
  createVmrsCode(vmrsCode: InsertVmrsCode): Promise<VmrsCode>;
  updateVmrsCode(id: number, vmrsCode: Partial<InsertVmrsCode>): Promise<VmrsCode | undefined>;
  deleteVmrsCode(id: number): Promise<void>;
  
  // Assets
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<void>;
  
  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  
  // Parts
  getParts(): Promise<Part[]>;
  getPart(id: number): Promise<Part | undefined>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined>;
  
  // Work Orders
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  getRecentWorkOrders(limit: number): Promise<WorkOrder[]>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: number, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined>;
  deleteWorkOrder(id: number): Promise<void>;
  
  // Work Order Lines
  getWorkOrderLines(workOrderId: number): Promise<WorkOrderLine[]>;
  getWorkOrderLine(id: number): Promise<WorkOrderLine | undefined>;
  createWorkOrderLine(line: InsertWorkOrderLine): Promise<WorkOrderLine>;
  updateWorkOrderLine(id: number, line: Partial<InsertWorkOrderLine>): Promise<WorkOrderLine | undefined>;
  deleteWorkOrderLine(id: number): Promise<void>;
  getNextWorkOrderLineNumber(workOrderId: number): Promise<number>;
  requestPartForLine(lineId: number, partId: number, quantity: number): Promise<void>;
  
  // PM Schedules
  getPmSchedules(): Promise<PmSchedule[]>;
  getPmSchedule(id: number): Promise<PmSchedule | undefined>;
  createPmSchedule(schedule: InsertPmSchedule): Promise<PmSchedule>;
  updatePmSchedule(id: number, schedule: Partial<InsertPmSchedule>): Promise<PmSchedule | undefined>;
  
  // PM Asset Instances
  getPmAssetInstances(): Promise<PmAssetInstance[]>;
  createPmAssetInstance(instance: InsertPmAssetInstance): Promise<PmAssetInstance>;
  
  // Purchase Requisitions
  getRequisitions(): Promise<PurchaseRequisition[]>;
  getRequisition(id: number): Promise<PurchaseRequisition | undefined>;
  createRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition>;
  updateRequisition(id: number, requisition: Partial<InsertPurchaseRequisition>): Promise<PurchaseRequisition | undefined>;
  
  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  
  // Manuals
  getManuals(): Promise<Manual[]>;
  getManual(id: number): Promise<Manual | undefined>;
  createManual(manual: InsertManual): Promise<Manual>;
  updateManual(id: number, manual: Partial<InsertManual>): Promise<Manual | undefined>;
  
  // DVIRs
  getDvirs(): Promise<Dvir[]>;
  getDvir(id: number): Promise<Dvir | undefined>;
  createDvir(dvir: InsertDvir): Promise<Dvir>;
  
  // DVIR Defects
  getDvirDefects(dvirId: number): Promise<DvirDefect[]>;
  createDvirDefect(defect: InsertDvirDefect): Promise<DvirDefect>;
  
  // Feedback
  getFeedback(): Promise<Feedback[]>;
  getFeedbackItem(id: number): Promise<Feedback | undefined>;
  createFeedback(item: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, item: Partial<InsertFeedback>): Promise<Feedback | undefined>;
  voteFeedback(id: number): Promise<Feedback | undefined>;
  
  // Predictions
  getPredictions(): Promise<Prediction[]>;
  getPrediction(id: number): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: number, prediction: Partial<InsertPrediction>): Promise<Prediction | undefined>;
  
  // Telematics Data
  getTelematicsData(assetId: number): Promise<TelematicsData[]>;
  getLatestTelematicsData(assetId: number): Promise<TelematicsData | undefined>;
  createTelematicsData(data: InsertTelematicsData): Promise<TelematicsData>;
  
  // Fault Codes
  getFaultCodes(assetId?: number): Promise<FaultCode[]>;
  getActiveFaultCodes(assetId?: number): Promise<FaultCode[]>;
  getFaultCode(id: number): Promise<FaultCode | undefined>;
  createFaultCode(code: InsertFaultCode): Promise<FaultCode>;
  updateFaultCode(id: number, code: Partial<InsertFaultCode>): Promise<FaultCode | undefined>;

  // Estimates
  getEstimates(): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, estimate: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: number): Promise<void>;
  
  // Estimate Lines
  getEstimateLines(estimateId: number): Promise<EstimateLine[]>;
  getEstimateLine(id: number): Promise<EstimateLine | undefined>;
  createEstimateLine(line: InsertEstimateLine): Promise<EstimateLine>;
  updateEstimateLine(id: number, line: Partial<InsertEstimateLine>): Promise<EstimateLine | undefined>;
  deleteEstimateLine(id: number): Promise<void>;
  getUnfulfilledEstimateLines(): Promise<EstimateLine[]>;
  
  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalAssets: number;
    operationalAssets: number;
    inMaintenanceAssets: number;
    downAssets: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    partsLowStock: number;
    pmDueThisWeek: number;
  }>;
  
  // Additional methods for Phase 3
  getWorkOrdersByAsset(assetId: number): Promise<WorkOrder[]>;
  getAssetByNumber(assetNumber: string): Promise<Asset | undefined>;
  getPartByBarcode(barcode: string): Promise<Part | undefined>;
  getPartByNumber(partNumber: string): Promise<Part | undefined>;
  getWorkOrderByNumber(workOrderNumber: string): Promise<WorkOrder | undefined>;
  getLowStockParts(): Promise<Part[]>;
  getPredictionsByAsset(assetId: number): Promise<Prediction[]>;
  consumePartFromInventory(partId: number, quantity: number, workOrderId: number, lineId: number): Promise<void>;
  getWorkOrderTransactions(workOrderId: number): Promise<WorkOrderTransaction[]>;
  getLineTransactions(lineId: number): Promise<WorkOrderTransaction[]>;
  addLineItem(lineId: number, data: { description: string; quantity: number; unitCost: number; partId?: number }): Promise<void>;
  getSimilarAssets(manufacturer: string, model: string, excludeAssetId: number): Promise<Asset[]>;
  getFleetPartReplacementPatterns(): Promise<{ partId: number; partNumber: string; partName: string; replacementCount: number; avgMeterReading: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return db.select().from(locations).orderBy(locations.name);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [created] = await db.insert(locations).values(location).returning();
    return created;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updated] = await db.update(locations).set({ ...location, updatedAt: new Date() }).where(eq(locations.id, id)).returning();
    return updated;
  }

  // VMRS Codes
  async getVmrsCodes(): Promise<VmrsCode[]> {
    return db.select().from(vmrsCodes).where(eq(vmrsCodes.isActive, true)).orderBy(vmrsCodes.code);
  }

  async getVmrsCode(id: number): Promise<VmrsCode | undefined> {
    const [code] = await db.select().from(vmrsCodes).where(eq(vmrsCodes.id, id));
    return code;
  }

  async createVmrsCode(vmrsCode: InsertVmrsCode): Promise<VmrsCode> {
    const [created] = await db.insert(vmrsCodes).values(vmrsCode).returning();
    return created;
  }

  async updateVmrsCode(id: number, vmrsCode: Partial<InsertVmrsCode>): Promise<VmrsCode | undefined> {
    const [updated] = await db.update(vmrsCodes).set({ ...vmrsCode, updatedAt: new Date() }).where(eq(vmrsCodes.id, id)).returning();
    return updated;
  }

  async deleteVmrsCode(id: number): Promise<void> {
    await db.update(vmrsCodes).set({ isActive: false, updatedAt: new Date() }).where(eq(vmrsCodes.id, id));
  }

  // Assets
  async getAssets(): Promise<Asset[]> {
    return db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [created] = await db.insert(assets).values(asset).returning();
    return created;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [updated] = await db.update(assets).set({ ...asset, updatedAt: new Date() }).where(eq(assets.id, id)).returning();
    return updated;
  }

  async deleteAsset(id: number): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return db.select().from(vendors).orderBy(vendors.name);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set({ ...vendor, updatedAt: new Date() }).where(eq(vendors.id, id)).returning();
    return updated;
  }

  // Parts
  async getParts(): Promise<Part[]> {
    return db.select().from(parts).orderBy(parts.name);
  }

  async getPart(id: number): Promise<Part | undefined> {
    const [part] = await db.select().from(parts).where(eq(parts.id, id));
    return part;
  }

  async createPart(part: InsertPart): Promise<Part> {
    const [created] = await db.insert(parts).values(part).returning();
    return created;
  }

  async updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined> {
    const [updated] = await db.update(parts).set({ ...part, updatedAt: new Date() }).where(eq(parts.id, id)).returning();
    return updated;
  }

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    return db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return wo;
  }

  async getRecentWorkOrders(limit: number = 10): Promise<WorkOrder[]> {
    return db.select().from(workOrders).orderBy(desc(workOrders.createdAt)).limit(limit);
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [created] = await db.insert(workOrders).values(workOrder).returning();
    
    // Auto-update asset status to "in_maintenance" when work order is created
    if (workOrder.assetId && workOrder.status !== "completed" && workOrder.status !== "cancelled") {
      await db.update(assets)
        .set({ status: "in_maintenance", updatedAt: new Date() })
        .where(eq(assets.id, workOrder.assetId));
    }
    
    return created;
  }

  async updateWorkOrder(id: number, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    const [updated] = await db.update(workOrders).set({ ...workOrder, updatedAt: new Date() }).where(eq(workOrders.id, id)).returning();
    
    // Auto-update asset status when work order is completed
    if (updated && updated.assetId && (workOrder.status === "completed" || workOrder.status === "cancelled")) {
      // Check if there are other open work orders for this asset
      const openWOs = await db.select()
        .from(workOrders)
        .where(and(
          eq(workOrders.assetId, updated.assetId),
          sql`${workOrders.status} NOT IN ('completed', 'cancelled')`,
          sql`${workOrders.id} != ${id}`
        ));
      
      if (openWOs.length === 0) {
        // No other open work orders, set asset back to operational
        await db.update(assets)
          .set({ status: "operational", updatedAt: new Date() })
          .where(eq(assets.id, updated.assetId));
      }
    }
    
    return updated;
  }

  async deleteWorkOrder(id: number): Promise<void> {
    await db.delete(workOrders).where(eq(workOrders.id, id));
  }

  // Work Order Lines
  async getWorkOrderLines(workOrderId: number): Promise<WorkOrderLine[]> {
    return db.select().from(workOrderLines).where(eq(workOrderLines.workOrderId, workOrderId)).orderBy(workOrderLines.lineNumber);
  }

  async getWorkOrderLine(id: number): Promise<WorkOrderLine | undefined> {
    const [line] = await db.select().from(workOrderLines).where(eq(workOrderLines.id, id));
    return line;
  }

  async createWorkOrderLine(line: InsertWorkOrderLine): Promise<WorkOrderLine> {
    const [created] = await db.insert(workOrderLines).values(line).returning();
    return created;
  }

  async updateWorkOrderLine(id: number, line: Partial<InsertWorkOrderLine>): Promise<WorkOrderLine | undefined> {
    const [updated] = await db.update(workOrderLines).set({ ...line, updatedAt: new Date() }).where(eq(workOrderLines.id, id)).returning();
    return updated;
  }

  async deleteWorkOrderLine(id: number): Promise<void> {
    await db.delete(workOrderLines).where(eq(workOrderLines.id, id));
  }

  async getNextWorkOrderLineNumber(workOrderId: number): Promise<number> {
    const lines = await db.select({ lineNumber: workOrderLines.lineNumber })
      .from(workOrderLines)
      .where(eq(workOrderLines.workOrderId, workOrderId))
      .orderBy(desc(workOrderLines.lineNumber))
      .limit(1);
    return lines.length > 0 ? lines[0].lineNumber + 1 : 1;
  }

  // PM Schedules
  async getPmSchedules(): Promise<PmSchedule[]> {
    return db.select().from(pmSchedules).orderBy(pmSchedules.name);
  }

  async getPmSchedule(id: number): Promise<PmSchedule | undefined> {
    const [schedule] = await db.select().from(pmSchedules).where(eq(pmSchedules.id, id));
    return schedule;
  }

  async createPmSchedule(schedule: InsertPmSchedule): Promise<PmSchedule> {
    const [created] = await db.insert(pmSchedules).values(schedule).returning();
    return created;
  }

  async updatePmSchedule(id: number, schedule: Partial<InsertPmSchedule>): Promise<PmSchedule | undefined> {
    const [updated] = await db.update(pmSchedules).set({ ...schedule, updatedAt: new Date() }).where(eq(pmSchedules.id, id)).returning();
    return updated;
  }

  // PM Asset Instances
  async getPmAssetInstances(): Promise<PmAssetInstance[]> {
    return db.select().from(pmAssetInstances);
  }

  async createPmAssetInstance(instance: InsertPmAssetInstance): Promise<PmAssetInstance> {
    const [created] = await db.insert(pmAssetInstances).values(instance).returning();
    return created;
  }

  // Purchase Requisitions
  async getRequisitions(): Promise<PurchaseRequisition[]> {
    return db.select().from(purchaseRequisitions).orderBy(desc(purchaseRequisitions.createdAt));
  }

  async getRequisition(id: number): Promise<PurchaseRequisition | undefined> {
    const [req] = await db.select().from(purchaseRequisitions).where(eq(purchaseRequisitions.id, id));
    return req;
  }

  async createRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition> {
    const [created] = await db.insert(purchaseRequisitions).values(requisition).returning();
    return created;
  }

  async updateRequisition(id: number, requisition: Partial<InsertPurchaseRequisition>): Promise<PurchaseRequisition | undefined> {
    const [updated] = await db.update(purchaseRequisitions).set({ ...requisition, updatedAt: new Date() }).where(eq(purchaseRequisitions.id, id)).returning();
    return updated;
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [created] = await db.insert(purchaseOrders).values(po).returning();
    return created;
  }

  async updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [updated] = await db.update(purchaseOrders).set({ ...po, updatedAt: new Date() }).where(eq(purchaseOrders.id, id)).returning();
    return updated;
  }

  // Manuals
  async getManuals(): Promise<Manual[]> {
    return db.select().from(manuals).orderBy(desc(manuals.createdAt));
  }

  async getManual(id: number): Promise<Manual | undefined> {
    const [manual] = await db.select().from(manuals).where(eq(manuals.id, id));
    return manual;
  }

  async createManual(manual: InsertManual): Promise<Manual> {
    const [created] = await db.insert(manuals).values(manual).returning();
    return created;
  }

  async updateManual(id: number, manual: Partial<InsertManual>): Promise<Manual | undefined> {
    const [updated] = await db.update(manuals).set({ ...manual, updatedAt: new Date() }).where(eq(manuals.id, id)).returning();
    return updated;
  }

  // DVIRs
  async getDvirs(): Promise<Dvir[]> {
    return db.select().from(dvirs).orderBy(desc(dvirs.inspectionDate));
  }

  async getDvir(id: number): Promise<Dvir | undefined> {
    const [dvir] = await db.select().from(dvirs).where(eq(dvirs.id, id));
    return dvir;
  }

  async createDvir(dvir: InsertDvir): Promise<Dvir> {
    const [created] = await db.insert(dvirs).values(dvir).returning();
    return created;
  }

  // DVIR Defects
  async getDvirDefects(dvirId: number): Promise<DvirDefect[]> {
    return db.select().from(dvirDefects).where(eq(dvirDefects.dvirId, dvirId));
  }

  async createDvirDefect(defect: InsertDvirDefect): Promise<DvirDefect> {
    const [created] = await db.insert(dvirDefects).values(defect).returning();
    return created;
  }

  // Feedback
  async getFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async getFeedbackItem(id: number): Promise<Feedback | undefined> {
    const [item] = await db.select().from(feedback).where(eq(feedback.id, id));
    return item;
  }

  async createFeedback(item: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values(item).returning();
    return created;
  }

  async updateFeedback(id: number, item: Partial<InsertFeedback>): Promise<Feedback | undefined> {
    const [updated] = await db.update(feedback).set({ ...item, updatedAt: new Date() }).where(eq(feedback.id, id)).returning();
    return updated;
  }

  async voteFeedback(id: number): Promise<Feedback | undefined> {
    const [updated] = await db.update(feedback)
      .set({ votes: sql`COALESCE(${feedback.votes}, 0) + 1`, updatedAt: new Date() })
      .where(eq(feedback.id, id))
      .returning();
    return updated;
  }

  // Predictions
  async getPredictions(): Promise<Prediction[]> {
    return db.select().from(predictions).orderBy(desc(predictions.createdAt));
  }

  async getPrediction(id: number): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, id));
    return prediction;
  }

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [created] = await db.insert(predictions).values(prediction).returning();
    return created;
  }

  async updatePrediction(id: number, prediction: Partial<InsertPrediction>): Promise<Prediction | undefined> {
    const [updated] = await db.update(predictions).set(prediction).where(eq(predictions.id, id)).returning();
    return updated;
  }

  // Telematics Data
  async getTelematicsData(assetId: number): Promise<TelematicsData[]> {
    return db.select().from(telematicsData).where(eq(telematicsData.assetId, assetId)).orderBy(desc(telematicsData.timestamp)).limit(100);
  }

  async getLatestTelematicsData(assetId: number): Promise<TelematicsData | undefined> {
    const [data] = await db.select().from(telematicsData).where(eq(telematicsData.assetId, assetId)).orderBy(desc(telematicsData.timestamp)).limit(1);
    return data;
  }

  async createTelematicsData(data: InsertTelematicsData): Promise<TelematicsData> {
    const [created] = await db.insert(telematicsData).values(data).returning();
    return created;
  }

  // Fault Codes
  async getFaultCodes(assetId?: number): Promise<FaultCode[]> {
    if (assetId) {
      return db.select().from(faultCodes).where(eq(faultCodes.assetId, assetId)).orderBy(desc(faultCodes.occurredAt));
    }
    return db.select().from(faultCodes).orderBy(desc(faultCodes.occurredAt));
  }

  async getActiveFaultCodes(assetId?: number): Promise<FaultCode[]> {
    if (assetId) {
      return db.select().from(faultCodes).where(and(eq(faultCodes.assetId, assetId), eq(faultCodes.status, "active"))).orderBy(desc(faultCodes.occurredAt));
    }
    return db.select().from(faultCodes).where(eq(faultCodes.status, "active")).orderBy(desc(faultCodes.occurredAt));
  }

  async getFaultCode(id: number): Promise<FaultCode | undefined> {
    const [code] = await db.select().from(faultCodes).where(eq(faultCodes.id, id));
    return code;
  }

  async createFaultCode(code: InsertFaultCode): Promise<FaultCode> {
    const [created] = await db.insert(faultCodes).values(code).returning();
    return created;
  }

  async updateFaultCode(id: number, code: Partial<InsertFaultCode>): Promise<FaultCode | undefined> {
    const [updated] = await db.update(faultCodes).set(code).where(eq(faultCodes.id, id)).returning();
    return updated;
  }

  // Estimates
  async getEstimates(): Promise<Estimate[]> {
    return db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));
    return estimate;
  }

  async createEstimate(estimate: InsertEstimate): Promise<Estimate> {
    const [created] = await db.insert(estimates).values(estimate).returning();
    return created;
  }

  async updateEstimate(id: number, estimate: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const [updated] = await db.update(estimates).set({ ...estimate, updatedAt: new Date() }).where(eq(estimates.id, id)).returning();
    return updated;
  }

  async deleteEstimate(id: number): Promise<void> {
    await db.delete(estimates).where(eq(estimates.id, id));
  }

  // Estimate Lines
  async getEstimateLines(estimateId: number): Promise<EstimateLine[]> {
    return db.select().from(estimateLines).where(eq(estimateLines.estimateId, estimateId)).orderBy(estimateLines.lineNumber);
  }

  async createEstimateLine(line: InsertEstimateLine): Promise<EstimateLine> {
    const [created] = await db.insert(estimateLines).values(line).returning();
    return created;
  }

  async updateEstimateLine(id: number, line: Partial<InsertEstimateLine>): Promise<EstimateLine | undefined> {
    const [updated] = await db.update(estimateLines).set({ ...line, updatedAt: new Date() }).where(eq(estimateLines.id, id)).returning();
    return updated;
  }

  async getEstimateLine(id: number): Promise<EstimateLine | undefined> {
    const [line] = await db.select().from(estimateLines).where(eq(estimateLines.id, id));
    return line;
  }

  async deleteEstimateLine(id: number): Promise<void> {
    await db.delete(estimateLines).where(eq(estimateLines.id, id));
  }

  async getUnfulfilledEstimateLines(): Promise<EstimateLine[]> {
    return db.select().from(estimateLines).where(eq(estimateLines.needsOrdering, true));
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  // Dashboard Stats
  async getDashboardStats() {
    const allAssets = await db.select().from(assets);
    const allWorkOrders = await db.select().from(workOrders);
    const allParts = await db.select().from(parts);
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalAssets: allAssets.length,
      operationalAssets: allAssets.filter(a => a.status === "operational").length,
      inMaintenanceAssets: allAssets.filter(a => a.status === "in_maintenance").length,
      downAssets: allAssets.filter(a => a.status === "down").length,
      openWorkOrders: allWorkOrders.filter(w => w.status === "open" || w.status === "in_progress").length,
      overdueWorkOrders: allWorkOrders.filter(w => 
        (w.status === "open" || w.status === "in_progress") && 
        w.dueDate && new Date(w.dueDate) < now
      ).length,
      partsLowStock: allParts.filter(p => 
        Number(p.quantityOnHand || 0) <= Number(p.reorderPoint || 0)
      ).length,
      pmDueThisWeek: 8, // Would calculate from pmAssetInstances
    };
  }

  // Phase 3 methods
  async getWorkOrdersByAsset(assetId: number): Promise<WorkOrder[]> {
    return db.select().from(workOrders).where(eq(workOrders.assetId, assetId)).orderBy(desc(workOrders.createdAt));
  }

  async getAssetByNumber(assetNumber: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.assetNumber, assetNumber));
    return asset;
  }

  async getPartByBarcode(barcode: string): Promise<Part | undefined> {
    const [part] = await db.select().from(parts).where(eq(parts.barcode, barcode));
    return part;
  }

  async getPartByNumber(partNumber: string): Promise<Part | undefined> {
    const [part] = await db.select().from(parts).where(eq(parts.partNumber, partNumber));
    return part;
  }

  async getWorkOrderByNumber(workOrderNumber: string): Promise<WorkOrder | undefined> {
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.workOrderNumber, workOrderNumber));
    return wo;
  }

  async getLowStockParts(): Promise<Part[]> {
    const allParts = await db.select().from(parts);
    return allParts.filter(p => 
      Number(p.quantityOnHand || 0) <= Number(p.reorderPoint || 0) && p.isActive
    );
  }

  async getPredictionsByAsset(assetId: number): Promise<Prediction[]> {
    return db.select().from(predictions).where(eq(predictions.assetId, assetId)).orderBy(desc(predictions.createdAt));
  }

  async consumePartFromInventory(partId: number, quantity: number, workOrderId: number, lineId: number): Promise<void> {
    const part = await this.getPart(partId);
    if (!part) throw new Error("Part not found");
    
    const currentQty = Number(part.quantityOnHand || 0);
    const newQty = Math.max(0, currentQty - quantity);
    
    await db.update(parts).set({ 
      quantityOnHand: String(newQty),
      updatedAt: new Date()
    }).where(eq(parts.id, partId));
    
    // Create a transaction record for the consumption
    await db.insert(workOrderTransactions).values({
      workOrderId,
      workOrderLineId: lineId,
      type: "part_consumption",
      partId,
      quantity: String(quantity),
      unitCost: part.unitCost,
      totalCost: String(Number(part.unitCost || 0) * quantity),
      description: `Consumed ${quantity} x ${part.partNumber}`,
    });

    // Update line parts cost and status
    const [line] = await db.select().from(workOrderLines).where(eq(workOrderLines.id, lineId));
    if (line) {
      const currentPartsCost = Number(line.partsCost || 0);
      const addedCost = Number(part.unitCost || 0) * quantity;
      await db.update(workOrderLines)
        .set({ 
          partsCost: String(currentPartsCost + addedCost),
          partRequestStatus: "posted",
          updatedAt: new Date() 
        })
        .where(eq(workOrderLines.id, lineId));
    }
  }

  async requestPartForLine(lineId: number, partId: number, quantity: number): Promise<void> {
    const line = await this.getWorkOrderLine(lineId);
    if (!line) throw new Error("Line not found");

    await db.update(workOrderLines)
      .set({ 
        partRequestStatus: "requested",
        updatedAt: new Date() 
      })
      .where(eq(workOrderLines.id, lineId));

    // Create a transaction record for the request
    await db.insert(workOrderTransactions).values({
      workOrderId: line.workOrderId,
      workOrderLineId: lineId,
      type: "note",
      partId,
      quantity: String(quantity),
      description: `Requested part ID ${partId} (Qty: ${quantity}) for line ${lineId}`,
    });
  }

  async getWorkOrderTransactions(workOrderId: number): Promise<WorkOrderTransaction[]> {
    return db.select().from(workOrderTransactions).where(eq(workOrderTransactions.workOrderId, workOrderId)).orderBy(desc(workOrderTransactions.createdAt));
  }

  async getLineTransactions(lineId: number): Promise<WorkOrderTransaction[]> {
    return db.select().from(workOrderTransactions).where(eq(workOrderTransactions.workOrderLineId, lineId)).orderBy(desc(workOrderTransactions.createdAt));
  }

  async addLineItem(lineId: number, data: { description: string; quantity: number; unitCost: number; partId?: number }): Promise<void> {
    const line = await this.getWorkOrderLine(lineId);
    if (!line) throw new Error("Line not found");

    const totalCost = data.quantity * data.unitCost;

    await db.insert(workOrderTransactions).values({
      workOrderId: line.workOrderId,
      workOrderLineId: lineId,
      type: "part_consumption",
      partId: data.partId || null,
      quantity: String(data.quantity),
      unitCost: String(data.unitCost),
      totalCost: String(totalCost),
      description: data.description,
    });

    const currentPartsCost = Number(line.partsCost || 0);
    await db.update(workOrderLines)
      .set({ 
        partsCost: String(currentPartsCost + totalCost),
        updatedAt: new Date() 
      })
      .where(eq(workOrderLines.id, lineId));

    if (data.partId) {
      const part = await this.getPart(data.partId);
      if (part) {
        const newQty = Math.max(0, Number(part.quantityOnHand || 0) - data.quantity);
        await db.update(parts)
          .set({ quantityOnHand: String(newQty), updatedAt: new Date() })
          .where(eq(parts.id, data.partId));
      }
    }

    // Update work order total actual cost
    await this.updateWorkOrderActualCost(line.workOrderId);
  }

  async updateWorkOrderActualCost(workOrderId: number): Promise<void> {
    const transactions = await this.getWorkOrderTransactions(workOrderId);
    const lines = await db.select().from(workOrderLines).where(eq(workOrderLines.workOrderId, workOrderId));
    
    // Total parts cost from transactions
    const totalPartsCost = transactions.reduce((sum, t) => sum + Number(t.totalCost || 0), 0);
    
    // Total labor hours from lines
    const totalLaborHours = lines.reduce((sum, l) => sum + Number(l.laborHours || 0), 0);
    
    // Assuming a default labor rate if not specified (could be expanded to use a setting)
    const laborRate = 125; 
    const totalLaborCost = totalLaborHours * laborRate;
    
    await db.update(workOrders)
      .set({ 
        actualCost: String(totalPartsCost + totalLaborCost),
        actualHours: String(totalLaborHours),
        updatedAt: new Date() 
      })
      .where(eq(workOrders.id, workOrderId));
  }

  async getSimilarAssets(manufacturer: string, model: string, excludeAssetId: number): Promise<Asset[]> {
    return db.select().from(assets)
      .where(and(
        eq(assets.manufacturer, manufacturer),
        eq(assets.model, model),
        sql`${assets.id} != ${excludeAssetId}`
      ));
  }

  async getFleetPartReplacementPatterns(): Promise<{ partId: number; partNumber: string; partName: string; replacementCount: number; avgMeterReading: number }[]> {
    const result = await db.select({
      partId: workOrderTransactions.partId,
      partNumber: parts.partNumber,
      partName: parts.name,
      replacementCount: sql<number>`count(*)::int`,
    })
    .from(workOrderTransactions)
    .innerJoin(parts, eq(workOrderTransactions.partId, parts.id))
    .where(eq(workOrderTransactions.type, "part_consumption"))
    .groupBy(workOrderTransactions.partId, parts.partNumber, parts.name)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

    return result.map(r => ({
      partId: r.partId!,
      partNumber: r.partNumber,
      partName: r.partName,
      replacementCount: r.replacementCount,
      avgMeterReading: 0,
    }));
  }
}

export const storage = new DatabaseStorage();
