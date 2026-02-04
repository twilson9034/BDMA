import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  X,
  Sparkles
} from "lucide-react";
import { useEventSource } from "@/hooks/use-event-source";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: number;
  assetId: number;
  predictionType: string;
  prediction: string;
  confidence: string | null;
  severity: string;
  reasoning: string | null;
  dataPoints: string[] | null;
  recommendedAction: string | null;
  estimatedCost: string | null;
  dueDate: string | null;
  acknowledged: boolean;
  dismissedAt: string | null;
  createdAt: string;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "destructive";
    case "high": return "outline";
    case "medium": return "secondary";
    default: return "secondary";
  }
}

function getSeverityBorder(severity: string): string {
  switch (severity) {
    case "critical": return "border-l-red-500";
    case "high": return "border-l-orange-500";
    case "medium": return "border-l-yellow-500";
    default: return "border-l-blue-500";
  }
}

export function PredictionsWidget() {
  const { toast } = useToast();

  useEventSource("dashboard");
  
  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions"],
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">AI Predictions</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePredictions = predictions?.filter(
    p => !p.acknowledged && !p.dismissedAt
  ).slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Predictions
        </CardTitle>
        <Brain className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {activePredictions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No active predictions</p>
            <p className="text-xs">Your fleet is healthy!</p>
          </div>
        ) : (
          <>
            {activePredictions.map((prediction) => (
              <div
                key={prediction.id}
                className={`p-3 rounded-lg border-l-4 bg-muted/50 ${getSeverityBorder(prediction.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(prediction.severity) as any}>
                        {prediction.severity}
                      </Badge>
                      {prediction.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(parseFloat(prediction.confidence) * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{prediction.prediction}</p>
                    {prediction.recommendedAction && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {prediction.recommendedAction}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {prediction.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(prediction.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {prediction.estimatedCost && (
                        <span>Est. ${parseFloat(prediction.estimatedCost).toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => acknowledgeMutation.mutate(prediction.id)}
                      disabled={acknowledgeMutation.isPending}
                      title="Acknowledge"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => dismissMutation.mutate(prediction.id)}
                      disabled={dismissMutation.isPending}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Link href="/predictions">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                View All ({predictions?.length || 0} total)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
