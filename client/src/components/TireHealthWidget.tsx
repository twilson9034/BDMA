import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Circle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TireHealthData {
  totalTires: number;
  healthyTires: number;
  warningTires: number;
  criticalTires: number;
  averageTreadDepth: number;
  tiresNeedingReplacement: Array<{
    id: number;
    serialNumber: string;
    assetName: string;
    position: string;
    treadDepth: number;
    condition: string;
  }>;
}

export function TireHealthWidget() {
  const { data: tireHealth, isLoading } = useQuery<TireHealthData>({
    queryKey: ["/api/dashboard/tire-health"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Circle className="h-4 w-4" />
            Tire Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthData = tireHealth || {
    totalTires: 0,
    healthyTires: 0,
    warningTires: 0,
    criticalTires: 0,
    averageTreadDepth: 0,
    tiresNeedingReplacement: [],
  };

  const healthyPercent = healthData.totalTires > 0 
    ? Math.round((healthData.healthyTires / healthData.totalTires) * 100) 
    : 0;
  const warningPercent = healthData.totalTires > 0 
    ? Math.round((healthData.warningTires / healthData.totalTires) * 100) 
    : 0;
  const criticalPercent = healthData.totalTires > 0 
    ? Math.round((healthData.criticalTires / healthData.totalTires) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Circle className="h-4 w-4" />
          Tire Health
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tires">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {healthData.totalTires === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Circle className="h-8 w-8 mb-2" />
            <p className="text-sm">No tire data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {healthData.healthyTires}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {healthData.warningTires}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Warning</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {healthData.criticalTires}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fleet Tire Health</span>
                <span className="font-medium">{healthyPercent}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${healthyPercent}%` }} 
                />
                <div 
                  className="bg-amber-500 transition-all" 
                  style={{ width: `${warningPercent}%` }} 
                />
                <div 
                  className="bg-red-500 transition-all" 
                  style={{ width: `${criticalPercent}%` }} 
                />
              </div>
            </div>

            {healthData.averageTreadDepth > 0 && (
              <div className="flex justify-between items-center p-2 rounded-lg border border-border">
                <span className="text-sm text-muted-foreground">Avg Tread Depth</span>
                <span className="font-medium">{healthData.averageTreadDepth.toFixed(1)}/32"</span>
              </div>
            )}

            {healthData.tiresNeedingReplacement.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Needs Replacement</p>
                {healthData.tiresNeedingReplacement.slice(0, 3).map((tire) => (
                  <div 
                    key={tire.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                  >
                    <div>
                      <span className="font-medium">{tire.serialNumber}</span>
                      <span className="text-muted-foreground ml-2">{tire.position}</span>
                    </div>
                    <span className="text-red-600 dark:text-red-400">
                      {tire.treadDepth}/32"
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
