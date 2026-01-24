import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  ShoppingCart, 
  AlertTriangle,
  Plus,
  Truck
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import type { PartRequest, WorkOrder, Part } from "@shared/schema";

export default function PartRequests() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<PartRequest[]>({
    queryKey: ["/api/part-requests"],
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: partsData = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/part-requests/${data.id}`, { status: data.status, notes: data.notes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Part request updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/part-requests"] });
      setUpdateDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/part-requests", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Part request created" });
      queryClient.invalidateQueries({ queryKey: ["/api/part-requests"] });
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved": return "bg-blue-100 text-blue-800 border-blue-200";
      case "ordered": return "bg-purple-100 text-purple-800 border-purple-200";
      case "received": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "fulfilled": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "urgent": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === "pending") return r.status === "pending";
    if (activeTab === "approved") return r.status === "approved";
    if (activeTab === "ordered") return r.status === "ordered";
    if (activeTab === "completed") return r.status === "fulfilled" || r.status === "received";
    if (activeTab === "all") return true;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const orderedCount = requests.filter(r => r.status === "ordered").length;
  const criticalCount = requests.filter(r => r.urgency === "critical" && r.status === "pending").length;

  const getWorkOrderNumber = (woId: number | null) => {
    if (!woId) return "-";
    const wo = workOrders.find(w => w.id === woId);
    return wo?.workOrderNumber || `WO #${woId}`;
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Part Requests"
        description="Manage technician part requests and fulfillment"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ordered</p>
                <p className="text-2xl font-bold">{orderedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved">
                Approved ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="ordered" data-testid="tab-ordered">
                Ordered ({orderedCount})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requests in this category
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium text-primary">{request.requestNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.partName}</div>
                            {request.partNumber && (
                              <div className="text-xs text-muted-foreground">{request.partNumber}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(request.quantityRequested).toFixed(0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.workOrderId ? (
                            <Link href={`/work-orders/${request.workOrderId}`}>
                              <span className="text-primary hover:underline cursor-pointer">
                                {getWorkOrderNumber(request.workOrderId)}
                              </span>
                            </Link>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{request.requestedByName || "-"}</TableCell>
                        <TableCell>{format(new Date(request.createdAt!), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {request.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setUpdateDialogOpen(true);
                                }}
                                data-testid={`button-update-request-${request.id}`}
                              >
                                Update
                              </Button>
                            )}
                            {request.status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => updateMutation.mutate({ id: request.id, status: "ordered" })}
                                data-testid={`button-mark-ordered-${request.id}`}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Ordered
                              </Button>
                            )}
                            {request.status === "ordered" && (
                              <Button
                                size="sm"
                                onClick={() => updateMutation.mutate({ id: request.id, status: "received" })}
                                data-testid={`button-mark-received-${request.id}`}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Received
                              </Button>
                            )}
                            {request.status === "received" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                                onClick={() => updateMutation.mutate({ id: request.id, status: "fulfilled" })}
                                data-testid={`button-fulfill-${request.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Fulfill
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parts={partsData}
        workOrders={workOrders}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <UpdateRequestDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        request={selectedRequest}
        onUpdate={(status, notes) => {
          if (selectedRequest) {
            updateMutation.mutate({ id: selectedRequest.id, status, notes });
          }
        }}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}

function CreateRequestDialog({
  open,
  onOpenChange,
  parts,
  workOrders,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: Part[];
  workOrders: WorkOrder[];
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [partId, setPartId] = useState<string>("");
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState("standard");
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const handlePartSelect = (value: string) => {
    setPartId(value);
    if (value && value !== "manual") {
      const part = parts.find(p => p.id === parseInt(value));
      if (part) {
        setPartName(part.name);
        setPartNumber(part.partNumber);
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      partId: partId && partId !== "manual" ? parseInt(partId) : undefined,
      partName,
      partNumber: partNumber || undefined,
      quantityRequested: quantity,
      urgency,
      workOrderId: workOrderId ? parseInt(workOrderId) : undefined,
      notes: notes || undefined,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPartId("");
      setPartName("");
      setPartNumber("");
      setQuantity("1");
      setUrgency("standard");
      setWorkOrderId("");
      setNotes("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Part Request</DialogTitle>
          <DialogDescription>Request a part for a work order or general stock</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Part (or enter manually)</Label>
            <Select value={partId} onValueChange={handlePartSelect}>
              <SelectTrigger data-testid="select-part">
                <SelectValue placeholder="Select a part..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Enter Manually</SelectItem>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id.toString()}>
                    {part.partNumber} - {part.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(partId === "manual" || !partId) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="partName">Part Name *</Label>
                <Input
                  id="partName"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Enter part name"
                  data-testid="input-part-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partNumber">Part Number</Label>
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Enter part number (optional)"
                  data-testid="input-part-number"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                data-testid="input-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger data-testid="select-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Work Order (Optional)</Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger data-testid="select-work-order">
                <SelectValue placeholder="Select work order..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {workOrders.filter(wo => wo.status !== "completed" && wo.status !== "cancelled").map((wo) => (
                  <SelectItem key={wo.id} value={wo.id.toString()}>
                    {wo.workOrderNumber} - {wo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              data-testid="input-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !partName || !quantity}
            data-testid="button-submit-request"
          >
            {isPending ? "Creating..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateRequestDialog({
  open,
  onOpenChange,
  request,
  onUpdate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PartRequest | null;
  onUpdate: (status: string, notes?: string) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && request) {
      setStatus(request.status);
      setNotes(request.notes || "");
    }
    onOpenChange(isOpen);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Part Request</DialogTitle>
          <DialogDescription>
            {request.requestNumber} - {request.partName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="updateNotes">Notes</Label>
            <Textarea
              id="updateNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              data-testid="input-update-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onUpdate(status, notes)}
            disabled={isPending}
            data-testid="button-confirm-update"
          >
            {isPending ? "Updating..." : "Update Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
