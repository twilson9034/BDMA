import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Truck, Filter, Gauge, Download, MapPin } from "lucide-react";
import { BatchMeterUpdate } from "@/components/BatchMeterUpdate";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { Asset, Location } from "@shared/schema";

interface AssetWithLocation extends Asset {
  locationName?: string;
}

const assetTypeIcons: Record<string, string> = {
  vehicle: "Truck",
  equipment: "Tool",
  facility: "Building",
  tool: "Wrench",
  other: "Box",
};

export default function Assets() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showBatchMeter, setShowBatchMeter] = useState(false);
  const { toast } = useToast();

  const { data: assets, isLoading } = useQuery<AssetWithLocation[]>({
    queryKey: ["/api/assets"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const mockAssets: AssetWithLocation[] = [
    {
      id: 1,
      orgId: 1,
      assetNumber: "TRK-1024",
      name: "Freightliner Cascadia",
      description: "Long haul semi truck",
      type: "vehicle",
      status: "operational",
      locationId: 1,
      locationName: "Main Depot",
      parentAssetId: null,
      manufacturer: "Freightliner",
      model: "Cascadia",
      serialNumber: "1FUJGHDV7KLJS1234",
      year: 2022,
      purchaseDate: new Date("2022-03-15"),
      purchasePrice: "125000.00",
      warrantyExpiration: new Date("2025-03-15"),
      meterType: "miles",
      currentMeterReading: "145230",
      lastMeterUpdate: new Date("2024-01-15"),
      imageUrl: null,
      notes: null,
      customFields: null,
      lifecycleStatus: "active",
      dispositionDate: null,
      dispositionReason: null,
      salvageValue: null,
      depreciationMethod: null,
      usefulLifeYears: null,
      residualValue: null,
      createdAt: new Date("2022-03-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      orgId: 1,
      assetNumber: "VAN-3012",
      name: "Ford Transit 350",
      description: "Cargo van for local deliveries",
      type: "vehicle",
      status: "in_maintenance",
      locationId: 1,
      locationName: "Main Depot",
      parentAssetId: null,
      manufacturer: "Ford",
      model: "Transit 350",
      serialNumber: "1FTBW2CM3GKA12345",
      year: 2021,
      purchaseDate: new Date("2021-06-20"),
      purchasePrice: "45000.00",
      warrantyExpiration: new Date("2024-06-20"),
      meterType: "miles",
      currentMeterReading: "78560",
      lastMeterUpdate: new Date("2024-01-14"),
      imageUrl: null,
      notes: null,
      customFields: null,
      lifecycleStatus: "active",
      dispositionDate: null,
      dispositionReason: null,
      salvageValue: null,
      depreciationMethod: null,
      usefulLifeYears: null,
      residualValue: null,
      createdAt: new Date("2021-06-20"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      orgId: 1,
      assetNumber: "BUS-5001",
      name: "Blue Bird Vision",
      description: "School bus",
      type: "vehicle",
      status: "operational",
      locationId: 2,
      locationName: "East Yard",
      parentAssetId: null,
      manufacturer: "Blue Bird",
      model: "Vision",
      serialNumber: "1BABNBPA7JF123456",
      year: 2023,
      purchaseDate: new Date("2023-01-10"),
      purchasePrice: "95000.00",
      warrantyExpiration: new Date("2026-01-10"),
      meterType: "miles",
      currentMeterReading: "23450",
      lastMeterUpdate: new Date("2024-01-15"),
      imageUrl: null,
      notes: null,
      customFields: null,
      lifecycleStatus: "active",
      dispositionDate: null,
      dispositionReason: null,
      salvageValue: null,
      depreciationMethod: null,
      usefulLifeYears: null,
      residualValue: null,
      createdAt: new Date("2023-01-10"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 4,
      orgId: 1,
      assetNumber: "LIFT-001",
      name: "Caterpillar GP25N",
      description: "Forklift for warehouse operations",
      type: "equipment",
      status: "operational",
      locationId: 1,
      locationName: "Main Depot",
      parentAssetId: null,
      manufacturer: "Caterpillar",
      model: "GP25N",
      serialNumber: "AT9C50123",
      year: 2020,
      purchaseDate: new Date("2020-08-15"),
      purchasePrice: "32000.00",
      warrantyExpiration: new Date("2023-08-15"),
      meterType: "hours",
      currentMeterReading: "3250",
      lastMeterUpdate: new Date("2024-01-15"),
      imageUrl: null,
      notes: null,
      customFields: null,
      lifecycleStatus: "active",
      dispositionDate: null,
      dispositionReason: null,
      salvageValue: null,
      depreciationMethod: null,
      usefulLifeYears: null,
      residualValue: null,
      createdAt: new Date("2020-08-15"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayAssets = assets?.length ? assets : mockAssets;

  const filteredAssets = displayAssets.filter((asset) => {
    const matchesSearch =
      asset.assetNumber.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.manufacturer?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
    const matchesType = typeFilter === "all" || asset.type === typeFilter;
    const matchesLifecycle = lifecycleFilter === "all" || asset.lifecycleStatus === lifecycleFilter;
    const matchesLocation = locationFilter === "all" || 
      (locationFilter === "unassigned" ? !asset.locationId : asset.locationId?.toString() === locationFilter);
    return matchesSearch && matchesStatus && matchesType && matchesLifecycle && matchesLocation;
  });

  const handleExportCSV = () => {
    const headers = [
      "Asset Number",
      "Name",
      "Description",
      "Type",
      "Status",
      "Lifecycle Status",
      "Location",
      "Manufacturer",
      "Model",
      "Serial Number",
      "Year",
      "Purchase Date",
      "Purchase Price",
      "Salvage Value",
      "Replacement Cost",
      "Meter Type",
      "Current Meter",
      "Last Meter Update",
    ];

    const rows = filteredAssets.map((asset) => {
      const purchasePrice = parseFloat(asset.purchasePrice || "0");
      const salvageValue = parseFloat(asset.salvageValue || "0");
      const replacementCost = Math.max(0, purchasePrice - salvageValue);
      return [
        asset.assetNumber,
        asset.name,
        asset.description || "",
        asset.type || "",
        asset.status || "",
        asset.lifecycleStatus || "active",
        asset.locationName || "",
        asset.manufacturer || "",
        asset.model || "",
        asset.serialNumber || "",
        asset.year?.toString() || "",
        asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "",
        asset.purchasePrice || "0",
        asset.salvageValue || "",
        replacementCost.toFixed(2),
        asset.meterType || "",
        asset.currentMeterReading || "",
        asset.lastMeterUpdate ? new Date(asset.lastMeterUpdate).toLocaleDateString() : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assets_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredAssets.length} assets to CSV`,
    });
  };

  const columns: Column<AssetWithLocation>[] = [
    {
      key: "assetNumber",
      header: "Asset",
      cell: (asset) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium" data-testid={`text-asset-number-${asset.id}`}>{asset.assetNumber}</p>
            <p className="text-xs text-muted-foreground" data-testid={`text-asset-name-${asset.id}`}>{asset.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (asset) => (
        <Badge variant="outline" className="capitalize" data-testid={`badge-asset-type-${asset.id}`}>
          {asset.type}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (asset) => <StatusBadge status={asset.status} />,
    },
    {
      key: "lifecycleStatus",
      header: "Lifecycle",
      cell: (asset) => {
        const lifecycle = asset.lifecycleStatus || "active";
        const lifecycleVariant = lifecycle === "active" ? "default" : 
          lifecycle === "disposed" || lifecycle === "scrapped" ? "destructive" : "secondary";
        return (
          <Badge variant={lifecycleVariant} className="capitalize" data-testid={`badge-lifecycle-${asset.id}`}>
            {lifecycle}
          </Badge>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      cell: (asset) => (
        <span className="text-sm" data-testid={`text-asset-location-${asset.id}`}>{asset.locationName || "-"}</span>
      ),
    },
    {
      key: "replacementCost",
      header: "Replacement Cost",
      cell: (asset) => {
        const purchasePrice = parseFloat(asset.purchasePrice || "0");
        const salvageValue = parseFloat(asset.salvageValue || "0");
        const replacementCost = Math.max(0, purchasePrice - salvageValue);
        return (
          <span className="text-sm font-medium" data-testid={`text-replacement-cost-${asset.id}`}>
            {replacementCost > 0 ? `$${replacementCost.toLocaleString()}` : "-"}
          </span>
        );
      },
    },
    {
      key: "meterReading",
      header: "Meter",
      cell: (asset) => (
        <div className="text-sm" data-testid={`text-asset-meter-${asset.id}`}>
          {asset.currentMeterReading ? (
            <>
              <span className="font-medium">{Number(asset.currentMeterReading).toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">{asset.meterType}</span>
            </>
          ) : (
            "-"
          )}
        </div>
      ),
    },
    {
      key: "manufacturer",
      header: "Make/Model",
      cell: (asset) => (
        <div className="text-sm" data-testid={`text-asset-makemodel-${asset.id}`}>
          <p>{asset.manufacturer || "-"}</p>
          <p className="text-muted-foreground">{asset.model || ""}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Assets"
        description="Manage your fleet vehicles, equipment, and facilities"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setShowBatchMeter(true)} data-testid="button-batch-meter">
              <Gauge className="h-4 w-4 mr-2" />
              Batch Meters
            </Button>
            <Button asChild data-testid="button-new-asset">
              <Link href="/assets/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{displayAssets.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Operational</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {displayAssets.filter((a) => a.status === "operational").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {displayAssets.filter((a) => a.status === "in_maintenance").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Down</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {displayAssets.filter((a) => a.status === "down").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="in_maintenance">In Maintenance</SelectItem>
              <SelectItem value="down">Down</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vehicle">Vehicle</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="facility">Facility</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-lifecycle">
              <SelectValue placeholder="Lifecycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lifecycle</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
              <SelectItem value="scrapped">Scrapped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-location">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAssets.length === 0 && !isLoading ? (
        <EmptyState
          icon={Truck}
          title="No assets found"
          description={search || statusFilter !== "all" || typeFilter !== "all"
            ? "Try adjusting your filters"
            : "Add your first asset to get started"}
          action={{
            label: "Add Asset",
            onClick: () => navigate("/assets/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAssets}
          isLoading={isLoading}
          onRowClick={(asset) => navigate(`/assets/${asset.id}`)}
          getRowKey={(asset) => asset.id}
          emptyMessage="No assets found"
        />
      )}

      <BatchMeterUpdate isOpen={showBatchMeter} onClose={() => setShowBatchMeter(false)} />
    </div>
  );
}
