import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset, InsertWorkOrder, VmrsCode, WorkOrder, Location } from "@shared/schema";

const workOrderFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["preventive", "corrective", "inspection", "emergency", "project"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  assetId: z.number().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

interface WorkOrderLineData {
  description: string;
  vmrsCode: string;
  vmrsTitle: string;
  complaint?: string;
  cause?: string;
  correction?: string;
  notes?: string;
}

export default function WorkOrderNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [selectedVmrsCodeId, setSelectedVmrsCodeId] = useState<string>("");
  const [newLineDescription, setNewLineDescription] = useState("");
  const [newLineComplaint, setNewLineComplaint] = useState("");
  const [newLineCause, setNewLineCause] = useState("");
  const [newLineCorrection, setNewLineCorrection] = useState("");
  const [newLineNotes, setNewLineNotes] = useState("");
  const [workOrderLines, setWorkOrderLines] = useState<WorkOrderLineData[]>([]);
  const [createdWorkOrderId, setCreatedWorkOrderId] = useState<number | null>(null);

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const getLocationName = (locationId: number | null | undefined) => {
    if (!locationId || !locations) return null;
    const location = locations.find(l => l.id === locationId);
    return location?.name;
  };

  const { data: vmrsCodes = [] } = useQuery<VmrsCode[]>({
    queryKey: ["/api/vmrs-codes"],
  });

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "corrective",
      priority: "medium",
      assetId: undefined,
      dueDate: "",
      estimatedHours: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      const payload: Partial<InsertWorkOrder> = {
        title: data.title || undefined,
        description: data.description || null,
        type: data.type,
        priority: data.priority,
        assetId: data.assetId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours || null,
        notes: data.notes || null,
        status: "open",
      };
      return apiRequest("POST", "/api/work-orders", payload) as unknown as WorkOrder;
    },
    onSuccess: (response) => {
      setCreatedWorkOrderId(response.id);
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      if (workOrderLines.length > 0) {
        toast({
          title: "Work Order Created",
          description: "Now add work order lines.",
        });
      } else {
        toast({
          title: "Work Order Created",
          description: "The work order has been created successfully.",
        });
        navigate("/work-orders");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createLineMutation = useMutation({
    mutationFn: async (line: WorkOrderLineData) => {
      return apiRequest("POST", `/api/work-orders/${createdWorkOrderId}/lines`, line);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", createdWorkOrderId, "lines"] });
      handleResetLineDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add line.",
        variant: "destructive",
      });
    },
  });

  const handleVmrsCodeSelect = (vmrsCodeId: string) => {
    setSelectedVmrsCodeId(vmrsCodeId);
    const selectedCode = vmrsCodes.find((code) => code.id.toString() === vmrsCodeId);
    if (selectedCode) {
      setNewLineDescription(selectedCode.description || selectedCode.title);
    }
  };

  const handleResetLineDialog = () => {
    setShowAddLineDialog(false);
    setSelectedVmrsCodeId("");
    setNewLineDescription("");
    setNewLineComplaint("");
    setNewLineCause("");
    setNewLineCorrection("");
    setNewLineNotes("");
  };

  const handleAddLine = async () => {
    if (!selectedVmrsCodeId) {
      toast({
        title: "Error",
        description: "Please select a VMRS code.",
        variant: "destructive",
      });
      return;
    }

    const selectedVmrs = vmrsCodes.find(code => code.id.toString() === selectedVmrsCodeId);
    if (!selectedVmrs) {
      toast({
        title: "Error",
        description: "Invalid VMRS code selected.",
        variant: "destructive",
      });
      return;
    }

    const line: WorkOrderLineData = {
      description: newLineDescription,
      vmrsCode: selectedVmrs.code,
      vmrsTitle: selectedVmrs.title,
      complaint: newLineComplaint || undefined,
      cause: newLineCause || undefined,
      correction: newLineCorrection || undefined,
      notes: newLineNotes || undefined,
    };

    await createLineMutation.mutateAsync(line);
    setWorkOrderLines([...workOrderLines, line]);
  };

  const handleRemoveLine = (index: number) => {
    setWorkOrderLines(workOrderLines.filter((_, i) => i !== index));
  };

  const onSubmit = (data: WorkOrderFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="New Work Order"
        description="Create a new maintenance work order"
        actions={
          <Button variant="outline" onClick={() => navigate("/work-orders")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Auto-generated as WO# | Asset# if left blank" 
                          {...field} 
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the work to be performed" 
                          rows={4}
                          {...field} 
                          data-testid="input-description"
                        />
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
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="corrective">Corrective</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
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
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Assignment & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-asset">
                            <SelectValue placeholder="Select asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets?.map((asset) => {
                            const locationName = getLocationName(asset.locationId);
                            return (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.assetNumber} - {asset.name}
                                {locationName && <span className="text-muted-foreground ml-1">({locationName})</span>}
                              </SelectItem>
                            );
                          })}
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
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5"
                          placeholder="0.0" 
                          {...field} 
                          data-testid="input-hours"
                        />
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
                        <Textarea 
                          placeholder="Additional notes or instructions" 
                          rows={3}
                          {...field} 
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Work Order Lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrderLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No work order lines added yet.</p>
              ) : (
                <div className="space-y-2">
                  {workOrderLines.map((line, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{line.description}</p>
                        {line.complaint && <p className="text-xs text-muted-foreground">Complaint: {line.complaint}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLine(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                type="button" 
                onClick={() => setShowAddLineDialog(true)}
                disabled={!createdWorkOrderId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Work Order Line
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/work-orders")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Work Order
            </Button>
          </div>
        </form>
      </Form>

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
            <Button variant="outline" onClick={handleResetLineDialog}>Cancel</Button>
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
    </div>
  );
}
