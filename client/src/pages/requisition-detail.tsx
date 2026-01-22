import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, Save, Loader2, Edit, FileText, 
  CheckCircle2, XCircle, Clock, X, ShoppingCart
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

interface PurchaseRequisition {
  id: number;
  requisitionNumber: string;
  title: string;
  description: string | null;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "converted";
  requestedById: string | null;
  approvedById: string | null;
  vendorId: number | null;
  totalAmount: string | null;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const requisitionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "converted"]),
  vendorId: z.number().optional().nullable(),
  totalAmount: z.string().optional(),
  notes: z.string().optional(),
});

type RequisitionFormValues = z.infer<typeof requisitionFormSchema>;

export default function RequisitionDetail() {
  const [, params] = useRoute("/requisitions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const requisitionId = params?.id ? parseInt(params.id) : null;

  const { data: requisition, isLoading } = useQuery<PurchaseRequisition>({
    queryKey: ["/api/requisitions", requisitionId],
    enabled: !!requisitionId,
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      vendorId: null,
      totalAmount: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (requisition) {
      form.reset({
        title: requisition.title || "",
        description: requisition.description || "",
        status: requisition.status || "draft",
        vendorId: requisition.vendorId || null,
        totalAmount: requisition.totalAmount || "",
        notes: requisition.notes || "",
      });
    }
  }, [requisition, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: RequisitionFormValues) => {
      return apiRequest("PATCH", `/api/requisitions/${requisitionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions", requisitionId] });
      toast({ title: "Requisition Updated", description: "The requisition has been updated." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update requisition", variant: "destructive" });
    },
  });


  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/requisitions/${requisitionId}`, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions", requisitionId] });
      toast({ title: "Requisition Approved", description: "The requisition has been approved." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/requisitions/${requisitionId}`, {
        status: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions", requisitionId] });
      toast({ title: "Requisition Rejected", description: "The requisition has been rejected." });
    },
  });

  const onSubmit = (data: RequisitionFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!requisition) {
    return (
      <div className="space-y-6">
        <PageHeader title="Requisition Not Found" description="The requested requisition could not be found." />
        <Button variant="outline" onClick={() => navigate("/requisitions")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisitions
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      pending_approval: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      approved: "bg-green-500/10 text-green-600 dark:text-green-400",
      rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
      converted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };
    return <Badge className={styles[status] || ""}>{status.replace("_", " ")}</Badge>;
  };

  const vendor = vendors?.find(v => v.id === requisition.vendorId);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/requisitions")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader
        title={requisition.requisitionNumber}
        description={requisition.title}
        actions={
          <div className="flex gap-2">
            {requisition.status === "pending_approval" && (
              <>
                <Button variant="default" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Requisition Details</CardTitle>
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
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="converted">Converted to PO</SelectItem>
                          </SelectContent>
                        </Select>
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
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(requisition.status)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">
                  {requisition.totalAmount ? `$${Number(requisition.totalAmount).toFixed(2)}` : "N/A"}
                </span>
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
                <span>{new Date(requisition.createdAt).toLocaleDateString()}</span>
              </div>
              {requisition.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{new Date(requisition.approvedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {requisition.status === "approved" && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link href="/purchase-orders/new">
                    <ShoppingCart className="h-4 w-4" />
                    Convert to Purchase Order
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
