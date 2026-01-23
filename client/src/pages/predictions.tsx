import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Brain, AlertTriangle, Wrench, Clock, TrendingUp, CheckCircle2, X, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prediction, Asset } from "@shared/schema";

interface PredictionWithAsset extends Prediction {
  assetName?: string;
  assetNumber?: string;
}

export default function Predictions() {
  const { toast } = useToast();
  
  const { data: predictions, isLoading } = useQuery<PredictionWithAsset[]>({
    queryKey: ["/api/predictions"],
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
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

  const getAssetInfo = (assetId: number) => {
    const asset = assets?.find(a => a.id === assetId);
    return asset ? { name: asset.name, number: asset.assetNumber } : null;
  };

  const mockPredictions: PredictionWithAsset[] = [
    {
      id: 1,
      assetId: 1,
      assetName: "Freightliner Cascadia",
      assetNumber: "TRK-1024",
      predictionType: "component_failure",
      prediction: "Brake system wear detected - estimated 2000 miles remaining",
      confidence: "0.87",
      recommendedAction: "Schedule brake inspection within next 7 days",
      estimatedCost: "450.00",
      dueDate: new Date("2024-01-22"),
      acknowledged: false,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      assetId: 2,
      assetName: "Ford Transit 350",
      assetNumber: "VAN-3012",
      predictionType: "maintenance_optimization",
      prediction: "Oil change interval can be extended by 500 miles based on usage pattern",
      confidence: "0.92",
      recommendedAction: "Adjust PM schedule from 5000 to 5500 miles",
      estimatedCost: null,
      dueDate: null,
      acknowledged: true,
      createdAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      assetId: 4,
      assetName: "Caterpillar GP25N",
      assetNumber: "LIFT-001",
      predictionType: "component_failure",
      prediction: "Battery showing signs of degradation - expect failure within 30 days",
      confidence: "0.78",
      recommendedAction: "Order replacement battery and schedule installation",
      estimatedCost: "250.00",
      dueDate: new Date("2024-02-15"),
      acknowledged: false,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 4,
      assetId: 3,
      assetName: "Blue Bird Vision",
      assetNumber: "BUS-5001",
      predictionType: "fuel_efficiency",
      prediction: "Fuel efficiency decreased by 8% over last month",
      confidence: "0.95",
      recommendedAction: "Check air filter and tire pressure",
      estimatedCost: "75.00",
      dueDate: new Date("2024-01-20"),
      acknowledged: false,
      createdAt: new Date("2024-01-15"),
    },
  ];

  const displayPredictions = predictions?.length ? predictions : mockPredictions;
  const unacknowledged = displayPredictions.filter((p) => !p.acknowledged);
  const highConfidence = displayPredictions.filter((p) => Number(p.confidence) >= 0.85);

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
                <p className="text-sm text-muted-foreground">Est. Savings</p>
                <p className="text-2xl font-bold">$12,450</p>
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
