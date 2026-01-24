import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Check, ChevronDown, Plus, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OrgMembership {
  id: number;
  orgId: number;
  userId: string;
  role: string;
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
  organization: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    status: string | null;
    maxAssets: number | null;
  };
}

export function OrganizationSwitcher() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrgMembership[]>({
    queryKey: ["/api/organizations"],
  });

  const { data: currentTenant, isLoading: currentLoading } = useQuery<CurrentTenant>({
    queryKey: ["/api/organizations/current"],
  });

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

  return (
    <>
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
          {organizations.map((membership) => (
            <DropdownMenuItem
              key={membership.orgId}
              onClick={() => {
                if (membership.orgId !== currentTenant?.orgId) {
                  switchOrgMutation.mutate(membership.orgId);
                }
              }}
              className="cursor-pointer"
              data-testid={`org-option-${membership.orgId}`}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">{membership.organization.name}</span>
              {membership.orgId === currentTenant?.orgId && (
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
