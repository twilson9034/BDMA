import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, Plus, X, Sparkles } from "lucide-react";
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

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["pm_service", "inspection", "safety", "pre_trip", "post_trip", "seasonal", "other"]),
  estimatedMinutes: z.number().optional(),
  isActive: z.boolean(),
  isOosSensitive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function ChecklistTemplateNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "pm_service",
      estimatedMinutes: undefined,
      isActive: true,
      isOosSensitive: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest("POST", "/api/checklist-templates", {
        ...data,
        items: tasks,
        estimatedMinutes: data.estimatedMinutes || null,
        isOosSensitive: data.isOosSensitive ?? false,
      });
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Template Created", description: "The checklist template has been created." });
      const template = await response.json();
      navigate(`/checklist-templates/${template.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
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
        pmType: form.getValues("name") || form.getValues("category"),
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

  const onSubmit = (data: TemplateFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/checklist-templates")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title="Create Checklist Template"
        description="Create a reusable maintenance checklist that can be assigned to PM schedules and assets"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., A Service Checklist" {...field} data-testid="input-name" />
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
                          <Textarea placeholder="Brief description of when this checklist is used..." {...field} rows={3} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pm_service">PM Service</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="safety">Safety</SelectItem>
                              <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                              <SelectItem value="post_trip">Post-Trip</SelectItem>
                              <SelectItem value="seasonal">Seasonal</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estimatedMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Time (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              {...field} 
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-minutes" 
                            />
                          </FormControl>
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
                            Active templates can be assigned to PM schedules and assets
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isOosSensitive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>OOS Sensitive</FormLabel>
                          <FormDescription>
                            When enabled, out-of-service rules will evaluate responses inline and flag violations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-oos-sensitive" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>Task Checklist</CardTitle>
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
                </CardHeader>
                <CardContent className="space-y-4">
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
                  {tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {tasks.map((task, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                          <span className="text-sm">{task}</span>
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
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks added yet. Add tasks manually or use AI to generate them.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Create Template
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/checklist-templates")}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-medium">{tasks.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
