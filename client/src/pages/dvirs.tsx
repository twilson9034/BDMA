import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, ClipboardList, CheckCircle2, AlertTriangle, XCircle, MapPin } from "lucide-react";
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
import type { Dvir, Location } from "@shared/schema";

interface DvirWithAsset extends Dvir {
  assetName?: string;
  assetNumber?: string;
  defectCount?: number;
}

interface DvirWithLocation extends DvirWithAsset {
  assetLocationId?: number | null;
}

export default function DVIRs() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: dvirs, isLoading } = useQuery<DvirWithLocation[]>({
    queryKey: ["/api/dvirs"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const mockDvirs: DvirWithAsset[] = [
    {
      id: 1,
      orgId: 1,
      assetId: 1,
      assetName: "Freightliner Cascadia",
      assetNumber: "TRK-1024",
      inspectorId: "user1",
      inspectorName: "John Doe",
      inspectionDate: new Date("2024-01-15T08:00:00"),
      status: "safe",
      meterReading: "145230",
      preTrip: true,
      notes: "All systems check out",
      signature: "John Doe",
      isPublicSubmission: false,
      defectCount: 0,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      orgId: 1,
      assetId: 2,
      assetName: "Ford Transit 350",
      assetNumber: "VAN-3012",
      inspectorId: "user2",
      inspectorName: "Jane Smith",
      inspectionDate: new Date("2024-01-15T07:30:00"),
      status: "defects_noted",
      meterReading: "78560",
      preTrip: true,
      notes: "Brake warning light on",
      signature: "Jane Smith",
      isPublicSubmission: false,
      defectCount: 2,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 3,
      orgId: 1,
      assetId: 3,
      assetName: "Blue Bird Vision",
      assetNumber: "BUS-5001",
      inspectorId: "user3",
      inspectorName: "Mike Johnson",
      inspectionDate: new Date("2024-01-14T16:00:00"),
      status: "safe",
      meterReading: "23450",
      preTrip: false,
      notes: "Post-trip inspection complete",
      signature: "Mike Johnson",
      isPublicSubmission: false,
      defectCount: 0,
      createdAt: new Date("2024-01-14"),
    },
    {
      id: 4,
      orgId: 1,
      assetId: 4,
      assetName: "Caterpillar GP25N",
      assetNumber: "LIFT-001",
      inspectorId: "user1",
      inspectorName: "John Doe",
      inspectionDate: new Date("2024-01-14T08:00:00"),
      status: "unsafe",
      meterReading: "3250",
      preTrip: true,
      notes: "Hydraulic leak detected - DO NOT OPERATE",
      signature: "John Doe",
      isPublicSubmission: false,
      defectCount: 1,
      createdAt: new Date("2024-01-14"),
    },
  ];

  const displayDvirs = dvirs?.length ? dvirs : mockDvirs;

  const filteredDvirs = displayDvirs.filter((dvir) => {
    const matchesSearch = dvir.assetName?.toLowerCase().includes(search.toLowerCase()) ||
      dvir.assetNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || dvir.status === statusFilter;
    const matchesLocation = locationFilter === "all" || 
      (locationFilter === "unassigned" ? !(dvir as DvirWithLocation).assetLocationId : 
        (dvir as DvirWithLocation).assetLocationId?.toString() === locationFilter);
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const safeCount = displayDvirs.filter((d) => d.status === "safe").length;
  const defectsCount = displayDvirs.filter((d) => d.status === "defects_noted").length;
  const unsafeCount = displayDvirs.filter((d) => d.status === "unsafe").length;

  const columns: Column<DvirWithAsset>[] = [
    {
      key: "asset",
      header: "Asset",
      cell: (dvir) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{dvir.assetNumber}</p>
            <p className="text-xs text-muted-foreground">{dvir.assetName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Inspection Date",
      cell: (dvir) => (
        <div className="text-sm">
          <p>{new Date(dvir.inspectionDate).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(dvir.inspectionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (dvir) => (
        <span className="text-sm">{dvir.preTrip ? "Pre-Trip" : "Post-Trip"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (dvir) => <StatusBadge status={dvir.status} />,
    },
    {
      key: "defects",
      header: "Defects",
      cell: (dvir) => (
        <span className={`text-sm font-medium ${dvir.defectCount ? "text-red-500" : "text-green-500"}`}>
          {dvir.defectCount || 0}
        </span>
      ),
    },
    {
      key: "meterReading",
      header: "Meter",
      cell: (dvir) => (
        <span className="text-sm">
          {dvir.meterReading ? Number(dvir.meterReading).toLocaleString() : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="DVIRs"
        description="Driver Vehicle Inspection Reports"
        actions={
          <Button asChild data-testid="button-new-dvir">
            <Link href="/dvirs/new">
              <Plus className="h-4 w-4 mr-2" />
              New DVIR
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Safe</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{safeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Defects Noted</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{defectsCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsafe</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{unsafeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="defects_noted">Defects Noted</SelectItem>
              <SelectItem value="unsafe">Unsafe</SelectItem>
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

      {filteredDvirs.length === 0 && !isLoading ? (
        <EmptyState
          icon={ClipboardList}
          title="No DVIRs found"
          description="Start a new driver vehicle inspection"
          action={{
            label: "New DVIR",
            onClick: () => navigate("/dvirs/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDvirs}
          isLoading={isLoading}
          onRowClick={(dvir) => navigate(`/dvirs/${dvir.id}`)}
          getRowKey={(dvir) => dvir.id}
          emptyMessage="No DVIRs found"
          rowClassName={(dvir) =>
            dvir.status === "unsafe" ? "bg-red-500/5" : dvir.status === "defects_noted" ? "bg-yellow-500/5" : ""
          }
        />
      )}
    </div>
  );
}
