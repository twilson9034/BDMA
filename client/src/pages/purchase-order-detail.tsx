import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, ShoppingCart, 
  CheckCircle2, XCircle, X, Truck, DollarSign
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
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vendor } from "@shared/schema";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  title: string;
  description: string | null;
  status: "draft" | "submitted" | "approved" | "ordered" | "partial" | "received" | "cancelled";
  vendorId: number | null;
  requisitionId: number | null;
  totalAmount: string | null;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const poFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "ordered", "partial", "received", "cancelled"]),
  vendorId: z.number().optional().nullable(),
  totalAmount: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

type PoFormValues = z.infer<typeof poFormSchema>;

export default function PurchaseOrderDetail() {
  const [, params] = useRoute("/purchase-orders/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const poId = params?.id ? parseInt(params.id) : null;

  const { data: po, isLoading } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", poId],
    enabled: !!poId,
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<PoFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      vendorId: null,
      totalAmount: "",
      expectedDeliveryDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (po) {
      form.reset({
        title: po.title || "",
        description: po.description || "",
        status: po.status || "draft",
        vendorId: po.vendorId || null,
        totalAmount: po.totalAmount || "",
        expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split("T")[0] : "",
        notes: po.notes || "",
      });
    }
  }, [po, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PoFormValues) => {
      return apiRequest("PATCH", `/api/purchase-orders/${poId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", poId] });
      toast({ title: "Purchase Order Updated", description: "The PO has been updated." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update purchase order", variant: "destructive" });
    },
  });


  const markReceivedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/purchase-orders/${poId}`, {
        status: "received",
        receivedDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", poId] });
      toast({ title: "Order Received", description: "The order has been marked as received." });
    },
  });

  const onSubmit = (data: PoFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!po) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase Order Not Found" description="The requested PO could not be found." />
        <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      approved: "bg-green-500/10 text-green-600 dark:text-green-400",
      ordered: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      partial: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      received: "bg-green-500/10 text-green-600 dark:text-green-400",
      cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const vendor = vendors?.find(v => v.id === po.vendorId);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={po.poNumber}
        description={po.title}
        actions={
          <div className="flex gap-2">
            {po.status === "ordered" && (
              <Button variant="default" onClick={() => markReceivedMutation.mutate()} disabled={markReceivedMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Received
              </Button>
            )}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{po.totalAmount ? `$${Number(po.totalAmount).toFixed(2)}` : "N/A"}</p>
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
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p className="text-xl font-bold">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(po.status)}</div>
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
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} data-testid="input-title" />
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
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Amount</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" disabled={!isEditing} data-testid="input-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="ordered">Ordered</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="received">Received</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expectedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" disabled={!isEditing} data-testid="input-delivery-date" />
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
                          <Textarea {...field} disabled={!isEditing} rows={3} data-testid="input-notes" />
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
              <CardTitle>Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PO Number</span>
                <span className="font-mono">{po.poNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(po.status)}
              </div>
              {vendor && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendor</span>
                  <Link href={`/vendors/${vendor.id}`} className="text-primary hover:underline">
                    {vendor.name}
                  </Link>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(po.createdAt).toLocaleDateString()}</span>
              </div>
              {po.receivedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received</span>
                  <span>{new Date(po.receivedDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
