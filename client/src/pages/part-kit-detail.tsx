import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PartKit, PartKitLine, Part } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  pm: "PM Service",
  repair: "Repair",
  inspection: "Inspection",
  seasonal: "Seasonal",
  other: "Other",
};

export default function PartKitDetail() {
  const [, params] = useRoute("/part-kits/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const kitId = params?.id ? parseInt(params.id) : 0;

  const [addLineOpen, setAddLineOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", description: "", category: "", isActive: true });

  const { data: kit, isLoading } = useQuery<PartKit>({
    queryKey: ["/api/part-kits", kitId],
    enabled: !!kitId,
  });

  const { data: kitLines } = useQuery<PartKitLine[]>({
    queryKey: [`/api/part-kits/${kitId}/lines`],
    enabled: !!kitId,
  });

  const { data: partsData } = useQuery<{ parts: Part[]; total: number }>({
    queryKey: ["/api/parts"],
  });
  const allParts = partsData?.parts || [];

  const updateKitMutation = useMutation({
    mutationFn: async (data: Partial<PartKit>) => {
      const response = await apiRequest("PATCH", `/api/part-kits/${kitId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Kit updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits", kitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits"] });
      setIsEditing(false);
    },
  });

  const addLineMutation = useMutation({
    mutationFn: async (data: { partId: number; quantity: string }) => {
      const response = await apiRequest("POST", `/api/part-kits/${kitId}/lines`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Added", description: "Part added to kit" });
      queryClient.invalidateQueries({ queryKey: [`/api/part-kits/${kitId}/lines`] });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits", kitId] });
      setAddLineOpen(false);
      setSelectedPartId("");
      setLineQuantity("1");
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: number) => {
      await apiRequest("DELETE", `/api/part-kit-lines/${lineId}`);
    },
    onSuccess: () => {
      toast({ title: "Removed", description: "Part removed from kit" });
      queryClient.invalidateQueries({ queryKey: [`/api/part-kits/${kitId}/lines`] });
      queryClient.invalidateQueries({ queryKey: ["/api/part-kits", kitId] });
    },
  });

  const linesWithParts = (kitLines || []).map(line => {
    const part = allParts?.find(p => p.id === line.partId);
    return { ...line, part };
  });

  const lineColumns: Column<typeof linesWithParts[0]>[] = [
    {
      key: "partNumber",
      header: "Part Number",
      cell: (line) => line.part?.partNumber || "-",
    },
    {
      key: "partName",
      header: "Part Name",
      cell: (line) => line.part?.name || "-",
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (line) => line.quantity,
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (line) => `$${Number(line.unitCost || 0).toFixed(2)}`,
    },
    {
      key: "lineCost",
      header: "Line Cost",
      cell: (line) => `$${Number(line.lineCost || 0).toFixed(2)}`,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (line) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            deleteLineMutation.mutate(line.id);
          }}
          data-testid={`button-delete-line-${line.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading kit...</div>;
  }

  if (!kit) {
    return <div className="p-8 text-center text-muted-foreground">Kit not found</div>;
  }

  const handleEdit = () => {
    setEditData({
      name: kit.name,
      description: kit.description || "",
      category: kit.category,
      isActive: kit.isActive ?? true,
    });
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={kit.kitNumber}
        description={kit.name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/part-kits")} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {!isEditing ? (
              <Button onClick={handleEdit} data-testid="button-edit-kit">
                Edit Kit
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button 
                  onClick={() => updateKitMutation.mutate(editData)}
                  disabled={updateKitMutation.isPending}
                  data-testid="button-save-kit"
                >
                  Save
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-4 space-y-6 flex-1 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Kit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editData.category}
                      onValueChange={(v) => setEditData({ ...editData, category: v })}
                    >
                      <SelectTrigger data-testid="select-edit-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pm">PM Service</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    data-testid="input-edit-description"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Kit Number</Label>
                  <p className="font-medium">{kit.kitNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <p>
                    <Badge variant="secondary">{categoryLabels[kit.category] || kit.category}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Total Cost</Label>
                  <p className="font-medium text-lg">${Number(kit.totalCost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p>
                    <Badge variant={kit.isActive ? "default" : "secondary"}>
                      {kit.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                {kit.description && (
                  <div className="col-span-full">
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p>{kit.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Kit Parts</CardTitle>
              <CardDescription>{linesWithParts.length} part(s) in this kit</CardDescription>
            </div>
            <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-part">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Part
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Part to Kit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Part</Label>
                    <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                      <SelectTrigger data-testid="select-add-part">
                        <SelectValue placeholder="Select a part..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allParts?.map((part) => (
                          <SelectItem key={part.id} value={String(part.id)}>
                            {part.partNumber} - {part.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={lineQuantity}
                      onChange={(e) => setLineQuantity(e.target.value)}
                      data-testid="input-add-quantity"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddLineOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => addLineMutation.mutate({ partId: parseInt(selectedPartId), quantity: lineQuantity })}
                    disabled={!selectedPartId || addLineMutation.isPending}
                    data-testid="button-submit-add-part"
                  >
                    Add Part
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {linesWithParts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No parts in this kit yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setAddLineOpen(true)}
                  data-testid="button-empty-add-part"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Part
                </Button>
              </div>
            ) : (
              <DataTable data={linesWithParts} columns={lineColumns} getRowKey={(line) => line.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
