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
  MapPin
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

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["/api/organizations/current"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations/current/members"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
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
          <TabsTrigger value="customization" className="gap-2" data-testid="tab-customization">
            <Settings2 className="h-4 w-4" />
            Customization
          </TabsTrigger>
          <TabsTrigger value="tire-settings" className="gap-2" data-testid="tab-tire-settings">
            <Settings2 className="h-4 w-4" />
            Tire Settings
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

        <TabsContent value="customization">
          <div className="grid gap-6">
            {/* VMRS Codes Management */}
            <Card data-testid="card-vmrs-codes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  VMRS Codes
                </CardTitle>
                <CardDescription>
                  Manage Vehicle Maintenance Reporting Standards codes for categorization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { code: "001", description: "Engine Systems" },
                    { code: "002", description: "Electrical Systems" },
                    { code: "003", description: "Frame/Chassis" },
                    { code: "004", description: "Suspension" },
                    { code: "005", description: "Brake Systems" },
                    { code: "006", description: "Wheels/Tires" },
                  ].map((vmrs) => (
                    <div key={vmrs.code} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`vmrs-${vmrs.code}`}>
                      <div>
                        <Badge variant="outline" className="font-mono">{vmrs.code}</Badge>
                        <span className="ml-2 text-sm">{vmrs.description}</span>
                      </div>
                      <Button variant="ghost" size="icon" data-testid={`button-edit-vmrs-${vmrs.code}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" data-testid="button-add-vmrs">
                  <Plus className="h-4 w-4 mr-2" />
                  Add VMRS Code
                </Button>
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
                        <Button variant="ghost" size="icon" data-testid={`button-delete-field-${index}`}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" className="w-full" data-testid="button-add-custom-field">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Field
                </Button>
              </CardContent>
            </Card>

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
                          <Button variant="ghost" size="icon" className="h-6 w-6">
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
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
    mutationFn: (data: any) => apiRequest("/api/tire-replacement-settings", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
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
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/tire-replacement-settings/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
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
    mutationFn: (id: number) => apiRequest(`/api/tire-replacement-settings/${id}`, { method: "DELETE" }),
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
