import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Trash2, Truck, 
  MapPin, Calendar, Settings, FileText, Wrench, X,
  Gauge, Fuel, Thermometer, Battery, AlertTriangle, Activity, Radio,
  Brain, Sparkles, RefreshCw, QrCode, Printer, Copy, Check
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
import type { Asset, Location, WorkOrder, TelematicsData, FaultCode, Prediction, DVIR, PmAssetInstance, InventoryTransaction } from "@shared/schema";
import { AssetImages, AssetDocuments } from "@/components/AssetImagesDocuments";
import { BrakeTireSettings } from "@/components/BrakeTireSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Package, History, Plus, Disc, CircleDot } from "lucide-react";

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
  customFields: z.record(z.any()).optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface DvirQrCodeSectionProps {
  assetId: number;
  assetName: string;
  assetNumber: string;
}

function DvirQrCodeSection({ assetId, assetName, assetNumber }: DvirQrCodeSectionProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);

  const { data: tokenData, isLoading: isLoadingToken } = useQuery<{ token: string; expiresAt: string }>({
    queryKey: ["/api/assets", assetId, "dvir-token"],
    enabled: !!assetId,
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/assets/${assetId}/dvir-token`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "dvir-token"] });
      toast({
        title: "QR Code Generated",
        description: "A new QR code has been generated for public DVIR submissions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dvirUrl = tokenData?.token 
    ? `${window.location.origin}/dvir/${tokenData.token}`
    : null;

  const handleCopyUrl = async () => {
    if (dvirUrl) {
      await navigator.clipboard.writeText(dvirUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "DVIR URL copied to clipboard.",
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && dvirUrl) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DVIR QR Code - ${assetNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 40px; 
            }
            .qr-container { 
              display: inline-block; 
              padding: 20px; 
              border: 2px solid #333; 
              border-radius: 8px; 
            }
            h1 { margin-bottom: 8px; font-size: 24px; }
            h2 { margin-bottom: 24px; font-size: 18px; color: #666; }
            p { margin-top: 16px; font-size: 14px; color: #666; }
            .asset-info { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Scan for DVIR</h1>
            <div class="asset-info">
              <h2>${assetNumber} - ${assetName}</h2>
            </div>
            <img src="data:image/svg+xml;base64,${btoa(document.getElementById("dvir-qr-svg")?.outerHTML || "")}" width="200" height="200" />
            <p>Scan this QR code to submit a Driver Vehicle Inspection Report</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const isExpired = tokenData?.expiresAt 
    ? new Date(tokenData.expiresAt) < new Date() 
    : false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          DVIR QR Code
        </CardTitle>
        {tokenData?.token && !isExpired && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              data-testid="button-copy-dvir-url"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{copied ? "Copied" : "Copy URL"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrDialog(true)}
              data-testid="button-view-qr"
            >
              <QrCode className="h-4 w-4 mr-1" />
              View QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="button-print-qr"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingToken ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokenData?.token && !isExpired ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-4 bg-white rounded-lg">
              <div id="dvir-qr-svg">
                <QRCodeSVG value={dvirUrl!} size={180} level="H" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Scan this QR code to submit a Driver Vehicle Inspection Report
              </p>
              <p className="text-xs text-muted-foreground">
                Valid until: {new Date(tokenData.expiresAt).toLocaleDateString()} at {new Date(tokenData.expiresAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                data-testid="button-regenerate-qr"
              >
                {generateTokenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate QR Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-muted-foreground mb-2">
                {isExpired 
                  ? "The QR code has expired. Generate a new one to allow public DVIR submissions."
                  : "Generate a QR code to allow anyone to submit DVIRs for this asset without logging in."}
              </p>
            </div>
            <Button
              onClick={() => generateTokenMutation.mutate()}
              disabled={generateTokenMutation.isPending}
              data-testid="button-generate-qr"
            >
              {generateTokenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <QrCode className="h-4 w-4 mr-2" />
              Generate QR Code
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>DVIR QR Code</DialogTitle>
            <DialogDescription>
              {assetNumber} - {assetName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8 bg-white rounded-lg">
            <QRCodeSVG value={dvirUrl || ""} size={280} level="H" />
          </div>
          <DialogFooter className="flex-row gap-2 justify-center">
            <Button variant="outline" onClick={handleCopyUrl} data-testid="dialog-button-copy-url">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy URL"}
            </Button>
            <Button onClick={handlePrint} data-testid="dialog-button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function AssetDetail() {
  const [, params] = useRoute("/assets/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

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

  const { data: dvirs } = useQuery<DVIR[]>({
    queryKey: ["/api/dvirs"],
  });

  const { data: pmInstances } = useQuery<PmAssetInstance[]>({
    queryKey: ["/api/pm-asset-instances"],
  });

  const { data: inventoryTransactions } = useQuery<InventoryTransaction[]>({
    queryKey: ["/api/inventory-transactions"],
  });

  const assetWorkOrders = workOrders?.filter(wo => wo.assetId === assetId) || [];
  const assetDvirs = dvirs?.filter(d => d.assetId === assetId) || [];
  const assetPmInstances = pmInstances?.filter(pm => pm.assetId === assetId) || [];
  const assetInventoryTransactions = inventoryTransactions?.filter(t => t.assetId === assetId) || [];
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
        customFields: asset.customFields || {},
      });
    }
  }, [asset, form]);

  const customFields = form.watch("customFields") || {};

  const updateMutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      return apiRequest("PATCH", `/api/assets/${assetId}`, {
        ...data,
        year: data.year ? parseInt(data.year) : null,
        locationId: data.locationId || null,
        customFields: data.customFields,
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

  const aiAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/assets/${assetId}/analyze`);
      return response.json();
    },
    onSuccess: (data: { predictions: Prediction[]; count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/health"] });
      const prediction = data.predictions?.[0];
      toast({
        title: "AI Analysis Complete",
        description: prediction 
          ? `Generated ${prediction.severity} severity prediction: ${prediction.predictionType}`
          : `Generated ${data.count} prediction(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to generate AI prediction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    updateMutation.mutate(data);
  };

  const addCustomField = () => {
    if (newFieldKey.trim() && !customFields[newFieldKey.trim()]) {
      form.setValue("customFields", {
        ...customFields,
        [newFieldKey.trim()]: newFieldValue,
      }, { shouldDirty: true });
      setNewFieldKey("");
      setNewFieldValue("");
    }
  };

  const removeCustomField = (key: string) => {
    const updated = { ...customFields };
    delete updated[key];
    form.setValue("customFields", updated, { shouldDirty: true });
  };

  const updateCustomFieldValue = (key: string, value: string) => {
    form.setValue("customFields", {
      ...customFields,
      [key]: value,
    }, { shouldDirty: true });
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
                <Button 
                  variant="default" 
                  onClick={() => aiAnalysisMutation.mutate()} 
                  disabled={aiAnalysisMutation.isPending}
                  data-testid="button-ai-analysis"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {aiAnalysisMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  AI Analysis
                </Button>
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

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(customFields).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(customFields).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Input
                            value={key}
                            disabled
                            className="flex-1"
                            data-testid={`input-custom-field-key-${key}`}
                          />
                          <Input
                            value={value as string}
                            onChange={(e) => updateCustomFieldValue(key, e.target.value)}
                            className="flex-1"
                            placeholder="Value"
                            data-testid={`input-custom-field-value-${key}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomField(key)}
                            data-testid={`button-remove-field-${key}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value)}
                      placeholder="Field name"
                      className="flex-1"
                      data-testid="input-new-field-key"
                    />
                    <Input
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                      data-testid="input-new-field-value"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addCustomField}
                      disabled={!newFieldKey.trim()}
                      data-testid="button-add-custom-field"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add custom fields to track additional information specific to this asset.
                  </p>
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
        <>
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

              {asset.customFields && Object.keys(asset.customFields).length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(asset.customFields).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-muted-foreground">{key}</p>
                        <p className="font-medium">{String(value) || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {asset.type !== "vehicle" && (
            <div className="lg:col-span-2" data-testid="section-brake-tire-settings">
              <BrakeTireSettings assetId={asset.id} assetType={asset.type} />
            </div>
          )}

          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Asset History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="work-orders" className="w-full">
                <TabsList className="w-full justify-start mb-4">
                  <TabsTrigger value="work-orders" className="flex items-center gap-2" data-testid="tab-work-orders">
                    <Wrench className="h-4 w-4" />
                    Work Orders ({assetWorkOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="pm-schedules" className="flex items-center gap-2" data-testid="tab-pm-schedules">
                    <Calendar className="h-4 w-4" />
                    PM History ({assetPmInstances.length})
                  </TabsTrigger>
                  <TabsTrigger value="parts" className="flex items-center gap-2" data-testid="tab-parts">
                    <Package className="h-4 w-4" />
                    Parts Used ({assetInventoryTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="dvirs" className="flex items-center gap-2" data-testid="tab-dvirs">
                    <ClipboardList className="h-4 w-4" />
                    DVIRs ({assetDvirs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="work-orders">
                  {assetWorkOrders.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {assetWorkOrders.map((wo) => (
                        <div 
                          key={wo.id} 
                          className="p-4 rounded-lg bg-muted/50 flex items-center justify-between cursor-pointer hover-elevate"
                          onClick={() => navigate(`/work-orders/${wo.id}`)}
                        >
                          <div>
                            <p className="font-medium">{wo.workOrderNumber}</p>
                            <p className="text-sm text-muted-foreground">{wo.title}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
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
                </TabsContent>

                <TabsContent value="pm-schedules">
                  {assetPmInstances.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {assetPmInstances.map((pm) => (
                        <div 
                          key={pm.id} 
                          className="p-4 rounded-lg bg-muted/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">PM Schedule #{pm.pmScheduleId}</p>
                            <p className="text-sm text-muted-foreground">
                              Next Due: {pm.nextDueDate ? new Date(pm.nextDueDate).toLocaleDateString() : 'Not set'}
                              {pm.nextDueMeter && ` or ${pm.nextDueMeter} ${asset?.meterType || 'units'}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={pm.lastCompletedDate ? "default" : "secondary"}>
                              {pm.lastCompletedDate ? "Completed" : "Pending"}
                            </Badge>
                            {pm.lastCompletedDate && (
                              <span className="text-sm text-muted-foreground">
                                Last: {new Date(pm.lastCompletedDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No PM schedules for this asset</p>
                  )}
                </TabsContent>

                <TabsContent value="parts">
                  {assetInventoryTransactions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {assetInventoryTransactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="p-4 rounded-lg bg-muted/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">Part #{tx.partId}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.transactionType === 'consume' ? 'Used' : tx.transactionType} - Qty: {tx.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={tx.transactionType === 'consume' ? "destructive" : "default"}>
                              {tx.transactionType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No parts used for this asset</p>
                  )}
                </TabsContent>

                <TabsContent value="dvirs">
                  {assetDvirs.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {assetDvirs.map((dvir) => (
                        <div 
                          key={dvir.id} 
                          className="p-4 rounded-lg bg-muted/50 flex items-center justify-between cursor-pointer hover-elevate"
                          onClick={() => navigate(`/dvirs/${dvir.id}`)}
                        >
                          <div>
                            <p className="font-medium">{dvir.inspectionType} Inspection</p>
                            <p className="text-sm text-muted-foreground">
                              By: {dvir.driverName || 'Unknown'} - {dvir.defectCount || 0} defect(s)
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={dvir.overallStatus === 'pass' ? "default" : "destructive"}>
                              {dvir.overallStatus}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {dvir.inspectionDate ? new Date(dvir.inspectionDate).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No DVIRs for this asset</p>
                  )}
                </TabsContent>
              </Tabs>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetImages assetId={assetId!} />
          <AssetDocuments assetId={assetId!} />
        </div>

        <DvirQrCodeSection assetId={assetId!} assetName={asset.name} assetNumber={asset.assetNumber} />
        </>
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
