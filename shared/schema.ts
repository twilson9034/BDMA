import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// ============================================================
// ORGANIZATIONS (Multi-tenant)
// ============================================================
export const organizationPlanEnum = ["starter", "professional", "enterprise"] as const;
export const organizationStatusEnum = ["active", "suspended", "cancelled"] as const;

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").default("starter").$type<typeof organizationPlanEnum[number]>(),
  status: text("status").default("active").$type<typeof organizationStatusEnum[number]>(),
  parentOrgId: integer("parent_org_id"), // Parent organization for subsidiary relationships
  logoUrl: text("logo_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  maxAssets: integer("max_assets").default(25), // Fleet size limit based on plan
  allowMultiLocationTechs: boolean("allow_multi_location_techs").default(false), // Allow technicians at multiple locations
  requireEstimateApproval: boolean("require_estimate_approval").default(false), // Require approval before converting estimates to WO
  requireRequisitionApproval: boolean("require_requisition_approval").default(true), // Require approval for purchase requisitions
  requirePOApproval: boolean("require_po_approval").default(true), // Require approval for purchase orders
  enableBarcodeSystem: boolean("enable_barcode_system").default(false), // Enable barcode printing for inventory
  enableOosChecking: boolean("enable_oos_checking").default(false), // Enable OOS compliance checking on checklists/DVIRs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const updateOrganizationSchema = insertOrganizationSchema.partial().pick({ 
  name: true, 
  slug: true,
  requireEstimateApproval: true,
  requireRequisitionApproval: true,
  requirePOApproval: true,
  enableBarcodeSystem: true,
  enableOosChecking: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// ============================================================
// ORGANIZATION MEMBERSHIPS
// ============================================================
export const orgRoleEnum = ["owner", "admin", "manager", "technician", "viewer"] as const;

export const orgMemberships = pgTable("org_memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").default("technician").$type<typeof orgRoleEnum[number]>(),
  customRoleId: integer("custom_role_id"), // Link to custom role for granular permissions
  primaryLocationId: integer("primary_location_id"), // Technician's primary/default location for filtering
  isCorporateAdmin: boolean("is_corporate_admin").default(false), // Can view/manage subsidiary organizations
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // User's default org
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }), // Technician's hourly wage rate
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_org_memberships_user").on(table.userId),
  index("idx_org_memberships_org").on(table.orgId),
]);

export const orgMembershipsRelations = relations(orgMemberships, ({ one }) => ({
  organization: one(organizations, { fields: [orgMemberships.orgId], references: [organizations.id] }),
}));

export const insertOrgMembershipSchema = createInsertSchema(orgMemberships).omit({ id: true, createdAt: true, updatedAt: true });
export const updateOrgMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "manager", "technician", "viewer", "dev"]),
});
export const updateMemberLocationSchema = z.object({
  primaryLocationId: z.number().nullable(),
});
export const updateMemberHourlyRateSchema = z.object({
  hourlyRate: z.string().nullable(),
});
export const setParentOrgSchema = z.object({
  parentOrgId: z.number().nullable(),
});
export const updateCorporateAdminSchema = z.object({
  isCorporateAdmin: z.boolean(),
});
export type InsertOrgMembership = z.infer<typeof insertOrgMembershipSchema>;
export type UpdateOrgMemberRole = z.infer<typeof updateOrgMemberRoleSchema>;
export type UpdateMemberLocation = z.infer<typeof updateMemberLocationSchema>;
export type UpdateMemberHourlyRate = z.infer<typeof updateMemberHourlyRateSchema>;
export type SetParentOrg = z.infer<typeof setParentOrgSchema>;
export type UpdateCorporateAdmin = z.infer<typeof updateCorporateAdminSchema>;
export type OrgMembership = typeof orgMemberships.$inferSelect;

// ============================================================
// CUSTOM ROLES (Granular permissions per organization)
// ============================================================
export const customRoles = pgTable("custom_roles", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"), // Role badge color
  isSystem: boolean("is_system").default(false), // System roles can't be deleted
  isDefault: boolean("is_default").default(false), // Default role for new members
  permissions: jsonb("permissions").notNull().$type<RolePermissions>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_custom_roles_org").on(table.orgId),
]);

// Granular permissions structure
export interface RolePermissions {
  // Assets
  assets: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewCost: boolean; // View cost/value info
    manageDocuments: boolean;
    manageImages: boolean;
  };
  // Work Orders
  workOrders: {
    view: boolean;
    viewAll: boolean; // View all WOs vs only assigned
    create: boolean;
    edit: boolean;
    delete: boolean;
    assign: boolean;
    complete: boolean;
    approve: boolean; // Approve completed work
    viewCost: boolean;
  };
  // Inventory/Parts
  inventory: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    adjustQuantity: boolean;
    viewCost: boolean;
    managePricing: boolean;
    manageVendors: boolean;
  };
  // Procurement
  procurement: {
    viewRequisitions: boolean;
    createRequisitions: boolean;
    approveRequisitions: boolean;
    viewPurchaseOrders: boolean;
    createPurchaseOrders: boolean;
    approvePurchaseOrders: boolean;
    receiveOrders: boolean;
  };
  // Scheduling & PM
  scheduling: {
    viewSchedules: boolean;
    createSchedules: boolean;
    editSchedules: boolean;
    deleteSchedules: boolean;
  };
  // DVIRs & Inspections
  inspections: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    overrideUnsafe: boolean; // Override unsafe status
  };
  // Estimates
  estimates: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    viewCost: boolean;
  };
  // Reports & Analytics
  reports: {
    viewDashboard: boolean;
    viewReports: boolean;
    createReports: boolean;
    exportData: boolean;
  };
  // AI & Predictions
  ai: {
    viewPredictions: boolean;
    acknowledgePredictions: boolean;
    dismissPredictions: boolean;
    configureAI: boolean;
  };
  // Administration
  admin: {
    manageUsers: boolean;
    manageRoles: boolean;
    manageLocations: boolean;
    manageOrganization: boolean;
    viewAuditLog: boolean;
    manageIntegrations: boolean;
  };
}

// Default permission sets for standard roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  owner: {
    assets: { view: true, create: true, edit: true, delete: true, viewCost: true, manageDocuments: true, manageImages: true },
    workOrders: { view: true, viewAll: true, create: true, edit: true, delete: true, assign: true, complete: true, approve: true, viewCost: true },
    inventory: { view: true, create: true, edit: true, delete: true, adjustQuantity: true, viewCost: true, managePricing: true, manageVendors: true },
    procurement: { viewRequisitions: true, createRequisitions: true, approveRequisitions: true, viewPurchaseOrders: true, createPurchaseOrders: true, approvePurchaseOrders: true, receiveOrders: true },
    scheduling: { viewSchedules: true, createSchedules: true, editSchedules: true, deleteSchedules: true },
    inspections: { view: true, create: true, edit: true, delete: true, overrideUnsafe: true },
    estimates: { view: true, create: true, edit: true, delete: true, approve: true, viewCost: true },
    reports: { viewDashboard: true, viewReports: true, createReports: true, exportData: true },
    ai: { viewPredictions: true, acknowledgePredictions: true, dismissPredictions: true, configureAI: true },
    admin: { manageUsers: true, manageRoles: true, manageLocations: true, manageOrganization: true, viewAuditLog: true, manageIntegrations: true },
  },
  admin: {
    assets: { view: true, create: true, edit: true, delete: true, viewCost: true, manageDocuments: true, manageImages: true },
    workOrders: { view: true, viewAll: true, create: true, edit: true, delete: true, assign: true, complete: true, approve: true, viewCost: true },
    inventory: { view: true, create: true, edit: true, delete: true, adjustQuantity: true, viewCost: true, managePricing: true, manageVendors: true },
    procurement: { viewRequisitions: true, createRequisitions: true, approveRequisitions: true, viewPurchaseOrders: true, createPurchaseOrders: true, approvePurchaseOrders: true, receiveOrders: true },
    scheduling: { viewSchedules: true, createSchedules: true, editSchedules: true, deleteSchedules: true },
    inspections: { view: true, create: true, edit: true, delete: true, overrideUnsafe: true },
    estimates: { view: true, create: true, edit: true, delete: true, approve: true, viewCost: true },
    reports: { viewDashboard: true, viewReports: true, createReports: true, exportData: true },
    ai: { viewPredictions: true, acknowledgePredictions: true, dismissPredictions: true, configureAI: true },
    admin: { manageUsers: true, manageRoles: true, manageLocations: true, manageOrganization: false, viewAuditLog: true, manageIntegrations: true },
  },
  manager: {
    assets: { view: true, create: true, edit: true, delete: false, viewCost: true, manageDocuments: true, manageImages: true },
    workOrders: { view: true, viewAll: true, create: true, edit: true, delete: false, assign: true, complete: true, approve: true, viewCost: true },
    inventory: { view: true, create: true, edit: true, delete: false, adjustQuantity: true, viewCost: true, managePricing: false, manageVendors: true },
    procurement: { viewRequisitions: true, createRequisitions: true, approveRequisitions: true, viewPurchaseOrders: true, createPurchaseOrders: true, approvePurchaseOrders: false, receiveOrders: true },
    scheduling: { viewSchedules: true, createSchedules: true, editSchedules: true, deleteSchedules: false },
    inspections: { view: true, create: true, edit: true, delete: false, overrideUnsafe: true },
    estimates: { view: true, create: true, edit: true, delete: false, approve: true, viewCost: true },
    reports: { viewDashboard: true, viewReports: true, createReports: true, exportData: true },
    ai: { viewPredictions: true, acknowledgePredictions: true, dismissPredictions: true, configureAI: false },
    admin: { manageUsers: false, manageRoles: false, manageLocations: true, manageOrganization: false, viewAuditLog: false, manageIntegrations: false },
  },
  technician: {
    assets: { view: true, create: false, edit: false, delete: false, viewCost: false, manageDocuments: false, manageImages: true },
    workOrders: { view: true, viewAll: false, create: true, edit: true, delete: false, assign: false, complete: true, approve: false, viewCost: false },
    inventory: { view: true, create: false, edit: false, delete: false, adjustQuantity: true, viewCost: false, managePricing: false, manageVendors: false },
    procurement: { viewRequisitions: true, createRequisitions: true, approveRequisitions: false, viewPurchaseOrders: true, createPurchaseOrders: false, approvePurchaseOrders: false, receiveOrders: true },
    scheduling: { viewSchedules: true, createSchedules: false, editSchedules: false, deleteSchedules: false },
    inspections: { view: true, create: true, edit: true, delete: false, overrideUnsafe: false },
    estimates: { view: true, create: true, edit: true, delete: false, approve: false, viewCost: false },
    reports: { viewDashboard: true, viewReports: false, createReports: false, exportData: false },
    ai: { viewPredictions: true, acknowledgePredictions: true, dismissPredictions: false, configureAI: false },
    admin: { manageUsers: false, manageRoles: false, manageLocations: false, manageOrganization: false, viewAuditLog: false, manageIntegrations: false },
  },
  viewer: {
    assets: { view: true, create: false, edit: false, delete: false, viewCost: false, manageDocuments: false, manageImages: false },
    workOrders: { view: true, viewAll: true, create: false, edit: false, delete: false, assign: false, complete: false, approve: false, viewCost: false },
    inventory: { view: true, create: false, edit: false, delete: false, adjustQuantity: false, viewCost: false, managePricing: false, manageVendors: false },
    procurement: { viewRequisitions: true, createRequisitions: false, approveRequisitions: false, viewPurchaseOrders: true, createPurchaseOrders: false, approvePurchaseOrders: false, receiveOrders: false },
    scheduling: { viewSchedules: true, createSchedules: false, editSchedules: false, deleteSchedules: false },
    inspections: { view: true, create: false, edit: false, delete: false, overrideUnsafe: false },
    estimates: { view: true, create: false, edit: false, delete: false, approve: false, viewCost: false },
    reports: { viewDashboard: true, viewReports: true, createReports: false, exportData: false },
    ai: { viewPredictions: true, acknowledgePredictions: false, dismissPredictions: false, configureAI: false },
    admin: { manageUsers: false, manageRoles: false, manageLocations: false, manageOrganization: false, viewAuditLog: false, manageIntegrations: false },
  },
};

