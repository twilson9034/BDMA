import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Brain, AlertTriangle, Wrench, Clock, TrendingUp, CheckCircle2, X, Sparkles, Info, MessageSquare, Calendar, Ban, CircleAlert, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prediction, Asset, WorkOrder } from "@shared/schema";

interface PredictionWithAsset extends Prediction {
  assetName?: string;
  assetNumber?: string;
}

export default function Predictions() {
  const { toast } = useToast();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionWithAsset | null>(null);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [linkedWorkOrderId, setLinkedWorkOrderId] = useState<string>("");
  
  const { data: predictions, isLoading } = useQuery<PredictionWithAsset[]>({
    queryKey: ["/api/predictions"],
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/predictions/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/health"] });
      toast({ title: "Prediction acknowledged" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/predictions/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/health"] });
      toast({ title: "Prediction dismissed" });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ id, feedbackType, feedbackNotes, linkedWorkOrderId }: { 
      id: number; 
      feedbackType: string; 
      feedbackNotes?: string; 
      linkedWorkOrderId?: number;
    }) => {
      await apiRequest("PATCH", `/api/predictions/${id}/feedback`, { 
        feedbackType, 
        feedbackNotes, 
        linkedWorkOrderId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      toast({ title: "Feedback submitted", description: "Thank you for helping improve AI predictions" });
      setFeedbackDialogOpen(false);
      resetFeedbackForm();
    },
  });

  const resetFeedbackForm = () => {
    setSelectedPrediction(null);
    setFeedbackType("");
    setFeedbackNotes("");
    setLinkedWorkOrderId("");
  };

  const openFeedbackDialog = (prediction: PredictionWithAsset) => {
    setSelectedPrediction(prediction);
    setFeedbackDialogOpen(true);
  };

  const submitFeedback = () => {
    if (!selectedPrediction || !feedbackType) return;
    feedbackMutation.mutate({
      id: selectedPrediction.id,
      feedbackType,
      feedbackNotes: feedbackNotes || undefined,
      linkedWorkOrderId: linkedWorkOrderId ? parseInt(linkedWorkOrderId) : undefined,
    });
  };

  const getFeedbackLabel = (type: string) => {
    switch (type) {
      case "completed_repair": return "Completed Repair";
      case "scheduled": return "Scheduled for Later";
      case "not_needed": return "Not Needed";
      case "false_positive": return "False Positive";
      case "deferred": return "Deferred";
      default: return type;
    }
  };

  const getAssetInfo = (assetId: number) => {
    const asset = assets?.find(a => a.id === assetId);
    return asset ? { name: asset.name, number: asset.assetNumber } : null;
  };

  // Enrich predictions with asset info
  const displayPredictions = (predictions || []).map(p => {
    const assetInfo = getAssetInfo(p.assetId);
    return {
      ...p,
      assetName: assetInfo?.name || "Unknown Asset",
      assetNumber: assetInfo?.number || "N/A",
    };
  });
  const unacknowledged = displayPredictions.filter((p) => !p.acknowledged);
  const highConfidence = displayPredictions.filter((p) => Number(p.confidence) >= 0.85);
  
  // Calculate estimated savings from all predictions with estimated costs
  const totalEstimatedSavings = displayPredictions
    .filter(p => p.estimatedCost)
    .reduce((sum, p) => sum + Number(p.estimatedCost || 0), 0);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "component_failure":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
      case "maintenance_optimization":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30";
      case "fuel_efficiency":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatType = (type: string) => {
    return type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="AI Predictions"
        description="AI-powered predictive maintenance insights"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Predictions</p>
                <p className="text-2xl font-bold">{unacknowledged.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {highConfidence.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Costs</p>
                <p className="text-2xl font-bold">${totalEstimatedSavings.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {displayPredictions.length === 0 && !isLoading ? (
        <EmptyState
          icon={Brain}
          title="No predictions yet"
          description="AI predictions will appear as your maintenance data grows"
        />
      ) : (
        <div className="space-y-4">
          {displayPredictions.map((prediction) => (
            <Card
              key={prediction.id}
              className={`hover-elevate transition-all ${prediction.acknowledged ? "opacity-60" : ""}`}
              data-testid={`prediction-${prediction.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getTypeColor(prediction.predictionType)}>
                            {formatType(prediction.predictionType)}
                          </Badge>
                          {prediction.acknowledged && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Acknowledged</Badge>
                          )}
                          {prediction.dismissedAt && (
                            <Badge variant="outline" className="bg-muted">Dismissed</Badge>
                          )}
                        </div>
                        <p className="font-medium">{prediction.assetNumber} - {prediction.assetName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="font-medium">{Math.round(Number(prediction.confidence) * 100)}%</span>
                        </div>
                        <Progress
                          value={Number(prediction.confidence) * 100}
                          className="h-1.5 w-20 mt-1"
                        />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{prediction.prediction}</p>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>{prediction.recommendedAction}</span>
                      </div>
                    </div>

                    {prediction.reasoning && (
                      <div className="bg-muted/30 p-3 rounded-lg text-sm mt-3">
                        <p className="font-medium mb-1">AI Reasoning:</p>
                        <p className="text-muted-foreground italic">{prediction.reasoning}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {prediction.estimatedCost && (
                          <span>Est. Cost: ${Number(prediction.estimatedCost).toFixed(2)}</span>
                        )}
                        {prediction.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(prediction.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {prediction.feedbackType && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                            {getFeedbackLabel(prediction.feedbackType)}
                          </Badge>
                        )}
                      </div>
                      {!prediction.acknowledged && !prediction.dismissedAt && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => dismissMutation.mutate(prediction.id)}
                            disabled={dismissMutation.isPending}
                            data-testid={`button-dismiss-${prediction.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate(prediction.id)}
                            disabled={acknowledgeMutation.isPending}
                            data-testid={`button-ack-${prediction.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        </div>
                      )}
                      {prediction.acknowledged && !prediction.feedbackType && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => openFeedbackDialog(prediction)}
                          data-testid={`button-feedback-${prediction.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Provide Feedback
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={feedbackDialogOpen} onOpenChange={(open) => {
        setFeedbackDialogOpen(open);
        if (!open) resetFeedbackForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prediction Feedback</DialogTitle>
            <DialogDescription>
              Help improve AI predictions by sharing what action was taken
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPrediction && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{selectedPrediction.assetNumber} - {selectedPrediction.assetName}</p>
                <p className="text-muted-foreground mt-1">{selectedPrediction.prediction}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>What action was taken?</Label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger data-testid="select-feedback-type">
                  <SelectValue placeholder="Select feedback type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed_repair">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Completed Repair
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Scheduled for Later
                    </div>
                  </SelectItem>
                  <SelectItem value="not_needed">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Not Needed
                    </div>
                  </SelectItem>
                  <SelectItem value="false_positive">
                    <div className="flex items-center gap-2">
                      <CircleAlert className="h-4 w-4" />
                      False Positive
                    </div>
                  </SelectItem>
                  <SelectItem value="deferred">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Deferred
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(feedbackType === "completed_repair" || feedbackType === "scheduled") && (
              <div className="space-y-2">
                <Label>Link to Work Order (optional)</Label>
                <Select value={linkedWorkOrderId} onValueChange={setLinkedWorkOrderId}>
                  <SelectTrigger data-testid="select-linked-wo">
                    <SelectValue placeholder="Select work order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {workOrders?.filter(wo => 
                      wo.assetId === selectedPrediction?.assetId
                    ).map((wo) => (
                      <SelectItem key={wo.id} value={wo.id.toString()}>
                        {wo.workOrderNumber} - {wo.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Any additional context about this prediction..."
                rows={3}
                data-testid="input-feedback-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitFeedback} 
              disabled={!feedbackType || feedbackMutation.isPending}
              data-testid="button-submit-feedback"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
