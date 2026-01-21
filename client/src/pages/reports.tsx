import { Link } from "wouter";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Truck, 
  Wrench,
  Users,
  Package,
  AlertTriangle,
  Calendar,
  FileText,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

const reportCategories = [
  {
    title: "Work Order Reports",
    icon: Wrench,
    reports: [
      { name: "Work Order Summary", description: "Overview of all work orders by status and type" },
      { name: "Technician Productivity", description: "Labor hours and completion rates by technician" },
      { name: "Work Order Aging", description: "Analysis of open work orders by age" },
      { name: "Completion Time Analysis", description: "Average time to complete by work order type" },
    ],
  },
  {
    title: "Asset Reports",
    icon: Truck,
    reports: [
      { name: "Asset Utilization", description: "Usage metrics and availability rates" },
      { name: "Maintenance History", description: "Complete maintenance record by asset" },
      { name: "Downtime Analysis", description: "Unplanned downtime tracking and trends" },
      { name: "MTBF/MTTR Report", description: "Mean time between failures and repair" },
    ],
  },
  {
    title: "Cost Analysis",
    icon: DollarSign,
    reports: [
      { name: "Maintenance Cost Summary", description: "Total costs by asset, location, or type" },
      { name: "Labor vs Parts Cost", description: "Breakdown of maintenance expenses" },
      { name: "Cost Per Mile/Hour", description: "Operating cost efficiency metrics" },
      { name: "Budget vs Actual", description: "Compare planned vs actual spending" },
    ],
  },
  {
    title: "Inventory Reports",
    icon: Package,
    reports: [
      { name: "Stock Level Report", description: "Current inventory with reorder alerts" },
      { name: "Inventory Turnover", description: "Parts usage and movement analysis" },
      { name: "ABC Classification", description: "Parts ranked by value and usage" },
      { name: "Vendor Performance", description: "Lead times and pricing by vendor" },
    ],
  },
  {
    title: "PM Compliance",
    icon: Calendar,
    reports: [
      { name: "PM Compliance Rate", description: "On-time completion percentage" },
      { name: "PM Schedule Status", description: "Upcoming and overdue PM tasks" },
      { name: "PM Cost Analysis", description: "Preventive vs corrective maintenance costs" },
      { name: "PM Interval Optimization", description: "AI-recommended interval adjustments" },
    ],
  },
  {
    title: "Performance Metrics",
    icon: TrendingUp,
    reports: [
      { name: "KPI Dashboard", description: "Key performance indicators overview" },
      { name: "Fleet Availability Trend", description: "Historical availability metrics" },
      { name: "Response Time Analysis", description: "Time from request to work order start" },
      { name: "First-Time Fix Rate", description: "Work orders completed without rework" },
    ],
  },
];

export default function Reports() {
  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Reports"
        description="Analytics and performance metrics for your maintenance operations"
        actions={
          <Button variant="outline" data-testid="button-export-all">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {reportCategories.map((category) => (
          <Card key={category.title} className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">{category.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.reports.map((report) => (
                  <Link
                    key={report.name}
                    href={`/reports/${report.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate transition-all"
                    data-testid={`report-${report.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">{report.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
