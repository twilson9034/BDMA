import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  Bell, 
  Building,
  LogOut,
  Code2,
  ChevronRight,
  Users,
  Crown,
  Shield,
  Wrench,
  Eye,
  Loader2,
  Palette,
  List,
  Tags,
  Settings2,
  Plus,
  Trash2,
  MapPin,
  LayoutDashboard,
  Pencil,
  Copy,
  Check,
  X,
  Lock
} from "lucide-react";
import { Link } from "wouter";

interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  maxAssets: number;
  allowMultiLocationTechs?: boolean;
  requireEstimateApproval?: boolean;
  requireRequisitionApproval?: boolean;
  requirePOApproval?: boolean;
  enableBarcodeSystem?: boolean;
  enableOosChecking?: boolean;
}

interface OrgMember {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  primaryLocationId?: number | null;
}

interface Location {
  id: number;
  name: string;
}

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  manager: Users,
  technician: Wrench,
  viewer: Eye,
  dev: Code2,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  technician: "Technician",
  viewer: "Viewer",
  dev: "Developer",
};

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  dev: "default",
  manager: "secondary",
  technician: "secondary",
  viewer: "outline",
};

interface RolePermissions {
  assets: { view: boolean; create: boolean; edit: boolean; delete: boolean; viewCost: boolean; manageDocuments: boolean; manageImages: boolean; };
  workOrders: { view: boolean; viewAll: boolean; create: boolean; edit: boolean; delete: boolean; assign: boolean; complete: boolean; approve: boolean; viewCost: boolean; };
  inventory: { view: boolean; create: boolean; edit: boolean; delete: boolean; adjustQuantity: boolean; viewCost: boolean; managePricing: boolean; manageVendors: boolean; };
  procurement: { viewRequisitions: boolean; createRequisitions: boolean; approveRequisitions: boolean; viewPurchaseOrders: boolean; createPurchaseOrders: boolean; approvePurchaseOrders: boolean; receiveOrders: boolean; };
  scheduling: { viewSchedules: boolean; createSchedules: boolean; editSchedules: boolean; deleteSchedules: boolean; };
  inspections: { view: boolean; create: boolean; edit: boolean; delete: boolean; overrideUnsafe: boolean; };
  estimates: { view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean; viewCost: boolean; };
  reports: { viewDashboard: boolean; viewReports: boolean; createReports: boolean; exportData: boolean; };
  ai: { viewPredictions: boolean; acknowledgePredictions: boolean; dismissPredictions: boolean; configureAI: boolean; };
  admin: { manageUsers: boolean; manageRoles: boolean; manageLocations: boolean; manageOrganization: boolean; viewAuditLog: boolean; manageIntegrations: boolean; };
}

