import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Truck, 
  Wrench,
  Package,
  Calendar,
  FileText,
  Download,
  Plus,
  Trash2,
  Play,
  Save,
  Loader2,
  Filter,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SavedReport } from "@shared/schema";

const reportCategories = [
  {
    title: "Work Order Reports",
    icon: Wrench,
    color: "bg-blue-500/10 text-blue-500",
    reports: [
      { id: "wo-summary", name: "Work Order Summary", description: "Overview of all work orders by status and type" },
      { id: "tech-productivity", name: "Technician Productivity", description: "Labor hours and completion rates by technician" },
      { id: "wo-aging", name: "Work Order Aging", description: "Analysis of open work orders by age" },
      { id: "completion-time", name: "Completion Time Analysis", description: "Average time to complete by work order type" },
    ],
  },
  {
    title: "Asset Reports",
    icon: Truck,
    color: "bg-green-500/10 text-green-500",
    reports: [
      { id: "asset-util", name: "Asset Utilization", description: "Usage metrics and availability rates" },
      { id: "maint-history", name: "Maintenance History", description: "Complete maintenance record by asset" },
      { id: "downtime", name: "Downtime Analysis", description: "Unplanned downtime tracking and trends" },
      { id: "mtbf-mttr", name: "MTBF/MTTR Report", description: "Mean time between failures and repair" },
    ],
  },
  {
    title: "Cost Analysis",
    icon: DollarSign,
    color: "bg-amber-500/10 text-amber-500",
    reports: [
      { id: "cost-summary", name: "Maintenance Cost Summary", description: "Total costs by asset, location, or type" },
      { id: "labor-parts", name: "Labor vs Parts Cost", description: "Breakdown of maintenance expenses" },
      { id: "cost-per-mile", name: "Cost Per Mile/Hour", description: "Operating cost efficiency metrics" },
      { id: "budget-actual", name: "Budget vs Actual", description: "Compare planned vs actual spending" },
    ],
  },
  {
    title: "Inventory Reports",
    icon: Package,
    color: "bg-purple-500/10 text-purple-500",
    reports: [
      { id: "stock-level", name: "Stock Level Report", description: "Current inventory with reorder alerts" },
      { id: "inventory-turnover", name: "Inventory Turnover", description: "Parts usage and movement analysis" },
      { id: "abc-class", name: "ABC Classification", description: "Parts ranked by value and usage" },
      { id: "vendor-perf", name: "Vendor Performance", description: "Lead times and pricing by vendor" },
    ],
  },
  {
    title: "PM Compliance",
    icon: Calendar,
    color: "bg-cyan-500/10 text-cyan-500",
    reports: [
      { id: "pm-compliance", name: "PM Compliance Rate", description: "On-time completion percentage" },
      { id: "pm-schedule", name: "PM Schedule Status", description: "Upcoming and overdue PM tasks" },
      { id: "pm-cost", name: "PM Cost Analysis", description: "Preventive vs corrective maintenance costs" },
      { id: "pm-interval", name: "PM Interval Optimization", description: "AI-recommended interval adjustments" },
    ],
  },
  {
    title: "Performance Metrics",
    icon: TrendingUp,
    color: "bg-rose-500/10 text-rose-500",
    reports: [
      { id: "kpi-dashboard", name: "KPI Dashboard", description: "Key performance indicators overview" },
      { id: "fleet-avail", name: "Fleet Availability Trend", description: "Historical availability metrics" },
      { id: "response-time", name: "Response Time Analysis", description: "Time from request to work order start" },
      { id: "first-fix", name: "First-Time Fix Rate", description: "Work orders completed without rework" },
    ],
  },
];

const reportTypes = [
  { value: "work_order_cost", label: "Work Order Cost" },
  { value: "asset_downtime", label: "Asset Downtime" },
  { value: "parts_consumption", label: "Parts Consumption" },
  { value: "custom", label: "Custom" },
];

