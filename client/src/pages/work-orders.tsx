import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Filter, Wrench } from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { EmptyState } from "@/components/EmptyState";
import type { WorkOrder } from "@shared/schema";

interface WorkOrderWithAsset extends WorkOrder {
  assetName?: string;
  locationName?: string;
}

export default function WorkOrders() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: workOrders, isLoading } = useQuery<WorkOrderWithAsset[]>({
    queryKey: ["/api/work-orders"],
  });

  const filteredWorkOrders = (workOrders || []).filter((wo) => {
    const matchesSearch = 
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const columns: Column<WorkOrderWithAsset>[] = [
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
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
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
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 3,
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
      createdAt: new Date("2024-01-14"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayData = workOrders?.length ? filteredWorkOrders : mockWorkOrders.filter((wo) => {
    const matchesSearch = 
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Work Orders"
        description="Manage maintenance work orders across your fleet"
        actions={
          <Button asChild data-testid="button-new-work-order">
            <Link href="/work-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Link>
          </Button>
        }
      />

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
