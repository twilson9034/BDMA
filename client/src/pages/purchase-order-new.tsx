import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2, ShoppingCart } from "lucide-react";
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
import type { Vendor } from "@shared/schema";

const poFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  vendorId: z.number({ required_error: "Vendor is required" }),
  totalAmount: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

type PoFormValues = z.infer<typeof poFormSchema>;

export default function PurchaseOrderNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const activeVendors = vendors?.filter(v => v.isActive) || [];

  const form = useForm<PoFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      title: "",
      description: "",
      vendorId: undefined,
      totalAmount: "",
      expectedDeliveryDate: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PoFormValues) => {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const poNumber = `PO-${year}-${randomNum}`;
      
      return apiRequest("POST", "/api/purchase-orders", {
        ...data,
        poNumber,
        status: "draft",
      });
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: "Purchase Order Created", description: "The new PO has been created." });
      const newPo = await response.json();
      navigate(`/purchase-orders/${newPo.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create purchase order", variant: "destructive" });
    },
  });

  const onSubmit = (data: PoFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Brief description of the order" data-testid="input-title" />
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
                          <Textarea {...field} rows={3} placeholder="Detailed description of items being ordered..." data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor *</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(parseInt(val))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vendor">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeVendors.map((v) => (
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
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Amount</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-delivery-date" />
                        </FormControl>
                        <FormDescription>When you expect to receive this order</FormDescription>
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
                          <Textarea {...field} rows={3} placeholder="Any additional notes..." data-testid="input-notes" />
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
                    Create Purchase Order
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/purchase-orders")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Workflow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Draft - PO is being prepared</p>
                  <p>Submitted - Sent to vendor</p>
                  <p>Approved - Vendor confirmed</p>
                  <p>Ordered - Order placed</p>
                  <p>Received - Items delivered</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