export const rolePermissionsSchema = z.object({
  assets: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    viewCost: z.boolean(),
    manageDocuments: z.boolean(),
    manageImages: z.boolean(),
  }),
  workOrders: z.object({
    view: z.boolean(),
    viewAll: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    assign: z.boolean(),
    complete: z.boolean(),
    approve: z.boolean(),
    viewCost: z.boolean(),
  }),
  inventory: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    adjustQuantity: z.boolean(),
    viewCost: z.boolean(),
    managePricing: z.boolean(),
    manageVendors: z.boolean(),
  }),
  procurement: z.object({
    viewRequisitions: z.boolean(),
    createRequisitions: z.boolean(),
    approveRequisitions: z.boolean(),
    viewPurchaseOrders: z.boolean(),
    createPurchaseOrders: z.boolean(),
    approvePurchaseOrders: z.boolean(),
    receiveOrders: z.boolean(),
  }),
  scheduling: z.object({
    viewSchedules: z.boolean(),
    createSchedules: z.boolean(),
    editSchedules: z.boolean(),
    deleteSchedules: z.boolean(),
  }),
  inspections: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    overrideUnsafe: z.boolean(),
  }),
  estimates: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    approve: z.boolean(),
    viewCost: z.boolean(),
  }),
  reports: z.object({
    viewDashboard: z.boolean(),
    viewReports: z.boolean(),
    createReports: z.boolean(),
    exportData: z.boolean(),
  }),
  ai: z.object({
    viewPredictions: z.boolean(),
    acknowledgePredictions: z.boolean(),
    dismissPredictions: z.boolean(),
    configureAI: z.boolean(),
  }),
  admin: z.object({
    manageUsers: z.boolean(),
    manageRoles: z.boolean(),
    manageLocations: z.boolean(),
    manageOrganization: z.boolean(),
    viewAuditLog: z.boolean(),
    manageIntegrations: z.boolean(),
  }),
});

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  permissions: rolePermissionsSchema,
});
export const updateCustomRoleSchema = insertCustomRoleSchema.partial();
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;
export type UpdateCustomRole = z.infer<typeof updateCustomRoleSchema>;
export type CustomRole = typeof customRoles.$inferSelect;

// ============================================================
// MEMBER LOCATION ASSIGNMENTS (for multi-location technicians)
// ============================================================
export const memberLocations = pgTable("member_locations", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => orgMemberships.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_member_locations_membership").on(table.membershipId),
  index("idx_member_locations_location").on(table.locationId),
]);

export const insertMemberLocationSchema = createInsertSchema(memberLocations).omit({ id: true, createdAt: true });
export type InsertMemberLocation = z.infer<typeof insertMemberLocationSchema>;
export type MemberLocation = typeof memberLocations.$inferSelect;

// ============================================================
// LOCATIONS
// ============================================================
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
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
}, (table) => [
  index("idx_locations_org").on(table.orgId),
]);

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============================================================
// VMRS CODES (Vehicle Maintenance Reporting Standards)
// ============================================================
export const vmrsCodes = pgTable("vmrs_codes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  systemCode: text("system_code"),
  assemblyCode: text("assembly_code"),
  componentCode: text("component_code"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vmrs_codes_org").on(table.orgId),
]);

export const insertVmrsCodeSchema = createInsertSchema(vmrsCodes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVmrsCode = z.infer<typeof insertVmrsCodeSchema>;
export type VmrsCode = typeof vmrsCodes.$inferSelect;

// ============================================================
// VMRS DICTIONARY (for auto-assign suggestions)
// ============================================================
export const vmrsDictionary = pgTable("vmrs_dictionary", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  systemCode: text("system_code").notNull(),
  assemblyCode: text("assembly_code"),
  componentCode: text("component_code"),
  title: text("title").notNull(),
  keywordsJson: jsonb("keywords_json").$type<string[]>().default([]),
  source: text("source").default("system"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vmrs_dictionary_org").on(table.orgId),
  index("idx_vmrs_dictionary_system").on(table.systemCode),
]);

export const insertVmrsDictionarySchema = createInsertSchema(vmrsDictionary).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVmrsDictionary = z.infer<typeof insertVmrsDictionarySchema>;
export type VmrsDictionary = typeof vmrsDictionary.$inferSelect;

// ============================================================
// OOS SOURCES (Out-of-Service Standards sources)
// ============================================================
export const oosSourceTypeEnum = ["CVSA_NEWS", "CVSA_PAGE", "FMCSA_FR", "UPLOADED_PDF", "MANUAL"] as const;

export const oosSources = pgTable("oos_sources", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  sourceType: text("source_type").notNull().$type<typeof oosSourceTypeEnum[number]>(),
  title: text("title").notNull(),
  url: text("url"),
  publishedDate: timestamp("published_date"),
  editionDate: timestamp("edition_date"),
  hash: text("hash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oos_sources_org").on(table.orgId),
]);

export const insertOosSourceSchema = createInsertSchema(oosSources).omit({ id: true, createdAt: true });
export type InsertOosSource = z.infer<typeof insertOosSourceSchema>;
export type OosSource = typeof oosSources.$inferSelect;

// ============================================================
// OOS RULES VERSIONS
// ============================================================
export const oosRulesVersionStatusEnum = ["DRAFT", "ACTIVE", "RETIRED"] as const;

export const oosRulesVersions = pgTable("oos_rules_versions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  effectiveStart: timestamp("effective_start").notNull(),
  effectiveEnd: timestamp("effective_end"),
  status: text("status").notNull().default("DRAFT").$type<typeof oosRulesVersionStatusEnum[number]>(),
  sourceIds: jsonb("source_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oos_versions_org").on(table.orgId),
  index("idx_oos_versions_status").on(table.status),
]);

export const insertOosRulesVersionSchema = createInsertSchema(oosRulesVersions).omit({ id: true, createdAt: true });
export type InsertOosRulesVersion = z.infer<typeof insertOosRulesVersionSchema>;
export type OosRulesVersion = typeof oosRulesVersions.$inferSelect;

// ============================================================
// OOS RULES
// ============================================================
export const oosRuleCategoryEnum = ["DRIVER", "VEHICLE", "CARGO_SECUREMENT", "HM_DG", "ADMIN"] as const;
export const oosRuleOutcomeEnum = ["OOS_DRIVER", "OOS_VEHICLE", "OOS_CARGO", "NOT_OOS", "TRIAGE"] as const;

export const oosRules = pgTable("oos_rules", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").references(() => oosRulesVersions.id).notNull(),
  category: text("category").notNull().$type<typeof oosRuleCategoryEnum[number]>(),
  vmrsSystemCode: text("vmrs_system_code"),
  title: text("title").notNull(),
  conditionJson: jsonb("condition_json").$type<object>(),
  outcome: text("outcome").notNull().$type<typeof oosRuleOutcomeEnum[number]>(),
  referenceJson: jsonb("reference_json").$type<object>(),
  explanationTemplate: text("explanation_template"),
  isTriageOnly: boolean("is_triage_only").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oos_rules_version").on(table.versionId),
  index("idx_oos_rules_category").on(table.category),
  index("idx_oos_rules_vmrs").on(table.vmrsSystemCode),
]);

export const insertOosRuleSchema = createInsertSchema(oosRules).omit({ id: true, createdAt: true });
export type InsertOosRule = z.infer<typeof insertOosRuleSchema>;
export type OosRule = typeof oosRules.$inferSelect;

// ============================================================
// OOS INSPECTIONS
// ============================================================
export const oosInspectionTypeEnum = ["LEVEL_I", "LEVEL_II", "LEVEL_III", "LEVEL_IV", "LEVEL_V", "LEVEL_VI", "LEVEL_VII", "LEVEL_VIII", "SHOP_PRETRIP", "ROADSIDE", "ANNUAL"] as const;
export const oosInspectionStatusEnum = ["PASS", "FAIL", "OOS", "PENDING"] as const;

export const oosInspections = pgTable("oos_inspections", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  assetId: integer("asset_id").references(() => assets.id),
  inspectionType: text("inspection_type").notNull().$type<typeof oosInspectionTypeEnum[number]>(),
  performedBy: text("performed_by"),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  rulesVersionId: integer("rules_version_id").references(() => oosRulesVersions.id),
  status: text("status").notNull().default("PENDING").$type<typeof oosInspectionStatusEnum[number]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oos_inspections_org").on(table.orgId),
  index("idx_oos_inspections_asset").on(table.assetId),
  index("idx_oos_inspections_status").on(table.status),
]);

export const insertOosInspectionSchema = createInsertSchema(oosInspections).omit({ id: true, createdAt: true });
export type InsertOosInspection = z.infer<typeof insertOosInspectionSchema>;
export type OosInspection = typeof oosInspections.$inferSelect;

// ============================================================
// OOS INSPECTION FINDINGS
// ============================================================
export const oosInspectionFindings = pgTable("oos_inspection_findings", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").references(() => oosInspections.id).notNull(),
  findingType: text("finding_type").notNull(),
  vmrsSystemCode: text("vmrs_system_code"),
  observedJson: jsonb("observed_json").$type<object>(),
  triggeredRuleIds: jsonb("triggered_rule_ids").$type<number[]>().default([]),
  outcome: text("outcome").$type<typeof oosRuleOutcomeEnum[number]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oos_findings_inspection").on(table.inspectionId),
  index("idx_oos_findings_vmrs").on(table.vmrsSystemCode),
]);

export const insertOosInspectionFindingSchema = createInsertSchema(oosInspectionFindings).omit({ id: true, createdAt: true });
export type InsertOosInspectionFinding = z.infer<typeof insertOosInspectionFindingSchema>;
export type OosInspectionFinding = typeof oosInspectionFindings.$inferSelect;

