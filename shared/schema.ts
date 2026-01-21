import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// ============================================================
// LOCATIONS
// ============================================================
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("USA"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============================================================
// ASSETS
// ============================================================
export const assetStatusEnum = ["operational", "in_maintenance", "down", "retired", "pending_inspection"] as const;
export const assetTypeEnum = ["vehicle", "equipment", "facility", "tool", "other"] as const;

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetNumber: text("asset_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<typeof assetTypeEnum[number]>(),
  status: text("status").notNull().default("operational").$type<typeof assetStatusEnum[number]>(),
  locationId: integer("location_id").references(() => locations.id),
  parentAssetId: integer("parent_asset_id"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  year: integer("year"),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
  warrantyExpiration: timestamp("warranty_expiration"),
  meterType: text("meter_type"), // miles, hours, cycles
  currentMeterReading: decimal("current_meter_reading", { precision: 12, scale: 2 }),
  lastMeterUpdate: timestamp("last_meter_update"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_assets_status").on(table.status),
  index("idx_assets_location").on(table.locationId),
  index("idx_assets_type").on(table.type),
]);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  location: one(locations, { fields: [assets.locationId], references: [locations.id] }),
  parentAsset: one(assets, { fields: [assets.parentAssetId], references: [assets.id] }),
  workOrders: many(workOrders),
  pmSchedules: many(pmAssetInstances),
}));

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// ============================================================
// VENDORS
// ============================================================
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  website: text("website"),
  notes: text("notes"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// ============================================================
// PARTS / INVENTORY
// ============================================================
export const partCategoryEnum = ["filters", "fluids", "electrical", "brakes", "engine", "transmission", "hvac", "body", "tires", "general"] as const;
export const abcClassEnum = ["A", "B", "C"] as const;

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").$type<typeof partCategoryEnum[number]>(),
  abcClass: text("abc_class").$type<typeof abcClassEnum[number]>(),
  unitOfMeasure: text("unit_of_measure").default("each"),
  quantityOnHand: decimal("quantity_on_hand", { precision: 12, scale: 2 }).default("0"),
  quantityReserved: decimal("quantity_reserved", { precision: 12, scale: 2 }).default("0"),
  reorderPoint: decimal("reorder_point", { precision: 12, scale: 2 }).default("0"),
  reorderQuantity: decimal("reorder_quantity", { precision: 12, scale: 2 }).default("0"),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  locationId: integer("location_id").references(() => locations.id),
  binLocation: text("bin_location"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  vendorPartNumber: text("vendor_part_number"),
  barcode: text("barcode"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_parts_category").on(table.category),
  index("idx_parts_location").on(table.locationId),
]);

export const partsRelations = relations(parts, ({ one }) => ({
  location: one(locations, { fields: [parts.locationId], references: [locations.id] }),
  vendor: one(vendors, { fields: [parts.vendorId], references: [vendors.id] }),
}));

export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// ============================================================
// WORK ORDERS
// ============================================================
export const workOrderStatusEnum = ["open", "in_progress", "on_hold", "completed", "cancelled"] as const;
export const workOrderTypeEnum = ["corrective", "preventive", "inspection", "emergency"] as const;
export const workOrderPriorityEnum = ["low", "medium", "high", "critical"] as const;

export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  workOrderNumber: text("work_order_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<typeof workOrderTypeEnum[number]>(),
  status: text("status").notNull().default("open").$type<typeof workOrderStatusEnum[number]>(),
  priority: text("priority").notNull().default("medium").$type<typeof workOrderPriorityEnum[number]>(),
  assetId: integer("asset_id").references(() => assets.id),
  locationId: integer("location_id").references(() => locations.id),
  assignedToId: varchar("assigned_to_id"),
  requestedById: varchar("requested_by_id"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }),
  pmScheduleId: integer("pm_schedule_id"),
  failureCode: text("failure_code"),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_work_orders_status").on(table.status),
  index("idx_work_orders_asset").on(table.assetId),
  index("idx_work_orders_priority").on(table.priority),
]);

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  asset: one(assets, { fields: [workOrders.assetId], references: [assets.id] }),
  location: one(locations, { fields: [workOrders.locationId], references: [locations.id] }),
  lines: many(workOrderLines),
  transactions: many(workOrderTransactions),
}));

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

// ============================================================
// WORK ORDER LINES
// ============================================================
export const workOrderLineStatusEnum = ["pending", "in_progress", "completed", "cancelled"] as const;

