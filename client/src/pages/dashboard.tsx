import { useState, useEffect, useMemo } from "react";
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
  ShoppingCart,
  Timer,
  Activity,
  Target,
  DollarSign,
  FileText,
  Bell,
  MapPin,
  Settings
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
import { TireHealthWidget } from "@/components/TireHealthWidget";
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
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
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

interface KpiMetrics {
  mttr: number | null;
  mtbf: number | null;
  assetUptime: number;
  pmCompliance: number;
  emergencyWoRatio: number;
  avgCostPerWo: number;
}

interface ProcurementOverview {
  pendingRequisitions: number;
  activePurchaseOrders: number;
  reorderAlerts: number;
  pendingPartRequests: number;
}

interface PartsAnalytics {
  topUsedParts: Array<{
    partId: number;
    partNumber: string;
    partName: string;
    usageCount: number;
    totalCost: number;
  }>;
  lowStockCritical: number;
}

const workOrderTrendData = [
  { month: "Jan", completed: 45, opened: 52 },
  { month: "Feb", completed: 52, opened: 48 },
  { month: "Mar", completed: 61, opened: 55 },
  { month: "Apr", completed: 58, opened: 62 },
  { month: "May", completed: 72, opened: 68 },
  { month: "Jun", completed: 78, opened: 75 },
];

// Historical KPI trend data for analytics
const kpiTrendData = [
  { month: "Jan", mttr: 4.2, uptime: 92, pmCompliance: 85, avgCost: 285 },
  { month: "Feb", mttr: 3.8, uptime: 93, pmCompliance: 88, avgCost: 275 },
  { month: "Mar", mttr: 3.5, uptime: 94, pmCompliance: 90, avgCost: 260 },
  { month: "Apr", mttr: 3.9, uptime: 91, pmCompliance: 87, avgCost: 290 },
  { month: "May", mttr: 3.2, uptime: 95, pmCompliance: 92, avgCost: 245 },
  { month: "Jun", mttr: 2.8, uptime: 96, pmCompliance: 94, avgCost: 230 },
];

// Tire prediction data
const tirePredictionData = [
  { tireId: 1, position: "Front Left", asset: "Truck #1024", predictedReplacement: "14 days", confidence: 92, treadDepth: 4.2 },
  { tireId: 2, position: "Rear Right", asset: "Van #3012", predictedReplacement: "21 days", confidence: 87, treadDepth: 5.1 },
  { tireId: 3, position: "Front Right", asset: "Truck #1025", predictedReplacement: "30 days", confidence: 78, treadDepth: 6.0 },
];

const assetStatusData = [
  { name: "Operational", value: 47, color: "#22c55e" },
  { name: "In Maintenance", value: 8, color: "#f59e0b" },
  { name: "Down", value: 3, color: "#ef4444" },
];

interface Location {
  id: number;
  name: string;
  city?: string;
  state?: string;
}

interface Membership {
  id: number;
  primaryLocationId: number | null;
  role: string;
}

