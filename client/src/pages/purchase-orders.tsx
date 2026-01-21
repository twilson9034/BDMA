import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import type { PurchaseOrder } from "@shared/schema";

interface POWithVendor extends PurchaseOrder {
  vendorName?: string;
}

export default function PurchaseOrders() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<POWithVendor[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const mockOrders: POWithVendor[] = [
    {
      id: 1,
      poNumber: "PO-2024-0008",
      requisitionId: 2,
      vendorId: 1,
      vendorName: "Auto Parts Plus",
      status: "sent",
      orderDate: new Date("2024-01-14"),
      expectedDeliveryDate: new Date("2024-01-18"),
      totalAmount: "850.00",
      shippingCost: "25.00",
      notes: null,
      createdById: "user1",
      createdAt: new Date("2024-01-14"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 2,
      poNumber: "PO-2024-0007",
      requisitionId: 1,
      vendorId: 1,
      vendorName: "Auto Parts Plus",
      status: "received",
      orderDate: new Date("2024-01-10"),
      expectedDeliveryDate: new Date("2024-01-15"),
      totalAmount: "1250.00",
      shippingCost: "0.00",
      notes: "Received in full",
      createdById: "user1",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 3,
      poNumber: "PO-2024-0006",
      requisitionId: null,
      vendorId: 2,
      vendorName: "Fleet Supplies Inc",
      status: "partial",
      orderDate: new Date("2024-01-08"),
      expectedDeliveryDate: new Date("2024-01-12"),
      totalAmount: "2400.00",
      shippingCost: "50.00",
      notes: "Awaiting backordered items",
      createdById: "user2",
      createdAt: new Date("2024-01-08"),
      updatedAt: new Date("2024-01-13"),
    },
  ];

  const displayOrders = orders?.length ? orders : mockOrders;

  const filteredOrders = displayOrders.filter((order) =>
    order.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    order.vendorName?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<POWithVendor>[] = [
    {
      key: "poNumber",
      header: "PO Number",
      cell: (order) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{order.poNumber}</p>
            <p className="text-xs text-muted-foreground">{order.vendorName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (order) => (
        <span className="font-medium">
          ${Number(order.totalAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "orderDate",
      header: "Order Date",
      cell: (order) => (
        <span className="text-sm">
          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "expectedDeliveryDate",
      header: "Expected",
      cell: (order) => (
        <span className="text-sm text-muted-foreground">
          {order.expectedDeliveryDate
            ? new Date(order.expectedDeliveryDate).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Purchase Orders"
        description="Manage vendor purchase orders"
        actions={
          <Button asChild data-testid="button-new-po">
            <Link href="/purchase-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchase orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filteredOrders.length === 0 && !isLoading ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders found"
          description="Create a new purchase order"
          action={{
            label: "New PO",
            onClick: () => navigate("/purchase-orders/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={isLoading}
          onRowClick={(order) => navigate(`/purchase-orders/${order.id}`)}
          getRowKey={(order) => order.id}
          emptyMessage="No purchase orders found"
        />
      )}
    </div>
  );
}
