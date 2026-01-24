import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Wrench, X, Check, CheckSquare, Download, ArrowUpDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PriorityBadge } from "@/components/PriorityBadge";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkOrder } from "@shared/schema";

interface WorkOrderWithAsset extends WorkOrder {
  assetName?: string;
  locationName?: string;
}

type SortField = "workOrderNumber" | "title" | "status" | "priority" | "dueDate" | "createdAt";
type SortDirection = "asc" | "desc";

const priorityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export default function WorkOrders() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { toast } = useToast();

  const { data: workOrders, isLoading } = useQuery<WorkOrderWithAsset[]>({
    queryKey: ["/api/work-orders"],
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async (data: { ids: number[]; updates: Record<string, any> }) => {
      return apiRequest("POST", "/api/work-orders/batch-update", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Work Orders Updated",
        description: `${variables.ids.length} work order(s) have been updated.`,
      });
      setSelectedIds(new Set());
      setBulkStatus("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update work orders.",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(displayData.map(wo => wo.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStatusChange = () => {
    if (bulkStatus && selectedIds.size > 0) {
      batchUpdateMutation.mutate({
        ids: Array.from(selectedIds),
        updates: { status: bulkStatus },
      });
    }
  };

  const filteredWorkOrders = (workOrders || []).filter((wo) => {
    const matchesSearch = 
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortWorkOrders = (data: WorkOrderWithAsset[]) => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;
      
      if (sortField === "dueDate" || sortField === "createdAt") {
        const aTime = new Date(aVal as Date).getTime();
        const bTime = new Date(bVal as Date).getTime();
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }
      
      if (sortField === "priority") {
        const aRank = priorityRank[aVal as string] || 0;
        const bRank = priorityRank[bVal as string] || 0;
        return sortDirection === "asc" ? aRank - bRank : bRank - aRank;
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
  };

  const sortedWorkOrders = useMemo(() => sortWorkOrders(filteredWorkOrders), [filteredWorkOrders, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const exportToExcel = () => {
    const headers = ["WO Number", "Title", "Type", "Status", "Priority", "Asset", "Due Date", "Created", "Safety Notes"];
    const rows = displayData.map(wo => [
      wo.workOrderNumber,
      wo.title,
      wo.type,
      wo.status,
      wo.priority,
      wo.assetName || "",
      wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "",
      wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "",
      wo.safetyNotes || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `work-orders-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({
      title: "Export Complete",
      description: `Exported ${displayData.length} work orders to CSV.`,
    });
  };

  const columns: Column<WorkOrderWithAsset>[] = [
    {
      key: "select",
      header: () => (
        <Checkbox
          checked={displayData.length > 0 && selectedIds.size === displayData.length}
          onCheckedChange={handleSelectAll}
          data-testid="checkbox-select-all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: (wo) => (
        <Checkbox
          checked={selectedIds.has(wo.id)}
          onCheckedChange={(checked) => handleSelectOne(wo.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-select-${wo.id}`}
        />
      ),
    },
    {
      key: "workOrderNumber",
      header: "WO Number",
      cell: (wo) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{wo.workOrderNumber}</p>
            <p className="text-xs text-muted-foreground">{wo.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (wo) => (
        <div className="max-w-xs">
          <p className="truncate">{wo.title}</p>
          {wo.assetName && (
            <p className="text-xs text-muted-foreground truncate">{wo.assetName}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (wo) => <PriorityBadge priority={wo.priority} />,
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (wo) => (
        <span className="text-sm">
          {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (wo) => (
        <span className="text-sm text-muted-foreground">
          {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  const mockWorkOrders: WorkOrderWithAsset[] = [
    {
      id: 1,
      orgId: null,
      workOrderNumber: "WO-2024-0042",
      title: "Engine oil change and filter replacement",
      type: "preventive",
      status: "in_progress",
      priority: "medium",
      assetId: 1,
      assetName: "Truck #1024",
      locationId: null,
      description: null,
      assignedToId: null,
      requestedById: null,
      dueDate: new Date("2024-01-20"),
      startDate: new Date("2024-01-15"),
      completedDate: null,
      estimatedHours: "2.00",
      actualHours: null,
      estimatedCost: "150.00",
      actualCost: null,
      meterReading: null,
      pmScheduleId: null,
      failureCode: null,
      rootCause: null,
      resolution: null,
      notes: null,
      safetyNotes: null,
      gpsLatitude: null,
      gpsLongitude: null,
      gpsRecordedAt: null,
      technicianSignature: null,
      technicianSignedAt: null,
      customerSignature: null,
      customerSignedAt: null,
      customerSignedBy: null,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      orgId: null,
      workOrderNumber: "WO-2024-0041",
      title: "Brake inspection and pad replacement",
      type: "corrective",
      status: "open",
      priority: "high",
      assetId: 2,
      assetName: "Van #3012",
      locationId: null,
      description: null,
      assignedToId: null,
      requestedById: null,
      dueDate: new Date("2024-01-18"),
      startDate: null,
      completedDate: null,
      estimatedHours: "3.00",
      actualHours: null,
      estimatedCost: "350.00",
      actualCost: null,
      meterReading: null,
      pmScheduleId: null,
      failureCode: null,
      rootCause: null,
      resolution: null,
      notes: null,
      safetyNotes: null,
      gpsLatitude: null,
      gpsLongitude: null,
      gpsRecordedAt: null,
      technicianSignature: null,
      technicianSignedAt: null,
      customerSignature: null,
      customerSignedAt: null,
      customerSignedBy: null,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 3,
      orgId: null,
      workOrderNumber: "WO-2024-0040",
      title: "AC compressor repair",
      type: "corrective",
      status: "completed",
      priority: "low",
      assetId: 3,
      assetName: "Bus #5001",
      locationId: null,
      description: null,
      assignedToId: null,
      requestedById: null,
      dueDate: new Date("2024-01-16"),
      startDate: new Date("2024-01-14"),
      completedDate: new Date("2024-01-15"),
      estimatedHours: "4.00",
      actualHours: "3.50",
      estimatedCost: "500.00",
      actualCost: "475.00",
      meterReading: null,
      pmScheduleId: null,
      failureCode: null,
      rootCause: null,
      resolution: null,
      notes: null,
      safetyNotes: null,
      gpsLatitude: null,
      gpsLongitude: null,
      gpsRecordedAt: null,
      technicianSignature: null,
      technicianSignedAt: null,
      customerSignature: null,
      customerSignedAt: null,
      customerSignedBy: null,
      createdAt: new Date("2024-01-14"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const filteredMockData = mockWorkOrders.filter((wo) => {
    const matchesSearch = 
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  const displayData = workOrders?.length ? sortedWorkOrders : sortWorkOrders(filteredMockData);

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Work Orders"
        description="Manage maintenance work orders across your fleet"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToExcel} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button asChild data-testid="button-new-work-order">
              <Link href="/work-orders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Link>
            </Button>
          </div>
        }
      />

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 border border-primary/20 rounded-lg" data-testid="bulk-actions-bar">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                batchUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  updates: { status: "completed" },
                });
              }}
              disabled={batchUpdateMutation.isPending}
              data-testid="button-bulk-approve"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve Selected
            </Button>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[160px]" data-testid="select-bulk-status">
                <SelectValue placeholder="Change status to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="ready_for_review">Ready for Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || batchUpdateMutation.isPending}
              data-testid="button-bulk-update"
            >
              Apply Status
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              data-testid="button-clear-selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="ready_for_review">Ready for Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortField}-${sortDirection}`} onValueChange={(val) => {
            const [field, dir] = val.split("-") as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(dir);
          }}>
            <SelectTrigger className="w-[160px]" data-testid="select-sort">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="dueDate-asc">Due Date (Earliest)</SelectItem>
              <SelectItem value="dueDate-desc">Due Date (Latest)</SelectItem>
              <SelectItem value="priority-desc">Priority (High-Low)</SelectItem>
              <SelectItem value="priority-asc">Priority (Low-High)</SelectItem>
              <SelectItem value="workOrderNumber-asc">WO Number (A-Z)</SelectItem>
              <SelectItem value="workOrderNumber-desc">WO Number (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {displayData.length === 0 && !isLoading ? (
        <EmptyState
          icon={Wrench}
          title="No work orders found"
          description={search || statusFilter !== "all" || priorityFilter !== "all" 
            ? "Try adjusting your filters" 
            : "Create your first work order to get started"}
          action={{
            label: "Create Work Order",
            onClick: () => navigate("/work-orders/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={displayData}
          isLoading={isLoading}
          onRowClick={(wo) => navigate(`/work-orders/${wo.id}`)}
          getRowKey={(wo) => wo.id}
          emptyMessage="No work orders found"
        />
      )}
    </div>
  );
}
