import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Square, Clock, User, DollarSign, Trash2 } from "lucide-react";
import type { LaborEntry } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface LaborTrackerProps {
  workOrderId: number;
  workOrderLineId?: number;
}

export function LaborTracker({ workOrderId, workOrderLineId }: LaborTrackerProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [elapsedTime, setElapsedTime] = useState<Record<number, number>>({});

  const { data: laborEntries, isLoading } = useQuery<LaborEntry[]>({
    queryKey: ["/api/work-orders", workOrderId, "labor-entries"],
    queryFn: () => fetch(`/api/work-orders/${workOrderId}/labor-entries`).then(r => r.json()),
  });

  const { data: activeEntries } = useQuery<LaborEntry[]>({
    queryKey: ["/api/labor-entries/active"],
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/labor-entries", {
        workOrderId,
        workOrderLineId,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "labor-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labor-entries/active"] });
      setNotes("");
      toast({ title: "Timer Started", description: "Time tracking has begun." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start timer.", variant: "destructive" });
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest("PATCH", `/api/labor-entries/${entryId}`, { status: "paused" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "labor-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labor-entries/active"] });
      toast({ title: "Timer Paused" });
    },
  });

  const resumeTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest("PATCH", `/api/labor-entries/${entryId}`, { status: "running" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "labor-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labor-entries/active"] });
      toast({ title: "Timer Resumed" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest("POST", `/api/labor-entries/${entryId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "labor-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labor-entries/active"] });
      toast({ title: "Timer Stopped", description: "Time entry has been saved." });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest("DELETE", `/api/labor-entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "labor-entries"] });
      toast({ title: "Entry Deleted" });
    },
  });

  useEffect(() => {
    const runningEntries = laborEntries?.filter(e => e.status === "running") || [];
    
    if (runningEntries.length === 0) return;

    const interval = setInterval(() => {
      const newElapsed: Record<number, number> = {};
      runningEntries.forEach(entry => {
        const start = new Date(entry.startTime).getTime();
        const now = Date.now();
        const pausedSeconds = entry.pausedDuration || 0;
        newElapsed[entry.id] = Math.floor((now - start) / 1000) - pausedSeconds;
      });
      setElapsedTime(newElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [laborEntries]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const hasActiveTimer = laborEntries?.some(e => e.status === "running" || e.status === "paused");

  const totalCompletedHours = laborEntries
    ?.filter(e => e.status === "completed")
    .reduce((sum, e) => sum + parseFloat(e.calculatedHours || "0"), 0) || 0;

  const totalLaborCost = laborEntries
    ?.filter(e => e.status === "completed")
    .reduce((sum, e) => sum + parseFloat(e.laborCost || "0"), 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Labor Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!laborEntries || laborEntries.length === 0) && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No time entries yet. Start a timer on a work order line to track labor.
          </div>
        )}
        {laborEntries && laborEntries.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Time Entries</div>
            {laborEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                data-testid={`labor-entry-${entry.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        entry.status === "running" ? "default" :
                        entry.status === "paused" ? "secondary" : "outline"
                      }
                    >
                      {entry.status}
                    </Badge>
                    {entry.status === "running" && elapsedTime[entry.id] && (
                      <span className="font-mono text-sm font-medium">
                        {formatDuration(elapsedTime[entry.id])}
                      </span>
                    )}
                    {entry.status === "completed" && entry.calculatedHours && (
                      <span className="text-sm text-muted-foreground">
                        {parseFloat(entry.calculatedHours).toFixed(2)} hrs
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Started: {format(new Date(entry.startTime), "MMM d, h:mm a")}
                    {entry.endTime && (
                      <> - Ended: {format(new Date(entry.endTime), "h:mm a")}</>
                    )}
                  </div>
                  {entry.notes && (
                    <div className="text-sm">{entry.notes}</div>
                  )}
                  {entry.laborCost && parseFloat(entry.laborCost) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      ${parseFloat(entry.laborCost).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Timer controls (pause/stop) removed - available on work order lines only */}
                  {entry.status === "completed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      data-testid={`button-delete-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalCompletedHours > 0 && (
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Hours:</span>
              <span className="font-medium">{totalCompletedHours.toFixed(2)} hrs</span>
            </div>
            {totalLaborCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Labor Cost:</span>
                <span className="font-medium">${totalLaborCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            Loading time entries...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
