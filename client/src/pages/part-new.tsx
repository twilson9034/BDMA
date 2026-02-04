import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, Package, Circle } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Location, Vendor } from "@shared/schema";

const partFormSchema = z.object({
  partNumber: z.string().min(1, "Part number is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["filters", "fluids", "electrical", "brakes", "engine", "transmission", "hvac", "body", "tires", "general"]).optional(),
  abcClass: z.enum(["A", "B", "C"]).optional(),
  unitOfMeasure: z.string().default("each"),
  quantityOnHand: z.string().default("0"),
  reorderPoint: z.string().default("0"),
  reorderQuantity: z.string().default("0"),
  unitCost: z.string().optional(),
  locationId: z.number().optional().nullable(),
  binLocation: z.string().optional(),
  vendorId: z.number().optional().nullable(),
  vendorPartNumber: z.string().optional(),
  barcode: z.string().optional(),
  isTire: z.boolean().optional(),
  tireSize: z.string().optional(),
  tireDotCode: z.string().optional(),
  tirePsiRating: z.string().optional(),
  tireLoadIndex: z.string().optional(),
  tireSpeedRating: z.string().optional(),
  tireTreadDepthNew: z.string().optional(),
  tireBrand: z.string().optional(),
  tireModel: z.string().optional(),
  tireType: z.enum(["new", "retread", "used"]).optional(),
});

type PartFormValues = z.infer<typeof partFormSchema>;

export default function PartNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
      isTire: false,
      tireSize: "",
      tireDotCode: "",
      tirePsiRating: "",
      tireLoadIndex: "",
      tireSpeedRating: "",
      tireTreadDepthNew: "",
      tireBrand: "",
      tireModel: "",
      tireType: undefined,
    },
  });

  const selectedCategory = useWatch({ control: form.control, name: "category" });
  const isTireCategory = selectedCategory === "tires";

  const createMutation = useMutation({
    mutationFn: async (data: PartFormValues) => {
      return apiRequest("POST", "/api/parts", data);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Part Created", description: "The new part has been added to inventory." });
      const newPart = await response.json();
      navigate(`/inventory/${newPart.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create part", variant: "destructive" });
    },
  });

  const onSubmit = (data: PartFormValues) => {
    const submitData = {
      ...data,
      isTire: data.category === "tires",
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title="Add New Part"
        description="Create a new inventory item"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Part Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="partNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Part Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., OIL-15W40-001" data-testid="input-part-number" />
                          </FormControl>
                          <FormDescription>Unique identifier for this part</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Engine Oil 15W-40" data-testid="input-name" />
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
                          <Textarea {...field} rows={3} placeholder="Additional details about this part..." data-testid="input-description" />
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <FormDescription>Inventory priority</FormDescription>
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
                            <Input {...field} placeholder="each, gallon, set..." data-testid="input-uom" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {isTireCategory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Circle className="h-5 w-5" />
                      Tire Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="tireBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Michelin, Goodyear" data-testid="input-tire-brand" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., X Multi Energy D" data-testid="input-tire-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="tireSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 295/75R22.5" data-testid="input-tire-size" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-tire-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="retread">Retread</SelectItem>
                                <SelectItem value="used">Used</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireDotCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>DOT Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., DOT 1234" data-testid="input-tire-dot" />
                            </FormControl>
                            <FormDescription>Manufacturing date code</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <FormField
                        control={form.control}
                        name="tirePsiRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PSI Rating</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="e.g., 110" data-testid="input-tire-psi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireLoadIndex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Load Index</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 144/142" data-testid="input-tire-load" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireSpeedRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Speed Rating</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., L" data-testid="input-tire-speed" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tireTreadDepthNew"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Tread Depth</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.1" placeholder="e.g., 18" data-testid="input-tire-tread" />
                            </FormControl>
                            <FormDescription>In 32nds of an inch</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          <FormLabel>Initial Quantity</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" data-testid="input-qty" />
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
                            <Input {...field} type="number" min="0" data-testid="input-reorder-point" />
                          </FormControl>
                          <FormDescription>Low stock alert</FormDescription>
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
                            <Input {...field} type="number" min="0" data-testid="input-reorder-qty" />
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
                            <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-cost" />
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
                  <CardTitle>Location & Vendor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Location</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
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
                            <Input {...field} placeholder="e.g., A-01-03" data-testid="input-bin" />
                          </FormControl>
                          <FormDescription>Shelf/bin location</FormDescription>
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
                          <FormLabel>Preferred Vendor</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
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
                            <Input {...field} placeholder="Vendor's part number" data-testid="input-vendor-pn" />
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
                          <Input {...field} placeholder="Scan or enter barcode" data-testid="input-barcode" />
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
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create">
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Create Part
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/inventory")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Use consistent part numbers for easy searching (e.g., OIL-15W40-001).</p>
                  <p>Set reorder points based on lead times and usage frequency.</p>
                  <p>ABC classification helps prioritize inventory counts.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
