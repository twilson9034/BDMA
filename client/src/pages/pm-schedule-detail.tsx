import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Calendar, 
  Clock, DollarSign, X, CheckCircle2, AlertTriangle, Truck,
  Plus, Sparkles, Car, Package, Trash2, ChevronDown, ChevronRight
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { PriorityBadge } from "@/components/PriorityBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

interface PmSchedule {
  id: number;
  name: string;
  description: string | null;
  intervalType: "days" | "miles" | "hours" | "cycles";
  intervalValue: number;
  vmrsCodeId: number | null;
  estimatedHours: string | null;
  estimatedCost: string | null;
  priority: string;
  taskChecklist: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VmrsCode {
  id: number;
  code: string;
  title: string;
}

interface PmAssetInstance {
  id: number;
  pmScheduleId: number;
  assetId: number;
  lastCompletedDate: string | null;
  lastCompletedMeter: string | null;
  nextDueDate: string | null;
  nextDueMeter: string | null;
  isOverdue: boolean;
}

interface PmScheduleModel {
  id: number;
  pmScheduleId: number;
  make: string;
  model: string;
  year: number | null;
}

interface PartKit {
  id: number;
  name: string;
  description: string | null;
}

interface PmScheduleKit {
  id: number;
  pmScheduleId: number;
  kitId: number;
}

interface PmScheduleKitModel {
  id: number;
  pmScheduleKitId: number;
  make: string;
  model: string;
}

interface AssetMakeModel {
  manufacturer: string;
  model: string | null;
  year: number | null;
}

// Component to display and manage kit model restrictions
function KitModelManager({ 
  pmScheduleKitId, 
  onAddModel, 
  onRemoveModel,
  isAddPending,
  isRemovePending,
  availableModels,
}: { 
  pmScheduleKitId: number;
  onAddModel: (pmScheduleKitId: number, make: string, model: string) => void;
  onRemoveModel: (kitModelId: number, pmScheduleKitId: number) => void;
  isAddPending: boolean;
  isRemovePending: boolean;
  availableModels: PmScheduleModel[];
}) {
  const [selectedModel, setSelectedModel] = useState<string>("");

  const { data: kitModels = [] } = useQuery<PmScheduleKitModel[]>({
    queryKey: ["/api/pm-schedule-kits", pmScheduleKitId, "models"],
  });

  const handleAdd = () => {
    if (selectedModel) {
      const [make, model] = selectedModel.split("||");
      if (make && model) {
        onAddModel(pmScheduleKitId, make, model);
        setSelectedModel("");
      }
    }
  };

  // Filter out models that are already added
  const unusedModels = availableModels.filter(
    (am) => !kitModels.some((km) => km.make === am.make && km.model === am.model)
  );

  return (
    <div className="ml-6 mt-2 p-3 rounded-lg bg-muted/50 space-y-3">
      <p className="text-xs text-muted-foreground">
        Restrict this kit to specific vehicle makes/models from the schedule. Leave empty to use for all vehicles.
      </p>
      {availableModels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-48 h-8 text-sm" data-testid={`select-kit-model-${pmScheduleKitId}`}>
              <SelectValue placeholder="Select model..." />
            </SelectTrigger>
            <SelectContent>
              {unusedModels.map((m) => (
                <SelectItem key={`${m.make}||${m.model}`} value={`${m.make}||${m.model}`}>
                  {m.make} {m.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedModel || isAddPending}
            data-testid={`button-add-kit-model-${pmScheduleKitId}`}
          >
            {isAddPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-amber-600">Add vehicle models to this schedule first to restrict kits.</p>
      )}
      {kitModels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {kitModels.map((km) => (
            <Badge key={km.id} variant="outline" className="flex items-center gap-1 py-0.5 px-2 text-xs">
              <span>{km.make} {km.model}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-0.5"
                onClick={() => onRemoveModel(km.id, pmScheduleKitId)}
                disabled={isRemovePending}
                data-testid={`button-remove-kit-model-${km.id}`}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No model restrictions - this kit applies to all vehicles.</p>
      )}
    </div>
  );
}

const pmFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  intervalType: z.enum(["days", "miles", "hours", "cycles"]),
  intervalValue: z.number().min(1, "Interval must be at least 1"),
  vmrsCodeId: z.number().optional().nullable(),
  estimatedHours: z.string().optional(),
  estimatedCost: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  isActive: z.boolean(),
});

type PmFormValues = z.infer<typeof pmFormSchema>;

export default function PmScheduleDetail() {
  const [, params] = useRoute("/pm-schedules/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const pmId = params?.id ? parseInt(params.id) : null;

  const { data: pm, isLoading } = useQuery<PmSchedule>({
    queryKey: ["/api/pm-schedules", pmId],
    enabled: !!pmId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Get unique make/model combinations from assets for dropdowns
  const { data: assetMakeModels = [] } = useQuery<AssetMakeModel[]>({
    queryKey: ["/api/assets/make-models"],
  });

  // Vehicle models linked to this PM schedule
  const { data: scheduleModels = [] } = useQuery<PmScheduleModel[]>({
    queryKey: ["/api/pm-schedules", pmId, "models"],
    enabled: !!pmId,
  });

  // Part kits linked to this PM schedule
  const { data: scheduleKits = [] } = useQuery<PmScheduleKit[]>({
    queryKey: ["/api/pm-schedules", pmId, "kits"],
    enabled: !!pmId,
  });

  // All available part kits
  const { data: allKits = [] } = useQuery<PartKit[]>({
    queryKey: ["/api/part-kits"],
  });

  // All available VMRS codes for linking
  const { data: vmrsCodes = [] } = useQuery<VmrsCode[]>({
    queryKey: ["/api/vmrs-codes"],
  });

  // State for adding new model (now using dropdown)
  const [selectedAssetModel, setSelectedAssetModel] = useState<string>("");

  // State for adding new kit
  const [selectedKitId, setSelectedKitId] = useState<string>("");

  // State for expanded kit (to show model assignments)
  const [expandedKitId, setExpandedKitId] = useState<number | null>(null);

  const form = useForm<PmFormValues>({
    resolver: zodResolver(pmFormSchema),
    defaultValues: {
      name: "",
      description: "",
      intervalType: "days",
      intervalValue: 30,
      vmrsCodeId: null,
      estimatedHours: "",
      estimatedCost: "",
      priority: "medium",
      isActive: true,
    },
  });

  useEffect(() => {
    if (pm) {
      form.reset({
        name: pm.name || "",
        description: pm.description || "",
        intervalType: pm.intervalType || "days",
        intervalValue: pm.intervalValue || 30,
        vmrsCodeId: pm.vmrsCodeId || null,
        estimatedHours: pm.estimatedHours || "",
        estimatedCost: pm.estimatedCost || "",
        priority: (pm.priority as any) || "medium",
        isActive: pm.isActive ?? true,
      });
      setTasks(pm.taskChecklist || []);
    }
  }, [pm, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PmFormValues) => {
      return apiRequest("PATCH", `/api/pm-schedules/${pmId}`, {
        ...data,
        taskChecklist: tasks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules", pmId] });
      toast({ title: "Schedule Updated", description: "The PM schedule has been updated." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update schedule", variant: "destructive" });
    },
  });

  // Mutation to add a vehicle model to this PM schedule
  const addModelMutation = useMutation({
    mutationFn: async (data: { make: string; model: string; year?: number }) => {
      return apiRequest("POST", `/api/pm-schedules/${pmId}/models`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules", pmId, "models"] });
      toast({ title: "Model Added", description: "Vehicle model has been added to this schedule." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add model", variant: "destructive" });
    },
  });

  // Mutation to remove a vehicle model from this PM schedule
  const removeModelMutation = useMutation({
    mutationFn: async (modelId: number) => {
      return apiRequest("DELETE", `/api/pm-schedule-models/${modelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules", pmId, "models"] });
      toast({ title: "Model Removed", description: "Vehicle model has been removed from this schedule." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove model", variant: "destructive" });
    },
  });

  // Mutation to add a part kit to this PM schedule
  const addKitMutation = useMutation({
    mutationFn: async (kitId: number) => {
      return apiRequest("POST", `/api/pm-schedules/${pmId}/kits`, { kitId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules", pmId, "kits"] });
      toast({ title: "Kit Added", description: "Part kit has been added to this schedule." });
      setSelectedKitId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add kit", variant: "destructive" });
    },
  });

  // Mutation to remove a part kit from this PM schedule
  const removeKitMutation = useMutation({
    mutationFn: async (linkId: number) => {
      return apiRequest("DELETE", `/api/pm-schedule-kits/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules", pmId, "kits"] });
      toast({ title: "Kit Removed", description: "Part kit has been removed from this schedule." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove kit", variant: "destructive" });
    },
  });

  const handleAddModel = () => {
    if (selectedAssetModel) {
      const [manufacturer, model, yearStr] = selectedAssetModel.split("||");
      if (manufacturer && model) {
        addModelMutation.mutate({
          make: manufacturer,
          model: model,
          year: yearStr && yearStr !== "null" ? parseInt(yearStr) : undefined,
        });
        setSelectedAssetModel("");
      }
    }
  };

  // Get unique make/model combinations not yet assigned to this schedule
  const availableAssetModels = assetMakeModels.filter(
    (am) => !scheduleModels.some(
      (sm) => sm.make === am.manufacturer && sm.model === am.model
    )
  );

  const handleAddKit = () => {
    if (selectedKitId) {
      addKitMutation.mutate(parseInt(selectedKitId));
    }
  };

  // Mutation to add a model restriction to a kit within this PM schedule
  const addKitModelMutation = useMutation({
    mutationFn: async (data: { pmScheduleKitId: number; make: string; model: string }) => {
      return apiRequest("POST", `/api/pm-schedule-kits/${data.pmScheduleKitId}/models`, {
        make: data.make,
        model: data.model,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedule-kits", variables.pmScheduleKitId, "models"] });
      toast({ title: "Model Added", description: "Vehicle model restriction added to this kit." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add model to kit", variant: "destructive" });
    },
  });

  // Mutation to remove a model restriction from a kit
  const removeKitModelMutation = useMutation({
    mutationFn: async (data: { kitModelId: number; pmScheduleKitId: number }) => {
      return apiRequest("DELETE", `/api/pm-schedule-kit-models/${data.kitModelId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedule-kits", variables.pmScheduleKitId, "models"] });
      toast({ title: "Model Removed", description: "Vehicle model restriction removed from this kit." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove model from kit", variant: "destructive" });
    },
  });

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-checklist", {
        pmType: form.getValues("name"),
        intervalType: form.getValues("intervalType"),
        intervalValue: form.getValues("intervalValue"),
        assetType: "vehicle",
        existingTasks: tasks,
      });
      const data = await response.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks([...tasks, ...data.tasks]);
        toast({ title: "Tasks Generated", description: `Added ${data.tasks.length} AI-generated tasks.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate tasks", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };


  const onSubmit = (data: PmFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!pm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Schedule Not Found" description="The requested PM schedule could not be found." />
        <Button variant="outline" onClick={() => navigate("/pm-schedules")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to PM Schedules
        </Button>
      </div>
    );
  }

  const getIntervalLabel = (type: string) => {
    switch (type) {
      case "days": return "Days";
      case "miles": return "Miles";
      case "hours": return "Engine Hours";
      case "cycles": return "Cycles";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pm-schedules")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={pm.name}
        description={`Every ${pm.intervalValue.toLocaleString()} ${getIntervalLabel(pm.intervalType).toLowerCase()}`}
        actions={
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interval</p>
                <p className="font-medium">{pm.intervalValue.toLocaleString()} {getIntervalLabel(pm.intervalType)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Hours</p>
                <p className="font-medium">{pm.estimatedHours ? `${pm.estimatedHours} hrs` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Cost</p>
                <p className="font-medium">{pm.estimatedCost ? `$${Number(pm.estimatedCost).toFixed(2)}` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${pm.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                {pm.isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <X className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{pm.isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} data-testid="input-name" />
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
                          <Textarea {...field} disabled={!isEditing} rows={3} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vmrsCodeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VMRS Code (Optional)</FormLabel>
                        <Select 
                          value={field.value?.toString() || "none"} 
                          onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} 
                          disabled={!isEditing}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-vmrs-code">
                              <SelectValue placeholder="Link to VMRS code..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No VMRS Code</SelectItem>
                            {vmrsCodes.map((vmrs) => (
                              <SelectItem key={vmrs.id} value={vmrs.id.toString()}>
                                {vmrs.code} - {vmrs.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          When this VMRS code is added to a work order line, the schedule's linked parts and checklists will be pulled in automatically.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="intervalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                            <FormControl>
                              <SelectTrigger data-testid="select-interval-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="miles">Miles</SelectItem>
                              <SelectItem value="hours">Engine Hours</SelectItem>
                              <SelectItem value="cycles">Cycles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intervalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Value</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              disabled={!isEditing} 
                              data-testid="input-interval-value" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.5" disabled={!isEditing} data-testid="input-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estimatedCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Cost</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" disabled={!isEditing} data-testid="input-cost" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            {field.value ? "This schedule is actively generating work orders" : "This schedule is paused"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isEditing} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>Task Checklist</CardTitle>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateWithAI}
                      disabled={isGenerating}
                      data-testid="button-ai-generate"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                        data-testid="input-new-task"
                      />
                      <Button type="button" onClick={addTask} variant="outline" data-testid="button-add-task">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {tasks.map((task, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{task}</span>
                          </div>
                          {isEditing && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTask(index)}
                              className="h-8 w-8"
                              data-testid={`button-remove-task-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isEditing 
                        ? "No tasks added yet. Add tasks manually or use AI to generate them."
                        : "No tasks in this PM schedule."
                      }
                    </p>
                  )}
                </CardContent>
              </Card>
            </form>
          </Form>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Models
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign this PM schedule to specific vehicle makes/models from your asset list. When left empty, it can apply to any asset.
              </p>
              <div className="flex flex-wrap gap-2">
                <Select value={selectedAssetModel} onValueChange={setSelectedAssetModel}>
                  <SelectTrigger className="w-64" data-testid="select-vehicle-model">
                    <SelectValue placeholder="Select a vehicle make/model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssetModels
                      .filter(am => am.model) // Only show assets with both make and model
                      .map((am) => (
                        <SelectItem 
                          key={`${am.manufacturer}||${am.model || ""}||${am.year || ""}`} 
                          value={`${am.manufacturer}||${am.model || ""}||${am.year || ""}`}
                        >
                          {am.manufacturer} {am.model}{am.year ? ` (${am.year})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  onClick={handleAddModel} 
                  disabled={!selectedAssetModel || addModelMutation.isPending}
                  data-testid="button-add-model"
                >
                  {addModelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {scheduleModels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scheduleModels.map((model) => (
                    <Badge key={model.id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                      <span>{model.make} {model.model}{model.year ? ` (${model.year})` : ""}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => removeModelMutation.mutate(model.id)}
                        disabled={removeModelMutation.isPending}
                        data-testid={`button-remove-model-${model.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No vehicle models assigned. This schedule can apply to any asset.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Part Kits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link part kits to automatically include required parts when this PM generates a work order.
              </p>
              <div className="flex gap-2">
                <Select value={selectedKitId} onValueChange={setSelectedKitId}>
                  <SelectTrigger className="w-64" data-testid="select-kit">
                    <SelectValue placeholder="Select a part kit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allKits.filter(kit => !scheduleKits.some(sk => sk.kitId === kit.id)).map((kit) => (
                      <SelectItem key={kit.id} value={kit.id.toString()}>
                        {kit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  onClick={handleAddKit} 
                  disabled={!selectedKitId || addKitMutation.isPending}
                  data-testid="button-add-kit"
                >
                  {addKitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {scheduleKits.length > 0 ? (
                <div className="space-y-2">
                  {scheduleKits.map((link) => {
                    const kit = allKits.find(k => k.id === link.kitId);
                    const isExpanded = expandedKitId === link.id;
                    return (
                      <div key={link.id} className="rounded-lg border">
                        <div className="flex items-center justify-between p-2">
                          <button
                            type="button"
                            className="flex items-center gap-2 hover:bg-muted/50 rounded p-1 -m-1"
                            onClick={() => setExpandedKitId(isExpanded ? null : link.id)}
                            data-testid={`button-expand-kit-${link.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{kit?.name || `Kit #${link.kitId}`}</span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeKitMutation.mutate(link.id)}
                            disabled={removeKitMutation.isPending}
                            data-testid={`button-remove-kit-${link.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {isExpanded && (
                          <KitModelManager
                            pmScheduleKitId={link.id}
                            onAddModel={(pkId, make, model) => {
                              addKitModelMutation.mutate({ pmScheduleKitId: pkId, make, model });
                            }}
                            onRemoveModel={(kitModelId, pkId) => {
                              removeKitModelMutation.mutate({ kitModelId, pmScheduleKitId: pkId });
                            }}
                            isAddPending={addKitModelMutation.isPending}
                            isRemovePending={removeKitModelMutation.isPending}
                            availableModels={scheduleModels}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No part kits linked to this schedule.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={pm.isActive ? "default" : "secondary"}>
                  {pm.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={pm.priority} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interval</span>
                <span>{pm.intervalValue.toLocaleString()} {getIntervalLabel(pm.intervalType)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(pm.createdAt).toLocaleDateString()}</span>
              </div>
              {pm.updatedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(pm.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/pm-schedules/new">
                  <Calendar className="h-4 w-4" />
                  Create New Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
