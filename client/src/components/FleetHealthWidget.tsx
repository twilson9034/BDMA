import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, AlertTriangle, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useEventSource } from "@/hooks/use-event-source";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FleetHealth {
  overallScore: number;
  assetScores: {
    assetId: number;
    assetName: string;
    score: number;
    status: string;
  }[];
  criticalAlerts: number;
  highAlerts: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

export function FleetHealthWidget() {
  useEventSource("dashboard");

  const { data: health, isLoading } = useQuery<FleetHealth>({
    queryKey: ["/api/fleet/health"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Fleet Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = health?.overallScore || 0;
  const criticalAlerts = health?.criticalAlerts || 0;
  const highAlerts = health?.highAlerts || 0;
  const lowestAssets = health?.assetScores?.slice(0, 3) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">Fleet Health Score</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div>
              <div className="text-sm font-medium">{getScoreLabel(score)}</div>
              <div className="text-xs text-muted-foreground">Out of 100</div>
            </div>
          </div>
          {score >= 70 ? (
            <TrendingUp className="h-6 w-6 text-green-500" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-500" />
          )}
        </div>

        <Progress value={score} className={`h-2 ${getScoreBg(score)}`} />

        {(criticalAlerts > 0 || highAlerts > 0) && (
          <div className="flex gap-2">
            {criticalAlerts > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalAlerts} Critical
              </Badge>
            )}
            {highAlerts > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-500">
                <AlertTriangle className="h-3 w-3" />
                {highAlerts} High
              </Badge>
            )}
          </div>
        )}

        {lowestAssets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Needs Attention
            </p>
            {lowestAssets.filter(a => a.score < 70).map((asset) => (
              <Link key={asset.assetId} href={`/assets/${asset.assetId}`}>
                <div className="flex items-center justify-between p-2 rounded-md hover-elevate cursor-pointer">
                  <span className="text-sm truncate">{asset.assetName}</span>
                  <span className={`text-sm font-medium ${getScoreColor(asset.score)}`}>
                    {asset.score}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link href="/predictions">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            View All Predictions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
