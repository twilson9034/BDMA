import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Trash2, Clock, 
  Calendar, User, Wrench, AlertTriangle, CheckCircle2,
  Plus, X
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkOrder, Asset, WorkOrderLine } from "@shared/schema";

const workOrderFormSchema = z.object({
  description: z.string().optional(),
  type: z.enum(["preventive", "corrective", "inspection", "emergency", "project"]),
  status: z.enum(["open", "in_progress", "on_hold", "completed", "cancelled"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  failureCode: z.string().optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

interface WorkOrderWithDetails extends WorkOrder {
  assetName?: string;
  assetNumber?: string;
  locationName?: string;
}

export default function WorkOrderDetail() {
  const [, params] = useRoute("/work-orders/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const workOrderId = params?.id ? parseInt(params.id) : null;

  const { data: workOrder, isLoading } = useQuery<WorkOrderWithDetails>({
    queryKey: ["/api/work-orders", workOrderId],
    enabled: !!workOrderId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: workOrderLines } = useQuery<WorkOrderLine[]>({
    queryKey: ["/api/work-orders", workOrderId, "lines"],
    enabled: !!workOrderId,
  });

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      description: workOrder?.description || "",
      type: workOrder?.type || "corrective",
      status: workOrder?.status || "open",
      priority: workOrder?.priority || "medium",
      dueDate: workOrder?.dueDate ? new Date(workOrder.dueDate).toISOString().split('T')[0] : "",
      estimatedHours: workOrder?.estimatedHours || "",
      actualHours: workOrder?.actualHours || "",
      failureCode: workOrder?.failureCode || "",
      rootCause: workOrder?.rootCause || "",
      resolution: workOrder?.resolution || "",
      notes: workOrder?.notes || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      return apiRequest("PATCH", `/api/work-orders/${workOrderId}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Work Order Updated",
        description: "The work order has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/work-orders/${workOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Work Order Deleted",
        description: "The work order has been deleted.",
      });
      navigate("/work-orders");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete work order.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Work Order Not Found"
          description="The requested work order could not be found"
          actions={
            <Button variant="outline" onClick={() => navigate("/work-orders")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
      </div>
    );
  }

  const linkedAsset = assets?.find(a => a.id === workOrder.assetId);
  const autoTitle = `${workOrder.workOrderNumber} | ${linkedAsset?.assetNumber || 'No Asset'}`;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title={autoTitle}
        description={workOrder.description || "Work order details"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/work-orders")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} data-testid="button-delete">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <StatusBadge status={workOrder.status} />
        <PriorityBadge priority={workOrder.priority} />
        <span className="text-sm text-muted-foreground">{workOrder.type}</span>
      </div>

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Work Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="preventive">Preventive</SelectItem>
                              <SelectItem value="corrective">Corrective</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Time & Cost</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} data-testid="input-est-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="actualHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} data-testid="input-actual-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="failureCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Failure Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-failure-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rootCause"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Root Cause</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} data-testid="input-root-cause" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} data-testid="input-resolution" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save">
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Work Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Work Order #</p>
                  <p className="font-medium">{workOrder.workOrderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{workOrder.type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{workOrder.description || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset</p>
                  <p className="font-medium">{linkedAsset ? `${linkedAsset.assetNumber} - ${linkedAsset.name}` : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {workOrder.failureCode && (
                <div>
                  <p className="text-sm text-muted-foreground">Failure Code</p>
                  <p className="font-medium">{workOrder.failureCode}</p>
                </div>
              )}

              {workOrder.rootCause && (
                <div>
                  <p className="text-sm text-muted-foreground">Root Cause</p>
                  <p className="font-medium">{workOrder.rootCause}</p>
                </div>
              )}

              {workOrder.resolution && (
                <div>
                  <p className="text-sm text-muted-foreground">Resolution</p>
                  <p className="font-medium">{workOrder.resolution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time & Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Hours</p>
                  <p className="font-medium">{workOrder.estimatedHours || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Hours</p>
                  <p className="font-medium">{workOrder.actualHours || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="font-medium">
                    {workOrder.estimatedCost ? `$${parseFloat(workOrder.estimatedCost).toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Cost</p>
                  <p className="font-medium">
                    {workOrder.actualCost ? `$${parseFloat(workOrder.actualCost).toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {workOrder.startDate ? new Date(workOrder.startDate).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Date</p>
                  <p className="font-medium">
                    {workOrder.completedDate ? new Date(workOrder.completedDate).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {workOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{workOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Work Order Lines</CardTitle>
              <Button size="sm" data-testid="button-add-line">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent>
              {workOrderLines && workOrderLines.length > 0 ? (
                <div className="space-y-3">
                  {workOrderLines.map((line, index) => (
                    <div key={line.id} className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Line {line.lineNumber}: {line.description}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Labor: {line.laborHours || 0}h</span>
                          <span>Parts: ${line.partsCost || 0}</span>
                          <span className="capitalize">{line.status}</span>
                        </div>
                      </div>
                      <StatusBadge status={line.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No work order lines yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Work Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete work order {workOrder.workOrderNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