const scheduleFrequencies = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const outputFormats = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
];

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("prebuilt");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [newReportName, setNewReportName] = useState("");
  const [newReportType, setNewReportType] = useState("custom");
  const [newReportFormat, setNewReportFormat] = useState("pdf");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);

  const { data: savedReports = [], isLoading: loadingSavedReports } = useQuery<SavedReport[]>({
    queryKey: ["/api/saved-reports"],
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      type: string; 
      description?: string;
      isScheduled?: boolean;
      scheduleFrequency?: string;
      scheduleRecipients?: string[];
    }) => {
      return apiRequest("POST", "/api/saved-reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      toast({ title: "Report saved", description: "Your report has been saved successfully." });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save report.", variant: "destructive" });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/saved-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      toast({ title: "Report deleted", description: "The saved report has been deleted." });
      setReportToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete report.", variant: "destructive" });
    },
  });

  function resetForm() {
    setNewReportName("");
    setNewReportType("custom");
    setNewReportFormat("pdf");
    setNewReportDescription("");
    setIsScheduled(false);
    setScheduleFrequency("weekly");
    setScheduleRecipients("");
  }

  function handleCreateReport() {
    if (!newReportName.trim()) {
      toast({ title: "Error", description: "Report name is required.", variant: "destructive" });
      return;
    }
    const recipients = scheduleRecipients.trim() 
      ? scheduleRecipients.split(",").map(e => e.trim()).filter(e => e)
      : undefined;
    createReportMutation.mutate({
      name: newReportName,
      type: newReportType,
      description: newReportDescription || undefined,
      isScheduled: isScheduled || undefined,
      scheduleFrequency: isScheduled ? scheduleFrequency : undefined,
      scheduleRecipients: isScheduled && recipients?.length ? recipients : undefined,
    });
  }

  function handleRunReport(reportId: string) {
    setSelectedReport(reportId);
    toast({ 
      title: "Report Running", 
      description: "Report generation started. This may take a few moments." 
    });
    setTimeout(() => {
      toast({ 
        title: "Report Complete", 
        description: "Your report is ready for download." 
      });
    }, 2000);
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Reports"
        description="Analytics and performance metrics for your maintenance operations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" data-testid="button-export-all">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-report">
              <Plus className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="prebuilt" data-testid="tab-prebuilt">Pre-built Reports</TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="builder" data-testid="tab-builder">Report Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="prebuilt" className="mt-6" data-testid="content-prebuilt">
          <div className="grid gap-6 lg:grid-cols-2">
            {reportCategories.map((category) => (
              <Card key={category.title} className="hover-elevate transition-all" data-testid={`card-category-${category.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base" data-testid={`text-category-${category.title.toLowerCase().replace(/\s+/g, "-")}`}>{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate transition-all"
                        data-testid={`row-report-${report.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" data-testid={`text-report-name-${report.id}`}>{report.name}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-report-desc-${report.id}`}>{report.description}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRunReport(report.id)}
                            data-testid={`button-run-${report.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`button-download-${report.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-6" data-testid="content-saved">
          {loadingSavedReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No saved reports"
              description="Create custom reports to save them for quick access later"
              action={{
                label: "Create Report",
                onClick: () => setShowCreateDialog(true),
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedReports.map((report) => (
                <Card key={report.id} className="hover-elevate" data-testid={`card-saved-report-${report.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate" data-testid={`text-saved-report-name-${report.id}`}>
                          {report.name}
                        </CardTitle>
                        {report.description && (
                          <CardDescription className="line-clamp-2 mt-1" data-testid={`text-saved-report-desc-${report.id}`}>
                            {report.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setReportToDelete(report)}
                        data-testid={`button-delete-saved-${report.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="secondary" data-testid={`badge-type-${report.id}`}>{report.type}</Badge>
                      {report.status && <Badge variant="outline" data-testid={`badge-status-${report.id}`}>{report.status}</Badge>}
                      {report.isScheduled && (
                        <Badge variant="default" className="bg-green-500" data-testid={`badge-scheduled-${report.id}`}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {report.scheduleFrequency}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="flex-1" data-testid={`button-run-saved-${report.id}`}>
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                      <Button size="sm" variant="outline" data-testid={`button-download-saved-${report.id}`}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="builder" className="mt-6" data-testid="content-builder">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="text-builder-title">
                  <Settings className="h-5 w-5" />
                  Report Configuration
                </CardTitle>
                <CardDescription data-testid="text-builder-desc">
                  Build a custom report by selecting data sources and filters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input 
                      id="report-name" 
                      placeholder="My Custom Report"
                      data-testid="input-builder-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Data Source</Label>
                    <Select defaultValue="custom">
                      <SelectTrigger id="report-type" data-testid="select-builder-type">
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input type="date" data-testid="input-builder-date-start" />
                    <Input type="date" data-testid="input-builder-date-end" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fields to Include</Label>
                  <div className="flex flex-wrap gap-2 p-4 rounded-lg border min-h-[80px]">
                    <Badge variant="secondary" className="cursor-pointer" data-testid="badge-field-id">ID</Badge>
                    <Badge variant="secondary" className="cursor-pointer" data-testid="badge-field-date">Date</Badge>
                    <Badge variant="secondary" className="cursor-pointer" data-testid="badge-field-status">Status</Badge>
                    <Badge variant="secondary" className="cursor-pointer" data-testid="badge-field-type">Type</Badge>
                    <Badge variant="secondary" className="cursor-pointer" data-testid="badge-field-cost">Cost</Badge>
                    <Badge variant="outline" className="cursor-pointer" data-testid="badge-field-add">+ Add Field</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-format">Output Format</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger id="report-format" data-testid="select-builder-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {outputFormats.map((fmt) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle data-testid="text-preview-title">Preview</CardTitle>
                <CardDescription data-testid="text-preview-desc">
                  A preview of your report configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[3/4] rounded-lg border bg-muted/50 flex items-center justify-center" data-testid="preview-area">
                  <div className="text-center p-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Configure your report to see a preview
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" data-testid="button-builder-run">
                    <Play className="h-4 w-4 mr-2" />
                    Run Report
                  </Button>
                  <Button variant="outline" data-testid="button-builder-save">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-report">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">Save Report</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Save your report configuration for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="Monthly Asset Summary"
                data-testid="input-new-report-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <Select value={newReportType} onValueChange={setNewReportType}>
                <SelectTrigger id="type" data-testid="select-new-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Output Format</Label>
              <Select value={newReportFormat} onValueChange={setNewReportFormat}>
                <SelectTrigger id="format" data-testid="select-new-report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outputFormats.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                placeholder="Brief description of this report..."
                data-testid="textarea-new-report-description"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="schedule">Schedule Delivery</Label>
                <p className="text-xs text-muted-foreground">Automatically send this report on a schedule</p>
              </div>
              <Switch
                id="schedule"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
                data-testid="switch-schedule"
              />
            </div>
            {isScheduled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                    <SelectTrigger id="frequency" data-testid="select-schedule-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                  <Input
                    id="recipients"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    placeholder="user@example.com, team@example.com"
                    data-testid="input-schedule-recipients"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReport} 
              disabled={createReportMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createReportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <DialogContent data-testid="dialog-delete-report">
          <DialogHeader>
            <DialogTitle data-testid="dialog-delete-title">Delete Report</DialogTitle>
            <DialogDescription data-testid="dialog-delete-description">
              Are you sure you want to delete "{reportToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportToDelete(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportToDelete && deleteReportMutation.mutate(reportToDelete.id)}
              disabled={deleteReportMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteReportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
