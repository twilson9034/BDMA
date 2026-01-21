import { eq, desc, sql, and, lt, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  locations,
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
  type User,
  type UpsertUser,
  type InsertLocation,
  type Location,
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
  
  // Assets
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  
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
  
  // Work Order Lines
  getWorkOrderLines(workOrderId: number): Promise<WorkOrderLine[]>;
  createWorkOrderLine(line: InsertWorkOrderLine): Promise<WorkOrderLine>;
  updateWorkOrderLine(id: number, line: Partial<InsertWorkOrderLine>): Promise<WorkOrderLine | undefined>;
  
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
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  
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

  // Work Order Lines
  async getWorkOrderLines(workOrderId: number): Promise<WorkOrderLine[]> {
    return db.select().from(workOrderLines).where(eq(workOrderLines.workOrderId, workOrderId)).orderBy(workOrderLines.lineNumber);
  }

  async createWorkOrderLine(line: InsertWorkOrderLine): Promise<WorkOrderLine> {
    const [created] = await db.insert(workOrderLines).values(line).returning();
    return created;
  }

  async updateWorkOrderLine(id: number, line: Partial<InsertWorkOrderLine>): Promise<WorkOrderLine | undefined> {
    const [updated] = await db.update(workOrderLines).set({ ...line, updatedAt: new Date() }).where(eq(workOrderLines.id, id)).returning();
    return updated;
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

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [created] = await db.insert(predictions).values(prediction).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