// ============================================================
// OOS CHANGE LOG
// ============================================================
export const oosChangeLog = pgTable("oos_change_log", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").references(() => oosRulesVersions.id).notNull(),
  changeSummary: text("change_summary").notNull(),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const insertOosChangeLogSchema = createInsertSchema(oosChangeLog).omit({ id: true, changedAt: true });
export type InsertOosChangeLog = z.infer<typeof insertOosChangeLogSchema>;
export type OosChangeLog = typeof oosChangeLog.$inferSelect;

// ============================================================
// ASSETS
// ============================================================
export const assetStatusEnum = ["operational", "in_maintenance", "down", "retired", "pending_inspection"] as const;
export const assetTypeEnum = ["vehicle", "equipment", "facility", "tool", "other"] as const;
export const assetLifecycleStatusEnum = ["active", "disposed", "sold", "transferred", "scrapped"] as const;

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  assetNumber: text("asset_number").notNull(),
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
  // Lifecycle fields
  lifecycleStatus: text("lifecycle_status").default("active").$type<typeof assetLifecycleStatusEnum[number]>(),
  dispositionDate: timestamp("disposition_date"),
  dispositionReason: text("disposition_reason"),
  salvageValue: decimal("salvage_value", { precision: 12, scale: 2 }),
  depreciationMethod: text("depreciation_method"),
  usefulLifeYears: integer("useful_life_years"),
  residualValue: decimal("residual_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_assets_org").on(table.orgId),
  index("idx_assets_status").on(table.status),
  index("idx_assets_location").on(table.locationId),
  index("idx_assets_type").on(table.type),
  index("idx_assets_lifecycle").on(table.lifecycleStatus),
]);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  location: one(locations, { fields: [assets.locationId], references: [locations.id] }),
  parentAsset: one(assets, { fields: [assets.parentAssetId], references: [assets.id] }),
  workOrders: many(workOrders),
  pmSchedules: many(pmAssetInstances),
  images: many(assetImages),
  documents: many(assetDocuments),
}));

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// ============================================================
// ASSET IMAGES
// ============================================================
export const assetImages = pgTable("asset_images", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isPrimary: boolean("is_primary").default(false),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_asset_images_asset").on(table.assetId),
]);

export const assetImagesRelations = relations(assetImages, ({ one }) => ({
  asset: one(assets, { fields: [assetImages.assetId], references: [assets.id] }),
}));

export const insertAssetImageSchema = createInsertSchema(assetImages).omit({ id: true, createdAt: true });
export type InsertAssetImage = z.infer<typeof insertAssetImageSchema>;
export type AssetImage = typeof assetImages.$inferSelect;

// ============================================================
// ASSET DOCUMENTS
// ============================================================
export const assetDocumentTypeEnum = ["manual", "warranty", "certificate", "inspection_report", "insurance", "registration", "maintenance_record", "other"] as const;

export const assetDocuments = pgTable("asset_documents", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  documentUrl: text("document_url").notNull(),
  fileName: text("file_name").notNull(),
  documentType: text("document_type").$type<typeof assetDocumentTypeEnum[number]>(),
  description: text("description"),
  expirationDate: timestamp("expiration_date"),
  uploadedBy: text("uploaded_by"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_asset_documents_asset").on(table.assetId),
  index("idx_asset_documents_type").on(table.documentType),
]);

export const assetDocumentsRelations = relations(assetDocuments, ({ one }) => ({
  asset: one(assets, { fields: [assetDocuments.assetId], references: [assets.id] }),
}));

export const insertAssetDocumentSchema = createInsertSchema(assetDocuments).omit({ id: true, createdAt: true });
export type InsertAssetDocument = z.infer<typeof insertAssetDocumentSchema>;
export type AssetDocument = typeof assetDocuments.$inferSelect;

// ============================================================
// ASSET BRAKE SETTINGS
// ============================================================
export const brakeTypeEnum = ["drum", "disc", "air_disc", "hydraulic_disc", "electric"] as const;
export const measurementUnitEnum = ["inches", "mm", "32nds"] as const;

export const assetBrakeSettings = pgTable("asset_brake_settings", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  axleCount: integer("axle_count").notNull().default(2),
  defaultMeasurementUnit: text("default_measurement_unit").default("32nds").$type<typeof measurementUnitEnum[number]>(),
  minBrakeThickness: decimal("min_brake_thickness", { precision: 6, scale: 3 }), // Minimum acceptable brake thickness
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_asset_brake_settings_asset").on(table.assetId),
]);

export const assetBrakeAxles = pgTable("asset_brake_axles", {
  id: serial("id").primaryKey(),
  brakeSettingsId: integer("brake_settings_id").notNull().references(() => assetBrakeSettings.id, { onDelete: "cascade" }),
  axlePosition: integer("axle_position").notNull(), // 1 = front, 2 = rear, 3+ for multi-axle
  axleLabel: text("axle_label"), // "Steer", "Drive", "Tag", "Pusher", etc.
  brakeType: text("brake_type").$type<typeof brakeTypeEnum[number]>(),
  leftBrakeType: text("left_brake_type").$type<typeof brakeTypeEnum[number]>(), // If different per side
  rightBrakeType: text("right_brake_type").$type<typeof brakeTypeEnum[number]>(),
  measurementUnit: text("measurement_unit").$type<typeof measurementUnitEnum[number]>(),
  minThickness: decimal("min_thickness", { precision: 6, scale: 3 }), // Override per axle
  notes: text("notes"),
}, (table) => [
  index("idx_asset_brake_axles_settings").on(table.brakeSettingsId),
]);

export const assetBrakeSettingsRelations = relations(assetBrakeSettings, ({ one, many }) => ({
  asset: one(assets, { fields: [assetBrakeSettings.assetId], references: [assets.id] }),
  axles: many(assetBrakeAxles),
}));

export const assetBrakeAxlesRelations = relations(assetBrakeAxles, ({ one }) => ({
  brakeSettings: one(assetBrakeSettings, { fields: [assetBrakeAxles.brakeSettingsId], references: [assetBrakeSettings.id] }),
}));

export const insertAssetBrakeSettingsSchema = createInsertSchema(assetBrakeSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssetBrakeAxleSchema = createInsertSchema(assetBrakeAxles).omit({ id: true });
export type InsertAssetBrakeSettings = z.infer<typeof insertAssetBrakeSettingsSchema>;
export type InsertAssetBrakeAxle = z.infer<typeof insertAssetBrakeAxleSchema>;
export type AssetBrakeSettings = typeof assetBrakeSettings.$inferSelect;
export type AssetBrakeAxle = typeof assetBrakeAxles.$inferSelect;

// ============================================================
// ASSET TIRE SETTINGS
// ============================================================
export const tireConfigEnum = ["single", "dual", "super_single"] as const;

export const assetTireSettings = pgTable("asset_tire_settings", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  axleCount: integer("axle_count").notNull().default(2),
  defaultTreadUnit: text("default_tread_unit").default("32nds").$type<typeof measurementUnitEnum[number]>(),
  minTreadDepth: decimal("min_tread_depth", { precision: 6, scale: 3 }), // Minimum acceptable tread depth
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_asset_tire_settings_asset").on(table.assetId),
]);

export const assetTireAxles = pgTable("asset_tire_axles", {
  id: serial("id").primaryKey(),
  tireSettingsId: integer("tire_settings_id").notNull().references(() => assetTireSettings.id, { onDelete: "cascade" }),
  axlePosition: integer("axle_position").notNull(), // 1 = steer, 2+ = drive/tag/etc
  axleLabel: text("axle_label"), // "Steer", "Drive 1", "Drive 2", "Tag", etc.
  tireConfig: text("tire_config").default("single").$type<typeof tireConfigEnum[number]>(), // single, dual, super_single
  targetPsiLeft: decimal("target_psi_left", { precision: 5, scale: 1 }),
  targetPsiRight: decimal("target_psi_right", { precision: 5, scale: 1 }),
  targetPsiInnerLeft: decimal("target_psi_inner_left", { precision: 5, scale: 1 }), // For duals
  targetPsiInnerRight: decimal("target_psi_inner_right", { precision: 5, scale: 1 }),
  treadUnit: text("tread_unit").$type<typeof measurementUnitEnum[number]>(),
  minTreadDepth: decimal("min_tread_depth", { precision: 6, scale: 3 }),
  tireSize: text("tire_size"), // e.g., "295/75R22.5"
  notes: text("notes"),
}, (table) => [
  index("idx_asset_tire_axles_settings").on(table.tireSettingsId),
]);

export const assetTireSettingsRelations = relations(assetTireSettings, ({ one, many }) => ({
  asset: one(assets, { fields: [assetTireSettings.assetId], references: [assets.id] }),
  axles: many(assetTireAxles),
}));

export const assetTireAxlesRelations = relations(assetTireAxles, ({ one }) => ({
  tireSettings: one(assetTireSettings, { fields: [assetTireAxles.tireSettingsId], references: [assetTireSettings.id] }),
}));

export const insertAssetTireSettingsSchema = createInsertSchema(assetTireSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssetTireAxleSchema = createInsertSchema(assetTireAxles).omit({ id: true });
export type InsertAssetTireSettings = z.infer<typeof insertAssetTireSettingsSchema>;
export type InsertAssetTireAxle = z.infer<typeof insertAssetTireAxleSchema>;
export type AssetTireSettings = typeof assetTireSettings.$inferSelect;
export type AssetTireAxle = typeof assetTireAxles.$inferSelect;

// ============================================================
// BRAKE INSPECTIONS (Work Order linked)
// ============================================================
export const inspectionResultEnum = ["pass", "fail", "needs_attention", "out_of_service"] as const;

export const brakeInspections = pgTable("brake_inspections", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  inspectorId: text("inspector_id"), // User ID
  inspectorName: text("inspector_name"),
  inspectedAt: timestamp("inspected_at").defaultNow(),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }),
  overallResult: text("overall_result").default("pass").$type<typeof inspectionResultEnum[number]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_brake_inspections_org").on(table.orgId),
  index("idx_brake_inspections_wo").on(table.workOrderId),
  index("idx_brake_inspections_asset").on(table.assetId),
]);

export const brakeInspectionAxles = pgTable("brake_inspection_axles", {
  id: serial("id").primaryKey(),
  brakeInspectionId: integer("brake_inspection_id").notNull().references(() => brakeInspections.id, { onDelete: "cascade" }),
  axlePosition: integer("axle_position").notNull(),
  axleLabel: text("axle_label"),
  // Left side measurements
  leftOuterThickness: decimal("left_outer_thickness", { precision: 6, scale: 3 }),
  leftInnerThickness: decimal("left_inner_thickness", { precision: 6, scale: 3 }),
  leftDrumDiameter: decimal("left_drum_diameter", { precision: 6, scale: 3 }),
  leftRotorThickness: decimal("left_rotor_thickness", { precision: 6, scale: 3 }),
  leftCondition: text("left_condition").$type<typeof inspectionResultEnum[number]>(),
  leftNotes: text("left_notes"),
  // Right side measurements
  rightOuterThickness: decimal("right_outer_thickness", { precision: 6, scale: 3 }),
  rightInnerThickness: decimal("right_inner_thickness", { precision: 6, scale: 3 }),
  rightDrumDiameter: decimal("right_drum_diameter", { precision: 6, scale: 3 }),
  rightRotorThickness: decimal("right_rotor_thickness", { precision: 6, scale: 3 }),
  rightCondition: text("right_condition").$type<typeof inspectionResultEnum[number]>(),
  rightNotes: text("right_notes"),
  measurementUnit: text("measurement_unit").$type<typeof measurementUnitEnum[number]>(),
}, (table) => [
  index("idx_brake_inspection_axles_inspection").on(table.brakeInspectionId),
]);