export default function Dashboard() {
  // Get user's membership to determine their assigned location
  const { data: membership } = useQuery<Membership>({
    queryKey: ["/api/organizations/current/my-membership"],
  });
  
  // Fetch locations for display
  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Calculate effective location ID based on user preference
  const effectiveLocationId = useMemo(() => {
    const pref = localStorage.getItem("bdma_dashboard_location") || "assigned";
    
    if (pref === "all") {
      return null; // Show all locations
    } else if (pref === "assigned") {
      // Use user's assigned location, or null if not assigned
      return membership?.primaryLocationId || null;
    } else {
      // Specific location ID selected
      const locationId = parseInt(pref);
      return isNaN(locationId) ? null : locationId;
    }
  }, [membership?.primaryLocationId]);

  // Build URL with location filter
  const buildUrl = (baseUrl: string) => {
    return effectiveLocationId ? `${baseUrl}?locationId=${effectiveLocationId}` : baseUrl;
  };
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: [buildUrl("/api/dashboard/stats")],
  });

  const { data: recentWorkOrders, isLoading: workOrdersLoading } = useQuery<RecentWorkOrder[]>({
    queryKey: [buildUrl("/api/work-orders/recent")],
  });

  const { data: unfulfilledParts } = useQuery<UnfulfilledPart[]>({
    queryKey: ["/api/estimates/unfulfilled-parts"],
  });

  const { data: kpis } = useQuery<KpiMetrics>({
    queryKey: [buildUrl("/api/dashboard/kpis")],
  });

  const { data: procurement } = useQuery<ProcurementOverview>({
    queryKey: [buildUrl("/api/dashboard/procurement")],
  });

  const { data: partsAnalytics } = useQuery<PartsAnalytics>({
    queryKey: [buildUrl("/api/dashboard/parts-analytics")],
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

  // Determine location display name
  const getLocationDisplay = () => {
    const pref = localStorage.getItem("bdma_dashboard_location") || "assigned";
    
    if (pref === "all") {
      return "All Locations";
    } else if (pref === "assigned") {
      if (membership?.primaryLocationId) {
        const loc = locations?.find(l => l.id === membership.primaryLocationId);
        return loc?.name || "Assigned Location";
      }
      return "All Locations"; // No assignment = show all
    } else {
      const locationId = parseInt(pref);
      const loc = locations?.find(l => l.id === locationId);
      return loc?.name || "Unknown Location";
    }
  };
  
  const locationDisplay = getLocationDisplay();

  return (
    <div className="space-y-6 fade-in">
      <PageHeader 
        title="Dashboard" 
        description={
          <span className="flex items-center gap-2 flex-wrap">
            Overview of your maintenance operations
            <span className="inline-flex items-center gap-1 text-primary">
              <MapPin className="h-3 w-3" />
              {locationDisplay}
            </span>
            <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary underline">
              Change
            </Link>
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild data-testid="button-new-work-order">
              <Link href="/work-orders/new">
                <Wrench className="h-4 w-4 mr-2" />
                New Work Order
              </Link>
            </Button>
          </div>
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

      {/* KPI Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="MTTR"
          value={kpis?.mttr !== null ? `${kpis?.mttr}h` : "N/A"}
          icon={<Timer className="h-4 w-4" />}
          changeLabel="Mean Time To Repair"
        />
        <KPICard
          title="Asset Uptime"
          value={`${kpis?.assetUptime || 0}%`}
          icon={<Activity className="h-4 w-4" />}
          change={kpis?.assetUptime && kpis.assetUptime >= 90 ? 0 : undefined}
        />
        <KPICard
          title="PM Compliance"
          value={`${kpis?.pmCompliance || 0}%`}
          icon={<Target className="h-4 w-4" />}
          className={kpis?.pmCompliance && kpis.pmCompliance < 80 ? "border-amber-500/50" : ""}
        />
        <KPICard
          title="Avg Cost/WO"
          value={`$${kpis?.avgCostPerWo?.toLocaleString() || 0}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
                  <div key={item.name} className="flex items-center justify-between gap-2 flex-wrap">
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

      {/* KPI Trends Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-kpi-trends">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium" data-testid="text-kpi-trends-title">KPI Trends (6 Months)</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-kpi-drill-down">
              <Link href="/reports">Drill Down</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="uptime" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Uptime %" />
                  <Line yAxisId="left" type="monotone" dataKey="pmCompliance" stroke="hsl(var(--chart-2))" strokeWidth={2} name="PM Compliance %" />
                  <Line yAxisId="right" type="monotone" dataKey="mttr" stroke="hsl(var(--chart-3))" strokeWidth={2} name="MTTR (hrs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-tire-predictions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium" data-testid="text-tire-predictions-title">Tire Replacement Predictions</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-tire-management">
              <Link href="/tires">View All Tires</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tirePredictionData.map((tire) => (
                <div key={tire.tireId} className="p-3 rounded-lg border border-border hover-elevate" data-testid={`tire-prediction-${tire.tireId}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <span className="font-medium text-sm" data-testid={`text-tire-asset-${tire.tireId}`}>{tire.asset}</span>
                      <span className="text-muted-foreground text-xs ml-2" data-testid={`text-tire-position-${tire.tireId}`}>({tire.position})</span>
                    </div>
                    <span className={`text-sm font-medium ${tire.confidence >= 90 ? 'text-green-600 dark:text-green-400' : tire.confidence >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} data-testid={`text-tire-confidence-${tire.tireId}`}>
                      {tire.confidence}% confidence
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-muted-foreground" data-testid={`text-tire-tread-${tire.tireId}`}>Tread Depth: <span className="font-medium text-foreground">{tire.treadDepth}/32"</span></span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium" data-testid={`text-tire-replacement-${tire.tireId}`}>Replace in {tire.predictedReplacement}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
                    className="flex items-center justify-between gap-4 flex-wrap p-3 rounded-lg border border-border hover-elevate transition-all"
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
                    className="flex items-center justify-between gap-4 flex-wrap p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover-elevate"
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
        
        <TireHealthWidget />

        {/* Procurement Overview Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Procurement Overview
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/requisitions">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/requisitions" className="p-3 rounded-lg border border-border hover-elevate text-center" data-testid="link-pending-requisitions">
                <p className="text-2xl font-bold">{procurement?.pendingRequisitions || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Requisitions</p>
              </Link>
              <Link href="/purchase-orders" className="p-3 rounded-lg border border-border hover-elevate text-center" data-testid="link-active-pos">
                <p className="text-2xl font-bold">{procurement?.activePurchaseOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Active POs</p>
              </Link>
              <Link href="/reorder-alerts" className="p-3 rounded-lg border border-border hover-elevate text-center" data-testid="link-reorder-alerts">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{procurement?.reorderAlerts || 0}</p>
                <p className="text-xs text-muted-foreground">Reorder Alerts</p>
              </Link>
              <Link href="/part-requests" className="p-3 rounded-lg border border-border hover-elevate text-center" data-testid="link-part-requests">
                <p className="text-2xl font-bold">{procurement?.pendingPartRequests || 0}</p>
                <p className="text-xs text-muted-foreground">Part Requests</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Parts Analytics Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top Used Parts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">View Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(!partsAnalytics?.topUsedParts || partsAnalytics.topUsedParts.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partsAnalytics.topUsedParts.map((part, index) => (
                  <div key={part.partId} className="flex items-center justify-between gap-4 flex-wrap p-2 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{part.partNumber}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{part.partName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{part.usageCount} used</p>
                      <p className="text-xs text-muted-foreground">${part.totalCost.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
                <div key={index} className="flex items-center justify-between gap-4 flex-wrap p-3 rounded-lg border border-border">
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
