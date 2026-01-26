import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Truck, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  name: string;
  type: string;
  stats: {
    totalAssets: number;
    activeAssets: number;
    inMaintenance: number;
    outOfService: number;
  };
  recentActivity: Array<{
    id: string;
    description: string;
    timestamp: string;
  }>;
}

const mockDashboardData: Record<string, DashboardData> = {
  "dash-1": {
    name: "Fleet Status Overview",
    type: "fleet_status",
    stats: {
      totalAssets: 45,
      activeAssets: 38,
      inMaintenance: 5,
      outOfService: 2,
    },
    recentActivity: [
      { id: "1", description: "Vehicle #1234 completed maintenance", timestamp: "2 hours ago" },
      { id: "2", description: "New DVIR submitted for Vehicle #5678", timestamp: "4 hours ago" },
      { id: "3", description: "PM schedule triggered for 3 vehicles", timestamp: "Yesterday" },
    ],
  },
  "dash-2": {
    name: "Monthly KPIs",
    type: "kpi_summary",
    stats: {
      totalAssets: 45,
      activeAssets: 42,
      inMaintenance: 2,
      outOfService: 1,
    },
    recentActivity: [
      { id: "1", description: "MTTR improved by 12% this month", timestamp: "1 day ago" },
      { id: "2", description: "PM compliance at 94%", timestamp: "2 days ago" },
    ],
  },
};

export default function PublicDashboardView() {
  const [, params] = useRoute("/public/dashboard/:id");
  const dashboardId = params?.id;
  
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const dashboardData = dashboardId ? mockDashboardData[dashboardId] : null;

  if (!dashboardId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold" data-testid="text-error-title">Invalid Dashboard Link</h2>
              <p className="text-muted-foreground text-center" data-testid="text-error-message">
                This dashboard link is invalid or has expired. Please request a new link from the dashboard owner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold" data-testid="text-not-found-title">Dashboard Not Found</h2>
              <p className="text-muted-foreground text-center" data-testid="text-not-found-message">
                The requested dashboard could not be found. It may have been deleted or the link is incorrect.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">{dashboardData.name}</h1>
              <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">Public Dashboard View</p>
            </div>
            <Badge variant="secondary" data-testid="badge-dashboard-type">
              {dashboardData.type === "fleet_status" ? "Fleet Status" : "KPI Summary"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-total-assets">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-assets">{dashboardData.stats.totalAssets}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-assets">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-assets">{dashboardData.stats.activeAssets}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-in-maintenance">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
              <BarChart3 className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="text-in-maintenance">{dashboardData.stats.inMaintenance}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-out-of-service">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-out-of-service">{dashboardData.stats.outOfService}</div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <span className="text-sm" data-testid={`text-activity-${activity.id}`}>{activity.description}</span>
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by BDMA - Best Damn Maintenance App</p>
        </div>
      </div>
    </div>
  );
}