export const brakeInspectionsRelations = relations(brakeInspections, ({ one, many }) => ({
  workOrder: one(workOrders, { fields: [brakeInspections.workOrderId], references: [workOrders.id] }),
  asset: one(assets, { fields: [brakeInspections.assetId], references: [assets.id] }),
  axles: many(brakeInspectionAxles),
}));

export const brakeInspectionAxlesRelations = relations(brakeInspectionAxles, ({ one }) => ({
  inspection: one(brakeInspections, { fields: [brakeInspectionAxles.brakeInspectionId], references: [brakeInspections.id] }),
}));

export const insertBrakeInspectionSchema = createInsertSchema(brakeInspections).omit({ id: true, createdAt: true });
export const insertBrakeInspectionAxleSchema = createInsertSchema(brakeInspectionAxles).omit({ id: true });
export type InsertBrakeInspection = z.infer<typeof insertBrakeInspectionSchema>;
export type InsertBrakeInspectionAxle = z.infer<typeof insertBrakeInspectionAxleSchema>;
export type BrakeInspection = typeof brakeInspections.$inferSelect;
export type BrakeInspectionAxle = typeof brakeInspectionAxles.$inferSelect;

// ============================================================
// TIRE INSPECTIONS (Work Order linked)
// ============================================================
export const tireInspectionConditionEnum = ["good", "fair", "worn", "replace", "damaged"] as const;

export const tireInspections = pgTable("tire_inspections", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  inspectorId: text("inspector_id"),
  inspectorName: text("inspector_name"),
  inspectedAt: timestamp("inspected_at").defaultNow(),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }),
  overallResult: text("overall_result").default("pass").$type<typeof inspectionResultEnum[number]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tire_inspections_org").on(table.orgId),
  index("idx_tire_inspections_wo").on(table.workOrderId),
  index("idx_tire_inspections_asset").on(table.assetId),
]);

export const tireInspectionAxles = pgTable("tire_inspection_axles", {
  id: serial("id").primaryKey(),
  tireInspectionId: integer("tire_inspection_id").notNull().references(() => tireInspections.id, { onDelete: "cascade" }),
  axlePosition: integer("axle_position").notNull(),
  axleLabel: text("axle_label"),
  tireConfig: text("tire_config").$type<typeof tireConfigEnum[number]>(),
  // Left outer tire (or single left)
  leftOuterPsi: decimal("left_outer_psi", { precision: 5, scale: 1 }),
  leftOuterTread: decimal("left_outer_tread", { precision: 6, scale: 3 }),
  leftOuterCondition: text("left_outer_condition").$type<typeof tireInspectionConditionEnum[number]>(),
  leftOuterDotCode: text("left_outer_dot_code"),
  leftOuterNotes: text("left_outer_notes"),
  // Left inner tire (for duals)
  leftInnerPsi: decimal("left_inner_psi", { precision: 5, scale: 1 }),
  leftInnerTread: decimal("left_inner_tread", { precision: 6, scale: 3 }),
  leftInnerCondition: text("left_inner_condition").$type<typeof tireInspectionConditionEnum[number]>(),
  leftInnerDotCode: text("left_inner_dot_code"),
  leftInnerNotes: text("left_inner_notes"),
  // Right outer tire (or single right)
  rightOuterPsi: decimal("right_outer_psi", { precision: 5, scale: 1 }),
  rightOuterTread: decimal("right_outer_tread", { precision: 6, scale: 3 }),
  rightOuterCondition: text("right_outer_condition").$type<typeof tireInspectionConditionEnum[number]>(),
  rightOuterDotCode: text("right_outer_dot_code"),
  rightOuterNotes: text("right_outer_notes"),
  // Right inner tire (for duals)
  rightInnerPsi: decimal("right_inner_psi", { precision: 5, scale: 1 }),
  rightInnerTread: decimal("right_inner_tread", { precision: 6, scale: 3 }),
  rightInnerCondition: text("right_inner_condition").$type<typeof tireInspectionConditionEnum[number]>(),
  rightInnerDotCode: text("right_inner_dot_code"),
  rightInnerNotes: text("right_inner_notes"),
  treadUnit: text("tread_unit").$type<typeof measurementUnitEnum[number]>(),
}, (table) => [
  index("idx_tire_inspection_axles_inspection").on(table.tireInspectionId),
]);

export const tireInspectionsRelations = relations(tireInspections, ({ one, many }) => ({
  workOrder: one(workOrders, { fields: [tireInspections.workOrderId], references: [workOrders.id] }),
  asset: one(assets, { fields: [tireInspections.assetId], references: [assets.id] }),
  axles: many(tireInspectionAxles),
}));

export const tireInspectionAxlesRelations = relations(tireInspectionAxles, ({ one }) => ({
  inspection: one(tireInspections, { fields: [tireInspectionAxles.tireInspectionId], references: [tireInspections.id] }),
}));

export const insertTireInspectionSchema = createInsertSchema(tireInspections).omit({ id: true, createdAt: true });
export const insertTireInspectionAxleSchema = createInsertSchema(tireInspectionAxles).omit({ id: true });
export type InsertTireInspection = z.infer<typeof insertTireInspectionSchema>;
export type InsertTireInspectionAxle = z.infer<typeof insertTireInspectionAxleSchema>;
export type TireInspection = typeof tireInspections.$inferSelect;
export type TireInspectionAxle = typeof tireInspectionAxles.$inferSelect;

// ============================================================
// VENDORS
// ============================================================
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code"),
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
}, (table) => [
  index("idx_vendors_org").on(table.orgId),
]);

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// ============================================================
// PARTS / INVENTORY
// ============================================================
export const partCategoryEnum = ["filters", "fluids", "electrical", "brakes", "engine", "transmission", "hvac", "body", "tires", "general"] as const;
export const abcClassEnum = ["A", "B", "C"] as const;
export const smartClassEnum = ["S", "A", "B", "C"] as const;
export const xyzClassEnum = ["X", "Y", "Z"] as const;
export const safetySystemEnum = ["BRAKES", "STEERING", "TIRES_WHEELS", "SUSPENSION", "ELECTRICAL", "HVAC", "OTHER"] as const;

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  partNumber: text("part_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").$type<typeof partCategoryEnum[number]>(),
  abcClass: text("abc_class").$type<typeof abcClassEnum[number]>(),
  annualUsageQuantity: decimal("annual_usage_quantity", { precision: 12, scale: 2 }).default("0"),
  annualUsageValue: decimal("annual_usage_value", { precision: 12, scale: 2 }).default("0"),
  lastCycleCountDate: timestamp("last_cycle_count_date"),
  nextCycleCountDate: timestamp("next_cycle_count_date"),
  unitOfMeasure: text("unit_of_measure").default("each"),
  quantityOnHand: decimal("quantity_on_hand", { precision: 12, scale: 2 }).default("0"),
  quantityReserved: decimal("quantity_reserved", { precision: 12, scale: 2 }).default("0"),
  reorderPoint: decimal("reorder_point", { precision: 12, scale: 2 }).default("0"),
  reorderQuantity: decimal("reorder_quantity", { precision: 12, scale: 2 }).default("0"),
  maxQuantity: decimal("max_quantity", { precision: 12, scale: 2 }),
  isCritical: boolean("is_critical").default(false),
  isSerialized: boolean("is_serialized").default(false),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  locationId: integer("location_id").references(() => locations.id),
  binLocation: text("bin_location"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  vendorPartNumber: text("vendor_part_number"),
  barcode: text("barcode"),
  bin: text("bin"),
  vendor: text("vendor"),
  vmrsCode: text("vmrs_code"),
  type: text("type"),
  altPartNum: text("alt_part_num"),
  interVmrs: text("inter_vmrs"),
  majorVmrs: text("major_vmrs"),
  minorVmrs: text("minor_vmrs"),
  prevPoFacility: text("prev_po_facility"),
  tankFacility: text("tank_facility"),
  orderPrice: decimal("order_price", { precision: 12, scale: 2 }),
  lastOrderDate: timestamp("last_order_date"),
  avgShipDays: integer("avg_ship_days"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  safetySystem: text("safety_system").$type<typeof safetySystemEnum[number]>(),
  failureSeverity: integer("failure_severity").default(1),
  complianceOverride: boolean("compliance_override").default(false),
  traceabilityRequired: boolean("traceability_required").default(false),
  substituteAllowed: boolean("substitute_allowed").default(true),
  smartClass: text("smart_class").$type<typeof smartClassEnum[number]>(),
  xyzClass: text("xyz_class").$type<typeof xyzClassEnum[number]>(),
  priorityScore: decimal("priority_score", { precision: 5, scale: 2 }),
  lastClassifiedAt: timestamp("last_classified_at"),
  classificationLocked: boolean("classification_locked").default(false),
  leadTimeDays: integer("lead_time_days"),
  vmrsSuggestionLast: jsonb("vmrs_suggestion_last").$type<object>(),
  vmrsConfidenceLast: decimal("vmrs_confidence_last", { precision: 4, scale: 2 }),
  vmrsLastSuggestedAt: timestamp("vmrs_last_suggested_at"),
  isTire: boolean("is_tire").default(false),
  tireSize: text("tire_size"),
  tireDotCode: text("tire_dot_code"),
  tirePsiRating: integer("tire_psi_rating"),
  tireLoadIndex: text("tire_load_index"),
  tireSpeedRating: text("tire_speed_rating"),
  tireTreadDepthNew: decimal("tire_tread_depth_new", { precision: 5, scale: 2 }),
  tireBrand: text("tire_brand"),
  tireModel: text("tire_model"),
  tireType: text("tire_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_parts_org").on(table.orgId),
  index("idx_parts_category").on(table.category),
  index("idx_parts_location").on(table.locationId),
  index("idx_parts_critical").on(table.isCritical),
  index("idx_parts_smart_class").on(table.smartClass),
  index("idx_parts_safety_system").on(table.safetySystem),
  index("idx_parts_is_tire").on(table.isTire),
]);

export const partsRelations = relations(parts, ({ one }) => ({
  location: one(locations, { fields: [parts.locationId], references: [locations.id] }),
  vendor: one(vendors, { fields: [parts.vendorId], references: [vendors.id] }),
}));

export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// ============================================================
// VMRS MAPPING FEEDBACK (learning from accepted mappings)
// ============================================================
export const vmrsMappingFeedback = pgTable("vmrs_mapping_feedback", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  partId: integer("part_id").references(() => parts.id).notNull(),
  suggestedSystemCode: text("suggested_system_code"),
  suggestedAssemblyCode: text("suggested_assembly_code"),
  suggestedComponentCode: text("suggested_component_code"),
  suggestedSafetySystem: text("suggested_safety_system").$type<typeof safetySystemEnum[number]>(),
  confidence: decimal("confidence", { precision: 4, scale: 2 }),
  accepted: boolean("accepted"),
  acceptedSystemCode: text("accepted_system_code"),
  acceptedAssemblyCode: text("accepted_assembly_code"),
  acceptedComponentCode: text("accepted_component_code"),
  acceptedSafetySystem: text("accepted_safety_system").$type<typeof safetySystemEnum[number]>(),
  acceptedByUserId: text("accepted_by_user_id"),
  acceptedAt: timestamp("accepted_at"),
  notes: text("notes"),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vmrs_feedback_org").on(table.orgId),
  index("idx_vmrs_feedback_part").on(table.partId),
]);

