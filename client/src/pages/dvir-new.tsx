import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, ClipboardCheck, Plus, Trash2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

const dvirFormSchema = z.object({
  assetId: z.number({ required_error: "Please select an asset" }),
  preTrip: z.boolean().default(true),
  meterReading: z.string().optional(),
  notes: z.string().optional(),
});

type DvirFormValues = z.infer<typeof dvirFormSchema>;

interface DefectItem {
  id: string;
  category: string;
  description: string;
  severity: "minor" | "major" | "critical";
}

const inspectionCategories = [
  "Brakes",
  "Tires/Wheels",
  "Steering",
  "Lights",
  "Mirrors",
  "Horn",
  "Wipers",
  "Emergency Equipment",
  "Coupling Devices",
  "Fluid Levels",
  "Engine",
  "Exhaust",
  "Body/Frame",
  "Other",
];

export default function DvirNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [newDefect, setNewDefect] = useState<Partial<DefectItem>>({
    category: "",
    description: "",
    severity: "minor",
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const vehicleAssets = assets?.filter(a => a.type === "vehicle" || a.type === "equipment") || [];

  const form = useForm<DvirFormValues>({
    resolver: zodResolver(dvirFormSchema),
    defaultValues: {
      assetId: undefined,
      preTrip: true,
      meterReading: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DvirFormValues) => {
      const status = defects.length === 0 ? "safe" 
        : defects.some(d => d.severity === "critical") ? "unsafe" 
        : "defects_noted";
      
      const response = await apiRequest("POST", "/api/dvirs", {
        ...data,
        status,
        inspectionDate: new Date().toISOString(),
      });
      
      const newDvir = await response.json();
      
      for (const defect of defects) {
        await apiRequest("POST", `/api/dvirs/${newDvir.id}/defects`, {
          category: defect.category,
          description: defect.description,
          severity: defect.severity,
          resolved: false,
        });
      }
      
      return newDvir;
    },
    onSuccess: (newDvir) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dvirs"] });
      toast({ title: "DVIR Submitted", description: "The inspection report has been saved." });
      navigate(`/dvirs/${newDvir.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit DVIR", variant: "destructive" });
    },
  });

  const addDefect = () => {
    if (!newDefect.category || !newDefect.description) {
      toast({ title: "Missing Information", description: "Please provide category and description", variant: "destructive" });
      return;
    }
    setDefects([
      ...defects,
      {
        id: Date.now().toString(),
        category: newDefect.category,
        description: newDefect.description,
        severity: newDefect.severity || "minor",
      },
    ]);
    setNewDefect({ category: "", description: "", severity: "minor" });
  };

  const removeDefect = (id: string) => {
    setDefects(defects.filter(d => d.id !== id));
  };

  const onSubmit = (data: DvirFormValues) => {
    createMutation.mutate(data);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "major": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "minor": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default: return "";
    }
  };

  const overallStatus = defects.length === 0 ? "safe" 
    : defects.some(d => d.severity === "critical") ? "unsafe" 
    : "defects_noted";

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dvirs")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title="New DVIR"
        description="Driver Vehicle Inspection Report"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Inspection Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle / Equipment *</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(val) => field.onChange(parseInt(val))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-asset">
                              <SelectValue placeholder="Select vehicle or equipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicleAssets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.name} {asset.manufacturer && `- ${asset.manufacturer}`} {asset.model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="preTrip"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Inspection Type</FormLabel>
                            <FormDescription>
                              {field.value ? "Pre-Trip Inspection" : "Post-Trip Inspection"}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-pre-trip"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meterReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odometer Reading</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="Current mileage" data-testid="input-meter" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Defects Found
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {defects.length > 0 && (
                    <div className="space-y-3">
                      {defects.map((defect) => (
                        <div 
                          key={defect.id} 
                          className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30"
                          data-testid={`defect-item-${defect.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{defect.category}</Badge>
                              <Badge className={getSeverityColor(defect.severity)}>
                                {defect.severity}
                              </Badge>
                            </div>
                            <p className="text-sm">{defect.description}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDefect(defect.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-lg border border-dashed border-border space-y-4">
                    <p className="text-sm font-medium">Add a defect</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select
                        value={newDefect.category}
                        onValueChange={(val) => setNewDefect({ ...newDefect, category: val })}
                      >
                        <SelectTrigger data-testid="select-defect-category">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectionCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newDefect.severity}
                        onValueChange={(val: any) => setNewDefect({ ...newDefect, severity: val })}
                      >
                        <SelectTrigger data-testid="select-defect-severity">
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={newDefect.description || ""}
                      onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                      placeholder="Describe the defect..."
                      rows={2}
                      data-testid="input-defect-description"
                    />
                    <Button type="button" variant="outline" onClick={addDefect} data-testid="button-add-defect">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Defect
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={4} 
                            placeholder="Any additional observations or comments..."
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

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submit Inspection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground mb-2">Overall Status</p>
                    <Badge 
                      className={`text-lg px-4 py-2 ${
                        overallStatus === "safe" 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                          : overallStatus === "unsafe" 
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {overallStatus === "safe" ? "Safe to Operate" 
                        : overallStatus === "unsafe" ? "Unsafe - Do Not Operate" 
                        : "Defects Noted"}
                    </Badge>
                    {defects.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {defects.length} defect{defects.length > 1 ? "s" : ""} reported
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createMutation.isPending || !form.watch("assetId")}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Submit DVIR
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate("/dvirs")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inspection Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {inspectionCategories.slice(0, 8).map((cat) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{cat}</span>
                        {defects.some(d => d.category === cat) ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    ))}
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
