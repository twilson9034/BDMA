import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, X, Plus, Trash2, 
  ClipboardList, CheckCircle2, Sparkles, Truck
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ChecklistTemplate {
  id: number;
  name: string;
  description: string | null;
  category: string;
  estimatedMinutes: number | null;
  items: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MakeModelAssignment {
  id: number;
  checklistTemplateId: number;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  assetType: string | null;
}

const categoryLabels: Record<string, string> = {
  pm_service: "PM Service",
  inspection: "Inspection",
  safety: "Safety",
  pre_trip: "Pre-Trip",
  post_trip: "Post-Trip",
  seasonal: "Seasonal",
  other: "Other",
};

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["pm_service", "inspection", "safety", "pre_trip", "post_trip", "seasonal", "other"]),
  estimatedMinutes: z.number().optional(),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function ChecklistTemplateDetail() {
  const [, params] = useRoute("/checklist-templates/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ manufacturer: "", model: "", assetType: "" });
  
  const templateId = params?.id ? parseInt(params.id) : null;

  const { data: template, isLoading } = useQuery<ChecklistTemplate>({
    queryKey: ["/api/checklist-templates", templateId],
    enabled: !!templateId,
  });

  const { data: assignments } = useQuery<MakeModelAssignment[]>({
    queryKey: ["/api/checklist-templates", templateId, "assignments"],
    enabled: !!templateId,
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "pm_service",
      estimatedMinutes: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || "",
        description: template.description || "",
        category: (template.category as any) || "pm_service",
        estimatedMinutes: template.estimatedMinutes || undefined,
        isActive: template.isActive ?? true,
      });
      setTasks(template.items || []);
    }
  }, [template, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest("PATCH", `/api/checklist-templates/${templateId}`, {
        ...data,
        items: tasks,
        estimatedMinutes: data.estimatedMinutes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates", templateId] });
      toast({ title: "Template Updated", description: "The checklist template has been updated." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/checklist-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Template Deleted", description: "The checklist template has been deleted." });
      navigate("/checklist-templates");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      return apiRequest("POST", `/api/checklist-templates/${templateId}/assignments`, {
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        assetType: data.assetType || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates", templateId, "assignments"] });
      toast({ title: "Assignment Added", description: "Make/model assignment has been added." });
      setNewAssignment({ manufacturer: "", model: "", assetType: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add assignment", variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest("DELETE", `/api/checklist-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates", templateId, "assignments"] });
      toast({ title: "Assignment Removed", description: "Make/model assignment has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove assignment", variant: "destructive" });
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
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <PageHeader title="Template Not Found" description="The requested checklist template could not be found." />
        <Button variant="outline" onClick={() => navigate("/checklist-templates")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/checklist-templates")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={template.name}
        description={categoryLabels[template.category] || template.category}
        actions={
          <div className="flex gap-2">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="font-medium">{tasks.length} items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="font-medium">{assignments?.length || 0} make/models</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${template.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                {template.isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <X className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{template.isActive ? "Active" : "Inactive"}</p>
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
                  <CardTitle>Template Information</CardTitle>
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
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
                              disabled={!isEditing}
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
                      No tasks in this checklist.
                    </p>
                  )}
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Make/Model Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign this checklist to specific vehicle makes and models for automatic use.
              </p>
              
              <div className="space-y-2">
                <Input
                  placeholder="Manufacturer (e.g., Ford)"
                  value={newAssignment.manufacturer}
                  onChange={(e) => setNewAssignment({ ...newAssignment, manufacturer: e.target.value })}
                  data-testid="input-manufacturer"
                />
                <Input
                  placeholder="Model (e.g., F-150)"
                  value={newAssignment.model}
                  onChange={(e) => setNewAssignment({ ...newAssignment, model: e.target.value })}
                  data-testid="input-model"
                />
                <Select 
                  value={newAssignment.assetType} 
                  onValueChange={(v) => setNewAssignment({ ...newAssignment, assetType: v })}
                >
                  <SelectTrigger data-testid="select-asset-type">
                    <SelectValue placeholder="Asset Type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full" 
                  onClick={() => createAssignmentMutation.mutate(newAssignment)}
                  disabled={!newAssignment.manufacturer && !newAssignment.model && !newAssignment.assetType}
                  data-testid="button-add-assignment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </div>

              {assignments && assignments.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="text-sm">
                        {[
                          assignment.manufacturer,
                          assignment.model,
                          assignment.assetType && `(${assignment.assetType})`
                        ].filter(Boolean).join(" ") || "All Assets"}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                        className="h-8 w-8"
                        data-testid={`button-remove-assignment-${assignment.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span>{categoryLabels[template.category] || template.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(template.createdAt).toLocaleDateString()}</span>
              </div>
              {template.updatedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checklist template and all its assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
