import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";
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
    },
  });

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
    createMutation.mutate(data);
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
