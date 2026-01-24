import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Circle, AlertTriangle, CheckCircle, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import type { Tire } from "@shared/schema";

interface TireWithAsset extends Tire {
  assetName?: string;
}

function ConditionBadge({ condition }: { condition: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    new: { className: "bg-green-500/10 text-green-600 border-green-500/20", icon: <CheckCircle className="h-3 w-3" /> },
    good: { className: "bg-green-500/10 text-green-600 border-green-500/20", icon: <CheckCircle className="h-3 w-3" /> },
    fair: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <AlertTriangle className="h-3 w-3" /> },
    worn: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <AlertTriangle className="h-3 w-3" /> },
    critical: { className: "bg-red-500/10 text-red-600 border-red-500/20", icon: <XCircle className="h-3 w-3" /> },
    failed: { className: "bg-red-500/10 text-red-600 border-red-500/20", icon: <XCircle className="h-3 w-3" /> },
  };
  
  const variant = variants[condition] || variants.fair;
  
  return (
    <Badge variant="outline" className={`gap-1 ${variant.className}`}>
      {variant.icon}
      {condition}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    in_inventory: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    installed: "bg-green-500/10 text-green-600 border-green-500/20",
    removed: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    disposed: "bg-muted text-muted-foreground border-muted",
    sold: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function Tires() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  const { data: tires, isLoading } = useQuery<TireWithAsset[]>({
    queryKey: ["/api/tires"],
  });

  const filteredTires = tires?.filter((tire) => {
    const matchesSearch =
      tire.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      tire.brand?.toLowerCase().includes(search.toLowerCase()) ||
      tire.model?.toLowerCase().includes(search.toLowerCase()) ||
      tire.size?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || tire.status === statusFilter;
    const matchesCondition = conditionFilter === "all" || tire.condition === conditionFilter;
    return matchesSearch && matchesStatus && matchesCondition;
  });

  const stats = {
    total: tires?.length || 0,
    installed: tires?.filter(t => t.status === "installed").length || 0,
    inInventory: tires?.filter(t => t.status === "in_inventory").length || 0,
    critical: tires?.filter(t => t.condition === "critical" || t.condition === "failed").length || 0,
  };

  const columns: Column<TireWithAsset>[] = [
    {
      header: "Serial Number",
      accessor: (tire) => (
        <span className="font-medium" data-testid={`text-tire-serial-${tire.id}`}>
          {tire.serialNumber}
        </span>
      ),
    },
    {
      header: "Brand / Model",
      accessor: (tire) => (
        <div data-testid={`text-tire-brand-${tire.id}`}>
          <span className="font-medium">{tire.brand || "Unknown"}</span>
          {tire.model && <span className="text-muted-foreground ml-1">/ {tire.model}</span>}
        </div>
      ),
    },
    {
      header: "Size",
      accessor: (tire) => <span data-testid={`text-tire-size-${tire.id}`}>{tire.size || "-"}</span>,
    },
    {
      header: "Status",
      accessor: (tire) => <span data-testid={`badge-tire-status-${tire.id}`}><StatusBadge status={tire.status || "unknown"} /></span>,
    },
    {
      header: "Condition",
      accessor: (tire) => <span data-testid={`badge-tire-condition-${tire.id}`}><ConditionBadge condition={tire.condition || "unknown"} /></span>,
    },
    {
      header: "Tread Depth",
      accessor: (tire) => (
        <span className={Number(tire.treadDepth || 0) < 4 ? "text-red-600 font-medium" : ""} data-testid={`text-tire-tread-${tire.id}`}>
          {tire.treadDepth ? `${tire.treadDepth}/32"` : "N/A"}
        </span>
      ),
    },
    {
      header: "Position",
      accessor: (tire) => <span data-testid={`text-tire-position-${tire.id}`}>{tire.position || "-"}</span>,
    },
    {
      header: "Asset",
      accessor: (tire) => <span data-testid={`text-tire-asset-${tire.id}`}>{tire.assetName || (tire.assetId ? `Asset #${tire.assetId}` : "In Inventory")}</span>,
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Tire Management"
        description="Track and manage your tire inventory and installations"
        actions={
          <Button onClick={() => navigate("/tires/new")} data-testid="button-new-tire">
            <Plus className="h-4 w-4 mr-2" />
            Add Tire
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                <p className="text-sm text-muted-foreground" data-testid="label-stat-total">Total Tires</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-installed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-installed">{stats.installed}</p>
                <p className="text-sm text-muted-foreground" data-testid="label-stat-installed">Installed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-inventory">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-inventory">{stats.inInventory}</p>
                <p className="text-sm text-muted-foreground" data-testid="label-stat-inventory">In Inventory</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-critical">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600" data-testid="text-stat-critical">{stats.critical}</p>
                <p className="text-sm text-muted-foreground" data-testid="label-stat-critical">Critical Condition</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial number, brand, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-tires"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
            <SelectItem value="in_inventory" data-testid="option-status-inventory">In Inventory</SelectItem>
            <SelectItem value="installed" data-testid="option-status-installed">Installed</SelectItem>
            <SelectItem value="removed" data-testid="option-status-removed">Removed</SelectItem>
            <SelectItem value="disposed" data-testid="option-status-disposed">Disposed</SelectItem>
            <SelectItem value="sold" data-testid="option-status-sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-condition-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-condition-all">All Conditions</SelectItem>
            <SelectItem value="new" data-testid="option-condition-new">New</SelectItem>
            <SelectItem value="good" data-testid="option-condition-good">Good</SelectItem>
            <SelectItem value="fair" data-testid="option-condition-fair">Fair</SelectItem>
            <SelectItem value="worn" data-testid="option-condition-worn">Worn</SelectItem>
            <SelectItem value="critical" data-testid="option-condition-critical">Critical</SelectItem>
            <SelectItem value="failed" data-testid="option-condition-failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" data-testid={`skeleton-row-${i}`} />
          ))}
        </div>
      ) : !filteredTires || filteredTires.length === 0 ? (
        <div data-testid="empty-state-tires">
          <EmptyState
            icon={Circle}
            title="No tires found"
            description={search || statusFilter !== "all" || conditionFilter !== "all" 
              ? "Try adjusting your filters" 
              : "Add your first tire to get started"}
            action={{
              label: "Add Tire",
              onClick: () => navigate("/tires/new"),
            }}
          />
        </div>
      ) : (
        <DataTable
          data={filteredTires}
          columns={columns}
          keyExtractor={(tire) => tire.id.toString()}
        />
      )}
    </div>
  );
}
