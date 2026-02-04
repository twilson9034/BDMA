import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Eye,
  ThumbsUp,
  XCircle
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import type { WorkOrder, Asset } from "@shared/schema";

export default function ReadyForReview() {
  const { toast } = useToast();
  const [selectedWOs, setSelectedWOs] = useState<number[]>([]);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const approveMutation = useMutation({
    mutationFn: async (woIds: number[]) => {
      const results = await Promise.all(
        woIds.map(id => apiRequest("PATCH", `/api/work-orders/${id}`, { 
          status: "completed",
          completedDate: new Date().toISOString(),
        }))
      );
      return results;
    },
    onSuccess: () => {
      toast({ title: "Success", description: `${selectedWOs.length} work order(s) approved` });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setSelectedWOs([]);
      setApproveDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/work-orders/${id}`, { 
        status: "in_progress",
        notes: reason,
      });
    },
    onSuccess: () => {
      toast({ title: "Work order returned", description: "Work order sent back for more work" });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setRejectDialogOpen(false);
      setSelectedWO(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject", variant: "destructive" });
    },
  });

  const reviewWOs = workOrders.filter(wo => wo.status === "ready_for_review");
  
  const getAssetName = (assetId: number | null) => {
    if (!assetId) return "-";
    const asset = assets.find(a => a.id === assetId);
    return asset?.name || `Asset #${assetId}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWOs(reviewWOs.map(wo => wo.id));
    } else {
      setSelectedWOs([]);
    }
  };

  const handleSelectOne = (woId: number, checked: boolean) => {
    if (checked) {
      setSelectedWOs([...selectedWOs, woId]);
    } else {
      setSelectedWOs(selectedWOs.filter(id => id !== woId));
    }
  };

  const criticalCount = reviewWOs.filter(wo => wo.priority === "critical" || wo.priority === "high").length;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Ready for Review"
        description="Work orders pending manager approval"
        actions={
          selectedWOs.length > 0 ? (
            <Button onClick={() => setApproveDialogOpen(true)} data-testid="button-batch-approve">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approve Selected ({selectedWOs.length})
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Review</p>
                <p className="text-2xl font-bold">{reviewWOs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedWOs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Orders Ready for Review</CardTitle>
          <CardDescription>
            Review completed work orders and approve or return for additional work
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : reviewWOs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No work orders pending review</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedWOs.length === reviewWOs.length && reviewWOs.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>WO Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewWOs.map((wo) => (
                  <TableRow key={wo.id} className={selectedWOs.includes(wo.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedWOs.includes(wo.id)}
                        onCheckedChange={(checked) => handleSelectOne(wo.id, checked as boolean)}
                        data-testid={`checkbox-wo-${wo.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/work-orders/${wo.id}`}>
                        <span className="font-medium text-primary hover:underline cursor-pointer">
                          {wo.workOrderNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{wo.title}</TableCell>
                    <TableCell>{getAssetName(wo.assetId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{wo.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(wo.priority)}>
                        {wo.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{wo.assignedToName || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/work-orders/${wo.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-view-wo-${wo.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedWOs([wo.id]);
                            setApproveDialogOpen(true);
                          }}
                          data-testid={`button-approve-wo-${wo.id}`}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWO(wo);
                            setRejectDialogOpen(true);
                          }}
                          data-testid={`button-reject-wo-${wo.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Return
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Work Orders</DialogTitle>
            <DialogDescription>
              You are about to approve {selectedWOs.length} work order(s). This will mark them as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The following work orders will be approved:
            </p>
            <ul className="mt-2 space-y-1">
              {selectedWOs.map(id => {
                const wo = reviewWOs.find(w => w.id === id);
                return wo ? (
                  <li key={id} className="text-sm">
                    <span className="font-medium">{wo.workOrderNumber}</span> - {wo.title}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(selectedWOs)}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Work Order</DialogTitle>
            <DialogDescription>
              {selectedWO?.workOrderNumber} - {selectedWO?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason for Return</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why this work order needs additional work..."
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedWO) {
                  rejectMutation.mutate({ id: selectedWO.id, reason: rejectReason });
                }
              }}
              disabled={rejectMutation.isPending || !rejectReason}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Returning..." : "Return Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