export const workOrderLines = pgTable("work_order_lines", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending").$type<typeof workOrderLineStatusEnum[number]>(),
  vmrsCode: text("vmrs_code"),
  laborHours: decimal("labor_hours", { precision: 8, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  technicianId: varchar("technician_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workOrderLinesRelations = relations(workOrderLines, ({ one }) => ({
  workOrder: one(workOrders, { fields: [workOrderLines.workOrderId], references: [workOrders.id] }),
}));

export const insertWorkOrderLineSchema = createInsertSchema(workOrderLines).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkOrderLine = z.infer<typeof insertWorkOrderLineSchema>;
export type WorkOrderLine = typeof workOrderLines.$inferSelect;

// ============================================================
// WORK ORDER TRANSACTIONS (Audit Trail)
// ============================================================
export const transactionTypeEnum = ["part_consumption", "time_entry", "status_change", "note", "attachment"] as const;

export const workOrderTransactions = pgTable("work_order_transactions", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  workOrderLineId: integer("work_order_line_id").references(() => workOrderLines.id),
  type: text("type").notNull().$type<typeof transactionTypeEnum[number]>(),
  partId: integer("part_id").references(() => parts.id),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  hours: decimal("hours", { precision: 8, scale: 2 }),
  description: text("description"),
  performedById: varchar("performed_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workOrderTransactionsRelations = relations(workOrderTransactions, ({ one }) => ({
  workOrder: one(workOrders, { fields: [workOrderTransactions.workOrderId], references: [workOrders.id] }),
  workOrderLine: one(workOrderLines, { fields: [workOrderTransactions.workOrderLineId], references: [workOrderLines.id] }),
  part: one(parts, { fields: [workOrderTransactions.partId], references: [parts.id] }),
}));

export const insertWorkOrderTransactionSchema = createInsertSchema(workOrderTransactions).omit({ id: true, createdAt: true });
export type InsertWorkOrderTransaction = z.infer<typeof insertWorkOrderTransactionSchema>;
export type WorkOrderTransaction = typeof workOrderTransactions.$inferSelect;

// ============================================================
// PREVENTIVE MAINTENANCE SCHEDULES
// ============================================================
export const pmIntervalTypeEnum = ["days", "miles", "hours", "cycles"] as const;

export const pmSchedules = pgTable("pm_schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  intervalType: text("interval_type").notNull().$type<typeof pmIntervalTypeEnum[number]>(),
  intervalValue: integer("interval_value").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  priority: text("priority").default("medium").$type<typeof workOrderPriorityEnum[number]>(),
  taskChecklist: jsonb("task_checklist").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pmSchedulesRelations = relations(pmSchedules, ({ many }) => ({
  assetInstances: many(pmAssetInstances),
}));

export const insertPmScheduleSchema = createInsertSchema(pmSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmSchedule = z.infer<typeof insertPmScheduleSchema>;
export type PmSchedule = typeof pmSchedules.$inferSelect;

// ============================================================
// PM ASSET INSTANCES (PM per Asset)
// ============================================================
export const pmAssetInstances = pgTable("pm_asset_instances", {
  id: serial("id").primaryKey(),
  pmScheduleId: integer("pm_schedule_id").notNull().references(() => pmSchedules.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  lastCompletedDate: timestamp("last_completed_date"),
  lastCompletedMeter: decimal("last_completed_meter", { precision: 12, scale: 2 }),
  nextDueDate: timestamp("next_due_date"),
  nextDueMeter: decimal("next_due_meter", { precision: 12, scale: 2 }),
  isOverdue: boolean("is_overdue").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pm_asset_instances_overdue").on(table.isOverdue),
]);

export const pmAssetInstancesRelations = relations(pmAssetInstances, ({ one }) => ({
  pmSchedule: one(pmSchedules, { fields: [pmAssetInstances.pmScheduleId], references: [pmSchedules.id] }),
  asset: one(assets, { fields: [pmAssetInstances.assetId], references: [assets.id] }),
}));

export const insertPmAssetInstanceSchema = createInsertSchema(pmAssetInstances).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmAssetInstance = z.infer<typeof insertPmAssetInstanceSchema>;
export type PmAssetInstance = typeof pmAssetInstances.$inferSelect;

// ============================================================
// PURCHASE REQUISITIONS
// ============================================================
export const requisitionStatusEnum = ["draft", "submitted", "approved", "rejected", "ordered", "received"] as const;

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: serial("id").primaryKey(),
  requisitionNumber: text("requisition_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft").$type<typeof requisitionStatusEnum[number]>(),
  requestedById: varchar("requested_by_id"),
  approvedById: varchar("approved_by_id"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseRequisitionsRelations = relations(purchaseRequisitions, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchaseRequisitions.vendorId], references: [vendors.id] }),
  lines: many(purchaseRequisitionLines),
}));