export const insertVmrsMappingFeedbackSchema = createInsertSchema(vmrsMappingFeedback).omit({ id: true, createdAt: true });
export type InsertVmrsMappingFeedback = z.infer<typeof insertVmrsMappingFeedbackSchema>;
export type VmrsMappingFeedback = typeof vmrsMappingFeedback.$inferSelect;

// ============================================================
// SMART CLASSIFICATION SYSTEM
// ============================================================
export const classificationRunStatusEnum = ["pending", "running", "completed", "failed"] as const;
export const eventTypeEnum = ["ROAD_CALL", "BREAKDOWN", "INSPECTION_FAIL", "PM", "ACCIDENT", "OTHER"] as const;
export const eventPartLinkMethodEnum = ["MANUAL", "FROM_WORK_ORDER", "INFERRED"] as const;

export const classificationRuns = pgTable("classification_runs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  windowMonths: integer("window_months").default(12),
  parametersJson: jsonb("parameters_json"),
  status: text("status").notNull().default("pending").$type<typeof classificationRunStatusEnum[number]>(),
  partsProcessed: integer("parts_processed").default(0),
  partsUpdated: integer("parts_updated").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_classification_runs_org").on(table.orgId),
  index("idx_classification_runs_status").on(table.status),
]);

export const insertClassificationRunSchema = createInsertSchema(classificationRuns).omit({ id: true, createdAt: true });
export type InsertClassificationRun = z.infer<typeof insertClassificationRunSchema>;
export type ClassificationRun = typeof classificationRuns.$inferSelect;

export const partClassificationSnapshots = pgTable("part_classification_snapshots", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => classificationRuns.id),
  partId: integer("part_id").notNull().references(() => parts.id),
  annualQty: decimal("annual_qty", { precision: 12, scale: 2 }),
  annualSpend: decimal("annual_spend", { precision: 12, scale: 2 }),
  costScore: decimal("cost_score", { precision: 5, scale: 2 }),
  roadcallCount: integer("roadcall_count").default(0),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }).default("0"),
  roadcallScore: decimal("roadcall_score", { precision: 5, scale: 2 }),
  safetyScore: decimal("safety_score", { precision: 5, scale: 2 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  classResult: text("class_result").$type<typeof smartClassEnum[number]>(),
  xyzResult: text("xyz_result").$type<typeof xyzClassEnum[number]>(),
  explanationJson: jsonb("explanation_json"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_classification_snapshots_run").on(table.runId),
  index("idx_classification_snapshots_part").on(table.partId),
]);

export const partClassificationSnapshotsRelations = relations(partClassificationSnapshots, ({ one }) => ({
  run: one(classificationRuns, { fields: [partClassificationSnapshots.runId], references: [classificationRuns.id] }),
  part: one(parts, { fields: [partClassificationSnapshots.partId], references: [parts.id] }),
}));

export const insertPartClassificationSnapshotSchema = createInsertSchema(partClassificationSnapshots).omit({ id: true, createdAt: true });
export type InsertPartClassificationSnapshot = z.infer<typeof insertPartClassificationSnapshotSchema>;
export type PartClassificationSnapshot = typeof partClassificationSnapshots.$inferSelect;

export const classificationAuditLog = pgTable("classification_audit_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  partId: integer("part_id").notNull().references(() => parts.id),
  changedByUserId: varchar("changed_by_user_id"),
  changedAt: timestamp("changed_at").defaultNow(),
  oldClass: text("old_class"),
  newClass: text("new_class"),
  oldXyz: text("old_xyz"),
  newXyz: text("new_xyz"),
  reason: text("reason"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_classification_audit_org").on(table.orgId),
  index("idx_classification_audit_part").on(table.partId),
  index("idx_classification_audit_changed").on(table.changedAt),
]);

export const classificationAuditLogRelations = relations(classificationAuditLog, ({ one }) => ({
  part: one(parts, { fields: [classificationAuditLog.partId], references: [parts.id] }),
}));

export const insertClassificationAuditLogSchema = createInsertSchema(classificationAuditLog).omit({ id: true, createdAt: true });
export type InsertClassificationAuditLog = z.infer<typeof insertClassificationAuditLogSchema>;
export type ClassificationAuditLog = typeof classificationAuditLog.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  assetId: integer("asset_id").references(() => assets.id),
  eventType: text("event_type").notNull().$type<typeof eventTypeEnum[number]>(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }),
  severity: integer("severity").default(1),
  notes: text("notes"),
  workOrderId: integer("work_order_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_events_org").on(table.orgId),
  index("idx_events_asset").on(table.assetId),
  index("idx_events_type").on(table.eventType),
  index("idx_events_start_time").on(table.startTime),
]);

export const eventsRelations = relations(events, ({ one }) => ({
  asset: one(assets, { fields: [events.assetId], references: [assets.id] }),
}));

export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const eventParts = pgTable("event_parts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  partId: integer("part_id").notNull().references(() => parts.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1"),
  linkMethod: text("link_method").default("MANUAL").$type<typeof eventPartLinkMethodEnum[number]>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_event_parts_event").on(table.eventId),
  index("idx_event_parts_part").on(table.partId),
]);

export const eventPartsRelations = relations(eventParts, ({ one }) => ({
  event: one(events, { fields: [eventParts.eventId], references: [events.id] }),
  part: one(parts, { fields: [eventParts.partId], references: [parts.id] }),
}));

export const insertEventPartSchema = createInsertSchema(eventParts).omit({ id: true, createdAt: true });
export type InsertEventPart = z.infer<typeof insertEventPartSchema>;
export type EventPart = typeof eventParts.$inferSelect;

// ============================================================
// WORK ORDERS
// ============================================================
export const workOrderStatusEnum = ["open", "in_progress", "on_hold", "ready_for_review", "completed", "cancelled"] as const;
export const workOrderTypeEnum = ["corrective", "preventive", "inspection", "emergency"] as const;
export const workOrderPriorityEnum = ["low", "medium", "high", "critical"] as const;

export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  workOrderNumber: text("work_order_number").notNull(),
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
  predictionId: integer("prediction_id"),
  failureCode: text("failure_code"),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  notes: text("notes"),
  safetyNotes: text("safety_notes"),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  gpsRecordedAt: timestamp("gps_recorded_at"),
  technicianSignature: text("technician_signature"),
  technicianSignedAt: timestamp("technician_signed_at"),
  customerSignature: text("customer_signature"),
  customerSignedAt: timestamp("customer_signed_at"),
  customerSignedBy: text("customer_signed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_work_orders_org").on(table.orgId),
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
export const workOrderLineStatusEnum = ["pending", "in_progress", "paused", "completed", "rescheduled", "cancelled"] as const;
export const partRequestStatusEnum = ["none", "requested", "ordered", "received", "posted"] as const;

export const workOrderLines = pgTable("work_order_lines", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending").$type<typeof workOrderLineStatusEnum[number]>(),
  vmrsCode: text("vmrs_code"),
  vmrsTitle: text("vmrs_title"),
  complaint: text("complaint"),
  cause: text("cause"),
  correction: text("correction"),
  partRequestStatus: text("part_request_status").notNull().default("none").$type<typeof partRequestStatusEnum[number]>(),
  laborHours: decimal("labor_hours", { precision: 8, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  completedAt: timestamp("completed_at"),
  rescheduledTo: integer("rescheduled_to"),
  technicianId: varchar("technician_id"),
  tirePosition: text("tire_position"),
  tireSerialInstalled: text("tire_serial_installed"),
  tireSerialRemoved: text("tire_serial_removed"),
  tireTreadDepthMeasured: decimal("tire_tread_depth_measured", { precision: 5, scale: 2 }),
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
export const transactionTypeEnum = ["part_consumption", "part_return", "time_entry", "time_adjustment", "status_change", "note", "attachment", "reversal"] as const;

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
  reversedTransactionId: integer("reversed_transaction_id"),
  isReversed: boolean("is_reversed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workOrderTransactionsRelations = relations(workOrderTransactions, ({ one }) => ({
  workOrder: one(workOrders, { fields: [workOrderTransactions.workOrderId], references: [workOrders.id] }),
  workOrderLine: one(workOrderLines, { fields: [workOrderTransactions.workOrderLineId], references: [workOrderLines.id] }),
  part: one(parts, { fields: [workOrderTransactions.partId], references: [parts.id] }),
}));

export const insertWorkOrderTransactionSchema = createInsertSchema(workOrderTransactions).omit({ 
  id: true, 
  createdAt: true, 
  isReversed: true,
  reversedTransactionId: true,
});
export type InsertWorkOrderTransaction = z.infer<typeof insertWorkOrderTransactionSchema>;
export type WorkOrderTransaction = typeof workOrderTransactions.$inferSelect;

// ============================================================
// LABOR ENTRIES (Multi-user Time Tracking)
// ============================================================
export const laborEntryStatusEnum = ["running", "paused", "completed"] as const;

export const laborEntries = pgTable("labor_entries", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  workOrderLineId: integer("work_order_line_id").references(() => workOrderLines.id),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull().default("running").$type<typeof laborEntryStatusEnum[number]>(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  pausedDuration: integer("paused_duration").default(0), // Total paused time in seconds
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  calculatedHours: decimal("calculated_hours", { precision: 8, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_labor_entries_work_order").on(table.workOrderId),
  index("idx_labor_entries_user").on(table.userId),
  index("idx_labor_entries_status").on(table.status),
]);

export const laborEntriesRelations = relations(laborEntries, ({ one }) => ({
  workOrder: one(workOrders, { fields: [laborEntries.workOrderId], references: [workOrders.id] }),
  workOrderLine: one(workOrderLines, { fields: [laborEntries.workOrderLineId], references: [workOrderLines.id] }),
}));

export const insertLaborEntrySchema = createInsertSchema(laborEntries).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  calculatedHours: true,
  laborCost: true,
});
export type InsertLaborEntry = z.infer<typeof insertLaborEntrySchema>;
export type LaborEntry = typeof laborEntries.$inferSelect;

// ============================================================
// PREVENTIVE MAINTENANCE SCHEDULES
// ============================================================
export const pmIntervalTypeEnum = ["days", "miles", "hours", "cycles"] as const;

export const pmSchedules = pgTable("pm_schedules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  intervalType: text("interval_type").notNull().$type<typeof pmIntervalTypeEnum[number]>(),
  intervalValue: integer("interval_value").notNull(),
  toleranceValue: integer("tolerance_value"),
  gracePeriodValue: integer("grace_period_value"),
  parentPmId: integer("parent_pm_id"),
  vmrsCodeId: integer("vmrs_code_id").references(() => vmrsCodes.id),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  priority: text("priority").default("medium").$type<typeof workOrderPriorityEnum[number]>(),
  taskChecklist: jsonb("task_checklist").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pm_schedules_org").on(table.orgId),
  index("idx_pm_schedules_vmrs").on(table.vmrsCodeId),
]);

