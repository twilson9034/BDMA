import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, Package, 
  MapPin, DollarSign, BarChart3, X, AlertTriangle, ShoppingCart, Printer
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Part, Location, Vendor } from "@shared/schema";

const partFormSchema = z.object({
  partNumber: z.string().min(1, "Part number is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["filters", "fluids", "electrical", "brakes", "engine", "transmission", "hvac", "body", "tires", "general"]).optional(),
  abcClass: z.enum(["A", "B", "C"]).optional(),
  unitOfMeasure: z.string().optional(),
  quantityOnHand: z.string().optional(),
  reorderPoint: z.string().optional(),
  reorderQuantity: z.string().optional(),
  unitCost: z.string().optional(),
  locationId: z.number().optional().nullable(),
  binLocation: z.string().optional(),
  vendorId: z.number().optional().nullable(),
  vendorPartNumber: z.string().optional(),
  barcode: z.string().optional(),
});

type PartFormValues = z.infer<typeof partFormSchema>;

export default function PartDetail() {
  const [, params] = useRoute("/inventory/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const partId = params?.id ? parseInt(params.id) : null;

  const { data: part, isLoading } = useQuery<Part>({
    queryKey: ["/api/parts", partId],
    enabled: !!partId,
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: "",
      name: "",
      description: "",
      category: undefined,
      abcClass: undefined,
      unitOfMeasure: "each",
      quantityOnHand: "0",
      reorderPoint: "0",
      reorderQuantity: "0",
      unitCost: "",
      locationId: null,
      binLocation: "",
      vendorId: null,
      vendorPartNumber: "",
      barcode: "",
    },
  });

  useEffect(() => {
    if (part) {
      form.reset({
        partNumber: part.partNumber || "",
        name: part.name || "",
        description: part.description || "",
        category: part.category || undefined,
        abcClass: part.abcClass || undefined,
        unitOfMeasure: part.unitOfMeasure || "each",
        quantityOnHand: part.quantityOnHand || "0",
        reorderPoint: part.reorderPoint || "0",
        reorderQuantity: part.reorderQuantity || "0",
        unitCost: part.unitCost || "",
        locationId: part.locationId || null,
        binLocation: part.binLocation || "",
        vendorId: part.vendorId || null,
        vendorPartNumber: part.vendorPartNumber || "",
        barcode: part.barcode || "",
      });
    }
  }, [part, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PartFormValues) => {
      return apiRequest("PATCH", `/api/parts/${partId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts", partId] });
      toast({ title: "Part Updated", description: "The part has been updated successfully." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update part", variant: "destructive" });
    },
  });


  const onSubmit = (data: PartFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!part) {
    return (
      <div className="space-y-6">
        <PageHeader title="Part Not Found" description="The requested part could not be found." />
        <Button variant="outline" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  const qty = Number(part.quantityOnHand) || 0;
  const reorderPt = Number(part.reorderPoint) || 0;
  const stockLevel = qty <= 0 ? "out" : qty <= reorderPt ? "low" : "normal";
  const stockPercentage = reorderPt > 0 ? Math.min((qty / reorderPt) * 100, 100) : 100;
  const totalValue = qty * (Number(part.unitCost) || 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={part.name}
        description={part.partNumber}
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Hand</p>
                <p className="text-2xl font-bold">{qty}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reorder Point</p>
                <p className="text-2xl font-bold">{reorderPt}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stockLevel === "out" ? "bg-red-500/10" : stockLevel === "low" ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                <AlertTriangle className={`h-5 w-5 ${stockLevel === "out" ? "text-red-500" : stockLevel === "low" ? "text-yellow-500" : "text-green-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unit Cost</p>
                <p className="text-2xl font-bold">${Number(part.unitCost || 0).toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Part Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="partNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Part Number</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-part-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>
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
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="filters">Filters</SelectItem>
                              <SelectItem value="fluids">Fluids</SelectItem>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="brakes">Brakes</SelectItem>
                              <SelectItem value="engine">Engine</SelectItem>
                              <SelectItem value="transmission">Transmission</SelectItem>
                              <SelectItem value="hvac">HVAC</SelectItem>
                              <SelectItem value="body">Body</SelectItem>
                              <SelectItem value="tires">Tires</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="abcClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ABC Class</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-abc-class">
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">A - Critical</SelectItem>
                              <SelectItem value="B">B - Important</SelectItem>
                              <SelectItem value="C">C - Standard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measure</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-uom" />
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
                  <CardTitle>Stock & Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="quantityOnHand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity on Hand</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" disabled={!isEditing} data-testid="input-qty" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reorderPoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reorder Point</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" disabled={!isEditing} data-testid="input-reorder-point" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reorderQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reorder Quantity</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" disabled={!isEditing} data-testid="input-reorder-qty" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" disabled={!isEditing} data-testid="input-cost" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Stock Level</p>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={stockPercentage}
                        className={`h-3 flex-1 ${
                          stockLevel === "out"
                            ? "[&>div]:bg-red-500"
                            : stockLevel === "low"
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-green-500"
                        }`}
                      />
                      <Badge variant={stockLevel === "out" ? "destructive" : stockLevel === "low" ? "secondary" : "default"}>
                        {stockLevel === "out" ? "Out of Stock" : stockLevel === "low" ? "Low Stock" : "In Stock"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location & Vendor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                            disabled={!isEditing}
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
                    <FormField
                      control={form.control}
                      name="binLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bin Location</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} placeholder="e.g., A-01-03" data-testid="input-bin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vendor">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map((v) => (
                                <SelectItem key={v.id} value={v.id.toString()}>
                                  {v.name}
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
                      name="vendorPartNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Part Number</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-vendor-pn" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} data-testid="input-barcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stockLevel !== "normal" && (
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link href="/requisitions/new">
                    <ShoppingCart className="h-4 w-4" />
                    Create Requisition
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsEditing(true)} disabled={isEditing}>
                <Edit className="h-4 w-4" />
                Adjust Stock
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Part Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Part Number</span>
                <span className="font-medium">{part.partNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline" className="capitalize">{part.category || "N/A"}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ABC Class</span>
                <Badge variant="secondary">{part.abcClass || "N/A"}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span>{part.unitOfMeasure || "each"}</span>
              </div>
              {!part.barcode && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Barcode</span>
                    <span className="text-xs text-muted-foreground">Not set</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-generate-barcode"
                    onClick={async () => {
                      const generatedBarcode = `P${String(part.id).padStart(8, '0')}`;
                      try {
                        await apiRequest("PATCH", `/api/parts/${part.id}`, { barcode: generatedBarcode });
                        queryClient.invalidateQueries({ queryKey: ["/api/parts", part.id] });
                        queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
                        toast({ title: "Barcode Generated", description: `Barcode ${generatedBarcode} has been assigned to this part.` });
                      } catch {
                        toast({ title: "Error", description: "Failed to generate barcode", variant: "destructive" });
                      }
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Generate Barcode
                  </Button>
                </div>
              )}
              {part.barcode && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Barcode</span>
                    <span className="font-mono">{part.barcode}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-print-barcode"
                    onClick={() => {
                      const printWindow = window.open('', '_blank', 'width=400,height=300');
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Print Barcode - ${part.partNumber}</title>
                            <style>
                              body { 
                                font-family: Arial, sans-serif; 
                                text-align: center; 
                                padding: 20px;
                                margin: 0;
                              }
                              .barcode-container {
                                border: 2px dashed #ccc;
                                padding: 20px;
                                margin: 10px;
                                display: inline-block;
                              }
                              .barcode {
                                font-family: 'Libre Barcode 39', monospace;
                                font-size: 48px;
                                letter-spacing: 2px;
                              }
                              .barcode-text {
                                font-family: monospace;
                                font-size: 14px;
                                margin-top: 8px;
                              }
                              .part-info {
                                font-size: 12px;
                                margin-top: 8px;
                                color: #666;
                              }
                              @media print {
                                .no-print { display: none; }
                                .barcode-container { border: 1px solid #000; }
                              }
                            </style>
                            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
                          </head>
                          <body>
                            <div class="barcode-container">
                              <div class="barcode">*${part.barcode}*</div>
                              <div class="barcode-text">${part.barcode}</div>
                              <div class="part-info">${part.partNumber} - ${part.name}</div>
                            </div>
                            <div class="no-print" style="margin-top: 20px;">
                              <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print</button>
                            </div>
                          </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Barcode Label
                  </Button>
                </div>
              )}
              {part.createdAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(part.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