export const insertPurchaseRequisitionSchema = createInsertSchema(purchaseRequisitions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseRequisition = z.infer<typeof insertPurchaseRequisitionSchema>;
export type PurchaseRequisition = typeof purchaseRequisitions.$inferSelect;

// ============================================================
// PURCHASE REQUISITION LINES
// ============================================================
export const purchaseRequisitionLines = pgTable("purchase_requisition_lines", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => purchaseRequisitions.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseRequisitionLinesRelations = relations(purchaseRequisitionLines, ({ one }) => ({
  requisition: one(purchaseRequisitions, { fields: [purchaseRequisitionLines.requisitionId], references: [purchaseRequisitions.id] }),
  part: one(parts, { fields: [purchaseRequisitionLines.partId], references: [parts.id] }),
}));

export const insertPurchaseRequisitionLineSchema = createInsertSchema(purchaseRequisitionLines).omit({ id: true, createdAt: true });
export type InsertPurchaseRequisitionLine = z.infer<typeof insertPurchaseRequisitionLineSchema>;
export type PurchaseRequisitionLine = typeof purchaseRequisitionLines.$inferSelect;

// ============================================================
// PURCHASE ORDERS
// ============================================================
export const poStatusEnum = ["draft", "sent", "acknowledged", "partial", "received", "cancelled"] as const;

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  status: text("status").notNull().default("draft").$type<typeof poStatusEnum[number]>(),
  orderDate: timestamp("order_date"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  requisition: one(purchaseRequisitions, { fields: [purchaseOrders.requisitionId], references: [purchaseRequisitions.id] }),
  vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
  lines: many(purchaseOrderLines),
}));

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// ============================================================
// PURCHASE ORDER LINES
// ============================================================
export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id),
  description: text("description").notNull(),
  quantityOrdered: decimal("quantity_ordered", { precision: 12, scale: 2 }).notNull(),
  quantityReceived: decimal("quantity_received", { precision: 12, scale: 2 }).default("0"),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderLines.poId], references: [purchaseOrders.id] }),
  part: one(parts, { fields: [purchaseOrderLines.partId], references: [parts.id] }),
}));

export const insertPurchaseOrderLineSchema = createInsertSchema(purchaseOrderLines).omit({ id: true, createdAt: true });
export type InsertPurchaseOrderLine = z.infer<typeof insertPurchaseOrderLineSchema>;
export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;

// ============================================================
// MANUALS (Maintenance & Parts Manuals)
// ============================================================
export const manualTypeEnum = ["maintenance", "parts", "service", "operator", "other"] as const;

export const manuals = pgTable("manuals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().$type<typeof manualTypeEnum[number]>(),
  description: text("description"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  year: integer("year"),
  version: text("version"),
  isActive: boolean("is_active").default(true),
  uploadedById: varchar("uploaded_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const manualsRelations = relations(manuals, ({ many }) => ({
  assetLinks: many(assetManuals),
  sections: many(manualSections),
}));

