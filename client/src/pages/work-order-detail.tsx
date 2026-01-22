import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Trash2, Clock, 
  Calendar, User, Wrench, AlertTriangle, CheckCircle2,
  Plus, X, Play, Square, Timer, Package, CalendarClock,
  Sparkles, Lightbulb
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
import { Badge } from "@/components/ui/badge";
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
import type { WorkOrder, Asset, WorkOrderLine, Part, VmrsCode, WorkOrderTransaction } from "@shared/schema";

const workOrderFormSchema = z.object({
  description: z.string().optional(),
  type: z.enum(["preventive", "corrective", "inspection", "emergency", "project"]),
  status: z.enum(["open", "in_progress", "on_hold", "ready_for_review", "completed", "cancelled"]),
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
  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const [newLineDescription, setNewLineDescription] = useState("");
  const [selectedVmrsCodeId, setSelectedVmrsCodeId] = useState<string>("");
  const [newLineComplaint, setNewLineComplaint] = useState("");
  const [newLineCause, setNewLineCause] = useState("");
  const [newLineCorrection, setNewLineCorrection] = useState("");
  const [newLineNotes, setNewLineNotes] = useState("");
  const [newLinePartId, setNewLinePartId] = useState<string>("");
  const [newLineQuantity, setNewLineQuantity] = useState("1");
  const [newLinePartsCost, setNewLinePartsCost] = useState("");
  
  const [showAddItemDialog, setShowAddItemDialog] = useState<number | null>(null);
  const [addItemType, setAddItemType] = useState<"inventory" | "non-inventory">("inventory");
  const [addItemPartId, setAddItemPartId] = useState("");
  const [addItemDescription, setAddItemDescription] = useState("");
  const [addItemQuantity, setAddItemQuantity] = useState("1");
  const [addItemUnitCost, setAddItemUnitCost] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsVmrs, setSuggestionsVmrs] = useState<string | null>(null);

  const handleVmrsCodeSelect = (vmrsCodeId: string) => {
    setSelectedVmrsCodeId(vmrsCodeId);
    if (vmrsCodeId) {
      const selectedCode = vmrsCodes.find(c => c.id.toString() === vmrsCodeId);
      if (selectedCode) {
        setNewLineDescription(selectedCode.description || selectedCode.title);
      }
    } else {
      setNewLineDescription("");
    }
  };

  const requestPartMutation = useMutation({
    mutationFn: async ({ lineId, partId, quantity }: { lineId: number; partId: number; quantity: number }) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/request-part`, { partId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      toast({ title: "Part Requested", description: "Request has been sent to parts department." });
    },
  });

  const postPartMutation = useMutation({
    mutationFn: async ({ lineId, partId, quantity }: { lineId: number; partId: number; quantity: number }) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/post-part`, { partId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Part Posted", description: "Part has been consumed and cost applied." });
    },
  });

  const { data: workOrder, isLoading } = useQuery<WorkOrderWithDetails>({
    queryKey: ["/api/work-orders", workOrderId],
    enabled: !!workOrderId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: parts } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  // Smart part suggestions based on VMRS code and asset make/model
  const suggestionsQueryParams = suggestionsVmrs ? new URLSearchParams({
    vmrsCode: suggestionsVmrs,
    ...(linkedAsset?.manufacturer && { manufacturer: linkedAsset.manufacturer }),
    ...(linkedAsset?.model && { model: linkedAsset.model }),
    ...(linkedAsset?.year && { year: linkedAsset.year.toString() }),
  }).toString() : "";
  
  const { data: smartSuggestions, isLoading: suggestionsLoading } = useQuery<{
    historical: { partId: number; partNumber: string; partName: string | null; usageCount: number }[];
    source: string;
  }>({
    queryKey: [`/api/smart-part-suggestions?${suggestionsQueryParams}`],
    enabled: !!suggestionsVmrs && showSuggestions,
  });

  const { data: vmrsCodes = [] } = useQuery<VmrsCode[]>({
    queryKey: ["/api/vmrs-codes"],
  });

  const { data: workOrderLines } = useQuery<WorkOrderLine[]>({
    queryKey: ["/api/work-orders", workOrderId, "lines"],
    enabled: !!workOrderId,
  });

  // Update active timers every second for lines that are in_progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (workOrderLines) {
        const newTimers: Record<number, number> = {};
        workOrderLines.forEach(line => {
          if (line.status === "in_progress" && line.startTime) {
            const elapsed = (Date.now() - new Date(line.startTime).getTime()) / 1000;
            newTimers[line.id] = elapsed;
          }
        });
        setActiveTimers(newTimers);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [workOrderLines]);

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

  const createLineMutation = useMutation({
    mutationFn: async (data: { 
      description: string; 
      vmrsCode?: string;
      vmrsTitle?: string;
      complaint?: string;
      cause?: string;
      correction?: string;
      notes?: string;
      partId?: number; 
      quantity?: number; 
      unitCost?: string; 
      partsCost?: string 
    }) => {
      return apiRequest("POST", `/api/work-orders/${workOrderId}/lines`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Line Added", description: "Work order line has been added." });
      setShowAddLineDialog(false);
      setNewLineDescription("");
      setSelectedVmrsCodeId("");
      setNewLineComplaint("");
      setNewLineCause("");
      setNewLineCorrection("");
      setNewLineNotes("");
      setNewLinePartId("");
      setNewLineQuantity("1");
      setNewLinePartsCost("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add line.", variant: "destructive" });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async (lineId: number) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/start-timer`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      toast({ title: "Timer Started", description: "Time tracking has begun for this task." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start timer.", variant: "destructive" });
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async (lineId: number) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/pause-timer`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      toast({ title: "Timer Paused", description: "Time tracking paused. Resume when ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to pause timer.", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async ({ lineId, complete }: { lineId: number; complete: boolean }) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/stop-timer`, { complete });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Line Closed", description: "Work order line has been completed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to close line.", variant: "destructive" });
    },
  });

  const rescheduleLineMutation = useMutation({
    mutationFn: async (lineId: number) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/reschedule`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Line Rescheduled", description: "Work order line has been rescheduled for a future work order." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reschedule line.", variant: "destructive" });
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: number) => {
      return apiRequest("DELETE", `/api/work-order-lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      toast({ title: "Line Deleted", description: "Work order line has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete line.", variant: "destructive" });
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({ lineId, data }: { lineId: number; data: Partial<{ notes: string; complaint: string; cause: string; correction: string }> }) => {
      return apiRequest("PATCH", `/api/work-order-lines/${lineId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      toast({ title: "Saved", description: "Changes saved automatically." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ lineId, description, quantity, unitCost, partId }: { 
      lineId: number; 
      description: string; 
      quantity: number; 
      unitCost: number; 
      partId?: number 
    }) => {
      return apiRequest("POST", `/api/work-order-lines/${lineId}/add-item`, { description, quantity, unitCost, partId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Item Added", description: "Part/item has been added to the line." });
      setShowAddItemDialog(null);
      setAddItemType("inventory");
      setAddItemPartId("");
      setAddItemDescription("");
      setAddItemQuantity("1");
      setAddItemUnitCost("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    },
  });

  const [editedLineFields, setEditedLineFields] = useState<Record<string, string>>({});
  const [autoSaveTimers, setAutoSaveTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const handleLineFieldChange = (lineId: number, field: 'notes' | 'complaint' | 'cause' | 'correction', value: string) => {
    const key = `${lineId}-${field}`;
    setEditedLineFields(prev => ({ ...prev, [key]: value }));
    
    if (autoSaveTimers[key]) {
      clearTimeout(autoSaveTimers[key]);
    }
    
    const timer = setTimeout(() => {
      updateLineMutation.mutate({ lineId, data: { [field]: value } });
    }, 1500);
    
    setAutoSaveTimers(prev => ({ ...prev, [key]: timer }));
  };

  const getLineFieldValue = (lineId: number, field: 'notes' | 'complaint' | 'cause' | 'correction', originalValue: string | null) => {
    const key = `${lineId}-${field}`;
    return editedLineFields[key] !== undefined ? editedLineFields[key] : (originalValue || '');
  };

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddLine = () => {
    if (!selectedVmrsCodeId) {
      toast({ title: "Validation Error", description: "Please select a VMRS code", variant: "destructive" });
      return;
    }
    const selectedVmrs = vmrsCodes.find(c => c.id.toString() === selectedVmrsCodeId);
    if (!selectedVmrs) return;
    
    const selectedPart = newLinePartId ? parts?.find(p => p.id.toString() === newLinePartId) : null;
    const quantity = parseInt(newLineQuantity) || 1;
    const unitCost = selectedPart?.unitCost || newLinePartsCost || undefined;
    const totalPartsCost = selectedPart && unitCost ? (parseFloat(unitCost) * quantity).toFixed(2) : newLinePartsCost || undefined;
    
    createLineMutation.mutate({
      description: selectedVmrs.description || selectedVmrs.title,
      vmrsCode: selectedVmrs.code,
      vmrsTitle: selectedVmrs.title,
      complaint: newLineComplaint || undefined,
      cause: newLineCause || undefined,
      correction: newLineCorrection || undefined,
      notes: newLineNotes || undefined,
      partId: selectedPart ? selectedPart.id : undefined,
      quantity: selectedPart ? quantity : undefined,
      unitCost: unitCost,
      partsCost: totalPartsCost,
    });
  };

  const handleAddItem = () => {
    if (!showAddItemDialog) return;
    
    if (addItemType === "inventory") {
      const selectedPart = parts?.find(p => p.id.toString() === addItemPartId);
      if (!selectedPart) return;
      
      addItemMutation.mutate({
        lineId: showAddItemDialog,
        description: `${selectedPart.partNumber} - ${selectedPart.name}`,
        quantity: parseFloat(addItemQuantity) || 1,
        unitCost: parseFloat(selectedPart.unitCost || "0"),
        partId: selectedPart.id,
      });
    } else {
      if (!addItemDescription) return;
      
      addItemMutation.mutate({
        lineId: showAddItemDialog,
        description: addItemDescription,
        quantity: parseFloat(addItemQuantity) || 1,
        unitCost: parseFloat(addItemUnitCost) || 0,
      });
    }
  };

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
                              <SelectItem value="ready_for_review">Ready for Review</SelectItem>
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
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Actual Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    ${Number(workOrder.actualCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Actual Hours</p>
                  <p className="text-2xl font-bold text-primary">
                    {workOrder.actualHours || "0.00"} <span className="text-sm font-normal text-muted-foreground">hrs</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Hours</p>
                  <p className="font-medium">{workOrder.estimatedHours || "0.00"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="font-medium">
                    {workOrder.estimatedCost ? `$${parseFloat(workOrder.estimatedCost).toFixed(2)}` : "$0.00"}
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
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Work Order Lines
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddLineDialog(true)} data-testid="button-add-line">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent>
              {workOrderLines && workOrderLines.length > 0 ? (
                <div className="space-y-4">
                  {workOrderLines.map((line) => (
                    <div key={line.id} className="p-4 rounded-lg bg-muted/50 border border-border/50" data-testid={`line-${line.id}`}>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                {line.lineNumber}
                              </span>
                              <p className="font-medium text-lg">{line.description}</p>
                            </div>
                            {line.vmrsTitle && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-semibold">VMRS:</span> {line.vmrsTitle} ({line.vmrsCode})
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={line.status} />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => deleteLineMutation.mutate(line.id)}
                              disabled={deleteLineMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                              Complaint
                              {updateLineMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            </p>
                            <Textarea
                              placeholder="Describe the complaint..."
                              className="min-h-[60px] bg-background/50"
                              value={getLineFieldValue(line.id, 'complaint', line.complaint)}
                              onChange={(e) => handleLineFieldChange(line.id, 'complaint', e.target.value)}
                              data-testid={`input-line-complaint-${line.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                              Cause
                              {updateLineMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            </p>
                            <Textarea
                              placeholder="Identify the cause..."
                              className="min-h-[60px] bg-background/50"
                              value={getLineFieldValue(line.id, 'cause', line.cause)}
                              onChange={(e) => handleLineFieldChange(line.id, 'cause', e.target.value)}
                              data-testid={`input-line-cause-${line.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                              Correction
                              {updateLineMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            </p>
                            <Textarea
                              placeholder="Describe the correction..."
                              className="min-h-[60px] bg-background/50"
                              value={getLineFieldValue(line.id, 'correction', line.correction)}
                              onChange={(e) => handleLineFieldChange(line.id, 'correction', e.target.value)}
                              data-testid={`input-line-correction-${line.id}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            Notes
                            {updateLineMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                          </p>
                          <Textarea
                            placeholder="Add technician notes..."
                            className="min-h-[60px] bg-background/50"
                            value={getLineFieldValue(line.id, 'notes', line.notes)}
                            onChange={(e) => handleLineFieldChange(line.id, 'notes', e.target.value)}
                            data-testid={`input-line-notes-${line.id}`}
                          />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Parts Used</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setShowAddItemDialog(line.id);
                                setAddItemType("inventory");
                                setAddItemPartId("");
                                setAddItemDescription("");
                                setAddItemQuantity("1");
                                setAddItemUnitCost("");
                              }}
                              data-testid={`button-add-part-${line.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Part/Item
                            </Button>
                          </div>
                          {Number(line.partsCost || 0) > 0 ? (
                            <div className="text-sm text-muted-foreground bg-background/50 p-2 rounded border border-border/30">
                              Total parts cost: <span className="font-medium text-foreground">${line.partsCost}</span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No parts added yet</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {line.laborHours || 0}h labor
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              ${line.partsCost || 0} parts
                            </span>
                            {line.partRequestStatus !== 'none' && (
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {line.partRequestStatus}
                              </Badge>
                            )}
                          </div>

                          <div className="flex-1" />

                          <div className="flex items-center gap-2">
                            {line.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => startTimerMutation.mutate(line.id)}
                                disabled={startTimerMutation.isPending}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}
                            {line.status === "in_progress" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => pauseTimerMutation.mutate(line.id)}
                                  disabled={pauseTimerMutation.isPending}
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  Pause
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => stopTimerMutation.mutate({ lineId: line.id, complete: true })}
                                  disabled={stopTimerMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Close Line
                                </Button>
                              </div>
                            )}
                            {line.status === "paused" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => startTimerMutation.mutate(line.id)}
                                  disabled={startTimerMutation.isPending}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Resume
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => stopTimerMutation.mutate({ lineId: line.id, complete: true })}
                                  disabled={stopTimerMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Close Line
                                </Button>
                              </div>
                            )}
                            {line.status === "completed" && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 h-8 px-3">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed {line.completedAt && `on ${new Date(line.completedAt).toLocaleDateString()}`}
                                </Badge>
                              </div>
                            )}
                            {line.status === "rescheduled" && (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 h-8 px-3">
                                <CalendarClock className="h-3 w-3 mr-1" />
                                Rescheduled
                              </Badge>
                            )}
                            {line.status !== "completed" && line.status !== "rescheduled" && line.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-amber-600 border-amber-200"
                                onClick={() => rescheduleLineMutation.mutate(line.id)}
                                disabled={rescheduleLineMutation.isPending}
                              >
                                <CalendarClock className="h-3 w-3 mr-1" />
                                Reschedule
                              </Button>
                            )}

                            {line.partRequestStatus === 'none' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                onClick={() => {
                                  const partId = prompt("Enter Part ID to Request");
                                  const qty = prompt("Enter Quantity", "1");
                                  if (partId && qty) {
                                    requestPartMutation.mutate({ 
                                      lineId: line.id, 
                                      partId: parseInt(partId), 
                                      quantity: parseFloat(qty) 
                                    });
                                  }
                                }}
                              >
                                Request Part
                              </Button>
                            )}
                            {(line.partRequestStatus === 'requested' || line.partRequestStatus === 'received') && (
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  const partId = prompt("Enter Part ID to Post");
                                  const qty = prompt("Enter Quantity", "1");
                                  if (partId && qty) {
                                    postPartMutation.mutate({ 
                                      lineId: line.id, 
                                      partId: parseInt(partId), 
                                      quantity: parseFloat(qty) 
                                    });
                                  }
                                }}
                              >
                                Post Part
                              </Button>
                            )}
                          </div>
                        </div>

                        {line.status === "in_progress" && activeTimers[line.id] && (
                          <div className="flex items-center gap-2 mt-2 text-primary font-mono text-xl justify-center bg-primary/5 py-2 rounded">
                            <Timer className="h-5 w-5 animate-pulse" />
                            {formatElapsedTime(activeTimers[line.id])}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No work order lines yet. Add a line to track labor and parts.</p>
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

      <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Work Order Line</DialogTitle>
            <DialogDescription>
              Select a VMRS code to add a maintenance task. Description auto-fills from the code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">VMRS Code *</label>
              <Select value={selectedVmrsCodeId} onValueChange={handleVmrsCodeSelect}>
                <SelectTrigger data-testid="select-vmrs-code">
                  <SelectValue placeholder="Select a VMRS code..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {vmrsCodes.length > 0 ? (
                    vmrsCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id.toString()}>
                        <span className="font-mono">{code.code}</span> - {code.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No VMRS codes available. Add them in Settings.</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedVmrsCodeId && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Description (auto-filled)</label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {newLineDescription || "No description available"}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Complaint</label>
                <Textarea 
                  placeholder="Reason for repair" 
                  className="h-20"
                  value={newLineComplaint} 
                  onChange={(e) => setNewLineComplaint(e.target.value)} 
                  data-testid="input-line-complaint"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Cause</label>
                <Textarea 
                  placeholder="Root cause found" 
                  className="h-20"
                  value={newLineCause} 
                  onChange={(e) => setNewLineCause(e.target.value)} 
                  data-testid="input-line-cause"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Correction</label>
                <Textarea 
                  placeholder="Steps taken to fix" 
                  className="h-20"
                  value={newLineCorrection} 
                  onChange={(e) => setNewLineCorrection(e.target.value)} 
                  data-testid="input-line-correction"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Notes</label>
              <Textarea 
                placeholder="General technician notes" 
                value={newLineNotes} 
                onChange={(e) => setNewLineNotes(e.target.value)} 
                data-testid="input-line-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLineDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAddLine}
              disabled={!selectedVmrsCodeId || createLineMutation.isPending}
              data-testid="button-confirm-add-line"
            >
              {createLineMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItemDialog !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddItemDialog(null);
          setShowSuggestions(false);
          setSuggestionsVmrs(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Part/Item</DialogTitle>
            <DialogDescription>
              Add an inventory part or non-inventory item to this work order line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Item Type</label>
              <Select value={addItemType} onValueChange={(v) => setAddItemType(v as "inventory" | "non-inventory")}>
                <SelectTrigger data-testid="select-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Part</SelectItem>
                  <SelectItem value="non-inventory">Non-Inventory Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addItemType === "inventory" ? (
              <div className="space-y-3">
                {(() => {
                  const line = workOrderLines?.find(l => l.id === showAddItemDialog);
                  const lineVmrs = line?.vmrsCode;
                  if (lineVmrs) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Smart Suggestions
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setSuggestionsVmrs(lineVmrs);
                              setShowSuggestions(true);
                            }}
                            data-testid="button-get-suggestions"
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            Get Suggestions
                          </Button>
                        </div>
                        {showSuggestions && suggestionsVmrs === lineVmrs && (
                          <div className="border rounded-lg p-2 bg-primary/5 space-y-1">
                            {suggestionsLoading ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Finding parts used for {lineVmrs}...
                              </div>
                            ) : smartSuggestions?.historical && smartSuggestions.historical.length > 0 ? (
                              <>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Parts commonly used for this VMRS code on similar vehicles:
                                </p>
                                {smartSuggestions.historical.map((suggestion) => {
                                  const partInInventory = parts?.find(p => p.id === suggestion.partId);
                                  return (
                                    <button
                                      key={suggestion.partId}
                                      onClick={() => setAddItemPartId(suggestion.partId.toString())}
                                      className="w-full text-left p-2 rounded bg-background hover-elevate text-xs flex items-center justify-between"
                                      data-testid={`button-suggestion-${suggestion.partId}`}
                                    >
                                      <span className="font-medium">{suggestion.partNumber} - {suggestion.partName}</span>
                                      <span className="text-muted-foreground">
                                        {partInInventory ? `Qty: ${partInInventory.quantityOnHand || 0}` : ""}
                                        {suggestion.usageCount > 1 ? ` (used ${suggestion.usageCount}x)` : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No historical part usage found for this VMRS code. Select a part from the list below.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Part</label>
                  <Select value={addItemPartId} onValueChange={setAddItemPartId}>
                    <SelectTrigger data-testid="select-inventory-part">
                      <SelectValue placeholder="Select a part..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parts?.map((part) => (
                        <SelectItem key={part.id} value={part.id.toString()}>
                          {part.partNumber} - {part.name} (Qty: {part.quantityOnHand || 0}, ${part.unitCost || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addItemPartId && (() => {
                    const selectedPart = parts?.find(p => p.id.toString() === addItemPartId);
                    if (selectedPart && Number(selectedPart.quantityOnHand || 0) === 0) {
                      return (
                        <p className="text-xs text-amber-600">
                          This part is out of stock. You can still add it, but inventory will show as 0.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Description *</label>
                  <Input
                    placeholder="Enter item description..."
                    value={addItemDescription}
                    onChange={(e) => setAddItemDescription(e.target.value)}
                    data-testid="input-item-description"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Unit Cost ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addItemUnitCost}
                    onChange={(e) => setAddItemUnitCost(e.target.value)}
                    data-testid="input-item-unit-cost"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</label>
              <Input
                type="number"
                min="1"
                value={addItemQuantity}
                onChange={(e) => setAddItemQuantity(e.target.value)}
                data-testid="input-item-quantity"
              />
            </div>

            {addItemType === "inventory" && addItemPartId && (() => {
              const selectedPart = parts?.find(p => p.id.toString() === addItemPartId);
              if (selectedPart) {
                const total = (parseFloat(addItemQuantity) || 1) * parseFloat(selectedPart.unitCost || "0");
                return (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    Total: <span className="font-medium text-foreground">${total.toFixed(2)}</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(null)}>Cancel</Button>
            <Button 
              onClick={handleAddItem}
              disabled={
                addItemMutation.isPending || 
                (addItemType === "inventory" && !addItemPartId) ||
                (addItemType === "non-inventory" && !addItemDescription)
              }
              data-testid="button-confirm-add-item"
            >
              {addItemMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
