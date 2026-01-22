import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, Calendar, Plus, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

export default function PmScheduleNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");

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

  const createMutation = useMutation({
    mutationFn: async (data: PmFormValues) => {
      return apiRequest("POST", "/api/pm-schedules", {
        ...data,
        taskChecklist: tasks.length > 0 ? tasks : null,
      });
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-schedules"] });
      toast({ title: "Schedule Created", description: "The PM schedule has been created." });
      const newPm = await response.json();
      navigate(`/pm-schedules/${newPm.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create schedule", variant: "destructive" });
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

  const onSubmit = (data: PmFormValues) => {
    createMutation.mutate(data);
  };

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
        title="New PM Schedule"
        description="Create a preventive maintenance schedule"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Oil Change, Brake Inspection" data-testid="input-name" />
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
                          <Textarea {...field} rows={3} placeholder="Details about this maintenance task..." data-testid="input-description" />
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
                          <FormLabel>Interval Type *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <FormDescription>How the interval is measured</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intervalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Value *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-interval-value" 
                            />
                          </FormControl>
                          <FormDescription>Every {form.watch("intervalValue") || 0} {getIntervalLabel(form.watch("intervalType")).toLowerCase()}</FormDescription>
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
                            <Input {...field} type="number" step="0.5" min="0" placeholder="0.0" data-testid="input-hours" />
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
                            <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-cost" />
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                            {field.value ? "Schedule will generate work orders when due" : "Schedule is paused"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tasks.length > 0 && (
                    <ul className="space-y-2">
                      {tasks.map((task, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-muted/30">
                          <span className="text-sm">{task}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add a task to the checklist..."
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                      data-testid="input-new-task"
                    />
                    <Button type="button" variant="outline" onClick={addTask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Add specific tasks that should be completed during this maintenance.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create">
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Create Schedule
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/pm-schedules")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Intervals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Oil Change</span>
                    <span>5,000 - 10,000 miles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tire Rotation</span>
                    <span>5,000 - 7,500 miles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brake Inspection</span>
                    <span>12,000 - 15,000 miles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transmission Service</span>
                    <span>30,000 - 60,000 miles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Inspection</span>
                    <span>365 days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Create schedules for routine maintenance to prevent unexpected breakdowns.</p>
                  <p>Use mileage-based intervals for wear items like oil and tires.</p>
                  <p>Use time-based intervals for annual inspections and certifications.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
