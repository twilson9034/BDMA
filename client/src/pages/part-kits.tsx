import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Package, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PartKit } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  pm: "PM Service",
  repair: "Repair",
  inspection: "Inspection",
  seasonal: "Seasonal",
  other: "Other",
};

export default function PartKits() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKit, setNewKit] = useState({
    name: "",
    description: "",
    category: "pm" as string,
  });

  const { data: kits, isLoading } = useQuery<PartKit[]>({
    queryKey: ["/api/part-kits"],
  });

  const createKitMutation = useMutation({
    mutationFn: async (data: typeof newKit) => {
      const response = await apiRequest("POST", "/api/part-kits", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Part kit created" });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits"] });
      setCreateDialogOpen(false);
      setNewKit({ name: "", description: "", category: "pm" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create kit", variant: "destructive" });
    },
  });

  const deleteKitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/part-kits/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Part kit deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits"] });
    },
  });

  const filteredKits = (kits || []).filter((kit) => {
    const matchesSearch = !search || 
      kit.name.toLowerCase().includes(search.toLowerCase()) ||
      kit.kitNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || kit.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const columns: Column<PartKit>[] = [
    {
      key: "kitNumber",
      header: "Kit Number",
      cell: (kit) => (
        <Link href={`/part-kits/${kit.id}`}>
          <span className="text-primary hover:underline font-medium" data-testid={`link-kit-${kit.id}`}>
            {kit.kitNumber}
          </span>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (kit) => kit.name,
    },
    {
      key: "category",
      header: "Category",
      cell: (kit) => (
        <Badge variant="secondary" data-testid={`badge-category-${kit.id}`}>
          {categoryLabels[kit.category] || kit.category}
        </Badge>
      ),
    },
    {
      key: "totalCost",
      header: "Total Cost",
      cell: (kit) => (
        <span data-testid={`text-cost-${kit.id}`}>${Number(kit.totalCost || 0).toFixed(2)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (kit) => (
        <Badge variant={kit.isActive ? "default" : "secondary"} data-testid={`badge-status-${kit.id}`}>
          {kit.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (kit) => (
        <div className="flex gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => navigate(`/part-kits/${kit.id}`)}
            data-testid={`button-view-kit-${kit.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => deleteKitMutation.mutate(kit.id)}
            data-testid={`button-delete-kit-${kit.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: kits?.length || 0,
    active: kits?.filter(k => k.isActive).length || 0,
    pmKits: kits?.filter(k => k.category === "pm").length || 0,
    totalValue: kits?.reduce((sum, k) => sum + Number(k.totalCost || 0), 0) || 0,
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Part Kits"
        description="Manage bundled part sets for maintenance tasks"
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-kit">
                <Plus className="mr-2 h-4 w-4" />
                Create Kit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Part Kit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Kit Name</Label>
                  <Input
                    id="name"
                    value={newKit.name}
                    onChange={(e) => setNewKit({ ...newKit, name: e.target.value })}
                    placeholder="e.g., A Service Kit"
                    data-testid="input-kit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newKit.category}
                    onValueChange={(v) => setNewKit({ ...newKit, category: v })}
                  >
                    <SelectTrigger data-testid="select-kit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pm">PM Service</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newKit.description}
                    onChange={(e) => setNewKit({ ...newKit, description: e.target.value })}
                    placeholder="Optional description..."
                    data-testid="input-kit-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createKitMutation.mutate(newKit)}
                  disabled={!newKit.name || createKitMutation.isPending}
                  data-testid="button-submit-kit"
                >
                  {createKitMutation.isPending ? "Creating..." : "Create Kit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Kits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">PM Kits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pmKits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4 pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search kits..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-kits"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="pm">PM Service</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="seasonal">Seasonal</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading kits...</div>
        ) : filteredKits.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Part Kits Found"
            description={search || categoryFilter !== "all" 
              ? "Try adjusting your filters" 
              : "Create your first part kit to bundle parts for maintenance tasks"}
            action={
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-empty-create-kit">
                <Plus className="mr-2 h-4 w-4" />
                Create Kit
              </Button>
            }
          />
        ) : (
          <DataTable
            data={filteredKits}
            columns={columns}
            onRowClick={(kit) => navigate(`/part-kits/${kit.id}`)}
            getRowKey={(kit) => kit.id}
          />
        )}
      </div>
    </div>
  );
}
