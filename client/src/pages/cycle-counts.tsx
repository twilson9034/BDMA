import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Search, CheckCircle, Clock, Package, BarChart3, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CycleCount, Part } from "@shared/schema";
import { format } from "date-fns";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function CycleCounts() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<CycleCount | null>(null);
  const [actualQuantity, setActualQuantity] = useState("");
  const [countNotes, setCountNotes] = useState("");

  const { data: counts, isLoading } = useQuery<CycleCount[]>({
    queryKey: ["/api/cycle-counts"],
  });

  const { data: partsData } = useQuery<{ parts: Part[]; total: number }>({
    queryKey: ["/api/parts"],
  });
  const allParts = partsData?.parts || [];

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cycle-counts/generate-schedule");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Schedule Generated", description: `${data.scheduled} counts scheduled` });
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate schedule", variant: "destructive" });
    },
  });

  const recalcABCMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/parts/recalculate-abc");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "ABC Recalculated", description: `${data.updated} parts updated` });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
    },
  });

  const executeCountMutation = useMutation({
    mutationFn: async (data: { id: number; actualQuantity: number; notes?: string }) => {
      const response = await apiRequest("POST", `/api/cycle-counts/${data.id}/execute`, {
        actualQuantity: data.actualQuantity,
        notes: data.notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Count Executed", description: "Cycle count recorded" });
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      setExecuteDialogOpen(false);
      setSelectedCount(null);
      setActualQuantity("");
      setCountNotes("");
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/cycle-counts/${id}/reconcile`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Reconciled", description: "Inventory adjusted to match count" });
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
    },
  });

  const countsWithParts = (counts || []).map(count => {
    const part = allParts?.find(p => p.id === count.partId);
    return { ...count, part };
  });

  const filteredCounts = countsWithParts.filter((count) => {
    const matchesSearch = !search || 
      count.countNumber.toLowerCase().includes(search.toLowerCase()) ||
      count.part?.partNumber?.toLowerCase().includes(search.toLowerCase()) ||
      count.part?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || count.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExecuteClick = (count: CycleCount) => {
    setSelectedCount(count);
    const part = allParts?.find(p => p.id === count.partId);
    setActualQuantity(part?.quantityOnHand || "0");
    setExecuteDialogOpen(true);
  };

  const columns: Column<typeof countsWithParts[0]>[] = [
    {
      key: "countNumber",
      header: "Count #",
      cell: (count) => (
        <span className="font-medium" data-testid={`text-count-${count.id}`}>{count.countNumber}</span>
      ),
    },
    {
      key: "part",
      header: "Part",
      cell: (count) => (
        <div>
          <p className="font-medium">{count.part?.partNumber}</p>
          <p className="text-sm text-muted-foreground">{count.part?.name}</p>
        </div>
      ),
    },
    {
      key: "abcClass",
      header: "ABC Class",
      cell: (count) => (
        <Badge variant={count.part?.abcClass === "A" ? "destructive" : count.part?.abcClass === "B" ? "default" : "secondary"}>
          {count.part?.abcClass || "-"}
        </Badge>
      ),
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      cell: (count) => count.scheduledDate ? format(new Date(count.scheduledDate), "MMM d, yyyy") : "-",
    },
    {
      key: "status",
      header: "Status",
      cell: (count) => (
        <Badge variant={statusColors[count.status] || "secondary"} data-testid={`badge-status-${count.id}`}>
          {count.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "expected",
      header: "Expected",
      cell: (count) => count.expectedQuantity ?? count.part?.quantityOnHand ?? "-",
    },
    {
      key: "actual",
      header: "Actual",
      cell: (count) => count.actualQuantity ?? "-",
    },
    {
      key: "variance",
      header: "Variance",
      cell: (count) => {
        if (count.variance === null || count.variance === undefined) return "-";
        const variance = Number(count.variance);
        return (
          <span className={variance < 0 ? "text-destructive" : variance > 0 ? "text-green-600" : ""}>
            {variance > 0 ? "+" : ""}{variance}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (count) => (
        <div className="flex gap-1">
          {count.status === "scheduled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleExecuteClick(count);
              }}
              data-testid={`button-execute-${count.id}`}
            >
              <Play className="h-4 w-4 mr-1" />
              Count
            </Button>
          )}
          {count.status === "completed" && !count.isReconciled && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                reconcileMutation.mutate(count.id);
              }}
              data-testid={`button-reconcile-${count.id}`}
            >
              <Check className="h-4 w-4 mr-1" />
              Reconcile
            </Button>
          )}
          {count.isReconciled && (
            <Badge variant="outline">Reconciled</Badge>
          )}
        </div>
      ),
    },
  ];

  const stats = {
    scheduled: counts?.filter(c => c.status === "scheduled").length || 0,
    inProgress: counts?.filter(c => c.status === "in_progress").length || 0,
    completed: counts?.filter(c => c.status === "completed").length || 0,
    needsReconcile: counts?.filter(c => c.status === "completed" && !c.isReconciled).length || 0,
  };

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader
        title="Cycle Counting"
        description="Track and execute inventory cycle counts based on ABC classification"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => recalcABCMutation.mutate()}
              disabled={recalcABCMutation.isPending}
              data-testid="button-recalc-abc"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Recalc ABC
            </Button>
            <Button 
              onClick={() => generateScheduleMutation.mutate()}
              disabled={generateScheduleMutation.isPending}
              data-testid="button-generate-schedule"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Schedule
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Needs Reconcile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.needsReconcile}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4 pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search counts..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-counts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 px-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading counts...</div>
        ) : filteredCounts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Cycle Counts"
            description={search || statusFilter !== "all" 
              ? "Try adjusting your filters" 
              : "Generate a schedule to create cycle counts based on ABC classification"}
            action={
              <Button 
                onClick={() => generateScheduleMutation.mutate()}
                disabled={generateScheduleMutation.isPending}
                data-testid="button-empty-generate"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Schedule
              </Button>
            }
          />
        ) : (
          <DataTable data={filteredCounts} columns={columns} getRowKey={(count) => count.id} />
        )}
      </div>

      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Cycle Count</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCount && (
              <>
                <div className="text-sm text-muted-foreground">
                  Count: {selectedCount.countNumber}
                </div>
                <div className="space-y-2">
                  <Label>Actual Quantity Counted</Label>
                  <Input
                    type="number"
                    min="0"
                    value={actualQuantity}
                    onChange={(e) => setActualQuantity(e.target.value)}
                    data-testid="input-actual-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={countNotes}
                    onChange={(e) => setCountNotes(e.target.value)}
                    placeholder="Any observations..."
                    data-testid="input-count-notes"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedCount) {
                  executeCountMutation.mutate({
                    id: selectedCount.id,
                    actualQuantity: Number(actualQuantity),
                    notes: countNotes || undefined,
                  });
                }
              }}
              disabled={!actualQuantity || executeCountMutation.isPending}
              data-testid="button-submit-count"
            >
              Submit Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
