import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Play, History, Shield, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Part } from "@shared/schema";

interface ClassificationRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  windowMonths: number;
  status: string;
  partsProcessed: number;
  partsUpdated: number;
  errorMessage: string | null;
}

interface PartsResponse {
  parts: Part[];
  total: number;
}

const classColors: Record<string, string> = {
  S: "bg-red-600 text-white",
  A: "bg-orange-500 text-white",
  B: "bg-yellow-500 text-black",
  C: "bg-green-600 text-white",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
};

export default function SmartClassification() {
  const { toast } = useToast();
  const [classFilter, setClassFilter] = useState<string>("all");

  const { data: runs, isLoading: runsLoading } = useQuery<ClassificationRun[]>({
    queryKey: ["/api/classification/runs"],
  });

  const { data: partsData, isLoading: partsLoading } = useQuery<PartsResponse>({
    queryKey: ["/api/parts"],
  });

  const runClassificationMutation = useMutation({
    mutationFn: async (windowMonths: number) => {
      const res = await apiRequest("POST", "/api/classification/run", { windowMonths });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Classification Complete", 
        description: `Processed ${data.partsProcessed} parts. S:${data.classBreakdown.S} A:${data.classBreakdown.A} B:${data.classBreakdown.B} C:${data.classBreakdown.C}` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classification/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run classification", variant: "destructive" });
    },
  });

  const allParts = partsData?.parts || [];
  const filteredParts = classFilter === "all" 
    ? allParts 
    : allParts.filter(p => p.smartClass === classFilter);

  const classBreakdown = {
    S: allParts.filter(p => p.smartClass === "S").length,
    A: allParts.filter(p => p.smartClass === "A").length,
    B: allParts.filter(p => p.smartClass === "B").length,
    C: allParts.filter(p => p.smartClass === "C").length,
    unclassified: allParts.filter(p => !p.smartClass).length,
  };

  const runColumns: Column<ClassificationRun>[] = [
    {
      key: "id",
      header: "Run ID",
      cell: (run) => `#${run.id}`,
    },
    {
      key: "startedAt",
      header: "Started",
      cell: (run) => format(new Date(run.startedAt), "MMM d, yyyy h:mm a"),
    },
    {
      key: "status",
      header: "Status",
      cell: (run) => (
        <Badge variant={statusColors[run.status] || "secondary"}>
          {run.status}
        </Badge>
      ),
    },
    {
      key: "windowMonths",
      header: "Window",
      cell: (run) => `${run.windowMonths} months`,
    },
    {
      key: "partsProcessed",
      header: "Processed",
      cell: (run) => run.partsProcessed,
    },
    {
      key: "partsUpdated",
      header: "Updated",
      cell: (run) => run.partsUpdated,
    },
  ];

  const partColumns: Column<Part>[] = [
    {
      key: "partNumber",
      header: "Part Number",
      cell: (part) => part.partNumber,
    },
    {
      key: "name",
      header: "Name",
      cell: (part) => (
        <div className="max-w-[200px] truncate" title={part.name}>
          {part.name}
        </div>
      ),
    },
    {
      key: "smartClass",
      header: "Class",
      cell: (part) => part.smartClass ? (
        <Badge className={classColors[part.smartClass]}>
          {part.smartClass}
          {part.classificationLocked && " (Locked)"}
        </Badge>
      ) : (
        <Badge variant="secondary">-</Badge>
      ),
    },
    {
      key: "xyzClass",
      header: "XYZ",
      cell: (part) => (
        <Badge variant="outline">{part.xyzClass || "-"}</Badge>
      ),
    },
    {
      key: "priorityScore",
      header: "Score",
      cell: (part) => part.priorityScore ? Number(part.priorityScore).toFixed(1) : "-",
    },
    {
      key: "safetySystem",
      header: "Safety System",
      cell: (part) => part.safetySystem || "-",
    },
    {
      key: "lastClassifiedAt",
      header: "Last Classified",
      cell: (part) => part.lastClassifiedAt 
        ? format(new Date(part.lastClassifiedAt), "MMM d, yyyy")
        : "-",
    },
  ];

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader
        title="SMART Classification"
        description="Intelligent inventory classification based on cost, road call impact, and safety factors"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => runClassificationMutation.mutate(24)}
              disabled={runClassificationMutation.isPending}
              data-testid="button-run-24m"
            >
              <History className="mr-2 h-4 w-4" />
              24 Month
            </Button>
            <Button
              onClick={() => runClassificationMutation.mutate(12)}
              disabled={runClassificationMutation.isPending}
              data-testid="button-run-12m"
            >
              <Play className="mr-2 h-4 w-4" />
              {runClassificationMutation.isPending ? "Running..." : "Run Classification"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
        <Card 
          className={`cursor-pointer hover-elevate ${classFilter === "S" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setClassFilter(classFilter === "S" ? "all" : "S")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Class S</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{classBreakdown.S}</div>
            <div className="text-xs text-muted-foreground">Safety/Compliance</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${classFilter === "A" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setClassFilter(classFilter === "A" ? "all" : "A")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Class A</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{classBreakdown.A}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${classFilter === "B" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setClassFilter(classFilter === "B" ? "all" : "B")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Class B</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{classBreakdown.B}</div>
            <div className="text-xs text-muted-foreground">Medium Priority</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${classFilter === "C" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setClassFilter(classFilter === "C" ? "all" : "C")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Class C</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{classBreakdown.C}</div>
            <div className="text-xs text-muted-foreground">Low Priority</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover-elevate ${classFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setClassFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Unclassified</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classBreakdown.unclassified}</div>
            <div className="text-xs text-muted-foreground">Needs Classification</div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Classification History</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : !runs || runs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No classification runs yet. Click "Run Classification" to start.
              </div>
            ) : (
              <DataTable 
                data={runs.slice(0, 5)} 
                columns={runColumns} 
                getRowKey={(run) => run.id}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 flex-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              Parts by Classification
              {classFilter !== "all" && (
                <Badge className={`ml-2 ${classColors[classFilter]}`}>{classFilter}</Badge>
              )}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredParts.length} parts
            </div>
          </CardHeader>
          <CardContent>
            {partsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : filteredParts.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No Parts Found"
                description={classFilter === "all" 
                  ? "No parts in inventory" 
                  : `No parts with Class ${classFilter}`}
              />
            ) : (
              <DataTable 
                data={filteredParts.slice(0, 50)} 
                columns={partColumns} 
                getRowKey={(part) => part.id}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