export const pmSchedulesRelations = relations(pmSchedules, ({ one, many }) => ({
  vmrsCode: one(vmrsCodes, { fields: [pmSchedules.vmrsCodeId], references: [vmrsCodes.id] }),
  assetInstances: many(pmAssetInstances),
  scheduleModels: many(pmScheduleModels),
  scheduleKits: many(pmScheduleKits),
  scheduleChecklists: many(pmScheduleChecklists),
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
  orgId: integer("org_id").references(() => organizations.id),
  requisitionNumber: text("requisition_number").notNull(),
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
  orgId: integer("org_id").references(() => organizations.id),
  poNumber: text("po_number").notNull(),
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
  orgId: integer("org_id").references(() => organizations.id),
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
  vinPatterns: text("vin_patterns").array(), // VIN patterns for auto-association (e.g., "1FUJG*", "3FALF*")
  aiExtractedSections: jsonb("ai_extracted_sections"), // AI-extracted sections from PDF
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
  orgId: integer("org_id").references(() => organizations.id),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  inspectorId: varchar("inspector_id"),
  inspectorName: varchar("inspector_name", { length: 255 }), // For anonymous DVIR submissions
  inspectionDate: timestamp("inspection_date").notNull().defaultNow(),
  status: text("status").notNull().default("safe").$type<typeof dvirStatusEnum[number]>(),
  meterReading: decimal("meter_reading", { precision: 12, scale: 2 }),
  preTrip: boolean("pre_trip").default(true),
  notes: text("notes"),
  signature: text("signature"),
  isPublicSubmission: boolean("is_public_submission").default(false), // True for QR code submissions
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dvirs_org").on(table.orgId),
  index("idx_dvirs_asset").on(table.assetId),
]);

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
export const predictionSeverityEnum = ["low", "medium", "high", "critical"] as const;

// Prediction feedback options for the AI learning loop
export const predictionFeedbackTypeEnum = ["completed_repair", "scheduled", "not_needed", "false_positive", "deferred"] as const;

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  predictionType: text("prediction_type").notNull(),
  prediction: text("prediction").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  severity: text("severity").default("medium").$type<typeof predictionSeverityEnum[number]>(),
  reasoning: text("reasoning"),
  dataPoints: jsonb("data_points").$type<string[]>(),
  recommendedAction: text("recommended_action"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  dueDate: timestamp("due_date"),
  acknowledged: boolean("acknowledged").default(false),
  dismissedAt: timestamp("dismissed_at"),
  // Feedback workflow fields
  feedbackType: text("feedback_type").$type<typeof predictionFeedbackTypeEnum[number]>(),
  feedbackNotes: text("feedback_notes"),
  feedbackAt: timestamp("feedback_at"),
  feedbackById: varchar("feedback_by_id"),
  linkedWorkOrderId: integer("linked_work_order_id"),
  deferredUntil: timestamp("deferred_until"),
  deferredScheduleId: integer("deferred_schedule_id"),
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
  orgId: integer("org_id").references(() => organizations.id),
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

// ============================================================
// ESTIMATES (Tied to Assets)
// ============================================================
export const estimateStatusEnum = ["draft", "pending_approval", "approved", "rejected", "converted"] as const;

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  estimateNumber: text("estimate_number").notNull(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  title: text("title"),
  description: text("description"),
  status: text("status").notNull().default("draft").$type<typeof estimateStatusEnum[number]>(),
  preparedById: varchar("prepared_by_id"),
  approvedById: varchar("approved_by_id"),
  laborTotal: decimal("labor_total", { precision: 12, scale: 2 }).default("0"),
  partsTotal: decimal("parts_total", { precision: 12, scale: 2 }).default("0"),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("0"),
  markupTotal: decimal("markup_total", { precision: 12, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  validUntil: timestamp("valid_until"),
  convertedToWorkOrderId: integer("converted_to_work_order_id").references(() => workOrders.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_estimates_org").on(table.orgId),
  index("idx_estimates_asset").on(table.assetId),
  index("idx_estimates_status").on(table.status),
]);

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  asset: one(assets, { fields: [estimates.assetId], references: [assets.id] }),
  lines: many(estimateLines),
}));

export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

// ============================================================
// ESTIMATE LINES (Parts, Labor, Non-Inventory Items)
// ============================================================
export const estimateLineTypeEnum = ["inventory_part", "zero_stock_part", "non_inventory_item", "labor"] as const;

export const estimateLines = pgTable("estimate_lines", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  lineType: text("line_type").notNull().$type<typeof estimateLineTypeEnum[number]>(),
  partId: integer("part_id").references(() => parts.id),
  partNumber: text("part_number"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  quantityOnHand: decimal("quantity_on_hand", { precision: 12, scale: 2 }),
  needsOrdering: boolean("needs_ordering").default(false),
  vendorId: integer("vendor_id").references(() => vendors.id),
  notes: text("notes"),
  vmrsCode: text("vmrs_code"),
  vmrsTitle: text("vmrs_title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const estimateLinesRelations = relations(estimateLines, ({ one }) => ({
  estimate: one(estimates, { fields: [estimateLines.estimateId], references: [estimates.id] }),
  part: one(parts, { fields: [estimateLines.partId], references: [parts.id] }),
  vendor: one(vendors, { fields: [estimateLines.vendorId], references: [vendors.id] }),
}));

export const insertEstimateLineSchema = createInsertSchema(estimateLines).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEstimateLine = z.infer<typeof insertEstimateLineSchema>;
export type EstimateLine = typeof estimateLines.$inferSelect;

// ============================================================
// TELEMATICS DATA (Engine Data, Fault Codes)
// ============================================================
export const telematicsData = pgTable("telematics_data", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  engineHours: decimal("engine_hours", { precision: 12, scale: 2 }),
  odometer: decimal("odometer", { precision: 12, scale: 2 }),
  fuelLevel: decimal("fuel_level", { precision: 5, scale: 2 }),
  coolantTemp: decimal("coolant_temp", { precision: 6, scale: 2 }),
  oilPressure: decimal("oil_pressure", { precision: 6, scale: 2 }),
  batteryVoltage: decimal("battery_voltage", { precision: 5, scale: 2 }),
  defLevel: decimal("def_level", { precision: 5, scale: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  rawData: jsonb("raw_data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_telematics_asset").on(table.assetId),
  index("idx_telematics_timestamp").on(table.timestamp),
]);

export const telematicsDataRelations = relations(telematicsData, ({ one }) => ({
  asset: one(assets, { fields: [telematicsData.assetId], references: [assets.id] }),
}));

export const insertTelematicsDataSchema = createInsertSchema(telematicsData).omit({ id: true, createdAt: true });
export type InsertTelematicsData = z.infer<typeof insertTelematicsDataSchema>;
export type TelematicsData = typeof telematicsData.$inferSelect;

// ============================================================
// FAULT CODES (DTC/Diagnostic Trouble Codes)
// ============================================================
export const faultSeverityEnum = ["low", "medium", "high", "critical"] as const;
export const faultStatusEnum = ["active", "pending", "cleared", "resolved"] as const;

export const faultCodes = pgTable("fault_codes", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  code: text("code").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium").$type<typeof faultSeverityEnum[number]>(),
  status: text("status").notNull().default("active").$type<typeof faultStatusEnum[number]>(),
  source: text("source"),
  spn: text("spn"),
  fmi: text("fmi"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  clearedAt: timestamp("cleared_at"),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  notes: text("notes"),
  rawData: jsonb("raw_data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fault_codes_asset").on(table.assetId),
  index("idx_fault_codes_status").on(table.status),
  index("idx_fault_codes_severity").on(table.severity),
]);

export const faultCodesRelations = relations(faultCodes, ({ one }) => ({
  asset: one(assets, { fields: [faultCodes.assetId], references: [assets.id] }),
  workOrder: one(workOrders, { fields: [faultCodes.workOrderId], references: [workOrders.id] }),
}));

export const insertFaultCodeSchema = createInsertSchema(faultCodes).omit({ id: true, createdAt: true });
export type InsertFaultCode = z.infer<typeof insertFaultCodeSchema>;
export type FaultCode = typeof faultCodes.$inferSelect;

// ============================================================
// CHECKLIST TEMPLATES (Reusable maintenance checklists)
// ============================================================
export const checklistCategoryEnum = ["pm_service", "inspection", "safety", "pre_trip", "post_trip", "seasonal", "other"] as const;

export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("pm_service").$type<typeof checklistCategoryEnum[number]>(),
  estimatedMinutes: integer("estimated_minutes"),
  items: jsonb("items").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  isOosSensitive: boolean("is_oos_sensitive").default(false), // When true, OOS rules evaluate responses inline
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checklistTemplatesRelations = relations(checklistTemplates, ({ many }) => ({
  makeModelAssignments: many(checklistMakeModelAssignments),
}));

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

// ============================================================
// CHECKLIST MAKE/MODEL ASSIGNMENTS (Bulk assignment to asset types)
// ============================================================
export const checklistMakeModelAssignments = pgTable("checklist_make_model_assignments", {
  id: serial("id").primaryKey(),
  checklistTemplateId: integer("checklist_template_id").notNull().references(() => checklistTemplates.id, { onDelete: "cascade" }),
  manufacturer: text("manufacturer"),
  model: text("model"),
  year: integer("year"),
  assetType: text("asset_type").$type<typeof assetTypeEnum[number]>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_checklist_assignments_template").on(table.checklistTemplateId),
  index("idx_checklist_assignments_make").on(table.manufacturer),
  index("idx_checklist_assignments_model").on(table.model),
]);

export const checklistMakeModelAssignmentsRelations = relations(checklistMakeModelAssignments, ({ one }) => ({
  checklistTemplate: one(checklistTemplates, { fields: [checklistMakeModelAssignments.checklistTemplateId], references: [checklistTemplates.id] }),
}));

export const insertChecklistMakeModelAssignmentSchema = createInsertSchema(checklistMakeModelAssignments).omit({ id: true, createdAt: true });
export type InsertChecklistMakeModelAssignment = z.infer<typeof insertChecklistMakeModelAssignmentSchema>;
export type ChecklistMakeModelAssignment = typeof checklistMakeModelAssignments.$inferSelect;

// ============================================================
// IMPORT JOBS (Bulk data import tracking)
// ============================================================
export const importJobStatusEnum = ["pending", "processing", "completed", "completed_with_errors", "failed", "cancelled"] as const;
export const importJobTypeEnum = ["assets", "parts", "work_orders", "purchase_orders", "part_usage", "vendors", "locations"] as const;

export type ImportErrorDetail = {
  row: number;
  field?: string;
  value?: string;
  message: string;
  errorType: string;
};

export type ImportErrorSummary = {
  byType: Record<string, number>;
  byField: Record<string, number>;
  sampleErrors: Record<string, string[]>;
  totalErrors: number;
};

export const importJobs = pgTable("import_jobs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  type: text("type").notNull().$type<typeof importJobTypeEnum[number]>(),
  status: text("status").notNull().default("pending").$type<typeof importJobStatusEnum[number]>(),
  fileName: text("file_name").notNull(),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successRows: integer("success_rows").default(0),
  errorRows: integer("error_rows").default(0),
  errors: jsonb("errors").$type<ImportErrorDetail[]>(),
  errorSummary: jsonb("error_summary").$type<ImportErrorSummary>(),
  mappings: jsonb("mappings").$type<Record<string, string>>(),
  createdBy: text("created_by"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_import_jobs_status").on(table.status),
  index("idx_import_jobs_type").on(table.type),
]);

export const insertImportJobSchema = createInsertSchema(importJobs).omit({ id: true, createdAt: true });
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

// ============================================================
// PART USAGE HISTORY (For smart part suggestions)
// ============================================================
export const partUsageHistory = pgTable("part_usage_history", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id),
  partNumber: text("part_number").notNull(),
  partName: text("part_name"),
  vmrsCode: text("vmrs_code"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  year: integer("year"),
  assetId: integer("asset_id").references(() => assets.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  usedAt: timestamp("used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_part_usage_vmrs").on(table.vmrsCode),
  index("idx_part_usage_make_model").on(table.manufacturer, table.model),
  index("idx_part_usage_part").on(table.partId),
]);

export const partUsageHistoryRelations = relations(partUsageHistory, ({ one }) => ({
  part: one(parts, { fields: [partUsageHistory.partId], references: [parts.id] }),
  asset: one(assets, { fields: [partUsageHistory.assetId], references: [assets.id] }),
  workOrder: one(workOrders, { fields: [partUsageHistory.workOrderId], references: [workOrders.id] }),
}));

export const insertPartUsageHistorySchema = createInsertSchema(partUsageHistory).omit({ id: true, createdAt: true });
export type InsertPartUsageHistory = z.infer<typeof insertPartUsageHistorySchema>;
export type PartUsageHistory = typeof partUsageHistory.$inferSelect;

// ============================================================
// RECEIVING TRANSACTIONS
// ============================================================
export const receivingTransactions = pgTable("receiving_transactions", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id),
  poLineId: integer("po_line_id").notNull().references(() => purchaseOrderLines.id),
  partId: integer("part_id").references(() => parts.id),
  quantityReceived: decimal("quantity_received", { precision: 12, scale: 2 }).notNull(),
  receivedById: varchar("received_by_id"),
  receivedByName: text("received_by_name"),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  notes: text("notes"),
  discrepancyType: text("discrepancy_type").$type<"none" | "over" | "under" | "damaged" | "wrong_item">().default("none"),
  discrepancyNotes: text("discrepancy_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const receivingTransactionsRelations = relations(receivingTransactions, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [receivingTransactions.poId], references: [purchaseOrders.id] }),
  poLine: one(purchaseOrderLines, { fields: [receivingTransactions.poLineId], references: [purchaseOrderLines.id] }),
  part: one(parts, { fields: [receivingTransactions.partId], references: [parts.id] }),
}));

