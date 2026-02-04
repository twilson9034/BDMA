import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, AlertCircle } from "lucide-react";
import type { WorkOrderLine } from "@shared/schema";
import { Link } from "wouter";

interface DeferredLinesProps {
  workOrderId: number;
}

export function DeferredLines({ workOrderId }: DeferredLinesProps) {
  const { data: deferredLines, isLoading, isError } = useQuery<WorkOrderLine[]>({
    queryKey: [`/api/work-orders/${workOrderId}/deferred-lines`],
  });

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Deferred Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load deferred lines</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Deferred Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deferredLines || deferredLines.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Deferred Lines
          <Badge variant="secondary" className="ml-2">{deferredLines.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These items were deferred from other work orders to this one:
          </p>
          {deferredLines.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
              data-testid={`deferred-line-${line.id}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Line #{line.lineNumber}</Badge>
                  {line.vmrsCode && (
                    <Badge variant="secondary">{line.vmrsCode}</Badge>
                  )}
                </div>
                <p className="font-medium" data-testid={`deferred-line-description-${line.id}`}>{line.description}</p>
                {line.complaint && (
                  <p className="text-sm text-muted-foreground">{line.complaint}</p>
                )}
              </div>
              <Link href={`/work-orders/${line.workOrderId}`}>
                <a className="text-sm text-primary hover:underline flex items-center gap-1" data-testid={`link-original-wo-${line.id}`}>
                  Original WO
                  <ArrowRight className="h-3 w-3" />
                </a>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
