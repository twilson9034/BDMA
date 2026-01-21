import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Truck, 
  Wrench, 
  Package, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Calculator,
  ShoppingCart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { FleetHealthWidget } from "@/components/FleetHealthWidget";
import { PredictionsWidget } from "@/components/PredictionsWidget";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalAssets: number;
  operationalAssets: number;
  inMaintenanceAssets: number;
  downAssets: number;
  openWorkOrders: number;
  overdueWorkOrders: number;
  partsLowStock: number;
  pmDueThisWeek: number;
}

interface RecentWorkOrder {
  id: number;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  assetName: string;
  createdAt: string;
}

interface UnfulfilledPart {
  id: number;
  estimateId: number;
  partNumber: string | null;
  description: string;
  quantity: string;
  lineType: string;
}

const workOrderTrendData = [
  { month: "Jan", completed: 45, opened: 52 },
  { month: "Feb", completed: 52, opened: 48 },
  { month: "Mar", completed: 61, opened: 55 },
  { month: "Apr", completed: 58, opened: 62 },
  { month: "May", completed: 72, opened: 68 },
  { month: "Jun", completed: 78, opened: 75 },
];

const assetStatusData = [
  { name: "Operational", value: 47, color: "#22c55e" },
  { name: "In Maintenance", value: 8, color: "#f59e0b" },
  { name: "Down", value: 3, color: "#ef4444" },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentWorkOrders, isLoading: workOrdersLoading } = useQuery<RecentWorkOrder[]>({
    queryKey: ["/api/work-orders/recent"],
  });

  const { data: unfulfilledParts } = useQuery<UnfulfilledPart[]>({
    queryKey: ["/api/estimates/unfulfilled-parts"],
  });

  if (statsLoading) {
    return <PageLoader />;
  }

  const displayStats = stats || {
    totalAssets: 58,
    operationalAssets: 47,
    inMaintenanceAssets: 8,
    downAssets: 3,
    openWorkOrders: 12,
    overdueWorkOrders: 2,
    partsLowStock: 5,
    pmDueThisWeek: 8,
  };

  const displayWorkOrders = recentWorkOrders || [
    { id: 1, workOrderNumber: "WO-2024-0042", title: "Engine oil change", status: "in_progress", priority: "medium", assetName: "Truck #1024", createdAt: "2024-01-15" },
    { id: 2, workOrderNumber: "WO-2024-0041", title: "Brake inspection", status: "open", priority: "high", assetName: "Van #3012", createdAt: "2024-01-15" },
    { id: 3, workOrderNumber: "WO-2024-0040", title: "AC repair", status: "completed", priority: "low", assetName: "Bus #5001", createdAt: "2024-01-14" },
    { id: 4, workOrderNumber: "WO-2024-0039", title: "Tire rotation", status: "open", priority: "medium", assetName: "Truck #1025", createdAt: "2024-01-14" },
  ];

  const fleetAvailability = Math.round((displayStats.operationalAssets / displayStats.totalAssets) * 100);

  return (
    <div className="space-y-6 fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Overview of your maintenance operations"
        actions={
          <Button asChild data-testid="button-new-work-order">
            <Link href="/work-orders/new">
              <Wrench className="h-4 w-4 mr-2" />
              New Work Order
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Fleet Availability"
          value={`${fleetAvailability}%`}
          icon={<Truck className="h-4 w-4" />}
          change={2.5}
          changeLabel="vs last month"
        />
        <KPICard
          title="Open Work Orders"
          value={displayStats.openWorkOrders}
          icon={<Wrench className="h-4 w-4" />}
          change={-8}
          changeLabel="vs last week"
        />
        <KPICard
          title="Overdue Items"
          value={displayStats.overdueWorkOrders}
          icon={<AlertTriangle className="h-4 w-4" />}
          className={displayStats.overdueWorkOrders > 0 ? "border-destructive/50" : ""}
        />
        <KPICard
          title="PM Due This Week"
          value={displayStats.pmDueThisWeek}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Work Order Trend</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports">View Report</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workOrderTrendData}>
                  <defs>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#completedGradient)"
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Area
                    type="monotone"
                    dataKey="opened"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#openedGradient)"
                    strokeWidth={2}
                    name="Opened"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Asset Status</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/assets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {assetStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Recent Work Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/work-orders" className="flex items-center gap-1">
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayWorkOrders.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No recent work orders"
                description="Create your first work order to get started"
                action={{
                  label: "Create Work Order",
                  onClick: () => {},
                }}
              />
            ) : (
              <div className="space-y-3">
                {displayWorkOrders.map((wo) => (
                  <Link
                    key={wo.id}
                    href={`/work-orders/${wo.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate transition-all"
                    data-testid={`work-order-${wo.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{wo.workOrderNumber}</span>
                          <StatusBadge status={wo.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{wo.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{wo.assetName}</p>
                        <p className="text-xs text-muted-foreground">{wo.createdAt}</p>
                      </div>
                      <PriorityBadge priority={wo.priority} showIcon={false} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/work-orders/new">
                <Wrench className="h-4 w-4" />
                New Work Order
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/assets/new">
                <Truck className="h-4 w-4" />
                Add Asset
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/inventory">
                <Package className="h-4 w-4" />
                Check Inventory
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/dvirs/new">
                <CheckCircle2 className="h-4 w-4" />
                New DVIR
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Parts Fulfillment
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/estimates">View Estimates</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(!unfulfilledParts || unfulfilledParts.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">All parts fulfilled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unfulfilledParts.slice(0, 4).map((part) => (
                  <Link
                    key={part.id}
                    href={`/estimates/${part.estimateId}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover-elevate"
                    data-testid={`unfulfilled-part-${part.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{part.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {part.partNumber || "No part number"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600 dark:text-orange-400">Qty: {part.quantity}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {part.lineType.replace("_", " ")}
                      </p>
                    </div>
                  </Link>
                ))}
                {unfulfilledParts.length > 4 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{unfulfilledParts.length - 4} more items needing fulfillment
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <FleetHealthWidget />

        <PredictionsWidget />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Upcoming PM</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pm-schedules">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Oil Change", asset: "Truck #1024", dueIn: "2 days", type: "miles" },
                { name: "Brake Inspection", asset: "Van #3012", dueIn: "5 days", type: "days" },
                { name: "Tire Rotation", asset: "Bus #5001", dueIn: "1 week", type: "miles" },
              ].map((pm, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pm.name}</p>
                      <p className="text-xs text-muted-foreground">{pm.asset}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{pm.dueIn}</p>
                    <p className="text-xs text-muted-foreground capitalize">{pm.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
