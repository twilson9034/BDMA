import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset, InsertWorkOrder } from "@shared/schema";

const workOrderFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["preventive", "corrective", "inspection", "emergency", "project"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  assetId: z.number().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  notes: z.string().optional(),
  workOrderLines: z.array(z.object({
    description: z.string().optional(),
    quantity: z.number().optional(),
    assetId: z.number().optional(),
  })).optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;
type WorkOrderLine = Exclude<WorkOrderFormValues["workOrderLines"], undefined>[number];

export default function WorkOrderNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
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
      workOrderLines: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      const payload: Partial<InsertWorkOrder> = {
        title: data.title || undefined, // Auto-generated on backend if not provided
        description: data.description || null,
        type: data.type,
        priority: data.priority,
        assetId: data.assetId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours || null,
        notes: data.notes || null,
        status: "open",
      };
      return apiRequest("POST", "/api/work-orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Work Order Created",
        description: "The work order has been created successfully.",
      });
      navigate("/work-orders");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderFormValues) => {
    createMutation.mutate(data);
  };

  const [workOrderLines, setWorkOrderLines] = useState<WorkOrderLine[]>([]);

  const addWorkOrderLine = () => {
    setWorkOrderLines([...workOrderLines, { description: '', quantity: 1, assetId: undefined }]);
  };

  const removeWorkOrderLine = (index: number) => {
    setWorkOrderLines(workOrderLines.filter((_, i) => i !== index));
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
                          {assets?.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>
                              {asset.assetNumber} - {asset.name}
                            </SelectItem>
                          ))}
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
            <CardContent>
              <div className="space-y-4">
                {workOrderLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`line-description-${index}`}>Description</Label>
                      <Input
                        id={`line-description-${index}`}
                        value={line.description}
                        onChange={(e) => {
                          const newLines = [...workOrderLines];
                          newLines[index].description = e.target.value;
                          setWorkOrderLines(newLines);
                        }}
                        placeholder="Line description"
                        data-testid={`input-line-description-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`line-quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`line-quantity-${index}`}
                        type="number"
                        value={line.quantity}
                        onChange={(e) => {
                          const newLines = [...workOrderLines];
                          newLines[index].quantity = Number(e.target.value);
                          setWorkOrderLines(newLines);
                        }}
                        placeholder="1"
                        data-testid={`input-line-quantity-${index}`}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        onClick={() => removeWorkOrderLine(index)}
                        data-testid={`button-remove-line-${index}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                <Button 
                  type="button" 
                  onClick={addWorkOrderLine}
                  data-testid="button-add-line"
                >
                  Add Work Order Line
                </Button>
              </div>
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
    </div>
  );
}
