import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Download, Filter, Calendar, RefreshCw, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";

const reportMeta: Record<string, { title: string; description: string; category: string }> = {
  "work-order-summary": {
    title: "Work Order Summary",
    description: "Overview of all work orders by status and type",
    category: "Work Order Reports"
  },
  "technician-productivity": {
    title: "Technician Productivity",
    description: "Labor hours and completion rates by technician",
    category: "Work Order Reports"
  },
  "work-order-aging": {
    title: "Work Order Aging",
    description: "Analysis of open work orders by age",
    category: "Work Order Reports"
  },
  "completion-time-analysis": {
    title: "Completion Time Analysis",
    description: "Average time to complete by work order type",
    category: "Work Order Reports"
  },
  "asset-utilization": {
    title: "Asset Utilization",
    description: "Usage metrics and availability rates",
    category: "Asset Reports"
  },
  "maintenance-history": {
    title: "Maintenance History",
    description: "Complete maintenance record by asset",
    category: "Asset Reports"
  },
  "downtime-analysis": {
    title: "Downtime Analysis",
    description: "Unplanned downtime tracking and trends",
    category: "Asset Reports"
  },
  "mtbf/mttr-report": {
    title: "MTBF/MTTR Report",
    description: "Mean time between failures and repair",
    category: "Asset Reports"
  },
  "maintenance-cost-summary": {
    title: "Maintenance Cost Summary",
    description: "Total costs by asset, location, or type",
    category: "Cost Analysis"
  },
  "labor-vs-parts-cost": {
    title: "Labor vs Parts Cost",
    description: "Breakdown of maintenance expenses",
    category: "Cost Analysis"
  },
  "cost-per-mile/hour": {
    title: "Cost Per Mile/Hour",
    description: "Operating cost efficiency metrics",
    category: "Cost Analysis"
  },
  "budget-vs-actual": {
    title: "Budget vs Actual",
    description: "Compare planned vs actual spending",
    category: "Cost Analysis"
  },
  "stock-level-report": {
    title: "Stock Level Report",
    description: "Current inventory with reorder alerts",
    category: "Inventory Reports"
  },
  "inventory-turnover": {
    title: "Inventory Turnover",
    description: "Parts usage and movement analysis",
    category: "Inventory Reports"
  },
  "abc-classification": {
    title: "ABC Classification",
    description: "Parts ranked by value and usage",
    category: "Inventory Reports"
  },
  "vendor-performance": {
    title: "Vendor Performance",
    description: "Lead times and pricing by vendor",
    category: "Inventory Reports"
  },
  "pm-compliance-rate": {
    title: "PM Compliance Rate",
    description: "On-time completion percentage",
    category: "PM Compliance"
  },
  "pm-schedule-status": {
    title: "PM Schedule Status",
    description: "Upcoming and overdue PM tasks",
    category: "PM Compliance"
  },
  "pm-cost-analysis": {
    title: "PM Cost Analysis",
    description: "Preventive vs corrective maintenance costs",
    category: "PM Compliance"
  },
  "pm-interval-optimization": {
    title: "PM Interval Optimization",
    description: "AI-recommended interval adjustments",
    category: "PM Compliance"
  },
  "kpi-dashboard": {
    title: "KPI Dashboard",
    description: "Key performance indicators overview",
    category: "Performance Metrics"
  },
  "fleet-availability-trend": {
    title: "Fleet Availability Trend",
    description: "Historical availability metrics",
    category: "Performance Metrics"
  },
  "response-time-analysis": {
    title: "Response Time Analysis",
    description: "Time from request to work order start",
    category: "Performance Metrics"
  },
  "first-time-fix-rate": {
    title: "First-Time Fix Rate",
    description: "Work orders completed without rework",
    category: "Performance Metrics"
  },
};

export default function ReportDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/reports/:reportName");
  const [dateRange, setDateRange] = useState("last-30");
  const [groupBy, setGroupBy] = useState("status");

  const reportName = params?.reportName || "";
  const report = reportMeta[reportName];

  if (!report) {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Report Not Found</h1>
        </div>
        <p className="text-muted-foreground">The requested report could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <PageHeader
        title={report.title}
        description={report.description}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7">Last 7 Days</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="last-90">Last 90 Days</SelectItem>
                  <SelectItem value="last-365">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Group By</label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger data-testid="select-group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" data-testid="input-start-date" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" data-testid="input-end-date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">247</p>
              <p className="text-sm text-muted-foreground mt-1">Total Records</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">89%</p>
              <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">$45,230</p>
              <p className="text-sm text-muted-foreground mt-1">Total Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">4.2h</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Chart visualization coming soon</p>
              <p className="text-xs mt-1">Report data will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">ID</th>
                  <th className="text-left p-3 text-sm font-medium">Description</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Date</th>
                  <th className="text-right p-3 text-sm font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 text-sm">WO-2024-001</td>
                  <td className="p-3 text-sm">Engine Oil Change</td>
                  <td className="p-3 text-sm">Completed</td>
                  <td className="p-3 text-sm">Jan 15, 2024</td>
                  <td className="p-3 text-sm text-right">$125.00</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 text-sm">WO-2024-002</td>
                  <td className="p-3 text-sm">Brake Pad Replacement</td>
                  <td className="p-3 text-sm">In Progress</td>
                  <td className="p-3 text-sm">Jan 18, 2024</td>
                  <td className="p-3 text-sm text-right">$450.00</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 text-sm">WO-2024-003</td>
                  <td className="p-3 text-sm">Tire Rotation</td>
                  <td className="p-3 text-sm">Completed</td>
                  <td className="p-3 text-sm">Jan 20, 2024</td>
                  <td className="p-3 text-sm text-right">$75.00</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing sample data. Connect to your database for real-time report data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
