import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Calendar, 
  Clock, DollarSign, X, CheckCircle2, AlertTriangle, Truck
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
  estimatedHours: string | null;
  estimatedCost: string | null;
  priority: string;
  taskChecklist: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

const pmFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  intervalType: z.enum(["days", "miles", "hours", "cycles"]),
  intervalValue: z.number().min(1, "Interval must be at least 1"),
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
  
  const pmId = params?.id ? parseInt(params.id) : null;

  const { data: pm, isLoading } = useQuery<PmSchedule>({
    queryKey: ["/api/pm-schedules", pmId],
    enabled: !!pmId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const form = useForm<PmFormValues>({
    resolver: zodResolver(pmFormSchema),
    defaultValues: {
      name: "",
      description: "",
      intervalType: "days",
      intervalValue: 30,
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
        estimatedHours: pm.estimatedHours || "",
        estimatedCost: pm.estimatedCost || "",
        priority: (pm.priority as any) || "medium",
        isActive: pm.isActive ?? true,
      });
    }
  }, [pm, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PmFormValues) => {
      return apiRequest("PATCH", `/api/pm-schedules/${pmId}`, data);
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

              {pm.taskChecklist && pm.taskChecklist.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Task Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pm.taskChecklist.map((task, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
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
