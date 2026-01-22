import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, ClipboardCheck, AlertTriangle, CheckCircle2, 
  XCircle, Truck, Calendar, User, MapPin, Wrench, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

interface Dvir {
  id: number;
  assetId: number;
  inspectorId: string | null;
  inspectionDate: string;
  status: "safe" | "defects_noted" | "unsafe";
  meterReading: string | null;
  preTrip: boolean;
  notes: string | null;
  signature: string | null;
  createdAt: string;
}

interface DvirDefect {
  id: number;
  dvirId: number;
  category: string;
  description: string;
  severity: "minor" | "major" | "critical";
  photoUrl: string | null;
  workOrderId: number | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export default function DvirDetail() {
  const [, params] = useRoute("/dvirs/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const dvirId = params?.id ? parseInt(params.id) : null;

  const { data: dvir, isLoading } = useQuery<Dvir>({
    queryKey: ["/api/dvirs", dvirId],
    enabled: !!dvirId,
  });

  const { data: defects } = useQuery<DvirDefect[]>({
    queryKey: ["/api/dvirs", dvirId, "defects"],
    enabled: !!dvirId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const asset = assets?.find(a => a.id === dvir?.assetId);

  const createWorkOrderMutation = useMutation({
    mutationFn: async (defectId: number) => {
      const defect = defects?.find(d => d.id === defectId);
      return apiRequest("POST", "/api/work-orders", {
        title: `DVIR Defect: ${defect?.description}`,
        description: `Defect found during ${dvir?.preTrip ? "pre-trip" : "post-trip"} inspection.\n\nCategory: ${defect?.category}\nSeverity: ${defect?.severity}\n\n${defect?.description}`,
        assetId: dvir?.assetId,
        priority: defect?.severity === "critical" ? "critical" : defect?.severity === "major" ? "high" : "medium",
        type: "corrective",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dvirs", dvirId, "defects"] });
      toast({ title: "Work Order Created", description: "A work order has been created for this defect." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create work order", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!dvir) {
    return (
      <div className="space-y-6">
        <PageHeader title="DVIR Not Found" description="The requested inspection could not be found." />
        <Button variant="outline" onClick={() => navigate("/dvirs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to DVIRs
        </Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "defects_noted": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "unsafe": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "defects_noted": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "unsafe": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "major": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "minor": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default: return "";
    }
  };

  const unresolvedDefects = defects?.filter(d => !d.resolved) || [];
  const resolvedDefects = defects?.filter(d => d.resolved) || [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dvirs")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={`DVIR - ${asset?.name || `Asset #${dvir.assetId}`}`}
        description={`${dvir.preTrip ? "Pre-Trip" : "Post-Trip"} Inspection - ${new Date(dvir.inspectionDate).toLocaleDateString()}`}
        actions={
          <Badge className={`text-sm ${getStatusColor(dvir.status)}`}>
            {getStatusIcon(dvir.status)}
            <span className="ml-1 capitalize">{dvir.status.replace("_", " ")}</span>
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <p className="font-medium">{asset?.name || `#${dvir.assetId}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(dvir.inspectionDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meter Reading</p>
                <p className="font-medium">{dvir.meterReading ? `${Number(dvir.meterReading).toLocaleString()} mi` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Defects</p>
                <p className="font-medium">{defects?.length || 0} found</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {unresolvedDefects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Open Defects ({unresolvedDefects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {unresolvedDefects.map((defect) => (
                  <div 
                    key={defect.id} 
                    className="p-4 rounded-lg border border-border bg-muted/30"
                    data-testid={`defect-${defect.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{defect.category}</Badge>
                          <Badge className={getSeverityColor(defect.severity)}>
                            {defect.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{defect.description}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {defect.workOrderId ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/work-orders/${defect.workOrderId}`}>
                              <Wrench className="h-3 w-3 mr-1" />
                              View WO
                            </Link>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => createWorkOrderMutation.mutate(defect.id)}
                            disabled={createWorkOrderMutation.isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create WO
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {resolvedDefects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Resolved Defects ({resolvedDefects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resolvedDefects.map((defect) => (
                  <div 
                    key={defect.id} 
                    className="p-4 rounded-lg border border-border bg-muted/30 opacity-75"
                    data-testid={`defect-resolved-${defect.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{defect.category}</Badge>
                      <Badge variant="secondary">{defect.severity}</Badge>
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    </div>
                    <p className="text-sm text-muted-foreground">{defect.description}</p>
                    {defect.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved on {new Date(defect.resolvedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(!defects || defects.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium text-lg">No Defects Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This vehicle passed inspection with no issues.
                </p>
              </CardContent>
            </Card>
          )}

          {dvir.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{dvir.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">{dvir.preTrip ? "Pre-Trip" : "Post-Trip"}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(dvir.status)}>
                  {dvir.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(dvir.inspectionDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span>{new Date(dvir.inspectionDate).toLocaleTimeString()}</span>
              </div>
              {dvir.meterReading && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Odometer</span>
                  <span>{Number(dvir.meterReading).toLocaleString()} mi</span>
                </div>
              )}
              {dvir.inspectorId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Inspector</span>
                  <span>{dvir.inspectorId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {asset && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Asset Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{asset.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={asset.status} />
                </div>
                {asset.manufacturer && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Make</span>
                    <span>{asset.manufacturer}</span>
                  </div>
                )}
                {asset.model && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model</span>
                    <span>{asset.model}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link href={`/assets/${asset.id}`}>View Asset</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dvirs/new">
                  <ClipboardCheck className="h-4 w-4" />
                  New Inspection
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/work-orders/new?assetId=${dvir.assetId}`}>
                  <Wrench className="h-4 w-4" />
                  Create Work Order
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