export const insertManualSchema = createInsertSchema(manuals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManual = z.infer<typeof insertManualSchema>;
export type Manual = typeof manuals.$inferSelect;

// ============================================================
// MANUAL SECTIONS (AI-extracted)
// ============================================================
export const manualSections = pgTable("manual_sections", {
  id: serial("id").primaryKey(),
  manualId: integer("manual_id").notNull().references(() => manuals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),
  content: text("content"),
  keywords: text("keywords").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const manualSectionsRelations = relations(manualSections, ({ one }) => ({
  manual: one(manuals, { fields: [manualSections.manualId], references: [manuals.id] }),
}));

export const insertManualSectionSchema = createInsertSchema(manualSections).omit({ id: true, createdAt: true });
export type InsertManualSection = z.infer<typeof insertManualSectionSchema>;
export type ManualSection = typeof manualSections.$inferSelect;

// ============================================================
// ASSET-MANUAL LINKS
// ============================================================
export const assetManuals = pgTable("asset_manuals", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  manualId: integer("manual_id").notNull().references(() => manuals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assetManualsRelations = relations(assetManuals, ({ one }) => ({
  asset: one(assets, { fields: [assetManuals.assetId], references: [assets.id] }),
  manual: one(manuals, { fields: [assetManuals.manualId], references: [manuals.id] }),
}));

export const insertAssetManualSchema = createInsertSchema(assetManuals).omit({ id: true, createdAt: true });
export type InsertAssetManual = z.infer<typeof insertAssetManualSchema>;
export type AssetManual = typeof assetManuals.$inferSelect;

// ============================================================
// DVIR (Driver Vehicle Inspection Reports)
// ============================================================
export const dvirStatusEnum = ["safe", "defects_noted", "unsafe"] as const;

export const dvirs = pgTable("dvirs", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  inspectorId: varchar("inspector_id"),
  inspectionDate: timestamp("inspection_date").notNull().defaultNow(),
  status: text("status").notNull().default("safe").$type<typeof dvirStatusEnum[number]>(),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }),
  preTrip: boolean("pre_trip").default(true),
  notes: text("notes"),
  signature: text("signature"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dvirsRelations = relations(dvirs, ({ one, many }) => ({
  asset: one(assets, { fields: [dvirs.assetId], references: [assets.id] }),
  defects: many(dvirDefects),
}));

export const insertDvirSchema = createInsertSchema(dvirs).omit({ id: true, createdAt: true });
export type InsertDvir = z.infer<typeof insertDvirSchema>;
export type Dvir = typeof dvirs.$inferSelect;

// ============================================================
// DVIR DEFECTS
// ============================================================
export const defectSeverityEnum = ["minor", "major", "critical"] as const;

export const dvirDefects = pgTable("dvir_defects", {
  id: serial("id").primaryKey(),
  dvirId: integer("dvir_id").notNull().references(() => dvirs.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().$type<typeof defectSeverityEnum[number]>(),
  photoUrl: text("photo_url"),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dvirDefectsRelations = relations(dvirDefects, ({ one }) => ({
  dvir: one(dvirs, { fields: [dvirDefects.dvirId], references: [dvirs.id] }),
  workOrder: one(workOrders, { fields: [dvirDefects.workOrderId], references: [workOrders.id] }),
}));

export const insertDvirDefectSchema = createInsertSchema(dvirDefects).omit({ id: true, createdAt: true });
export type InsertDvirDefect = z.infer<typeof insertDvirDefectSchema>;
export type DvirDefect = typeof dvirDefects.$inferSelect;

// ============================================================
// FEEDBACK SYSTEM
// ============================================================
export const feedbackTypeEnum = ["bug", "feature_request", "improvement", "question", "praise"] as const;
export const feedbackStatusEnum = ["new", "under_review", "planned", "in_progress", "completed", "declined"] as const;
export const feedbackPriorityEnum = ["low", "medium", "high", "urgent"] as const;

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  type: text("type").notNull().$type<typeof feedbackTypeEnum[number]>(),
  status: text("status").notNull().default("new").$type<typeof feedbackStatusEnum[number]>(),
  priority: text("priority").default("medium").$type<typeof feedbackPriorityEnum[number]>(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  screenshotUrl: text("screenshot_url"),
  votes: integer("votes").default(0),
  aiSentiment: text("ai_sentiment"),
  aiCategory: text("ai_category"),
  responseNotes: text("response_notes"),
  respondedById: varchar("responded_by_id"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feedback_status").on(table.status),
  index("idx_feedback_type").on(table.type),
]);

export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// ============================================================
// REORDER ALERTS
// ============================================================
export const reorderAlerts = pgTable("reorder_alerts", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").notNull().references(() => parts.id),
  currentQuantity: decimal("current_quantity", { precision: 12, scale: 2 }).notNull(),
  reorderPoint: decimal("reorder_point", { precision: 12, scale: 2 }).notNull(),
  suggestedQuantity: decimal("suggested_quantity", { precision: 12, scale: 2 }),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedById: varchar("acknowledged_by_id"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reorderAlertsRelations = relations(reorderAlerts, ({ one }) => ({
  part: one(parts, { fields: [reorderAlerts.partId], references: [parts.id] }),
}));

export const insertReorderAlertSchema = createInsertSchema(reorderAlerts).omit({ id: true, createdAt: true });
export type InsertReorderAlert = z.infer<typeof insertReorderAlertSchema>;
export type ReorderAlert = typeof reorderAlerts.$inferSelect;

// ============================================================
// AI PREDICTIONS
// ============================================================
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  predictionType: text("prediction_type").notNull(),
  prediction: text("prediction").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  recommendedAction: text("recommended_action"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  dueDate: timestamp("due_date"),
  acknowledged: boolean("acknowledged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictionsRelations = relations(predictions, ({ one }) => ({
  asset: one(assets, { fields: [predictions.assetId], references: [assets.id] }),
}));

export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

// ============================================================
// ACTIVITY LOG
// ============================================================
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activity_logs_entity").on(table.entityType, table.entityId),
]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
