import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Trash2, Truck, 
  MapPin, Calendar, Settings, FileText, Wrench, X,
  Gauge, Fuel, Thermometer, Battery, AlertTriangle, Activity, Radio
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset, Location, WorkOrder, TelematicsData, FaultCode } from "@shared/schema";

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["vehicle", "equipment", "facility", "tool", "other"]),
  status: z.enum(["operational", "in_maintenance", "down", "retired", "pending_inspection"]),
  locationId: z.number().optional().nullable(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  year: z.string().optional(),
  meterType: z.string().optional(),
  currentMeterReading: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

export default function AssetDetail() {
  const [, params] = useRoute("/assets/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const assetId = params?.id ? parseInt(params.id) : null;

  const { data: asset, isLoading } = useQuery<Asset>({
    queryKey: ["/api/assets", assetId],
    enabled: !!assetId,
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: latestTelematics } = useQuery<TelematicsData | null>({
    queryKey: ["/api/assets", assetId, "telematics", "latest"],
    enabled: !!assetId,
  });

  const { data: faultCodes } = useQuery<FaultCode[]>({
    queryKey: ["/api/assets", assetId, "fault-codes"],
    enabled: !!assetId,
  });

  const assetWorkOrders = workOrders?.filter(wo => wo.assetId === assetId) || [];
  const activeFaults = faultCodes?.filter(fc => fc.status === "active") || [];

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "vehicle",
      status: "operational",
      locationId: null,
      manufacturer: "",
      model: "",
      serialNumber: "",
      year: "",
      meterType: "",
      currentMeterReading: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        name: asset.name || "",
        description: asset.description || "",
        type: asset.type || "vehicle",
        status: asset.status || "operational",
        locationId: asset.locationId || null,
        manufacturer: asset.manufacturer || "",
        model: asset.model || "",
        serialNumber: asset.serialNumber || "",
        year: asset.year?.toString() || "",
        meterType: asset.meterType || "",
        currentMeterReading: asset.currentMeterReading || "",
        notes: asset.notes || "",
      });
    }
  }, [asset, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      return apiRequest("PATCH", `/api/assets/${assetId}`, {
        ...data,
        year: data.year ? parseInt(data.year) : null,
        locationId: data.locationId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Asset Updated",
        description: "The asset has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Asset Deleted",
        description: "The asset has been deleted.",
      });
      navigate("/assets");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Asset Not Found"
          description="The requested asset could not be found"
          actions={
            <Button variant="outline" onClick={() => navigate("/assets")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
      </div>
    );
  }

  const currentLocation = locations?.find(l => l.id === asset.locationId);

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title={`${asset.assetNumber} - ${asset.name}`}
        description={asset.description || "Asset details"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/assets")} data-testid="button-back">
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
        <StatusBadge status={asset.status} />
        <span className="text-sm text-muted-foreground capitalize">{asset.type}</span>
        {currentLocation && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {currentLocation.name}
          </span>
        )}
      </div>

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Asset Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
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
                              <SelectItem value="vehicle">Vehicle</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="facility">Facility</SelectItem>
                              <SelectItem value="tool">Tool</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                              <SelectItem value="operational">Operational</SelectItem>
                              <SelectItem value="in_maintenance">In Maintenance</SelectItem>
                              <SelectItem value="down">Down</SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                              <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations?.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id.toString()}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-manufacturer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-serial" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="meterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meter Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-meter">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="miles">Miles</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="cycles">Cycles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentMeterReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Reading</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-meter" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} data-testid="input-notes" />
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
                <Truck className="h-5 w-5" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset Number</p>
                  <p className="font-medium">{asset.assetNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{asset.type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{asset.name}</p>
              </div>

              {asset.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{asset.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{currentLocation?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={asset.status} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Manufacturer</p>
                  <p className="font-medium">{asset.manufacturer || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{asset.model || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-medium">{asset.serialNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{asset.year || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Meter Type</p>
                  <p className="font-medium capitalize">{asset.meterType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Reading</p>
                  <p className="font-medium">
                    {asset.currentMeterReading ? `${asset.currentMeterReading} ${asset.meterType || ''}` : "-"}
                  </p>
                </div>
              </div>

              {asset.purchaseDate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{new Date(asset.purchaseDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Price</p>
                    <p className="font-medium">
                      {asset.purchasePrice ? `$${parseFloat(asset.purchasePrice).toLocaleString()}` : "-"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Work Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assetWorkOrders.length > 0 ? (
                <div className="space-y-3">
                  {assetWorkOrders.slice(0, 5).map((wo) => (
                    <div 
                      key={wo.id} 
                      className="p-4 rounded-lg bg-muted/50 flex items-center justify-between cursor-pointer hover-elevate"
                      onClick={() => navigate(`/work-orders/${wo.id}`)}
                    >
                      <div>
                        <p className="font-medium">{wo.workOrderNumber}</p>
                        <p className="text-sm text-muted-foreground">{wo.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={wo.status} />
                        <span className="text-sm text-muted-foreground">
                          {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No work orders for this asset</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Live Telematics
              </CardTitle>
              {latestTelematics && (
                <span className="text-xs text-muted-foreground">
                  Updated: {new Date(latestTelematics.timestamp).toLocaleString()}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {latestTelematics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Gauge className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Engine Hours</p>
                    <p className="font-semibold">{latestTelematics.engineHours || "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Odometer</p>
                    <p className="font-semibold">{latestTelematics.odometer ? `${parseFloat(latestTelematics.odometer).toLocaleString()} mi` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Fuel className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Fuel Level</p>
                    <p className="font-semibold">{latestTelematics.fuelLevel ? `${latestTelematics.fuelLevel}%` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Thermometer className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Coolant Temp</p>
                    <p className="font-semibold">{latestTelematics.coolantTemp ? `${latestTelematics.coolantTemp}°F` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Gauge className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Oil Pressure</p>
                    <p className="font-semibold">{latestTelematics.oilPressure ? `${latestTelematics.oilPressure} PSI` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Battery className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Battery</p>
                    <p className="font-semibold">{latestTelematics.batteryVoltage ? `${latestTelematics.batteryVoltage}V` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Fuel className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">DEF Level</p>
                    <p className="font-semibold">{latestTelematics.defLevel ? `${latestTelematics.defLevel}%` : "-"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="font-semibold">{latestTelematics.speed ? `${latestTelematics.speed} MPH` : "-"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No telematics data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fault Codes
              </CardTitle>
              {activeFaults.length > 0 && (
                <Badge variant="destructive">{activeFaults.length} Active</Badge>
              )}
            </CardHeader>
            <CardContent>
              {faultCodes && faultCodes.length > 0 ? (
                <div className="space-y-2">
                  {faultCodes.slice(0, 5).map((fault) => (
                    <div 
                      key={fault.id} 
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        fault.status === "active" ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
                      }`}
                      data-testid={`fault-${fault.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{fault.code}</span>
                          <Badge 
                            variant={fault.severity === "critical" ? "destructive" : fault.severity === "high" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {fault.severity}
                          </Badge>
                          <Badge variant={fault.status === "active" ? "destructive" : "secondary"} className="text-xs">
                            {fault.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{fault.description || "No description"}</p>
                        {fault.spn && fault.fmi && (
                          <p className="text-xs text-muted-foreground">SPN: {fault.spn} | FMI: {fault.fmi}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(fault.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-muted-foreground">No fault codes detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {asset.assetNumber} - {asset.name}? This action cannot be undone.
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
