import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Check, ChevronDown, Plus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OrgMembership {
  id: number;
  orgId: number;
  userId: string;
  role: string;
  isCorporateAdmin?: boolean;
  organization: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    status: string | null;
    maxAssets: number | null;
  };
}

interface CurrentTenant {
  orgId: number;
  userId: string;
  role: string;
  isCorporateAdmin?: boolean;
  organization: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    status: string | null;
    maxAssets: number | null;
  };
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  maxAssets: number | null;
}

export function OrganizationSwitcher() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memberships = [], isLoading: orgsLoading } = useQuery<OrgMembership[]>({
    queryKey: ["/api/organizations"],
  });

  const { data: currentTenant, isLoading: currentLoading } = useQuery<CurrentTenant>({
    queryKey: ["/api/organizations/current"],
  });

  // Check if user has dev role in any org (can view all organizations)
  const isDev = memberships.some(m => m.role === "dev");

  // Fetch all organizations if user is a dev
  const { data: allOrganizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations/all"],
    enabled: isDev,
  });

  // Combine: if dev, use all orgs; otherwise use memberships
  const displayOrganizations = useMemo(() => {
    if (isDev && allOrganizations.length > 0) {
      return allOrganizations.map(org => ({
        orgId: org.id,
        organization: org,
        isMember: memberships.some(m => m.orgId === org.id),
      }));
    }
    return memberships.map(m => ({
      orgId: m.orgId,
      organization: m.organization,
      isMember: true,
    }));
  }, [isDev, allOrganizations, memberships]);

  const switchOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      return apiRequest("POST", `/api/organizations/switch/${orgId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to switch organization",
        variant: "destructive",
      });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      return apiRequest("POST", "/api/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowCreateDialog(false);
      setNewOrgName("");
      setNewOrgSlug("");
      toast({
        title: "Organization created",
        description: "Your new organization has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both name and slug",
        variant: "destructive",
      });
      return;
    }
    createOrgMutation.mutate({ name: newOrgName, slug: newOrgSlug });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  if (orgsLoading || currentLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // Show org switcher if:
  // - User has multiple org memberships, OR
  // - User is a corporate admin, OR  
  // - User has dev role (can view all orgs)
  const hasMultipleOrgs = memberships.length > 1;
  const isCorporateAdmin = currentTenant?.isCorporateAdmin || memberships.some(m => m.isCorporateAdmin);
  
  if (!hasMultipleOrgs && !isCorporateAdmin && !isDev) {
    return null;
  }

  // Use searchable UI when there are more than 10 organizations
  const useSearchableUI = displayOrganizations.length > 10;

  // Handler for switching organizations (works for both member and non-member orgs for owners)
  const handleOrgSwitch = (orgId: number) => {
    if (orgId !== currentTenant?.orgId) {
      switchOrgMutation.mutate(orgId);
    }
    setSearchOpen(false);
  };

  return (
    <>
      {useSearchableUI ? (
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="org-switcher-trigger">
              <Building2 className="h-4 w-4" />
              <span className="truncate max-w-[150px]">
                {currentTenant?.organization?.name || "Select Organization"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search organizations..." data-testid="org-search-input" />
              <CommandList>
                <CommandEmpty>No organization found.</CommandEmpty>
                <CommandGroup heading="Organizations">
                  {displayOrganizations.map((item) => (
                    <CommandItem
                      key={item.orgId}
                      value={item.organization.name}
                      onSelect={() => handleOrgSwitch(item.orgId)}
                      className="cursor-pointer"
                      data-testid={`org-option-${item.orgId}`}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span className="flex-1 truncate">{item.organization.name}</span>
                      {!item.isMember && (
                        <span className="text-xs text-muted-foreground ml-1">(view only)</span>
                      )}
                      {item.orgId === currentTenant?.orgId && (
                        <Check className="ml-2 h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setShowCreateDialog(true);
                      setSearchOpen(false);
                    }}
                    className="cursor-pointer"
                    data-testid="create-org-button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="org-switcher-trigger">
              <Building2 className="h-4 w-4" />
              <span className="truncate max-w-[150px]">
                {currentTenant?.organization?.name || "Select Organization"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {displayOrganizations.map((item) => (
              <DropdownMenuItem
                key={item.orgId}
                onClick={() => handleOrgSwitch(item.orgId)}
                className="cursor-pointer"
                data-testid={`org-option-${item.orgId}`}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span className="flex-1 truncate">{item.organization.name}</span>
                {!item.isMember && (
                  <span className="text-xs text-muted-foreground ml-1">(view only)</span>
                )}
                {item.orgId === currentTenant?.orgId && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowCreateDialog(true)}
              className="cursor-pointer"
              data-testid="create-org-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage a separate fleet or business unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value);
                  setNewOrgSlug(generateSlug(e.target.value));
                }}
                placeholder="My Company Fleet"
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Organization Slug</Label>
              <Input
                id="org-slug"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                placeholder="my-company-fleet"
                data-testid="input-org-slug"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and must be unique
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={createOrgMutation.isPending}
              data-testid="confirm-create-org"
            >
              {createOrgMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
