import { eq, desc, sql, and, or, lt, lte, isNull } from "drizzle-orm";
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
  checklistTemplates,
  checklistMakeModelAssignments,
  receivingTransactions,
  partRequests,
  partKits,
  partKitLines,
  pmScheduleKits,
  cycleCounts,
  assetImages,
  assetDocuments,
  type User,
  type UpsertUser,
  type InsertLocation,
  type Location,
  type InsertVmrsCode,
  type VmrsCode,
  type InsertAsset,
  type Asset,
  type InsertAssetImage,
  type AssetImage,
  type InsertAssetDocument,
  type AssetDocument,
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
  type InsertPurchaseRequisitionLine,
  type PurchaseRequisitionLine,
  type InsertPurchaseOrderLine,
  type PurchaseOrderLine,
  type InsertChecklistTemplate,
  type ChecklistTemplate,
  type InsertChecklistMakeModelAssignment,
  type ChecklistMakeModelAssignment,
  type InsertReceivingTransaction,
  type ReceivingTransaction,
  type InsertPartRequest,
  type PartRequest,
  type InsertPartKit,
  type PartKit,
  type InsertPartKitLine,
  type PartKitLine,
  type InsertPmScheduleKit,
  type PmScheduleKit,
  type InsertCycleCount,
  type CycleCount,
  importJobs,
  type InsertImportJob,
  type ImportJob,
  partUsageHistory,
  type InsertPartUsageHistory,
  type PartUsageHistory,
  laborEntries,
  type InsertLaborEntry,
  type LaborEntry,
  notifications,
  type InsertNotification,
  type Notification,
  organizations,
  orgMemberships,
  memberLocations,
  tires,
  conversations,
  messages,
  savedReports,
  gpsLocations,
  tireReplacementSettings,
  publicAssetTokens,
  type Organization,
  type OrgMembership,
  type MemberLocation,
  type InsertMemberLocation,
  type Tire,
  type InsertTire,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type SavedReport,
  type InsertSavedReport,
  type GpsLocation,
  type InsertGpsLocation,
  type TireReplacementSetting,
  type InsertTireReplacementSetting,
  type PublicAssetToken,
  type InsertPublicAssetToken,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(data: { name: string; slug: string; plan?: string }): Promise<Organization>;
  createOrgMembership(data: { userId: string; orgId: number; role: string; isDefault?: boolean; primaryLocationId?: number | null }): Promise<OrgMembership>;
  getUserOrganizations(userId: string): Promise<Array<{ org: Organization; membership: OrgMembership }>>;
  updateOrganization(id: number, data: Partial<{ name: string; slug: string }>): Promise<Organization | undefined>;
  getOrgMembers(orgId: number): Promise<Array<{
    id: number;
    userId: string;
    role: string;
    joinedAt: Date | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  }>>;
  getOrgMembership(orgId: number, userId: string): Promise<OrgMembership | undefined>;
  updateOrgMemberRole(memberId: number, role: string): Promise<OrgMembership | undefined>;
  updateMemberPrimaryLocation(memberId: number, primaryLocationId: number | null): Promise<OrgMembership | undefined>;
  getMemberLocations(membershipId: number): Promise<MemberLocation[]>;
  addMemberLocation(data: InsertMemberLocation): Promise<MemberLocation>;
  removeMemberLocation(membershipId: number, locationId: number): Promise<void>;
  countOrgOwners(orgId: number): Promise<number>;
  getSubsidiaryOrgs(parentOrgId: number): Promise<Organization[]>;
  setParentOrg(orgId: number, parentOrgId: number | null): Promise<Organization | undefined>;
  getOrgsForCorporateAdmin(userId: string): Promise<Organization[]>;
  updateMemberCorporateAdmin(orgId: number, memberId: number, isCorporateAdmin: boolean): Promise<OrgMembership | undefined>;
  hasCorporateAdminMembership(userId: string): Promise<boolean>;
  getAllOrganizations(): Promise<Organization[]>;
  isOwnerOfAnyOrg(userId: string): Promise<boolean>;
  
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
  batchUpdateAssetMeters(updates: Array<{ assetId: number; meterReading: string; meterType?: string }>): Promise<Asset[]>;
  
  // Asset Images
  getAssetImages(assetId: number): Promise<AssetImage[]>;
  getAssetImage(id: number): Promise<AssetImage | undefined>;
  createAssetImage(image: InsertAssetImage): Promise<AssetImage>;
  deleteAssetImage(id: number): Promise<void>;
  setPrimaryAssetImage(assetId: number, imageId: number): Promise<void>;
  
  // Asset Documents
  getAssetDocuments(assetId: number): Promise<AssetDocument[]>;
  getAssetDocument(id: number): Promise<AssetDocument | undefined>;
  createAssetDocument(document: InsertAssetDocument): Promise<AssetDocument>;
  updateAssetDocument(id: number, document: Partial<InsertAssetDocument>): Promise<AssetDocument | undefined>;
  deleteAssetDocument(id: number): Promise<void>;
  
  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  
  // Parts
  getParts(): Promise<Part[]>;
  getPartsPaginated(options: { limit: number; offset: number; search?: string }): Promise<{ parts: Part[]; total: number }>;
  getPart(id: number): Promise<Part | undefined>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined>;
  getPartsByOrgPaginated(orgId: number, options: { limit: number; offset: number; search?: string }): Promise<{ parts: Part[]; total: number }>;
  
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
  getRescheduledLines(): Promise<WorkOrderLine[]>;
  getRescheduledLinesToWorkOrder(workOrderId: number): Promise<WorkOrderLine[]>;
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
  
  // Purchase Requisition Lines
  getRequisitionLines(requisitionId: number): Promise<PurchaseRequisitionLine[]>;
  createRequisitionLine(line: InsertPurchaseRequisitionLine): Promise<PurchaseRequisitionLine>;
  updateRequisitionLine(id: number, line: Partial<InsertPurchaseRequisitionLine>): Promise<PurchaseRequisitionLine | undefined>;
  deleteRequisitionLine(id: number): Promise<void>;
  
  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  
  // Purchase Order Lines
  getPurchaseOrderLines(poId: number): Promise<PurchaseOrderLine[]>;
  getPurchaseOrderLine(id: number): Promise<PurchaseOrderLine | undefined>;
  createPurchaseOrderLine(line: InsertPurchaseOrderLine): Promise<PurchaseOrderLine>;
  updatePurchaseOrderLine(id: number, line: Partial<InsertPurchaseOrderLine>): Promise<PurchaseOrderLine | undefined>;
  deletePurchaseOrderLine(id: number): Promise<void>;
  
  // Manuals
  getManuals(): Promise<Manual[]>;
  getManual(id: number): Promise<Manual | undefined>;
  getManualsByMakeModel(manufacturer: string, model?: string): Promise<Manual[]>;
  getManualSections(manualId: number): Promise<ManualSection[]>;
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

  getKpiMetrics(): Promise<{
    mttr: number | null; // Mean Time To Repair in hours
    mtbf: number | null; // Mean Time Between Failures in days
    assetUptime: number; // Percentage
    pmCompliance: number; // Percentage
    emergencyWoRatio: number; // Percentage
    avgCostPerWo: number;
  }>;

  getProcurementOverview(): Promise<{
    pendingRequisitions: number;
    activePurchaseOrders: number;
    reorderAlerts: number;
    pendingPartRequests: number;
  }>;

  getPartsAnalytics(): Promise<{
    topUsedParts: Array<{
      partId: number;
      partNumber: string;
      partName: string;
      usageCount: number;
      totalCost: number;
    }>;
    lowStockCritical: number;
  }>;
  
  getTireHealthStats(orgId?: number): Promise<{
    totalTires: number;
    healthyTires: number;
    warningTires: number;
    criticalTires: number;
    averageTreadDepth: number;
    tiresNeedingReplacement: Array<{
      id: number;
      serialNumber: string;
      assetName: string;
      position: string;
      treadDepth: number;
      condition: string;
    }>;
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
  getTransaction(id: number): Promise<WorkOrderTransaction | undefined>;
  reverseTransaction(transactionId: number, performedById: string | null, reason: string): Promise<WorkOrderTransaction>;
  addLineItem(lineId: number, data: { description: string; quantity: number; unitCost: number; partId?: number }): Promise<void>;
  getSimilarAssets(manufacturer: string, model: string, excludeAssetId: number): Promise<Asset[]>;
  getFleetPartReplacementPatterns(): Promise<{ partId: number; partNumber: string; partName: string; replacementCount: number; avgMeterReading: number }[]>;

  // Labor Entries (Multi-user Time Tracking)
  getLaborEntries(workOrderId: number): Promise<LaborEntry[]>;
  getLaborEntry(id: number): Promise<LaborEntry | undefined>;
  getActiveLaborEntries(userId: string): Promise<LaborEntry[]>;
  createLaborEntry(entry: InsertLaborEntry): Promise<LaborEntry>;
  updateLaborEntry(id: number, entry: Partial<InsertLaborEntry>): Promise<LaborEntry | undefined>;
  completeLaborEntry(id: number): Promise<LaborEntry | undefined>;
  deleteLaborEntry(id: number): Promise<void>;

  // Checklist Templates
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: number): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: number, template: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined>;
  deleteChecklistTemplate(id: number): Promise<void>;
  
  // Checklist Make/Model Assignments
  getChecklistAssignments(templateId?: number): Promise<ChecklistMakeModelAssignment[]>;
  getChecklistsForAsset(manufacturer: string, model: string, assetType: string): Promise<ChecklistTemplate[]>;
  createChecklistAssignment(assignment: InsertChecklistMakeModelAssignment): Promise<ChecklistMakeModelAssignment>;
  deleteChecklistAssignment(id: number): Promise<void>;
  deleteChecklistAssignmentsByTemplate(templateId: number): Promise<void>;
  
  // Import Jobs
  getImportJobs(): Promise<ImportJob[]>;
  getImportJob(id: number): Promise<ImportJob | undefined>;
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  updateImportJob(id: number, job: Partial<InsertImportJob>): Promise<ImportJob | undefined>;
  
  // Part Usage History (for smart suggestions)
  getPartUsageHistory(vmrsCode?: string, manufacturer?: string, model?: string, year?: number): Promise<PartUsageHistory[]>;
  createPartUsageHistory(usage: InsertPartUsageHistory): Promise<PartUsageHistory>;
  getSmartPartSuggestions(vmrsCode: string, manufacturer?: string, model?: string, year?: number): Promise<{ partId: number; partNumber: string; partName: string | null; usageCount: number }[]>;

  // Work Order Parts History Import
  importWorkOrderPartsHistory(rows: Array<{
    partNumber: string;
    transactionDate: string;
    description?: string;
    workOrderNumber: string;
    vehicleAsset: string;
    vmrsCode?: string;
    partType?: string;
    quantity: string | number;
    unitPrice: string | number;
    totalCost?: string | number;
  }>): Promise<{ successCount: number; errorCount: number; errors: Array<{ row: number; message: string }> }>;

  // Receiving Transactions
  getReceivingTransactions(poId?: number): Promise<ReceivingTransaction[]>;
  createReceivingTransaction(transaction: InsertReceivingTransaction): Promise<ReceivingTransaction>;
  
  // Part Requests
  getPartRequests(status?: string): Promise<PartRequest[]>;
  getPartRequest(id: number): Promise<PartRequest | undefined>;
  createPartRequest(request: InsertPartRequest): Promise<PartRequest>;
  updatePartRequest(id: number, request: Partial<InsertPartRequest>): Promise<PartRequest | undefined>;
  getNextPartRequestNumber(): Promise<string>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  getUnreadNotificationCountByOrg(userId: string, orgId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<number>;
  markAllNotificationsReadByOrg(userId: string, orgId: number): Promise<number>;
  dismissNotification(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail.length > 0 && existingByEmail[0].id !== userData.id) {
        // Update the existing user's info but keep their original ID
        const [updated] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updated;
      }
    }
    
    // Standard upsert by ID
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

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async createOrganization(data: { name: string; slug: string; plan?: string }): Promise<Organization> {
    const [org] = await db.insert(organizations).values({
      name: data.name,
      slug: data.slug,
      plan: data.plan || "starter",
    }).returning();
    return org;
  }

  async createOrgMembership(data: { userId: string; orgId: number; role: string; isDefault?: boolean; primaryLocationId?: number | null }): Promise<OrgMembership> {
    const [membership] = await db.insert(orgMemberships).values({
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      isDefault: data.isDefault ?? false,
      primaryLocationId: data.primaryLocationId ?? null,
    }).returning();
    return membership;
  }

  async getUserOrganizations(userId: string): Promise<Array<{ org: Organization; membership: OrgMembership }>> {
    const results = await db.select()
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
      .where(eq(orgMemberships.userId, userId));
    
    return results.map(row => ({
      org: row.organizations,
      membership: row.org_memberships,
    }));
  }

  async updateOrganization(id: number, data: Partial<{ name: string; slug: string }>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async getOrgMembers(orgId: number): Promise<Array<{
    id: number;
    userId: string;
    role: string;
    joinedAt: Date | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  }>> {
    const members = await db.select({
      id: orgMemberships.id,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      joinedAt: orgMemberships.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
    })
      .from(orgMemberships)
      .leftJoin(users, eq(orgMemberships.userId, users.id))
      .where(eq(orgMemberships.orgId, orgId));
    return members;
  }

  async getOrgMembership(orgId: number, userId: string): Promise<OrgMembership | undefined> {
    const [membership] = await db.select().from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, userId)));
    return membership;
  }

  async updateOrgMemberRole(memberId: number, role: string): Promise<OrgMembership | undefined> {
    const [updated] = await db.update(orgMemberships)
      .set({ role })
      .where(eq(orgMemberships.id, memberId))
      .returning();
    return updated;
  }

  async countOrgOwners(orgId: number): Promise<number> {
    const owners = await db.select().from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.role, "owner")));
    return owners.length;
  }

  async getSubsidiaryOrgs(parentOrgId: number): Promise<Organization[]> {
    return db.select().from(organizations)
      .where(eq(organizations.parentOrgId, parentOrgId));
  }

  async setParentOrg(orgId: number, parentOrgId: number | null): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ parentOrgId, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();
    return updated;
  }

  async getOrgsForCorporateAdmin(userId: string): Promise<Organization[]> {
    // Find all memberships where user is corporate admin
    const adminMemberships = await db.select()
      .from(orgMemberships)
      .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.isCorporateAdmin, true)));
    
    if (adminMemberships.length === 0) return [];
    
    // Get all parent orgs and their subsidiaries
    const allOrgs: Organization[] = [];
    for (const membership of adminMemberships) {
      const parentOrg = await this.getOrganization(membership.orgId);
      if (parentOrg) {
        allOrgs.push(parentOrg);
        const subsidiaries = await this.getSubsidiaryOrgs(parentOrg.id);
        allOrgs.push(...subsidiaries);
      }
    }
    
    // Remove duplicates
    const uniqueOrgs = Array.from(new Map(allOrgs.map(org => [org.id, org])).values());
    return uniqueOrgs;
  }

  async updateMemberCorporateAdmin(orgId: number, memberId: number, isCorporateAdmin: boolean): Promise<OrgMembership | undefined> {
    // Verify member belongs to this org
    const [member] = await db.select().from(orgMemberships)
      .where(and(eq(orgMemberships.id, memberId), eq(orgMemberships.orgId, orgId)));
    
    if (!member) return undefined;
    
    const [updated] = await db.update(orgMemberships)
      .set({ isCorporateAdmin })
      .where(and(eq(orgMemberships.id, memberId), eq(orgMemberships.orgId, orgId)))
      .returning();
    
    return updated;
  }

  async hasCorporateAdminMembership(userId: string): Promise<boolean> {
    const [membership] = await db.select()
      .from(orgMemberships)
      .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.isCorporateAdmin, true)))
      .limit(1);
    return !!membership;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async isOwnerOfAnyOrg(userId: string): Promise<boolean> {
    const [membership] = await db.select()
      .from(orgMemberships)
      .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.role, "owner")))
      .limit(1);
    return !!membership;
  }

  async updateMemberPrimaryLocation(memberId: number, primaryLocationId: number | null): Promise<OrgMembership | undefined> {
    const [updated] = await db.update(orgMemberships)
      .set({ primaryLocationId })
      .where(eq(orgMemberships.id, memberId))
      .returning();
    return updated;
  }

  async getMemberLocations(membershipId: number): Promise<MemberLocation[]> {
    return db.select().from(memberLocations)
      .where(eq(memberLocations.membershipId, membershipId));
  }

  async addMemberLocation(data: InsertMemberLocation): Promise<MemberLocation> {
    const [created] = await db.insert(memberLocations).values(data).returning();
    return created;
  }

  async removeMemberLocation(membershipId: number, locationId: number): Promise<void> {
    await db.delete(memberLocations)
      .where(and(
        eq(memberLocations.membershipId, membershipId),
        eq(memberLocations.locationId, locationId)
      ));
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

  async batchUpdateAssetMeters(updates: Array<{ assetId: number; meterReading: string; meterType?: string }>): Promise<Asset[]> {
    const updatedAssets: Asset[] = [];
    for (const update of updates) {
      const [updated] = await db.update(assets)
        .set({
          currentMeterReading: update.meterReading,
          ...(update.meterType && { meterType: update.meterType }),
          lastMeterUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(assets.id, update.assetId))
        .returning();
      if (updated) updatedAssets.push(updated);
    }
    return updatedAssets;
  }

  // Asset Images
  async getAssetImages(assetId: number): Promise<AssetImage[]> {
    return db.select().from(assetImages).where(eq(assetImages.assetId, assetId)).orderBy(desc(assetImages.isPrimary));
  }

  async getAssetImage(id: number): Promise<AssetImage | undefined> {
    const [image] = await db.select().from(assetImages).where(eq(assetImages.id, id));
    return image;
  }

  async createAssetImage(image: InsertAssetImage): Promise<AssetImage> {
    const [created] = await db.insert(assetImages).values(image).returning();
    return created;
  }

  async deleteAssetImage(id: number): Promise<void> {
    await db.delete(assetImages).where(eq(assetImages.id, id));
  }

  async setPrimaryAssetImage(assetId: number, imageId: number): Promise<void> {
    // First, unset any existing primary images for this asset
    await db.update(assetImages)
      .set({ isPrimary: false })
      .where(eq(assetImages.assetId, assetId));
    // Then set the new primary image
    await db.update(assetImages)
      .set({ isPrimary: true })
      .where(eq(assetImages.id, imageId));
  }

  // Asset Documents
  async getAssetDocuments(assetId: number): Promise<AssetDocument[]> {
    return db.select().from(assetDocuments).where(eq(assetDocuments.assetId, assetId)).orderBy(desc(assetDocuments.createdAt));
  }

  async getAssetDocument(id: number): Promise<AssetDocument | undefined> {
    const [doc] = await db.select().from(assetDocuments).where(eq(assetDocuments.id, id));
    return doc;
  }

  async createAssetDocument(document: InsertAssetDocument): Promise<AssetDocument> {
    const [created] = await db.insert(assetDocuments).values(document).returning();
    return created;
  }

  async updateAssetDocument(id: number, document: Partial<InsertAssetDocument>): Promise<AssetDocument | undefined> {
    const [updated] = await db.update(assetDocuments)
      .set(document)
      .where(eq(assetDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteAssetDocument(id: number): Promise<void> {
    await db.delete(assetDocuments).where(eq(assetDocuments.id, id));
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

  async getPartsPaginated(options: { limit: number; offset: number; search?: string }): Promise<{ parts: Part[]; total: number }> {
    const { limit, offset, search } = options;
    
    let baseQuery = db.select().from(parts);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(parts);
    
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;
      const searchCondition = or(
        sql`LOWER(${parts.partNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${parts.name}) LIKE ${searchPattern}`
      );
      baseQuery = baseQuery.where(searchCondition) as typeof baseQuery;
      countQuery = countQuery.where(searchCondition) as typeof countQuery;
    }
    
    const [{ count: total }] = await countQuery;
    const partsResult = await baseQuery.orderBy(parts.partNumber).limit(limit).offset(offset);
    
    return { parts: partsResult, total };
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

  async getRescheduledLines(): Promise<WorkOrderLine[]> {
    return db.select().from(workOrderLines)
      .where(eq(workOrderLines.status, "rescheduled"))
      .orderBy(desc(workOrderLines.updatedAt));
  }

  async getRescheduledLinesToWorkOrder(workOrderId: number): Promise<WorkOrderLine[]> {
    return db.select().from(workOrderLines)
      .where(eq(workOrderLines.rescheduledTo, workOrderId))
      .orderBy(workOrderLines.lineNumber);
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

  // Purchase Requisition Lines
  async getRequisitionLines(requisitionId: number): Promise<PurchaseRequisitionLine[]> {
    return db.select().from(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.requisitionId, requisitionId));
  }

  async createRequisitionLine(line: InsertPurchaseRequisitionLine): Promise<PurchaseRequisitionLine> {
    const [created] = await db.insert(purchaseRequisitionLines).values(line).returning();
    return created;
  }

  async updateRequisitionLine(id: number, line: Partial<InsertPurchaseRequisitionLine>): Promise<PurchaseRequisitionLine | undefined> {
    const [updated] = await db.update(purchaseRequisitionLines).set(line).where(eq(purchaseRequisitionLines.id, id)).returning();
    return updated;
  }

  async deleteRequisitionLine(id: number): Promise<void> {
    await db.delete(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.id, id));
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

  // Purchase Order Lines
  async getPurchaseOrderLines(poId: number): Promise<PurchaseOrderLine[]> {
    return db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
  }

  async getPurchaseOrderLine(id: number): Promise<PurchaseOrderLine | undefined> {
    const [line] = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.id, id));
    return line;
  }

  async createPurchaseOrderLine(line: InsertPurchaseOrderLine): Promise<PurchaseOrderLine> {
    const [created] = await db.insert(purchaseOrderLines).values(line).returning();
    return created;
  }

  async updatePurchaseOrderLine(id: number, line: Partial<InsertPurchaseOrderLine>): Promise<PurchaseOrderLine | undefined> {
    const [updated] = await db.update(purchaseOrderLines).set(line).where(eq(purchaseOrderLines.id, id)).returning();
    return updated;
  }

  async deletePurchaseOrderLine(id: number): Promise<void> {
    await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.id, id));
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

  async getManualsByMakeModel(manufacturer: string, model?: string): Promise<Manual[]> {
    if (model) {
      return db.select().from(manuals)
        .where(and(
          eq(manuals.manufacturer, manufacturer),
          eq(manuals.model, model),
          eq(manuals.isActive, true)
        ))
        .orderBy(desc(manuals.createdAt));
    }
    return db.select().from(manuals)
      .where(and(
        eq(manuals.manufacturer, manufacturer),
        eq(manuals.isActive, true)
      ))
      .orderBy(desc(manuals.createdAt));
  }

  async getManualSections(manualId: number): Promise<ManualSection[]> {
    return db.select().from(manualSections)
      .where(eq(manualSections.manualId, manualId))
      .orderBy(manualSections.pageStart);
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
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    
    // Calculate PM due this week from pmAssetInstances
    const allPmInstances = await db.select().from(pmAssetInstances);
    const pmDueThisWeek = allPmInstances.filter(instance => {
      if (!instance.nextDueDate) return false;
      const dueDate = new Date(instance.nextDueDate);
      return dueDate >= now && dueDate <= endOfWeek;
    }).length;
    
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
      pmDueThisWeek,
    };
  }

  async getKpiMetrics() {
    const allWorkOrders = await db.select().from(workOrders);
    const completedWos = allWorkOrders.filter(w => w.status === "completed" || w.status === "closed");
    const allAssets = await db.select().from(assets);
    
    // MTTR: Mean Time To Repair (average hours from open to complete)
    let mttr: number | null = null;
    const wosWithTimes = completedWos.filter(w => w.startedAt && w.completedAt);
    if (wosWithTimes.length > 0) {
      const totalHours = wosWithTimes.reduce((sum, wo) => {
        const start = new Date(wo.startedAt!).getTime();
        const end = new Date(wo.completedAt!).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0);
      mttr = Math.round((totalHours / wosWithTimes.length) * 10) / 10;
    }

    // MTBF: Mean Time Between Failures (days between corrective/emergency WOs per asset)
    let mtbf: number | null = null;
    const failureWos = allWorkOrders.filter(w => 
      (w.type === "corrective" || w.type === "emergency") && w.assetId
    ).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    
    if (failureWos.length > 1) {
      const intervals: number[] = [];
      const assetFailures: Record<number, Date[]> = {};
      failureWos.forEach(wo => {
        if (!assetFailures[wo.assetId!]) assetFailures[wo.assetId!] = [];
        assetFailures[wo.assetId!].push(new Date(wo.createdAt!));
      });
      Object.values(assetFailures).forEach(dates => {
        for (let i = 1; i < dates.length; i++) {
          intervals.push((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
        }
      });
      if (intervals.length > 0) {
        mtbf = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      }
    }

    // Asset Uptime: % of assets operational
    const assetUptime = allAssets.length > 0 
      ? Math.round((allAssets.filter(a => a.status === "operational").length / allAssets.length) * 100) 
      : 100;

    // PM Compliance: % of preventive WOs completed vs total preventive WOs
    const preventiveWos = allWorkOrders.filter(w => w.type === "preventive");
    const completedPreventive = preventiveWos.filter(w => w.status === "completed" || w.status === "closed");
    const pmCompliance = preventiveWos.length > 0
      ? Math.round((completedPreventive.length / preventiveWos.length) * 100)
      : 100;

    // Emergency WO Ratio
    const emergencyWos = allWorkOrders.filter(w => w.type === "emergency" || w.priority === "critical");
    const emergencyWoRatio = allWorkOrders.length > 0
      ? Math.round((emergencyWos.length / allWorkOrders.length) * 100)
      : 0;

    // Average Cost per WO
    const totalCost = completedWos.reduce((sum, wo) => sum + Number(wo.totalCost || 0), 0);
    const avgCostPerWo = completedWos.length > 0 ? Math.round(totalCost / completedWos.length) : 0;

    return { mttr, mtbf, assetUptime, pmCompliance, emergencyWoRatio, avgCostPerWo };
  }

  async getProcurementOverview() {
    const allRequisitions = await db.select().from(purchaseRequisitions);
    const allPurchaseOrders = await db.select().from(purchaseOrders);
    const allReorderAlerts = await db.select().from(reorderAlerts);
    const allPartRequests = await db.select().from(partRequests);

    return {
      pendingRequisitions: allRequisitions.filter(r => r.status === "submitted" || r.status === "draft").length,
      activePurchaseOrders: allPurchaseOrders.filter(po => 
        po.status === "sent" || po.status === "acknowledged" || po.status === "partial"
      ).length,
      reorderAlerts: allReorderAlerts.filter(a => a.status === "pending").length,
      pendingPartRequests: allPartRequests.filter(pr => pr.status === "pending").length,
    };
  }

  async getPartsAnalytics() {
    const allTransactions = await db.select().from(workOrderTransactions);
    const allParts = await db.select().from(parts);
    
    // Aggregate part consumption
    const partUsage: Record<number, { count: number; cost: number }> = {};
    allTransactions
      .filter(t => t.type === "part_consumption" && t.partId)
      .forEach(t => {
        if (!partUsage[t.partId!]) partUsage[t.partId!] = { count: 0, cost: 0 };
        partUsage[t.partId!].count += Number(t.quantity || 1);
        partUsage[t.partId!].cost += Number(t.totalCost || 0);
      });

    const topUsedParts = Object.entries(partUsage)
      .map(([partId, usage]) => {
        const part = allParts.find(p => p.id === parseInt(partId));
        return {
          partId: parseInt(partId),
          partNumber: part?.partNumber || "Unknown",
          partName: part?.name || "Unknown",
          usageCount: usage.count,
          totalCost: usage.cost,
        };
      })
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    // Critical low stock (quantity at 0 or below reorder point for critical parts)
    const lowStockCritical = allParts.filter(p => {
      const qty = Number(p.quantityOnHand || 0);
      const reorder = Number(p.reorderPoint || 0);
      return qty <= reorder && qty <= 5;
    }).length;

    return { topUsedParts, lowStockCritical };
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

  async getPredictions(): Promise<(Prediction & { assetName?: string; assetNumber?: string })[]> {
    const results = await db
      .select({
        prediction: predictions,
        assetName: assets.name,
        assetNumber: assets.assetNumber,
      })
      .from(predictions)
      .leftJoin(assets, eq(predictions.assetId, assets.id))
      .orderBy(desc(predictions.createdAt));

    return results.map(r => ({
      ...r.prediction,
      assetName: r.assetName || undefined,
      assetNumber: r.assetNumber || undefined,
    }));
  }

  async acknowledgePrediction(id: number): Promise<void> {
    await db
      .update(predictions)
      .set({ acknowledged: true })
      .where(eq(predictions.id, id));
  }

  async dismissPrediction(id: number): Promise<void> {
    await db
      .update(predictions)
      .set({ dismissedAt: new Date() })
      .where(eq(predictions.id, id));
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

  async getTransaction(id: number): Promise<WorkOrderTransaction | undefined> {
    const result = await db.select().from(workOrderTransactions).where(eq(workOrderTransactions.id, id));
    return result[0];
  }

  async reverseTransaction(transactionId: number, performedById: string | null, reason: string): Promise<WorkOrderTransaction> {
    const original = await this.getTransaction(transactionId);
    if (!original) throw new Error("Transaction not found");
    if (original.isReversed) throw new Error("Transaction already reversed");

    const reversalType = original.type === "part_consumption" ? "part_return" 
                        : original.type === "time_entry" ? "time_adjustment" 
                        : "reversal";

    const result = await db.transaction(async (tx) => {
      await tx.update(workOrderTransactions)
        .set({ isReversed: true })
        .where(eq(workOrderTransactions.id, transactionId));

      if (original.type === "part_consumption" && original.partId && original.quantity) {
        const [part] = await tx.select().from(parts).where(eq(parts.id, original.partId));
        if (part) {
          const newQty = Number(part.quantityOnHand || 0) + Number(original.quantity);
          await tx.update(parts)
            .set({ quantityOnHand: String(newQty), updatedAt: new Date() })
            .where(eq(parts.id, original.partId));
        }

        if (original.workOrderLineId) {
          const [line] = await tx.select().from(workOrderLines).where(eq(workOrderLines.id, original.workOrderLineId));
          if (line) {
            const newPartsCost = Math.max(0, Number(line.partsCost || 0) - Number(original.totalCost || 0));
            await tx.update(workOrderLines)
              .set({ partsCost: String(newPartsCost), updatedAt: new Date() })
              .where(eq(workOrderLines.id, original.workOrderLineId));
          }
        }
      }

      if (original.type === "time_entry" && original.hours && original.workOrderLineId) {
        const [line] = await tx.select().from(workOrderLines).where(eq(workOrderLines.id, original.workOrderLineId));
        if (line) {
          const newLaborHours = Math.max(0, Number(line.laborHours || 0) - Number(original.hours));
          await tx.update(workOrderLines)
            .set({ laborHours: String(newLaborHours), updatedAt: new Date() })
            .where(eq(workOrderLines.id, original.workOrderLineId));
        }
      }

      const [reversalTransaction] = await tx.insert(workOrderTransactions).values({
        workOrderId: original.workOrderId,
        workOrderLineId: original.workOrderLineId,
        type: reversalType,
        partId: original.partId,
        quantity: original.quantity ? String(-Number(original.quantity)) : null,
        unitCost: original.unitCost,
        totalCost: original.totalCost ? String(-Number(original.totalCost)) : null,
        hours: original.hours ? String(-Number(original.hours)) : null,
        description: `REVERSAL: ${reason}. Original: ${original.description || 'N/A'}`,
        performedById,
        reversedTransactionId: transactionId,
      }).returning();

      return reversalTransaction;
    });

    return result;
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

  // Labor Entries (Multi-user Time Tracking)
  async getLaborEntries(workOrderId: number): Promise<LaborEntry[]> {
    return db.select().from(laborEntries)
      .where(eq(laborEntries.workOrderId, workOrderId))
      .orderBy(desc(laborEntries.startTime));
  }

  async getLaborEntry(id: number): Promise<LaborEntry | undefined> {
    const [entry] = await db.select().from(laborEntries).where(eq(laborEntries.id, id));
    return entry;
  }

  async getActiveLaborEntries(userId: string): Promise<LaborEntry[]> {
    return db.select().from(laborEntries)
      .where(and(
        eq(laborEntries.userId, userId),
        eq(laborEntries.status, "running")
      ));
  }

  async createLaborEntry(entry: InsertLaborEntry): Promise<LaborEntry> {
    const [created] = await db.insert(laborEntries).values(entry).returning();
    return created;
  }

  async updateLaborEntry(id: number, entry: Partial<InsertLaborEntry>): Promise<LaborEntry | undefined> {
    const [updated] = await db.update(laborEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(laborEntries.id, id))
      .returning();
    return updated;
  }

  async completeLaborEntry(id: number): Promise<LaborEntry | undefined> {
    const entry = await this.getLaborEntry(id);
    if (!entry) return undefined;

    const endTime = new Date();
    const startTime = new Date(entry.startTime);
    const pausedSeconds = entry.pausedDuration || 0;
    
    // Calculate actual working time in hours
    const totalSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const workingSeconds = totalSeconds - pausedSeconds;
    const calculatedHours = Math.max(0, workingSeconds / 3600);
    
    // Calculate labor cost if hourly rate is set
    const hourlyRate = entry.hourlyRate ? parseFloat(entry.hourlyRate) : 0;
    const laborCost = calculatedHours * hourlyRate;

    const [updated] = await db.update(laborEntries)
      .set({
        status: "completed",
        endTime,
        calculatedHours: calculatedHours.toFixed(2),
        laborCost: laborCost.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(laborEntries.id, id))
      .returning();
    return updated;
  }

  async deleteLaborEntry(id: number): Promise<void> {
    await db.delete(laborEntries).where(eq(laborEntries.id, id));
  }

  // Checklist Templates
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return db.select().from(checklistTemplates).orderBy(desc(checklistTemplates.createdAt));
  }

  async getChecklistTemplate(id: number): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template;
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [created] = await db.insert(checklistTemplates).values(template).returning();
    return created;
  }

  async updateChecklistTemplate(id: number, template: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined> {
    const [updated] = await db.update(checklistTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(checklistTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteChecklistTemplate(id: number): Promise<void> {
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  }

  // Checklist Make/Model Assignments
  async getChecklistAssignments(templateId?: number): Promise<ChecklistMakeModelAssignment[]> {
    if (templateId) {
      return db.select().from(checklistMakeModelAssignments)
        .where(eq(checklistMakeModelAssignments.checklistTemplateId, templateId));
    }
    return db.select().from(checklistMakeModelAssignments);
  }

  async getChecklistsForAsset(manufacturer: string, model: string, assetType: string): Promise<ChecklistTemplate[]> {
    const assignments = await db.select({
      templateId: checklistMakeModelAssignments.checklistTemplateId
    }).from(checklistMakeModelAssignments)
      .where(sql`
        (${checklistMakeModelAssignments.manufacturer} IS NULL OR ${checklistMakeModelAssignments.manufacturer} = ${manufacturer}) AND
        (${checklistMakeModelAssignments.model} IS NULL OR ${checklistMakeModelAssignments.model} = ${model}) AND
        (${checklistMakeModelAssignments.assetType} IS NULL OR ${checklistMakeModelAssignments.assetType} = ${assetType})
      `);
    
    if (assignments.length === 0) return [];
    
    const templateIds = assignments.map(a => a.templateId);
    return db.select().from(checklistTemplates)
      .where(sql`${checklistTemplates.id} IN (${sql.join(templateIds.map(id => sql`${id}`), sql`, `)})`);
  }

  async createChecklistAssignment(assignment: InsertChecklistMakeModelAssignment): Promise<ChecklistMakeModelAssignment> {
    const [created] = await db.insert(checklistMakeModelAssignments).values(assignment).returning();
    return created;
  }

  async deleteChecklistAssignment(id: number): Promise<void> {
    await db.delete(checklistMakeModelAssignments).where(eq(checklistMakeModelAssignments.id, id));
  }

  async deleteChecklistAssignmentsByTemplate(templateId: number): Promise<void> {
    await db.delete(checklistMakeModelAssignments)
      .where(eq(checklistMakeModelAssignments.checklistTemplateId, templateId));
  }

  // Import Jobs
  async getImportJobs(): Promise<ImportJob[]> {
    return db.select().from(importJobs).orderBy(sql`${importJobs.createdAt} DESC`);
  }

  async getImportJob(id: number): Promise<ImportJob | undefined> {
    const [job] = await db.select().from(importJobs).where(eq(importJobs.id, id));
    return job;
  }

  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const [created] = await db.insert(importJobs).values(job).returning();
    return created;
  }

  async updateImportJob(id: number, job: Partial<InsertImportJob>): Promise<ImportJob | undefined> {
    const [updated] = await db.update(importJobs).set(job).where(eq(importJobs.id, id)).returning();
    return updated;
  }

  // Part Usage History
  async getPartUsageHistory(vmrsCode?: string, manufacturer?: string, model?: string, year?: number): Promise<PartUsageHistory[]> {
    let query = db.select().from(partUsageHistory);
    const conditions = [];
    if (vmrsCode) conditions.push(eq(partUsageHistory.vmrsCode, vmrsCode));
    if (manufacturer) conditions.push(eq(partUsageHistory.manufacturer, manufacturer));
    if (model) conditions.push(eq(partUsageHistory.model, model));
    if (year) conditions.push(eq(partUsageHistory.year, year));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(sql`${partUsageHistory.usedAt} DESC`);
  }

  async createPartUsageHistory(usage: InsertPartUsageHistory): Promise<PartUsageHistory> {
    const [created] = await db.insert(partUsageHistory).values(usage).returning();
    return created;
  }

  async getSmartPartSuggestions(vmrsCode: string, manufacturer?: string, model?: string, year?: number): Promise<{ partId: number; partNumber: string; partName: string | null; usageCount: number }[]> {
    // Query part usage history to find most used parts for this VMRS code and make/model
    const conditions = [eq(partUsageHistory.vmrsCode, vmrsCode)];
    if (manufacturer) conditions.push(eq(partUsageHistory.manufacturer, manufacturer));
    if (model) conditions.push(eq(partUsageHistory.model, model));
    // Year is optional - if not provided, get all years
    if (year) conditions.push(eq(partUsageHistory.year, year));
    
    const results = await db
      .select({
        partId: partUsageHistory.partId,
        partNumber: partUsageHistory.partNumber,
        partName: partUsageHistory.partName,
        usageCount: sql<number>`COUNT(*)::int`,
      })
      .from(partUsageHistory)
      .where(and(...conditions))
      .groupBy(partUsageHistory.partId, partUsageHistory.partNumber, partUsageHistory.partName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    
    return results.filter(r => r.partId !== null).map(r => ({
      partId: r.partId!,
      partNumber: r.partNumber,
      partName: r.partName,
      usageCount: r.usageCount,
    }));
  }

  // Import Work Order Parts History
  async importWorkOrderPartsHistory(rows: Array<{
    partNumber: string;
    transactionDate: string;
    description?: string;
    workOrderNumber: string;
    vehicleAsset: string;
    vmrsCode?: string;
    partType?: string;
    quantity: string | number;
    unitPrice: string | number;
    totalCost?: string | number;
  }>): Promise<{ successCount: number; errorCount: number; errors: Array<{ row: number; message: string }> }> {
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        // Find asset by name or assetNumber (case-insensitive)
        const vehicleAsset = String(row.vehicleAsset).trim();
        const assetList = await db.select().from(assets).where(
          sql`LOWER(${assets.name}) = LOWER(${vehicleAsset}) OR LOWER(${assets.assetNumber}) = LOWER(${vehicleAsset})`
        );
        if (assetList.length === 0) {
          throw new Error(`Asset "${vehicleAsset}" not found`);
        }
        const asset = assetList[0];

        // Find or create part
        let part = await this.getPartByNumber(row.partNumber);
        if (!part) {
          // Auto-create placeholder part
          part = await this.createPart({
            partNumber: row.partNumber,
            name: row.partNumber,
            category: "unknown",
            unitCost: String(row.unitPrice),
          });
        }

        // Find or create minimal work order
        let workOrder = await this.getWorkOrderByNumber(row.workOrderNumber);
        if (!workOrder) {
          // Auto-create minimal work order
          workOrder = await this.createWorkOrder({
            workOrderNumber: row.workOrderNumber,
            title: row.workOrderNumber,
            type: "corrective",
            priority: "medium",
            status: "completed",
            assetId: asset.id,
          });
        }

        // Create or find work order line with VMRS code
        let lineNumber = 1;
        const existingLines = await this.getWorkOrderLines(workOrder.id);
        if (existingLines.length > 0) {
          lineNumber = Math.max(...existingLines.map(l => l.lineNumber)) + 1;
        }

        const workOrderLine = await this.createWorkOrderLine({
          workOrderId: workOrder.id,
          lineNumber,
          description: row.description || `${row.partNumber} consumed`,
          status: "completed",
          vmrsCode: row.vmrsCode,
          vmrsTitle: row.vmrsCode,
        });

        // Create work order transaction
        const quantity = Number(row.quantity);
        const unitPrice = Number(row.unitPrice);
        const totalCost = row.totalCost ? Number(row.totalCost) : quantity * unitPrice;

        await db.insert(workOrderTransactions).values({
          workOrderId: workOrder.id,
          workOrderLineId: workOrderLine.id,
          type: "part_consumption",
          partId: part.id,
          quantity: String(quantity),
          unitCost: String(unitPrice),
          totalCost: String(totalCost),
          description: row.description || `${row.partNumber} consumed`,
          createdAt: new Date(row.transactionDate),
        });

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push({
          row: i + 1,
          message: error.message || "Unknown error",
        });
      }
    }

    return { successCount, errorCount, errors };
  }

  // Receiving Transactions
  async getReceivingTransactions(poId?: number): Promise<ReceivingTransaction[]> {
    if (poId) {
      return await db.select().from(receivingTransactions).where(eq(receivingTransactions.poId, poId)).orderBy(desc(receivingTransactions.receivedDate));
    }
    return await db.select().from(receivingTransactions).orderBy(desc(receivingTransactions.receivedDate));
  }

  async createReceivingTransaction(transaction: InsertReceivingTransaction): Promise<ReceivingTransaction> {
    const [result] = await db.insert(receivingTransactions).values(transaction).returning();
    return result;
  }

  // Part Requests
  async getPartRequests(status?: string): Promise<PartRequest[]> {
    if (status) {
      return await db.select().from(partRequests).where(eq(partRequests.status, status as any)).orderBy(desc(partRequests.createdAt));
    }
    return await db.select().from(partRequests).orderBy(desc(partRequests.createdAt));
  }

  async getPartRequest(id: number): Promise<PartRequest | undefined> {
    const [result] = await db.select().from(partRequests).where(eq(partRequests.id, id));
    return result;
  }

  async createPartRequest(request: InsertPartRequest): Promise<PartRequest> {
    const [result] = await db.insert(partRequests).values(request).returning();
    return result;
  }

  async updatePartRequest(id: number, request: Partial<InsertPartRequest>): Promise<PartRequest | undefined> {
    const [result] = await db.update(partRequests).set({ ...request, updatedAt: new Date() }).where(eq(partRequests.id, id)).returning();
    return result;
  }

  async getNextPartRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [latest] = await db
      .select({ requestNumber: partRequests.requestNumber })
      .from(partRequests)
      .where(sql`${partRequests.requestNumber} LIKE ${'PR-' + year + '-%'}`)
      .orderBy(desc(partRequests.requestNumber))
      .limit(1);
    
    let nextNum = 1;
    if (latest?.requestNumber) {
      const parts = latest.requestNumber.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    return `PR-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  // Part Kits
  async getPartKits(): Promise<PartKit[]> {
    return await db.select().from(partKits).orderBy(desc(partKits.createdAt));
  }

  async getPartKit(id: number): Promise<PartKit | undefined> {
    const [result] = await db.select().from(partKits).where(eq(partKits.id, id));
    return result;
  }

  async createPartKit(kit: InsertPartKit): Promise<PartKit> {
    const [result] = await db.insert(partKits).values(kit).returning();
    return result;
  }

  async updatePartKit(id: number, kit: Partial<InsertPartKit>): Promise<PartKit | undefined> {
    const [result] = await db.update(partKits).set({ ...kit, updatedAt: new Date() }).where(eq(partKits.id, id)).returning();
    return result;
  }

  async deletePartKit(id: number): Promise<void> {
    await db.delete(partKits).where(eq(partKits.id, id));
  }

  async getNextKitNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [latest] = await db
      .select({ kitNumber: partKits.kitNumber })
      .from(partKits)
      .where(sql`${partKits.kitNumber} LIKE ${'KIT-' + year + '-%'}`)
      .orderBy(desc(partKits.kitNumber))
      .limit(1);
    
    let nextNum = 1;
    if (latest?.kitNumber) {
      const kitParts = latest.kitNumber.split('-');
      const lastNum = parseInt(kitParts[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `KIT-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  // Part Kit Lines
  async getPartKitLines(kitId: number): Promise<PartKitLine[]> {
    return await db.select().from(partKitLines).where(eq(partKitLines.kitId, kitId));
  }

  async createPartKitLine(line: InsertPartKitLine): Promise<PartKitLine> {
    const [result] = await db.insert(partKitLines).values(line).returning();
    await this.recalculateKitTotal(line.kitId);
    return result;
  }

  async updatePartKitLine(id: number, line: Partial<InsertPartKitLine>): Promise<PartKitLine | undefined> {
    const [existing] = await db.select().from(partKitLines).where(eq(partKitLines.id, id));
    if (!existing) return undefined;
    const [result] = await db.update(partKitLines).set(line).where(eq(partKitLines.id, id)).returning();
    await this.recalculateKitTotal(existing.kitId);
    return result;
  }

  async deletePartKitLine(id: number): Promise<void> {
    const [existing] = await db.select().from(partKitLines).where(eq(partKitLines.id, id));
    if (existing) {
      await db.delete(partKitLines).where(eq(partKitLines.id, id));
      await this.recalculateKitTotal(existing.kitId);
    }
  }

  async recalculateKitTotal(kitId: number): Promise<void> {
    const lines = await this.getPartKitLines(kitId);
    let total = 0;
    for (const line of lines) {
      total += Number(line.lineCost || 0);
    }
    await db.update(partKits).set({ totalCost: String(total), updatedAt: new Date() }).where(eq(partKits.id, kitId));
  }

  // PM Schedule Kits
  async getPmScheduleKits(pmScheduleId: number): Promise<PmScheduleKit[]> {
    return await db.select().from(pmScheduleKits).where(eq(pmScheduleKits.pmScheduleId, pmScheduleId));
  }

  async addKitToPmSchedule(pmScheduleId: number, kitId: number): Promise<PmScheduleKit> {
    const [result] = await db.insert(pmScheduleKits).values({ pmScheduleId, kitId }).returning();
    return result;
  }

  async removeKitFromPmSchedule(id: number): Promise<void> {
    await db.delete(pmScheduleKits).where(eq(pmScheduleKits.id, id));
  }

  // Cycle Counts
  async getCycleCounts(status?: string): Promise<CycleCount[]> {
    if (status) {
      return await db.select().from(cycleCounts).where(eq(cycleCounts.status, status as any)).orderBy(desc(cycleCounts.scheduledDate));
    }
    return await db.select().from(cycleCounts).orderBy(desc(cycleCounts.scheduledDate));
  }

  async getCycleCount(id: number): Promise<CycleCount | undefined> {
    const [result] = await db.select().from(cycleCounts).where(eq(cycleCounts.id, id));
    return result;
  }

  async createCycleCount(count: InsertCycleCount): Promise<CycleCount> {
    const [result] = await db.insert(cycleCounts).values(count).returning();
    return result;
  }

  async updateCycleCount(id: number, count: Partial<InsertCycleCount>): Promise<CycleCount | undefined> {
    const [result] = await db.update(cycleCounts).set({ ...count, updatedAt: new Date() }).where(eq(cycleCounts.id, id)).returning();
    return result;
  }

  async getNextCycleCountNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [latest] = await db
      .select({ countNumber: cycleCounts.countNumber })
      .from(cycleCounts)
      .where(sql`${cycleCounts.countNumber} LIKE ${'CC-' + year + '-%'}`)
      .orderBy(desc(cycleCounts.countNumber))
      .limit(1);
    
    let nextNum = 1;
    if (latest?.countNumber) {
      const countParts = latest.countNumber.split('-');
      const lastNum = parseInt(countParts[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `CC-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  async executeCycleCount(id: number, actualQuantity: number, countedById: string | null, countedByName: string | null, notes?: string): Promise<CycleCount | undefined> {
    const count = await this.getCycleCount(id);
    if (!count) return undefined;

    const part = await this.getPart(count.partId);
    if (!part) return undefined;

    const expected = Number(part.quantityOnHand || 0);
    const variance = actualQuantity - expected;
    const variancePercent = expected !== 0 ? (variance / expected) * 100 : 0;
    const varianceCost = variance * Number(part.unitCost || 0);

    const [result] = await db.update(cycleCounts).set({
      status: "completed",
      countedDate: new Date(),
      expectedQuantity: String(expected),
      actualQuantity: String(actualQuantity),
      variance: String(variance),
      variancePercent: String(variancePercent),
      varianceCost: String(varianceCost),
      countedById,
      countedByName,
      notes,
      updatedAt: new Date(),
    }).where(eq(cycleCounts.id, id)).returning();

    return result;
  }

  async reconcileCycleCount(id: number): Promise<CycleCount | undefined> {
    const count = await this.getCycleCount(id);
    if (!count || count.status !== "completed" || count.isReconciled) return undefined;

    await db.transaction(async (tx) => {
      await tx.update(parts).set({
        quantityOnHand: count.actualQuantity,
        lastCycleCountDate: new Date(),
        updatedAt: new Date(),
      }).where(eq(parts.id, count.partId));

      await tx.update(cycleCounts).set({
        isReconciled: true,
        reconciledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(cycleCounts.id, id));
    });

    return await this.getCycleCount(id);
  }

  // ABC Classification
  async recalculateABCClassification(): Promise<{ updated: number }> {
    const allParts = await this.getParts();
    const partsWithValue = allParts.map(p => ({
      id: p.id,
      value: Number(p.annualUsageValue || 0),
    })).sort((a, b) => b.value - a.value);

    const totalValue = partsWithValue.reduce((sum, p) => sum + p.value, 0);
    let cumulativeValue = 0;
    let updated = 0;

    for (const p of partsWithValue) {
      cumulativeValue += p.value;
      const cumPercent = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 100;
      
      let abcClass: "A" | "B" | "C";
      if (cumPercent <= 80) abcClass = "A";
      else if (cumPercent <= 95) abcClass = "B";
      else abcClass = "C";

      await db.update(parts).set({ abcClass, updatedAt: new Date() }).where(eq(parts.id, p.id));
      updated++;
    }

    return { updated };
  }

  async scheduleCycleCountsForParts(): Promise<{ scheduled: number }> {
    const allParts = await this.getParts();
    const now = new Date();
    let scheduled = 0;

    for (const part of allParts) {
      let monthsInterval: number;
      switch (part.abcClass) {
        case "A": monthsInterval = 1; break;
        case "B": monthsInterval = 3; break;
        default: monthsInterval = 12; break;
      }

      const lastCount = part.lastCycleCountDate ? new Date(part.lastCycleCountDate) : null;
      const nextDue = lastCount 
        ? new Date(lastCount.getTime() + monthsInterval * 30 * 24 * 60 * 60 * 1000)
        : now;

      if (nextDue <= now || !part.nextCycleCountDate) {
        const existingScheduled = await db.select().from(cycleCounts)
          .where(and(eq(cycleCounts.partId, part.id), eq(cycleCounts.status, "scheduled")));
        
        if (existingScheduled.length === 0) {
          const countNumber = await this.getNextCycleCountNumber();
          await this.createCycleCount({
            countNumber,
            partId: part.id,
            locationId: part.locationId,
            status: "scheduled",
            scheduledDate: nextDue,
          });
          
          await db.update(parts).set({ 
            nextCycleCountDate: nextDue, 
            updatedAt: new Date() 
          }).where(eq(parts.id, part.id));
          
          scheduled++;
        }
      }
    }

    return { scheduled };
  }

  // PM Due List
  async getPmDueList(): Promise<Array<PmAssetInstance & { pmSchedule?: PmSchedule; asset?: Asset }>> {
    const instances = await db.select().from(pmAssetInstances).orderBy(pmAssetInstances.nextDueDate);
    const results: Array<PmAssetInstance & { pmSchedule?: PmSchedule; asset?: Asset }> = [];

    for (const instance of instances) {
      const pmSchedule = await this.getPmSchedule(instance.pmScheduleId);
      const asset = await this.getAsset(instance.assetId);
      results.push({ ...instance, pmSchedule, asset });
    }

    return results;
  }

  async completePmFromWorkOrder(pmInstanceId: number, completionDate: Date, meterReading?: number): Promise<PmAssetInstance | undefined> {
    const instance = await db.select().from(pmAssetInstances).where(eq(pmAssetInstances.id, pmInstanceId));
    if (instance.length === 0) return undefined;

    const pmSchedule = await this.getPmSchedule(instance[0].pmScheduleId);
    if (!pmSchedule) return undefined;

    let nextDueDate: Date | null = null;
    let nextDueMeter: string | null = null;

    if (pmSchedule.intervalType === "days") {
      nextDueDate = new Date(completionDate);
      nextDueDate.setDate(nextDueDate.getDate() + pmSchedule.intervalValue);
    } else if (meterReading !== undefined) {
      nextDueMeter = String(meterReading + pmSchedule.intervalValue);
    }

    const [result] = await db.update(pmAssetInstances).set({
      lastCompletedDate: completionDate,
      lastCompletedMeter: meterReading ? String(meterReading) : null,
      nextDueDate,
      nextDueMeter,
      isOverdue: false,
      updatedAt: new Date(),
    }).where(eq(pmAssetInstances.id, pmInstanceId)).returning();

    return result;
  }

  // Consume Kit on Work Order
  async consumeKitOnWorkOrder(kitId: number, workOrderId: number, workOrderLineId: number, performedById?: string): Promise<{ consumed: number; totalCost: number }> {
    const kit = await this.getPartKit(kitId);
    if (!kit) throw new Error("Kit not found");

    const lines = await this.getPartKitLines(kitId);
    let consumed = 0;
    let totalCost = 0;

    await db.transaction(async (tx) => {
      for (const line of lines) {
        const part = await this.getPart(line.partId);
        if (!part) continue;

        const qty = Number(line.quantity);
        const unitCost = Number(part.unitCost || 0);
        const lineTotalCost = qty * unitCost;

        const newQty = Math.max(0, Number(part.quantityOnHand || 0) - qty);
        await tx.update(parts).set({ 
          quantityOnHand: String(newQty), 
          updatedAt: new Date() 
        }).where(eq(parts.id, line.partId));

        await tx.insert(workOrderTransactions).values({
          workOrderId,
          workOrderLineId,
          type: "part_consumption",
          partId: line.partId,
          quantity: String(qty),
          unitCost: String(unitCost),
          totalCost: String(lineTotalCost),
          description: `Kit consumption: ${kit.name} - ${part.partNumber}`,
          performedById,
        });

        consumed++;
        totalCost += lineTotalCost;
      }
    });

    return { consumed, totalCost };
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.dismissedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getUnreadNotificationCountByOrg(userId: string, orgId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        eq(notifications.isRead, false),
        isNull(notifications.dismissedAt)
      ));
    return result[0]?.count || 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        isNull(notifications.dismissedAt)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async markNotificationRead(id: number, userId: string): Promise<Notification | undefined> {
    const [result] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    const result = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.rowCount || 0;
  }

  async markAllNotificationsReadByOrg(userId: string, orgId: number): Promise<number> {
    const result = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        eq(notifications.isRead, false)
      ));
    return result.rowCount || 0;
  }

  async dismissNotification(id: number, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ dismissedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  // ============================================================
  // TENANT-SCOPED METHODS
  // These methods filter data by organization ID for multi-tenancy
  // ============================================================

  async getAssetsByOrg(orgId: number): Promise<Asset[]> {
    return db.select().from(assets).where(eq(assets.orgId, orgId)).orderBy(desc(assets.createdAt));
  }

  async getPartsByOrg(orgId: number): Promise<Part[]> {
    return db.select().from(parts).where(eq(parts.orgId, orgId)).orderBy(parts.partNumber);
  }

  async getPartsByOrgPaginated(orgId: number, options: { limit: number; offset: number; search?: string }): Promise<{ parts: Part[]; total: number }> {
    const { limit, offset, search } = options;
    
    let conditions = [eq(parts.orgId, orgId)];
    
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;
      const searchCondition = or(
        sql`LOWER(${parts.partNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${parts.name}) LIKE ${searchPattern}`
      );
      conditions.push(searchCondition as any);
    }
    
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(parts).where(whereClause);
    const partsResult = await db.select().from(parts).where(whereClause).orderBy(parts.partNumber).limit(limit).offset(offset);
    
    return { parts: partsResult, total };
  }

  async getWorkOrdersByOrg(orgId: number): Promise<WorkOrder[]> {
    return db.select().from(workOrders).where(eq(workOrders.orgId, orgId)).orderBy(desc(workOrders.createdAt));
  }

  async getLocationsByOrg(orgId: number): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.orgId, orgId)).orderBy(locations.name);
  }

  async getVendorsByOrg(orgId: number): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.orgId, orgId)).orderBy(vendors.name);
  }

  async getPmSchedulesByOrg(orgId: number): Promise<PmSchedule[]> {
    return db.select().from(pmSchedules).where(eq(pmSchedules.orgId, orgId)).orderBy(pmSchedules.name);
  }

  async getRequisitionsByOrg(orgId: number): Promise<PurchaseRequisition[]> {
    return db.select().from(purchaseRequisitions).where(eq(purchaseRequisitions.orgId, orgId)).orderBy(desc(purchaseRequisitions.createdAt));
  }

  async getPurchaseOrdersByOrg(orgId: number): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)).orderBy(desc(purchaseOrders.createdAt));
  }

  async getEstimatesByOrg(orgId: number): Promise<Estimate[]> {
    return db.select().from(estimates).where(eq(estimates.orgId, orgId)).orderBy(desc(estimates.createdAt));
  }

  async getDvirsByOrg(orgId: number): Promise<Dvir[]> {
    return db.select().from(dvirs).where(eq(dvirs.orgId, orgId)).orderBy(desc(dvirs.inspectionDate));
  }

  async getManualsByOrg(orgId: number): Promise<Manual[]> {
    return db.select().from(manuals).where(eq(manuals.orgId, orgId)).orderBy(manuals.manufacturer);
  }

  async getPredictionsByOrg(orgId: number): Promise<Prediction[]> {
    return db.select().from(predictions).where(eq(predictions.orgId, orgId)).orderBy(desc(predictions.createdAt));
  }

  async getFeedbackByOrg(orgId: number): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.orgId, orgId)).orderBy(desc(feedback.createdAt));
  }

  async getDashboardStatsByOrg(orgId: number) {
    const orgAssets = await db.select().from(assets).where(eq(assets.orgId, orgId));
    const orgWorkOrders = await db.select().from(workOrders).where(eq(workOrders.orgId, orgId));
    const orgParts = await db.select().from(parts).where(eq(parts.orgId, orgId));
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    
    // Calculate PM due this week - join pmAssetInstances with pmSchedules to filter by org
    const orgPmSchedules = await db.select().from(pmSchedules).where(eq(pmSchedules.orgId, orgId));
    const orgPmScheduleIds = new Set(orgPmSchedules.map(pm => pm.id));
    
    const allPmInstances = await db.select().from(pmAssetInstances);
    const pmDueThisWeek = allPmInstances.filter(instance => {
      if (!orgPmScheduleIds.has(instance.pmScheduleId)) return false;
      if (!instance.nextDueDate) return false;
      const dueDate = new Date(instance.nextDueDate);
      return dueDate >= now && dueDate <= endOfWeek;
    }).length;
    
    return {
      totalAssets: orgAssets.length,
      operationalAssets: orgAssets.filter(a => a.status === "operational").length,
      inMaintenanceAssets: orgAssets.filter(a => a.status === "in_maintenance").length,
      downAssets: orgAssets.filter(a => a.status === "down").length,
      openWorkOrders: orgWorkOrders.filter(w => w.status === "open" || w.status === "in_progress").length,
      overdueWorkOrders: orgWorkOrders.filter(w => 
        (w.status === "open" || w.status === "in_progress") && 
        w.dueDate && new Date(w.dueDate) < now
      ).length,
      partsLowStock: orgParts.filter(p => 
        Number(p.quantityOnHand || 0) <= Number(p.reorderPoint || 0)
      ).length,
      pmDueThisWeek,
    };
  }

  async getKpiMetricsByOrg(orgId: number) {
    const orgWorkOrders = await db.select().from(workOrders).where(eq(workOrders.orgId, orgId));
    const completedWos = orgWorkOrders.filter(w => w.status === "completed" || w.status === "closed");
    const orgAssets = await db.select().from(assets).where(eq(assets.orgId, orgId));
    let mttr: number | null = null;
    const wosWithTimes = completedWos.filter(w => w.startedAt && w.completedAt);
    if (wosWithTimes.length > 0) {
      const totalHours = wosWithTimes.reduce((sum, wo) => {
        const start = new Date(wo.startedAt!).getTime();
        const end = new Date(wo.completedAt!).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0);
      mttr = Math.round((totalHours / wosWithTimes.length) * 10) / 10;
    }
    let mtbf: number | null = null;
    const failureWos = orgWorkOrders.filter(w => 
      (w.type === "corrective" || w.type === "emergency") && w.assetId
    ).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    if (failureWos.length > 1) {
      const intervals: number[] = [];
      const assetFailures: Record<number, Date[]> = {};
      failureWos.forEach(wo => {
        if (!assetFailures[wo.assetId!]) assetFailures[wo.assetId!] = [];
        assetFailures[wo.assetId!].push(new Date(wo.createdAt!));
      });
      Object.values(assetFailures).forEach(dates => {
        for (let i = 1; i < dates.length; i++) {
          intervals.push((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
        }
      });
      if (intervals.length > 0) {
        mtbf = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      }
    }
    const assetUptime = orgAssets.length > 0 
      ? Math.round((orgAssets.filter(a => a.status === "operational").length / orgAssets.length) * 100) 
      : null;
    const pmCompliance = 85;
    let avgCostPerWo: number | null = null;
    const wosWithCost = completedWos.filter(w => Number(w.actualCost || 0) > 0);
    if (wosWithCost.length > 0) {
      avgCostPerWo = Math.round(wosWithCost.reduce((sum, w) => sum + Number(w.actualCost || 0), 0) / wosWithCost.length);
    }
    return { mttr, mtbf, assetUptime, pmCompliance, avgCostPerWo };
  }

  async getProcurementOverviewByOrg(orgId: number) {
    const orgReqs = await db.select().from(purchaseRequisitions).where(eq(purchaseRequisitions.orgId, orgId));
    const orgPos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId));
    return {
      pendingRequisitions: orgReqs.filter(r => r.status === "pending" || r.status === "submitted").length,
      approvedRequisitions: orgReqs.filter(r => r.status === "approved").length,
      openPurchaseOrders: orgPos.filter(p => p.status === "open" || p.status === "submitted").length,
      partiallyReceivedPOs: orgPos.filter(p => p.status === "partially_received").length,
      totalOpenPOValue: orgPos
        .filter(p => p.status === "open" || p.status === "submitted" || p.status === "partially_received")
        .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0),
    };
  }

  async getPartsAnalyticsByOrg(orgId: number) {
    const orgParts = await db.select().from(parts).where(eq(parts.orgId, orgId));
    const orgPartIds = new Set(orgParts.map(p => p.id));
    
    // Get all transactions and filter by org parts (since transactions don't have orgId)
    const allTransactions = await db.select().from(inventoryTransactions);
    const orgTransactions = allTransactions.filter(t => t.partId && orgPartIds.has(t.partId));
    
    const partUsage: Record<number, { count: number; cost: number }> = {};
    orgTransactions
      .filter(t => t.type === "part_consumption" && t.partId)
      .forEach(t => {
        if (!partUsage[t.partId!]) partUsage[t.partId!] = { count: 0, cost: 0 };
        partUsage[t.partId!].count += Number(t.quantity || 1);
        partUsage[t.partId!].cost += Number(t.totalCost || 0);
      });
    const topUsedParts = Object.entries(partUsage)
      .map(([partId, usage]) => {
        const part = orgParts.find(p => p.id === parseInt(partId));
        return {
          partId: parseInt(partId),
          partNumber: part?.partNumber || "Unknown",
          partName: part?.name || "Unknown",
          usageCount: usage.count,
          totalCost: usage.cost,
        };
      })
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
    const lowStockCritical = orgParts.filter(p => {
      const qty = Number(p.quantityOnHand || 0);
      const reorder = Number(p.reorderPoint || 0);
      return qty <= reorder && qty <= 5;
    }).length;
    return { topUsedParts, lowStockCritical };
  }

  async getTireHealthStats(orgId?: number) {
    let allTires: Tire[];
    if (orgId) {
      allTires = await db.select().from(tires).where(eq(tires.orgId, orgId));
    } else {
      allTires = await db.select().from(tires);
    }
    
    const installedTires = allTires.filter(t => t.status === "installed");
    const healthyTires = installedTires.filter(t => t.condition === "new" || t.condition === "good");
    const warningTires = installedTires.filter(t => t.condition === "fair" || t.condition === "worn");
    const criticalTires = installedTires.filter(t => t.condition === "critical" || t.condition === "failed");
    
    const tiresWithDepth = installedTires.filter(t => t.treadDepth !== null);
    const avgTreadDepth = tiresWithDepth.length > 0 
      ? tiresWithDepth.reduce((sum, t) => sum + Number(t.treadDepth || 0), 0) / tiresWithDepth.length
      : 0;
    
    const allAssets = await db.select().from(assets);
    const assetMap = new Map(allAssets.map(a => [a.id, a]));
    
    const tiresNeedingReplacement = criticalTires.slice(0, 5).map(tire => ({
      id: tire.id,
      serialNumber: tire.serialNumber,
      assetName: tire.assetId ? (assetMap.get(tire.assetId)?.name || "Unknown") : "In Inventory",
      position: tire.position || "",
      treadDepth: Number(tire.treadDepth || 0),
      condition: tire.condition || "unknown",
    }));
    
    return {
      totalTires: installedTires.length,
      healthyTires: healthyTires.length,
      warningTires: warningTires.length,
      criticalTires: criticalTires.length,
      averageTreadDepth: avgTreadDepth,
      tiresNeedingReplacement,
    };
  }

  async getPartKitsByOrg(orgId: number): Promise<PartKit[]> {
    return db.select().from(partKits).where(eq(partKits.orgId, orgId)).orderBy(partKits.name);
  }

  async getCycleCountsByOrg(orgId: number): Promise<CycleCount[]> {
    return db.select().from(cycleCounts).where(eq(cycleCounts.orgId, orgId)).orderBy(desc(cycleCounts.scheduledDate));
  }

  async getChecklistTemplatesByOrg(orgId: number): Promise<ChecklistTemplate[]> {
    return db.select().from(checklistTemplates).where(eq(checklistTemplates.orgId, orgId)).orderBy(checklistTemplates.name);
  }

  async getPartRequestsByOrg(orgId: number, status?: string): Promise<PartRequest[]> {
    if (status) {
      return db.select().from(partRequests)
        .where(and(eq(partRequests.orgId, orgId), eq(partRequests.status, status)))
        .orderBy(desc(partRequests.createdAt));
    }
    return db.select().from(partRequests).where(eq(partRequests.orgId, orgId)).orderBy(desc(partRequests.createdAt));
  }

  async getNotificationsByOrg(orgId: number, userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.orgId, orgId), eq(notifications.userId, userId), isNull(notifications.dismissedAt)))
      .orderBy(desc(notifications.createdAt));
  }

  async getDashboardStatsByOrg(orgId: number): Promise<{
    totalAssets: number;
    operationalAssets: number;
    inMaintenanceAssets: number;
    downAssets: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    partsLowStock: number;
    pmDueThisWeek: number;
  }> {
    const orgAssets = await db.select().from(assets).where(eq(assets.orgId, orgId));
    const orgWorkOrders = await db.select().from(workOrders).where(eq(workOrders.orgId, orgId));
    const orgParts = await db.select().from(parts).where(eq(parts.orgId, orgId));

    const operational = orgAssets.filter(a => a.status === "operational").length;
    const inMaintenance = orgAssets.filter(a => a.status === "in_maintenance").length;
    const down = orgAssets.filter(a => a.status === "down").length;
    const openWos = orgWorkOrders.filter(w => w.status === "open" || w.status === "in_progress").length;
    const overdueWos = orgWorkOrders.filter(w => w.dueDate && new Date(w.dueDate) < new Date() && w.status !== "completed" && w.status !== "cancelled").length;
    const lowStock = orgParts.filter(p => p.reorderPoint && p.quantityOnHand && parseFloat(p.quantityOnHand) <= parseFloat(p.reorderPoint)).length;

    // Calculate PM due this week - join pmAssetInstances with pmSchedules to filter by org
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    
    const orgPmSchedules = await db.select().from(pmSchedules).where(eq(pmSchedules.orgId, orgId));
    const orgPmScheduleIds = new Set(orgPmSchedules.map(pm => pm.id));
    
    const allPmInstances = await db.select().from(pmAssetInstances);
    const pmDueThisWeek = allPmInstances.filter(instance => {
      if (!orgPmScheduleIds.has(instance.pmScheduleId)) return false;
      if (!instance.nextDueDate) return false;
      const dueDate = new Date(instance.nextDueDate);
      return dueDate >= now && dueDate <= endOfWeek;
    }).length;

    return {
      totalAssets: orgAssets.length,
      operationalAssets: operational,
      inMaintenanceAssets: inMaintenance,
      downAssets: down,
      openWorkOrders: openWos,
      overdueWorkOrders: overdueWos,
      partsLowStock: lowStock,
      pmDueThisWeek,
    };
  }

  // Validate entity belongs to org
  async validateAssetOrg(assetId: number, orgId: number): Promise<boolean> {
    const [asset] = await db.select().from(assets).where(and(eq(assets.id, assetId), eq(assets.orgId, orgId)));
    return !!asset;
  }

  async validateWorkOrderOrg(workOrderId: number, orgId: number): Promise<boolean> {
    const [wo] = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), eq(workOrders.orgId, orgId)));
    return !!wo;
  }

  async validatePartOrg(partId: number, orgId: number): Promise<boolean> {
    const [part] = await db.select().from(parts).where(and(eq(parts.id, partId), eq(parts.orgId, orgId)));
    return !!part;
  }

  // Tires
  async getTiresByOrg(orgId: number): Promise<Tire[]> {
    return db.select().from(tires).where(eq(tires.orgId, orgId)).orderBy(desc(tires.createdAt));
  }

  async getTires(): Promise<Tire[]> {
    return db.select().from(tires).orderBy(desc(tires.createdAt));
  }

  async getTire(id: number): Promise<Tire | undefined> {
    const [tire] = await db.select().from(tires).where(eq(tires.id, id));
    return tire;
  }

  async createTire(data: InsertTire & { orgId?: number }): Promise<Tire> {
    const [tire] = await db.insert(tires).values(data).returning();
    return tire;
  }

  async updateTire(id: number, data: Partial<InsertTire>): Promise<Tire | undefined> {
    const [tire] = await db.update(tires).set({ ...data, updatedAt: new Date() }).where(eq(tires.id, id)).returning();
    return tire;
  }

  async deleteTire(id: number): Promise<void> {
    await db.delete(tires).where(eq(tires.id, id));
  }

  // Conversations
  async getConversationsByOrg(orgId: number): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.orgId, orgId)).orderBy(desc(conversations.updatedAt));
  }

  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(data: InsertConversation & { orgId?: number }): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  // Messages
  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  // Saved Reports
  async getSavedReportsByOrg(orgId: number): Promise<SavedReport[]> {
    return db.select().from(savedReports).where(eq(savedReports.orgId, orgId)).orderBy(desc(savedReports.createdAt));
  }

  async getSavedReports(): Promise<SavedReport[]> {
    return db.select().from(savedReports).orderBy(desc(savedReports.createdAt));
  }

  async getSavedReport(id: number): Promise<SavedReport | undefined> {
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    return report;
  }

  async createSavedReport(data: InsertSavedReport & { orgId?: number }): Promise<SavedReport> {
    const [report] = await db.insert(savedReports).values(data).returning();
    return report;
  }

  async deleteSavedReport(id: number): Promise<void> {
    await db.delete(savedReports).where(eq(savedReports.id, id));
  }

  // GPS Locations
  async getGpsLocationsByOrg(orgId: number, assetId?: number): Promise<GpsLocation[]> {
    if (assetId) {
      return db.select().from(gpsLocations)
        .where(and(eq(gpsLocations.orgId, orgId), eq(gpsLocations.assetId, assetId)))
        .orderBy(desc(gpsLocations.timestamp))
        .limit(100);
    }
    return db.select().from(gpsLocations).where(eq(gpsLocations.orgId, orgId)).orderBy(desc(gpsLocations.timestamp)).limit(100);
  }

  async getGpsLocations(assetId?: number): Promise<GpsLocation[]> {
    if (assetId) {
      return db.select().from(gpsLocations).where(eq(gpsLocations.assetId, assetId)).orderBy(desc(gpsLocations.timestamp)).limit(100);
    }
    return db.select().from(gpsLocations).orderBy(desc(gpsLocations.timestamp)).limit(100);
  }

  async getGpsLocationsByAsset(assetId: number): Promise<GpsLocation[]> {
    return db.select().from(gpsLocations).where(eq(gpsLocations.assetId, assetId)).orderBy(desc(gpsLocations.timestamp)).limit(100);
  }

  async createGpsLocation(data: InsertGpsLocation & { orgId?: number }): Promise<GpsLocation> {
    const [loc] = await db.insert(gpsLocations).values(data).returning();
    return loc;
  }

  // Tire Replacement Settings
  async getTireReplacementSettingsByOrg(orgId: number): Promise<TireReplacementSetting[]> {
    return db.select().from(tireReplacementSettings).where(eq(tireReplacementSettings.orgId, orgId));
  }

  async getTireReplacementSetting(id: number): Promise<TireReplacementSetting | undefined> {
    const [setting] = await db.select().from(tireReplacementSettings).where(eq(tireReplacementSettings.id, id));
    return setting;
  }

  async createTireReplacementSetting(data: InsertTireReplacementSetting): Promise<TireReplacementSetting> {
    const [setting] = await db.insert(tireReplacementSettings).values(data).returning();
    return setting;
  }

  async updateTireReplacementSetting(id: number, data: Partial<InsertTireReplacementSetting>): Promise<TireReplacementSetting | undefined> {
    const [updated] = await db.update(tireReplacementSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tireReplacementSettings.id, id))
      .returning();
    return updated;
  }

  async deleteTireReplacementSetting(id: number): Promise<void> {
    await db.delete(tireReplacementSettings).where(eq(tireReplacementSettings.id, id));
  }

  // Public Asset Tokens (for QR Code DVIR)
  async getPublicAssetTokensByOrg(orgId: number): Promise<PublicAssetToken[]> {
    return db.select().from(publicAssetTokens).where(eq(publicAssetTokens.orgId, orgId));
  }

  async getPublicAssetTokenByAsset(assetId: number): Promise<PublicAssetToken | undefined> {
    const [token] = await db.select().from(publicAssetTokens)
      .where(and(eq(publicAssetTokens.assetId, assetId), eq(publicAssetTokens.isActive, true)));
    return token;
  }

  async getPublicAssetTokenByToken(token: string): Promise<PublicAssetToken | undefined> {
    const [tokenRecord] = await db.select().from(publicAssetTokens)
      .where(and(eq(publicAssetTokens.token, token), eq(publicAssetTokens.isActive, true)));
    return tokenRecord;
  }

  async createPublicAssetToken(data: InsertPublicAssetToken): Promise<PublicAssetToken> {
    const [token] = await db.insert(publicAssetTokens).values(data).returning();
    return token;
  }

  async updatePublicAssetToken(id: number, data: Partial<InsertPublicAssetToken>): Promise<PublicAssetToken | undefined> {
    const [updated] = await db.update(publicAssetTokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(publicAssetTokens.id, id))
      .returning();
    return updated;
  }

  async deletePublicAssetToken(id: number): Promise<void> {
    await db.delete(publicAssetTokens).where(eq(publicAssetTokens.id, id));
  }

  // Get asset details for public DVIR submission
  async getAssetForPublicDvir(token: string): Promise<{ asset: Asset; org: Organization } | undefined> {
    const tokenRecord = await this.getPublicAssetTokenByToken(token);
    if (!tokenRecord) return undefined;
    
    const asset = await this.getAsset(tokenRecord.assetId);
    if (!asset) return undefined;
    
    const org = await this.getOrganization(tokenRecord.orgId);
    if (!org) return undefined;
    
    return { asset, org };
  }
}

export const storage = new DatabaseStorage();