interface CustomRole {
  id: number;
  orgId: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_CATEGORIES: { key: keyof RolePermissions; label: string; icon: typeof Shield }[] = [
  { key: "assets", label: "Assets", icon: Wrench },
  { key: "workOrders", label: "Work Orders", icon: List },
  { key: "inventory", label: "Inventory", icon: Tags },
  { key: "procurement", label: "Procurement", icon: Building },
  { key: "scheduling", label: "Scheduling", icon: LayoutDashboard },
  { key: "inspections", label: "Inspections", icon: Check },
  { key: "estimates", label: "Estimates", icon: Code2 },
  { key: "reports", label: "Reports", icon: Eye },
  { key: "ai", label: "AI Features", icon: Bell },
  { key: "admin", label: "Administration", icon: Shield },
];

const PERMISSION_LABELS: Record<string, Record<string, string>> = {
  assets: { view: "View assets", create: "Create assets", edit: "Edit assets", delete: "Delete assets", viewCost: "View asset costs", manageDocuments: "Manage documents", manageImages: "Manage images" },
  workOrders: { view: "View work orders", viewAll: "View all work orders", create: "Create work orders", edit: "Edit work orders", delete: "Delete work orders", assign: "Assign work orders", complete: "Complete work orders", approve: "Approve work orders", viewCost: "View labor costs" },
  inventory: { view: "View inventory", create: "Create parts", edit: "Edit parts", delete: "Delete parts", adjustQuantity: "Adjust quantity", viewCost: "View costs", managePricing: "Manage pricing", manageVendors: "Manage vendors" },
  procurement: { viewRequisitions: "View requisitions", createRequisitions: "Create requisitions", approveRequisitions: "Approve requisitions", viewPurchaseOrders: "View purchase orders", createPurchaseOrders: "Create purchase orders", approvePurchaseOrders: "Approve purchase orders", receiveOrders: "Receive deliveries" },
  scheduling: { viewSchedules: "View schedules", createSchedules: "Create schedules", editSchedules: "Edit schedules", deleteSchedules: "Delete schedules" },
  inspections: { view: "View inspections", create: "Create inspections", edit: "Edit inspections", delete: "Delete inspections", overrideUnsafe: "Override unsafe conditions" },
  estimates: { view: "View estimates", create: "Create estimates", edit: "Edit estimates", delete: "Delete estimates", approve: "Approve estimates", viewCost: "View estimate costs" },
  reports: { viewDashboard: "View dashboard", viewReports: "View reports", createReports: "Create reports", exportData: "Export data" },
  ai: { viewPredictions: "View predictions", acknowledgePredictions: "Acknowledge predictions", dismissPredictions: "Dismiss predictions", configureAI: "Configure AI settings" },
  admin: { manageUsers: "Manage users", manageRoles: "Manage roles", manageLocations: "Manage locations", manageOrganization: "Manage organization", viewAuditLog: "View audit log", manageIntegrations: "Manage integrations" },
};

function RolesManagement({ canManageOrg }: { canManageOrg: boolean }) {
  const { toast } = useToast();
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<CustomRole | null>(null);
  const [duplicateRole, setDuplicateRole] = useState<CustomRole | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<RolePermissions | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery<CustomRole[]>({
    queryKey: ["/api/custom-roles"],
  });

  const seedRolesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/custom-roles/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "Standard roles created", description: "Default roles have been seeded successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error seeding roles", description: error.message, variant: "destructive" });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: RolePermissions }) =>
      apiRequest("POST", "/api/custom-roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "Role created", description: "The new role has been created." });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating role", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; permissions?: RolePermissions } }) =>
      apiRequest("PATCH", `/api/custom-roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "Role updated", description: "The role has been updated." });
      resetForm();
      setEditingRole(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/custom-roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "Role deleted", description: "The role has been removed." });
      setDeleteConfirmRole(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting role", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormPermissions(null);
    setExpandedCategory(null);
  };

  const openEditDialog = (role: CustomRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormPermissions(role.permissions);
  };

  const openDuplicateDialog = (role: CustomRole) => {
    setDuplicateRole(role);
    setFormName(`${role.name} (Copy)`);
    setFormDescription(role.description || "");
    setFormPermissions(role.permissions);
    setIsCreateDialogOpen(true);
  };

  const handleCreateRole = () => {
    if (!formName.trim() || !formPermissions) return;
    createRoleMutation.mutate({ name: formName, description: formDescription, permissions: formPermissions });
  };

  const handleUpdateRole = () => {
    if (!editingRole || !formName.trim()) return;
    updateRoleMutation.mutate({ id: editingRole.id, data: { name: formName, description: formDescription, permissions: formPermissions || undefined } });
  };

  const togglePermission = (category: keyof RolePermissions, permission: string) => {
    if (!formPermissions) return;
    const categoryPerms = formPermissions[category] as Record<string, boolean>;
    setFormPermissions({
      ...formPermissions,
      [category]: {
        ...categoryPerms,
        [permission]: !categoryPerms[permission],
      },
    });
  };

  const toggleAllInCategory = (category: keyof RolePermissions, value: boolean) => {
    if (!formPermissions) return;
    const categoryPerms = { ...formPermissions[category] } as Record<string, boolean>;
    Object.keys(categoryPerms).forEach(key => { categoryPerms[key] = value; });
    setFormPermissions({ ...formPermissions, [category]: categoryPerms });
  };

  const getDefaultPermissions = (): RolePermissions => ({
    assets: { view: false, create: false, edit: false, delete: false, viewCost: false, manageDocuments: false, manageImages: false },
    workOrders: { view: false, viewAll: false, create: false, edit: false, delete: false, assign: false, complete: false, approve: false, viewCost: false },
    inventory: { view: false, create: false, edit: false, delete: false, adjustQuantity: false, viewCost: false, managePricing: false, manageVendors: false },
    procurement: { viewRequisitions: false, createRequisitions: false, approveRequisitions: false, viewPurchaseOrders: false, createPurchaseOrders: false, approvePurchaseOrders: false, receiveOrders: false },
    scheduling: { viewSchedules: false, createSchedules: false, editSchedules: false, deleteSchedules: false },
    inspections: { view: false, create: false, edit: false, delete: false, overrideUnsafe: false },
    estimates: { view: false, create: false, edit: false, delete: false, approve: false, viewCost: false },
    reports: { viewDashboard: false, viewReports: false, createReports: false, exportData: false },
    ai: { viewPredictions: false, acknowledgePredictions: false, dismissPredictions: false, configureAI: false },
    admin: { manageUsers: false, manageRoles: false, manageLocations: false, manageOrganization: false, viewAuditLog: false, manageIntegrations: false },
  });

  const countEnabledPermissions = (perms: RolePermissions): number => {
    return Object.values(perms).reduce((acc, cat) => {
      return acc + Object.values(cat as Record<string, boolean>).filter(v => v === true).length;
    }, 0);
  };

  const countTotalPermissions = (): number => {
    return Object.values(getDefaultPermissions()).reduce((acc, cat) => acc + Object.keys(cat).length, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-roles-management">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Custom Roles
              </CardTitle>
              <CardDescription>
                Create and manage roles with custom permissions for your organization
              </CardDescription>
            </div>
            {canManageOrg && (
              <div className="flex items-center gap-2">
                {roles.length === 0 && (
                  <Button variant="outline" onClick={() => seedRolesMutation.mutate()} disabled={seedRolesMutation.isPending} data-testid="button-seed-roles">
                    {seedRolesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Standard Roles
                  </Button>
                )}
                <Button onClick={() => { resetForm(); setFormPermissions(getDefaultPermissions()); setIsCreateDialogOpen(true); }} data-testid="button-create-role">
                  <Plus className="h-4 w-4 mr-2" />
                  New Role
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No custom roles yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create standard roles or add a custom role to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-4 rounded-lg border border-border" data-testid={`role-item-${role.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                      </div>
                      {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {countEnabledPermissions(role.permissions)} of {countTotalPermissions()} permissions enabled
                      </p>
                    </div>
                  </div>
                  {canManageOrg && (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openDuplicateDialog(role)} data-testid={`button-duplicate-role-${role.id}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(role)} data-testid={`button-edit-role-${role.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!role.isSystem && (
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirmRole(role)} data-testid={`button-delete-role-${role.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); setDuplicateRole(null); } setIsCreateDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{duplicateRole ? "Duplicate Role" : "Create New Role"}</DialogTitle>
            <DialogDescription>
              {duplicateRole ? `Creating a copy of "${duplicateRole.name}"` : "Define a new role with custom permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input id="role-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Senior Technician" data-testid="input-role-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Input id="role-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" data-testid="input-role-description" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const categoryPerms = formPermissions?.[cat.key] as Record<string, boolean> | undefined;
                  const enabledCount = categoryPerms ? Object.values(categoryPerms).filter(Boolean).length : 0;
                  const totalCount = categoryPerms ? Object.keys(categoryPerms).length : 0;
                  const isExpanded = expandedCategory === cat.key;
                  
                  return (
                    <div key={cat.key} className="border rounded-md">
                      <button type="button" className="w-full flex items-center justify-between p-3 hover-elevate" onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cat.label}</span>
                          <Badge variant="outline" className="text-xs">{enabledCount}/{totalCount}</Badge>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                      {isExpanded && categoryPerms && (
                        <div className="p-3 pt-0 space-y-2 border-t">
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <Button size="sm" variant="ghost" onClick={() => toggleAllInCategory(cat.key, true)}>Enable All</Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleAllInCategory(cat.key, false)}>Disable All</Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(categoryPerms).map(([perm, enabled]) => (
                              <div key={perm} className="flex items-center gap-2">
                                <Switch checked={enabled as boolean} onCheckedChange={() => togglePermission(cat.key, perm)} data-testid={`switch-${cat.key}-${perm}`} />
                                <Label className="text-sm cursor-pointer" onClick={() => togglePermission(cat.key, perm)}>
                                  {PERMISSION_LABELS[cat.key]?.[perm] || perm}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDuplicateRole(null); setIsCreateDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={!formName.trim() || createRoleMutation.isPending} data-testid="button-confirm-create-role">
              {createRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRole} onOpenChange={(open) => { if (!open) { resetForm(); setEditingRole(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Modify role settings and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input id="edit-role-name" value={formName} onChange={(e) => setFormName(e.target.value)} data-testid="input-edit-role-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Input id="edit-role-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} data-testid="input-edit-role-description" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const categoryPerms = formPermissions?.[cat.key] as Record<string, boolean> | undefined;
                  const enabledCount = categoryPerms ? Object.values(categoryPerms).filter(Boolean).length : 0;
                  const totalCount = categoryPerms ? Object.keys(categoryPerms).length : 0;
                  const isExpanded = expandedCategory === cat.key;
                  
                  return (
                    <div key={cat.key} className="border rounded-md">
                      <button type="button" className="w-full flex items-center justify-between p-3 hover-elevate" onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cat.label}</span>
                          <Badge variant="outline" className="text-xs">{enabledCount}/{totalCount}</Badge>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                      {isExpanded && categoryPerms && (
                        <div className="p-3 pt-0 space-y-2 border-t">
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <Button size="sm" variant="ghost" onClick={() => toggleAllInCategory(cat.key, true)}>Enable All</Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleAllInCategory(cat.key, false)}>Disable All</Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(categoryPerms).map(([perm, enabled]) => (
                              <div key={perm} className="flex items-center gap-2">
                                <Switch checked={enabled as boolean} onCheckedChange={() => togglePermission(cat.key, perm)} data-testid={`switch-edit-${cat.key}-${perm}`} />
                                <Label className="text-sm cursor-pointer" onClick={() => togglePermission(cat.key, perm)}>
                                  {PERMISSION_LABELS[cat.key]?.[perm] || perm}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setEditingRole(null); }}>Cancel</Button>
            <Button onClick={handleUpdateRole} disabled={!formName.trim() || updateRoleMutation.isPending} data-testid="button-confirm-edit-role">
              {updateRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmRole} onOpenChange={(open) => { if (!open) setDeleteConfirmRole(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{deleteConfirmRole?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmRole(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmRole && deleteRoleMutation.mutate(deleteConfirmRole.id)} disabled={deleteRoleMutation.isPending} data-testid="button-confirm-delete-role">
              {deleteRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewAsRoleCard roles={roles} />
    </div>
  );
}

function ViewAsRoleCard({ roles }: { roles: CustomRole[] }) {
  const { toast } = useToast();
  
  const { data: viewAsStatus, refetch: refetchViewAs } = useQuery<{ viewAsRoleId: number | null; viewAsPermissions: RolePermissions | null }>({
    queryKey: ["/api/custom-roles/view-as"],
  });

  const setViewAsMutation = useMutation({
    mutationFn: (roleId: number) =>
      apiRequest("POST", `/api/custom-roles/view-as/${roleId}`),
    onSuccess: () => {
      refetchViewAs();
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ title: "View mode changed", description: "You are now viewing the app as the selected role." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearViewAsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/custom-roles/view-as"),
    onSuccess: () => {
      refetchViewAs();
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ title: "View mode cleared", description: "You are now viewing the app with your normal permissions." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeRole = roles.find(r => r.id === viewAsStatus?.viewAsRoleId);

  return (
    <Card data-testid="card-view-as-role">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview as Role
        </CardTitle>
        <CardDescription>
          Test how the application appears with different role permissions without changing your actual access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewAsStatus?.viewAsRoleId && activeRole ? (
          <div className="flex items-center justify-between p-4 rounded-lg border border-primary bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/20">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Currently viewing as: {activeRole.name}</p>
                <p className="text-sm text-muted-foreground">Your permissions are temporarily restricted to this role's settings</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => clearViewAsMutation.mutate()} disabled={clearViewAsMutation.isPending} data-testid="button-clear-view-as">
              {clearViewAsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Stop Preview
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select onValueChange={(value) => setViewAsMutation.mutate(parseInt(value))} disabled={setViewAsMutation.isPending || roles.length === 0}>
              <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-view-as-role">
                <SelectValue placeholder={roles.length === 0 ? "No roles available" : "Select a role to preview..."} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {role.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Select a role to see the app from that perspective</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [requireEstimateApproval, setRequireEstimateApproval] = useState(false);
  const [requireRequisitionApproval, setRequireRequisitionApproval] = useState(true);
  const [requirePOApproval, setRequirePOApproval] = useState(true);
  const [enableBarcodeSystem, setEnableBarcodeSystem] = useState(false);
  const [enableOosChecking, setEnableOosChecking] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<string>(() => {
    return localStorage.getItem("bdma_simulated_role") || "";
  });
  
  // Dashboard settings state
  const [dashboardLocationPref, setDashboardLocationPref] = useState<string>(() => {
    return localStorage.getItem("bdma_dashboard_location") || "assigned";
  });
  
  // Customization tab state
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("Text");
  const [newFieldEntity, setNewFieldEntity] = useState("asset");
  const [dropdownDialogOpen, setDropdownDialogOpen] = useState(false);
  const [dropdownCategory, setDropdownCategory] = useState("");
  const [newDropdownOption, setNewDropdownOption] = useState("");
  
  // Repair Reason Codes state
  const [repairReasonDialogOpen, setRepairReasonDialogOpen] = useState(false);
  const [repairReasonEdit, setRepairReasonEdit] = useState<{ id: number; code: string; description: string } | null>(null);
  const [newRepairReasonCode, setNewRepairReasonCode] = useState("");
  const [newRepairReasonDescription, setNewRepairReasonDescription] = useState("");
  
  // Cause Codes state
  const [causeCodeDialogOpen, setCauseCodeDialogOpen] = useState(false);
  const [causeCodeEdit, setCauseCodeEdit] = useState<{ id: number; code: string; description: string } | null>(null);
  const [newCauseCodeCode, setNewCauseCodeCode] = useState("");
  const [newCauseCodeDescription, setNewCauseCodeDescription] = useState("");

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["/api/organizations/current"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations/current/members"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Repair Reason Codes
  interface RepairReasonCode {
    id: number;
    code: string;
    description: string;
    orgId?: number;
    isActive?: boolean;
  }
  const { data: repairReasonCodes = [], isLoading: repairReasonLoading } = useQuery<RepairReasonCode[]>({
    queryKey: ["/api/repair-reason-codes"],
  });

  const createRepairReasonMutation = useMutation({
    mutationFn: async (data: { code: string; description: string }) => {
      return apiRequest("POST", "/api/repair-reason-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-reason-codes"] });
      toast({ title: "Repair Reason Code Added", description: "The repair reason code has been created." });
      setRepairReasonDialogOpen(false);
      setNewRepairReasonCode("");
      setNewRepairReasonDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create repair reason code.", variant: "destructive" });
    },
  });

  const updateRepairReasonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { code?: string; description?: string } }) => {
      return apiRequest("PATCH", `/api/repair-reason-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-reason-codes"] });
      toast({ title: "Repair Reason Code Updated", description: "The repair reason code has been updated." });
      setRepairReasonDialogOpen(false);
      setRepairReasonEdit(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update repair reason code.", variant: "destructive" });
    },
  });

  const deleteRepairReasonMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/repair-reason-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-reason-codes"] });
      toast({ title: "Repair Reason Code Deleted", description: "The repair reason code has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete repair reason code.", variant: "destructive" });
    },
  });

  // Cause Codes
  interface CauseCode {
    id: number;
    code: string;
    description: string;
    orgId?: number;
    isActive?: boolean;
  }
  const { data: causeCodes = [], isLoading: causeCodeLoading } = useQuery<CauseCode[]>({
    queryKey: ["/api/cause-codes"],
  });

  const createCauseCodeMutation = useMutation({
    mutationFn: async (data: { code: string; description: string }) => {
      return apiRequest("POST", "/api/cause-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cause-codes"] });
      toast({ title: "Cause Code Added", description: "The cause code has been created." });
      setCauseCodeDialogOpen(false);
      setNewCauseCodeCode("");
      setNewCauseCodeDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create cause code.", variant: "destructive" });
    },
  });

  const updateCauseCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { code?: string; description?: string } }) => {
      return apiRequest("PATCH", `/api/cause-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cause-codes"] });
      toast({ title: "Cause Code Updated", description: "The cause code has been updated." });
      setCauseCodeDialogOpen(false);
      setCauseCodeEdit(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update cause code.", variant: "destructive" });
    },
  });

  const deleteCauseCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/cause-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cause-codes"] });
      toast({ title: "Cause Code Deleted", description: "The cause code has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete cause code.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setRequireEstimateApproval(organization.requireEstimateApproval ?? false);
      setRequireRequisitionApproval(organization.requireRequisitionApproval ?? true);
      setRequirePOApproval(organization.requirePOApproval ?? true);
      setEnableBarcodeSystem(organization.enableBarcodeSystem ?? false);
      setEnableOosChecking(organization.enableOosChecking ?? false);
    }
  }, [organization]);

  const updateOrgMutation = useMutation({
    mutationFn: async (data: { 
      name?: string; 
      slug?: string;
      requireEstimateApproval?: boolean;
      requireRequisitionApproval?: boolean;
      requirePOApproval?: boolean;
      enableBarcodeSystem?: boolean;
      enableOosChecking?: boolean;
    }) => {
      return apiRequest("PATCH", "/api/organizations/current", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Organization updated", description: "Your organization settings have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update organization settings.", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      return apiRequest("PATCH", `/api/organizations/current/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current/members"] });
      toast({ title: "Role updated", description: "Member role has been updated." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update member role.", 
        variant: "destructive" 
      });
    },
  });

  const updateMemberLocationMutation = useMutation({
    mutationFn: async ({ memberId, primaryLocationId }: { memberId: number; primaryLocationId: number | null }) => {
      return apiRequest("PATCH", `/api/organizations/current/members/${memberId}/location`, { primaryLocationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current/members"] });
      toast({ title: "Location updated", description: "Member location has been updated." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update member location.", 
        variant: "destructive" 
      });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      return apiRequest("POST", "/api/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setAddLocationOpen(false);
      setNewLocationName("");
      setNewLocationAddress("");
      toast({ title: "Location created", description: "New location has been added." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create location.", 
        variant: "destructive" 
      });
    },
  });

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    createLocationMutation.mutate({ 
      name: newLocationName.trim(), 
      address: newLocationAddress.trim() || undefined 
    });
  };

  const currentUserMembership = members.find(m => m.userId === user?.id);
  const canManageOrg = currentUserMembership?.role === "owner" || currentUserMembership?.role === "admin";

  const handleSaveOrgSettings = () => {
    const updates: { 
      name?: string; 
      requireEstimateApproval?: boolean;
      requireRequisitionApproval?: boolean;
      requirePOApproval?: boolean;
      enableBarcodeSystem?: boolean;
      enableOosChecking?: boolean;
    } = {};
    
    if (orgName?.trim() && orgName !== organization?.name) {
      updates.name = orgName;
    }
    
    if (requireEstimateApproval !== organization?.requireEstimateApproval) {
      updates.requireEstimateApproval = requireEstimateApproval;
    }
    if (requireRequisitionApproval !== organization?.requireRequisitionApproval) {
      updates.requireRequisitionApproval = requireRequisitionApproval;
    }
    if (requirePOApproval !== organization?.requirePOApproval) {
      updates.requirePOApproval = requirePOApproval;
    }
    if (enableBarcodeSystem !== organization?.enableBarcodeSystem) {
      updates.enableBarcodeSystem = enableBarcodeSystem;
    }
    if (enableOosChecking !== organization?.enableOosChecking) {
      updates.enableOosChecking = enableOosChecking;
    }
    
    if (Object.keys(updates).length === 0) return;
    updateOrgMutation.mutate(updates);
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and application preferences"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard & KPIs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2" data-testid="tab-organization">
            <Building className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2" data-testid="tab-team">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2" data-testid="tab-roles">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="customization" className="gap-2" data-testid="tab-customization">
            <Settings2 className="h-4 w-4" />
            Customization
          </TabsTrigger>
          <TabsTrigger value="tire-settings" className="gap-2" data-testid="tab-tire-settings">
            <Settings2 className="h-4 w-4" />
            Tire Settings
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2" data-testid="tab-inventory">
            <Tags className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="developer" className="gap-2" data-testid="tab-developer">
            <Code2 className="h-4 w-4" />
            Developer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {currentUserMembership && (
                      <Badge variant={roleBadgeVariants[currentUserMembership.role] || "secondary"} className="mt-2">
                        {roleLabels[currentUserMembership.role] || currentUserMembership.role}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue={user?.firstName || ""} data-testid="input-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue={user?.lastName || ""} data-testid="input-last-name" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user?.email || ""} disabled data-testid="input-email" />
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 pt-4">
                  <Button variant="outline" onClick={() => logout()} disabled={isLoggingOut} data-testid="button-sign-out">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                  <Button data-testid="button-save-profile">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard & KPI Settings</CardTitle>
              <CardDescription>
                Configure your dashboard view and KPI preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Dashboard Location Filter</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose which location data to display on your dashboard
                  </p>
                  <Select
                    value={dashboardLocationPref}
                    onValueChange={(value) => {
                      setDashboardLocationPref(value);
                      localStorage.setItem("bdma_dashboard_location", value);
                      toast({ title: "Dashboard preference saved", description: "Your dashboard will now show data for the selected location." });
                    }}
                  >
                    <SelectTrigger className="w-full max-w-md" data-testid="select-dashboard-location">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select location preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assigned" data-testid="option-assigned-location">
                        My Assigned Location
                      </SelectItem>
                      <SelectItem value="all" data-testid="option-all-locations">
                        All Locations
                      </SelectItem>
                      <Separator className="my-1" />
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)} data-testid={`option-location-${location.id}`}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-medium">Current Assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    Your primary location assignment determines the default dashboard view when "My Assigned Location" is selected.
                  </p>
                  {currentUserMembership?.primaryLocationId ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {locations.find(l => l.id === currentUserMembership.primaryLocationId)?.name || "Unknown Location"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No location assigned. Contact your administrator to set your primary location.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Work Order Assignments</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're assigned to a work order
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-wo-assignments" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">PM Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders for upcoming preventive maintenance
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-pm-reminders" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when parts reach reorder point
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-low-stock" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Asset Status Changes</p>
                    <p className="text-sm text-muted-foreground">
                      Notifications when assets change status
                    </p>
                  </div>
                  <Switch data-testid="switch-asset-status" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily summary of maintenance activities
                    </p>
                  </div>
                  <Switch data-testid="switch-daily-summary" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button data-testid="button-save-notifications">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage your organization's CMMS configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {orgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : organization ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input 
                          id="orgName" 
                          defaultValue={organization.name}
                          onChange={(e) => setOrgName(e.target.value)}
                          disabled={!canManageOrg}
                          data-testid="input-org-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <div className="flex items-center gap-2 h-9">
                          <Badge variant="outline" className="capitalize">
                            {organization.plan}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            (up to {organization.maxAssets} assets)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Asset Auto-Status</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Auto-update asset status based on work orders</p>
                          <p className="text-xs text-muted-foreground">
                            Assets will automatically change to "In Maintenance" when active work orders exist
                          </p>
                        </div>
                        <Switch defaultChecked disabled={!canManageOrg} data-testid="switch-auto-status" />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Approval Workflows</h4>
                      <p className="text-xs text-muted-foreground">
                        Configure which documents require approval before processing
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Require Estimate Approval</p>
                          <p className="text-xs text-muted-foreground">
                            Estimates must be approved before converting to work orders
                          </p>
                        </div>
                        <Switch 
                          checked={requireEstimateApproval} 
                          onCheckedChange={setRequireEstimateApproval}
                          disabled={!canManageOrg} 
                          data-testid="switch-require-estimate-approval" 
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Require Requisition Approval</p>
                          <p className="text-xs text-muted-foreground">
                            Purchase requisitions must be approved before converting to POs
                          </p>
                        </div>
                        <Switch 
                          checked={requireRequisitionApproval} 
                          onCheckedChange={setRequireRequisitionApproval}
                          disabled={!canManageOrg} 
                          data-testid="switch-require-requisition-approval" 
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Require PO Approval</p>
                          <p className="text-xs text-muted-foreground">
                            Purchase orders must be approved before sending to vendors
                          </p>
                        </div>
                        <Switch 
                          checked={requirePOApproval} 
                          onCheckedChange={setRequirePOApproval}
                          disabled={!canManageOrg} 
                          data-testid="switch-require-po-approval" 
                        />
                      </div>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Enable Barcode System</p>
                          <p className="text-xs text-muted-foreground">
                            Enable barcode printing for inventory parts and prompt to print labels when receiving goods
                          </p>
                        </div>
                        <Switch 
                          checked={enableBarcodeSystem} 
                          onCheckedChange={setEnableBarcodeSystem}
                          disabled={!canManageOrg} 
                          data-testid="switch-enable-barcode-system" 
                        />
                      </div>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Enable OOS Compliance Checking</p>
                          <p className="text-xs text-muted-foreground">
                            Enable out-of-service rule evaluation on OOS-sensitive checklists and DVIRs
                          </p>
                        </div>
                        <Switch 
                          checked={enableOosChecking} 
                          onCheckedChange={setEnableOosChecking}
                          disabled={!canManageOrg} 
                          data-testid="switch-enable-oos-checking" 
                        />
                      </div>
                    </div>

                    {canManageOrg && (
                      <div className="flex justify-end pt-4">
                        <Button 
                          onClick={handleSaveOrgSettings}
                          disabled={updateOrgMutation.isPending}
                          data-testid="button-save-org-settings"
                        >
                          {updateOrgMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Settings
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No organization selected</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Manage your organization's locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {locations.length > 0 ? (
                    locations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{location.name}</span>
                        </div>
                        {canManageOrg && (
                          <Button variant="ghost" size="sm" data-testid={`button-edit-location-${location.id}`}>
                            Edit
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No locations configured</p>
                  )}
                </div>
                <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-4 w-full" data-testid="button-add-location">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Location</DialogTitle>
                        <DialogDescription>
                          Create a new location for your organization. Locations help organize assets, parts, and team members.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name</Label>
                          <Input
                            id="location-name"
                            placeholder="e.g., Main Warehouse, North Depot"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            data-testid="input-location-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-address">Address (optional)</Label>
                          <Textarea
                            id="location-address"
                            placeholder="Enter the full address"
                            value={newLocationAddress}
                            onChange={(e) => setNewLocationAddress(e.target.value)}
                            data-testid="input-location-address"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setAddLocationOpen(false)}
                          data-testid="button-cancel-location"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddLocation}
                          disabled={!newLocationName.trim() || createLocationMutation.isPending}
                          data-testid="button-save-location"
                        >
                          {createLocationMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Location"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  VMRS Codes
                </CardTitle>
                <CardDescription>
                  Manage standard maintenance codes for work order categorization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/vmrs">
                  <Button variant="outline" className="w-full justify-between" data-testid="button-manage-vmrs">
                    Manage VMRS Codes
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                View and manage your organization's team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => {
                    const RoleIcon = roleIcons[member.role] || User;
                    const isCurrentUser = member.userId === user?.id;
                    
                    return (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                        data-testid={`member-${member.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {member.firstName ? `${member.firstName} ${member.lastName || ""}`.trim() : member.email || "Unknown User"}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {canManageOrg && !isCurrentUser ? (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(value) => updateRoleMutation.mutate({ memberId: member.id, role: value })}
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-[140px]" data-testid={`select-role-${member.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">
                                    <div className="flex items-center gap-2">
                                      <Crown className="h-4 w-4" />
                                      Owner
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="manager">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Manager
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="technician">
                                    <div className="flex items-center gap-2">
                                      <Wrench className="h-4 w-4" />
                                      Technician
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="viewer">
                                    <div className="flex items-center gap-2">
                                      <Eye className="h-4 w-4" />
                                      Viewer
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="dev">
                                    <div className="flex items-center gap-2">
                                      <Code2 className="h-4 w-4" />
                                      Developer
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={member.primaryLocationId?.toString() || "none"}
                                onValueChange={(value) => updateMemberLocationMutation.mutate({ 
                                  memberId: member.id, 
                                  primaryLocationId: value === "none" ? null : parseInt(value) 
                                })}
                                disabled={updateMemberLocationMutation.isPending}
                              >
                                <SelectTrigger className="w-[160px]" data-testid={`select-location-${member.id}`}>
                                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <SelectValue placeholder="No location" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No location</SelectItem>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id.toString()}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant={roleBadgeVariants[member.role] || "secondary"} className="flex items-center gap-1">
                                <RoleIcon className="h-3 w-3" />
                                {roleLabels[member.role] || member.role}
                              </Badge>
                              {member.primaryLocationId && locations.find(l => l.id === member.primaryLocationId) && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {locations.find(l => l.id === member.primaryLocationId)?.name}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No team members found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <RolesManagement canManageOrg={canManageOrg} />
        </TabsContent>

        <TabsContent value="customization">
          <div className="grid gap-6">
            {/* Repair Reason Codes Management */}
            <Card data-testid="card-repair-reason-codes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Repair Reason Codes
                </CardTitle>
                <CardDescription>
                  Define standardized repair reason codes for work order lines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {repairReasonLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : repairReasonCodes.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {repairReasonCodes.map((rr) => (
                      <div key={rr.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`repair-reason-${rr.id}`}>
                        <div>
                          <Badge variant="outline" className="font-mono">{rr.code}</Badge>
                          <span className="ml-2 text-sm">{rr.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-edit-repair-reason-${rr.id}`}
                            onClick={() => {
                              setRepairReasonEdit(rr);
                              setNewRepairReasonCode(rr.code);
                              setNewRepairReasonDescription(rr.description);
                              setRepairReasonDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-delete-repair-reason-${rr.id}`}
                            onClick={() => deleteRepairReasonMutation.mutate(rr.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No repair reason codes yet. Add one to get started.</p>
                )}
                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-add-repair-reason"
                  onClick={() => {
                    setRepairReasonEdit(null);
                    setNewRepairReasonCode("");
                    setNewRepairReasonDescription("");
                    setRepairReasonDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Repair Reason Code
                </Button>
              </CardContent>
            </Card>

            {/* Repair Reason Code Dialog */}
            <Dialog open={repairReasonDialogOpen} onOpenChange={setRepairReasonDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle data-testid="dialog-repair-reason-title">{repairReasonEdit ? "Edit Repair Reason Code" : "Add Repair Reason Code"}</DialogTitle>
                  <DialogDescription>
                    {repairReasonEdit ? "Update the repair reason code details below." : "Enter the details for the new repair reason code."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input 
                      value={newRepairReasonCode}
                      onChange={(e) => setNewRepairReasonCode(e.target.value)}
                      placeholder="e.g., R01"
                      data-testid="input-repair-reason-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      value={newRepairReasonDescription}
                      onChange={(e) => setNewRepairReasonDescription(e.target.value)}
                      placeholder="e.g., Scheduled Maintenance"
                      data-testid="input-repair-reason-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRepairReasonDialogOpen(false)} data-testid="button-repair-reason-cancel">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (repairReasonEdit) {
                        updateRepairReasonMutation.mutate({
                          id: repairReasonEdit.id,
                          data: { code: newRepairReasonCode, description: newRepairReasonDescription }
                        });
                      } else {
                        createRepairReasonMutation.mutate({
                          code: newRepairReasonCode,
                          description: newRepairReasonDescription
                        });
                      }
                    }}
                    disabled={!newRepairReasonCode.trim() || !newRepairReasonDescription.trim() || createRepairReasonMutation.isPending || updateRepairReasonMutation.isPending}
                    data-testid="button-repair-reason-save"
                  >
                    {(createRepairReasonMutation.isPending || updateRepairReasonMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {repairReasonEdit ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cause Codes Management */}
            <Card data-testid="card-cause-codes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Cause Codes
                </CardTitle>
                <CardDescription>
                  Define standardized cause codes to track why repairs were needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {causeCodeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : causeCodes.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {causeCodes.map((cc) => (
                      <div key={cc.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`cause-code-${cc.id}`}>
                        <div>
                          <Badge variant="outline" className="font-mono">{cc.code}</Badge>
                          <span className="ml-2 text-sm">{cc.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-edit-cause-code-${cc.id}`}
                            onClick={() => {
                              setCauseCodeEdit(cc);
                              setNewCauseCodeCode(cc.code);
                              setNewCauseCodeDescription(cc.description);
                              setCauseCodeDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-delete-cause-code-${cc.id}`}
                            onClick={() => deleteCauseCodeMutation.mutate(cc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No cause codes yet. Add one to get started.</p>
                )}
                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-add-cause-code"
                  onClick={() => {
                    setCauseCodeEdit(null);
                    setNewCauseCodeCode("");
                    setNewCauseCodeDescription("");
                    setCauseCodeDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cause Code
                </Button>
              </CardContent>
            </Card>

            {/* Cause Code Dialog */}
            <Dialog open={causeCodeDialogOpen} onOpenChange={setCauseCodeDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle data-testid="dialog-cause-code-title">{causeCodeEdit ? "Edit Cause Code" : "Add Cause Code"}</DialogTitle>
                  <DialogDescription>
                    {causeCodeEdit ? "Update the cause code details below." : "Enter the details for the new cause code."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input 
                      value={newCauseCodeCode}
                      onChange={(e) => setNewCauseCodeCode(e.target.value)}
                      placeholder="e.g., C01"
                      data-testid="input-cause-code-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      value={newCauseCodeDescription}
                      onChange={(e) => setNewCauseCodeDescription(e.target.value)}
                      placeholder="e.g., Wear and Tear"
                      data-testid="input-cause-code-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCauseCodeDialogOpen(false)} data-testid="button-cause-code-cancel">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (causeCodeEdit) {
                        updateCauseCodeMutation.mutate({
                          id: causeCodeEdit.id,
                          data: { code: newCauseCodeCode, description: newCauseCodeDescription }
                        });
                      } else {
                        createCauseCodeMutation.mutate({
                          code: newCauseCodeCode,
                          description: newCauseCodeDescription
                        });
                      }
                    }}
                    disabled={!newCauseCodeCode.trim() || !newCauseCodeDescription.trim() || createCauseCodeMutation.isPending || updateCauseCodeMutation.isPending}
                    data-testid="button-cause-code-save"
                  >
                    {(createCauseCodeMutation.isPending || updateCauseCodeMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {causeCodeEdit ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Note about VMRS Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  VMRS Codes
                </CardTitle>
                <CardDescription>
                  Vehicle Maintenance Reporting Standards codes are managed in the Organization tab
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/vmrs">
                  <Button variant="outline" className="w-full justify-between" data-testid="button-goto-vmrs">
                    Manage VMRS Codes
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Custom Fields */}
            <Card data-testid="card-custom-fields">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Custom Fields
                </CardTitle>
                <CardDescription>
                  Define custom fields for assets, work orders, and parts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset Custom Fields</Label>
                  <div className="space-y-2">
                    {[
                      { name: "DOT Number", type: "Text", entity: "asset" },
                      { name: "Insurance Expiry", type: "Date", entity: "asset" },
                      { name: "License Plate State", type: "Dropdown", entity: "asset" },
                    ].map((field, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border" data-testid={`custom-field-${index}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{field.name}</span>
                          <Badge variant="secondary" className="text-xs">{field.type}</Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          data-testid={`button-delete-field-${index}`}
                          onClick={() => {
                            toast({ 
                              title: "Field Deleted", 
                              description: `Custom field "${field.name}" has been removed.` 
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-add-custom-field"
                  onClick={() => {
                    setNewFieldName("");
                    setNewFieldType("Text");
                    setNewFieldEntity("asset");
                    setCustomFieldDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Field
                </Button>
              </CardContent>
            </Card>

            {/* Custom Field Dialog */}
            <Dialog open={customFieldDialogOpen} onOpenChange={setCustomFieldDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle data-testid="dialog-custom-field-title">Add Custom Field</DialogTitle>
                  <DialogDescription>
                    Create a new custom field for tracking additional information.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Field Name</Label>
                    <Input 
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="e.g., VIN Number"
                      data-testid="input-field-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field Type</Label>
                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                      <SelectTrigger data-testid="select-field-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Date">Date</SelectItem>
                        <SelectItem value="Dropdown">Dropdown</SelectItem>
                        <SelectItem value="Checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Apply To</Label>
                    <Select value={newFieldEntity} onValueChange={setNewFieldEntity}>
                      <SelectTrigger data-testid="select-field-entity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Assets</SelectItem>
                        <SelectItem value="workOrder">Work Orders</SelectItem>
                        <SelectItem value="part">Parts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomFieldDialogOpen(false)} data-testid="button-field-cancel">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({ 
                        title: "Custom Field Added", 
                        description: `Custom field "${newFieldName}" has been added.` 
                      });
                      setCustomFieldDialogOpen(false);
                    }}
                    data-testid="button-field-save"
                  >
                    Add Field
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Configurable Dropdowns */}
            <Card data-testid="card-dropdown-config">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Dropdown Options
                </CardTitle>
                <CardDescription>
                  Customize dropdown values for statuses, priorities, and categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Work Order Priorities</Label>
                    <div className="space-y-1">
                      {["Low", "Medium", "High", "Critical"].map((priority, index) => (
                        <div key={priority} className="flex items-center justify-between p-2 rounded border text-sm" data-testid={`priority-option-${index}`}>
                          <span>{priority}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              setDropdownCategory("Work Order Priorities");
                              setNewDropdownOption(priority);
                              setDropdownDialogOpen(true);
                            }}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Categories</Label>
                    <div className="space-y-1">
                      {["Vehicle", "Trailer", "Equipment", "Tool"].map((category, index) => (
                        <div key={category} className="flex items-center justify-between p-2 rounded border text-sm" data-testid={`category-option-${index}`}>
                          <span>{category}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              setDropdownCategory("Asset Categories");
                              setNewDropdownOption(category);
                              setDropdownDialogOpen(true);
                            }}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dropdown Options Dialog */}
            <Dialog open={dropdownDialogOpen} onOpenChange={setDropdownDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle data-testid="dialog-dropdown-title">Edit Dropdown Option</DialogTitle>
                  <DialogDescription>
                    Update this {dropdownCategory} option.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={dropdownCategory} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Option Value</Label>
                    <Input 
                      value={newDropdownOption}
                      onChange={(e) => setNewDropdownOption(e.target.value)}
                      data-testid="input-dropdown-option"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDropdownDialogOpen(false)} data-testid="button-dropdown-cancel">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({ 
                        title: "Option Updated", 
                        description: `${dropdownCategory} option has been updated.` 
                      });
                      setDropdownDialogOpen(false);
                    }}
                    data-testid="button-dropdown-save"
                  >
                    Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Brand Customization */}
            <Card data-testid="card-branding">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Brand Customization
                </CardTitle>
                <CardDescription>
                  Customize the appearance with your brand colors and logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input id="primary-color" type="color" defaultValue="#3B82F6" className="w-12 h-10 p-1" data-testid="input-primary-color" />
                      <Input defaultValue="#3B82F6" className="font-mono" data-testid="input-primary-color-hex" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input id="accent-color" type="color" defaultValue="#10B981" className="w-12 h-10 p-1" data-testid="input-accent-color" />
                      <Input defaultValue="#10B981" className="font-mono" data-testid="input-accent-color-hex" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Palette className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag and drop your logo here, or click to browse</p>
                    <Button variant="outline" className="mt-3" data-testid="button-upload-logo">
                      Upload Logo
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button data-testid="button-save-branding">Save Branding</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tire-settings">
          <TireReplacementSettingsTab />
        </TabsContent>

        <TabsContent value="inventory">
          <InventorySettingsTab />
        </TabsContent>

        <TabsContent value="developer">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Developer Tools
                </CardTitle>
                <CardDescription>
                  Tools for testing and debugging the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">View as Role</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Simulate viewing the application as a different role to test permissions and UI visibility.
                      This only affects your view - it doesn't change your actual permissions.
                    </p>
                    <div className="flex gap-3 items-center">
                      <Select 
                        value={simulatedRole || "none"} 
                        onValueChange={(val) => {
                          const newRole = val === "none" ? "" : val;
                          setSimulatedRole(newRole);
                          if (newRole) {
                            localStorage.setItem("bdma_simulated_role", newRole);
                          } else {
                            localStorage.removeItem("bdma_simulated_role");
                          }
                          toast({
                            title: newRole ? `Viewing as ${roleLabels[newRole]}` : "Role simulation disabled",
                            description: newRole 
                              ? "Refresh the page to see changes in role-restricted areas." 
                              : "You are now viewing as your actual role.",
                          });
                        }}
                      >
                        <SelectTrigger className="w-[200px]" data-testid="select-simulated-role">
                          <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Simulation (Your Role)</SelectItem>
                          <SelectItem value="owner">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Owner
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="manager">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Manager
                            </div>
                          </SelectItem>
                          <SelectItem value="technician">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Technician
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Viewer
                            </div>
                          </SelectItem>
                          <SelectItem value="dev">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-4 w-4" />
                              Developer
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {simulatedRole && (
                        <Badge variant="outline" className="gap-1">
                          Simulating: {roleLabels[simulatedRole]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base font-medium">Session Info</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>User ID: {user?.id || "N/A"}</p>
                    <p>Email: {user?.email || "N/A"}</p>
                    <p>Actual Role: {members.find(m => m.userId === user?.id)?.role || "Unknown"}</p>
                    <p>Simulated Role: {simulatedRole ? roleLabels[simulatedRole] : "None"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TireReplacementSetting {
  id: number;
  orgId: number;
  position: string;
  minTreadDepth: string;
  warningTreadDepth: string;
  maxMiles: number | null;
  maxAge: number | null;
  isActive: boolean;
}

const positionLabels: Record<string, string> = {
  steer: "Steer Tires",
  drive: "Drive Tires",
  trailer: "Trailer Tires",
  all_position: "All Position",
  spare: "Spare Tires",
};

function InventorySettingsTab() {
  const { toast } = useToast();
  const [leadTimeDays, setLeadTimeDays] = useState("7");
  const [safetyStockDays, setSafetyStockDays] = useState("14");
  const [lookbackDays, setLookbackDays] = useState("90");
  const [lastResult, setLastResult] = useState<{ partsAnalyzed: number; partsWithUsage: number; partsUpdated: number } | null>(null);

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/parts/recalculate-minmax", {
        leadTimeDays: parseInt(leadTimeDays) || 7,
        safetyStockDays: parseInt(safetyStockDays) || 14,
        lookbackDays: parseInt(lookbackDays) || 90,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult({ partsAnalyzed: data.partsAnalyzed, partsWithUsage: data.partsWithUsage, partsUpdated: data.partsUpdated });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Min/Max Recalculated", description: `Updated ${data.partsUpdated} parts based on usage patterns.` });
    },
    onError: (error: Error) => {
      toast({ title: "Recalculation Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="grid gap-6">
      <Card data-testid="card-inventory-minmax">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Automatic Min/Max Calculation
          </CardTitle>
          <CardDescription>
            Recalculate reorder points and max quantities based on historical usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Lead Time (Days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="7"
                data-testid="input-lead-time"
              />
              <p className="text-xs text-muted-foreground">Average time to receive parts from supplier</p>
            </div>
            <div className="space-y-2">
              <Label>Safety Stock (Days)</Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={safetyStockDays}
                onChange={(e) => setSafetyStockDays(e.target.value)}
                placeholder="14"
                data-testid="input-safety-stock"
              />
              <p className="text-xs text-muted-foreground">Extra days of stock to keep as buffer</p>
            </div>
            <div className="space-y-2">
              <Label>Lookback Period (Days)</Label>
              <Input
                type="number"
                min="30"
                max="365"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(e.target.value)}
                placeholder="90"
                data-testid="input-lookback-days"
              />
              <p className="text-xs text-muted-foreground">How far back to analyze usage history</p>
            </div>
          </div>
          
          {lastResult && (
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{lastResult.partsAnalyzed}</div>
                  <div className="text-sm text-muted-foreground">Parts Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{lastResult.partsWithUsage}</div>
                  <div className="text-sm text-muted-foreground">With Usage Data</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{lastResult.partsUpdated}</div>
                  <div className="text-sm text-muted-foreground">Parts Updated</div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={() => recalculateMutation.mutate()} 
            disabled={recalculateMutation.isPending}
            className="w-full"
            data-testid="button-recalculate-minmax"
          >
            {recalculateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              "Recalculate Min/Max"
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground">
            This will analyze part usage from the last {lookbackDays} days and calculate optimal reorder points 
            and max quantities. The formula uses: Reorder Point = (Average Daily Usage × Lead Time Days) + 
            (Average Daily Usage × Safety Stock Days).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TireReplacementSettingsTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    position: "steer",
    minTreadDepth: "4.0",
    warningTreadDepth: "5.0",
    maxMiles: "",
    maxAge: "",
  });

  const { data: settings = [], isLoading } = useQuery<TireReplacementSetting[]>({
    queryKey: ["/api/tire-replacement-settings"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tire-replacement-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tire-replacement-settings"] });
      toast({ title: "Setting created", description: "Tire replacement setting has been added." });
      setShowAddForm(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create setting.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/tire-replacement-settings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tire-replacement-settings"] });
      toast({ title: "Setting updated", description: "Tire replacement setting has been updated." });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tire-replacement-settings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tire-replacement-settings"] });
      toast({ title: "Setting deleted", description: "Tire replacement setting has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete setting.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      position: "steer",
      minTreadDepth: "4.0",
      warningTreadDepth: "5.0",
      maxMiles: "",
      maxAge: "",
    });
  };

  const handleSubmit = () => {
    const data = {
      position: formData.position,
      minTreadDepth: formData.minTreadDepth,
      warningTreadDepth: formData.warningTreadDepth,
      maxMiles: formData.maxMiles ? parseInt(formData.maxMiles) : null,
      maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEdit = (setting: TireReplacementSetting) => {
    setEditingId(setting.id);
    setFormData({
      position: setting.position,
      minTreadDepth: setting.minTreadDepth,
      warningTreadDepth: setting.warningTreadDepth,
      maxMiles: setting.maxMiles?.toString() || "",
      maxAge: setting.maxAge?.toString() || "",
    });
    setShowAddForm(true);
  };

  const usedPositions = settings.map(s => s.position);
  const availablePositions = Object.keys(positionLabels).filter(p => !usedPositions.includes(p) || (editingId && settings.find(s => s.id === editingId)?.position === p));

  return (
    <div className="grid gap-6">
      <Card data-testid="card-tire-settings">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Tire Replacement Thresholds
            </CardTitle>
            <CardDescription>
              Configure minimum tread depth and other thresholds for tire replacement predictions by position
            </CardDescription>
          </div>
          {!showAddForm && availablePositions.length > 0 && (
            <Button onClick={() => setShowAddForm(true)} data-testid="button-add-tire-setting">
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddForm && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">{editingId ? "Edit" : "Add"} Tire Replacement Setting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tire Position</Label>
                    <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })} disabled={!!editingId}>
                      <SelectTrigger data-testid="select-tire-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePositions.map((pos) => (
                          <SelectItem key={pos} value={pos} data-testid={`select-item-${pos}`}>
                            {positionLabels[pos]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Tread Depth (32nds)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.minTreadDepth}
                      onChange={(e) => setFormData({ ...formData, minTreadDepth: e.target.value })}
                      data-testid="input-min-tread-depth"
                    />
                    <p className="text-xs text-muted-foreground">Tires below this depth require replacement</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Warning Tread Depth (32nds)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.warningTreadDepth}
                      onChange={(e) => setFormData({ ...formData, warningTreadDepth: e.target.value })}
                      data-testid="input-warning-tread-depth"
                    />
                    <p className="text-xs text-muted-foreground">Tires below this depth show a warning</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Miles (optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 80000"
                      value={formData.maxMiles}
                      onChange={(e) => setFormData({ ...formData, maxMiles: e.target.value })}
                      data-testid="input-max-miles"
                    />
                    <p className="text-xs text-muted-foreground">Maximum miles before replacement</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Age (months, optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 60"
                      value={formData.maxAge}
                      onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                      data-testid="input-max-age"
                    />
                    <p className="text-xs text-muted-foreground">Maximum age before replacement</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }} data-testid="button-cancel-tire-setting">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-tire-setting">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingId ? "Update" : "Create"} Setting
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tire replacement settings configured yet.</p>
              <p className="text-sm">Add settings to define replacement thresholds for each tire position.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg hover-elevate" data-testid={`tire-setting-${setting.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{positionLabels[setting.position] || setting.position}</Badge>
                      <span className="text-sm">
                        Min: <strong>{setting.minTreadDepth}/32"</strong>
                      </span>
                      <span className="text-sm text-muted-foreground">|</span>
                      <span className="text-sm">
                        Warning: <strong>{setting.warningTreadDepth}/32"</strong>
                      </span>
                      {setting.maxMiles && (
                        <>
                          <span className="text-sm text-muted-foreground">|</span>
                          <span className="text-sm">
                            Max: <strong>{setting.maxMiles.toLocaleString()}</strong> mi
                          </span>
                        </>
                      )}
                      {setting.maxAge && (
                        <>
                          <span className="text-sm text-muted-foreground">|</span>
                          <span className="text-sm">
                            Age: <strong>{setting.maxAge}</strong> mo
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(setting)} data-testid={`button-edit-tire-setting-${setting.id}`}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(setting.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-tire-setting-${setting.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