export const insertReceivingTransactionSchema = createInsertSchema(receivingTransactions).omit({ id: true, createdAt: true });
export type InsertReceivingTransaction = z.infer<typeof insertReceivingTransactionSchema>;
export type ReceivingTransaction = typeof receivingTransactions.$inferSelect;

// ============================================================
// PART REQUESTS (Standalone requests from technicians)
// ============================================================
export const standalonePartRequestStatusEnum = ["pending", "approved", "ordered", "received", "fulfilled", "cancelled"] as const;
export const partRequestUrgencyEnum = ["standard", "urgent", "critical"] as const;

export const partRequests = pgTable("part_requests", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  requestNumber: text("request_number").notNull(),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  workOrderLineId: integer("work_order_line_id").references(() => workOrderLines.id),
  partId: integer("part_id").references(() => parts.id),
  partNumber: text("part_number"),
  partName: text("part_name").notNull(),
  quantityRequested: decimal("quantity_requested", { precision: 12, scale: 2 }).notNull(),
  quantityFulfilled: decimal("quantity_fulfilled", { precision: 12, scale: 2 }).default("0"),
  urgency: text("urgency").notNull().default("standard").$type<typeof partRequestUrgencyEnum[number]>(),
  status: text("status").notNull().default("pending").$type<typeof standalonePartRequestStatusEnum[number]>(),
  notes: text("notes"),
  requestedById: varchar("requested_by_id"),
  requestedByName: text("requested_by_name"),
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id),
  poId: integer("po_id").references(() => purchaseOrders.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const partRequestsRelations = relations(partRequests, ({ one }) => ({
  workOrder: one(workOrders, { fields: [partRequests.workOrderId], references: [workOrders.id] }),
  workOrderLine: one(workOrderLines, { fields: [partRequests.workOrderLineId], references: [workOrderLines.id] }),
  part: one(parts, { fields: [partRequests.partId], references: [parts.id] }),
  requisition: one(purchaseRequisitions, { fields: [partRequests.requisitionId], references: [purchaseRequisitions.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [partRequests.poId], references: [purchaseOrders.id] }),
}));

export const insertPartRequestSchema = createInsertSchema(partRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartRequest = z.infer<typeof insertPartRequestSchema>;
export type PartRequest = typeof partRequests.$inferSelect;

// ============================================================
// PART KITS (Bundled part sets for PM/repair/inspection)
// ============================================================
export const partKitCategoryEnum = ["pm", "repair", "inspection", "seasonal", "other"] as const;

export const partKits = pgTable("part_kits", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  kitNumber: text("kit_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().$type<typeof partKitCategoryEnum[number]>(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const partKitsRelations = relations(partKits, ({ many }) => ({
  lines: many(partKitLines),
  pmScheduleKits: many(pmScheduleKits),
}));

export const insertPartKitSchema = createInsertSchema(partKits).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartKit = z.infer<typeof insertPartKitSchema>;
export type PartKit = typeof partKits.$inferSelect;

// ============================================================
// PART KIT LINES (Parts included in a kit)
// ============================================================
export const partKitLines = pgTable("part_kit_lines", {
  id: serial("id").primaryKey(),
  kitId: integer("kit_id").notNull().references(() => partKits.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => parts.id),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
  lineCost: decimal("line_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partKitLinesRelations = relations(partKitLines, ({ one }) => ({
  kit: one(partKits, { fields: [partKitLines.kitId], references: [partKits.id] }),
  part: one(parts, { fields: [partKitLines.partId], references: [parts.id] }),
}));

export const insertPartKitLineSchema = createInsertSchema(partKitLines).omit({ id: true, createdAt: true });
export type InsertPartKitLine = z.infer<typeof insertPartKitLineSchema>;
export type PartKitLine = typeof partKitLines.$inferSelect;

// ============================================================
// PM SCHEDULE KITS (Link kits to PM schedules)
// ============================================================
export const pmScheduleKits = pgTable("pm_schedule_kits", {
  id: serial("id").primaryKey(),
  pmScheduleId: integer("pm_schedule_id").notNull().references(() => pmSchedules.id, { onDelete: "cascade" }),
  kitId: integer("kit_id").notNull().references(() => partKits.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pmScheduleKitsRelations = relations(pmScheduleKits, ({ one }) => ({
  pmSchedule: one(pmSchedules, { fields: [pmScheduleKits.pmScheduleId], references: [pmSchedules.id] }),
  kit: one(partKits, { fields: [pmScheduleKits.kitId], references: [partKits.id] }),
}));

export const insertPmScheduleKitSchema = createInsertSchema(pmScheduleKits).omit({ id: true, createdAt: true });
export type InsertPmScheduleKit = z.infer<typeof insertPmScheduleKitSchema>;
export type PmScheduleKit = typeof pmScheduleKits.$inferSelect;

// ============================================================
// PM SCHEDULE MODELS (Link PM schedules to make/model combinations)
// ============================================================
export const pmScheduleModels = pgTable("pm_schedule_models", {
  id: serial("id").primaryKey(),
  pmScheduleId: integer("pm_schedule_id").notNull().references(() => pmSchedules.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model"),
  year: integer("year"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pm_schedule_models_pm").on(table.pmScheduleId),
  index("idx_pm_schedule_models_make_model").on(table.make, table.model),
]);

export const pmScheduleModelsRelations = relations(pmScheduleModels, ({ one }) => ({
  pmSchedule: one(pmSchedules, { fields: [pmScheduleModels.pmScheduleId], references: [pmSchedules.id] }),
}));

export const insertPmScheduleModelSchema = createInsertSchema(pmScheduleModels).omit({ id: true, createdAt: true });
export type InsertPmScheduleModel = z.infer<typeof insertPmScheduleModelSchema>;
export type PmScheduleModel = typeof pmScheduleModels.$inferSelect;

// ============================================================
// PM SCHEDULE KIT MODELS (Link specific part kits to models within a PM schedule)
// ============================================================
export const pmScheduleKitModels = pgTable("pm_schedule_kit_models", {
  id: serial("id").primaryKey(),
  pmScheduleKitId: integer("pm_schedule_kit_id").notNull().references(() => pmScheduleKits.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pm_schedule_kit_models_kit").on(table.pmScheduleKitId),
]);

export const pmScheduleKitModelsRelations = relations(pmScheduleKitModels, ({ one }) => ({
  pmScheduleKit: one(pmScheduleKits, { fields: [pmScheduleKitModels.pmScheduleKitId], references: [pmScheduleKits.id] }),
}));

export const insertPmScheduleKitModelSchema = createInsertSchema(pmScheduleKitModels).omit({ id: true, createdAt: true });
export type InsertPmScheduleKitModel = z.infer<typeof insertPmScheduleKitModelSchema>;
export type PmScheduleKitModel = typeof pmScheduleKitModels.$inferSelect;

// ============================================================
// PM SCHEDULE CHECKLISTS (Link checklist templates to PM schedules)
// ============================================================
export const pmScheduleChecklists = pgTable("pm_schedule_checklists", {
  id: serial("id").primaryKey(),
  pmScheduleId: integer("pm_schedule_id").notNull().references(() => pmSchedules.id, { onDelete: "cascade" }),
  checklistTemplateId: integer("checklist_template_id").notNull().references(() => checklistTemplates.id, { onDelete: "cascade" }),
  autoSyncModels: boolean("auto_sync_models").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pm_schedule_checklists_pm").on(table.pmScheduleId),
  index("idx_pm_schedule_checklists_checklist").on(table.checklistTemplateId),
]);

export const pmScheduleChecklistsRelations = relations(pmScheduleChecklists, ({ one }) => ({
  pmSchedule: one(pmSchedules, { fields: [pmScheduleChecklists.pmScheduleId], references: [pmSchedules.id] }),
  checklistTemplate: one(checklistTemplates, { fields: [pmScheduleChecklists.checklistTemplateId], references: [checklistTemplates.id] }),
}));

export const insertPmScheduleChecklistSchema = createInsertSchema(pmScheduleChecklists).omit({ id: true, createdAt: true });
export type InsertPmScheduleChecklist = z.infer<typeof insertPmScheduleChecklistSchema>;
export type PmScheduleChecklist = typeof pmScheduleChecklists.$inferSelect;

// ============================================================
// CYCLE COUNTS (Inventory cycle counting)
// ============================================================
export const cycleCountStatusEnum = ["scheduled", "in_progress", "completed", "cancelled"] as const;

export const cycleCounts = pgTable("cycle_counts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  countNumber: text("count_number").notNull(),
  partId: integer("part_id").notNull().references(() => parts.id),
  locationId: integer("location_id").references(() => locations.id),
  status: text("status").notNull().default("scheduled").$type<typeof cycleCountStatusEnum[number]>(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  countedDate: timestamp("counted_date"),
  expectedQuantity: decimal("expected_quantity", { precision: 12, scale: 2 }),
  actualQuantity: decimal("actual_quantity", { precision: 12, scale: 2 }),
  variance: decimal("variance", { precision: 12, scale: 2 }),
  variancePercent: decimal("variance_percent", { precision: 8, scale: 2 }),
  varianceCost: decimal("variance_cost", { precision: 12, scale: 2 }),
  isReconciled: boolean("is_reconciled").default(false),
  reconciledAt: timestamp("reconciled_at"),
  countedById: varchar("counted_by_id"),
  countedByName: text("counted_by_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cycle_counts_status").on(table.status),
  index("idx_cycle_counts_scheduled").on(table.scheduledDate),
]);

export const cycleCountsRelations = relations(cycleCounts, ({ one }) => ({
  part: one(parts, { fields: [cycleCounts.partId], references: [parts.id] }),
  location: one(locations, { fields: [cycleCounts.locationId], references: [locations.id] }),
}));

export const insertCycleCountSchema = createInsertSchema(cycleCounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCycleCount = z.infer<typeof insertCycleCountSchema>;
export type CycleCount = typeof cycleCounts.$inferSelect;

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationTypeEnum = [
  "work_order_assigned",
  "work_order_status_changed",
  "work_order_due_soon",
  "pm_due",
  "part_low_stock",
  "part_request_status",
  "purchase_order_status",
  "asset_status_changed",
  "prediction_alert",
  "system"
] as const;

export const notificationPriorityEnum = ["low", "medium", "high", "critical"] as const;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull().$type<typeof notificationTypeEnum[number]>(),
  priority: text("priority").notNull().default("medium").$type<typeof notificationPriorityEnum[number]>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"), // work_order, asset, part, pm_schedule, etc.
  entityId: integer("entity_id"),
  link: text("link"), // URL to navigate to when clicked
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_read").on(table.isRead),
  index("idx_notifications_type").on(table.type),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================================
// TIRES
// ============================================================
export const tireConditionEnum = ["new", "good", "fair", "worn", "critical", "failed"] as const;
export const tireStatusEnum = ["in_inventory", "installed", "removed", "disposed", "sold"] as const;
export const tireTypeEnum = ["steer", "drive", "trailer", "all_position", "winter", "summer"] as const;

export const tires = pgTable("tires", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  serialNumber: varchar("serial_number", { length: 100 }).notNull(),
  dotCode: varchar("dot_code", { length: 50 }),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  size: varchar("size", { length: 50 }),
  type: text("type").$type<typeof tireTypeEnum[number]>().default("all_position"),
  condition: text("condition").$type<typeof tireConditionEnum[number]>().default("new"),
  status: text("status").$type<typeof tireStatusEnum[number]>().default("in_inventory"),
  treadDepth: decimal("tread_depth", { precision: 4, scale: 1 }),
  originalTreadDepth: decimal("original_tread_depth", { precision: 4, scale: 1 }).default("10.0"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  purchaseOdometer: integer("purchase_odometer"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  assetId: integer("asset_id").references(() => assets.id),
  position: varchar("position", { length: 20 }),
  installedDate: timestamp("installed_date"),
  installedOdometer: integer("installed_odometer"),
  removedDate: timestamp("removed_date"),
  removalReason: text("removal_reason"),
  milesRun: integer("miles_run").default(0),
  retreads: integer("retreads").default(0),
  lastInspectionDate: timestamp("last_inspection_date"),
  psiRating: integer("psi_rating"),
  loadIndex: varchar("load_index", { length: 10 }),
  speedRating: varchar("speed_rating", { length: 5 }),
  notes: text("notes"),
  locationId: integer("location_id").references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tires_org").on(table.orgId),
  index("idx_tires_status").on(table.status),
  index("idx_tires_asset").on(table.assetId),
  index("idx_tires_condition").on(table.condition),
]);

export const tiresRelations = relations(tires, ({ one }) => ({
  organization: one(organizations, { fields: [tires.orgId], references: [organizations.id] }),
  asset: one(assets, { fields: [tires.assetId], references: [assets.id] }),
  vendor: one(vendors, { fields: [tires.vendorId], references: [vendors.id] }),
  location: one(locations, { fields: [tires.locationId], references: [locations.id] }),
}));

export const insertTireSchema = createInsertSchema(tires).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTire = z.infer<typeof insertTireSchema>;
export type Tire = typeof tires.$inferSelect;

// ============================================================
// TIRE HISTORY
// ============================================================
export const tireHistory = pgTable("tire_history", {
  id: serial("id").primaryKey(),
  tireId: integer("tire_id").notNull().references(() => tires.id),
  assetId: integer("asset_id").references(() => assets.id),
  action: text("action").notNull(), // installed, removed, rotated, inspected, repaired
  position: varchar("position", { length: 20 }),
  treadDepth: decimal("tread_depth", { precision: 4, scale: 1 }),
  odometer: integer("odometer"),
  notes: text("notes"),
  performedBy: varchar("performed_by", { length: 255 }),
  performedAt: timestamp("performed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tire_history_tire").on(table.tireId),
  index("idx_tire_history_asset").on(table.assetId),
]);

export const insertTireHistorySchema = createInsertSchema(tireHistory).omit({ id: true, createdAt: true });
export type InsertTireHistory = z.infer<typeof insertTireHistorySchema>;
export type TireHistory = typeof tireHistory.$inferSelect;

// ============================================================
// TIRE REPLACEMENT SETTINGS
// ============================================================
export const tirePositionEnum = ["steer", "drive", "trailer", "all_position", "spare"] as const;

export const tireReplacementSettings = pgTable("tire_replacement_settings", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  position: text("position").notNull().$type<typeof tirePositionEnum[number]>(),
  minTreadDepth: decimal("min_tread_depth", { precision: 4, scale: 1 }).notNull().default("4.0"),
  warningTreadDepth: decimal("warning_tread_depth", { precision: 4, scale: 1 }).notNull().default("5.0"),
  maxMiles: integer("max_miles"),
  maxAge: integer("max_age_months"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tire_replacement_settings_org").on(table.orgId),
]);

export const insertTireReplacementSettingSchema = createInsertSchema(tireReplacementSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTireReplacementSetting = z.infer<typeof insertTireReplacementSettingSchema>;
export type TireReplacementSetting = typeof tireReplacementSettings.$inferSelect;

// ============================================================
// PUBLIC ASSET ACCESS TOKENS (for QR Code DVIR)
// ============================================================
export const publicAssetTokens = pgTable("public_asset_tokens", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_public_asset_tokens_org").on(table.orgId),
  index("idx_public_asset_tokens_asset").on(table.assetId),
  index("idx_public_asset_tokens_token").on(table.token),
]);

export const insertPublicAssetTokenSchema = createInsertSchema(publicAssetTokens).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicAssetToken = z.infer<typeof insertPublicAssetTokenSchema>;
export type PublicAssetToken = typeof publicAssetTokens.$inferSelect;

// ============================================================
// MESSAGES / CONVERSATIONS
// ============================================================
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }),
  isGroup: boolean("is_group").default(false),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_conversations_org").on(table.orgId),
]);

export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
}, (table) => [
  index("idx_participants_conversation").on(table.conversationId),
  index("idx_participants_user").on(table.userId),
]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  entityType: text("entity_type"), // work_order, asset, part, etc.
  entityId: integer("entity_id"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_messages_conversation").on(table.conversationId),
  index("idx_messages_sender").on(table.senderId),
]);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, { fields: [conversations.orgId], references: [organizations.id] }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ============================================================
// REPORTS
// ============================================================
export const reportTypeEnum = ["work_order_cost", "asset_downtime", "parts_consumption", "custom"] as const;
export const reportStatusEnum = ["draft", "active", "archived"] as const;

export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: text("type").$type<typeof reportTypeEnum[number]>().default("custom"),
  status: text("status").$type<typeof reportStatusEnum[number]>().default("active"),
  config: jsonb("config"), // filters, grouping, columns, etc.
  chartType: varchar("chart_type", { length: 50 }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  isScheduled: boolean("is_scheduled").default(false),
  scheduleFrequency: varchar("schedule_frequency", { length: 50 }), // daily, weekly, monthly
  scheduleRecipients: text("schedule_recipients").array(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_saved_reports_org").on(table.orgId),
  index("idx_saved_reports_type").on(table.type),
]);

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;
export type SavedReport = typeof savedReports.$inferSelect;

// ============================================================
// INSPECTION FORMS
// ============================================================
export const inspectionForms = pgTable("inspection_forms", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  fields: jsonb("fields"), // array of field definitions
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspection_forms_org").on(table.orgId),
]);

export const inspectionResults = pgTable("inspection_results", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => inspectionForms.id),
  assetId: integer("asset_id").references(() => assets.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  inspectorId: varchar("inspector_id", { length: 255 }).notNull(),
  responses: jsonb("responses"), // field responses
  photos: text("photos").array(),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  signature: text("signature"),
  status: varchar("status", { length: 50 }).default("completed"),
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_inspection_results_form").on(table.formId),
  index("idx_inspection_results_asset").on(table.assetId),
]);

export const insertInspectionFormSchema = createInsertSchema(inspectionForms).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInspectionForm = z.infer<typeof insertInspectionFormSchema>;
export type InspectionForm = typeof inspectionForms.$inferSelect;

export const insertInspectionResultSchema = createInsertSchema(inspectionResults).omit({ id: true, createdAt: true });
export type InsertInspectionResult = z.infer<typeof insertInspectionResultSchema>;
export type InspectionResult = typeof inspectionResults.$inferSelect;

// ============================================================
// PUBLIC DASHBOARDS
// ============================================================
export const publicDashboards = pgTable("public_dashboards", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  accessToken: varchar("access_token", { length: 64 }).notNull().unique(),
  type: varchar("type", { length: 50 }).default("fleet_status"), // fleet_status, kpi_summary, work_orders, custom
  locationId: integer("location_id").references(() => locations.id), // null = all locations
  widgets: jsonb("widgets"), // widget configuration
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_public_dashboards_token").on(table.accessToken),
  index("idx_public_dashboards_org").on(table.orgId),
  index("idx_public_dashboards_location").on(table.locationId),
]);

export const insertPublicDashboardSchema = createInsertSchema(publicDashboards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicDashboard = z.infer<typeof insertPublicDashboardSchema>;
export type PublicDashboard = typeof publicDashboards.$inferSelect;

// ============================================================
// GPS TRACKING
// ============================================================
export const gpsLocations = pgTable("gps_locations", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 1 }),
  heading: integer("heading"),
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gps_locations_asset").on(table.assetId),
  index("idx_gps_locations_recorded").on(table.recordedAt),
]);

export const geofences = pgTable("geofences", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("circle"), // circle, polygon
  centerLatitude: decimal("center_latitude", { precision: 10, scale: 7 }),
  centerLongitude: decimal("center_longitude", { precision: 10, scale: 7 }),
  radiusMeters: integer("radius_meters"),
  polygonCoords: jsonb("polygon_coords"), // array of lat/lng points
  alertOnEnter: boolean("alert_on_enter").default(true),
  alertOnExit: boolean("alert_on_exit").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_geofences_org").on(table.orgId),
]);

export const insertGpsLocationSchema = createInsertSchema(gpsLocations).omit({ id: true, createdAt: true });
export type InsertGpsLocation = z.infer<typeof insertGpsLocationSchema>;
export type GpsLocation = typeof gpsLocations.$inferSelect;

export const insertGeofenceSchema = createInsertSchema(geofences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;
export type Geofence = typeof geofences.$inferSelect;
