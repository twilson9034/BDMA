import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Lock, Unlock, RefreshCw, AlertTriangle, TrendingUp, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface ClassificationData {
  currentClass: string | null;
  currentXyz: string | null;
  priorityScore: string | null;
  lastClassifiedAt: string | null;
  isLocked: boolean;
  safetySystem: string | null;
  failureSeverity: number | null;
  complianceOverride: boolean;
  traceabilityRequired: boolean;
  leadTimeDays: number | null;
  latestSnapshot: {
    costScore: string;
    roadcallScore: string;
    safetyScore: string;
    totalScore: string;
    annualSpend: string;
    roadcallCount: number;
    downtimeHours: string;
    explanationJson: any;
  } | null;
  recentAuditLog: Array<{
    id: number;
    changedAt: string;
    oldClass: string | null;
    newClass: string | null;
    reason: string | null;
    isSystem: boolean;
  }>;
}

const classColors: Record<string, string> = {
  S: "bg-red-600 text-white",
  A: "bg-orange-500 text-white",
  B: "bg-yellow-500 text-black",
  C: "bg-green-600 text-white",
};

const xyzDescriptions: Record<string, string> = {
  X: "Steady demand",
  Y: "Moderate variability",
  Z: "Sporadic usage",
};

interface Props {
  partId: number;
}

export function PartClassificationPanel({ partId }: Props) {
  const { toast } = useToast();
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [whyDialogOpen, setWhyDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState<string>("");
  const [newXyz, setNewXyz] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");

  const { data, isLoading } = useQuery<ClassificationData>({
    queryKey: ["/api/parts", partId, "classification"],
    queryFn: async () => {
      const res = await fetch(`/api/parts/${partId}/classification`);
      if (!res.ok) throw new Error("Failed to fetch classification");
      return res.json();
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ newClass, newXyz, reason }: { newClass: string; newXyz?: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/parts/${partId}/classification/override`, { newClass, newXyz, reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Classification Updated", description: "Part classification has been overridden" });
      queryClient.invalidateQueries({ queryKey: ["/api/parts", partId, "classification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      setOverrideDialogOpen(false);
      setOverrideReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to override classification", variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/parts/${partId}/classification/unlock`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Classification Unlocked", description: "Part will be auto-classified on next run" });
      queryClient.invalidateQueries({ queryKey: ["/api/parts", partId, "classification"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unlock classification", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Classification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const snapshot = data.latestSnapshot;
  const explanation = snapshot?.explanationJson;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SMART Classification
          </CardTitle>
          <div className="flex gap-2">
            {data.isLocked ? (
              <Button size="sm" variant="outline" onClick={() => unlockMutation.mutate()} data-testid="button-unlock-class">
                <Unlock className="h-4 w-4 mr-1" />
                Unlock
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setOverrideDialogOpen(true)} data-testid="button-override-class">
                <Lock className="h-4 w-4 mr-1" />
                Override
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setWhyDialogOpen(true)} data-testid="button-why-class">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Class</div>
              <Badge className={`text-lg px-3 py-1 ${classColors[data.currentClass || "C"]}`}>
                {data.currentClass || "-"}
                {data.isLocked && <Lock className="h-3 w-3 ml-1 inline" />}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Volatility</div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {data.currentXyz || "-"}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Score</div>
              <div className="text-lg font-bold">
                {data.priorityScore ? Number(data.priorityScore).toFixed(1) : "-"}
              </div>
            </div>
          </div>

          {data.currentXyz && (
            <div className="text-sm text-muted-foreground">
              {data.currentXyz}: {xyzDescriptions[data.currentXyz]}
            </div>
          )}

          {data.lastClassifiedAt && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last classified: {format(new Date(data.lastClassifiedAt), "MMM d, yyyy h:mm a")}
            </div>
          )}

          {(data.complianceOverride || data.traceabilityRequired) && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {data.complianceOverride && "Compliance Override"}
                {data.complianceOverride && data.traceabilityRequired && " + "}
                {data.traceabilityRequired && "Traceability Required"}
              </span>
            </div>
          )}

          {snapshot && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="font-medium">{Number(snapshot.costScore).toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Road Call</div>
                <div className="font-medium">{Number(snapshot.roadcallScore).toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Safety</div>
                <div className="font-medium">{Number(snapshot.safetyScore).toFixed(0)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Classification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Class</Label>
              <Select value={newClass} onValueChange={setNewClass}>
                <SelectTrigger data-testid="select-new-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">S - Safety/Compliance</SelectItem>
                  <SelectItem value="A">A - High Priority</SelectItem>
                  <SelectItem value="B">B - Medium Priority</SelectItem>
                  <SelectItem value="C">C - Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New XYZ (Optional)</Label>
              <Select value={newXyz} onValueChange={setNewXyz}>
                <SelectTrigger data-testid="select-new-xyz">
                  <SelectValue placeholder="Keep current" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="X">X - Steady Demand</SelectItem>
                  <SelectItem value="Y">Y - Moderate Variability</SelectItem>
                  <SelectItem value="Z">Z - Sporadic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why are you overriding the classification?"
                data-testid="input-override-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => overrideMutation.mutate({ newClass, newXyz: newXyz || undefined, reason: overrideReason })}
              disabled={!newClass || overrideMutation.isPending}
              data-testid="button-confirm-override"
            >
              Override & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={whyDialogOpen} onOpenChange={setWhyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Why This Classification?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {data.currentClass === "S" && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Class S - Safety/Compliance Override
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  This part is marked as Class S due to safety or compliance requirements.
                </div>
              </div>
            )}

            {explanation && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium">Cost Impact</h4>
                  <div className="text-sm text-muted-foreground">
                    Annual Spend: ${Number(explanation.costFactors?.annualSpend || 0).toFixed(2)}
                    <br />
                    Percentile Rank: {Number(explanation.costFactors?.percentileRank || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Road Call Impact</h4>
                  <div className="text-sm text-muted-foreground">
                    Road Calls: {explanation.roadcallFactors?.count || 0}
                    <br />
                    Downtime Hours: {Number(explanation.roadcallFactors?.downtimeHours || 0).toFixed(1)}
                    <br />
                    Percentile Rank: {Number(explanation.roadcallFactors?.percentileRank || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Safety Factors</h4>
                  <div className="text-sm text-muted-foreground">
                    Safety System: {explanation.safetyFactors?.safetySystem || "None"}
                    <br />
                    Failure Severity: {explanation.safetyFactors?.failureSeverity || 1} / 5
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Demand Volatility (XYZ)</h4>
                  <div className="text-sm text-muted-foreground">
                    Coefficient of Variation: {Number(explanation.xyzFactors?.cv || 0).toFixed(2)}
                    <br />
                    Non-zero Months: {explanation.xyzFactors?.nonZeroMonths || 0}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Final Score:</span>
                    <span className="font-bold">{Number(explanation.finalScore || 0).toFixed(1)}</span>
                  </div>
                  {explanation.leadTimeBonus > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Includes +{explanation.leadTimeBonus} lead time bonus
                    </div>
                  )}
                </div>
              </>
            )}

            {data.recentAuditLog.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recent Changes</h4>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {data.recentAuditLog.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="text-xs text-muted-foreground p-2 bg-muted rounded">
                      {format(new Date(entry.changedAt), "MMM d, yyyy")}: {entry.oldClass} → {entry.newClass}
                      {entry.isSystem ? " (Auto)" : " (Manual)"}
                      {entry.reason && ` - ${entry.reason}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
