import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, FileText, Calculator, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Estimate, Asset } from "@shared/schema";

interface EstimateWithAsset extends Estimate {
  assetName?: string;
  assetNumber?: string;
}

export default function Estimates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const { data: estimates, isLoading } = useQuery<EstimateWithAsset[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const createMutation = useMutation({
    mutationFn: async (assetId: number) => {
      return apiRequest("POST", "/api/estimates", {
        assetId,
        status: "draft",
      });
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      const data = await response.json();
      toast({
        title: "Estimate Created",
        description: `Estimate ${data.estimateNumber} has been created.`,
      });
      setShowCreateDialog(false);
      navigate(`/estimates/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create estimate.",
        variant: "destructive",
      });
    },
  });

  const filteredEstimates = (estimates || []).filter((est) => {
    const asset = assets?.find(a => a.id === est.assetId);
    const matchesSearch = 
      est.estimateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (asset?.assetNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (asset?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<EstimateWithAsset>[] = [
    {
      key: "estimateNumber",
      header: "Estimate #",
      cell: (est) => {
        const asset = assets?.find(a => a.id === est.assetId);
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{est.estimateNumber}</p>
              <p className="text-xs text-muted-foreground">
                {asset?.assetNumber || "No Asset"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "asset",
      header: "Asset",
      cell: (est) => {
        const asset = assets?.find(a => a.id === est.assetId);
        return (
          <div className="max-w-xs">
            <p className="truncate">{asset?.name || "-"}</p>
            <p className="text-xs text-muted-foreground capitalize">{asset?.type || ""}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (est) => <StatusBadge status={est.status} />,
    },
    {
      key: "grandTotal",
      header: "Total",
      cell: (est) => (
        <span className="font-medium">
          ${parseFloat(est.grandTotal || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (est) => (
        <span className="text-sm text-muted-foreground">
          {est.createdAt ? new Date(est.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  const handleCreateEstimate = () => {
    if (!selectedAssetId) return;
    createMutation.mutate(parseInt(selectedAssetId));
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Estimates"
        description="Create and manage maintenance estimates for assets"
        actions={
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-estimate">
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEstimates.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No estimates found"
          description={search || statusFilter !== "all" 
            ? "Try adjusting your filters" 
            : "Create your first estimate to get started"}
          action={{
            label: "Create Estimate",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredEstimates}
          isLoading={isLoading}
          onRowClick={(est) => navigate(`/estimates/${est.id}`)}
          getRowKey={(est) => est.id}
          emptyMessage="No estimates found"
        />
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Asset *</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger data-testid="select-asset">
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets?.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.assetNumber} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Estimates are tied to specific assets
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEstimate} 
              disabled={!selectedAssetId || createMutation.isPending}
              data-testid="button-confirm-create"
            >
              Create Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
