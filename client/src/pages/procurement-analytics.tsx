import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { FileText, ShoppingCart, AlertTriangle, Package, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseRequisition, PurchaseOrder } from "@shared/schema";

interface ProcurementOverview {
  pendingRequisitions: number;
  approvedRequisitions?: number;
  activePurchaseOrders?: number;
  openPurchaseOrders?: number;
  reorderAlerts?: number;
  pendingPartRequests?: number;
  partiallyReceivedPOs?: number;
  totalOpenPOValue?: number;
}

export default function ProcurementAnalytics() {
  const { data: overview, isLoading: overviewLoading } = useQuery<ProcurementOverview>({
    queryKey: ["/api/dashboard/procurement"],
  });

  const { data: requisitions } = useQuery<PurchaseRequisition[]>({
    queryKey: ["/api/requisitions"],
  });

  const { data: purchaseOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const totalRequisitionValue = requisitions?.reduce(
    (sum, req) => sum + Number(req.totalAmount || 0),
    0
  ) || 0;

  const totalPOValue = purchaseOrders?.reduce(
    (sum, po) => sum + Number(po.totalAmount || 0),
    0
  ) || 0;

  const approvedReqs = requisitions?.filter(r => r.status === "approved").length || 0;
  const pendingReqs = requisitions?.filter(r => r.status === "submitted" || r.status === "draft").length || 0;
  const orderedReqs = requisitions?.filter(r => r.status === "ordered").length || 0;

  const openPOs = purchaseOrders?.filter(po => 
    po.status === "sent" || po.status === "acknowledged" || po.status === "draft"
  ).length || 0;
  const receivedPOs = purchaseOrders?.filter(po => po.status === "received").length || 0;
  const partialPOs = purchaseOrders?.filter(po => po.status === "partial").length || 0;

  const recentRequisitions = requisitions?.slice(0, 5) || [];
  const recentPOs = purchaseOrders?.slice(0, 5) || [];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Procurement Analytics"
        description="Overview of purchasing activities and trends"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card" data-testid="card-pending-requisitions">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Requisitions</p>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-pending-reqs">
                    {overview?.pendingRequisitions || pendingReqs}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="card-approved-requisitions">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved Requisitions</p>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-approved-reqs">
                    {overview?.approvedRequisitions || approvedReqs}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="card-open-pos">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Purchase Orders</p>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-open-pos">
                    {overview?.openPurchaseOrders || overview?.activePurchaseOrders || openPOs}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="card-total-po-value">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PO Value</p>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-total-po-value">
                    ${(overview?.totalOpenPOValue || totalPOValue).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-requisition-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Requisition Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Pending Review</span>
                </div>
                <span className="font-medium" data-testid="text-status-pending">{pendingReqs}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Approved</span>
                </div>
                <span className="font-medium" data-testid="text-status-approved">{approvedReqs}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Ordered</span>
                </div>
                <span className="font-medium" data-testid="text-status-ordered">{orderedReqs}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Requisition Value</span>
                  <span className="font-bold text-primary" data-testid="text-total-req-value">
                    ${totalRequisitionValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-po-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Open/Sent</span>
                </div>
                <span className="font-medium" data-testid="text-po-open">{openPOs}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Partially Received</span>
                </div>
                <span className="font-medium" data-testid="text-po-partial">{partialPOs}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Fully Received</span>
                </div>
                <span className="font-medium" data-testid="text-po-received">{receivedPOs}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total PO Count</span>
                  <span className="font-bold" data-testid="text-total-po-count">
                    {purchaseOrders?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-recent-requisitions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Requisitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequisitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No requisitions found</p>
            ) : (
              <div className="space-y-3">
                {recentRequisitions.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg hover-elevate" data-testid={`requisition-item-${req.id}`}>
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-req-number-${req.id}`}>{req.requisitionNumber}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-req-title-${req.id}`}>{req.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm" data-testid={`text-req-amount-${req.id}`}>${Number(req.totalAmount || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{req.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-pos">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No purchase orders found</p>
            ) : (
              <div className="space-y-3">
                {recentPOs.map((po) => (
                  <div key={po.id} className="flex items-center justify-between p-2 rounded-lg hover-elevate" data-testid={`po-item-${po.id}`}>
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-po-number-${po.id}`}>{po.poNumber}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-po-notes-${po.id}`}>{po.notes || "Purchase Order"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm" data-testid={`text-po-amount-${po.id}`}>${Number(po.totalAmount || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{po.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
