import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import type { PurchaseRequisition } from "@shared/schema";

export default function Requisitions() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: requisitions, isLoading } = useQuery<PurchaseRequisition[]>({
    queryKey: ["/api/requisitions"],
  });

  const mockRequisitions: PurchaseRequisition[] = [
    {
      id: 1,
      requisitionNumber: "REQ-2024-0012",
      title: "Monthly oil and filter restock",
      description: "Regular restock of engine oils and filters",
      status: "approved",
      requestedById: "user1",
      approvedById: "admin1",
      vendorId: 1,
      totalAmount: "1250.00",
      notes: null,
      approvedAt: new Date("2024-01-14"),
      createdAt: new Date("2024-01-12"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 2,
      requisitionNumber: "REQ-2024-0011",
      title: "Emergency brake parts",
      description: "Brake pads and rotors for emergency repair",
      status: "ordered",
      requestedById: "user2",
      approvedById: "admin1",
      vendorId: 1,
      totalAmount: "850.00",
      notes: "Urgent - needed for VAN-3012",
      approvedAt: new Date("2024-01-13"),
      createdAt: new Date("2024-01-13"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      requisitionNumber: "REQ-2024-0010",
      title: "Tire replacement batch",
      description: "New tires for fleet vehicles",
      status: "submitted",
      requestedById: "user1",
      approvedById: null,
      vendorId: 2,
      totalAmount: "3200.00",
      notes: null,
      approvedAt: null,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayRequisitions = requisitions?.length ? requisitions : mockRequisitions;

  const filteredRequisitions = displayRequisitions.filter((req) =>
    req.requisitionNumber.toLowerCase().includes(search.toLowerCase()) ||
    req.title.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<PurchaseRequisition>[] = [
    {
      key: "requisitionNumber",
      header: "Requisition",
      cell: (req) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{req.requisitionNumber}</p>
            <p className="text-xs text-muted-foreground">{req.title}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (req) => <StatusBadge status={req.status} />,
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (req) => (
        <span className="font-medium">
          ${Number(req.totalAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Requested",
      cell: (req) => (
        <span className="text-sm text-muted-foreground">
          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Requisitions"
        description="Manage purchase requisitions"
        actions={
          <Button asChild data-testid="button-new-requisition">
            <Link href="/requisitions/new">
              <Plus className="h-4 w-4 mr-2" />
              New Requisition
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requisitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filteredRequisitions.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No requisitions found"
          description="Create a new purchase requisition"
          action={{
            label: "New Requisition",
            onClick: () => navigate("/requisitions/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequisitions}
          isLoading={isLoading}
          onRowClick={(req) => navigate(`/requisitions/${req.id}`)}
          getRowKey={(req) => req.id}
          emptyMessage="No requisitions found"
        />
      )}
    </div>
  );
}
